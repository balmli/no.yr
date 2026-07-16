
import {nextHoursComparer, nextHoursSum, periodComparer, periodSum} from '../lib/yr_lib';
import {WeatherDataUnavailableError} from '../lib/flow_condition';

describe('forecast Flow conditions without data', () => {
    const nextArgs = {start: {id: '0'}, hours: 1, value: 1};
    const periodArgs = {start: '00:00', end: '01:00', day: 0, value: 1};

    it('rejects comparer conditions so inversion cannot turn missing data into true', () => {
        expect(() => nextHoursComparer(undefined, nextArgs, undefined as any, () => true))
            .to.throw(WeatherDataUnavailableError);
        expect(() => periodComparer(undefined, periodArgs, undefined as any, () => true))
            .to.throw(WeatherDataUnavailableError);
    });

    it('rejects sum conditions so inversion cannot turn missing data into true', () => {
        expect(() => nextHoursSum(undefined, nextArgs, undefined as any, () => 1, () => true))
            .to.throw(WeatherDataUnavailableError);
        expect(() => periodSum(undefined, periodArgs, undefined as any, () => 1, () => true))
            .to.throw(WeatherDataUnavailableError);
    });

    it('rejects empty forecast arrays', () => {
        expect(() => nextHoursComparer(undefined, nextArgs, [], () => true))
            .to.throw(WeatherDataUnavailableError);
        expect(() => nextHoursSum(undefined, nextArgs, [], () => 1, () => true))
            .to.throw(WeatherDataUnavailableError);
    });
});
