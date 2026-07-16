export interface LocationBoundCache {
    _weatherData: unknown | null;
    _weatherLastModified?: string;
    _weatherExpires?: string;
    _weatherRetrievedAt?: string;
    _nowcastData: unknown | null;
    _nowcastLastModified?: string;
    _nowcastExpires?: string;
    _textualForecast: unknown | null;
    _nowcastLocationKey?: string;
}

export interface LocationCapabilityState {
    getCapabilities(): string[];
    setCapabilityValue(capabilityId: string, value: null): Promise<void>;
}

export function invalidateLocationCaches(cache: LocationBoundCache): void {
    cache._weatherData = null;
    cache._weatherLastModified = undefined;
    cache._weatherExpires = undefined;
    cache._weatherRetrievedAt = undefined;
    cache._nowcastData = null;
    cache._nowcastLastModified = undefined;
    cache._nowcastExpires = undefined;
    cache._textualForecast = null;
    cache._nowcastLocationKey = undefined;
}

export async function clearLocationCapabilityValues(device: LocationCapabilityState): Promise<void> {
    await Promise.all(device.getCapabilities().map(capabilityId => device.setCapabilityValue(capabilityId, null)));
}
