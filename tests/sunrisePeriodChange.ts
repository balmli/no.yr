import moment from '../lib/moment-timezone-with-data';
import {clearSunEventCapabilities, shouldRefreshSunEvents} from '../lib/sunrise';

describe('sunrise period changes', () => {
    const originalNow = (moment as any).now;

    beforeEach(() => {
        moment.tz.setDefault('Europe/Oslo');
        (moment as any).now = () => Date.parse('2026-07-16T08:00:00.000Z');
    });

    afterEach(() => {
        (moment as any).now = originalNow;
    });

    it('refreshes only when the selected sunrise request day or offset changes', () => {
        expect(shouldRefreshSunEvents('0', '1')).to.equal(false);
        expect(shouldRefreshSunEvents('0', '18')).to.equal(true);
        expect(shouldRefreshSunEvents('1:0', '1:6')).to.equal(false);
        expect(shouldRefreshSunEvents('0', '1:0')).to.equal(true);
    });

    it('invalidates both public sun event values before refreshing', async () => {
        const values: Record<string, unknown> = {
            sunrise_time: '16.07.2026 04:23',
            sunset_time: '16.07.2026 22:21',
        };
        await clearSunEventCapabilities({
            setCapabilityValue: async (capabilityId: string, value: null) => {
                values[capabilityId] = value;
            },
        });

        expect(values).to.deep.equal({sunrise_time: null, sunset_time: null});
    });
});
