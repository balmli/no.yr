import {getSourceTiming} from '../lib/api_metadata';

describe('API source timing metadata', () => {
    it('distinguishes MET update time from app retrieval time', () => {
        const timing = getSourceTiming(
            {
                properties: {meta: {updated_at: '2026-07-16T09:55:00Z'}},
            } as any,
            '2026-07-16T10:00:01.000Z',
        );

        expect(timing).to.deep.equal({
            sourceUpdatedAt: '2026-07-16T09:55:00Z',
            retrievedAt: '2026-07-16T10:00:01.000Z',
        });
    });
});
