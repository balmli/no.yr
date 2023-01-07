import {expect} from 'chai';
import {parseSunrise} from "../lib/yr_lib";

const fs = require('fs/promises');

describe('parseSunrise', function () {
    describe('parseSunrise 1', function () {
        it('Check parseSunrise', async function () {
            const sunrises = await fs.readFile(`${__dirname}/sunrise_oslo.xml`, 'utf-8');
            const sunrisesObj = await parseSunrise(sunrises, '2023-01-07');
            //console.log(sunrisesObj);
            expect(sunrisesObj?.sunrise).eq('2023-01-07T09:14:27+01:00');
            expect(sunrisesObj?.sunset).eq('2023-01-07T15:32:33+01:00');
        });
    });
});
