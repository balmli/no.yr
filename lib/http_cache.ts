export interface CacheableFetchResult {
    data: string | null;
    lastModified?: string;
    expires?: string;
    notModified: boolean;
}

type Fetcher = (ifModifiedSince?: string) => Promise<CacheableFetchResult | null>;

export class HttpResourceCache {
    private readonly cache = new Map<string, CacheableFetchResult>();
    private readonly inFlight = new Map<string, Promise<CacheableFetchResult | null>>();

    async get(key: string, fetcher: Fetcher, now = new Date()): Promise<CacheableFetchResult | null> {
        const cached = this.cache.get(key);
        const expiresAt = cached?.expires ? Date.parse(cached.expires) : NaN;
        if (cached && Number.isFinite(expiresAt) && expiresAt > now.getTime()) {
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
                notModified: false,
            };
            this.cache.set(key, revalidated);
            return revalidated;
        }
        if (!result.notModified && result.data !== null) {
            this.cache.set(key, result);
        }
        return result;
    }
}
