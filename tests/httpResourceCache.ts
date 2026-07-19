import {HttpResourceCache} from '../lib/http_cache';

describe('HTTP resource cache', () => {
    it('reuses unexpired data and revalidates after expiry', async () => {
        const cache = new HttpResourceCache();
        let calls = 0;
        let validator: string | undefined;
        const fetcher = async (ifModifiedSince?: string) => {
            calls++;
            validator = ifModifiedSince;
            return {
                data: calls === 1 ? 'payload' : null,
                lastModified: 'validator-1',
                expires: calls === 1 ? '2026-07-16T10:10:00Z' : '2026-07-16T10:20:00Z',
                notModified: calls !== 1,
            };
        };

        const first = await cache.get('resource', fetcher, new Date('2026-07-16T10:00:00Z'));
        const cached = await cache.get('resource', fetcher, new Date('2026-07-16T10:05:00Z'));
        const revalidated = await cache.get('resource', fetcher, new Date('2026-07-16T10:11:00Z'));

        expect(first?.data).to.equal('payload');
        expect(cached?.data).to.equal('payload');
        expect(revalidated).to.deep.include({data: 'payload', expires: '2026-07-16T10:20:00Z'});
        expect(calls).to.equal(2);
        expect(validator).to.equal('validator-1');
    });

    it('deduplicates simultaneous requests for the same resource', async () => {
        const cache = new HttpResourceCache();
        let calls = 0;
        let resolveFetch: (value: any) => void = () => undefined;
        const fetcher = async () => {
            calls++;
            return new Promise<any>(resolve => {
                resolveFetch = resolve;
            });
        };

        const first = cache.get('shared', fetcher);
        const second = cache.get('shared', fetcher);
        resolveFetch({data: 'shared-data', notModified: false});

        expect(await first).to.deep.equal(await second);
        expect(calls).to.equal(1);
    });

    it('prunes expired resources other than the entry being revalidated', async () => {
        const cache = new HttpResourceCache();
        const fetcher = async () => ({
            data: 'payload',
            expires: '2026-07-16T10:10:00Z',
            notModified: false,
        });

        await cache.get('old-resource', fetcher, new Date('2026-07-16T10:00:00Z'));
        await cache.get('new-resource', fetcher, new Date('2026-07-16T10:11:00Z'));

        expect(cache.size).to.equal(1);
    });

    it('keeps only the most recently used resources when capacity is reached', async () => {
        const cache = new HttpResourceCache(2);
        const fetcher = async () => ({
            data: 'payload',
            expires: '2026-07-16T11:00:00Z',
            notModified: false,
        });
        const now = new Date('2026-07-16T10:00:00Z');

        await cache.get('first', fetcher, now);
        await cache.get('second', fetcher, now);
        await cache.get('first', fetcher, now);
        await cache.get('third', fetcher, now);

        expect(cache.size).to.equal(2);
        let secondCalls = 0;
        await cache.get(
            'second',
            async () => {
                secondCalls++;
                return {data: 'reloaded', expires: '2026-07-16T11:00:00Z', notModified: false};
            },
            now,
        );
        expect(secondCalls).to.equal(1);
    });

    it('rejects invalid capacities', () => {
        expect(() => new HttpResourceCache(0)).to.throw('positive integer');
    });
});
