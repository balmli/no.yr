import {Moment} from './moment';
import {getDateFromPeriod} from './yr_lib';

export const SUN_EVENT_UNAVAILABLE = '-';

export function formatSunEvent(event: Moment | null | undefined): string {
    return event ? event.format('DD.MM.YYYY HH:mm') : SUN_EVENT_UNAVAILABLE;
}

export function sunEventRequestKey(period: string): string {
    const forDate = getDateFromPeriod(period);
    return `${forDate.format('YYYY-MM-DD')}|${forDate.format('Z')}`;
}

export function shouldRefreshSunEvents(oldPeriod: string, newPeriod: string): boolean {
    return sunEventRequestKey(oldPeriod) !== sunEventRequestKey(newPeriod);
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
