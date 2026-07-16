import {Moment} from './moment';

export const SUN_EVENT_UNAVAILABLE = '-';

export function formatSunEvent(event: Moment | null | undefined): string {
    return event ? event.format('DD.MM.YYYY HH:mm') : SUN_EVENT_UNAVAILABLE;
}
