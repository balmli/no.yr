import {expect} from 'chai';

import {periodSum} from '../lib/yr_lib';

import yrData1 from './yr_data.json';
import yrData2 from './yr_data_2.json';

import {YrTimeserie, YrTimeseries} from "../lib/types";

describe('periodSum', function () {

    describe('Check periodSum', function () {
        it('Check sum rain (mm) above 1.89 mm between 2022-08-02T14:00:00+02:00 and 17:00', function () {
            expect(periodSum('2022-08-02T12:00:00Z', {
                value: 1.89,
                start: '14:00',
                end: '17:00',
                day: '0'
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0, (sum: number | undefined, value: number) => !!sum && sum > value)).eq(false);
        });
        it('Check sum rain (mm) above 0.79 mm between 2022-08-02T14:00:00+02:00 and 17:00', function () {
            expect(periodSum('2022-08-02T12:00:00Z', {
                value: 0.79,
                start: '14:00',
                end: '17:00',
                day: '0'
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0, (sum: number | undefined, value: number) => !!sum && sum > value)).eq(true);
        });
        it('Check sum rain (mm) equal to 1.1 mm between 2022-08-02T14:00:00+02:00 and 17:00', function () {
            expect(periodSum('2022-08-02T12:00:00Z', {
                value: 1.1,
                start: '14:00',
                end: '17:00',
                day: '0'
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0, (sum: number | undefined, value: number) => !!sum && sum === value)).eq(false);
        });
    });
});
