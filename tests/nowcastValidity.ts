
import {isNowcastValid, mapNowcastEntry, nowcastLocationKey} from '../lib/nowcast';
import {RadarCoverage} from '../lib/types';

const now = new Date('2026-07-16T10:00:00Z');
const makeNowcast = (overrides: any = {}): any => ({
    properties: {
        meta: {
            updated_at: '2026-07-16T09:55:00Z',
            radar_coverage: RadarCoverage.ok,
            ...overrides.meta,
        },
        timeseries: overrides.timeseries ?? [{
            time: '2026-07-16T10:05:00Z',
            data: {instant: {details: {precipitation_rate: 1.2}}},
        }],
    },
});

describe('nowcast validity', () => {
    const location = nowcastLocationKey(59.9, 10.7);

    it('requires matching location, current coverage, fresh metadata, and data', () => {
        expect(isNowcastValid(makeNowcast(), location, location, now)).to.equal(true);
        expect(isNowcastValid(makeNowcast(), location, nowcastLocationKey(60, 10.7), now)).to.equal(false);
        expect(isNowcastValid(makeNowcast({meta: {radar_coverage: RadarCoverage.no_coverage}}), location, location, now)).to.equal(false);
        expect(isNowcastValid(makeNowcast({meta: {updated_at: '2026-07-16T09:40:00Z'}}), location, location, now)).to.equal(false);
        expect(isNowcastValid(makeNowcast({timeseries: []}), location, location, now)).to.equal(false);
    });

    it('derives five-minute precipitation amount from the instantaneous rate', () => {
        expect(mapNowcastEntry(makeNowcast().properties.timeseries[0])).to.deep.equal({
            time: '2026-07-16T10:05:00Z',
            precipitationRate: 1.2,
            precipitationAmount: 0.1,
        });
    });
});
