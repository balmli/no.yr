const api = require('../api');

describe('current weather API availability', () => {
    it('rejects retained capability values when no location-matched weather data exists', async () => {
        const device = {
            _weatherData: null,
            getCapabilities: () => ['measure_temperature'],
            getCapabilityValue: () => 12.4,
            getName: () => 'Weather',
            getSetting: () => 0,
        };
        const homey = {
            drivers: {
                getDriver: () => ({getDevice: () => device}),
            },
        };

        let error: unknown;
        try {
            await api.getWeather({homey, params: {deviceId: 'device-1'}});
        } catch (caught) {
            error = caught;
        }

        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.equal('No weather data available');
    });
});
