import {InstantDetails} from './types';
import {calculateFeelsLike} from './yr_lib';

export function mapForecastInstant(details: InstantDetails) {
    const canCalculateFeelsLike = [
        details.air_temperature,
        details.relative_humidity,
        details.wind_speed,
    ].every(value => typeof value === 'number');

    return {
        temperature: details.air_temperature,
        feelsLike: canCalculateFeelsLike ? calculateFeelsLike(details) : undefined,
        windSpeed: details.wind_speed,
        windFromDirection: details.wind_from_direction,
        windSpeedOfGust: details.wind_speed_of_gust,
        relativeHumidity: details.relative_humidity,
        airPressureAtSeaLevel: details.air_pressure_at_sea_level,
        cloudAreaFraction: details.cloud_area_fraction,
        fogAreaFraction: details.fog_area_fraction,
        uvIndex: details.ultraviolet_index_clear_sky,
    };
}
