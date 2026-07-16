import {expect} from 'chai';

import moment from '../lib/moment-timezone-with-data';
import {getDateAddPeriod} from '../lib/yr_lib';

describe('getDateAddPeriod', () => {
    it('normalizes day/hour periods to the exact UTC hour', () => {
        const originalNow = (moment as any).now;
        (moment as any).now = () => Date.parse('2026-07-16T10:41:48.765Z');
        try {
            expect(getDateAddPeriod('1:6').toISOString()).to.equal('2026-07-17T06:00:00.000Z');
        } finally {
            (moment as any).now = originalNow;
        }
    });
});
