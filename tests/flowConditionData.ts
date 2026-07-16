import {
    capabilityEquals,
    capabilityIsBelow,
    requireConditionNumber,
    WeatherDataUnavailableError,
} from '../lib/flow_condition';

describe('Flow condition data availability', () => {
    it('rejects unknown direct capability values instead of coercing them', () => {
        const device = {getCapabilityValue: () => null};

        expect(() => capabilityIsBelow(device, 'measure_temperature', 10)).to.throw(WeatherDataUnavailableError);
        expect(() => capabilityEquals(device, 'weather_description', 'Sunny')).to.throw(WeatherDataUnavailableError);
    });

    it('preserves valid zero measurements', () => {
        const device = {getCapabilityValue: () => 0};

        expect(capabilityIsBelow(device, 'measure_rain.next_1_hour', 1)).to.equal(true);
        expect(requireConditionNumber(0)).to.equal(0);
    });

    it('rejects non-finite numeric forecast values', () => {
        expect(() => requireConditionNumber(undefined)).to.throw(WeatherDataUnavailableError);
        expect(() => requireConditionNumber(Number.NaN)).to.throw(WeatherDataUnavailableError);
        expect(() => requireConditionNumber(Number.POSITIVE_INFINITY)).to.throw(WeatherDataUnavailableError);
    });
});
