import {RadarCoverage, YrComplete} from './types';

export const NOWCAST_CAPABILITIES = [
    'measure_minutes_raining',
    'measure_rain.next_30_minutes',
] as const;

export function shouldContinueNowcastPolling(nowcast: YrComplete | null): boolean {
    return nowcast?.properties.meta.radar_coverage !== RadarCoverage.no_coverage;
}
