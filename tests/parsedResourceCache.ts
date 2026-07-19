import {ParsedSingleResourceCache} from '../lib/parsed_resource_cache';

describe('parsed single-resource cache', () => {
    it('retains parsed data instead of the raw body across revalidation', async () => {
        const cache = new ParsedSingleResourceCache<{value: number}>();
        let fetchCount = 0;
        let parseCount = 0;
        let validator: string | undefined;
        const fetcher = async (ifModifiedSince?: string) => {
            fetchCount++;
            validator = ifModifiedSince;
            return fetchCount === 1
                ? {
                      data: '{"value":42}',
                      lastModified: 'validator-1',
                      expires: '2026-07-16T10:10:00Z',
                      notModified: false,
                  }
                : {
                      data: null,
                      lastModified: 'validator-1',
                      expires: '2026-07-16T10:20:00Z',
                      notModified: true,
                  };
        };
        const parser = (data: string) => {
            parseCount++;
            return JSON.parse(data) as {value: number};
        };

        const first = await cache.get(fetcher, parser, new Date('2026-07-16T10:00:00Z'));
        const cached = await cache.get(fetcher, parser, new Date('2026-07-16T10:05:00Z'));
        const revalidated = await cache.get(fetcher, parser, new Date('2026-07-16T10:11:00Z'));

        expect(first).to.deep.equal({value: 42});
        expect(cached).to.equal(first);
        expect(revalidated).to.equal(first);
        expect(fetchCount).to.equal(2);
        expect(parseCount).to.equal(1);
        expect(validator).to.equal('validator-1');
    });

    it('coalesces concurrent loads and does not cache parse failures', async () => {
        const cache = new ParsedSingleResourceCache<{ok: boolean}>();
        let resolveFetch: (value: any) => void = () => undefined;
        let fetchCount = 0;
        const fetcher = async () => {
            fetchCount++;
            return new Promise<any>(resolve => {
                resolveFetch = resolve;
            });
        };

        const first = cache.get(fetcher, () => undefined);
        const second = cache.get(fetcher, () => undefined);
        resolveFetch({data: 'invalid', notModified: false});

        expect(await first).to.equal(null);
        expect(await second).to.equal(null);
        expect(fetchCount).to.equal(1);
    });
});
