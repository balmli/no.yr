import {expect} from 'chai';
import Homey from "homey/lib/Homey";

import Logger from "@balmli/homey-logger";

import {Moment} from "../lib/moment";
import moment from "../lib/moment-timezone-with-data";
import {fetchSunrise} from "../lib/yr_lib";

describe('fetchSunrise', function () {
    describe('fetchSunrise 1', function () {
        it('Check fetchSunrise 2023-01-07', async function () {
            moment.tz.setDefault("Europe/Oslo");
            const sunrise = await fetchSunrise(
                59.933333,
                10.716667,
                0,
                '2:0',
                moment('2023-01-07T10:00:00'),
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey
            );
            //console.log(sunrise);
            expect(sunrise?.sunrise.format()).eq('2023-01-07T09:14:27+01:00');
            expect(sunrise?.sunset.format()).eq('2023-01-07T15:32:33+01:00');
        });

        it('Check fetchSunrise - today ', async function () {
            moment.tz.setDefault("Europe/Oslo");
            const sunrise = await fetchSunrise(
                59.933333,
                10.716667,
                0,
                '0',
                undefined,
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey
            );
            //console.log(sunrise);
            //expect(sunrise?.sunrise.format()).eq('2023-01-07T09:14:27+01:00');
            //expect(sunrise?.sunset.format()).eq('2023-01-07T15:32:33+01:00');
        });

        it('Check fetchSunrise - tomorrow ', async function () {
            moment.tz.setDefault("Europe/Oslo");
            const sunrise = await fetchSunrise(
                59.933333,
                10.716667,
                0,
                '1:0',
                undefined,
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey
            );
            //console.log(sunrise);
            //expect(sunrise?.sunrise.format()).eq('2023-01-07T09:14:27+01:00');
            //expect(sunrise?.sunset.format()).eq('2023-01-07T15:32:33+01:00');
        });

        it('Check fetchSunrise - +4 days, 12:00 UTC', async function () {
            moment.tz.setDefault("Europe/Oslo");
            const sunrise = await fetchSunrise(
                59.933333,
                10.716667,
                0,
                '4:12',
                undefined,
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey
            );
            //console.log(sunrise);
            //expect(sunrise?.sunrise.format()).eq('2023-01-07T09:14:27+01:00');
            //expect(sunrise?.sunset.format()).eq('2023-01-07T15:32:33+01:00');
        });

        it('Check fetchSunrise - today Tromsøe', async function () {
            moment.tz.setDefault("Europe/Oslo");
            try {
                const sunrise = await fetchSunrise(
                    69.647506,
                    18.955627,
                    0,
                    '0',
                    undefined,
                    '1.2.0',
                    new Logger({
                        logLevel: 3,
                        prefix: undefined,
                        logFunc: this.log,
                        errorFunc: this.error,
                    }),
                    {
                        "__": (key: string) => {
                            console.log('Homey messaage: ', key);
                        }
                    } as Homey
                );
                //console.log(sunrise);
            } catch (err) {
                //console.log(err);
            }
        });
    });
});
