
import {weatherLegend} from '../lib/yr_lib';

describe('weatherLegend', () => {
    it('returns unknown symbol codes unchanged', () => {
        expect(weatherLegend('unknown_symbol_day', 'en')).to.equal('unknown_symbol_day');
        expect(weatherLegend('futurecondition', 'no')).to.equal('futurecondition');
    });

    it('still resolves known symbols with unexpected suffixes', () => {
        expect(weatherLegend('clearsky_futurevariant', 'en')).to.equal('Clear sky');
        expect(weatherLegend('cloudy_day', 'no')).to.equal('Skyet');
    });
});
