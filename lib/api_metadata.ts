import {YrComplete} from './types';

export function getSourceTiming(
    weatherData: YrComplete | null | undefined,
    retrievedAt: string | undefined,
    expiresAt?: string,
) {
    return {
        sourceUpdatedAt: weatherData?.properties.meta.updated_at,
        retrievedAt,
        ...(expiresAt ? {expiresAt} : {}),
    };
}
