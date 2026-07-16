import {InstantDetails} from './types';
import {calculateFeelsLike} from './yr_lib';

export function mapForecastInstant(details: InstantDetails) {
    return {
        temperature: details.air_temperature,
        feelsLike: calculateFeelsLike(details),
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
