export function honorCacheExpiry(
    scheduledSeconds: number,
    expires: string | undefined,
    now = new Date(),
): number {
    if (!expires) {
        return scheduledSeconds;
    }
    const expiresAt = Date.parse(expires);
    if (!Number.isFinite(expiresAt)) {
        return scheduledSeconds;
    }
    const secondsUntilExpiry = Math.ceil((expiresAt - now.getTime()) / 1000);
    return Math.max(scheduledSeconds, secondsUntilExpiry);
}
