import {fetchTextforecast, findTextforecastForLocation, parseTextforecastGeoJsonFile} from '../lib/yr_lib';

const textforecastGeoJson = JSON.stringify({
    type: 'FeatureCollection',
    lang: 'no',
    lastChange: '2026-07-18T22:08:12Z',
    features: [
        ...[
            ['2026-07-19T00:00:00Z', '2026-07-20T00:00:00Z', 'Østlig eller skiftende bris.'],
            ['2026-07-20T00:00:00Z', '2026-07-21T00:00:00Z', 'Skiftande bris.'],
        ].map(([from, to, text]) => ({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [4, 59],
                        [7, 59],
                        [7, 62],
                        [4, 62],
                        [4, 59],
                    ],
                ],
            },
            when: {interval: [from, to]},
            properties: {area: 'Hordaland', text, title: `Varsel for Hordaland fra ${from} til ${to}`},
        })),
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [9, 58],
                        [12, 58],
                        [12, 61],
                        [9, 61],
                        [9, 58],
                    ],
                ],
            },
            when: {interval: ['2026-07-19T00:00:00Z', '2026-07-20T00:00:00Z']},
            properties: {area: 'Østlandet', text: 'Oppholdsvær.', title: 'Varsel for Østlandet'},
        },
    ],
});

describe('Textforecast 3.0 GeoJSON', function () {
    it('fetches the 3.0 endpoint once for multiple devices while the response is cached', async function () {
        const originalFetch = globalThis.fetch;
        const requestedUrls: string[] = [];
        const logger = {
            debug: () => undefined,
            info: () => undefined,
            warn: () => undefined,
            error: () => undefined,
        } as any;
        const homey = {__: (key: string) => key} as any;
        globalThis.fetch = (async (url: string | URL | Request) => {
            requestedUrls.push(url.toString());
            return new Response(textforecastGeoJson, {
                status: 200,
                headers: {
                    Expires: 'Sun, 19 Jul 2099 12:00:00 GMT',
                    'Last-Modified': 'Sun, 19 Jul 2026 00:00:00 GMT',
                },
            });
        }) as typeof fetch;

        try {
            const bergen = await fetchTextforecast(60.393608, 5.316064, '1.0.0', logger, homey);
            const oslo = await fetchTextforecast(59.9139, 10.7522, '1.0.0', logger, homey);

            expect(bergen[0].locations[0].name).eq('Hordaland');
            expect(oslo[0].locations[0].name).eq('Østlandet');
            expect(requestedUrls).deep.eq(['https://api.met.no/weatherapi/textforecast/3.0/landoverview']);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    it('finds and groups the forecast for Bergen', function () {
        const parsed = parseTextforecastGeoJsonFile(textforecastGeoJson);

        expect(parsed).not.eq(undefined);
        const forecasts = findTextforecastForLocation(parsed!, 60.393608, 5.316064);

        expect(forecasts.length).eq(2);
        expect(forecasts[0].from).eq('2026-07-19T02:00:00+02:00');
        expect(forecasts[0].to).eq('2026-07-20T02:00:00+02:00');
        expect(forecasts[0].locations.length).eq(1);
        expect(forecasts[0].locations[0].id).eq('Hordaland');
        expect(forecasts[0].locations[0].name).eq('Hordaland');
        expect(forecasts[0].locations[0].forecast).contains('Østlig eller skiftende bris');
        expect(forecasts[1].locations[0].name).eq('Hordaland');
        expect(forecasts[1].locations[0].forecast).contains('Skiftande bris');
    });

    it('returns no forecast outside the supported polygons', function () {
        const parsed = parseTextforecastGeoJsonFile(textforecastGeoJson);

        expect(findTextforecastForLocation(parsed!, 51.5072, -0.1276)).deep.eq([]);
    });

    it('groups overlapping areas in the same forecast period', function () {
        const json = JSON.stringify({
            type: 'FeatureCollection',
            lang: 'no',
            lastChange: '2026-07-18T22:08:12Z',
            features: ['Regionalt', 'Fjellområde'].map(area => ({
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [4, 59],
                            [7, 59],
                            [7, 62],
                            [4, 62],
                            [4, 59],
                        ],
                    ],
                },
                when: {interval: ['2026-07-19T00:00:00Z', '2026-07-20T00:00:00Z']},
                properties: {area, text: `Varsel for ${area}`, title: area},
            })),
        });
        const parsed = parseTextforecastGeoJsonFile(json);
        const forecasts = findTextforecastForLocation(parsed!, 60.4, 5.3);

        expect(forecasts.length).eq(1);
        expect(forecasts[0].locations.map(location => location.name)).deep.eq(['Regionalt', 'Fjellområde']);
    });

    it('rejects malformed features', function () {
        const malformed = JSON.stringify({
            type: 'FeatureCollection',
            lang: 'no',
            lastChange: '2026-07-18T22:08:12Z',
            features: [{type: 'Feature'}],
        });

        expect(parseTextforecastGeoJsonFile(malformed)).eq(undefined);
    });
});
