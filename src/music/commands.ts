import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    ComponentType,
    EmbedBuilder,
    StringSelectMenuBuilder,
} from 'discord.js';
import { AudioFilters, QueryType, QueueRepeatMode } from 'discord-player';
import { formatDuration } from './utils';
import { getManager, getPlayer, markTrackFilter, play, QUEUE_CAPACITY, requirePlayer, seekFromInput, trackEmbed, updateController, validateMediaUrl } from './service';
import { confirmDangerAction, runSerialized, runSharedAction, runTrackAction } from './governance';

type MusicAction = () => Promise<void>;

async function run(interaction: ChatInputCommandInteraction, action: MusicAction, ephemeral = false): Promise<void> {
    await interaction.deferReply({ ephemeral });
    try {
        await action();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'The music command failed.';
        await interaction.editReply({ content: message, embeds: [], components: [] });
    }
}

export async function executePlay(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const result = await play(interaction, interaction.options.getString('query', true));
        const first = result.tracks[0];
        const description = result.playlist
            ? `Queued **${result.tracks.length} tracks** from a playlist.`
            : `Queued [${first.title}](${first.url}).`;
        await interaction.editReply({ content: description, allowedMentions: { parse: [] } });
    });
}

export async function executePause(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        await runTrackAction(interaction, 'pause', async () => {
            if (queue.node.isPaused()) throw new Error('Playback is already paused.');
            if (!queue.node.pause()) throw new Error('Playback could not be paused.');
            return 'Playback paused.';
        });
    });
}

export async function executeResume(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        await runTrackAction(interaction, 'resume', async () => {
            if (!queue.node.isPaused()) throw new Error('Playback is not paused.');
            if (!queue.node.resume()) throw new Error('Playback could not be resumed.');
            return 'Playback resumed.';
        });
    });
}

export async function executeSkip(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        const title = queue.currentTrack?.title ?? 'the current track';
        await runTrackAction(interaction, 'skip', async () => {
            if (!queue.node.skip()) throw new Error('The current track could not be skipped.');
            return `Skipped **${title}**.`;
        });
    });
}

export async function executeStop(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        await confirmDangerAction(interaction, 'stop', async () => {
            if (!queue.node.stop()) throw new Error('Playback could not be stopped.');
            return 'Playback stopped and the queue was cleared.';
        });
    }, true);
}

export async function executeDisconnect(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction);
        await confirmDangerAction(interaction, 'disconnect', async () => {
            queue.delete();
            return 'Disconnected and cleared the queue.';
        });
    }, true);
}

export async function executeNowPlaying(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = getPlayer(interaction.guildId ?? '');
        if (!queue?.currentTrack) throw new Error('Nothing is currently playing.');
        if (!queue.currentTrack) throw new Error('Nothing is currently playing.');
        await interaction.editReply({ embeds: [trackEmbed(queue.currentTrack, 'Now Playing', queue)], components: [] });
    });
}

export async function executeQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = getPlayer(interaction.guildId ?? '');
        if (!queue) throw new Error('There is no active music session.');
        let page = interaction.options.getInteger('page') ?? 1;
        const perPage = 10;
        const pages = Math.max(1, Math.ceil(queue.size / perPage));
        if (page > pages) throw new Error(`The queue only has ${pages} page${pages === 1 ? '' : 's'}.`);
        const id = Math.random().toString(36).slice(2, 9);
        const render = () => {
            const tracks = queue.tracks.toArray();
            const start = (page - 1) * perPage;
            const lines = tracks.slice(start, start + perPage).map((track, index) =>
                `**${start + index + 1}.** [${track.title}](${track.url}) \`${formatDuration(track.durationMS, track.live)}\` • ${track.requestedBy?.username ?? 'Unknown requester'}`
            );
            const embed = new EmbedBuilder().setColor('#8B5CF6').setTitle('Music Queue').setDescription([
                queue.currentTrack ? `**Playing:** [${queue.currentTrack.title}](${queue.currentTrack.url})` : '**Playing:** Nothing', '',
                ...(lines.length ? lines : ['The upcoming queue is empty.']),
            ].join('\n')).setFooter({ text: `Page ${page}/${pages} | ${tracks.length} upcoming | ${formatDuration(queue.estimatedDuration)}` });
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId(`queue:${id}:previous`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
                new ButtonBuilder().setCustomId(`queue:${id}:next`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page >= pages),
            );
            return { embed, row };
        };
        const initial = render();
        const message = await interaction.editReply({ embeds: [initial.embed], components: pages > 1 ? [initial.row] : [], allowedMentions: { parse: [] } });
        if (pages <= 1) return;
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120_000 });
        collector.on('collect', button => {
            void (async () => {
                if (button.user.id !== interaction.user.id) {
                    await button.reply({ content: 'This queue view belongs to another user.', ephemeral: true });
                    return;
                }
                page += button.customId.endsWith(':next') ? 1 : -1;
                page = Math.max(1, Math.min(page, pages));
                const rendered = render();
                await button.update({ embeds: [rendered.embed], components: [rendered.row] });
            })().catch(error => console.error('Queue pagination failed:', error));
        });
        collector.on('end', () => {
            const rendered = render();
            rendered.row.components.forEach(button => button.setDisabled(true));
            void message.edit({ components: [rendered.row] }).catch(() => undefined);
        });
    });
}

