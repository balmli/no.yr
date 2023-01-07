import {expect} from 'chai';
import {findAreasIds, findTextforecastFromAreaIds, parseAreasFile, parseTextforecastFile} from "../lib/yr_lib";

const fs = require('fs/promises');

describe('parseTextforecastFile', function () {
    describe('parseTextforecastFile 1', function () {
        it('Check parseTextforecastFile', async function () {
            const forecast = await fs.readFile(`${__dirname}/textforecast_landoverview_1.xml`, 'utf-8');
            const forecastObj = await parseTextforecastFile(forecast);
            if (forecastObj) {
                const areas = await fs.readFile(`${__dirname}/textforecast_areas.xml`, 'utf-8');
                const areasObj = await parseAreasFile(areas);
                if (areasObj) {
                    const ids = findAreasIds(60.393608, 5.316064, areasObj);
                    const textForecast = findTextforecastFromAreaIds(forecastObj, ids)
                    /*console.log('Forecast for 60.393608, 5.316064 =>');
                    for (const fc of textForecast) {
                        console.log(fc);
                    }*/
                    expect(textForecast.length).eq(3);
                    expect(textForecast[0].from).eq('2022-08-07T00:00:00+02:00');
                    expect(textForecast[0].to).eq('2022-08-08T00:00:00+02:00');
                    expect(textForecast[0].locations.length).eq(1);
                    expect(textForecast[0].locations[0].id).eq('0612');
                    expect(textForecast[0].locations[0].name).eq('Hordaland');
                    expect(textForecast[0].locations[0].forecast).eq('Økning til sør-søraust liten kuling på kysten. Regn. I ettermiddag minking til sørlig, senere vestlig bris. Avtagende nedbøraktivitet.');

                    expect(textForecast[1].from).eq('2022-08-08T00:00:00+02:00');
                    expect(textForecast[1].to).eq('2022-08-09T00:00:00+02:00');
                    expect(textForecast[1].locations.length).eq(1);
                    expect(textForecast[1].locations[0].id).eq('0612_0614');
                    expect(textForecast[1].locations[0].name).eq('Vestland fylke');
                    expect(textForecast[1].locations[0].forecast).eq('Sør og sørvest opp i frisk bris på kysten, liten til stiv kuling kring Stad. Skya. Enkelte regnbyer først på dagen, seinare opphaldsver, om kvelden regn.');

                    expect(textForecast[2].from).eq('2022-08-09T00:00:00+02:00');
                    expect(textForecast[2].to).eq('2022-08-10T00:00:00+02:00');
                    expect(textForecast[2].locations.length).eq(1);
                    expect(textForecast[2].locations[0].id).eq('0505');
                    expect(textForecast[2].locations[0].name).eq('Vestlandet sør for Stad');
                    expect(textForecast[2].locations[0].forecast).eq('Sørlig bris, frisk bris på kysten. Skyet. Litt regn. Utpå dagen økende til sørlig frisk bris på kysten, liten kuling nord for Bergen. Skyet. Regn, vesentlig nord for Stavanger.');
                }

            }
        });
    });
});
