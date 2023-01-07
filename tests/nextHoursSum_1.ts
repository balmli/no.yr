import {expect} from 'chai';

import {nextHoursSum} from '../lib/yr_lib';

import yrData1 from './yr_data.json';
import yrData2 from './yr_data_2.json';

import {YrTimeserie, YrTimeseries} from "../lib/types";

describe('nextHoursSum', function () {

    describe('Check nextHoursSum', function () {
        it('Check sum rain (mm) above 1.89 mm starting 2022-08-02T12:00:00Z + 0 hours for 5 hours', function () {
            expect(nextHoursSum('2022-08-02T12:00:00Z', {
                value: 1.89,
                start: {id: '0'},
                hours: 5
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0, (sum: number | undefined, value: number) => !!sum && sum > value)).eq(true);
        });
        it('Check sum rain (mm) above 0.79 mm starting 2022-08-02T12:00:00Z + 2 hours for 2 hours', function () {
            expect(nextHoursSum('2022-08-02T12:00:00Z', {
                value: 0.79,
                start: {id: '2'},
                hours: 2
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0, (sum: number | undefined, value: number) => !!sum && sum > value)).eq(true);
        });
        it('Check sum rain (mm) equal to 1.1 mm starting 2022-08-02T12:00:00Z + 2 hours for 2 hours', function () {
            expect(nextHoursSum('2022-08-02T12:00:00Z', {
                value: 1.1,
                start: {id: '2'},
                hours: 2
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0, (sum: number | undefined, value: number) => !!sum && sum === value)).eq(false);
        });
    });
});
