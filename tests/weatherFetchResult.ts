
import {toWeatherResult} from '../lib/yr_lib';

const logger: any = {
    debug() {},
    info() {},
    error() {},
};

describe('weather fetch result', () => {
    it('does not classify malformed HTTP 200 data as not modified', () => {
        const result = toWeatherResult({
            data: '{invalid json',
            lastModified: 'Thu, 16 Jul 2026 10:00:00 GMT',
            expires: 'Thu, 16 Jul 2026 11:00:00 GMT',
            notModified: false,
        }, undefined, logger);

        expect(result.data).to.equal(null);
        expect(result.notModified).to.equal(false);
        expect(result.lastModified).to.equal('Thu, 16 Jul 2026 10:00:00 GMT');
    });

    it('preserves an explicit HTTP 304 result', () => {
        const result = toWeatherResult({
            data: null,
            notModified: true,
        }, 'cached-validator', logger);

        expect(result).to.deep.equal({
            data: null,
            lastModified: 'cached-validator',
            expires: undefined,
            retrievedAt: undefined,
            notModified: true,
            throttled: false,
        });
    });

    it('preserves an explicit throttled result', () => {
        const result = toWeatherResult({
            data: null,
            notModified: false,
            throttled: true,
        }, undefined, logger);

        expect(result).to.deep.equal({
            data: null,
            lastModified: undefined,
            expires: undefined,
            retrievedAt: undefined,
            notModified: false,
            throttled: true,
        });
    });
});
