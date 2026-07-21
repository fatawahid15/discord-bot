import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    GuildMember,
    Message,
    PermissionFlagsBits,
    TextBasedChannel,
} from 'discord.js';
import { SoundCloudExtractor, SpotifyExtractor } from '@discord-player/extractor';
import { GuildQueue, Player as DiscordPlayer, QueryType, QueueRepeatMode, Track } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { checkVoiceControl, formatDuration, parseSeekPosition } from './utils';

type MusicQueue = GuildQueue<TextBasedChannel | null>;

let player: DiscordPlayer | null = null;
const activeChildren = new Set<ReturnType<typeof spawn>>();
const controllerMessages = new Map<string, Message>();
const playCooldowns = new Map<string, number>();
const filterTrackIds = new Map<string, string>();
const trackStartedAt = new Map<string, number>();
export const QUEUE_CAPACITY = 500;

interface YoutubeDlModule {
    constants: {
        YOUTUBE_DL_PATH: string;
    };
}

const youtubeDlPath = (require('youtube-dl-exec') as YoutubeDlModule).constants.YOUTUBE_DL_PATH;

async function createYoutubeStream(track: Track): Promise<Readable> {
    const child = spawn(youtubeDlPath, [
        track.url,
        '--js-runtimes', 'node',
        '--format', track.live ? 'best[height<=360]' : 'bestaudio',
        '--output', '-',
        '--no-warnings',
        '--no-progress',
    ], {
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    activeChildren.add(child);

    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
        if (stderr.length < 2_000) stderr += chunk;
    });
    child.once('error', error => child.stdout.destroy(error));
    child.once('close', code => {
        activeChildren.delete(child);
        if (code !== 0 && !child.stdout.destroyed) {
            child.stdout.destroy(new Error(stderr.trim() || `yt-dlp exited with code ${code}.`));
        }
    });
    child.stdout.once('close', () => {
        if (!child.killed) child.kill();
    });

    let receivedData = false;
    const startupTimer = setTimeout(() => {
        if (!receivedData && !child.killed) child.kill();
    }, 20_000);
    startupTimer.unref();
    let inactivityTimer: NodeJS.Timeout | undefined;
    const resetInactivity = () => {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            if (!child.killed) child.kill();
        }, 45_000);
        inactivityTimer.unref();
    };
    child.stdout.on('data', () => {
        receivedData = true;
        clearTimeout(startupTimer);
        resetInactivity();
    });
    child.once('close', () => {
        clearTimeout(startupTimer);
        if (inactivityTimer) clearTimeout(inactivityTimer);
    });

    return child.stdout;
}

export function initializeMusic(client: Client): DiscordPlayer {
    if (player) return player;

    player = new DiscordPlayer(client, {
        ffmpegPath: ffmpegPath ?? undefined,
        connectionTimeout: 20_000,
        probeTimeout: 8_000,
    });

    player.on('error', error => console.error('Discord Player error:', error));
    player.events.on('error', (queue, error) => console.error(`Music queue error in guild ${queue.guild.id}:`, error));
    player.events.on('playerError', (queue, error, track) => {
        console.error(`Track failed in guild ${queue.guild.id} (${track?.title ?? 'unknown'}):`, error);
        const channel = (queue as MusicQueue).metadata;
        if (channel?.isSendable()) {
            void channel.send({ content: `Could not play **${track?.title ?? 'that track'}**. I will continue with the queue.`, allowedMentions: { parse: [] } }).catch(() => undefined);
        }
    });
    player.events.on('playerStart', (queue, track) => {
        const musicQueue = queue as MusicQueue;
        trackStartedAt.set(queue.guild.id, Date.now());
        const filterTrackId = filterTrackIds.get(queue.guild.id);
        if (filterTrackId && filterTrackId !== track.id && musicQueue.filters.ffmpeg.filters.length) {
            filterTrackIds.delete(queue.guild.id);
            void musicQueue.filters.ffmpeg.setFilters(false).catch(error => console.error('Could not reset track filters:', error));
        }
        void updateController(musicQueue);
    });
    for (const event of ['playerPause', 'playerResume', 'volumeChange', 'audioTrackAdd', 'audioTracksAdd', 'audioTrackRemove'] as const) {
        player.events.on(event, (queue: GuildQueue) => void updateController(queue as MusicQueue));
    }
    player.events.on('emptyQueue', queue => void disableController(queue.guild.id));
    player.events.on('queueDelete', queue => void disableController(queue.guild.id));

    return player;
}

export async function startMusic(): Promise<void> {
    const music = getManager();
    const soundCloud = await music.extractors.register(SoundCloudExtractor, {});
    const spotify = await music.extractors.register(SpotifyExtractor, {});
    const youtube = await music.extractors.register(YoutubeiExtractor, {
        logLevel: 'NONE',
        ignoreSignInErrors: true,
        createStream: createYoutubeStream,
    });
    if (!soundCloud || !spotify || !youtube) throw new Error('One or more music extractors failed to initialize.');
    console.log('Node-only music is ready.');
}

