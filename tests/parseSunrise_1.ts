import {expect} from 'chai';
import {parseSunrise} from "../lib/yr_lib";

const fs = require('fs/promises');

describe('parseSunrise', function () {
    describe('parseSunrise 1', function () {
        it('Check parseSunrise Oslo 07.01.2023', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_oslo.xml`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises, '2023-01-07');
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise).eq('2023-01-07T09:14:27+01:00');
            expect(sunrisesObj?.sunset).eq('2023-01-07T15:32:33+01:00');
        });
        // https://api.met.no/weatherapi/sunrise/2.0/?lat=69.647506&lon=18.955627&date=2022-03-20&offset=+01:00
        it('Check parseSunrise Trømsø 20.03.2022', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_tromsoe_2022-03-20.xml`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises, '2022-03-20');
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise).eq('2022-03-20T05:44:22+01:00');
            expect(sunrisesObj?.sunset).eq('2022-03-20T18:01:33+01:00');
        });
        // https://api.met.no/weatherapi/sunrise/2.0/?lat=69.647506&lon=18.955627&date=2022-06-20&offset=+02:00
        it('Check parseSunrise Trømsø 20.06.2022', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_tromsoe_2022-06-20.xml`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises, '2022-06-20');
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise).eq(undefined);
            expect(sunrisesObj?.sunset).eq(undefined);
        });
        // https://api.met.no/weatherapi/sunrise/2.0/?lat=69.647506&lon=18.955627&date=2022-12-20&offset=+01:00
        it('Check parseSunrise Trømsø 20.12.2022', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_tromsoe_2022-12-20.xml`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises, '2022-12-20');
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise).eq(undefined);
            expect(sunrisesObj?.sunset).eq(undefined);
        });
    });
});
