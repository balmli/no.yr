import {expect} from 'chai';
import {parseSunrise} from "../lib/yr_lib";
import moment from "../lib/moment-timezone-with-data";

const fs = require('fs/promises');

describe('parseSunrise', function () {
    describe('parseSunrise 1', function () {
        it('Check parseSunrise Oslo 07.01.2023', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_oslo_2023-01-07.json`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises);
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise.toISOString()).eq('2023-01-07T08:14:00.000Z');
            expect(sunrisesObj?.sunset.toISOString()).eq('2023-01-07T14:32:00.000Z');
        });
        // https://api.met.no/weatherapi/sunrise/3.0/sun?lat=69.6&lon=18.9&date=2023-03-20&offset=+01:00
        it('Check parseSunrise Trømsø 20.03.2023', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_tromsoe_2023-03-20.json`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises);
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise.toISOString()).eq('2023-03-20T04:45:00.000Z');
            expect(sunrisesObj?.sunset.toISOString()).eq('2023-03-20T17:00:00.000Z');
        });
        // https://api.met.no/weatherapi/sunrise/3.0/sun?lat=69.6&lon=18.9&date=2023-06-20&offset=+02:00
        it('Check parseSunrise Trømsø 20.06.2023', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_tromsoe_2023-06-20.json`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises);
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise).eq(undefined);
            expect(sunrisesObj?.sunset).eq(undefined);
        });
        // https://api.met.no/weatherapi/sunrise/3.0/sun?lat=69.6&lon=18.9&date=2023-12-20&offset=+01:00
        it('Check parseSunrise Trømsø 20.12.2023', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_tromsoe_2023-12-20.json`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises);
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise).eq(undefined);
            expect(sunrisesObj?.sunset).eq(undefined);
        });
    });
});
