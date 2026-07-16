import {expect} from 'chai';

import {minutesUntilRain} from '../lib/nowcast';

const reference = new Date('2026-07-16T10:00:00Z');
const point = (minutes: number, rate: number): any => ({
    time: new Date(reference.getTime() + minutes * 60_000).toISOString(),
    data: {instant: {details: {precipitation_rate: rate}}},
});

describe('minutesUntilRain', () => {
    it('uses precipitation rates within the documented 90-minute horizon', () => {
        expect(minutesUntilRain([point(30, 0.2)], reference, 0.1)).to.equal(30);
        expect(minutesUntilRain([point(90, 0.2)], reference, 0.1)).to.equal(90);
        expect(minutesUntilRain([point(95, 0.2)], reference, 0.1)).to.equal(null);
    });

    it('returns zero when the last observation shows rain', () => {
        expect(minutesUntilRain([point(-5, 0.2), point(20, 0)], reference, 0.1)).to.equal(0);
    });

    it('returns null when no qualifying rain is forecast', () => {
        expect(minutesUntilRain([point(15, 0.1), point(45, 0)], reference, 0.1)).to.equal(null);
    });
});
