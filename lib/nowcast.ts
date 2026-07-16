import {RadarCoverage, YrComplete, YrTimeseries} from './types';

export const NOWCAST_CAPABILITIES = [
    'measure_minutes_raining',
    'measure_rain.next_30_minutes',
] as const;

export function shouldContinueNowcastPolling(nowcast: YrComplete | null): boolean {
    return nowcast?.properties.meta.radar_coverage !== RadarCoverage.no_coverage;
}

export function minutesUntilRain(
    timeseries: YrTimeseries,
    reference: Date,
    threshold: number,
    horizonMinutes = 90,
): number | null {
    const referenceTime = reference.getTime();
    const lastObservation = timeseries
        .filter(series => Date.parse(series.time) < referenceTime)
        .pop();
    if ((lastObservation?.data.instant.details.precipitation_rate ?? 0) > threshold) {
        return 0;
    }

    const firstRain = timeseries.find(series => {
        const minutes = (Date.parse(series.time) - referenceTime) / 60_000;
        const rate = series.data.instant.details.precipitation_rate;
        return minutes >= 0 && minutes <= horizonMinutes && rate !== undefined && rate > threshold;
    });
    return firstRain ? Math.floor((Date.parse(firstRain.time) - referenceTime) / 60_000) : null;
}
