import {getDateAddPeriod} from '../lib/yr_lib';

describe('getDateAddPeriod', () => {
    it('normalizes day/hour periods to the exact UTC hour', () => {
        expect(getDateAddPeriod('1:6', '2026-07-16T10:41:48.765Z').toISOString()).to.equal('2026-07-17T06:00:00.000Z');
    });
});
