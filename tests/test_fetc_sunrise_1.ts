import Homey from 'homey/lib/Homey';

import Logger from '@balmli/homey-logger';

import {formatIsoWithOffset, setDefaultTimeZone} from '../lib/date_time';
import {fetchSunrise} from '../lib/yr_lib';

describe('fetchSunrise', function () {
    describe('fetchSunrise 1', function () {
        it('Check fetchSunrise 2023-01-07', async function () {
            setDefaultTimeZone('Europe/Oslo');
            const sunrise = await fetchSunrise(
                59.933333,
                10.716667,
                '2:0',
                new Date('2023-01-07T09:00:00Z'),
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey,
            );
            //console.log(sunrise);
            expect(formatIsoWithOffset(sunrise!.sunrise!)).eq('2023-01-07T09:14:00+01:00');
            expect(formatIsoWithOffset(sunrise!.sunset!)).eq('2023-01-07T15:32:00+01:00');
        });

        it('Check fetchSunrise - today ', async function () {
            setDefaultTimeZone('Europe/Oslo');
            await fetchSunrise(
                59.933333,
                10.716667,
                '0',
                undefined,
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey,
            );
        });

        it('Check fetchSunrise - tomorrow ', async function () {
            setDefaultTimeZone('Europe/Oslo');
            await fetchSunrise(
                59.933333,
                10.716667,
                '1:0',
                undefined,
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey,
            );
        });

        it('Check fetchSunrise - +4 days, 12:00 UTC', async function () {
            setDefaultTimeZone('Europe/Oslo');
            await fetchSunrise(
                59.933333,
                10.716667,
                '4:12',
                undefined,
                '1.2.0',
                new Logger({
                    logLevel: 3,
                    prefix: undefined,
                    logFunc: this.log,
                    errorFunc: this.error,
                }),
                {} as Homey,
            );
        });

        it('Check fetchSunrise - today Tromsøe', async function () {
            setDefaultTimeZone('Europe/Oslo');
            try {
                await fetchSunrise(
                    69.647506,
                    18.955627,
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
                        __: (key: string) => {
                            console.log('Homey messaage: ', key);
                        },
                    } as Homey,
                );
                //console.log(sunrise);
            } catch (err) {
                //console.log(err);
            }
        });
    });
});
