import {attemptTrackedFetch} from '../lib/tracked_fetch';

describe('tracked fetch', () => {
    it('counts every rejected transport attempt and permits later recovery', async () => {
        let failures = 0;
        let unavailable = false;
        const recordFailure = async () => {
            failures++;
            unavailable = failures >= 5;
        };

        for (let attempt = 0; attempt < 5; attempt++) {
            const result = await attemptTrackedFetch(
                async () => Promise.reject(new Error('network unavailable')),
                recordFailure,
            );
            expect(result.ok).to.equal(false);
        }

        expect(failures).to.equal(5);
        expect(unavailable).to.equal(true);

        const recovered = await attemptTrackedFetch(async () => 'weather data', recordFailure);
        expect(recovered).to.deep.equal({ok: true, value: 'weather data'});
        expect(failures).to.equal(5);
    });
});
