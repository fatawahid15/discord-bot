import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    InteractionReplyOptions,
    InteractionEditReplyOptions,
    Message,
} from 'discord.js';
import { GuildQueue } from 'discord-player';
import { getControllerMessageId, getPlayer, updateController } from './service';
import { calculateVoteThreshold, canDirectlyControlTrack } from './utils';

type MusicQueue = GuildQueue<any>;
type GovernedInteraction = ChatInputCommandInteraction | ButtonInteraction;
type ActionExecutor = () => Promise<string>;

interface VoteSession {
    id: string;
    guildId: string;
    action: string;
    trackId?: string;
    queue: MusicQueue;
    votes: Set<string>;
    execute: ActionExecutor;
    message: Message;
    expiresAt: number;
    finished: boolean;
}

interface ConfirmationSession {
    id: string;
    guildId: string;
    userId: string;
    action: string;
    execute: ActionExecutor;
    queue: MusicQueue;
    expiresAt: number;
}

const votes = new Map<string, VoteSession>();
const confirmations = new Map<string, ConfirmationSession>();
const operationChains = new Map<string, Promise<unknown>>();
const voteCooldowns = new Map<string, number>();

function sessionId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function listeners(queue: MusicQueue): GuildMember[] {
    return queue.channel?.members.filter((member: GuildMember) => !member.user.bot).map((member: GuildMember) => member) ?? [];
}

function requiredVotes(queue: MusicQueue): number {
    const count = listeners(queue).length;
    return calculateVoteThreshold(count);
}

function requesterId(queue: MusicQueue): string | null {
    return queue.currentTrack?.requestedBy?.id ?? null;
}

function requesterPresent(queue: MusicQueue): boolean {
    const id = requesterId(queue);
    return Boolean(id && listeners(queue).some(member => member.id === id));
}

function userInQueueChannel(interaction: GovernedInteraction, queue: MusicQueue): boolean {
    return interaction.member instanceof GuildMember && interaction.member.voice.channelId === queue.channel?.id;
}

export function runSerialized<T>(guildId: string, operation: () => Promise<T>): Promise<T> {
    const previous = operationChains.get(guildId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    const tracked = current.finally(() => {
        if (operationChains.get(guildId) === tracked) operationChains.delete(guildId);
    });
    operationChains.set(guildId, tracked);
    return current;
}

async function publicResponse(interaction: GovernedInteraction, payload: InteractionEditReplyOptions): Promise<Message> {
    if (interaction.isChatInputCommand()) return interaction.editReply(payload);
    if (!interaction.deferred && !interaction.replied) {
        await interaction.reply(payload as InteractionReplyOptions);
        return interaction.fetchReply();
    }
    return interaction.followUp(payload as InteractionReplyOptions);
}

async function ephemeralResponse(interaction: GovernedInteraction, content: string): Promise<void> {
    if (interaction.deferred && interaction.isChatInputCommand()) {
        await interaction.editReply({ content, components: [], embeds: [] });
    } else if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true });
    } else {
        await interaction.reply({ content, ephemeral: true });
    }
}

function voteEmbed(session: Omit<VoteSession, 'message'>): EmbedBuilder {
    const needed = requiredVotes(session.queue);
    return new EmbedBuilder()
        .setColor('#F59E0B')
        .setTitle(`${session.action} vote`)
        .setDescription(`Listeners must approve this action.\n\n**Votes:** ${session.votes.size}/${needed}`)
        .setFooter({ text: 'Vote expires in 30 seconds. Roles and server permissions do not bypass voting.' });
}

