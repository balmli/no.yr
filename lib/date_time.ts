export type DateInput = Date | number | string;

interface DateTimeParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    offsetMinutes: number;
}

let defaultTimeZone = process.env.TZ || 'UTC';

function isUtc(timeZone: string): boolean {
    return timeZone === 'UTC' || timeZone === 'Etc/UTC';
}

function inTimeZone<T>(timeZone: string, operation: () => T): T {
    if (isUtc(timeZone) || process.env.TZ === timeZone) {
        return operation();
    }

    const previousTimeZone = process.env.TZ;
    process.env.TZ = timeZone;
    try {
        return operation();
    } finally {
        if (previousTimeZone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = previousTimeZone;
        }
    }
}

function dateTimeParts(input: DateInput, timeZone: string): DateTimeParts {
    const date = toDate(input);
    if (isUtc(timeZone)) {
        return {
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            day: date.getUTCDate(),
            hour: date.getUTCHours(),
            minute: date.getUTCMinutes(),
            second: date.getUTCSeconds(),
            offsetMinutes: 0,
        };
    }

    return inTimeZone(timeZone, () => ({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
        offsetMinutes: -date.getTimezoneOffset(),
    }));
}

function zonedDate(parts: Omit<DateTimeParts, 'offsetMinutes'>, timeZone: string): Date {
    if (isUtc(timeZone)) {
        return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
    }
    return inTimeZone(
        timeZone,
        () => new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
    );
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

function formatOffsetMinutes(totalMinutes: number): string {
    const sign = totalMinutes < 0 ? '-' : '+';
    const absoluteMinutes = Math.abs(totalMinutes);
    return `${sign}${pad(Math.floor(absoluteMinutes / 60))}:${pad(absoluteMinutes % 60)}`;
}

export function setDefaultTimeZone(timeZone: string): void {
    if (!timeZone || timeZone.includes('\0')) {
        throw new Error('Invalid timezone');
    }
    process.env.TZ = timeZone;
    defaultTimeZone = timeZone;
}

export function getDefaultTimeZone(): string {
    return defaultTimeZone;
}

export function toDate(input: DateInput): Date {
    const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
    if (!Number.isFinite(date.getTime())) {
        throw new Error(`Invalid date: ${String(input)}`);
    }
    return date;
}

export function addHours(input: DateInput, hours: number): Date {
    return new Date(toDate(input).getTime() + hours * 60 * 60 * 1000);
}

export function startOfHour(input: DateInput, timeZone = defaultTimeZone): Date {
    const parts = dateTimeParts(input, timeZone);
    return zonedDate({...parts, minute: 0, second: 0}, timeZone);
}

export function startOfDayAt(
    input: DateInput,
    dayOffset: number,
    hour: number,
    minute: number,
    timeZone = defaultTimeZone,
): Date {
    const parts = dateTimeParts(input, timeZone);
    const shiftedDay = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + dayOffset));
    return zonedDate(
        {
            year: shiftedDay.getUTCFullYear(),
            month: shiftedDay.getUTCMonth() + 1,
            day: shiftedDay.getUTCDate(),
            hour,
            minute,
            second: 0,
        },
        timeZone,
    );
}

export function formatDate(input: DateInput, timeZone = defaultTimeZone): string {
    const parts = dateTimeParts(input, timeZone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatOffset(input: DateInput, timeZone = defaultTimeZone): string {
    return formatOffsetMinutes(dateTimeParts(input, timeZone).offsetMinutes);
}

export function formatDateTime(input: DateInput, timeZone = defaultTimeZone): string {
    const parts = dateTimeParts(input, timeZone);
    return `${pad(parts.day)}.${pad(parts.month)}.${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatIsoWithOffset(input: DateInput, timeZone = defaultTimeZone): string {
    const parts = dateTimeParts(input, timeZone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${formatOffsetMinutes(parts.offsetMinutes)}`;
}
