import {applyFetchAvailability} from '../lib/fetch_availability';

describe('weather fetch availability', () => {
    it('ignores throttling, counts failures, and clears failures on success', async () => {
        let failures = 4;
        let unavailable = false;
        const recordSuccess = async () => {
            failures = 0;
            unavailable = false;
        };
        const recordFailure = async () => {
            failures++;
            unavailable = failures >= 5;
        };

        await applyFetchAvailability({data: null, notModified: false, throttled: true}, recordSuccess, recordFailure);
        expect(failures).to.equal(4);
        expect(unavailable).to.equal(false);

        await applyFetchAvailability({data: null, notModified: false, throttled: false}, recordSuccess, recordFailure);
        expect(failures).to.equal(5);
        expect(unavailable).to.equal(true);

        await applyFetchAvailability(
            {data: {properties: {}}, notModified: false, throttled: false},
            recordSuccess,
            recordFailure,
        );
        expect(failures).to.equal(0);
        expect(unavailable).to.equal(false);
    });
});
