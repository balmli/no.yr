import type {CacheableFetchResult} from './http_cache';

type Fetcher = (ifModifiedSince?: string) => Promise<CacheableFetchResult | null>;
type Parser<T> = (data: string) => T | undefined | Promise<T | undefined>;

interface ParsedCacheEntry<T> {
    value: T;
    lastModified?: string;
    expires?: string;
}

export class ParsedSingleResourceCache<T> {
    private readonly cache = new ParsedResourceCache<T>(1);

    async get(fetcher: Fetcher, parser: Parser<T>, now = new Date()): Promise<T | null> {
        return this.cache.get('resource', fetcher, parser, now);
    }
}

export class ParsedResourceCache<T> {
    private readonly cache = new Map<string, ParsedCacheEntry<T>>();
    private readonly inFlight = new Map<string, Promise<T | null>>();

    constructor(private readonly maxEntries = 64) {
        if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
            throw new Error('Parsed resource cache maxEntries must be a positive integer');
        }
    }

    get size(): number {
        return this.cache.size;
    }

    async get(key: string, fetcher: Fetcher, parser: Parser<T>, now = new Date()): Promise<T | null> {
        this.pruneExpired(now, key);
        const cached = this.cache.get(key);
        const expiresAt = cached?.expires ? Date.parse(cached.expires) : NaN;
        if (cached && Number.isFinite(expiresAt) && expiresAt > now.getTime()) {
            this.touch(key, cached);
            return cached.value;
        }
        const pending = this.inFlight.get(key);
        if (pending) {
            return pending;
        }

        const request = this.load(key, cached, fetcher, parser);
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
        cached: ParsedCacheEntry<T> | undefined,
        fetcher: Fetcher,
        parser: Parser<T>,
    ): Promise<T | null> {
        const result = await fetcher(cached?.lastModified);
        if (!result) {
            return null;
        }
        if (result.notModified && cached) {
            const revalidated = {
                value: cached.value,
                lastModified: result.lastModified ?? cached.lastModified,
                expires: result.expires ?? cached.expires,
            };
            this.set(key, revalidated);
            return revalidated.value;
        }
        if (result.data === null) {
            return null;
        }

        const parsed = await parser(result.data);
        if (parsed === undefined) {
            return null;
        }
        this.set(key, {
            value: parsed,
            lastModified: result.lastModified,
            expires: result.expires,
        });
        return parsed;
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

    private touch(key: string, value: ParsedCacheEntry<T>): void {
        this.cache.delete(key);
        this.cache.set(key, value);
    }

    private set(key: string, value: ParsedCacheEntry<T>): void {
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
