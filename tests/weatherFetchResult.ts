import {fetchNowcast, fetchWeather, toWeatherResult} from '../lib/yr_lib';

const logger: any = {
    debug() {},
    info() {},
    error() {},
};

describe('weather fetch result', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('does not classify malformed HTTP 200 data as not modified', () => {
        const result = toWeatherResult(
            {
                data: '{invalid json',
                lastModified: 'Thu, 16 Jul 2026 10:00:00 GMT',
                expires: 'Thu, 16 Jul 2026 11:00:00 GMT',
                notModified: false,
            },
            undefined,
            logger,
        );

        expect(result.data).to.equal(null);
        expect(result.notModified).to.equal(false);
        expect(result.lastModified).to.equal('Thu, 16 Jul 2026 10:00:00 GMT');
    });

    it('does not retain derived display times on every forecast entry', () => {
        const result = toWeatherResult(
            {
                data: JSON.stringify({
                    properties: {
                        timeseries: [{time: '2026-07-16T10:00:00Z', data: {instant: {details: {}}}}],
                    },
                }),
                notModified: false,
            },
            undefined,
            logger,
        );

        expect(result.data?.properties.timeseries[0]).not.to.have.property('localTime');
    });

    it('preserves an explicit HTTP 304 result', () => {
        const result = toWeatherResult(
            {
                data: null,
                notModified: true,
            },
            'cached-validator',
            logger,
        );

        expect(result).to.deep.equal({
            data: null,
            lastModified: 'cached-validator',
            expires: undefined,
            retrievedAt: undefined,
            notModified: true,
            throttled: false,
        });
    });

    it('preserves an explicit throttled result', () => {
        const result = toWeatherResult(
            {
                data: null,
                notModified: false,
                throttled: true,
            },
            undefined,
            logger,
        );

        expect(result).to.deep.equal({
            data: null,
            lastModified: undefined,
            expires: undefined,
            retrievedAt: undefined,
            notModified: false,
            throttled: true,
        });
    });

    for (const [name, fetchForecast] of [
        ['locationforecast', fetchWeather],
        ['nowcast', fetchNowcast],
    ] as const) {
        it(`does not retain and reparse a raw ${name} body after a 304`, async () => {
            let requestCount = 0;
            globalThis.fetch = (async () => {
                requestCount++;
                const notModified = requestCount === 2;
                return {
                    status: notModified ? 304 : 200,
                    statusText: notModified ? 'Not Modified' : 'OK',
                    headers: {
                        get(name: string) {
                            if (name === 'last-modified') return 'Thu, 16 Jul 2026 10:00:00 GMT';
                            if (name === 'expires') return 'Thu, 16 Jul 2026 10:01:00 GMT';
                            return null;
                        },
                    },
                    async text() {
                        return JSON.stringify({
                            type: 'Feature',
                            geometry: {type: 'Point', coordinates: [10, 60, 100]},
                            properties: {
                                meta: {updated_at: '2026-07-16T10:00:00Z', units: {}},
                                timeseries: [],
                            },
                        });
                    },
                } as Response;
            }) as typeof fetch;

            const first = await fetchForecast(60.1234, 10.1234, -1, undefined, '1.0.0', logger);
            const second = await fetchForecast(60.1234, 10.1234, -1, undefined, '1.0.0', logger, first.lastModified);

            expect(first.data).not.to.equal(null);
            expect(second).to.deep.include({data: null, notModified: true});
            expect(requestCount).to.equal(2);
        });
    }
});
