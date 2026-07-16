---
id: TASK-006
title: "A malformed `200` response can be mistaken for `304 Not Modified`"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-006"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-006"]
related: []
---

# A malformed `200` response can be mistaken for `304 Not Modified`
**Severity:** Medium  
**Affected code:** [`lib/yr_lib.ts`](lib/yr_lib.ts#L237), [`lib/yr_lib.ts`](lib/yr_lib.ts#L257), [`drivers/myr/device.ts`](drivers/myr/device.ts#L208)

`doFetch()` has an explicit `notModified` field, but `WeatherResult` drops it. `fetchWeather()` and `fetchNowcast()` encode a `304` indirectly as `data: null` plus `lastModified`. A malformed successful response also produces `data: null` through `parseResult()`, while retaining the response’s `Last-Modified` header. Device code interprets any null data with `lastModified` as `304`, marks the device available, resets failures, and keeps stale cached data.

**Recommended fix:** Preserve `notModified` as a required discriminant in the returned result. Treat parse failure as an error regardless of cache headers.

**Regression test:** Return invalid JSON with HTTP `200` and a `Last-Modified` header. Assert that it is counted as a failure and never logged/handled as `304`.

## Resolution

- Made `notModified` required on both raw fetch and parsed weather results and preserved it through location-forecast and nowcast fetching.
- Added `toWeatherResult()` as the single conversion point. Only an explicit HTTP 304 result sets `notModified: true`; malformed HTTP 200 data remains `data: null, notModified: false` even when `Last-Modified` is present.
- Updated device handling to branch on `notModified` instead of inferring 304 from a validator. Malformed responses therefore follow the existing failure path and increment device failures.
- Added `tests/weatherFetchResult.ts`. The focused test initially failed because the conversion helper did not exist, then passed with `2 passing` for malformed 200 and explicit 304 cases.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `53 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the reproduction.