async function beginVote(
    interaction: GovernedInteraction,
    queue: MusicQueue,
    action: string,
    execute: ActionExecutor,
    trackId?: string,
): Promise<void> {
    if (!userInQueueChannel(interaction, queue)) {
        await ephemeralResponse(interaction, 'Join the active voice channel to vote.');
        return;
    }

    const existing = [...votes.values()].find(vote => vote.guildId === queue.guild.id && vote.action === action && !vote.finished);
    if (existing) {
        await ephemeralResponse(interaction, `A **${action}** vote is already active.`);
        return;
    }
    const cooldownKey = `${queue.guild.id}:${interaction.user.id}`;
    if ((voteCooldowns.get(cooldownKey) ?? 0) > Date.now()) {
        await ephemeralResponse(interaction, 'Wait a few seconds before starting another vote.');
        return;
    }
    voteCooldowns.set(cooldownKey, Date.now() + 3_000);

    if (listeners(queue).length <= 1) {
        const result = await runSerialized(queue.guild.id, execute);
        await publicResponse(interaction, { content: result, embeds: [], components: [] });
        await updateController(queue);
        return;
    }

    const id = sessionId();
    const base = {
        id,
        guildId: queue.guild.id,
        action,
        trackId,
        queue,
        votes: new Set([interaction.user.id]),
        execute,
        expiresAt: Date.now() + 30_000,
        finished: false,
    };
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`music:vote:${id}`).setLabel('Vote').setStyle(ButtonStyle.Success),
    );
    const message = await publicResponse(interaction, { embeds: [voteEmbed(base as VoteSession)], components: [row], content: '' });
    const session: VoteSession = { ...base, message };
    votes.set(id, session);

    const timer = setTimeout(() => {
        if (session.finished) return;
        session.finished = true;
        votes.delete(id);
        row.components[0].setDisabled(true).setLabel('Vote expired');
        void message.edit({ embeds: [voteEmbed(session).setColor('#6B7280')], components: [row] }).catch(() => undefined);
    }, 30_000);
    timer.unref();
}

export async function runTrackAction(
    interaction: ChatInputCommandInteraction,
    action: string,
    execute: ActionExecutor,
): Promise<void> {
    const queue = getPlayer(interaction.guildId ?? '');
    if (!queue?.currentTrack) throw new Error('Nothing is currently playing.');
    const ownerCanControl = canDirectlyControlTrack(requesterId(queue), interaction.user.id, requesterPresent(queue));
    if (ownerCanControl) {
        const result = await runSerialized(queue.guild.id, execute);
        await interaction.editReply(result);
        await updateController(queue);
        return;
    }
    await beginVote(interaction, queue, action, execute, queue.currentTrack.id);
}

export async function runSharedAction(
    interaction: ChatInputCommandInteraction,
    action: string,
    execute: ActionExecutor,
): Promise<void> {
    const queue = getPlayer(interaction.guildId ?? '');
    if (!queue) throw new Error('There is no active music session.');
    await beginVote(interaction, queue, action, execute);
}

async function createConfirmation(
    interaction: GovernedInteraction,
    action: string,
    execute: ActionExecutor,
): Promise<void> {
    const queue = getPlayer(interaction.guildId ?? '');
    if (!queue) throw new Error('There is no active music session.');
    if (!userInQueueChannel(interaction, queue)) throw new Error('Join the active voice channel first.');
    const id = sessionId();
    confirmations.set(id, {
        id,
        guildId: queue.guild.id,
        userId: interaction.user.id,
        action,
        execute,
        queue,
        expiresAt: Date.now() + 15_000,
    });
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`music:confirm:${id}:yes`).setLabel(`Confirm ${action}`).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`music:confirm:${id}:no`).setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );
    const payload = { content: `Confirm **${action}**? This affects the entire music session.`, components: [row], embeds: [] };
    if (interaction.isChatInputCommand()) await interaction.editReply(payload);
    else await interaction.reply({ ...payload, ephemeral: true });
    const timer = setTimeout(() => confirmations.delete(id), 15_000);
    timer.unref();
}

export async function confirmDangerAction(interaction: ChatInputCommandInteraction, action: string, execute: ActionExecutor): Promise<void> {
    await createConfirmation(interaction, action, execute);
}

async function handleVote(interaction: ButtonInteraction, id: string): Promise<void> {
    const session = votes.get(id);
    if (!session || session.finished || session.expiresAt < Date.now()) {
        await interaction.reply({ content: 'This vote has expired.', ephemeral: true });
        return;
    }
    const queue = getPlayer(session.guildId);
    if (!queue || queue !== session.queue || (session.trackId && queue.currentTrack?.id !== session.trackId)) {
        session.finished = true;
        votes.delete(id);
        await interaction.update({ content: 'The music state changed, so this vote was cancelled.', embeds: [], components: [] });
        return;
    }
    if (!userInQueueChannel(interaction, queue)) {
        await interaction.reply({ content: 'Join the active voice channel to vote.', ephemeral: true });
        return;
    }
    if (session.votes.has(interaction.user.id)) {
        await interaction.reply({ content: 'You already voted.', ephemeral: true });
        return;
    }
    session.votes.add(interaction.user.id);
    const needed = requiredVotes(queue);
    if (session.votes.size < needed) {
        await interaction.update({ embeds: [voteEmbed(session)] });
        return;
    }

    session.finished = true;
    votes.delete(id);
    await interaction.deferUpdate();
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`music:vote:${id}`).setLabel('Vote passed').setStyle(ButtonStyle.Success).setDisabled(true),
    );
    try {
        const result = await runSerialized(queue.guild.id, session.execute);
        await interaction.editReply({ content: result, embeds: [], components: [row] });
        if (!queue.deleted) await updateController(queue);
    } catch (error) {
        row.components[0].setLabel('Action failed').setStyle(ButtonStyle.Danger);
        const message = error instanceof Error ? error.message : 'The approved action could not be completed.';
        await interaction.editReply({ content: message, embeds: [], components: [row] });
    }
}