export async function executeVolume(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const volume = interaction.options.getInteger('level', true);
        const queue = requirePlayer(interaction, true);
        await runSharedAction(interaction, 'volume change', async () => {
            if (!queue.node.setVolume(volume)) throw new Error('Volume could not be changed.');
            return `Volume set to **${volume}%**.`;
        });
    });
}

export async function executeLoop(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const mode = interaction.options.getString('mode', true) as 'off' | 'track' | 'queue';
        const repeatModes = { off: QueueRepeatMode.OFF, track: QueueRepeatMode.TRACK, queue: QueueRepeatMode.QUEUE };
        const queue = requirePlayer(interaction, true);
        await runSharedAction(interaction, 'loop change', async () => {
            queue.setRepeatMode(repeatModes[mode]);
            return `Loop mode set to **${mode}**.`;
        });
    });
}

export async function executeShuffle(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction);
        if (queue.size < 2) throw new Error('At least two upcoming tracks are needed to shuffle.');
        await runSharedAction(interaction, 'shuffle', async () => {
            queue.enableShuffle(false);
            return `Shuffled **${queue.size} tracks**.`;
        });
    });
}

export async function executeSeek(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const position = interaction.options.getString('position', true);
        const queue = requirePlayer(interaction, true);
        await runTrackAction(interaction, 'seek', async () => {
            await seekFromInput(queue, position);
            return `Moved playback to **${position}**.`;
        });
    });
}

export async function executeRemove(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction);
        const position = interaction.options.getInteger('position', true) - 1;
        const end = (interaction.options.getInteger('end') ?? position + 1) - 1;
        if (end < position) throw new Error('The final position must not be before the first position.');
        const selected = queue.tracks.toArray().slice(position, end + 1);
        const track = selected[0];
        if (!track || selected.length !== end - position + 1) throw new Error('That queue range does not exist.');
        const remove = async () => {
            for (const item of selected) queue.removeTrack(item);
            return selected.length === 1 ? `Removed **${track.title}** from the queue.` : `Removed **${selected.length}** tracks from the queue.`;
        };
        if (selected.every(item => item.requestedBy?.id === interaction.user.id)) {
            const result = await runSerialized(queue.guild.id, remove);
            await interaction.editReply(result);
        } else {
            await runSharedAction(interaction, 'remove another requester\'s track', remove);
        }
    });
}

export async function executeMove(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction);
        const from = interaction.options.getInteger('from', true) - 1;
        const to = interaction.options.getInteger('to', true) - 1;
        const track = queue.tracks.at(from);
        if (!track || to < 0 || to >= queue.size) throw new Error('One of those queue positions does not exist.');
        if (from === to) throw new Error('Choose two different queue positions.');
        await runSharedAction(interaction, 'queue reorder', async () => {
            queue.moveTrack(from, to);
            return `Moved **${track.title}** to position **${to + 1}**.`;
        });
    });
}

export function currentTrack(guildId: string) {
    return getPlayer(guildId)?.currentTrack ?? null;
}

export async function executePrevious(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction);
        if (!queue.history.previousTrack) throw new Error('There is no previous track.');
        await runSharedAction(interaction, 'previous track', async () => {
            await queue.history.previous();
            return 'Playing the previous track.';
        });
    });
}

export async function executeReplay(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        await runTrackAction(interaction, 'replay', async () => {
            if (!await queue.node.seek(0)) throw new Error('The track could not be replayed.');
            return 'Replaying the current track.';
        });
    });
}

export async function executeClear(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction);
        const target = interaction.options.getString('target', true);
        if (target === 'mine') {
            const own = queue.tracks.toArray().filter(track => track.requestedBy?.id === interaction.user.id);
            await runSerialized(queue.guild.id, async () => {
                for (const track of own) queue.removeTrack(track);
                return undefined;
            });
            await interaction.editReply(`Removed **${own.length}** of your tracks.`);
            await updateController(queue);
            return;
        }
        if (target === 'filters') {
            await runTrackAction(interaction, 'clear filters', async () => {
                await queue.filters.ffmpeg.setFilters(false);
                return 'All audio filters were cleared.';
            });
            return;
        }
        await runSharedAction(interaction, 'clear queue', async () => {
            const count = queue.size;
            queue.clear();
            return `Cleared **${count}** upcoming tracks.`;
        });
    });
}

