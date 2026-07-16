import {expect} from 'chai';

import {hasCapabilityValue} from '../lib/capability_value';

describe('capability value availability', () => {
    it('distinguishes missing values from measured zero', () => {
        expect(hasCapabilityValue(undefined)).to.equal(false);
        expect(hasCapabilityValue(0)).to.equal(true);
        expect(hasCapabilityValue(0.0)).to.equal(true);
        expect(hasCapabilityValue(null)).to.equal(true);
    });
});
