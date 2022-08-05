import {expect} from 'chai';

import {calculateFeelsLike} from '../lib/yr_lib';
import {InstantDetails} from "../lib/types";

describe('calculateFeelsLike', function () {
    describe('Check calculateFeelsLike', function () {
        it('Check 10 degs 1 m/s', function () {
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 1, wind_speed: 1 } as InstantDetails)).eq(4.9);
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 50, wind_speed: 1 } as InstantDetails)).eq(7.6);
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 95, wind_speed: 1 } as InstantDetails)).eq(10);
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 100, wind_speed: 1 } as InstantDetails)).eq(10.3);
        });
        it('Check 10 degs 10 m/s', function () {
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 1, wind_speed: 10 } as InstantDetails)).eq(1.8);
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 50, wind_speed: 10 } as InstantDetails)).eq(4.4);
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 95, wind_speed: 10 } as InstantDetails)).eq(6.9);
            expect(calculateFeelsLike({ air_temperature: 10, relative_humidity: 100, wind_speed: 10 } as InstantDetails)).eq(7.2);
        });
        it('Check 20 degs 10 m/s', function () {
            expect(calculateFeelsLike({ air_temperature: 20, relative_humidity: 1, wind_speed: 10 } as InstantDetails)).eq(13.3);
            expect(calculateFeelsLike({ air_temperature: 20, relative_humidity: 50, wind_speed: 10 } as InstantDetails)).eq(19.4);
            expect(calculateFeelsLike({ air_temperature: 20, relative_humidity: 95, wind_speed: 10 } as InstantDetails)).eq(22.4);
            expect(calculateFeelsLike({ air_temperature: 20, relative_humidity: 100, wind_speed: 10 } as InstantDetails)).eq(22.7);
        });
    });
});
