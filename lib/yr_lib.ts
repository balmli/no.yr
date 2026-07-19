import Homey from 'homey/lib/Homey';

import Logger from '@balmli/homey-logger';

import {
    addHours,
    DateInput,
    formatDate,
    formatIsoWithOffset,
    formatOffset,
    getDefaultTimeZone,
    startOfDayAt,
    startOfHour,
    toDate,
} from './date_time';
import {
    InstantDetails,
    Point,
    Points,
    Sunrise,
    SunriseData,
    TextforecastGeoJson,
    TextforecastGeoJsonFeature,
    Textforecasts,
    YrComplete,
    YrTimeserie,
    YrTimeseries,
} from './types';
import {WeatherLegends} from './legends';
import {CacheableFetchResult, HttpResourceCache} from './http_cache';
import {ParsedSingleResourceCache} from './parsed_resource_cache';
import {RateLimitBackoff} from './rate_limit';
import {requireForecastTimeseries, WeatherDataUnavailableError} from './flow_condition';

const math = require('./math');
const Feels = require('feels');
const metResourceCache = new HttpResourceCache();
const metRateLimitBackoff = new RateLimitBackoff();
const textforecastCache = new ParsedSingleResourceCache<TextforecastGeoJson>();

const getStartTimeNextHours = (forDate: DateInput | undefined, args: any): Date => {
    const {start} = args;
    return addHours(startOfHour(forDate ?? new Date()), Number(start.id));
};

const getEndTimeNextHours = (forDate: DateInput | undefined, args: any): Date => {
    const {start, hours} = args;
    return addHours(startOfHour(forDate ?? new Date()), Number(start.id) + hours);
};

const getStartTimePeriod = (forDate: DateInput | undefined, args: any): Date => {
    const {start, day} = args;
    const [hour, minute] = start.split(':').map(Number);
    return startOfDayAt(forDate ?? new Date(), Number(day), hour, minute);
};

const getEndTimePeriod = (forDate: DateInput | undefined, args: any): Date => {
    const {end, day} = args;
    const [hour, minute] = end.split(':').map(Number);
    return startOfDayAt(forDate ?? new Date(), Number(day), hour, minute);
};

const xComparer = (
    args: any,
    startTime: Date,
    endTime: Date,
    tss: YrTimeseries | undefined,
    compareFunc: (ts: YrTimeserie, value: number) => boolean,
): boolean => {
    const selected = requireForecastTimeseries(tss).filter(ts => {
        const time = Date.parse(ts.time);
        return time >= startTime.getTime() && time < endTime.getTime();
    });
    if (selected.length === 0) {
        throw new WeatherDataUnavailableError('forecast data for the selected period');
    }
    return selected.some(ts => compareFunc(ts, args.value));
};

const xSum = (
    args: any,
    startTime: Date,
    endTime: Date,
    tss: YrTimeseries | undefined,
    sumSelector: (ts: YrTimeserie) => number,
    compareFunc: (sum: number | undefined, value: number) => boolean,
): boolean => {
    const selected = requireForecastTimeseries(tss).filter(ts => {
        const time = Date.parse(ts.time);
        return time >= startTime.getTime() && time < endTime.getTime();
    });
    if (selected.length === 0) {
        throw new WeatherDataUnavailableError('forecast data for the selected period');
    }
    return compareFunc(math.round2(selected.map(sumSelector).reduce((acc, c) => acc + c, 0)), args.value);
};

export const nextHoursComparer = (
    forDate: any,
    args: any,
    tss: YrTimeseries | undefined,
    compareFunc: (ts: YrTimeserie, value: number) => boolean,
): boolean => {
    return xComparer(args, getStartTimeNextHours(forDate, args), getEndTimeNextHours(forDate, args), tss, compareFunc);
};

export const periodComparer = (
    forDate: any,
    args: any,
    tss: YrTimeseries | undefined,
    compareFunc: (ts: YrTimeserie, value: number) => boolean,
): boolean => {
    return xComparer(args, getStartTimePeriod(forDate, args), getEndTimePeriod(forDate, args), tss, compareFunc);
};

