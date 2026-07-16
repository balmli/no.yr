export class RateLimitBackoff {
    private blockedUntil = 0;

    constructor(private readonly fallbackMilliseconds = 60_000) {}

    register429(retryAfter: string | undefined, now = new Date()): void {
        let deadline = NaN;
        if (retryAfter && /^\d+$/.test(retryAfter.trim())) {
            deadline = now.getTime() + Number(retryAfter) * 1000;
        } else if (retryAfter) {
            deadline = Date.parse(retryAfter);
        }
        if (!Number.isFinite(deadline) || deadline <= now.getTime()) {
            deadline = now.getTime() + this.fallbackMilliseconds;
        }
        this.blockedUntil = Math.max(this.blockedUntil, deadline);
    }

    remainingMilliseconds(now = new Date()): number {
        return Math.max(0, this.blockedUntil - now.getTime());
    }
}
