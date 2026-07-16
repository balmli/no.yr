import {YrTimeseries} from './types';

export class WeatherDataUnavailableError extends Error {
    constructor(field = 'weather data') {
        super(`No ${field} available`);
        this.name = 'WeatherDataUnavailableError';
    }
}

export interface CapabilityReader {
    getCapabilityValue(capabilityId: string): unknown;
}

export function requireConditionValue<T>(value: T | null | undefined, field?: string): T {
    if (value === null || value === undefined ||
        typeof value === 'number' && !Number.isFinite(value)) {
        throw new WeatherDataUnavailableError(field);
    }
    return value;
}

export function requireConditionNumber(value: unknown, field?: string): number {
    const available = requireConditionValue(value, field);
    if (typeof available !== 'number') {
        throw new WeatherDataUnavailableError(field);
    }
    return available;
}

export function requireConditionString(value: unknown, field?: string): string {
    const available = requireConditionValue(value, field);
    if (typeof available !== 'string') {
        throw new WeatherDataUnavailableError(field);
    }
    return available;
}

export function requireForecastTimeseries(timeseries: YrTimeseries | undefined): YrTimeseries {
    if (!timeseries || timeseries.length === 0) {
        throw new WeatherDataUnavailableError('forecast data');
    }
    return timeseries;
}

export function capabilityIsBelow(
    device: CapabilityReader,
    capabilityId: string,
    threshold: number,
): boolean {
    return requireConditionNumber(device.getCapabilityValue(capabilityId), capabilityId) < threshold;
}

export function capabilityEquals(
    device: CapabilityReader,
    capabilityId: string,
    expected: string,
): boolean {
    return requireConditionString(device.getCapabilityValue(capabilityId), capabilityId) === expected;
}
