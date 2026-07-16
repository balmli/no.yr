
import {mapForecastInstant} from '../lib/api_forecast';
import {InstantDetails} from '../lib/types';

describe('public API forecast instant', () => {
    it('calculates feels-like temperature from the shared weather inputs', () => {
        const instant = mapForecastInstant({
            air_temperature: 10,
            relative_humidity: 50,
            wind_speed: 10,
        } as InstantDetails);

        expect(instant.temperature).to.equal(10);
        expect(instant.feelsLike).to.equal(4.4);
        expect(instant.feelsLike).not.to.equal(instant.temperature);
    });

    it('omits feels-like when a required input is unavailable', () => {
        const instant = mapForecastInstant({air_temperature: 10} as InstantDetails);
        expect(instant.feelsLike).to.equal(undefined);
    });
});
