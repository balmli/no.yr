import Homey from "homey/lib/Homey";

const xml2js = require('xml2js');

import Logger from '@balmli/homey-logger';

import {Moment} from "./moment";
import moment from "./moment-timezone-with-data";
import {
    Areas,
    InstantDetails,
    Point,
    Points,
    Sunrise,
    SunriseData,
    Textforecasts,
    YrComplete,
    YrTimeserie,
    YrTimeseries
} from "./types";
import {WeatherLegends} from "./legends";
import {CacheableFetchResult, HttpResourceCache} from './http_cache';
import {RateLimitBackoff} from './rate_limit';
import {requireForecastTimeseries, WeatherDataUnavailableError} from './flow_condition';


const math = require('./math');
const Feels = require('feels');
const metResourceCache = new HttpResourceCache();
const metRateLimitBackoff = new RateLimitBackoff();

const getStartTimeNextHours = (forDate: any, args: any): any => {
    const {start} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('hour')
        .add(Number(start.id), 'hours');
}

const getEndTimeNextHours = (forDate: any, args: any): any => {
    const {start, hours} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('hour')
        .add(Number(start.id), 'hours')
        .add(hours, 'hours');
}

const getStartTimePeriod = (forDate: any, args: any): any => {
    const {start, day} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('day')
        .add(Number(day), 'days')
        .add(Number(start.split(':')[0]), 'hour')
        .add(Number(start.split(':')[1]), 'minutes');
}

const getEndTimePeriod = (forDate: any, args: any): any => {
    const {end, day} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('day')
        .add(Number(day), 'days')
        .add(Number(end.split(':')[0]), 'hour')
        .add(Number(end.split(':')[1]), 'minutes');
}


const xComparer = (args: any,
                   startTime: any,
                   endTime: any,
                   tss: YrTimeseries | undefined,
                   compareFunc: (ts: YrTimeserie, value: number) => boolean
): boolean => {
    const selected = requireForecastTimeseries(tss)
        .filter(ts => {
            const time = moment(ts.time);
            return time.isSameOrAfter(startTime) && time.isBefore(endTime);
        });
    if (selected.length === 0) {
        throw new WeatherDataUnavailableError('forecast data for the selected period');
    }
    return selected.some(ts => compareFunc(ts, args.value));
}

const xSum = (args: any,
              startTime: any,
              endTime: any,
              tss: YrTimeseries | undefined,
              sumSelector: (ts: YrTimeserie) => number,
              compareFunc: (sum: number | undefined, value: number) => boolean
): boolean => {
    const selected = requireForecastTimeseries(tss)
        .filter(ts => {
            const time = moment(ts.time);
            return time.isSameOrAfter(startTime) && time.isBefore(endTime);
        });
    if (selected.length === 0) {
        throw new WeatherDataUnavailableError('forecast data for the selected period');
    }
    return compareFunc(math.round2(selected
        .map(sumSelector)
        .reduce((acc, c) => acc + c, 0)), args.value);
}

export const nextHoursComparer = (forDate: any,
                                  args: any,
                                  tss: YrTimeseries | undefined,
                                  compareFunc: (ts: YrTimeserie, value: number) => boolean
): boolean => {
    return xComparer(args, getStartTimeNextHours(forDate, args), getEndTimeNextHours(forDate, args), tss, compareFunc);
}

export const periodComparer = (forDate: any,
                               args: any,
                               tss: YrTimeseries | undefined,
                               compareFunc: (ts: YrTimeserie, value: number) => boolean
): boolean => {
    return xComparer(args, getStartTimePeriod(forDate, args), getEndTimePeriod(forDate, args), tss, compareFunc);
}


export const nextHoursSum = (forDate: any,
                             args: any,
                             tss: YrTimeseries | undefined,
                             sumSelector: (ts: YrTimeserie) => number,
                             compareFunc: (sum: number | undefined, value: number) => boolean
): boolean => {
    return xSum(args, getStartTimeNextHours(forDate, args), getEndTimeNextHours(forDate, args), tss, sumSelector, compareFunc);
}

