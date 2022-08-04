import {YrTimeserie, YrTimeseries} from "./types";
import moment from "./moment-timezone-with-data";
import {round2} from "./math";

const getStartTimeNextHours = (forDate: any, args: any): any => {
    const {start} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('hour')
        .add(Number(start.id), 'hours');
}

const getEndTimeNextHours = (forDate: any, args: any): any => {
    const {start, hours} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('hour')
        .add(Number(start.id), 'hours')
        .add(hours, 'hours');
}

const getStartTimePeriod = (forDate: any, args: any): any => {
    const {start, day} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('day')
        .add(Number(day), 'days')
        .add(Number(start.split(':')[0]), 'hour')
        .add(Number(start.split(':')[1]), 'minutes');
}

const getEndTimePeriod = (forDate: any, args: any): any => {
    const {end, day} = args;
    return (!!forDate ? moment(forDate) : moment())
        .startOf('day')
        .add(Number(day), 'days')
        .add(Number(end.split(':')[0]), 'hour')
        .add(Number(end.split(':')[1]), 'minutes');
}


const xComparer = (args: any,
                   startTime: any,
                   endTime: any,
                   tss: YrTimeseries,
                   compareFunc: (ts: YrTimeserie, value: number) => boolean
): boolean => {
    const vals = tss
        .filter(ts => compareFunc(ts, args.value))
        .map(ts => moment(ts.time))
        .filter(t => t.isSameOrAfter(startTime) && t.isBefore(endTime));
    return !!vals && vals.length > 0;
}

const xSum = (args: any,
              startTime: any,
              endTime: any,
              tss: YrTimeseries,
              sumSelector: (ts: YrTimeserie) => number,
              compareFunc: (sum: number | undefined, value: number) => boolean
): boolean => {
    return compareFunc(round2(tss
        .map(ts => ({time: moment(ts.time), val: sumSelector(ts)}))
        .filter(t => t.time.isSameOrAfter(startTime) && t.time.isBefore(endTime))
        .map(ts => ts.val)
        .reduce((acc, c) => acc + c, 0)), args.value);
}

export const nextHoursComparer = (forDate: any,
                                  args: any,
                                  tss: YrTimeseries,
                                  compareFunc: (ts: YrTimeserie, value: number) => boolean
): boolean => {
    return xComparer(args, getStartTimeNextHours(forDate, args), getEndTimeNextHours(forDate, args), tss, compareFunc);
}

export const periodComparer = (forDate: any,
                               args: any,
                               tss: YrTimeseries,
                               compareFunc: (ts: YrTimeserie, value: number) => boolean
): boolean => {
    return xComparer(args, getStartTimePeriod(forDate, args), getEndTimePeriod(forDate, args), tss, compareFunc);
}



export const nextHoursSum = (forDate: any,
                             args: any,
                             tss: YrTimeseries,
                             sumSelector: (ts: YrTimeserie) => number,
                             compareFunc: (sum: number | undefined, value: number) => boolean
): boolean => {
    return xSum(args, getStartTimeNextHours(forDate, args), getEndTimeNextHours(forDate, args), tss, sumSelector, compareFunc);
}

export const periodSum = (forDate: any,
                          args: any,
                          tss: YrTimeseries,
                          sumSelector: (ts: YrTimeserie) => number,
                          compareFunc: (sum: number | undefined, value: number) => boolean
): boolean => {
    return xSum(args, getStartTimePeriod(forDate, args), getEndTimePeriod(forDate, args), tss, sumSelector, compareFunc);
}