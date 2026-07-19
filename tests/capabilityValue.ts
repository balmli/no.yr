import {normalizeCapabilityValue} from '../lib/capability_value';

describe('capability value availability', () => {
    it('represents missing values as unavailable without changing measured zero', () => {
        expect(normalizeCapabilityValue(undefined)).to.equal(null);
        expect(normalizeCapabilityValue(0)).to.equal(0);
        expect(normalizeCapabilityValue(0.0)).to.equal(0.0);
        expect(normalizeCapabilityValue(null)).to.equal(null);
        expect(normalizeCapabilityValue(42)).to.equal(42);
    });
});
