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
});
