const INVALID_HOURS_MESSAGE = 'Invalid hours parameter. Must be between 1 and 240.';

export function parseForecastHours(value: string | undefined): number {
    if (value === undefined) {
        return 24;
    }
    if (!/^[1-9]\d*$/.test(value)) {
        throw new Error(INVALID_HOURS_MESSAGE);
    }
    const hours = Number(value);
    if (!Number.isSafeInteger(hours) || hours > 240) {
        throw new Error(INVALID_HOURS_MESSAGE);
    }
    return hours;
}