export const periodSum = (forDate: any,
                          args: any,
                          tss: YrTimeseries | undefined,
                          sumSelector: (ts: YrTimeserie) => number,
                          compareFunc: (sum: number | undefined, value: number) => boolean
): boolean => {
    return xSum(args, getStartTimePeriod(forDate, args), getEndTimePeriod(forDate, args), tss, sumSelector, compareFunc);
}

export const weatherLegend = (symbolCode: string, language: string): string => {
    const symbolCodeSplit = symbolCode.split('_');
    // @ts-ignore
    const wl = WeatherLegends[symbolCodeSplit[0]];
    if (!wl) {
        return symbolCode;
    }
    if (wl.variants === null && symbolCodeSplit.length > 1 ||
        wl.variants !== null && symbolCodeSplit.length === 1) {
        // something's fishy
    }
    return language === 'no' ? wl.desc_nb : wl.desc_en;
}

const degs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"];

export const degreesToText = (num: number): string => {
    const normalized = ((num % 360) + 360) % 360;
    const val = Math.round(normalized / 22.5);
    return degs[val];
}

export const calculateFeelsLike = (instant: InstantDetails): number => {
    const config = {
        temp: instant.air_temperature,
        humidity: instant.relative_humidity,
        speed: instant.wind_speed,
        units: {
            temp: 'c',
            speed: 'mps'
        }
    };
    return math.round1(new Feels(config).like());
}

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
        return null;
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
            message: 'Too many requests. Please reduce request frequency.'
        });
        return null;
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
        notModified: false
    };

    if (fetchResult.lastModified) {
        logger.debug(`Cache headers - Last-Modified: ${fetchResult.lastModified}, Expires: ${fetchResult.expires}`);
    }

    return fetchResult;
}

const doCachedFetch = (
    uri: string,
    appVersion: string,
    logger: Logger,
    ifModifiedSince?: string,
): Promise<CacheableFetchResult | null> => metResourceCache.get(
    uri,
    cacheValidator => doFetch(uri, appVersion, logger, cacheValidator ?? ifModifiedSince),
);

export interface WeatherResult {
    data: YrComplete | null;
    lastModified?: string;
    expires?: string;
    retrievedAt?: string;
    notModified: boolean;
}

