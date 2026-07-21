export type VoiceControlResult = 'allowed' | 'not-in-voice' | 'different-channel';

export function checkVoiceControl(
    userChannelId: string | null,
    botChannelId: string | null,
): VoiceControlResult {
    if (!userChannelId) return 'not-in-voice';
    if (botChannelId && userChannelId !== botChannelId) return 'different-channel';
    return 'allowed';
}

export function moveArrayItem<T>(items: T[], from: number, to: number): T[] {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length) {
        throw new RangeError('Queue position is out of range.');
    }

    const result = [...items];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
}

export function formatDuration(milliseconds: number, isStream = false): string {
    if (isStream) return 'LIVE';

    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    return hours > 0
        ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function parseSeekPosition(value: string): number | null {
    const parts = value.split(':').map(Number);
    if (parts.some(part => !Number.isInteger(part) || part < 0) || parts.length < 1 || parts.length > 3) return null;

    let seconds = 0;
    for (const part of parts) seconds = seconds * 60 + part;
    return seconds * 1_000;
}

export function calculateVoteThreshold(listenerCount: number): number {
    if (listenerCount <= 1) return 1;
    return Math.max(2, Math.ceil(listenerCount * 0.5));
}

export function canDirectlyControlTrack(requesterId: string | null, userId: string, requesterIsPresent: boolean): boolean {
    return requesterIsPresent && requesterId === userId;
}
