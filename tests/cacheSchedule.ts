import {expect} from 'chai';

import {honorCacheExpiry} from '../lib/cache_schedule';

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
});