export const fetchWeather = async (
    lat: number, lon: number, altitude: number,
    clearAltitude: boolean | undefined,
    appVersion: string,
    logger: Logger,
    ifModifiedSince?: string
): Promise<WeatherResult> => {
    const uri = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}` +
        (!clearAltitude && altitude !== -1 ? `&altitude=${Math.round(altitude)}` : '');
    const result = await doCachedFetch(uri, appVersion, logger, ifModifiedSince);
    if (result === null) {
        return {data: null, notModified: false};
    }
    const weatherResult = toWeatherResult(result, ifModifiedSince, logger);
    logger.info(`Got weather data!`, {
        wd: weatherResult.data?.properties.meta.updated_at,
        lastModified: weatherResult.lastModified,
        expires: weatherResult.expires
    });
    return weatherResult;
};

const parseResult = (json: any, logger: Logger): YrComplete | null => {
    try {
        const wd = JSON.parse(json) as YrComplete;
        for (const ts of wd.properties.timeseries) {
            ts.localTime = moment(ts.time).format("DD.MM.YYYY HH:mm");
            logger.debug(`Ts: ${ts.time} (${ts.localTime})`);
        }
        return wd;
    } catch (err) {
        logger.error(`Parse weather file failed.`, json);
    }
    return null;
}

export const toWeatherResult = (
    result: FetchResult,
    ifModifiedSince: string | undefined,
    logger: Logger,
): WeatherResult => {
    if (result.notModified) {
        return {
            data: null,
            lastModified: result.lastModified ?? ifModifiedSince,
            expires: result.expires,
            retrievedAt: result.retrievedAt,
            notModified: true,
        };
    }
    return {
        data: parseResult(result.data, logger),
        lastModified: result.lastModified,
        expires: result.expires,
        retrievedAt: result.retrievedAt,
        notModified: false,
    };
}

export const getDateFromPeriod = (period: string): Moment => {
    const splitted = period.split(':');
    return period.includes(':')
        ? moment().utc()
            .startOf('day')
            .add(Number(splitted[0]), 'days')
            .hour(Number(splitted[1]))
        : moment()
            .startOf('hour')
            .add(Number(period), 'hours');
}

export const getDateAddPeriod = (period: string): Moment => {
    const splitted = period.split(':');
    return period.includes(':')
        ? moment().utc()
            .startOf('day')
            .add(Number(splitted[0]), 'days')
            .hour(Number(splitted[1]))
        : moment()
            .add(Number(period), 'hours');
}

export const getTimeSeries = (wd: YrComplete, period: string, logger: Logger): YrTimeserie | null => {
    const forDate = getDateFromPeriod(period);
    logger.debug('Get time series. Search for: ', forDate);
    for (const ts of wd.properties.timeseries) {
        const time = moment(ts.time);
        logger.debug('Check time series:', time);
        if (time.isSame(forDate)) {
            logger.info('Got time series:', time);
            return ts;
        }
    }
    return null;
}

export const fetchSunrise = async (
    lat: number, lon: number,
    period: string,
    aDate: Moment | undefined,
    appVersion: string,
    logger: Logger,
    homey: Homey
): Promise<Sunrise> => {
    const forDate = aDate ? aDate : getDateFromPeriod(period);
    const date = forDate.format("yyyy-MM-DD");
    const offset = forDate.format("Z");
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
}

export const parseSunrise = async (data1: string, logger?: Logger): Promise<Sunrise | undefined> => {
    try {
        const data = JSON.parse(data1) as SunriseData;
        const hasData = data && data.properties && data.properties.sunrise && data.properties.sunset;
        return hasData ? {
            sunrise: data.properties.sunrise.time ? moment(data.properties.sunrise.time) : undefined,
            sunset: data.properties.sunset.time ? moment(data.properties.sunset.time) : undefined,
        } : undefined;
    } catch (err) {
        logger?.error('parseSunrise error:', err);
    }
    return undefined;
}

export const fetchNowcast = async (
    lat: number, lon: number, altitude: number,
    clearAltitude: boolean | undefined,
    appVersion: string,
    logger: Logger,
    ifModifiedSince?: string
): Promise<WeatherResult> => {
    const uri = `https://api.met.no/weatherapi/nowcast/2.0/complete?lat=${lat}&lon=${lon}` +
        (!clearAltitude && altitude !== -1 ? `&altitude=${Math.round(altitude)}` : '');
    const result = await doCachedFetch(uri, appVersion, logger, ifModifiedSince);
    if (result === null) {
        return {data: null, notModified: false};
    }
    const weatherResult = toWeatherResult(result, ifModifiedSince, logger);
    logger.info(`Got nowcast data!`, {
        wd: weatherResult.data?.properties.meta.updated_at,
        lastModified: weatherResult.lastModified,
        expires: weatherResult.expires
    });
    return weatherResult;
}

/**
 * Fetch textual forecast for a location.
 * @param lat
 * @param lon
 * @param appVersion
 * @param logger
 * @param homey
 */