export const nextHoursSum = (
    forDate: any,
    args: any,
    tss: YrTimeseries | undefined,
    sumSelector: (ts: YrTimeserie) => number,
    compareFunc: (sum: number | undefined, value: number) => boolean,
): boolean => {
    return xSum(
        args,
        getStartTimeNextHours(forDate, args),
        getEndTimeNextHours(forDate, args),
        tss,
        sumSelector,
        compareFunc,
    );
};

export const periodSum = (
    forDate: any,
    args: any,
    tss: YrTimeseries | undefined,
    sumSelector: (ts: YrTimeserie) => number,
    compareFunc: (sum: number | undefined, value: number) => boolean,
): boolean => {
    return xSum(
        args,
        getStartTimePeriod(forDate, args),
        getEndTimePeriod(forDate, args),
        tss,
        sumSelector,
        compareFunc,
    );
};

export const weatherLegend = (symbolCode: string, language: string): string => {
    const symbolCodeSplit = symbolCode.split('_');
    // @ts-ignore
    const wl = WeatherLegends[symbolCodeSplit[0]];
    if (!wl) {
        return symbolCode;
    }
    if (
        (wl.variants === null && symbolCodeSplit.length > 1) ||
        (wl.variants !== null && symbolCodeSplit.length === 1)
    ) {
        // something's fishy
    }
    return language === 'no' ? wl.desc_nb : wl.desc_en;
};

const degs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N'];

export const degreesToText = (num: number): string => {
    const normalized = ((num % 360) + 360) % 360;
    const val = Math.round(normalized / 22.5);
    return degs[val];
};

export const calculateFeelsLike = (instant: InstantDetails): number | undefined => {
    const canCalculate = [instant.air_temperature, instant.relative_humidity, instant.wind_speed].every(
        value => typeof value === 'number',
    );
    if (!canCalculate) {
        return undefined;
    }
    const config = {
        temp: instant.air_temperature,
        humidity: instant.relative_humidity,
        speed: instant.wind_speed,
        units: {
            temp: 'c',
            speed: 'mps',
        },
    };
    return math.round1(new Feels(config).like());
};

export type FetchResult = CacheableFetchResult;

export const doFetch = async (
    uri: string,
    appVersion: string,
    logger: Logger,
    ifModifiedSince?: string,
    timeoutMs = 30000,
    rateLimitBackoff = metRateLimitBackoff,
): Promise<FetchResult | null> => {
    const remainingBackoff = rateLimitBackoff.remainingMilliseconds();
    if (remainingBackoff > 0) {
        logger.warn(`MET request suppressed by application-wide rate-limit backoff`, {
            retryInSeconds: Math.ceil(remainingBackoff / 1000),
        });
        return {data: null, notModified: false, throttled: true};
    }
    const start = Date.now();
    const userAgent = `WeatherForecastHomeyApp/${appVersion} github.com/balmli/weather.forecast`;
    const headers: any = {
        'User-Agent': userAgent,
        'Accept-Encoding': 'gzip, deflate',
    };

    // Add If-Modified-Since header if available for cache validation
    if (ifModifiedSince) {
        headers['If-Modified-Since'] = ifModifiedSince;
        logger.debug(`Using If-Modified-Since: ${ifModifiedSince}`);
    }

    const response = await (globalThis as any).fetch(uri, {
        headers,
        redirect: 'follow',
        signal: (AbortSignal as any).timeout(timeoutMs),
    });
    const statusCode = response.status;
    const statusMessage = response.statusText;
    const lastModified = response.headers.get('last-modified') ?? undefined;
    const expires = response.headers.get('expires') ?? undefined;

    if (statusCode === 304) {
        // 304 Not Modified - data hasn't changed, use cached version
        logger.info(`Data not modified for "${uri}", using cached version`);
        return {data: null, lastModified, expires, notModified: true};
    } else if (statusCode === 422) {
        // 422 Unprocessable Entity
        logger.info(`Fetching "${uri}" failed:`, {
            statusCode,
            statusMessage,
        });
        return null;
    } else if (statusCode === 429) {
        // 429 Too Many Requests - Rate limiting
        rateLimitBackoff.register429(response.headers.get('retry-after') ?? undefined);
        logger.warn(`Rate limited by API for "${uri}":`, {
            statusCode,
            statusMessage,
            message: 'Too many requests. Please reduce request frequency.',
        });
        return {data: null, notModified: false, throttled: true};
    } else if (statusCode !== 200 && statusCode !== 203) {
        logger.error(`Fetching "${uri}" failed:`, {
            statusCode,
            statusMessage,
        });
        return null;
    } else if (statusCode === 203) {
        logger.warn(`MET endpoint returned deprecated HTTP 203 response`, {
            statusCode,
            endpoint: new URL(uri).pathname,
        });
    } else {
        logger.debug(`Fetched "${uri}" OK, in ${Date.now() - start} ms:`, {
            statusCode,
            statusMessage,
        });
    }

    // Extract cache-related headers
    const fetchResult: FetchResult = {
        data: await response.text(),
        lastModified,
        expires,
        retrievedAt: new Date().toISOString(),
        notModified: false,
    };

    if (fetchResult.lastModified) {
        logger.debug(`Cache headers - Last-Modified: ${fetchResult.lastModified}, Expires: ${fetchResult.expires}`);
    }

    return fetchResult;
};

