import {RadarCoverage, YrComplete, YrTimeserie, YrTimeseries} from './types';
import {round2} from './math';

export const NOWCAST_CAPABILITIES = [
    'measure_minutes_raining',
    'measure_rain.next_30_minutes',
] as const;

export function getRainingThreshold(value: number | null | undefined): number {
    return value ?? 0.1;
}

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

export function nowcastLocationKey(lat: number, lon: number): string {
    return `${lat}:${lon}`;
}

export function isNowcastValid(
    nowcast: YrComplete | null,
    cachedLocationKey: string | undefined,
    expectedLocationKey: string,
    now = new Date(),
    maximumAgeMinutes = 15,
): boolean {
    if (!nowcast || cachedLocationKey !== expectedLocationKey ||
        nowcast.properties.meta.radar_coverage !== RadarCoverage.ok) {
        return false;
    }
    const updatedAt = Date.parse(nowcast.properties.meta.updated_at);
    const ageMinutes = (now.getTime() - updatedAt) / 60_000;
    if (!Number.isFinite(updatedAt) || ageMinutes < -5 || ageMinutes > maximumAgeMinutes) {
        return false;
    }
    return nowcast.properties.timeseries.some(series => {
        const time = Date.parse(series.time);
        return Number.isFinite(time) && time >= now.getTime() - 5 * 60_000;
    });
}

export function mapNowcastEntry(timeserie: YrTimeserie) {
    const precipitationRate = timeserie.data.instant.details.precipitation_rate;
    return {
        time: timeserie.time,
        precipitationRate,
        precipitationAmount: precipitationRate === undefined ? undefined : round2(precipitationRate * 5 / 60),
    };
}