export function getManager(): DiscordPlayer {
    if (!player) throw new Error('Music service has not been initialized.');
    return player;
}

export function getPlayer(guildId: string): MusicQueue | undefined {
    return (player?.nodes.get(guildId) as MusicQueue | null) ?? undefined;
}

function voiceError(interaction: ChatInputCommandInteraction | ButtonInteraction, requireQueue: boolean): string | null {
    if (!interaction.guild || !(interaction.member instanceof GuildMember)) return 'This control can only be used in a server.';

    const queue = getPlayer(interaction.guild.id);
    if (requireQueue && !queue) return 'Nothing is currently playing.';

    const result = checkVoiceControl(interaction.member.voice.channelId, interaction.guild.members.me?.voice.channelId ?? null);
    if (result === 'not-in-voice') return 'Join a voice channel first.';
    if (result === 'different-channel') return 'You must be in the same voice channel as the bot.';
    return null;
}

export function validateMediaUrl(query: string): void {
    if (!/^https?:\/\//i.test(query)) return;

    let url: URL;
    try {
        url = new URL(query);
    } catch {
        throw new Error('That media URL is invalid.');
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const allowedDomains = ['youtube.com', 'soundcloud.com', 'spotify.com'];
    const allowed = hostname === 'youtu.be' || hostname === 'spotify.link' || allowedDomains.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    if (url.protocol !== 'https:' || !allowed) {
        throw new Error('Only YouTube, SoundCloud, and Spotify URLs are supported.');
    }
}

export async function play(interaction: ChatInputCommandInteraction, query: string | Track): Promise<{ tracks: Track[]; playlist: boolean }> {
    const error = voiceError(interaction, false);
    if (error) throw new Error(error);
    if (typeof query === 'string') {
        validateMediaUrl(query);
        if (query.length > 200) throw new Error('Search queries are limited to 200 characters.');
    }

    const cooldownKey = `${interaction.guildId}:${interaction.user.id}`;
    const cooldown = playCooldowns.get(cooldownKey) ?? 0;
    if (cooldown > Date.now()) throw new Error('Wait a few seconds before adding another track.');
    playCooldowns.set(cooldownKey, Date.now() + 3_000);

    const member = interaction.member as GuildMember;
    const channel = member.voice.channel!;
    const botMember = interaction.guild!.members.me;
    if (!botMember || !channel.permissionsFor(botMember).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
        throw new Error('I need permission to view, connect, and speak in your voice channel.');
    }

    const existingQueue = getPlayer(interaction.guildId!);
    const availableSlots = QUEUE_CAPACITY - (existingQueue?.size ?? 0);
    if (availableSlots <= 0) throw new Error(`The queue is full (${QUEUE_CAPACITY} upcoming tracks).`);

    const result = await getManager().play(channel, query, {
        requestedBy: interaction.user,
        searchEngine: QueryType.AUTO,
        signal: AbortSignal.timeout(20_000),
        nodeOptions: {
            metadata: interaction.channel as TextBasedChannel,
            volume: 80,
            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 120_000,
            leaveOnEnd: true,
            leaveOnEndCooldown: 120_000,
            leaveOnStop: true,
            leaveOnStopCooldown: 120_000,
            pauseOnEmpty: true,
            maxSize: QUEUE_CAPACITY,
        },
        afterSearch: async searchResult => {
            const limit = Math.min(50, availableSlots);
            if (searchResult.tracks.length > limit) {
                searchResult.tracks.splice(limit);
                if (searchResult.playlist) searchResult.playlist.tracks.splice(limit);
            }
            return searchResult;
        },
    });

    result.queue.setMetadata(interaction.channel as TextBasedChannel);

    const playlist = Boolean(result.searchResult.playlist);
    return {
        tracks: playlist ? result.searchResult.tracks : [result.track],
        playlist,
    };
}

export function requirePlayer(interaction: ChatInputCommandInteraction, requireTrack = false): MusicQueue {
    const error = voiceError(interaction, true);
    if (error) throw new Error(error);
    const queue = getPlayer(interaction.guildId!)!;
    if (requireTrack && !queue.currentTrack) throw new Error('Nothing is currently playing.');
    return queue;
}

export function musicControls(queue: MusicQueue): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('music:control:pause')
            .setLabel(queue.node.isPaused() ? 'Resume' : 'Pause')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('music:control:previous').setLabel('Previous').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music:control:skip').setLabel('Skip').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('music:control:stop').setLabel('Stop').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('music:control:queue').setLabel('Queue').setStyle(ButtonStyle.Secondary),
    );
}

