import Homey from 'homey';
import {setDefaultTimeZone} from './lib/date_time';
import {YrTimeserie} from './lib/types';
import {
    capabilityEquals,
    capabilityIsBelow,
    requireConditionNumber,
    requireConditionString,
} from './lib/flow_condition';

class YrApp extends Homey.App {
    async onInit() {
        setDefaultTimeZone(this.homey.clock.getTimezone());
        await this._initFlows();
        this.log('YrApp is running...');
    }

    async _initFlows() {
        this.homey.flow
            .getConditionCard('01_is_weather')
            .registerRunListener(args => capabilityEquals(args.device, 'weather_description', args.code.name))
            .getArgument('code')
            .registerAutocompleteListener((query, args) => args.device.onWeatherAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('01_weather_next_hours')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(args, state, (ts: YrTimeserie, _value: number) => {
                    const symbolCode = requireConditionString(
                        ts.data.next_1_hours?.summary.symbol_code,
                        'weather symbol',
                    );
                    return symbolCode.split('_')[0] === args.code.id;
                }),
            )
            .registerArgumentAutocompleteListener('code', async (query: string, args: any) =>
                args.device.onWeatherAutocomplete(query, args),
            )
            .registerArgumentAutocompleteListener('start', async (query: string, args: any) =>
                args.device.onTimeStartAutocomplete(query, args),
            );

        this.homey.flow
            .getConditionCard('01_weather_period')
            .registerRunListener((args, state) =>
                args.device.periodComparer(args, state, (ts: YrTimeserie, _value: number) => {
                    const symbolCode = requireConditionString(
                        ts.data.next_1_hours?.summary.symbol_code,
                        'weather symbol',
                    );
                    return symbolCode.split('_')[0] === args.code.id;
                }),
            )
            .registerArgumentAutocompleteListener('code', async (query: string, args: any) =>
                args.device.onWeatherAutocomplete(query, args),
            );

        this.homey.flow
            .getConditionCard('02_measure_temperature_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_temperature', args.value));

