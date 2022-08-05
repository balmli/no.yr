import Homey from "homey";

import {YrComplete, YrTimeserie, YrTimeseries} from '../../lib/types';
import {WeatherLegends} from "../../lib/legends";
import {
    calculateFeelsLike,
    degreesToText,
    nextHoursComparer,
    nextHoursSum,
    periodComparer,
    periodSum
} from "../../lib/yr_lib";

const math = require('../../lib/math');
const http = require('http.min');

const moment = require('../../lib/moment-timezone-with-data');

module.exports = class YrDevice extends Homey.Device {

    logger: any;
    _deleted?: boolean;
    _weatherData!: YrComplete | null;
    _fetchDataTimeout?: NodeJS.Timeout;
    _updateDeviceTimeout?: NodeJS.Timeout;
    _clearAltitude?: boolean;
    _forceUpdateDevice?: boolean;

    async onInit(): Promise<void> {
        const debug = false;
        this.logger = debug ? {
            debug: this.log,
            verbose: this.log,
            info: this.log,
            error: this.error
        } : {
            debug: () => {
            },
            verbose: () => {
            },
            info: this.log,
            error: this.error
        };
        this._weatherData = null;

        await this.migrate();
        await this.initialize();
        this.scheduleFetchData(2);
        this.logger.verbose(this.getName() + ' -> device initialized');
    }

    async migrate(): Promise<void> {
        try {
        } catch (err) {
            this.logger.error('migration failed', err);
        }
    }

    async initialize(): Promise<void> {
    }

    onAdded(): void {
    }

    onDeleted() {
        this._deleted = true;
        this.clearFetchData();
        this.clearUpdateDevice();
        this.logger.verbose(this.getName() + ' -> device deleted');
    }

    async onSettings({oldSettings, newSettings, changedKeys}: {
        oldSettings: any;
        newSettings: any;
        changedKeys: string[];
    }): Promise<string | void> {
        if (changedKeys.includes('lat') || changedKeys.includes('lon') || changedKeys.includes('altitude')) {
            this._clearAltitude = !changedKeys.includes('altitude');
            this.scheduleFetchData(1);
        } else if (changedKeys.includes('period')) {
            this.scheduleUpdateDevice(1);
        }
    }

    async updateCapabilities(): Promise<void> {
        if (this._weatherData) {
            const units = this._weatherData.properties.meta.units;
            const removeCaps: string[] = [];
            const addCaps: string[] = [];

            if (!units.probability_of_precipitation) {
                if (this.hasCapability('measure_rain_next_1_hour')) {
                    removeCaps.push('measure_rain_next_1_hour');
                }
                if (this.hasCapability('measure_rain_next_6_hours')) {
                    removeCaps.push('measure_rain_next_6_hours');
                }
            } else {
                if (!this.hasCapability('measure_rain_next_1_hour')) {
                    addCaps.push('measure_rain_next_1_hour');
                }
                if (!this.hasCapability('measure_rain_next_6_hours')) {
                    addCaps.push('measure_rain_next_6_hours');
                }
            }
            if (!units.wind_speed_of_gust) {
                if (this.hasCapability('measure_gust_strength')) {
                    removeCaps.push('measure_gust_strength');
                }
            } else {
                if (!this.hasCapability('measure_gust_strength')) {
                    addCaps.push('measure_gust_strength');
                }
            }
            if (!units.probability_of_thunder) {
                if (this.hasCapability('measure_thunder_next_1_hour')) {
                    removeCaps.push('measure_thunder_next_1_hour');
                }
            } else {
                if (!this.hasCapability('measure_thunder_next_1_hour')) {
                    addCaps.push('measure_thunder_next_1_hour');
                }
            }

            await this.updateAndSortCapabilities(removeCaps, addCaps);
        }
    }

    async updateAndSortCapabilities(removeCaps: string[], addCaps: string[]): Promise<void> {
        try {
            /*
            if (removeCaps.length === 0 && addCaps.length === 0) {
                return;
            }
            const caps = this.driver.manifest.capabilities as string[];
            const allCapsAndValues = caps.map(capabilityId => ({capabilityId, value: this.getCapabilityValue(capabilityId)}));
            */

            for (const cap of removeCaps) {
                if (this.hasCapability(cap)) {
                    await this.removeCapability(cap);
                }
            }
            for (const cap of addCaps) {
                if (!this.hasCapability(cap)) {
                    await this.addCapability(cap);
                }
            }
        } catch (err) {
            this.logger.error(err);
        }
    }

    clearFetchData() {
        if (this._fetchDataTimeout) {
            this.homey.clearTimeout(this._fetchDataTimeout);
            this._fetchDataTimeout = undefined;
        }
    }

    scheduleFetchData(seconds?: number) {
        if (this._deleted) {
            return;
        }
        this.clearFetchData();
        if (seconds === undefined) {
            const syncTime = this.getStoreValue('syncTime');
            const now = new Date();
            seconds = syncTime - (now.getMinutes() * 60 + now.getSeconds());
            seconds = seconds <= 0 ? seconds + 3600 : seconds;
            this.logger.verbose(`Sync time: ${syncTime}`);
        } else {
            this._forceUpdateDevice = true;
        }
        this.logger.info(`Next fetch data in ${seconds} seconds`);
        this._fetchDataTimeout = this.homey.setTimeout(this.doFetchWeather.bind(this), seconds * 1000);
    }

    async doFetchWeather() {
        if (this._deleted) {
            return;
        }
        try {
            this.clearFetchData();
            this.clearUpdateDevice();
            this._weatherData = await this.fetchWeather();
            await this.updateCapabilities();
            if (this._forceUpdateDevice === true) {
                await this.updateDevice(this._weatherData);
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            this.scheduleFetchData();
            this.scheduleUpdateDevice();
            this._forceUpdateDevice = false;
        }
    }

    clearUpdateDevice() {
        if (this._updateDeviceTimeout) {
            this.homey.clearTimeout(this._updateDeviceTimeout);
            this._updateDeviceTimeout = undefined;
        }
    }

    scheduleUpdateDevice(seconds?: number) {
        if (this._deleted) {
            return;
        }
        this.clearUpdateDevice();
        if (seconds == undefined) {
            const now = new Date();
            seconds = 3 - (now.getMinutes() * 60 + now.getSeconds()); // 3 seconds after top of the hour
            seconds = seconds <= 0 ? seconds + 3600 : seconds;
        }
        this.logger.info(`Next update device in ${seconds} seconds`);
        this._updateDeviceTimeout = this.homey.setTimeout(this.doUpdateDevice.bind(this), seconds * 1000);
    }

    async doUpdateDevice() {
        if (this._deleted) {
            return;
        }
        try {
            this.clearUpdateDevice();
            await this.updateDevice(this._weatherData);
        } catch (err) {
            this.logger.error(err);
        } finally {
            this.scheduleUpdateDevice();
        }
    }

    fetchWeather = async (): Promise<YrComplete | null> => {
        try {
            const settings = this.getSettings();
            const lat = math.round4(settings.lat);
            const lon = math.round4(settings.lon);
            const uri = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}` +
                (this._clearAltitude !== true && settings.altitude !== -1 ? `&altitude=${settings.altitude}` : '');
            this.logger.verbose(`Fetch weather:`, {uri});
            const userAgent = 'YrAthomHomeyApp/1.0.1 github.com/balmli/no.yr';
            const result = await http.get({
                    uri,
                    headers: {
                        'User-Agent': userAgent
                    },
                    timeout: 30000
                }
            );
            if (result.response.statusCode !== 200) {
                this.logger.error(`Fetching weather failed:`, {
                    statusCode: result.response.statusCode,
                    statusMessage: result.response.statusMessage,
                    result
                });
                return null;
            }
            const wd = this.parseResult(result.data);
            this.logger.info(`Got weather data!`, {
                wd: wd.properties.meta.updated_at
            });
            await this.updateLocation(wd);
            return wd;
        } catch (err) {
            throw err;
        } finally {
            this._clearAltitude = false;
        }
    };

    parseResult = (json: any): YrComplete => {
        const wd = JSON.parse(json) as YrComplete;
        for (const ts of wd.properties.timeseries) {
            ts.localTime = moment(ts.time).format("DD.MM.YYYY HH:mm");
            this.logger.debug(`Ts: ${ts.time} (${ts.localTime})`);
        }
        return wd;
    };

    updateLocation = async (wd: YrComplete): Promise<void> => {
        const coords = wd.geometry.coordinates;
        if (this._clearAltitude === true || this.getSetting('altitude') === -1 &&
            coords &&
            coords.length > 2) {
            const lon = coords[0];
            const lat = coords[1];
            const altitude = coords[2];
            await this.setSettings({
                lon,
                lat,
                altitude
            });
        }
    }

    getTimeSeries = (wd: YrComplete): YrTimeserie | null => {
        const period = this.getSetting('period');
        const splitted = period.split(':');
        const forDate = period.includes(':')
            ? moment().utc()
                .startOf('day')
                .add(Number(splitted[0]), 'days')
                .hour(Number(splitted[1]))
            : moment()
                .startOf('hour')
                .add(Number(period), 'hours');

        this.logger.debug('Get time series. Search for: ', forDate);
        for (const ts of wd.properties.timeseries) {
            const time = moment(ts.time);
            this.logger.debug('Check time series:', time);
            if (time.isSame(forDate)) {
                this.logger.info('Got time series:', time);
                return ts;
            }
        }
        return null;
    }

    updateDevice = async (wd: YrComplete | null): Promise<void> => {
        const ts = !!wd ? this.getTimeSeries(wd) : null;
        if (!!ts) {
            await this.setCapabilityValue('forecast_time', ts.localTime).catch(err => this.logger.error(err));

            const symbolCode = ts.data.next_1_hours ? ts.data.next_1_hours?.summary.symbol_code :
                ts.data.next_6_hours ? ts.data.next_6_hours?.summary.symbol_code :
                    ts.data.next_12_hours ? ts.data.next_12_hours?.summary.symbol_code : undefined;

            if (symbolCode) {
                await this.setCapabilityValue('weather_description', this.weatherLegend(symbolCode)).catch(err => this.logger.error(err));
            }

            await this.updateCapability('measure_temperature', ts.data.instant.details.air_temperature);
            await this.updateCapability('measure_temperature.feels_like', calculateFeelsLike(ts.data.instant.details));
            await this.updateCapability('measure_temperature.min_next_6_hours', ts.data.next_6_hours?.details.air_temperature_min);
            await this.updateCapability('measure_temperature.max_next_6_hours', ts.data.next_6_hours?.details.air_temperature_max);
            await this.updateCapability('measure_pressure', ts.data.instant.details.air_pressure_at_sea_level);
            await this.updateCapability('measure_humidity', ts.data.instant.details.relative_humidity);
            await this.updateCapability('measure_rain.next_1_hour', ts.data.next_1_hours?.details.precipitation_amount);
            await this.updateCapability('measure_rain_next_1_hour', ts.data.next_1_hours?.details.probability_of_precipitation); // Not supported for all places
            await this.updateCapability('measure_rain.next_6_hours', ts.data.next_6_hours?.details.precipitation_amount);
            await this.updateCapability('measure_rain_next_6_hours', ts.data.next_6_hours?.details.probability_of_precipitation); // Not supported for all places
            await this.updateCapability('measure_cloud_area_fraction', ts.data.instant.details.cloud_area_fraction);
            await this.updateCapability('measure_fog_area_fraction', ts.data.instant.details.fog_area_fraction);
            await this.updateCapability('measure_wind_strength', ts.data.instant.details.wind_speed);
            await this.updateCapability('measure_wind_direction', degreesToText(ts.data.instant.details.wind_from_direction as number));
            await this.updateCapability('measure_gust_strength', ts.data.instant.details.wind_speed_of_gust); // Not supported for all places
            await this.updateCapability('measure_wind_angle', ts.data.instant.details.wind_from_direction);
            await this.updateCapability('measure_thunder_next_1_hour', ts.data.next_1_hours?.details.probability_of_thunder); // Not supported for all places
            await this.updateCapability('measure_ultraviolet', ts.data.instant.details.ultraviolet_index_clear_sky);

            if (symbolCode) {
                const tokens = {
                    code: symbolCode,
                    description: this.getCapabilityValue('weather_description'),
                    all_data: JSON.stringify({
                        time: ts.time,
                        localTime: ts.localTime,
                        ...ts.data
                    })
                };
                this.logger.info('Updated device: ', tokens);
                await this.homey.flow.getDeviceTriggerCard('01_weather_changed').trigger(this, tokens).catch(err => this.logger.error(err));
            } else {
                this.logger.info('Updated device: ', ts.localTime);
            }
        }
    }

    updateCapability = async (capabilityId: string, value: any): Promise<void> => {
        if (this.hasCapability(capabilityId)) {
            await this.setCapabilityValue(capabilityId, value === undefined ? 0 : value).catch(err => this.logger.error(err));
        }
    }

    weatherLegend = (symbolCode: string): string => {
        const lang = this.homey.i18n.getLanguage();
        const symbolCodeSplit = symbolCode.split('_');
        // @ts-ignore
        const wl = WeatherLegends[symbolCodeSplit[0]];
        if (wl.variants === null && symbolCodeSplit.length > 1 ||
            wl.variants !== null && symbolCodeSplit.length === 1) {
            // something's fishy
        }
        return wl ? (lang === 'no' ? wl.desc_nb : wl.desc_en) : symbolCode;
    }

    async onWeatherAutocomplete(query: any, args: any) {
        const lang = this.homey.i18n.getLanguage();
        return Object.entries(WeatherLegends).map((wl: any) => {
            return {
                id: wl[0],
                name: lang === 'no' ? wl[1].desc_nb : wl[1].desc_en
            };
        })
            .sort((a, b) => a.name.localeCompare(b.name, lang))
            .filter((result: any) => {
                return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
            });
    }

    async onTimeStartAutocomplete(query: any, args: any) {
        return [...Array(24).keys()]
            .map(hour => ({
                id: `${hour}`,
                name: hour === 0 ? this.homey.__('time.now') : hour === 1 ? this.homey.__('time.hour') : this.homey.__('time.hours', {hour}),
            }))
            .filter((result: any) => {
                return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
            });
    }

    async nextHoursComparer(args: any, state: any, compareFunc: (ts: YrTimeserie, value: number) => boolean): Promise<any> {
        return nextHoursComparer(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, compareFunc);
    }

    async periodComparer(args: any, state: any, compareFunc: (ts: YrTimeserie, value: number) => boolean): Promise<any> {
        return periodComparer(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, compareFunc);
    }

    nextHoursSum(args: any, sumSelector: (ts: YrTimeserie) => number, compareFunc: (sum: number | undefined, value: number) => boolean): any {
        return nextHoursSum(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, sumSelector, compareFunc);
    }

    periodSum(args: any, sumSelector: (ts: YrTimeserie) => number, compareFunc: (sum: number | undefined, value: number) => boolean): any {
        return periodSum(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, sumSelector, compareFunc);
    }
}