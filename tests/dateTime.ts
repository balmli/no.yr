import {
    formatDateTime,
    formatIsoWithOffset,
    formatOffset,
    setDefaultTimeZone,
    startOfDayAt,
    startOfHour,
} from '../lib/date_time';

describe('native date and timezone helpers', () => {
    beforeEach(() => setDefaultTimeZone('Europe/Oslo'));

    it('formats timestamps in the configured Homey timezone', () => {
        expect(formatDateTime('2026-07-16T10:41:48.765Z')).to.equal('16.07.2026 12:41');
        expect(formatIsoWithOffset('2026-07-19T00:00:00Z')).to.equal('2026-07-19T02:00:00+02:00');
    });

    it('uses the correct offsets on both sides of daylight-saving transitions', () => {
        expect(formatOffset('2026-03-29T00:30:00Z')).to.equal('+01:00');
        expect(formatOffset('2026-03-29T01:30:00Z')).to.equal('+02:00');
        expect(formatOffset('2026-10-25T00:30:00Z')).to.equal('+02:00');
        expect(formatOffset('2026-10-25T01:30:00Z')).to.equal('+01:00');
    });

    it('constructs local period boundaries across daylight-saving changes', () => {
        expect(startOfDayAt('2026-03-29T00:30:00Z', 0, 3, 0).toISOString()).to.equal('2026-03-29T01:00:00.000Z');
        expect(startOfDayAt('2026-10-25T00:30:00Z', 0, 2, 30).toISOString()).to.equal('2026-10-25T00:30:00.000Z');
    });

    it('starts an hour in a timezone with a non-hour offset', () => {
        setDefaultTimeZone('Asia/Kathmandu');
        expect(startOfHour('2026-07-16T10:41:48Z').toISOString()).to.equal('2026-07-16T10:15:00.000Z');
    });

    it('rejects invalid timezone names', () => {
        expect(() => setDefaultTimeZone('Not/A_Timezone')).to.throw();
    });
});
