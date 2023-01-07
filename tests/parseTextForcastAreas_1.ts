import {expect} from 'chai';
import {findAreasIds, parseAreasFile} from "../lib/yr_lib";

const fs = require('fs/promises');

describe('parseAreasFile', function () {
    describe('parseAreasFile 1', function () {
        it('Check parseAreasFile', async function () {
            const areas = await fs.readFile(`${__dirname}/textforecast_areas.xml`, 'utf-8');
            const areasObj = await parseAreasFile(areas);
            //console.log(areasObj?.map(a => ({id: a.id, areaDesc: a.areaDesc})));

            const hordaland = areasObj?.find(a => a.id === '0612');
            //console.log(hordaland);
            expect(hordaland?.polygon.length).eq(212);
            expect(hordaland?.polygon[0][0]).eq(60.673833);
            expect(hordaland?.polygon[0][1]).eq(7.462833);
            expect(hordaland?.polygon[210][0]).eq(60.685333);
            expect(hordaland?.polygon[210][1]).eq(7.333167);
            expect(hordaland?.polygon[211][0]).eq(60.673833);
            expect(hordaland?.polygon[211][1]).eq(7.462833);

            if (areasObj) {
                const ids = findAreasIds(60.393608, 5.316064, areasObj);
                expect(ids.length).eq(4);
                expect(ids[0]).eq('0505');
                expect(ids[1]).eq('0611_0612');
                expect(ids[2]).eq('0612');
                expect(ids[3]).eq('0612_0614');
                //console.log('Areas for 60.393608, 5.316064 =>', ids);
            }
        });
    });
});
