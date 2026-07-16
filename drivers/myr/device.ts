import Homey from 'homey';

import Logger from '@balmli/homey-logger';

import moment from '../../lib/moment-timezone-with-data';
import {RadarCoverage, Textforecasts, YrComplete, YrTimeserie, YrTimeseries} from '../../lib/types';
import {WeatherLegends} from '../../lib/legends';
import * as yrlib from '../../lib/yr_lib';
import {round2, truncate4} from '../../lib/math';
import {clearLocationCapabilityValues, invalidateLocationCaches} from '../../lib/location_cache';
import {
    isNowcastValid,
    getRainingThreshold,
    minutesUntilRain,
    NOWCAST_CAPABILITIES,
    nowcastLocationKey,
    shouldContinueNowcastPolling,
} from '../../lib/nowcast';
import {attemptTrackedFetch} from '../../lib/tracked_fetch';
import {honorCacheExpiry} from '../../lib/cache_schedule';
import {hasCapabilityValue} from '../../lib/capability_value';
import {clearSunEventCapabilities, formatSunEvent, shouldRefreshSunEvents} from '../../lib/sunrise';
import {applyFetchedDataIfDue} from '../../lib/update_schedule';
import {applyFetchAvailability} from '../../lib/fetch_availability';
import {ScheduledFetch, ScheduledUpdate, secondsUntilPeriodicOffset} from '../../lib/device_schedule';
import {getCapabilityChanges, getWeatherCapabilityValues, selectSymbolCode} from '../../lib/weather_capabilities';

