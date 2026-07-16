
import {RateLimitBackoff} from '../lib/rate_limit';

describe('application-wide rate-limit backoff', () => {
    const now = new Date('2026-07-16T10:00:00Z');

    it('honors Retry-After seconds across all callers', () => {
        const backoff = new RateLimitBackoff();
        backoff.register429('120', now);
        expect(backoff.remainingMilliseconds(new Date('2026-07-16T10:01:00Z'))).to.equal(60_000);
        expect(backoff.remainingMilliseconds(new Date('2026-07-16T10:02:00Z'))).to.equal(0);
    });

    it('honors Retry-After dates and uses a safe fallback', () => {
        const dated = new RateLimitBackoff();
        dated.register429('Thu, 16 Jul 2026 10:03:00 GMT', now);
        expect(dated.remainingMilliseconds(now)).to.equal(180_000);

        const fallback = new RateLimitBackoff(60_000);
        fallback.register429(undefined, now);
        expect(fallback.remainingMilliseconds(now)).to.equal(60_000);
    });

    it('never shortens an existing application-wide deadline', () => {
        const backoff = new RateLimitBackoff();
        backoff.register429('120', now);
        backoff.register429('30', now);
        expect(backoff.remainingMilliseconds(now)).to.equal(120_000);
    });
});