const doCachedFetch = (
    uri: string,
    appVersion: string,
    logger: Logger,
    ifModifiedSince?: string,
): Promise<CacheableFetchResult | null> =>
    metResourceCache.get(uri, cacheValidator => doFetch(uri, appVersion, logger, cacheValidator ?? ifModifiedSince));

export interface WeatherResult {
    data: YrComplete | null;
    lastModified?: string;
    expires?: string;
    retrievedAt?: string;
    notModified: boolean;
    throttled: boolean;
}

export const fetchWeather = async (
    lat: number,
    lon: number,
    altitude: number,
    clearAltitude: boolean | undefined,
    appVersion: string,
    logger: Logger,
    ifModifiedSince?: string,
): Promise<WeatherResult> => {
    const uri =
        `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}` +
        (!clearAltitude && altitude !== -1 ? `&altitude=${Math.round(altitude)}` : '');
    const result = await doFetch(uri, appVersion, logger, ifModifiedSince);
    if (result === null) {
        return {data: null, notModified: false, throttled: false};
    }
    const weatherResult = toWeatherResult(result, ifModifiedSince, logger);
    logger.info(`Got weather data!`, {
        wd: weatherResult.data?.properties.meta.updated_at,
        lastModified: weatherResult.lastModified,
        expires: weatherResult.expires,
    });
    return weatherResult;
};

const parseResult = (json: any, logger: Logger): YrComplete | null => {
    try {
        return JSON.parse(json) as YrComplete;
    } catch (err) {
        logger.error(`Parse weather file failed.`, json);
    }
    return null;
};

export const toWeatherResult = (
    result: FetchResult,
    ifModifiedSince: string | undefined,
    logger: Logger,
): WeatherResult => {
    if (result.throttled) {
        return {
            data: null,
            lastModified: result.lastModified,
            expires: result.expires,
            retrievedAt: result.retrievedAt,
            notModified: false,
            throttled: true,
        };
    }
    if (result.notModified) {
        return {
            data: null,
            lastModified: result.lastModified ?? ifModifiedSince,
            expires: result.expires,
            retrievedAt: result.retrievedAt,
            notModified: true,
            throttled: false,
        };
    }
    return {
        data: parseResult(result.data, logger),
        lastModified: result.lastModified,
        expires: result.expires,
        retrievedAt: result.retrievedAt,
        notModified: false,
        throttled: false,
    };
};

export const getDateFromPeriod = (period: string, now: DateInput = new Date()): Date => {
    const splitted = period.split(':');
    return period.includes(':')
        ? startOfDayAt(now, Number(splitted[0]), Number(splitted[1]), 0, 'UTC')
        : addHours(startOfHour(now), Number(period));
};

