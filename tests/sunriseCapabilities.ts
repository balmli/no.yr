import {formatSunEvent} from '../lib/sunrise';
import {parseSunrise} from '../lib/yr_lib';

const fs = require('fs/promises');

describe('sunrise capability values', () => {
    it('uses an explicit unavailable value for polar day and polar night', async () => {
        for (const fixture of [
            'sunrise_tromsoe_2023-06-20.json',
            'sunrise_tromsoe_2023-12-20.json',
        ]) {
            const response = await fs.readFile(`${__dirname}/${fixture}`, 'utf-8');
            const events = await parseSunrise(response);

            expect(formatSunEvent(events?.sunrise)).to.equal('-');
            expect(formatSunEvent(events?.sunset)).to.equal('-');
        }
    });

    it('formats ordinary astronomical events without changing their time', async () => {
        const response = await fs.readFile(`${__dirname}/sunrise_oslo_2023-01-07.json`, 'utf-8');
        const events = await parseSunrise(response);

        expect(formatSunEvent(events?.sunrise)).to.equal('07.01.2023 09:14');
        expect(formatSunEvent(events?.sunset)).to.equal('07.01.2023 15:32');
    });
});
