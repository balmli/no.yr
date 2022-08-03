import {expect} from 'chai';

import {periodComparer} from '../lib/yr_lib';

import yrData2 from './yr_data_2.json';

import {YrTimeserie, YrTimeseries} from "../lib/types";

describe('periodComparer', function () {

    describe('Check periodComparer', function () {
        it('Check temperature above 10.1 2022-08-02T14:00:00+02:00 and 2022-08-02T17:00:00+02:00', function () {
            expect(periodComparer('2022-08-02T12:00:00Z', {
                value: 10.1,
                start: '14:00',
                end: '17:00',
                day: '0'
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) > value)).eq(true);
        });
        it('Check temperature below 16.1 2022-08-02T14:00:00+02:00 and 2022-08-02T17:00:00+02:00', function () {
            expect(periodComparer('2022-08-02T12:00:00Z', {
                value: 16.1,
                start: '14:00',
                end: '17:00',
                day: '0'
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) < value)).eq(true);
        });
        it('Check temperature below 10.7 2022-08-02T14:00:00+02:00 and 2022-08-02T17:00:00+02:00', function () {
            expect(periodComparer('2022-08-02T12:00:00Z', {
                value: 14.0,
                start: '14:00',
                end: '17:00',
                day: '0'
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) < value)).eq(true);
        });
        it('Check temperature below 10.7 2022-08-02T14:00:00+02:00 and 2022-08-02T17:00:00+02:00', function () {
            expect(periodComparer('2022-08-02T12:00:00Z', {
                value: 13.9,
                start: '14:00',
                end: '17:00',
                day: '0'
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) < value)).eq(false);
        });
    });

});