export const getDateAddPeriod = (period: string, now: DateInput = new Date()): Date => {
    const splitted = period.split(':');
    return period.includes(':')
        ? startOfDayAt(now, Number(splitted[0]), Number(splitted[1]), 0, 'UTC')
        : addHours(now, Number(period));
};

export const getTimeSeries = (wd: YrComplete, period: string, logger: Logger): YrTimeserie | null => {
    const forDate = getDateFromPeriod(period);
    logger.debug('Get time series. Search for: ', forDate);
    for (const ts of wd.properties.timeseries) {
        const time = Date.parse(ts.time);
        logger.debug('Check time series:', new Date(time));
        if (time === forDate.getTime()) {
            logger.info('Got time series:', new Date(time));
            return ts;
        }
    }
    return null;
};

export const fetchSunrise = async (
    lat: number,
    lon: number,
    period: string,
    aDate: Date | undefined,
    appVersion: string,
    logger: Logger,
    homey: Homey,
): Promise<Sunrise> => {
    const forDate = aDate ? toDate(aDate) : getDateFromPeriod(period);
    const timeZone = aDate || !period.includes(':') ? getDefaultTimeZone() : 'UTC';
    const date = formatDate(forDate, timeZone);
    const offset = formatOffset(forDate, timeZone);
    logger.debug(`fetchSunrise: ${lat}, ${lon}, ${date}, ${offset}`);
    const uri = `https://api.met.no/weatherapi/sunrise/3.0/sun?lat=${lat}&lon=${lon}&date=${date}&offset=${offset}`;
    const result = await doCachedFetch(uri, appVersion, logger);
    if (result === null || !result.data) {
        throw new Error(homey.__('errors.fetching_sunrise_failed'));
    }

    const sunrise = await parseSunrise(result.data, logger);
    if (!sunrise) {
        logger.error('Unable to parse sunrise file');
        throw new Error(homey.__('errors.parsing_sunrise_failed'));
    }

    logger.info(`Got sunrise data!`, sunrise);
    return sunrise;
};

export const parseSunrise = async (data1: string, logger?: Logger): Promise<Sunrise | undefined> => {
    try {
        const data = JSON.parse(data1) as SunriseData;
        const hasData = data && data.properties && data.properties.sunrise && data.properties.sunset;
        return hasData
            ? {
                  sunrise: data.properties.sunrise.time ? toDate(data.properties.sunrise.time) : undefined,
                  sunset: data.properties.sunset.time ? toDate(data.properties.sunset.time) : undefined,
              }
            : undefined;
    } catch (err) {
        logger?.error('parseSunrise error:', err);
    }
    return undefined;
};

export const fetchNowcast = async (
    lat: number,
    lon: number,
    altitude: number,
    clearAltitude: boolean | undefined,
    appVersion: string,
    logger: Logger,
    ifModifiedSince?: string,
): Promise<WeatherResult> => {
    const uri =
        `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=${lat}&lon=${lon}` +
        (!clearAltitude && altitude !== -1 ? `&altitude=${Math.round(altitude)}` : '');
    const result = await doFetch(uri, appVersion, logger, ifModifiedSince);
    if (result === null) {
        return {data: null, notModified: false, throttled: false};
    }
    const weatherResult = toWeatherResult(result, ifModifiedSince, logger);
    logger.info(`Got nowcast data!`, {
        wd: weatherResult.data?.properties.meta.updated_at,
        lastModified: weatherResult.lastModified,
        expires: weatherResult.expires,
    });
    return weatherResult;
};

/**
 * Fetch textual forecast for a location.
 * @param lat
 * @param lon
 * @param appVersion
 * @param logger
 * @param homey
 */
