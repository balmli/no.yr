import {expect} from 'chai';

import {nextHoursComparer, nextHoursSum, periodComparer, periodSum} from '../lib/yr_lib';

describe('forecast Flow conditions without data', () => {
    const nextArgs = {start: {id: '0'}, hours: 1, value: 1};
    const periodArgs = {start: '00:00', end: '01:00', day: 0, value: 1};

    it('returns false for comparer conditions', () => {
        expect(nextHoursComparer(undefined, nextArgs, undefined as any, () => true)).to.equal(false);
        expect(periodComparer(undefined, periodArgs, undefined as any, () => true)).to.equal(false);
    });

    it('returns false for sum conditions', () => {
        expect(nextHoursSum(undefined, nextArgs, undefined as any, () => 1, () => true)).to.equal(false);
        expect(periodSum(undefined, periodArgs, undefined as any, () => 1, () => true)).to.equal(false);
    });

    it('returns false for empty forecast arrays', () => {
        expect(nextHoursComparer(undefined, nextArgs, [], () => true)).to.equal(false);
        expect(nextHoursSum(undefined, nextArgs, [], () => 1, () => true)).to.equal(false);
    });
});
