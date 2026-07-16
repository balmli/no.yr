import {expect} from 'chai';

import {MET_ATTRIBUTION} from '../lib/attribution';

describe('MET attribution metadata', () => {
    it('includes source, license, source URL, and transformation context', () => {
        expect(MET_ATTRIBUTION.source).to.equal('MET Norway');
        expect(MET_ATTRIBUTION.license).to.equal('CC BY 4.0');
        expect(MET_ATTRIBUTION.licenseUrl).to.equal('https://creativecommons.org/licenses/by/4.0/');
        expect(MET_ATTRIBUTION.sourceUrl).to.equal('https://api.met.no/weatherapi/');
        expect(MET_ATTRIBUTION.modified).to.include('transformed');
    });
});