export const fetchTextforecast = async (
    lat: number,
    lon: number,
    appVersion: string,
    logger: Logger,
    homey: Homey,
): Promise<Textforecasts> => {
    const uri = `https://api.met.no/weatherapi/textforecast/3.0/landoverview`;
    let parseFailed = false;
    const forecast = await textforecastCache.get(
        ifModifiedSince => doFetch(uri, appVersion, logger, ifModifiedSince),
        data => {
            const parsed = parseTextforecastGeoJsonFile(data, logger);
            parseFailed = !parsed;
            return parsed;
        },
    );
    if (!forecast) {
        if (parseFailed) {
            logger.error('Unable to parse textforecast');
            throw new Error(homey.__('errors.parsing_textareas_failed'));
        }
        throw new Error(homey.__('errors.fetching_textforecast_failed'));
    }
    logger.debug('Got textforecast file');

    const textForecast = findTextforecastForLocation(forecast, lat, lon);
    if (textForecast.length === 0) {
        throw new Error(homey.__('errors.textforecast_not_supported'));
    }

    logger.info(`Got textforecast data!`, {
        lastChange: forecast.lastChange,
        periods: textForecast.length,
        areas: textForecast.map(period => period.locations.map(location => location.name)),
    });

    return textForecast;
};

const isGeoJsonPoint = (value: unknown): value is Point =>
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1]);

const isTextforecastGeoJsonFeature = (value: unknown): value is TextforecastGeoJsonFeature => {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const feature = value as any;
    const interval = feature.when?.interval;
    const coordinates = feature.geometry?.coordinates;
    return (
        feature.type === 'Feature' &&
        feature.geometry?.type === 'Polygon' &&
        Array.isArray(coordinates) &&
        coordinates.length > 0 &&
        coordinates.every((ring: unknown) => Array.isArray(ring) && ring.length >= 3 && ring.every(isGeoJsonPoint)) &&
        Array.isArray(interval) &&
        interval.length === 2 &&
        interval.every(
            (timestamp: unknown) => typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp)),
        ) &&
        typeof feature.properties?.area === 'string' &&
        typeof feature.properties?.text === 'string' &&
        typeof feature.properties?.title === 'string'
    );
};

/**
 * Parse and validate a Textforecast 3.0 GeoJSON response.
 */
export const parseTextforecastGeoJsonFile = (jsonFile: string, logger?: Logger): TextforecastGeoJson | undefined => {
    try {
        const forecast = JSON.parse(jsonFile) as any;
        if (
            forecast?.type !== 'FeatureCollection' ||
            typeof forecast.lang !== 'string' ||
            typeof forecast.lastChange !== 'string' ||
            !Number.isFinite(Date.parse(forecast.lastChange)) ||
            !Array.isArray(forecast.features) ||
            !forecast.features.every(isTextforecastGeoJsonFeature)
        ) {
            throw new Error('Invalid Textforecast GeoJSON response');
        }
        return forecast as TextforecastGeoJson;
    } catch (err) {
        logger?.error('parseTextforecastGeoJsonFile error:', err);
    }
};

/**
 * Find and group Textforecast 3.0 features for a location.
 */
export const findTextforecastForLocation = (
    forecast: TextforecastGeoJson,
    latitude: number,
    longitude: number,
): Textforecasts => {
    const periods = new Map<string, Textforecasts[number]>();

    for (const feature of forecast.features) {
        // GeoJSON coordinates use longitude, latitude order.
        if (!isPointInPolygon(longitude, latitude, feature.geometry.coordinates[0])) {
            continue;
        }
        const [from, to] = feature.when.interval;
        const key = `${from}\u0000${to}`;
        let period = periods.get(key);
        if (!period) {
            period = {
                from: formatIsoWithOffset(from, 'Europe/Oslo'),
                to: formatIsoWithOffset(to, 'Europe/Oslo'),
                type: 'normal',
                locations: [],
            };
            periods.set(key, period);
        }
        period.locations.push({
            id: feature.properties.area,
            name: feature.properties.area,
            forecast: feature.properties.text,
        });
    }

    return [...periods.values()].sort((left, right) => Date.parse(left.from) - Date.parse(right.from));
};

/**
 * Transform a polygon string to an array of points.
 * @param polygon
 */
/**
 * Checks if a location is in a polyogn.
 * @param latitude
 * @param longitude
 * @param polygon
 */
export const isPointInPolygon = (latitude: number, longitude: number, polygon: Points): boolean => {
    const x = latitude;
    const y = longitude;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];

        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
};
