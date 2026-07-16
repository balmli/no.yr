---
id: TASK-017
title: "cache expiry is not respected and several endpoints are never cached"
status: done
priority: high
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F3"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f3"]
related: [TASK-007]
---

# cache expiry is not respected and several endpoints are never cached
**Severity:** High


**Terms:** Do not repeat requests before `Expires`; cache responses locally; use `If-Modified-Since` when `Last-Modified` exists; avoid requests for data that has not changed.

**Evidence:**

- `doFetch()` extracts `Last-Modified` and `Expires` (`lib/yr_lib.ts:221-228`).
- Locationforecast and nowcast pass their previous `Last-Modified` values (`drivers/myr/device.ts:200-206` and `drivers/myr/device.ts:311-317`). This is a positive control.
- `_weatherExpires` and `_nowcastExpires` are assigned (`drivers/myr/device.ts:211-212` and `drivers/myr/device.ts:322-323`) but are never consulted when scheduling. Locationforecast always uses the hourly schedule and nowcast always uses a five-minute schedule (`drivers/myr/device.ts:170-185` and `drivers/myr/device.ts:281-295`).
- A 304 response discards any new response cache headers and returns only the old `Last-Modified` (`lib/yr_lib.ts:187-190`, `lib/yr_lib.ts:257-261`, and `lib/yr_lib.ts:382-386`).
- Sunrise is fetched after every hourly locationforecast cycle without `If-Modified-Since`, even though its request is for one date (`drivers/myr/device.ts:232-242`; `lib/yr_lib.ts:326-340`).
- Textforecast `/areas` and `/landoverview` are also fetched after every hourly cycle without validators (`drivers/myr/device.ts:252-258`; `lib/yr_lib.ts:409-432`). `/areas` is common data that is redundantly downloaded once per device.
- Cache data and validators live only in memory and are reset on every device initialization (`drivers/myr/device.ts:17-26,39-41`).

**Impact:** The implementation can request resources before MET says they expire. It repeatedly downloads daily or shared resources and loses all cache state on restart. For a Norwegian nowcast device, the steady-state maximum is approximately 16 MET requests/hour (12 nowcast, 1 locationforecast, 1 sunrise, and 2 textforecast), before conditional 304 responses; three of the four hourly endpoint requests have no validation at all.

**Recommendation:**

1. Make `Expires` the earliest allowed next-fetch time, with randomized delay after expiry.
2. Preserve cache headers returned with 304 responses.
3. Cache sunrise by rounded coordinates, date, and offset until its expiry (or at least for the requested date), using validators when supplied.
4. Cache textforecast areas and landoverview at app scope, not device scope, and respect their cache headers.
5. Persist response data and cache metadata across restarts where practical.
6. Deduplicate in-flight requests for identical rounded coordinates.

## Resolution

- Added an app-wide `HttpResourceCache` keyed by exact request URI and routed locationforecast, nowcast, sunrise, textforecast areas, and landoverview through it.
- Unexpired responses are reused without a network request. Expired entries revalidate with their cached `Last-Modified`; HTTP 304 merges refreshed `Last-Modified`/`Expires` headers while retaining the cached body.
- Sunrise cache identity naturally includes rounded coordinates, date, and UTC offset in its URI. Textforecast `/areas` and `/landoverview` are shared across every device instead of downloaded per device.
- Identical concurrent requests share one in-flight promise, covering same-coordinate weather/nowcast calls and location-independent textual documents.
- Device scheduling continues to use TASK-007's future-`Expires` guard and now also retains cache headers received with 304 responses. The earlier daily-only auxiliary guard was replaced by the stronger response-header cache.
- Added `tests/httpResourceCache.ts`. The focused test first failed because the cache module was absent, then passed with `2 passing` for expiry/revalidation/304 metadata and concurrent deduplication. Existing scheduling and malformed/304 tests passed alongside it (`6 passing`).
- Verification on Node.js 22: `npx tsc -p tsconfig.test.json` passed; `npm run build` passed; `npm test` passed with `74 passing`, and the Homey publish validation passed.
- Large response bodies are intentionally not copied into Homey's persistent device store: validators without their matching body are unsafe, while persisting ten-day forecasts per device would create significant storage/write amplification. The cache persists for the app process lifetime and is rebuilt safely after restart.
- The cited local `MET_API_TERMS_REVIEW.md` was unavailable in this checkout; the task record supplied the compliance evidence.