export const fetchTextforecast = async (
    lat: number, lon: number,
    appVersion: string,
    logger: Logger,
    homey: Homey
): Promise<Textforecasts> => {
    const resultAreas = await doCachedFetch(`https://api.met.no/weatherapi/textforecast/2.0/areas`, appVersion, logger);
    if (resultAreas === null || !resultAreas.data) {
        throw new Error(homey.__('errors.fetching_areas_failed'));
    }

    const areasObj = await parseAreasFile(resultAreas.data, logger);
    if (!areasObj) {
        logger.error('Unable to parse areas file');
        throw new Error(homey.__('errors.parsing_areas_failed'));
    }
    logger.debug('Got areas file');

    const ids = findAreasIds(lat, lon, areasObj);
    if (!ids || ids.length === 0) {
        throw new Error(homey.__('errors.textforecast_not_supported'));
    }

    const resultTextforecast = await doCachedFetch(`https://api.met.no/weatherapi/textforecast/2.0/landoverview`, appVersion, logger);
    if (resultTextforecast === null || !resultTextforecast.data) {
        throw new Error(homey.__('errors.fetching_textforecast_failed'));
    }

    const forecastObj = await parseTextforecastFile(resultTextforecast.data, logger);
    if (!forecastObj) {
        logger.error('Unable to parse textforecast');
        throw new Error(homey.__('errors.parsing_textareas_failed'));
    }
    logger.debug('Got textforecast file');

    const textForecast = findTextforecastFromAreaIds(forecastObj, ids);

    logger.info(`Got textforecast data!`, {
        ids,
        textForecast,
        foreCasts: textForecast.map(tfc => tfc.locations[0])
    });

    return textForecast;
};

/**
 * Transform a polygon string to an array of points.
 * @param polygon
 */
export const transformToPolygon = (polygon: string): Points => {
    return polygon.split(' ')
        .map(p => [Number(p.split(',')[0]), Number(p.split(',')[1])] as Point);
}

const xmlParser = new xml2js.Parser(/* options */);

/**
 * Parse xml areas file to Areas object.
 * @param xmlFile
 * @param logger
 */
export const parseAreasFile = async (xmlFile: string, logger?: Logger): Promise<Areas | undefined> => {
    try {
        const areasObj = await xmlParser.parseStringPromise(xmlFile);
        return areasObj.areas.area.map((a: any) => ({
            id: a['$'].id,
            areaDesc: a.areaDesc[0],
            polygon: transformToPolygon(a.polygon[0].trim())
        }));
    } catch (err) {
        logger?.error('parseAreasFile error:', err);
    }
}

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

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * List area Ids for a location.
 * @param latitude
 * @param longitude
 * @param areas
 */
export const findAreasIds = (latitude: number, longitude: number, areas: Areas): string[] => {
    return areas.filter(area => isPointInPolygon(latitude, longitude, area.polygon))
        .map(area => area.id);
}

/**
 * Parse textforecast xml file to Textforecasts object.
 * @param xmlFile
 * @param logger
 */
export const parseTextforecastFile = async (xmlFile: string, logger?: Logger): Promise<Textforecasts | undefined> => {
    try {
        const forecastObj = await xmlParser.parseStringPromise(xmlFile);
        return forecastObj.textforecast.time.map((f: any) => (
            {
                from: moment.tz(f['$'].from, "YYYY-MM-DDThh:mm:ss", 'Europe/Oslo').format(),
                to: moment.tz(f['$'].to, "YYYY-MM-DDThh:mm:ss", 'Europe/Oslo').format(),
                type: f.forecasttype[0]['$'].name,
                locations: f.forecasttype[0].location.map((l: any) => ({
                    id: l['$'].id,
                    name: l['$'].name,
                    forecast: l['_']
                }))
            }
        ));
    } catch (err) {
        logger?.error('parseTextforecastFile error:', err);
    }
}

/**
 * Fetch textual forecast for a list of area Ids
 * @param textforecasts
 * @param areaIds
 */
export const findTextforecastFromAreaIds = (textforecasts: Textforecasts, areaIds: string[]): Textforecasts => {
    return textforecasts.map(tf => ({
        from: tf.from,
        to: tf.to,
        type: tf.type,
        locations: tf.locations.filter(tfl => areaIds.includes(tfl.id))
    }));
}
