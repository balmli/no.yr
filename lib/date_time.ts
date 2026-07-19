export type DateInput = Date | number | string;

interface DateTimeParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
let defaultTimeZone = 'UTC';

function formatter(timeZone: string): Intl.DateTimeFormat {
    let cached = formatterCache.get(timeZone);
    if (!cached) {
        cached = new Intl.DateTimeFormat('en-CA', {
            timeZone,
            calendar: 'gregory',
            numberingSystem: 'latn',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        });
        formatterCache.set(timeZone, cached);
    }
    return cached;
}

function dateTimeParts(input: DateInput, timeZone: string): DateTimeParts {
    const date = toDate(input);
    const parts = Object.fromEntries(
        formatter(timeZone)
            .formatToParts(date)
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, Number(part.value)]),
    );
    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
    };
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

function offsetMilliseconds(timestamp: number, timeZone: string): number {
    const parts = dateTimeParts(timestamp, timeZone);
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return representedAsUtc - Math.floor(timestamp / 1000) * 1000;
}

function sameParts(left: DateTimeParts, right: DateTimeParts): boolean {
    return (
        left.year === right.year &&
        left.month === right.month &&
        left.day === right.day &&
        left.hour === right.hour &&
        left.minute === right.minute &&
        left.second === right.second
    );
}

function zonedTimestamp(parts: DateTimeParts, timeZone: string): number {
    const wallClockUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const offsets = new Set([
        offsetMilliseconds(wallClockUtc - 24 * 60 * 60 * 1000, timeZone),
        offsetMilliseconds(wallClockUtc, timeZone),
        offsetMilliseconds(wallClockUtc + 24 * 60 * 60 * 1000, timeZone),
    ]);
    const candidates = [...offsets]
        .map(offset => wallClockUtc - offset)
        .filter(candidate => sameParts(dateTimeParts(candidate, timeZone), parts))
        .sort((left, right) => left - right);
    if (candidates.length > 0) {
        // Match Moment's choice of the earlier occurrence during a fall-back overlap.
        return candidates[0];
    }

    // During a spring-forward gap, Moment advances by the size of the gap.
    const beforeOffset = offsetMilliseconds(wallClockUtc - 24 * 60 * 60 * 1000, timeZone);
    return wallClockUtc - beforeOffset;
}

export function setDefaultTimeZone(timeZone: string): void {
    formatter(timeZone).format(new Date(0));
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
    return new Date(zonedTimestamp({...parts, minute: 0, second: 0}, timeZone));
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
    return new Date(
        zonedTimestamp(
            {
                year: shiftedDay.getUTCFullYear(),
                month: shiftedDay.getUTCMonth() + 1,
                day: shiftedDay.getUTCDate(),
                hour,
                minute,
                second: 0,
            },
            timeZone,
        ),
    );
}

export function formatDate(input: DateInput, timeZone = defaultTimeZone): string {
    const parts = dateTimeParts(input, timeZone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatOffset(input: DateInput, timeZone = defaultTimeZone): string {
    const totalMinutes = Math.round(offsetMilliseconds(toDate(input).getTime(), timeZone) / 60000);
    const sign = totalMinutes < 0 ? '-' : '+';
    const absoluteMinutes = Math.abs(totalMinutes);
    return `${sign}${pad(Math.floor(absoluteMinutes / 60))}:${pad(absoluteMinutes % 60)}`;
}

export function formatDateTime(input: DateInput, timeZone = defaultTimeZone): string {
    const parts = dateTimeParts(input, timeZone);
    return `${pad(parts.day)}.${pad(parts.month)}.${parts.year} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatIsoWithOffset(input: DateInput, timeZone = defaultTimeZone): string {
    const parts = dateTimeParts(input, timeZone);
    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${formatOffset(input, timeZone)}`;
}
