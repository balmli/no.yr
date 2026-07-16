import {YrTimeserie} from './lib/types';
import {mapForecastInstant} from './lib/api_forecast';

module.exports = {
    async getWeather({homey, params}: { homey: any, params: { deviceId: string } }) {
        const device = homey.drivers.getDriver('myr').getDevice({id: params.deviceId});

        if (!device) {
            throw new Error('Device not found');
        }

        // Get all current weather capabilities
        const capabilities = device.getCapabilities();
        const currentWeather: any = {
            deviceId: params.deviceId,
            deviceName: device.getName(),
            location: {
                latitude: device.getSetting('lat'),
                longitude: device.getSetting('lon'),
                altitude: device.getSetting('altitude'),
            },
            timestamp: new Date().toISOString(),
            current: {}
        };

        // Read all capability values
        for (const capability of capabilities) {
            const value = device.getCapabilityValue(capability);
            if (value !== null && value !== undefined) {
                currentWeather.current[capability] = value;
            }
        }

        return currentWeather;
    },

    async getForecast({homey, params, query}: {
        homey: any,
        params: { deviceId: string },
        query: { hours?: string }
    }) {
        const device = homey.drivers.getDriver('myr').getDevice({id: params.deviceId});

        if (!device) {
            throw new Error('Device not found');
        }

        // Access the internal weather data from the device
        const weatherData = (device as any)._weatherData;
        const nowcastData = (device as any)._nowcastData;

        if (!weatherData || !weatherData.properties || !weatherData.properties.timeseries) {
            throw new Error('No weather data available');
        }

        // Parse hours parameter (default to 24 hours if not specified)
        const hoursAhead = query.hours ? parseInt(query.hours, 10) : 24;
        if (isNaN(hoursAhead) || hoursAhead < 1 || hoursAhead > 240) {
            throw new Error('Invalid hours parameter. Must be between 1 and 240.');
        }

        // Filter timeseries to the requested number of hours
        const now = new Date();
        const futureLimit = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

        const filteredTimeseries = weatherData.properties.timeseries.filter((ts: YrTimeserie) => {
            const tsTime = new Date(ts.time);
            return tsTime >= now && tsTime <= futureLimit;
        });

        // Build response
        const forecastResponse: any = {
            deviceId: params.deviceId,
            deviceName: device.getName(),
            location: {
                latitude: device.getSetting('lat'),
                longitude: device.getSetting('lon'),
                altitude: device.getSetting('altitude'),
            },
            timestamp: new Date().toISOString(),
            hoursRequested: hoursAhead,
            forecast: filteredTimeseries.map((ts: YrTimeserie) => ({
                time: ts.time,
                instant: mapForecastInstant(ts.data.instant.details),
                next1Hour: ts.data.next_1_hours ? {
                    symbolCode: ts.data.next_1_hours.summary.symbol_code,
                    precipitationAmount: ts.data.next_1_hours.details.precipitation_amount,
                    precipitationAmountMin: ts.data.next_1_hours.details.precipitation_amount_min,
                    precipitationAmountMax: ts.data.next_1_hours.details.precipitation_amount_max,
                    probabilityOfPrecipitation: ts.data.next_1_hours.details.probability_of_precipitation,
                    probabilityOfThunder: ts.data.next_1_hours.details.probability_of_thunder,
                } : undefined,
                next6Hours: ts.data.next_6_hours ? {
                    symbolCode: ts.data.next_6_hours.summary.symbol_code,
                    airTemperatureMin: ts.data.next_6_hours.details.air_temperature_min,
                    airTemperatureMax: ts.data.next_6_hours.details.air_temperature_max,
                    precipitationAmount: ts.data.next_6_hours.details.precipitation_amount,
                    precipitationAmountMin: ts.data.next_6_hours.details.precipitation_amount_min,
                    precipitationAmountMax: ts.data.next_6_hours.details.precipitation_amount_max,
                    probabilityOfPrecipitation: ts.data.next_6_hours.details.probability_of_precipitation,
                } : undefined,
                next12Hours: ts.data.next_12_hours ? {
                    symbolCode: ts.data.next_12_hours.summary.symbol_code,
                    probabilityOfPrecipitation: ts.data.next_12_hours.details.probability_of_precipitation,
                } : undefined,
            }))
        };

        // Add nowcast data if available (Nordic countries only)
        if (nowcastData && nowcastData.properties && nowcastData.properties.timeseries) {
            const nowcastLimit = new Date(now.getTime() + Math.min(hoursAhead, 1) * 60 * 60 * 1000);
            const filteredNowcast = nowcastData.properties.timeseries.filter((ts: YrTimeserie) => {
                const tsTime = new Date(ts.time);
                return tsTime >= now && tsTime <= nowcastLimit;
            });

            forecastResponse.nowcast = {
                available: true,
                data: filteredNowcast.map((ts: YrTimeserie) => ({
                    time: ts.time,
                    precipitationRate: ts.data.instant.details.precipitation_rate,
                    precipitationAmount: ts.data.next_1_hours?.details.precipitation_amount,
                }))
            };
        } else {
            forecastResponse.nowcast = {
                available: false,
                reason: 'Nowcast is only available for Nordic countries'
            };
        }

        return forecastResponse;
    },

    async getDevices({homey}: { homey: any }) {
        const driver = homey.drivers.getDriver('myr');
        const devices = driver.getDevices();

        return devices.map((device: any) => ({
            id: device.getData().id,
            name: device.getName(),
            available: device.getAvailable(),
            location: {
                latitude: device.getSetting('lat'),
                longitude: device.getSetting('lon'),
                altitude: device.getSetting('altitude'),
            }
        }));
    }
};
