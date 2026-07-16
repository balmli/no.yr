---
id: TASK-007
title: "`Expires` is ignored and auxiliary endpoints are fetched every hour"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-007"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-007"]
related: [TASK-017]
---

# `Expires` is ignored and auxiliary endpoints are fetched every hour
**Severity:** Medium  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L170), [`drivers/myr/device.ts`](drivers/myr/device.ts#L232), [`lib/yr_lib.ts`](lib/yr_lib.ts#L409)

The app stores `_weatherExpires` and `_nowcastExpires`, but never reads either value when scheduling the next request. Sunrise and textual forecast requests also run after every hourly location-forecast cycle whenever any `_weatherData` cache exists. `fetchTextforecast()` downloads the areas document each time and, for supported locations, then downloads the land overview.

This creates avoidable traffic and makes the implementation less responsive to MET Norway’s cache instructions. It also means a failed main refresh can still trigger auxiliary calls because old `_weatherData` remains truthy.

**Recommended fix:** Schedule no earlier than the response’s `Expires` value, with a safe fallback if the header is missing or invalid. Cache sunrise by location/date and cache textual areas/forecast using their validators and expiry; consider sharing location-independent textual documents across devices.

**Regression test:** Supply future `Expires` headers and assert that no request is scheduled before them. Assert that repeated hourly weather refreshes do not redownload unchanged sunrise/text documents.

## Resolution

- Added `honorCacheExpiry()` and applied it to location-forecast and nowcast scheduling. Valid future `Expires` values now set the earliest next request time; missing, invalid, and past values retain the normal synchronized schedule.
- Auxiliary sunrise and textual forecast calls now run only after a fresh main forecast response, never after a failed request or HTTP 304 that merely retained old weather data.
- Added location/day cache keys so repeated fresh hourly responses do not redownload the same sunrise or textual forecast documents. Keys are cleared together with other location-bound caches when settings change; failed auxiliary calls remain retryable.
- Added `tests/cacheSchedule.ts` and expanded location-cache coverage. The focused test first failed because the scheduling helper did not exist, then passed with `4 passing` across expiry, fallback, daily reuse, and location invalidation behavior.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `56 passing`, and the Homey publish validation passed.
- TASK-017 remains separately scoped for full validator persistence, 304 header preservation, app-wide text cache sharing, and in-flight deduplication.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the actionable evidence.
