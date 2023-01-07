import Homey from "homey";

import Logger from '@balmli/homey-logger';

import moment from "../../lib/moment-timezone-with-data";
import {Textforecasts, YrComplete, YrTimeserie, YrTimeseries} from '../../lib/types';
import {WeatherLegends} from "../../lib/legends";
import * as yrlib from "../../lib/yr_lib";

const math = require('../../lib/math');

module.exports = class YrDevice extends Homey.Device {

    logger!: Logger;
    _deleted?: boolean;
    _weatherData!: YrComplete | null;
    _textualForecast!: Textforecasts | null;
    _fetchDataTimeout?: NodeJS.Timeout;
    _updateDeviceTimeout?: NodeJS.Timeout;
    _clearAltitude?: boolean;
    _forceUpdateDevice?: boolean;

    async onInit(): Promise<void> {
        this.logger = new Logger({
            logLevel: 3,
            prefix: undefined,
            logFunc: this.log,
            errorFunc: this.error,
        });
        this._weatherData = null;
        this._textualForecast = null;
        await this.migrate();
        await this.initialize();
        this.scheduleFetchData(2);
        this.logger.verbose(this.getName() + ' -> device initialized');
    }

    async migrate(): Promise<void> {
        try {
            if (!this.hasCapability('sunrise_time')) {
                await this.addCapability('sunrise_time')
            }
            if (!this.hasCapability('sunset_time')) {
                await this.addCapability('sunset_time')
            }
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

    async updateCapabilities(wd: YrComplete): Promise<void> {
        const units = wd.properties.meta.units;
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

    async updateAndSortCapabilities(removeCaps: string[], addCaps: string[]): Promise<void> {
        try {
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
            const settings = this.getSettings();
            const lat = math.round4(settings.lat);
            const lon = math.round4(settings.lon);
            const altitude = settings.altitude;
            this._weatherData = await yrlib.fetchWeather(
                lat, lon, altitude,
                this._clearAltitude,
                this.homey.manifest.version,
                this.logger);
            if (this._weatherData) {
                await this.setDeviceAvailable();
                await this.updateLocation(this._weatherData);
                await this.updateCapabilities(this._weatherData);
                if (this._forceUpdateDevice === true) {
                    await this.updateDevice(this._weatherData);
                }
                try {
                    const sunrise = await yrlib.fetchSunrise(
                        lat, lon, altitude,
                        settings.period,
                        undefined,
                        this.homey.manifest.version,
                        this.logger,
                        this.homey
                    );
                    if (sunrise) {
                        await this.setCapabilityValue('sunrise_time', moment(sunrise.sunrise).format("DD.MM.YYYY HH:mm")).catch(err => this.logger.error(err));
                        await this.setCapabilityValue('sunset_time', moment(sunrise.sunset).format("DD.MM.YYYY HH:mm")).catch(err => this.logger.error(err));
                    }
                } catch (err1) {
                    await this.setCapabilityValue('sunrise_time', '-').catch(err => this.logger.error(err));
                    await this.setCapabilityValue('sunset_time', '-').catch(err => this.logger.error(err));
                    this.logger.error(err1);
                }
                try {
                    this._textualForecast = await yrlib.fetchTextforecast(
                        lat, lon,
                        this.homey.manifest.version,
                        this.logger,
                        this.homey
                    );
                } catch (err2) {
                    // TODO ikke logg hvis lat/lon ikke er støttet
                    this.logger.error(err2);
                }
            } else {
                await this.setDeviceUnavailable();
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            this._clearAltitude = false;
            this._forceUpdateDevice = false;
            this.scheduleFetchData();
            this.scheduleUpdateDevice();
        }
    }

    async setDeviceUnavailable(): Promise<void> {
        let fetchFailures = this.getStoreValue('fetchFailures') || 0;
        fetchFailures++;
        await this.setStoreValue('fetchFailures', fetchFailures);
        if (fetchFailures >= 5 && this.getAvailable()) {
            await this.setWarning(this.homey.__('errors.unavailable_due_to_data_error'));
            await this.setUnavailable();
        }
    }

    async setDeviceAvailable(): Promise<void> {
        await this.setStoreValue('fetchFailures', 0);
        if (!this.getAvailable()) {
            await this.unsetWarning();
            await this.setAvailable();
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
            if (this._weatherData) {
                await this.updateDevice(this._weatherData);
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            this.scheduleUpdateDevice();
        }
    }

    updateLocation = async (wd: YrComplete): Promise<void> => {
        const coords = wd.geometry.coordinates;
        if (this._clearAltitude === true || this.getSetting('altitude') === -1 &&
            coords &&
            coords.length > 2) {
            const lon = coords[0];
            const lat = coords[1];
            const altitude = Math.round(coords[2]);
            await this.setSettings({
                lon,
                lat,
                altitude
            });
        }
    }

    updateDevice = async (wd: YrComplete): Promise<void> => {
        const ts = yrlib.getTimeSeries(wd, this.getSetting('period'), this.logger);
        if (!!ts) {
            await this.setCapabilityValue('forecast_time', ts.localTime).catch(err => this.logger.error(err));

            const symbolCode = ts.data.next_1_hours ? ts.data.next_1_hours?.summary.symbol_code :
                ts.data.next_6_hours ? ts.data.next_6_hours?.summary.symbol_code :
                    ts.data.next_12_hours ? ts.data.next_12_hours?.summary.symbol_code : undefined;

            if (symbolCode) {
                await this.setCapabilityValue('weather_description', yrlib.weatherLegend(symbolCode, this.homey.i18n.getLanguage())).catch(err => this.logger.error(err));
            }

            await this.updateCapability('measure_temperature', ts.data.instant.details.air_temperature);
            await this.updateCapability('measure_temperature.feels_like', yrlib.calculateFeelsLike(ts.data.instant.details));
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
            await this.updateCapability('measure_wind_direction', yrlib.degreesToText(ts.data.instant.details.wind_from_direction as number));
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
        return yrlib.nextHoursComparer(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, compareFunc);
    }

    async periodComparer(args: any, state: any, compareFunc: (ts: YrTimeserie, value: number) => boolean): Promise<any> {
        return yrlib.periodComparer(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, compareFunc);
    }

    nextHoursSum(args: any, sumSelector: (ts: YrTimeserie) => number, compareFunc: (sum: number | undefined, value: number) => boolean): any {
        return yrlib.nextHoursSum(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, sumSelector, compareFunc);
    }

    periodSum(args: any, sumSelector: (ts: YrTimeserie) => number, compareFunc: (sum: number | undefined, value: number) => boolean): any {
        return yrlib.periodSum(undefined, args, this._weatherData?.properties.timeseries as YrTimeseries, sumSelector, compareFunc);
    }

    async textforecastAction(args: any, state: any): Promise<any> {
        if (!this._textualForecast) {
            throw new Error(this.homey.__('errors.unable_to_send_forecast'));
        }
        try {
            const day = Number(args.day);
            const forecast = this._textualForecast[day];
            return {
                from: forecast.from,
                to: forecast.to,
                location: forecast.locations[0].name,
                forecast: forecast.locations[0].forecast
            };
        } catch (err) {
            this.logger.error('Unable send forecast data', err);
            throw new Error(this.homey.__('errors.unable_to_send_forecast'));
        }
    }

}