export async function executeDuplicates(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction);
        await runSharedAction(interaction, 'remove duplicates', async () => {
            const seen = new Set<string>();
            const duplicates = queue.tracks.toArray().filter(track => {
                const key = `${track.author}:${track.title}`.toLowerCase();
                if (seen.has(key)) return true;
                seen.add(key);
                return false;
            });
            for (const track of duplicates) queue.removeTrack(track);
            return `Removed **${duplicates.length}** duplicate tracks.`;
        });
    });
}

export async function executeHistory(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = getPlayer(interaction.guildId ?? '');
        if (!queue) throw new Error('There is no active music session.');
        const history = queue.history.tracks.toArray().slice(0, 15);
        const embed = new EmbedBuilder().setColor('#6366F1').setTitle('Recently Played')
            .setDescription(history.length ? history.map((track, index) => `**${index + 1}.** [${track.title}](${track.url})`).join('\n') : 'No tracks have finished yet.');
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
    });
}

export async function executeAutoplay(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        const enabled = interaction.options.getBoolean('enabled', true);
        await runSharedAction(interaction, 'autoplay change', async () => {
            queue.setRepeatMode(enabled ? QueueRepeatMode.AUTOPLAY : QueueRepeatMode.OFF);
            return `Autoplay **${enabled ? 'enabled' : 'disabled'}**.`;
        });
    });
}

export async function executeFilter(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        const preset = interaction.options.getString('preset', true);
        await runTrackAction(interaction, `filter: ${preset}`, async () => {
            if (preset === 'off') await queue.filters.ffmpeg.setFilters(false);
            else await queue.filters.ffmpeg.setFilters([preset]);
            if (queue.currentTrack) markTrackFilter(queue.guild.id, queue.currentTrack.id);
            return preset === 'off' ? 'Audio filters cleared.' : `Applied the **${preset}** filter to this track.`;
        });
    });
}

async function executeCustomFilter(interaction: ChatInputCommandInteraction, label: string, expression: string): Promise<void> {
    await run(interaction, async () => {
        const queue = requirePlayer(interaction, true);
        await runTrackAction(interaction, label, async () => {
            const name = `custom_${interaction.commandName}_${queue.guild.id}`;
            AudioFilters.define(name, expression);
            await queue.filters.ffmpeg.setFilters([name]);
            if (queue.currentTrack) markTrackFilter(queue.guild.id, queue.currentTrack.id);
            return `Applied **${label}** to this track.`;
        });
    });
}

export const executeSpeed = (interaction: ChatInputCommandInteraction) => {
    const amount = interaction.options.getInteger('percentage', true) / 100;
    return executeCustomFilter(interaction, `speed ${Math.round(amount * 100)}%`, `atempo=${amount}`);
};

export const executePitch = (interaction: ChatInputCommandInteraction) => {
    const amount = interaction.options.getInteger('percentage', true) / 100;
    return executeCustomFilter(interaction, `pitch ${Math.round(amount * 100)}%`, `asetrate=48000*${amount},aresample=48000,atempo=${1 / amount}`);
};

export const executeBassboost = (interaction: ChatInputCommandInteraction) => {
    const amount = interaction.options.getInteger('percentage', true);
    return executeCustomFilter(interaction, `bass boost ${amount}%`, `bass=g=${Math.min(20, amount / 10)}`);
};

export const executeEightD = (interaction: ChatInputCommandInteraction) => {
    const hz = interaction.options.getNumber('hz', true);
    return executeCustomFilter(interaction, `8D ${hz}Hz`, `apulsator=hz=${hz}`);
};

export const executeTremolo = (interaction: ChatInputCommandInteraction) => {
    const frequency = interaction.options.getNumber('frequency', true);
    const depth = interaction.options.getNumber('depth', true);
    return executeCustomFilter(interaction, `tremolo ${frequency}Hz`, `tremolo=f=${frequency}:d=${depth}`);
};

export const executeVibrato = (interaction: ChatInputCommandInteraction) => {
    const frequency = interaction.options.getNumber('frequency', true);
    const depth = interaction.options.getNumber('depth', true);
    return executeCustomFilter(interaction, `vibrato ${frequency}Hz`, `vibrato=f=${frequency}:d=${depth}`);
};