        this.homey.flow
            .getConditionCard('02_measure_temperature.feels_like_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_temperature.feels_like', args.value));

        this.homey.flow
            .getConditionCard('02_measure_temperature.min_next_6_hours_below')
            .registerRunListener(args =>
                capabilityIsBelow(args.device, 'measure_temperature.min_next_6_hours', args.value),
            );

        this.homey.flow
            .getConditionCard('02_measure_temperature.max_next_6_hours_below')
            .registerRunListener(args =>
                capabilityIsBelow(args.device, 'measure_temperature.max_next_6_hours', args.value),
            );

        this.homey.flow
            .getConditionCard('02_temperature_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.air_temperature, 'air temperature') > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('02_temperature_next_hours_below')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.air_temperature, 'air temperature') < value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('02_temperature_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.air_temperature, 'air temperature') > value,
                ),
            );

        this.homey.flow
            .getConditionCard('02_temperature_period_below')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.air_temperature, 'air temperature') < value,
                ),
            );

        this.homey.flow
            .getConditionCard('03_measure_rain.next_1_hour_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_rain.next_1_hour', args.value));

        this.homey.flow
            .getConditionCard('03_measure_rain_next_1_hour_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_rain_next_1_hour', args.value));

        this.homey.flow
            .getConditionCard('03_measure_rain.next_6_hours_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_rain.next_6_hours', args.value));

        this.homey.flow
            .getConditionCard('03_measure_rain_next_6_hours_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_rain_next_6_hours', args.value));

        this.homey.flow
            .getConditionCard('03_rain_mm_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.precipitation_amount,
                            'precipitation amount',
                        ) > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('03_rain_mm_next_hours_below')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.precipitation_amount,
                            'precipitation amount',
                        ) < value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('03_rain_mm_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.precipitation_amount,
                            'precipitation amount',
                        ) > value,
                ),
            );

        this.homey.flow
            .getConditionCard('03_rain_mm_period_below')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.precipitation_amount,
                            'precipitation amount',
                        ) < value,
                ),
            );

        this.homey.flow
            .getConditionCard('03_rain_probability_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.probability_of_precipitation,
                            'precipitation probability',
                        ) > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('03_rain_probability_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.probability_of_precipitation,
                            'precipitation probability',
                        ) > value,
                ),
            );

        this.homey.flow
            .getConditionCard('03_rain_sum_next_hours_above')
            .registerRunListener((args, _state) =>
                args.device.nextHoursSum(
                    args,
                    (ts: YrTimeserie) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.precipitation_amount,
                            'precipitation amount',
                        ),
                    (sum: number | undefined, value: number) => !!sum && sum > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('03_rain_sum_period_above').registerRunListener((args, _state) =>
            args.device.periodSum(
                args,
                (ts: YrTimeserie) =>
                    requireConditionNumber(ts.data.next_1_hours?.details.precipitation_amount, 'precipitation amount'),
                (sum: number | undefined, value: number) => !!sum && sum > value,
            ),
        );

        this.homey.flow
            .getConditionCard('10_measure_wind_strength_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_wind_strength1', args.value));

        this.homey.flow
            .getConditionCard('10_wind_strength_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.wind_speed, 'wind speed') > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('10_wind_strength_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.wind_speed, 'wind speed') > value,
                ),
            );

        this.homey.flow
            .getConditionCard('11_measure_wind_angle_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_wind_angle', args.value));

        this.homey.flow
            .getConditionCard('15_measure_gust_strength_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_gust_strength1', args.value));

        this.homey.flow
            .getConditionCard('20_measure_humidity_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_humidity', args.value));

        this.homey.flow
            .getConditionCard('30_measure_pressure_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_pressure', args.value));

        this.homey.flow
            .getConditionCard('40_measure_cloud_area_fraction_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_cloud_area_fraction', args.value));

        this.homey.flow
            .getConditionCard('41_cloud_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.cloud_area_fraction, 'cloud area fraction') >
                        value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('41_cloud_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.cloud_area_fraction, 'cloud area fraction') >
                        value,
                ),
            );

        this.homey.flow
            .getConditionCard('50_measure_fog_area_fraction_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_fog_area_fraction', args.value));

        this.homey.flow
            .getConditionCard('51_fog_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.fog_area_fraction, 'fog area fraction') > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('51_fog_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(ts.data.instant.details.fog_area_fraction, 'fog area fraction') > value,
                ),
            );

        this.homey.flow
            .getConditionCard('60_measure_thunder_next_1_hour_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_thunder_next_1_hour', args.value));

        this.homey.flow
            .getConditionCard('60_thunder_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.probability_of_thunder,
                            'thunder probability',
                        ) > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('60_thunder_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.next_1_hours?.details.probability_of_thunder,
                            'thunder probability',
                        ) > value,
                ),
            );

        this.homey.flow
            .getConditionCard('70_measure_ultraviolet_below')
            .registerRunListener(args => capabilityIsBelow(args.device, 'measure_ultraviolet', args.value));

        this.homey.flow
            .getConditionCard('71_ultraviolet_next_hours_above')
            .registerRunListener((args, state) =>
                args.device.nextHoursComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.instant.details.ultraviolet_index_clear_sky,
                            'ultraviolet index',
                        ) > value,
                ),
            )
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow
            .getConditionCard('71_ultraviolet_period_above')
            .registerRunListener((args, state) =>
                args.device.periodComparer(
                    args,
                    state,
                    (ts: YrTimeserie, value: number) =>
                        requireConditionNumber(
                            ts.data.instant.details.ultraviolet_index_clear_sky,
                            'ultraviolet index',
                        ) > value,
                ),
            );

        this.homey.flow
            .getActionCard('10_textforecast')
            .registerRunListener((args, state) => args.device.textforecastAction(args, state));

        this.homey.flow
            .getActionCard('50_nowcast')
            .registerRunListener((args, state) => args.device.nowcastAction(args, state));
    }
}

module.exports = YrApp;
