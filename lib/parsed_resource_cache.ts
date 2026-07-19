import {CacheableFetchResult} from './http_cache';

type Fetcher = (ifModifiedSince?: string) => Promise<CacheableFetchResult | null>;
type Parser<T> = (data: string) => T | undefined;

interface ParsedCacheEntry<T> {
    value: T;
    lastModified?: string;
    expires?: string;
}

export class ParsedSingleResourceCache<T> {
    private cached?: ParsedCacheEntry<T>;
    private inFlight?: Promise<T | null>;

    async get(fetcher: Fetcher, parser: Parser<T>, now = new Date()): Promise<T | null> {
        const expiresAt = this.cached?.expires ? Date.parse(this.cached.expires) : NaN;
        if (this.cached && Number.isFinite(expiresAt) && expiresAt > now.getTime()) {
            return this.cached.value;
        }
        if (this.inFlight) {
            return this.inFlight;
        }

        const request = this.load(fetcher, parser);
        this.inFlight = request;
        try {
            return await request;
        } finally {
            if (this.inFlight === request) {
                this.inFlight = undefined;
            }
        }
    }

    private async load(fetcher: Fetcher, parser: Parser<T>): Promise<T | null> {
        const result = await fetcher(this.cached?.lastModified);
        if (!result) {
            return null;
        }
        if (result.notModified && this.cached) {
            this.cached = {
                value: this.cached.value,
                lastModified: result.lastModified ?? this.cached.lastModified,
                expires: result.expires ?? this.cached.expires,
            };
            return this.cached.value;
        }
        if (result.data === null) {
            return null;
        }

        const parsed = parser(result.data);
        if (parsed === undefined) {
            return null;
        }
        this.cached = {
            value: parsed,
            lastModified: result.lastModified,
            expires: result.expires,
        };
        return parsed;
    }
}
