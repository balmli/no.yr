import {expect} from 'chai';

import {nextHoursComparer, nextHoursSum} from '../lib/yr_lib';

import yrData1 from './yr_data.json';
import yrData2 from './yr_data_2.json';

import {YrTimeserie, YrTimeseries} from "../lib/types";

describe('nextHoursComparer', function () {

    describe('Check nextHoursComparer', function () {
        it('Check temperature above 10.1 starting 2022-07-26T13:00:00Z + 2 hours for 4 hours', function () {
            expect(nextHoursComparer('2022-07-26T13:00:00Z', {
                value: 10.1,
                start: {id: '2'},
                hours: 4
            }, yrData1.properties.timeseries as YrTimeseries, (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) > value)).eq(true);
        });
        it('Check temperature above 16 starting 2022-07-26T13:00:00Z + 2 hours for 4 hours', function () {
            expect(nextHoursComparer('2022-07-26T13:00:00Z', {
                value: 16,
                start: {id: '2'},
                hours: 4
            }, yrData1.properties.timeseries as YrTimeseries, (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) > value)).eq(false);
        });
        it('Check rain (mm/h) above 1 starting 2022-08-02T12:00:00Z + 0 hours for 5 hours', function () {
            expect(nextHoursComparer('2022-08-02T12:00:00Z', {
                value: 0.3,
                start: {id: '0'},
                hours: 5
            }, yrData2.properties.timeseries as YrTimeseries, (ts: YrTimeserie, value: number) => !!ts.data.next_1_hours && (ts.data.next_1_hours.details.precipitation_amount as number) > value)).eq(true);
        });
    });

});
