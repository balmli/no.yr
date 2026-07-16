import {expect} from 'chai';

import {
    dailyResourceCacheKey,
    honorCacheExpiry,
    shouldRefreshDailyResource,
} from '../lib/cache_schedule';

describe('cache scheduling', () => {
    const now = new Date('2026-07-16T10:00:00.000Z');

    it('does not schedule before a future Expires value', () => {
        expect(honorCacheExpiry(300, 'Thu, 16 Jul 2026 10:10:00 GMT', now)).to.equal(600);
    });

    it('keeps the normal schedule for missing, invalid, or past expiry', () => {
        expect(honorCacheExpiry(300, undefined, now)).to.equal(300);
        expect(honorCacheExpiry(300, 'not-a-date', now)).to.equal(300);
        expect(honorCacheExpiry(300, 'Thu, 16 Jul 2026 09:00:00 GMT', now)).to.equal(300);
    });

    it('reuses daily auxiliary data for the same resource, location, and date', () => {
        const key = dailyResourceCacheKey('sunrise', 59.9, 10.7, '2026-07-16');
        expect(shouldRefreshDailyResource(undefined, key)).to.equal(true);
        expect(shouldRefreshDailyResource(key, key)).to.equal(false);
        expect(shouldRefreshDailyResource(key, dailyResourceCacheKey('sunrise', 60, 10.7, '2026-07-16'))).to.equal(true);
        expect(shouldRefreshDailyResource(key, dailyResourceCacheKey('sunrise', 59.9, 10.7, '2026-07-17'))).to.equal(true);
    });
});
