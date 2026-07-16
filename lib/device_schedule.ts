import {millisecondsUntilUpdateDeadline} from './update_schedule';

export interface TimerApi {
    clearTimeout(timeout: NodeJS.Timeout): void;
    setTimeout(callback: () => void, delayMilliseconds: number): NodeJS.Timeout;
}

interface ScheduledFetchOptions {
    timerApi: TimerApi;
    isDeleted: () => boolean;
    run: () => void;
    getNextDelaySeconds: () => number;
    onExplicitSchedule: () => void;
    logDelay: (seconds: number) => void;
}

interface ScheduledUpdateOptions {
    timerApi: TimerApi;
    isDeleted: () => boolean;
    run: () => void;
    getNextDelaySeconds: () => number;
    logDelay: (seconds: number) => void;
    now?: () => number;
}

export function secondsUntilPeriodicOffset(offsetSeconds: number, periodSeconds: number, now = new Date()): number {
    const elapsedSeconds = (now.getMinutes() * 60 + now.getSeconds()) % periodSeconds;
    let seconds = offsetSeconds - elapsedSeconds;
    seconds = seconds <= 0 ? seconds + periodSeconds : seconds;
    return seconds;
}

export class ScheduledFetch {
    private timeout?: NodeJS.Timeout;

    constructor(private readonly options: ScheduledFetchOptions) {}

    clear(): void {
        if (this.timeout) {
            this.options.timerApi.clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    schedule(seconds?: number): void {
        if (this.options.isDeleted()) {
            return;
        }
        this.clear();
        if (seconds === undefined) {
            seconds = this.options.getNextDelaySeconds();
        } else {
            this.options.onExplicitSchedule();
        }
        this.options.logDelay(seconds);
        this.timeout = this.options.timerApi.setTimeout(this.options.run, seconds * 1000);
    }
}

export class ScheduledUpdate {
    private timeout?: NodeJS.Timeout;
    private readonly now: () => number;
    deadline?: number;

    constructor(private readonly options: ScheduledUpdateOptions) {
        this.now = options.now ?? Date.now;
    }

    clear(): void {
        if (this.timeout) {
            this.options.timerApi.clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        this.deadline = undefined;
    }

    scheduleAt(deadline: number): void {
        if (this.options.isDeleted()) {
            return;
        }
        this.clear();
        const delayMilliseconds = millisecondsUntilUpdateDeadline(deadline, this.now());
        this.deadline = deadline;
        this.options.logDelay(delayMilliseconds / 1000);
        this.timeout = this.options.timerApi.setTimeout(this.options.run, delayMilliseconds);
    }

    schedule(seconds?: number): void {
        if (this.options.isDeleted()) {
            return;
        }
        seconds ??= this.options.getNextDelaySeconds();
        this.scheduleAt(this.now() + seconds * 1000);
    }
}
