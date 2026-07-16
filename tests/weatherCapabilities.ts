import yrData from './yr_data.json';
import {YrComplete, YrTimeserie} from '../lib/types';
import {getCapabilityChanges, getWeatherCapabilityValues, selectSymbolCode} from '../lib/weather_capabilities';

const weather = yrData as unknown as YrComplete;

describe('weather device capabilities', () => {
    it('plans optional capability additions in the existing side-effect order', () => {
        expect(getCapabilityChanges(weather, () => false)).to.deep.equal({
            removeCaps: [],
            addCaps: [
                'measure_rain_next_1_hour',
                'measure_rain_next_6_hours',
                'measure_gust_strength1',
                'measure_thunder_next_1_hour',
            ],
        });
    });

    it('plans removals only for unsupported capabilities that are present', () => {
        const unsupported = structuredClone(weather);
        delete unsupported.properties.meta.units.probability_of_precipitation;
        delete unsupported.properties.meta.units.wind_speed_of_gust;
        delete unsupported.properties.meta.units.probability_of_thunder;
        const present = new Set(['measure_rain_next_6_hours', 'measure_gust_strength1']);

        expect(getCapabilityChanges(unsupported, capabilityId => present.has(capabilityId))).to.deep.equal({
            removeCaps: ['measure_rain_next_6_hours', 'measure_gust_strength1'],
            addCaps: [],
        });
    });

    it('preserves symbol-period precedence, including a missing preferred symbol', () => {
        const timeserie = structuredClone(weather.properties.timeseries[0]);
        expect(selectSymbolCode(timeserie)).to.equal(timeserie.data.next_1_hours?.summary.symbol_code);

        delete timeserie.data.next_1_hours;
        expect(selectSymbolCode(timeserie)).to.equal(timeserie.data.next_6_hours?.summary.symbol_code);

        timeserie.data.next_1_hours = {
            summary: {},
            details: timeserie.data.next_6_hours!.details,
        };
        expect(selectSymbolCode(timeserie)).to.equal(undefined);
    });

    it('maps values in the same sequential capability-write order', () => {
        const timeserie = weather.properties.timeseries[0] as YrTimeserie;
        expect(getWeatherCapabilityValues(timeserie)).to.deep.equal([
            {capabilityId: 'measure_temperature', value: 10.3},
            {capabilityId: 'measure_temperature.feels_like', value: 8.5},
            {capabilityId: 'measure_temperature.min_next_6_hours', value: 10},
            {capabilityId: 'measure_temperature.max_next_6_hours', value: 10.4},
            {capabilityId: 'measure_pressure', value: 1007.3},
            {capabilityId: 'measure_humidity', value: 94.9},
            {capabilityId: 'measure_rain.next_1_hour', value: 0.6},
            {capabilityId: 'measure_rain_next_1_hour', value: 99},
            {capabilityId: 'measure_rain.next_6_hours', value: 1.9},
            {capabilityId: 'measure_rain_next_6_hours', value: 92},
            {capabilityId: 'measure_cloud_area_fraction', value: 100},
            {capabilityId: 'measure_fog_area_fraction', value: 0},
            {capabilityId: 'measure_wind_strength1', value: 6.6},
            {capabilityId: 'measure_wind_direction', value: 'NNW'},
            {capabilityId: 'measure_gust_strength1', value: 14.4},
            {capabilityId: 'measure_wind_angle', value: 330.3},
            {capabilityId: 'measure_thunder_next_1_hour', value: 0.7},
            {capabilityId: 'measure_ultraviolet', value: 4.7},
        ]);
    });
});
