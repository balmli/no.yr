import Homey from 'homey';
import moment from "./lib/moment-timezone-with-data";
import {YrTimeserie} from "./lib/types";

class YrApp extends Homey.App {

    async onInit() {
        moment.tz.setDefault(this.homey.clock.getTimezone());
        await this._initFlows();
        this.log('YrApp is running...');
    }

    async _initFlows() {
        this.homey.flow.getConditionCard('01_is_weather')
            .registerRunListener(args => args.device.getCapabilityValue(`weather_description`) === args.code.name)
            .getArgument('code')
            .registerAutocompleteListener((query, args) => args.device.onWeatherAutocomplete(query, args));

        this.homey.flow.getConditionCard('01_weather_next_hours')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => {
                    const symbolCode = !!ts.data.next_1_hours && (ts.data.next_1_hours.summary.symbol_code as string);
                    return !!symbolCode && symbolCode.split('_')[0] === args.code.id;
                }))
            .registerArgumentAutocompleteListener('code', async (query: string, args: any) => args.device.onWeatherAutocomplete(query, args))
            .registerArgumentAutocompleteListener('start', async (query: string, args: any) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('01_weather_period')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => {
                    const symbolCode = !!ts.data.next_1_hours && (ts.data.next_1_hours.summary.symbol_code as string);
                    return !!symbolCode && symbolCode.split('_')[0] === args.code.id;
                }))
            .registerArgumentAutocompleteListener('code', async (query: string, args: any) => args.device.onWeatherAutocomplete(query, args));

        this.homey.flow.getConditionCard('02_measure_temperature_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_temperature`) < args.value);

        this.homey.flow.getConditionCard('02_measure_temperature.feels_like_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_temperature.feels_like`) < args.value);

        this.homey.flow.getConditionCard('02_measure_temperature.min_next_6_hours_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_temperature.min_next_6_hours`) < args.value);

        this.homey.flow.getConditionCard('02_measure_temperature.max_next_6_hours_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_temperature.max_next_6_hours`) < args.value);

        this.homey.flow.getConditionCard('02_temperature_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('02_temperature_next_hours_below')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) < value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('02_temperature_period_above')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) > value));

        this.homey.flow.getConditionCard('02_temperature_period_below')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) < value));

        this.homey.flow.getConditionCard('03_measure_rain.next_1_hour_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_rain.next_1_hour`) < args.value);

        this.homey.flow.getConditionCard('03_measure_rain_next_1_hour_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_rain_next_1_hour`) < args.value);

        this.homey.flow.getConditionCard('03_measure_rain.next_6_hours_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_rain.next_6_hours`) < args.value);

        this.homey.flow.getConditionCard('03_measure_rain_next_6_hours_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_rain_next_6_hours`) < args.value);

        this.homey.flow.getConditionCard('03_rain_mm_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.precipitation_amount as number)) > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('03_rain_mm_next_hours_below')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.precipitation_amount as number)) < value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('03_rain_mm_period_above')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.precipitation_amount as number)) > value));

        this.homey.flow.getConditionCard('03_rain_mm_period_below')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.precipitation_amount as number)) < value));

        this.homey.flow.getConditionCard('03_rain_probability_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.probability_of_precipitation as number)) > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('03_rain_probability_period_above')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.probability_of_precipitation as number)) > value));

        this.homey.flow.getConditionCard('03_rain_sum_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursSum(args, state,
                (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0,
                (sum: number | undefined, value: number) => !!sum && sum > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('03_rain_sum_period_above')
            .registerRunListener((args, state) => args.device.periodSum(args,
                (ts: YrTimeserie) => !!ts.data.next_1_hours ? ts.data.next_1_hours.details.precipitation_amount as number : 0,
                (sum: number | undefined, value: number) => !!sum && sum > value));

        this.homey.flow.getConditionCard('10_measure_wind_strength_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_wind_strength`) < args.value);

        this.homey.flow.getConditionCard('10_wind_strength_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.wind_speed as number) > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('10_wind_strength_period_above')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.wind_speed as number) > value));

        this.homey.flow.getConditionCard('11_measure_wind_angle_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_wind_angle`) < args.value);

        this.homey.flow.getConditionCard('15_measure_gust_strength_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_gust_strength`) < args.value);

        this.homey.flow.getConditionCard('20_measure_humidity_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_humidity`) < args.value);

        this.homey.flow.getConditionCard('30_measure_pressure_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_pressure`) < args.value);

        this.homey.flow.getConditionCard('40_measure_cloud_area_fraction_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_cloud_area_fraction`) < args.value);

        this.homey.flow.getConditionCard('41_cloud_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.cloud_area_fraction as number) > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('41_cloud_period_above')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.cloud_area_fraction as number) > value));

        this.homey.flow.getConditionCard('50_measure_fog_area_fraction_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_fog_area_fraction`) < args.value);

        this.homey.flow.getConditionCard('51_fog_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.fog_area_fraction as number) > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('51_fog_period_above')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (ts.data.instant.details.fog_area_fraction as number) > value));

        this.homey.flow.getConditionCard('60_measure_thunder_next_1_hour_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_thunder_next_1_hour`) < args.value);

        this.homey.flow.getConditionCard('60_thunder_next_hours_above')
            .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.probability_of_thunder as number)) > value))
            .getArgument('start')
            .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));

        this.homey.flow.getConditionCard('60_thunder_period_above')
            .registerRunListener((args, state) => args.device.periodComparer(args, state,
                (ts: YrTimeserie, value: number) => (!!ts.data.next_1_hours && (ts.data.next_1_hours.details.probability_of_thunder as number)) > value));

        this.homey.flow.getConditionCard('70_measure_ultraviolet_below')
            .registerRunListener(args => args.device.getCapabilityValue(`measure_ultraviolet`) < args.value);

    }

}

module.exports = YrApp;
