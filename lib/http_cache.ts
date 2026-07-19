export interface CacheableFetchResult {
    data: string | null;
    lastModified?: string;
    expires?: string;
    retrievedAt?: string;
    notModified: boolean;
    throttled?: boolean;
}

type Fetcher = (ifModifiedSince?: string) => Promise<CacheableFetchResult | null>;

export class HttpResourceCache {
    private readonly cache = new Map<string, CacheableFetchResult>();
    private readonly inFlight = new Map<string, Promise<CacheableFetchResult | null>>();

    constructor(private readonly maxEntries = 64) {
        if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
            throw new Error('HTTP resource cache maxEntries must be a positive integer');
        }
    }

    get size(): number {
        return this.cache.size;
    }

    async get(key: string, fetcher: Fetcher, now = new Date()): Promise<CacheableFetchResult | null> {
        this.pruneExpired(now, key);
        const cached = this.cache.get(key);
        const expiresAt = cached?.expires ? Date.parse(cached.expires) : NaN;
        if (cached && Number.isFinite(expiresAt) && expiresAt > now.getTime()) {
            this.touch(key, cached);
            return cached;
        }

        const pending = this.inFlight.get(key);
        if (pending) {
            return pending;
        }

        const request = this.load(key, cached, fetcher);
        this.inFlight.set(key, request);
        try {
            return await request;
        } finally {
            if (this.inFlight.get(key) === request) {
                this.inFlight.delete(key);
            }
        }
    }

    private async load(
        key: string,
        cached: CacheableFetchResult | undefined,
        fetcher: Fetcher,
    ): Promise<CacheableFetchResult | null> {
        const result = await fetcher(cached?.lastModified);
        if (!result) {
            return null;
        }
        if (result.notModified && cached) {
            const revalidated = {
                data: cached.data,
                lastModified: result.lastModified ?? cached.lastModified,
                expires: result.expires ?? cached.expires,
                retrievedAt: cached.retrievedAt,
                notModified: false,
            };
            this.set(key, revalidated);
            return revalidated;
        }
        if (!result.notModified && result.data !== null) {
            this.set(key, result);
        }
        return result;
    }

    private pruneExpired(now: Date, currentKey: string): void {
        for (const [key, cached] of this.cache) {
            if (key === currentKey || !cached.expires) {
                continue;
            }
            const expiresAt = Date.parse(cached.expires);
            if (Number.isFinite(expiresAt) && expiresAt <= now.getTime()) {
                this.cache.delete(key);
            }
        }
    }

    private touch(key: string, value: CacheableFetchResult): void {
        this.cache.delete(key);
        this.cache.set(key, value);
    }

    private set(key: string, value: CacheableFetchResult): void {
        this.touch(key, value);
        while (this.cache.size > this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey === undefined) {
                break;
            }
            this.cache.delete(oldestKey);
        }
    }
}
