export class JikanError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
    ) {
        super(message);
    }
}

const transientStatuses = new Set([429, 502, 503, 504]);

async function requestJikan(path: string, retry = true): Promise<unknown> {
    let response: Response;
    try {
        response = await fetch(`https://api.jikan.moe/v4${path}`, {
            headers: { 'User-Agent': 'discord-bot/1.0' },
            signal: AbortSignal.timeout(10_000),
        });
    } catch (error) {
        if (retry) {
            await new Promise(resolve => setTimeout(resolve, 750));
            return requestJikan(path, false);
        }
        throw new JikanError(error instanceof Error ? error.message : 'Jikan request failed.');
    }

    if (!response.ok) {
        if (retry && transientStatuses.has(response.status)) {
            const retryAfter = Number(response.headers.get('retry-after'));
            await new Promise(resolve => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(retryAfter * 1_000, 3_000) : 750));
            return requestJikan(path, false);
        }
        throw new JikanError(`Jikan request failed with HTTP ${response.status}.`, response.status);
    }

    return response.json();
}

function envelopeData(value: unknown): unknown {
    if (!value || typeof value !== 'object' || !('data' in value)) {
        throw new JikanError('Jikan returned an invalid response.');
    }
    return (value as { data: unknown }).data;
}

export async function jikanArray<T>(path: string): Promise<T[]> {
    const data = envelopeData(await requestJikan(path));
    if (!Array.isArray(data)) throw new JikanError('Jikan returned an invalid list.');
    return data as T[];
}

export async function jikanObject<T>(path: string): Promise<T> {
    const data = envelopeData(await requestJikan(path));
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new JikanError('Jikan returned an invalid object.');
    }
    return data as T;
}

export function validMalId(value: unknown): value is number {
    return Number.isInteger(value) && Number(value) > 0;
}

export async function randomJikanId(kind: 'anime' | 'manga'): Promise<number> {
    try {
        const random = await jikanObject<{ mal_id?: unknown }>(`/random/${kind}`);
        if (validMalId(random.mal_id)) return random.mal_id;
    } catch (error) {
        if (!(error instanceof JikanError)) throw error;
    }

    const page = Math.floor(Math.random() * 10) + 1;
    const fallback = await jikanArray<{ mal_id?: unknown }>(`/top/${kind}?page=${page}&limit=25`);
    const valid = fallback.filter(item => validMalId(item?.mal_id));
    if (!valid.length) throw new JikanError(`No ${kind} recommendation is currently available.`);
    return valid[Math.floor(Math.random() * valid.length)].mal_id as number;
}

export function isUnknownMessage(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 10008);
}

export function logCollectorError(context: string, error: unknown): void {
    if (!isUnknownMessage(error)) console.error(context, error);
}
