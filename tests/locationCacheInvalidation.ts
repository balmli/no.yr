
import {invalidateLocationCaches} from '../lib/location_cache';

describe('location cache invalidation', () => {
    it('clears location-bound caches before scheduling fetches', async () => {
        const device: any = {
            _weatherData: {properties: {timeseries: []}},
            _weatherLastModified: 'weather-validator',
            _weatherExpires: 'weather-expiry',
            _nowcastData: {properties: {timeseries: []}},
            _nowcastLastModified: 'nowcast-validator',
            _nowcastExpires: 'nowcast-expiry',
            _textualForecast: [{forecast: 'old location'}],
        };

        invalidateLocationCaches(device);

        expect(device._weatherData).to.equal(null);
        expect(device._weatherLastModified).to.equal(undefined);
        expect(device._weatherExpires).to.equal(undefined);
        expect(device._nowcastData).to.equal(null);
        expect(device._nowcastLastModified).to.equal(undefined);
        expect(device._nowcastExpires).to.equal(undefined);
        expect(device._textualForecast).to.equal(null);
    });
});
