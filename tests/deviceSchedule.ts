import {ScheduledFetch, ScheduledUpdate, secondsUntilPeriodicOffset, TimerApi} from '../lib/device_schedule';

interface ScheduledCall {
    callback: () => void;
    delayMilliseconds: number;
    timeout: NodeJS.Timeout;
}

class FakeTimerApi implements TimerApi {
    scheduled: ScheduledCall[] = [];
    cleared: NodeJS.Timeout[] = [];

    clearTimeout(timeout: NodeJS.Timeout): void {
        this.cleared.push(timeout);
    }

    setTimeout(callback: () => void, delayMilliseconds: number): NodeJS.Timeout {
        const timeout = {id: this.scheduled.length + 1} as unknown as NodeJS.Timeout;
        this.scheduled.push({callback, delayMilliseconds, timeout});
        return timeout;
    }
}

describe('device scheduling', () => {
    it('calculates the existing hourly and minute boundary delays', () => {
        expect(secondsUntilPeriodicOffset(3, 3600, new Date('2026-07-16T10:00:00Z'))).to.equal(3);
        expect(secondsUntilPeriodicOffset(3, 3600, new Date('2026-07-16T10:00:03Z'))).to.equal(3600);
        expect(secondsUntilPeriodicOffset(3600, 3600, new Date('2026-07-16T10:00:01Z'))).to.equal(3599);
        expect(secondsUntilPeriodicOffset(2, 60, new Date('2026-07-16T10:00:59Z'))).to.equal(3);
        expect(secondsUntilPeriodicOffset(120, 300, new Date('2026-07-16T10:04:59Z'))).to.equal(121);
    });

    it('shares fetch clear, reschedule, and explicit-force behavior', () => {
        const timerApi = new FakeTimerApi();
        const delays: number[] = [];
        let forced = 0;
        let runs = 0;
        const schedule = new ScheduledFetch({
            timerApi,
            isDeleted: () => false,
            run: () => {
                runs += 1;
            },
            getNextDelaySeconds: () => 15,
            onExplicitSchedule: () => {
                forced += 1;
            },
            logDelay: seconds => delays.push(seconds),
        });

        schedule.schedule();
        schedule.schedule(2);
        timerApi.scheduled[1].callback();

        expect(timerApi.scheduled.map(call => call.delayMilliseconds)).to.deep.equal([15_000, 2_000]);
        expect(timerApi.cleared).to.deep.equal([timerApi.scheduled[0].timeout]);
        expect(delays).to.deep.equal([15, 2]);
        expect(forced).to.equal(1);
        expect(runs).to.equal(1);
    });

    it('shares update deadline state and clamps crossed deadlines to an immediate run', () => {
        const timerApi = new FakeTimerApi();
        const delays: number[] = [];
        let now = 1_000;
        const schedule = new ScheduledUpdate({
            timerApi,
            isDeleted: () => false,
            run: () => undefined,
            getNextDelaySeconds: () => 2,
            logDelay: seconds => delays.push(seconds),
            now: () => now,
        });

        schedule.schedule();
        expect(schedule.deadline).to.equal(3_000);
        now = 4_000;
        schedule.scheduleAt(3_500);

        expect(timerApi.scheduled.map(call => call.delayMilliseconds)).to.deep.equal([2_000, 0]);
        expect(timerApi.cleared).to.deep.equal([timerApi.scheduled[0].timeout]);
        expect(delays).to.deep.equal([2, 0]);
        expect(schedule.deadline).to.equal(3_500);

        schedule.clear();
        expect(schedule.deadline).to.equal(undefined);
        expect(timerApi.cleared).to.deep.equal([timerApi.scheduled[0].timeout, timerApi.scheduled[1].timeout]);
    });

    it('does not schedule after deletion', () => {
        const timerApi = new FakeTimerApi();
        const fetch = new ScheduledFetch({
            timerApi,
            isDeleted: () => true,
            run: () => undefined,
            getNextDelaySeconds: () => 1,
            onExplicitSchedule: () => undefined,
            logDelay: () => undefined,
        });
        const update = new ScheduledUpdate({
            timerApi,
            isDeleted: () => true,
            run: () => undefined,
            getNextDelaySeconds: () => 1,
            logDelay: () => undefined,
        });

        fetch.schedule();
        update.schedule();
        update.scheduleAt(1_000);

        expect(timerApi.scheduled).to.deep.equal([]);
    });
});
