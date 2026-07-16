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

export function dailyResourceCacheKey(
    resource: string,
    lat: number,
    lon: number,
    date: string,
): string {
    return `${resource}:${lat}:${lon}:${date}`;
}

export function shouldRefreshDailyResource(cachedKey: string | undefined, requestedKey: string): boolean {
    return cachedKey !== requestedKey;
}
