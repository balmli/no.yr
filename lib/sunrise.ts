import {DateInput, formatDate, formatDateTime, formatOffset, getDefaultTimeZone} from './date_time';
import {getDateFromPeriod} from './yr_lib';

export const SUN_EVENT_UNAVAILABLE = '-';

export function formatSunEvent(event: Date | null | undefined): string {
    return event ? formatDateTime(event) : SUN_EVENT_UNAVAILABLE;
}

export function sunEventRequestKey(period: string, now: DateInput = new Date()): string {
    const forDate = getDateFromPeriod(period, now);
    const timeZone = period.includes(':') ? 'UTC' : getDefaultTimeZone();
    return `${formatDate(forDate, timeZone)}|${formatOffset(forDate, timeZone)}`;
}

export function shouldRefreshSunEvents(oldPeriod: string, newPeriod: string, now: DateInput = new Date()): boolean {
    return sunEventRequestKey(oldPeriod, now) !== sunEventRequestKey(newPeriod, now);
}

export interface SunEventCapabilityWriter {
    setCapabilityValue(capabilityId: string, value: null): Promise<void>;
}

export async function clearSunEventCapabilities(device: SunEventCapabilityWriter): Promise<void> {
    await Promise.all([
        device.setCapabilityValue('sunrise_time', null),
        device.setCapabilityValue('sunset_time', null),
    ]);
}