async function handleConfirmation(interaction: ButtonInteraction, id: string, choice: string): Promise<void> {
    const session = confirmations.get(id);
    if (!session || session.expiresAt < Date.now()) {
        confirmations.delete(id);
        await interaction.reply({ content: 'This confirmation has expired.', ephemeral: true });
        return;
    }
    if (interaction.user.id !== session.userId) {
        await interaction.reply({ content: 'This confirmation belongs to another user.', ephemeral: true });
        return;
    }
    confirmations.delete(id);
    if (choice !== 'yes') {
        await interaction.update({ content: `${session.action} cancelled.`, components: [], embeds: [] });
        return;
    }
    if (getPlayer(session.guildId) !== session.queue) {
        await interaction.update({ content: 'The music session changed, so this confirmation was cancelled.', components: [], embeds: [] });
        return;
    }
    await interaction.update({ content: `${session.action} confirmed. Starting listener vote...`, components: [], embeds: [] });
    await beginVote(interaction, session.queue, session.action, session.execute);
}

async function handleController(interaction: ButtonInteraction, action: string): Promise<void> {
    const queue = getPlayer(interaction.guildId ?? '');
    if (!queue?.currentTrack) {
        await interaction.reply({ content: 'Nothing is currently playing.', ephemeral: true });
        return;
    }
    if (interaction.message.id !== getControllerMessageId(queue.guild.id)) {
        await interaction.reply({ content: 'This player controller is no longer active.', ephemeral: true });
        return;
    }
    if (!userInQueueChannel(interaction, queue)) {
        await interaction.reply({ content: 'Join the active voice channel first.', ephemeral: true });
        return;
    }

    if (action === 'queue') {
        const tracks = queue.tracks.toArray().slice(0, 10);
        await interaction.reply({
            content: tracks.length ? tracks.map((track, index) => `**${index + 1}.** ${track.title}`).join('\n') : 'The upcoming queue is empty.',
            ephemeral: true,
        });
        return;
    }
    if (action === 'stop') {
        await createConfirmation(interaction, 'stop', async () => {
            if (!queue.node.stop()) throw new Error('Playback could not be stopped.');
            return 'Playback stopped and the queue was cleared.';
        });
        return;
    }

    const execute = async (): Promise<string> => {
        if (action === 'pause') {
            const paused = queue.node.isPaused();
            if (!(paused ? queue.node.resume() : queue.node.pause())) throw new Error('Playback state could not be changed.');
            return paused ? 'Playback resumed.' : 'Playback paused.';
        }
        if (action === 'skip') {
            if (!queue.node.skip()) throw new Error('The track could not be skipped.');
            return 'Track skipped.';
        }
        if (action === 'previous') {
            await queue.history.previous();
            return 'Playing the previous track.';
        }
        throw new Error('Unknown player action.');
    };

    const isTrackAction = action === 'pause' || action === 'skip';
    const direct = isTrackAction && canDirectlyControlTrack(requesterId(queue), interaction.user.id, requesterPresent(queue));
    if (direct) {
        await interaction.deferUpdate();
        await runSerialized(queue.guild.id, execute);
        await updateController(queue);
    } else {
        await beginVote(interaction, queue, action, execute, isTrackAction ? queue.currentTrack.id : undefined);
    }
}

export async function handleMusicInteraction(interaction: ButtonInteraction): Promise<boolean> {
    if (!interaction.customId.startsWith('music:')) return false;
    try {
        const [, kind, id, choice] = interaction.customId.split(':');
        if (kind === 'vote') await handleVote(interaction, id);
        else if (kind === 'confirm') await handleConfirmation(interaction, id, choice);
        else if (kind === 'control') await handleController(interaction, id);
        else return false;
    } catch (error) {
        console.error('Music interaction failed:', error);
        const content = error instanceof Error ? error.message : 'The music action failed.';
        if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: true }).catch(() => undefined);
        else await interaction.reply({ content, ephemeral: true }).catch(() => undefined);
    }
    return true;
}
