import {Moment} from "./moment";

type Pressure = number | undefined;
type Humidity = number | undefined;
type Temperature = number | undefined;
type WindSpeed = number | undefined;
type DirectionDegrees = number | undefined;
type Fraction = number | undefined;
type UVI = number | undefined;
type Precipitation = number | undefined;
type PrecipitationRate = number | undefined;

export interface InstantDetails {
    updated_at: string | undefined;
    air_pressure_at_sea_level: Pressure;
    air_temperature: Temperature;
    air_temperature_percentile_10: Temperature;
    air_temperature_percentile_90: Temperature;
    cloud_area_fraction: Fraction;
    cloud_area_fraction_high: Fraction;
    cloud_area_fraction_low: Fraction;
    cloud_area_fraction_medium: Fraction;
    dew_point_temperature: Temperature;
    fog_area_fraction: Fraction;
    precipitation_rate: PrecipitationRate;
    relative_humidity: Humidity;
    ultraviolet_index_clear_sky: UVI;
    wind_from_direction: DirectionDegrees;
    wind_speed: WindSpeed;
    wind_speed_of_gust: WindSpeed;
    wind_speed_percentile_10: WindSpeed;
    wind_speed_percentile_90: WindSpeed;
}

export interface NextHoursSummary {
    symbol_code?: string;
    symbol_confidence?: string;
}

export interface NextHoursDetails {
    air_temperature_max: Temperature;
    air_temperature_min: Temperature;
    precipitation_amount: Precipitation;
    precipitation_amount_max: Precipitation;
    precipitation_amount_min: Precipitation;
    probability_of_precipitation: Fraction;
    probability_of_thunder: Fraction;
}

export interface NextHours {
    summary: NextHoursSummary;
    details: NextHoursDetails;
}

export interface YrTimeserie {
    time: string;
    localTime?: string;
    data: {
        instant: {
            details: InstantDetails
        },
        next_1_hours?: NextHours,
        next_6_hours?: NextHours,
        next_12_hours?: NextHours
    }
}

export type YrTimeseries = YrTimeserie[];

export enum RadarCoverage {
    ok = "ok",
    temporarily_unavailable = "temporarily unavailable",
    no_coverage = "no coverage",
}

export interface YrComplete {
    type: string;
    geometry: {
        type: string,
        coordinates: number[],
    },
    properties: {
        meta: {
            updated_at: string;
            radar_coverage?: RadarCoverage;
            units: {
                air_pressure_at_sea_level: string;
                air_temperature: string;
                air_temperature_max: string;
                air_temperature_min: string;
                air_temperature_percentile_10?: string;
                air_temperature_percentile_90?: string;
                cloud_area_fraction: string;
                cloud_area_fraction_high: string;
                cloud_area_fraction_low: string;
                cloud_area_fraction_medium: string;
                dew_point_temperature: string;
                fog_area_fraction: string;
                precipitation_amount: string;
                precipitation_amount_max?: string;
                precipitation_amount_min?: string;
                precipitation_rate?: string;
                probability_of_precipitation?: string;
                probability_of_thunder?: string;
                relative_humidity: string;
                ultraviolet_index_clear_sky: 1,
                wind_from_direction: string;
                wind_speed: string;
                wind_speed_of_gust?: string;
                wind_speed_percentile_10?: string;
                wind_speed_percentile_90?: string;
            }
        },
        timeseries: YrTimeseries
    }
}

export interface SunriseData {
    type: string;
    geometry: {
        type: string,
        coordinates: number[],
    },
    when: {
        interval: string[],
    },
    properties: {
        body: string;
        sunrise: {
            time: string;
            azimuth: number;
        },
        sunset: {
            time: string;
            azimuth: number;
        },
        solarnoon: {
            time: string;
            disc_centre_elevation: number;
            visible: boolean;
        },
        solarmidnight: {
            time: string;
            disc_centre_elevation: number;
            visible: boolean;
        }
    }
}

export interface Sunrise {
    sunrise: Moment,
    sunset: Moment,
}

export type Point = [number, number];
export type Points = Point[];

export interface Area {
    id: string;
    areaDesc: string;
    polygon: Points;
}

export type Areas = Area[];

export interface LocationForecast {
    id: string;
    name: string;
    forecast: string;
}

export interface Textforecast {
    from: string;
    to: string;
    type: string;
    locations: LocationForecast[];
}

export type Textforecasts = Textforecast[];