export async function executeLyrics(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = interaction.guildId ? getPlayer(interaction.guildId) : undefined;
        const query = interaction.options.getString('query') ?? (queue?.currentTrack ? `${queue.currentTrack.title} ${queue.currentTrack.author}` : null);
        if (!query) throw new Error('Provide a song query or play a track first.');
        const result = (await getManager().lyrics.search({ q: query }))[0];
        if (!result) throw new Error('No lyrics were found.');
        const lyrics = result.instrumental ? 'This track is instrumental.' : result.plainLyrics;
        if (!lyrics) throw new Error('Lyrics are unavailable for this track.');
        const excerpt = lyrics.length > 3_700 ? `${lyrics.slice(0, 3_697)}...` : lyrics;
        const embed = new EmbedBuilder().setColor('#EC4899').setTitle(`${result.trackName} — ${result.artistName}`).setDescription(excerpt).setFooter({ text: 'Lyrics provided by LRCLIB' });
        const files = lyrics.length > excerpt.length ? [new AttachmentBuilder(Buffer.from(lyrics), { name: 'lyrics.txt' })] : [];
        await interaction.editReply({ embeds: [embed], files, allowedMentions: { parse: [] } });
    });
}

export async function executeSearch(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const query = interaction.options.getString('query', true);
        const result = await getManager().search(query, { requestedBy: interaction.user, searchEngine: QueryType.AUTO });
        const tracks = result.tracks.slice(0, 5);
        if (!tracks.length) throw new Error('No tracks were found.');
        const id = Math.random().toString(36).slice(2, 9);
        const menu = new StringSelectMenuBuilder().setCustomId(`music:search:${id}`).setPlaceholder('Choose a track').addOptions(
            tracks.map((track, index) => ({ label: track.title.slice(0, 100), description: `${track.author} • ${track.duration}`.slice(0, 100), value: String(index) })),
        );
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
        const message = await interaction.editReply({ content: `Results for **${query}**`, components: [row], allowedMentions: { parse: [] } });
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60_000 });
        collector.on('collect', selection => {
            void (async () => {
                if (selection.user.id !== interaction.user.id) {
                    await selection.reply({ content: 'This search belongs to another user.', ephemeral: true });
                    return;
                }
                const track = tracks[Number(selection.values[0])];
                if (!track) throw new Error('That search result is no longer available.');
                await selection.deferUpdate();
                await play(interaction, track);
                collector.stop('selected');
                await interaction.editReply({ content: `Queued [${track.title}](${track.url}).`, components: [], allowedMentions: { parse: [] } });
            })().catch(error => console.error('Music search selection failed:', error));
        });
        collector.on('end', (_collected, reason) => {
            if (reason === 'selected') return;
            menu.setDisabled(true);
            void message.edit({ components: [row] }).catch(() => undefined);
        });
    });
}

export async function executeExportQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const queue = getPlayer(interaction.guildId ?? '');
        if (!queue) throw new Error('There is no active music session.');
        const tracks = [queue.currentTrack, ...queue.tracks.toArray()].filter(Boolean).map(track => ({ title: track!.title, url: track!.url }));
        const body = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tracks }, null, 2);
        await interaction.editReply({ content: `Exported **${tracks.length}** tracks.`, files: [new AttachmentBuilder(Buffer.from(body), { name: 'music-queue.json' })] });
    });
}

export async function executeImportQueue(interaction: ChatInputCommandInteraction): Promise<void> {
    await run(interaction, async () => {
        const attachment = interaction.options.getAttachment('file', true);
        if (attachment.size > 100_000) throw new Error('Queue files must be smaller than 100 KB.');
        const response = await fetch(attachment.url, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error('The queue file could not be downloaded.');
        const parsed = JSON.parse(await response.text()) as { version?: unknown; tracks?: Array<{ url?: unknown }> };
        if (parsed.version !== 1 || !Array.isArray(parsed.tracks)) throw new Error('This is not a supported queue file.');
        const urls = parsed.tracks.map(track => track?.url).filter((url): url is string => typeof url === 'string').slice(0, 50);
        if (!urls.length) throw new Error('The queue file contains no tracks.');
        for (const url of urls) validateMediaUrl(url);

        let queue = getPlayer(interaction.guildId ?? '');
        let added = 0;
        if (!queue) {
            const first = await play(interaction, urls[0]);
            added += first.tracks.length;
            queue = getPlayer(interaction.guildId!)!;
            urls.shift();
        } else {
            requirePlayer(interaction);
        }
        const available = Math.max(0, QUEUE_CAPACITY - queue.size);
        for (const url of urls.slice(0, available)) {
            const result = await getManager().search(url, { requestedBy: interaction.user, searchEngine: QueryType.AUTO });
            if (result.tracks[0]) {
                queue.addTrack(result.tracks[0]);
                added++;
            }
        }
        await interaction.editReply(`Imported **${added}** tracks.`);
        await updateController(queue);
    });
}
