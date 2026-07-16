---
id: TASK-031
title: "Replace http.min with the native Node.js fetch API"
status: open
priority: high
type: compliance
source: user-request
source_ref: "2026-07-16: migrate HTTP fetching to Node.js 22 fetch"
created: 2026-07-16
updated: 2026-07-16
labels: [http, nodejs-22, fetch, dependencies, met-api]
related: [TASK-006, TASK-015, TASK-018, TASK-019]
blocked_by: []
---

# Replace http.min with the native Node.js fetch API

## Context

The project pins Node.js 22 in `.nvmrc`. Node.js 22 provides a stable, browser-compatible global `fetch()` implementation backed by Undici. The current `http.min` 2.1.0 client does not follow redirects or decompress gzip/deflate responses, which conflicts with MET Weather API transport requirements.

This task is the concrete client-migration work related to `TASK-015`. Keep structured response-state redesign and application-wide rate limiting within their related task boundaries unless a minimal interface adjustment is required for this migration.

## Requirements

- Replace the `http.min` usage in `lib/yr_lib.ts` with the Node.js global `fetch()` API.
- Remove `http.min` from `package.json` and `package-lock.json`.
- Preserve the versioned application `User-Agent`, contact URL, `If-Modified-Since`, and cache-header extraction.
- Preserve explicit handling for HTTP 200, 203, 304, 422, and 429 responses without treating non-success statuses as successful payloads.
- Follow redirects safely and accept transparently decompressed gzip/deflate responses through the native client.
- Add a bounded request timeout using an API supported by Node.js 22.
- Keep response parsing compatible with both JSON and XML MET endpoints.
- Preserve useful endpoint/status logging without logging response bodies or sensitive coordinates unnecessarily.

## TDD plan

1. Add focused tests around a local HTTP server that initially fail with the current client behavior.
2. Cover a redirect chain and verify the final response is returned.
3. Cover gzip and deflate encoded responses and verify the decoded body is parsed.
4. Cover request headers, including `User-Agent` and `If-Modified-Since`.
5. Cover 200, 203, 304, 422, 429, malformed payload, timeout, and transport-failure behavior.
6. Implement the native-fetch migration, make the focused tests pass, then run the broader suite.

## Acceptance criteria

- No production or lockfile reference to `http.min` remains.
- All MET endpoints use the shared native-fetch implementation.
- Redirected, gzip-compressed, and deflate-compressed test responses succeed.
- Conditional request and cache response headers remain intact.
- Timeout and HTTP error behavior is deterministic and covered by tests.
- The focused tests, `npm test`, and `npm run build` pass on Node.js 22.
- The completed work is delivered as one atomic commit whose message starts with `TASK-031`.
