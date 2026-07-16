import {YrComplete, YrTimeserie} from './types';
import {calculateFeelsLike, degreesToText} from './yr_lib';

const OPTIONAL_WEATHER_CAPABILITIES = [
    {
        unit: 'probability_of_precipitation',
        capabilities: ['measure_rain_next_1_hour', 'measure_rain_next_6_hours'],
    },
    {unit: 'wind_speed_of_gust', capabilities: ['measure_gust_strength1']},
    {unit: 'probability_of_thunder', capabilities: ['measure_thunder_next_1_hour']},
] as const;

export interface CapabilityChanges {
    removeCaps: string[];
    addCaps: string[];
}

export interface WeatherCapabilityValue {
    capabilityId: string;
    value: unknown;
}

export function getCapabilityChanges(
    wd: YrComplete,
    hasCapability: (capabilityId: string) => boolean,
): CapabilityChanges {
    const units = wd.properties.meta.units;
    const removeCaps: string[] = [];
    const addCaps: string[] = [];

    for (const optionalCapability of OPTIONAL_WEATHER_CAPABILITIES) {
        const supported = !!units[optionalCapability.unit];
        for (const capabilityId of optionalCapability.capabilities) {
            if (!supported && hasCapability(capabilityId)) {
                removeCaps.push(capabilityId);
            } else if (supported && !hasCapability(capabilityId)) {
                addCaps.push(capabilityId);
            }
        }
    }

    return {removeCaps, addCaps};
}

export function selectSymbolCode(ts: YrTimeserie): string | undefined {
    if (ts.data.next_1_hours) {
        return ts.data.next_1_hours.summary.symbol_code;
    }
    if (ts.data.next_6_hours) {
        return ts.data.next_6_hours.summary.symbol_code;
    }
    if (ts.data.next_12_hours) {
        return ts.data.next_12_hours.summary.symbol_code;
    }
    return undefined;
}

export function getWeatherCapabilityValues(ts: YrTimeserie): WeatherCapabilityValue[] {
    return [
        {capabilityId: 'measure_temperature', value: ts.data.instant.details.air_temperature},
        {capabilityId: 'measure_temperature.feels_like', value: calculateFeelsLike(ts.data.instant.details)},
        {
            capabilityId: 'measure_temperature.min_next_6_hours',
            value: ts.data.next_6_hours?.details.air_temperature_min,
        },
        {
            capabilityId: 'measure_temperature.max_next_6_hours',
            value: ts.data.next_6_hours?.details.air_temperature_max,
        },
        {capabilityId: 'measure_pressure', value: ts.data.instant.details.air_pressure_at_sea_level},
        {capabilityId: 'measure_humidity', value: ts.data.instant.details.relative_humidity},
        {capabilityId: 'measure_rain.next_1_hour', value: ts.data.next_1_hours?.details.precipitation_amount},
        {
            capabilityId: 'measure_rain_next_1_hour',
            value: ts.data.next_1_hours?.details.probability_of_precipitation,
        },
        {capabilityId: 'measure_rain.next_6_hours', value: ts.data.next_6_hours?.details.precipitation_amount},
        {
            capabilityId: 'measure_rain_next_6_hours',
            value: ts.data.next_6_hours?.details.probability_of_precipitation,
        },
        {capabilityId: 'measure_cloud_area_fraction', value: ts.data.instant.details.cloud_area_fraction},
        {capabilityId: 'measure_fog_area_fraction', value: ts.data.instant.details.fog_area_fraction},
        {capabilityId: 'measure_wind_strength1', value: ts.data.instant.details.wind_speed},
        {
            capabilityId: 'measure_wind_direction',
            value: degreesToText(ts.data.instant.details.wind_from_direction as number),
        },
        {capabilityId: 'measure_gust_strength1', value: ts.data.instant.details.wind_speed_of_gust},
        {capabilityId: 'measure_wind_angle', value: ts.data.instant.details.wind_from_direction},
        {
            capabilityId: 'measure_thunder_next_1_hour',
            value: ts.data.next_1_hours?.details.probability_of_thunder,
        },
        {capabilityId: 'measure_ultraviolet', value: ts.data.instant.details.ultraviolet_index_clear_sky},
    ];
}
