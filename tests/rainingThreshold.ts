
import {getRainingThreshold} from '../lib/nowcast';

describe('raining threshold', () => {
    it('preserves zero and positive configured values', () => {
        expect(getRainingThreshold(0)).to.equal(0);
        expect(getRainingThreshold(0.25)).to.equal(0.25);
    });

    it('uses the default only when the setting is absent', () => {
        expect(getRainingThreshold(undefined)).to.equal(0.1);
        expect(getRainingThreshold(null)).to.equal(0.1);
    });
});
