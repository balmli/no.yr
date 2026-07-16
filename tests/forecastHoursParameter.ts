import {parseForecastHours} from '../lib/api_query';

describe('forecast hours query parameter', () => {
    it('accepts canonical integer boundaries and the omitted default', () => {
        expect(parseForecastHours(undefined)).to.equal(24);
        expect(parseForecastHours('1')).to.equal(1);
        expect(parseForecastHours('240')).to.equal(240);
    });

    it('rejects values outside the documented range', () => {
        for (const value of ['0', '241', '999']) {
            expect(() => parseForecastHours(value)).to.throw('Invalid hours parameter');
        }
    });

    it('rejects malformed or non-canonical numeric strings', () => {
        for (const value of ['', '2.5', '24hours', '1e2', '+2', '-2', ' 2 ', '02']) {
            expect(() => parseForecastHours(value)).to.throw('Invalid hours parameter');
        }
    });
});
