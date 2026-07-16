export interface LocationBoundCache {
    _weatherData: unknown | null;
    _weatherLastModified?: string;
    _weatherExpires?: string;
    _nowcastData: unknown | null;
    _nowcastLastModified?: string;
    _nowcastExpires?: string;
    _textualForecast: unknown | null;
}

export function invalidateLocationCaches(cache: LocationBoundCache): void {
    cache._weatherData = null;
    cache._weatherLastModified = undefined;
    cache._weatherExpires = undefined;
    cache._nowcastData = null;
    cache._nowcastLastModified = undefined;
    cache._nowcastExpires = undefined;
    cache._textualForecast = null;
}