function repeatLabel(mode: QueueRepeatMode): string {
    if (mode === QueueRepeatMode.TRACK) return 'Track';
    if (mode === QueueRepeatMode.QUEUE) return 'Queue';
    if (mode === QueueRepeatMode.AUTOPLAY) return 'Autoplay';
    return 'Off';
}

export function trackEmbed(track: Track, title = 'Now Playing', queue?: MusicQueue): EmbedBuilder {
    const actualSource = track.bridgedTrack?.source;
    const progress = queue?.node.createProgressBar({ length: 14, timecodes: true }) ?? formatDuration(track.durationMS, track.live);
    const next = queue?.tracks.at(0);
    const updatedAt = queue ? (trackStartedAt.get(queue.guild.id) ?? Date.now()) : Date.now();
    const embed = new EmbedBuilder()
        .setColor('#8B5CF6')
        .setTitle(title)
        .setDescription(`[${track.title}](${track.url})`)
        .addFields(
            { name: 'Artist', value: track.author || 'Unknown', inline: true },
            { name: 'Progress', value: progress || formatDuration(track.durationMS, track.live), inline: false },
            { name: 'Source', value: actualSource && actualSource !== track.source ? `${track.source} → ${actualSource}` : track.source || 'Unknown', inline: true },
            { name: 'Volume', value: `${queue?.node.volume ?? 80}%`, inline: true },
            { name: 'Mode', value: `${queue?.node.isPaused() ? 'Paused' : 'Playing'} | Loop: ${queue ? repeatLabel(queue.repeatMode) : 'Off'} | Shuffle: ${queue?.isShuffling ? 'On' : 'Off'}`, inline: false },
            { name: 'Next', value: next ? `[${next.title}](${next.url})` : 'Nothing queued', inline: false },
            { name: 'Queue', value: `${queue?.size ?? 0} upcoming${queue ? ` | ${formatDuration(queue.estimatedDuration)}` : ''}`, inline: true },
            { name: 'Voice', value: queue?.channel ? `<#${queue.channel.id}>` : 'Unknown', inline: true },
            { name: 'Updated at', value: `<t:${Math.floor(updatedAt / 1_000)}:t>`, inline: true },
        );

    if (track.thumbnail) embed.setThumbnail(track.thumbnail);
    if (track.requestedBy?.username) embed.setFooter({ text: `Requested by ${track.requestedBy.username}` });
    return embed;
}

export async function updateController(queue: MusicQueue, disabled = false): Promise<void> {
    const channel = queue.metadata;
    if (!channel?.isSendable()) return;
    const track = queue.currentTrack;
    if (!track) return;
    const existing = controllerMessages.get(queue.guild.id);
    const components = musicControls(queue);
    if (disabled) components.components.forEach(component => component.setDisabled(true));
    const payload = { embeds: [trackEmbed(track, 'Now Playing', queue)], components: [components], allowedMentions: { parse: [] as never[] } };
    try {
        if (existing) await existing.edit(payload);
        else controllerMessages.set(queue.guild.id, await channel.send(payload));
    } catch (error) {
        console.error(`Could not update player controller for guild ${queue.guild.id}:`, error);
        controllerMessages.delete(queue.guild.id);
        try {
            controllerMessages.set(queue.guild.id, await channel.send(payload));
        } catch (sendError) {
            console.error(`Could not recreate player controller for guild ${queue.guild.id}:`, sendError);
        }
    }
}

export function getControllerMessageId(guildId: string): string | undefined {
    return controllerMessages.get(guildId)?.id;
}

export async function disableController(guildId: string): Promise<void> {
    const message = controllerMessages.get(guildId);
    controllerMessages.delete(guildId);
    trackStartedAt.delete(guildId);
    if (!message) return;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('music:inactive:previous').setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('music:inactive:pause').setLabel('Pause').setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId('music:inactive:skip').setLabel('Skip').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('music:inactive:stop').setLabel('Stop').setStyle(ButtonStyle.Danger).setDisabled(true),
        new ButtonBuilder().setCustomId('music:inactive:queue').setLabel('Queue').setStyle(ButtonStyle.Secondary).setDisabled(true),
    );
    await message.edit({ components: [row] }).catch(() => undefined);
}

export function markTrackFilter(guildId: string, trackId: string): void {
    filterTrackIds.set(guildId, trackId);
}

export async function shutdownMusic(): Promise<void> {
    for (const child of activeChildren) if (!child.killed) child.kill();
    activeChildren.clear();
    if (player) await player.destroy();
}

export async function seekFromInput(queue: MusicQueue, input: string): Promise<void> {
    const position = parseSeekPosition(input);
    if (position === null) throw new Error('Use seconds, MM:SS, or HH:MM:SS for the position.');
    const current = queue.currentTrack;
    if (!current || current.live) throw new Error('The current track cannot be seeked.');
    if (position > current.durationMS) throw new Error('That position is past the end of the track.');
    const success = await queue.node.seek(position);
    if (!success) throw new Error('The current track could not be seeked.');
}
