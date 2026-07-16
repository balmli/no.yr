export interface FetchAvailabilityResult {
    data: unknown | null;
    notModified: boolean;
    throttled: boolean;
}

export const applyFetchAvailability = async (
    result: FetchAvailabilityResult,
    recordSuccess: () => Promise<void>,
    recordFailure: () => Promise<void>,
): Promise<void> => {
    if (result.data !== null || result.notModified) {
        await recordSuccess();
    } else if (!result.throttled) {
        await recordFailure();
    }
};
