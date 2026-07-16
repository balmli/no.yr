export type TrackedFetchResult<T> =
    {ok: true; value: T} |
    {ok: false; error: unknown};

export async function attemptTrackedFetch<T>(
    fetcher: () => Promise<T>,
    onFailure: () => Promise<void>,
): Promise<TrackedFetchResult<T>> {
    try {
        return {ok: true, value: await fetcher()};
    } catch (error) {
        await onFailure();
        return {ok: false, error};
    }
}
