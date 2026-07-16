import {
    applyFetchedDataIfDue,
    isFetchUpdateDue,
    millisecondsUntilUpdateDeadline,
} from '../lib/update_schedule';

describe('fetch/update deadline coordination', () => {
    it('waits for the pending boundary when a fetch completes before it', () => {
        expect(isFetchUpdateDue(false, 3_000, 2_999)).to.equal(false);
    });

    it('applies fresh data immediately when completion reaches or crosses the boundary', () => {
        expect(isFetchUpdateDue(false, 3_000, 3_000)).to.equal(true);
        expect(isFetchUpdateDue(false, 3_000, 3_001)).to.equal(true);
    });

    it('preserves forced updates and does not invent a deadline', () => {
        expect(isFetchUpdateDue(true, undefined, 1_000)).to.equal(true);
        expect(isFetchUpdateDue(false, undefined, 1_000)).to.equal(false);
    });

    it('supports the minute and hourly schedules with the same decision', () => {
        const hourlyDeadline = Date.parse('2026-07-16T10:00:03.000Z');
        const minuteDeadline = Date.parse('2026-07-16T10:01:02.000Z');

        expect(isFetchUpdateDue(false, hourlyDeadline, hourlyDeadline + 1_000)).to.equal(true);
        expect(isFetchUpdateDue(false, minuteDeadline, minuteDeadline + 1_000)).to.equal(true);
    });

    it('preserves a future captured deadline and schedules crossed deadlines immediately', () => {
        expect(millisecondsUntilUpdateDeadline(3_000, 2_500)).to.equal(500);
        expect(millisecondsUntilUpdateDeadline(3_000, 3_000)).to.equal(0);
        expect(millisecondsUntilUpdateDeadline(3_000, 3_500)).to.equal(0);
    });

    it('applies a delayed fetch result at most once after it crosses the deadline', async () => {
        let applyCount = 0;

        const applied = await applyFetchedDataIfDue(false, 3_000, async () => {
            applyCount += 1;
        }, 3_001);

        expect(applied).to.equal(true);
        expect(applyCount).to.equal(1);
    });
});
