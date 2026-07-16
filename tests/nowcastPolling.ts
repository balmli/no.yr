
import {NOWCAST_CAPABILITIES, shouldContinueNowcastPolling} from '../lib/nowcast';
import {RadarCoverage} from '../lib/types';

const nowcastWithCoverage = (radarCoverage: RadarCoverage): any => ({
    properties: {
        meta: {radar_coverage: radarCoverage},
        timeseries: [],
    },
});

describe('nowcast polling', () => {
    it('continues after transient and malformed fetch outcomes', () => {
        expect(shouldContinueNowcastPolling(null)).to.equal(true);
        expect(shouldContinueNowcastPolling(nowcastWithCoverage(RadarCoverage.temporarily_unavailable))).to.equal(true);
    });

    it('stops only for confirmed permanent lack of radar coverage', () => {
        expect(shouldContinueNowcastPolling(nowcastWithCoverage(RadarCoverage.no_coverage))).to.equal(false);
        expect(shouldContinueNowcastPolling(nowcastWithCoverage(RadarCoverage.ok))).to.equal(true);
    });

    it('manages both nowcast capabilities together', () => {
        expect(NOWCAST_CAPABILITIES).to.deep.equal([
            'measure_minutes_raining',
            'measure_rain.next_30_minutes',
        ]);
    });
});
