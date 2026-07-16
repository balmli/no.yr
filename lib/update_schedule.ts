export function isFetchUpdateDue(
    forceUpdate: boolean,
    updateDeadline: number | undefined,
    completedAt = Date.now(),
): boolean {
    return forceUpdate || (updateDeadline !== undefined && completedAt >= updateDeadline);
}

export function millisecondsUntilUpdateDeadline(updateDeadline: number, now = Date.now()): number {
    return Math.max(0, updateDeadline - now);
}

export async function applyFetchedDataIfDue(
    forceUpdate: boolean,
    updateDeadline: number | undefined,
    apply: () => Promise<void>,
    completedAt = Date.now(),
): Promise<boolean> {
    if (!isFetchUpdateDue(forceUpdate, updateDeadline, completedAt)) {
        return false;
    }
    await apply();
    return true;
}