module.exports = class YrDevice extends Homey.Device {
    logger!: Logger;
    _deleted?: boolean;
    _weatherData!: YrComplete | null;
    _weatherLastModified?: string;
    _weatherExpires?: string;
    _weatherRetrievedAt?: string;
    _fetchDataSchedule!: ScheduledFetch;
    _updateDeviceSchedule!: ScheduledUpdate;
    _clearAltitude?: boolean;
    _forceUpdateDevice?: boolean;
    _nowcastData!: YrComplete | null;
    _nowcastLastModified?: string;
    _nowcastExpires?: string;
    _fetchNowcastSchedule!: ScheduledFetch;
    _updateNowcastDeviceSchedule!: ScheduledUpdate;
    _forceUpdateNowcastDevice?: boolean;
    _textualForecast!: Textforecasts | null;
    _nowcastLocationKey?: string;

    async onInit(): Promise<void> {
        this.logger = new Logger({
            logLevel: 3,
            prefix: undefined,
            logFunc: this.log,
            errorFunc: this.error,
        });
        this._weatherData = null;
        this._nowcastData = null;
        this._textualForecast = null;
        await this.migrate();
        await this.initialize();
        this.initializeSchedulers();
        this._fetchDataSchedule.schedule(2);
        this._fetchNowcastSchedule.schedule(5);
        this.logger.verbose(this.getName() + ' -> device initialized');
    }

    async migrate(): Promise<void> {
        try {
            if (!this.hasCapability('sunrise_time')) {
                await this.addCapability('sunrise_time');
            }
            if (!this.hasCapability('sunset_time')) {
                await this.addCapability('sunset_time');
            }
            if (this.hasCapability('measure_wind_strength')) {
                await this.removeCapability('measure_wind_strength');
            }
            if (this.hasCapability('measure_gust_strength')) {
                await this.removeCapability('measure_gust_strength');
            }
            if (!this.hasCapability('measure_wind_strength1')) {
                await this.addCapability('measure_wind_strength1');
            }
            if (!this.hasCapability('measure_gust_strength1')) {
                await this.addCapability('measure_gust_strength1');
            }
        } catch (err) {
            this.logger.error('migration failed', err);
        }
    }

    async initialize(): Promise<void> {}

    initializeSchedulers(): void {
        const isDeleted = () => this._deleted === true;
        this._fetchDataSchedule = new ScheduledFetch({
            timerApi: this.homey,
            isDeleted,
            run: this.doFetchWeather.bind(this),
            getNextDelaySeconds: () => {
                const syncTime = this.getStoreValue('syncTime');
                const now = new Date();
                const seconds = honorCacheExpiry(
                    secondsUntilPeriodicOffset(syncTime, 3600, now),
                    this._weatherExpires,
                    now,
                );
                this.logger.verbose(`Sync time: ${syncTime}`);
                return seconds;
            },
            onExplicitSchedule: () => {
                this._forceUpdateDevice = true;
            },
            logDelay: seconds => this.logger.info(`Next fetch data in ${seconds} seconds`),
        });
        this._fetchNowcastSchedule = new ScheduledFetch({
            timerApi: this.homey,
            isDeleted,
            run: this.doFetchNowcast.bind(this),
            getNextDelaySeconds: () => {
                const syncTime = this.getStoreValue('syncTime') % 300;
                const now = new Date();
                return honorCacheExpiry(secondsUntilPeriodicOffset(syncTime, 300, now), this._nowcastExpires, now);
            },
            onExplicitSchedule: () => {
                this._forceUpdateNowcastDevice = true;
            },
            logDelay: seconds => this.logger.info(`Next fetch nowcast data in ${seconds} seconds`),
        });
        this._updateDeviceSchedule = new ScheduledUpdate({
            timerApi: this.homey,
            isDeleted,
            run: this.doUpdateDevice.bind(this),
            getNextDelaySeconds: () => secondsUntilPeriodicOffset(3, 3600),
            logDelay: seconds => this.logger.info(`Next update device in ${seconds} seconds`),
        });
        this._updateNowcastDeviceSchedule = new ScheduledUpdate({
            timerApi: this.homey,
            isDeleted,
            run: this.doUpdateNowcastDevice.bind(this),
            getNextDelaySeconds: () => secondsUntilPeriodicOffset(2, 60),
            logDelay: seconds => this.logger.debug(`Next update device with nowcast data in ${seconds} seconds`),
        });
    }

    onAdded(): void {}

    onDeleted() {
        this._deleted = true;
        this._fetchDataSchedule.clear();
        this._updateDeviceSchedule.clear();
        this._fetchNowcastSchedule.clear();
        this._updateNowcastDeviceSchedule.clear();
        this.logger.verbose(this.getName() + ' -> device deleted');
    }

    async onSettings({
        oldSettings,
        newSettings,
        changedKeys,
    }: {
        oldSettings: any;
        newSettings: any;
        changedKeys: string[];
    }): Promise<string | void> {
        if (changedKeys.includes('lat') || changedKeys.includes('lon') || changedKeys.includes('altitude')) {
            invalidateLocationCaches(this);
            await clearLocationCapabilityValues(this);
            await this.removeNowcastCapabilities();
            this._clearAltitude = !changedKeys.includes('altitude');
            this._fetchDataSchedule.schedule(1);
            this._fetchNowcastSchedule.schedule(2);
        } else if (changedKeys.includes('period')) {
            if (shouldRefreshSunEvents(oldSettings.period, newSettings.period)) {
                await clearSunEventCapabilities(this);
                this._fetchDataSchedule.schedule(1);
            } else {
                this._updateDeviceSchedule.schedule(1);
            }
            this._updateNowcastDeviceSchedule.schedule(2);
        }
    }

    async updateCapabilities(wd: YrComplete): Promise<void> {
        const {removeCaps, addCaps} = getCapabilityChanges(wd, this.hasCapability.bind(this));
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

    async doFetchWeather() {
        if (this._deleted) {
            return;
        }
        const updateDeadline = this._updateDeviceSchedule.deadline;
        let weatherFetchSucceeded = false;
        try {
            this._fetchDataSchedule.clear();
            this._updateDeviceSchedule.clear();
            const settings = this.getSettings();
            const lat = truncate4(settings.lat);
            const lon = truncate4(settings.lon);
            const altitude = settings.altitude;

            // Use cached Last-Modified header for conditional request
            const fetchAttempt = await attemptTrackedFetch(
                () =>
                    yrlib.fetchWeather(
                        lat,
                        lon,
                        altitude,
                        this._clearAltitude,
                        this.homey.manifest.version,
                        this.logger,
                        this._weatherLastModified,
                    ),
                this.setDeviceUnavailable.bind(this),
            );
            if (!fetchAttempt.ok) {
                this.logger.error(fetchAttempt.error);
                return;
            }
            const weatherResult = fetchAttempt.value;
            weatherFetchSucceeded = !!weatherResult.data || weatherResult.notModified;
            await applyFetchAvailability(
                weatherResult,
                this.setDeviceAvailable.bind(this),
                this.setDeviceUnavailable.bind(this),
            );

            // If data was fetched (not 304 response)
            if (weatherResult.data) {
                this._weatherData = weatherResult.data;
                this._weatherLastModified = weatherResult.lastModified;
                this._weatherExpires = weatherResult.expires;
                this._weatherRetrievedAt = weatherResult.retrievedAt;

                await this.updateLocation(this._weatherData);
                await this.updateCapabilities(this._weatherData);
            } else if (weatherResult.notModified) {
                // HTTP 304 - data not modified, use existing cache
                this._weatherLastModified = weatherResult.lastModified ?? this._weatherLastModified;
                this._weatherExpires = weatherResult.expires ?? this._weatherExpires;
                this._weatherRetrievedAt = weatherResult.retrievedAt ?? this._weatherRetrievedAt;
                this.logger.info('Using cached weather data (HTTP 304)');
            } else if (weatherResult.throttled) {
                this.logger.info('Weather fetch skipped due to application-wide rate-limit backoff');
            }

            // Only fetch sunrise/sunset and textual forecast if we have valid weather data
            if (this._weatherData && weatherFetchSucceeded) {
                try {
                    const sunrise = await yrlib.fetchSunrise(
                        lat,
                        lon,
                        settings.period,
                        undefined,
                        this.homey.manifest.version,
                        this.logger,
                        this.homey,
                    );
                    if (sunrise) {
                        await this.setCapabilityValue('sunrise_time', formatSunEvent(sunrise.sunrise)).catch(err =>
                            this.logger.error(err),
                        );
                        await this.setCapabilityValue('sunset_time', formatSunEvent(sunrise.sunset)).catch(err =>
                            this.logger.error(err),
                        );
                    }
                } catch (err1) {
                    await this.setCapabilityValue('sunrise_time', '-').catch(err => this.logger.error(err));
                    await this.setCapabilityValue('sunset_time', '-').catch(err => this.logger.error(err));
                    this.logger.error(err1);
                }
                try {
                    this._textualForecast = await yrlib.fetchTextforecast(
                        lat,
                        lon,
                        this.homey.manifest.version,
                        this.logger,
                        this.homey,
                    );
                } catch (err2) {
                    // TODO ikke logg hvis lat/lon ikke er støttet
                    this.logger.error(err2);
                }
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            this._clearAltitude = false;
            let appliedFetchedData = false;
            try {
                if (weatherFetchSucceeded && this._weatherData) {
                    const weatherData = this._weatherData;
                    appliedFetchedData = await applyFetchedDataIfDue(
                        this._forceUpdateDevice === true,
                        updateDeadline,
                        () => this.updateDevice(weatherData),
                    );
                }
            } catch (err) {
                this.logger.error(err);
            }
            this._forceUpdateDevice = false;
            this._fetchDataSchedule.schedule();
            if (!appliedFetchedData && weatherFetchSucceeded && this._weatherData && updateDeadline !== undefined) {
                this._updateDeviceSchedule.scheduleAt(updateDeadline);
            } else {
                this._updateDeviceSchedule.schedule();
            }
        }
    }

    async doFetchNowcast() {
        if (this._deleted) {
            return;
        }
        const updateDeadline = this._updateNowcastDeviceSchedule.deadline;
        let newSchedule = true;
        let nowcastFetchSucceeded = false;
        let appliedFetchedData = false;
        try {
            this._fetchNowcastSchedule.clear();
            this._updateNowcastDeviceSchedule.clear();
            const settings = this.getSettings();
            const lat = truncate4(settings.lat);
            const lon = truncate4(settings.lon);
            const altitude = settings.altitude;

            // Use cached Last-Modified header for conditional request
            const nowcastResult = await yrlib.fetchNowcast(
                lat,
                lon,
                altitude,
                this._clearAltitude,
                this.homey.manifest.version,
                this.logger,
                this._nowcastLastModified,
            );

            // If data was fetched (not 304 response)
            if (nowcastResult.data) {
                this._nowcastData = nowcastResult.data;
                this._nowcastLocationKey = nowcastLocationKey(lat, lon);
                this._nowcastLastModified = nowcastResult.lastModified;
                this._nowcastExpires = nowcastResult.expires;

                if (this._nowcastData.properties.meta.radar_coverage !== RadarCoverage.ok) {
                    newSchedule = shouldContinueNowcastPolling(this._nowcastData);
                    await this.clearNowcastState();
                } else {
                    nowcastFetchSucceeded = true;
                }
            } else if (nowcastResult.notModified) {
                // HTTP 304 - data not modified, use existing cache
                this._nowcastLastModified = nowcastResult.lastModified ?? this._nowcastLastModified;
                this._nowcastExpires = nowcastResult.expires ?? this._nowcastExpires;
                this.logger.info('Using cached nowcast data (HTTP 304)');
                nowcastFetchSucceeded = this._nowcastData !== null;
            } else if (nowcastResult.throttled) {
                this.logger.info('Nowcast fetch skipped due to application-wide rate-limit backoff');
            } else {
                // A null result can be a transient HTTP or parsing failure. Clear stale
                // values and keep polling until the API confirms permanent no-coverage.
                await this.clearNowcastState();
                this.logger.warn(`Nowcast unavailable for location ${lat}, ${lon}; retrying`);
            }

            if (nowcastFetchSucceeded && this._nowcastData) {
                const nowcast = this._nowcastData;
                let updateSucceeded = false;
                appliedFetchedData = await applyFetchedDataIfDue(
                    this._forceUpdateNowcastDevice === true,
                    updateDeadline,
                    async () => {
                        updateSucceeded = await this.updateDeviceNowcast(this._weatherData, nowcast);
                    },
                );
                if (appliedFetchedData && !updateSucceeded) {
                    newSchedule = shouldContinueNowcastPolling(nowcast);
                    await this.clearNowcastState();
                }
            }
        } catch (err) {
            await this.clearNowcastState();
            this.logger.error(err);
        } finally {
            this._forceUpdateNowcastDevice = false;
            if (newSchedule) {
                this._fetchNowcastSchedule.schedule();
                if (!appliedFetchedData && nowcastFetchSucceeded && this._nowcastData && updateDeadline !== undefined) {
                    this._updateNowcastDeviceSchedule.scheduleAt(updateDeadline);
                } else {
                    this._updateNowcastDeviceSchedule.schedule();
                }
            }
        }
    }

    async removeNowcastCapabilities(): Promise<void> {
        for (const capability of NOWCAST_CAPABILITIES) {
            if (this.hasCapability(capability)) {
                await this.removeCapability(capability);
            }
        }
    }

    async clearNowcastState(): Promise<void> {
        this._nowcastData = null;
        this._nowcastLastModified = undefined;
        this._nowcastExpires = undefined;
        this._nowcastLocationKey = undefined;
        await this.removeNowcastCapabilities();
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

    async doUpdateDevice() {
        if (this._deleted) {
            return;
        }
        try {
            this._updateDeviceSchedule.clear();
            if (this._weatherData) {
                await this.updateDevice(this._weatherData);
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            this._updateDeviceSchedule.schedule();
        }
    }

    async doUpdateNowcastDevice() {
        if (this._deleted) {
            return;
        }
        try {
            this._updateNowcastDeviceSchedule.clear();
            if (this._nowcastData) {
                await this.updateDeviceNowcast(this._weatherData, this._nowcastData);
            }
        } catch (err) {
            this.logger.error(err);
        } finally {
            this._updateNowcastDeviceSchedule.schedule();
        }
    }

    updateLocation = async (wd: YrComplete): Promise<void> => {
        const coords = wd.geometry.coordinates;
        if (this._clearAltitude === true || (this.getSetting('altitude') === -1 && coords && coords.length > 2)) {
            const lon = coords[0];
            const lat = coords[1];
            const altitude = Math.round(coords[2]);
            await this.setSettings({
                lon,
                lat,
                altitude,
            });
        }
    };

    updateDevice = async (wd: YrComplete): Promise<void> => {
        const ts = yrlib.getTimeSeries(wd, this.getSetting('period'), this.logger);
        if (ts) {
            await this.setCapabilityValue('forecast_time', ts.localTime).catch(err => this.logger.error(err));

            const symbolCode = selectSymbolCode(ts);

            if (symbolCode) {
                await this.setCapabilityValue(
                    'weather_description',
                    yrlib.weatherLegend(symbolCode, this.homey.i18n.getLanguage()),
                ).catch(err => this.logger.error(err));
            }

            for (const {capabilityId, value} of getWeatherCapabilityValues(ts)) {
                await this.updateCapability(capabilityId, value);
            }

            if (symbolCode) {
                const tokens = {
                    code: symbolCode,
                    description: this.getCapabilityValue('weather_description'),
                    all_data: JSON.stringify({
                        time: ts.time,
                        localTime: ts.localTime,
                        ...ts.data,
                    }),
                };
                this.logger.info('Updated device: ', tokens);
                await this.homey.flow
                    .getDeviceTriggerCard('01_weather_changed')
                    .trigger(this, tokens)
                    .catch(err => this.logger.error(err));
            } else {
                this.logger.info('Updated device: ', ts.localTime);
            }
        }
    };

    updateDeviceNowcast = async (_wd: YrComplete | null, nowcast: YrComplete | null): Promise<boolean> => {
        const period = this.getSetting('period');
        const rainingThreshold = getRainingThreshold(this.getSetting('raining_threshold'));

        const now = yrlib.getDateAddPeriod(period);
        const tsAfter = nowcast ? nowcast.properties.timeseries.filter(ts => moment(ts.time).isSameOrAfter(now)) : [];

        const settings = this.getSettings();
        const expectedLocationKey = nowcastLocationKey(truncate4(settings.lat), truncate4(settings.lon));
        if (!isNowcastValid(nowcast, this._nowcastLocationKey, expectedLocationKey) || tsAfter.length === 0) {
            await this.removeNowcastCapabilities();
            return false;
        }
        if (!this.hasCapability('measure_minutes_raining')) {
            await this.addCapability('measure_minutes_raining');
        }
        if (!this.hasCapability('measure_rain.next_30_minutes')) {
            await this.addCapability('measure_rain.next_30_minutes');
        }

        const next30Minutes = tsAfter.slice(0, 6);
        const rainNext30Minutes = round2(
            next30Minutes.reduce((acc, ts) => {
                const rate = ts.data?.instant?.details?.precipitation_rate || 0;
                return acc + (rate * 5) / 60;
            }, 0),
        );
        this.logger.debug(
            'Rain next 30 minutes: ',
            next30Minutes.map(ts => ts.data.instant.details.precipitation_rate),
            rainNext30Minutes,
        );

        const minutesUntilStartsRaining = minutesUntilRain(
            nowcast!.properties.timeseries,
            now.toDate(),
            rainingThreshold,
        );

        await this.updateCapability('measure_minutes_raining', minutesUntilStartsRaining);
        await this.updateCapability('measure_rain.next_30_minutes', rainNext30Minutes);
        return true;
    };

    updateCapability = async (capabilityId: string, value: any): Promise<void> => {
        if (this.hasCapability(capabilityId) && hasCapabilityValue(value)) {
            await this.setCapabilityValue(capabilityId, value).catch(err => this.logger.error(err));
        }
    };

    async onWeatherAutocomplete(query: any, _args: any) {
        const lang = this.homey.i18n.getLanguage();
        return Object.entries(WeatherLegends)
            .map((wl: any) => {
                return {
                    id: wl[0],
                    name: lang === 'no' ? wl[1].desc_nb : wl[1].desc_en,
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name, lang))
            .filter((result: any) => {
                return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
            });
    }

    async onTimeStartAutocomplete(query: any, _args: any) {
        return [...Array(24).keys()]
            .map(hour => ({
                id: `${hour}`,
                name:
                    hour === 0
                        ? this.homey.__('time.now')
                        : hour === 1
                          ? this.homey.__('time.hour')
                          : this.homey.__('time.hours', {hour}),
            }))
            .filter((result: any) => {
                return result.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
            });
    }

    async nextHoursComparer(
        args: any,
        _state: any,
        compareFunc: (ts: YrTimeserie, value: number) => boolean,
    ): Promise<any> {
        return yrlib.nextHoursComparer(
            undefined,
            args,
            this._weatherData?.properties.timeseries as YrTimeseries,
            compareFunc,
        );
    }

    async periodComparer(
        args: any,
        _state: any,
        compareFunc: (ts: YrTimeserie, value: number) => boolean,
    ): Promise<any> {
        return yrlib.periodComparer(
            undefined,
            args,
            this._weatherData?.properties.timeseries as YrTimeseries,
            compareFunc,
        );
    }

    nextHoursSum(
        args: any,
        sumSelector: (ts: YrTimeserie) => number,
        compareFunc: (sum: number | undefined, value: number) => boolean,
    ): any {
        return yrlib.nextHoursSum(
            undefined,
            args,
            this._weatherData?.properties.timeseries as YrTimeseries,
            sumSelector,
            compareFunc,
        );
    }

    periodSum(
        args: any,
        sumSelector: (ts: YrTimeserie) => number,
        compareFunc: (sum: number | undefined, value: number) => boolean,
    ): any {
        return yrlib.periodSum(
            undefined,
            args,
            this._weatherData?.properties.timeseries as YrTimeseries,
            sumSelector,
            compareFunc,
        );
    }

    async textforecastAction(args: any, _state: any): Promise<any> {
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
                forecast: forecast.locations[0].forecast,
            };
        } catch (err) {
            this.logger.error('Unable send forecast data', err);
            throw new Error(this.homey.__('errors.unable_to_send_forecast'));
        }
    }

    async nowcastAction(_args: any, _state: any): Promise<any> {
        const expectedLocationKey = nowcastLocationKey(
            truncate4(this.getSetting('lat')),
            truncate4(this.getSetting('lon')),
        );
        if (!isNowcastValid(this._nowcastData, this._nowcastLocationKey, expectedLocationKey)) {
            throw new Error(this.homey.__('errors.unable_to_send_nowcast'));
        }
        try {
            const forecast = JSON.stringify(this._nowcastData!.properties.timeseries);
            return {
                forecast,
            };
        } catch (err) {
            this.logger.error('Unable send nowcast data', err);
            throw new Error(this.homey.__('errors.unable_to_send_nowcast'));
        }
    }
};
