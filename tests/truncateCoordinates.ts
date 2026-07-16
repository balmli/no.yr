import {expect} from 'chai';

import {truncate4} from '../lib/math';

describe('coordinate truncation', () => {
    it('truncates positive and negative coordinates toward zero', () => {
        expect(truncate4(59.12349)).to.equal(59.1234);
        expect(truncate4(-59.12349)).to.equal(-59.1234);
        expect(truncate4(10.7522)).to.equal(10.7522);
    });
});
