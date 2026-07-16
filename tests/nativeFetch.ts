import {expect} from 'chai';
import {createServer, Server} from 'http';
import {deflateSync, gzipSync} from 'zlib';

import {doFetch} from '../lib/yr_lib';
import {RateLimitBackoff} from '../lib/rate_limit';

const logger: any = {debug() {}, info() {}, warn() {}, error() {}};

describe('native MET fetch transport', () => {
    let server: Server;
    let origin: string;
    let receivedHeaders: any;
    let requestCount = 0;

    before(done => {
        server = createServer((request, response) => {
            requestCount++;
            receivedHeaders = request.headers;
            if (request.url === '/redirect') {
                response.writeHead(302, {location: '/gzip'}).end();
            } else if (request.url === '/gzip') {
                response.writeHead(200, {
                    'content-encoding': 'gzip',
                    'content-type': 'application/json',
                    'last-modified': 'Thu, 16 Jul 2026 10:00:00 GMT',
                    expires: 'Thu, 16 Jul 2026 11:00:00 GMT',
                }).end(gzipSync('{"ok":true}'));
            } else if (request.url === '/deflate') {
                response.writeHead(200, {'content-encoding': 'deflate'}).end(deflateSync('<weather>ok</weather>'));
            } else if (request.url === '/slow') {
                setTimeout(() => response.writeHead(200).end('{}'), 100);
            } else {
                const status = Number(request.url?.slice(1)) || 500;
                response.writeHead(status).end(status === 203 ? '{"deprecated":true}' : '');
            }
        }).listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (address && typeof address !== 'string') origin = `http://127.0.0.1:${address.port}`;
            done();
        });
    });

    after(done => {
        (server as any).closeAllConnections();
        server.close(done);
    });

    it('follows redirects, decompresses gzip, and preserves headers', async () => {
        const result = await doFetch(`${origin}/redirect`, '1.2.3', logger, 'cached-validator', 500);
        expect(result).to.deep.include({data: '{"ok":true}', notModified: false});
        expect(result?.lastModified).to.equal('Thu, 16 Jul 2026 10:00:00 GMT');
        expect(result?.expires).to.equal('Thu, 16 Jul 2026 11:00:00 GMT');
        expect(receivedHeaders['user-agent']).to.equal('WeatherForecastHomeyApp/1.2.3 github.com/balmli/weather.forecast');
        expect(receivedHeaders['if-modified-since']).to.equal('cached-validator');
        expect(receivedHeaders['accept-encoding']).to.include('gzip');
        expect(receivedHeaders['accept-encoding']).to.include('deflate');
    });

    it('decompresses deflate while preserving XML text', async () => {
        expect((await doFetch(`${origin}/deflate`, '1', logger, undefined, 500))?.data).to.equal('<weather>ok</weather>');
    });

    it('preserves explicit status handling', async () => {
        expect((await doFetch(`${origin}/203`, '1', logger, undefined, 500))?.data).to.equal('{"deprecated":true}');
        expect(await doFetch(`${origin}/304`, '1', logger, undefined, 500)).to.deep.include({notModified: true});
        expect(await doFetch(`${origin}/422`, '1', logger, undefined, 500)).to.equal(null);
        expect(await doFetch(`${origin}/429`, '1', logger, undefined, 500, new RateLimitBackoff())).to.equal(null);
        expect(await doFetch(`${origin}/500`, '1', logger, undefined, 500)).to.equal(null);
    });

    it('applies a bounded timeout', async () => {
        let error: any;
        try {
            await doFetch(`${origin}/slow`, '1', logger, undefined, 20);
        } catch (caught) {
            error = caught;
        }
        expect(error).to.be.instanceOf(Error);
    });

    it('suppresses all subsequent requests immediately after a 429', async () => {
        const limiter = new RateLimitBackoff();
        const before = requestCount;
        expect(await doFetch(`${origin}/429`, '1', logger, undefined, 500, limiter)).to.equal(null);
        expect(await doFetch(`${origin}/200`, '1', logger, undefined, 500, limiter)).to.equal(null);
        expect(requestCount).to.equal(before + 1);
    });

    it('rejects deterministic transport failures', async () => {
        let error: any;
        try {
            await doFetch('http://127.0.0.1:1/unreachable', '1', logger, undefined, 100);
        } catch (caught) {
            error = caught;
        }
        expect(error).to.be.instanceOf(Error);
    });
});
