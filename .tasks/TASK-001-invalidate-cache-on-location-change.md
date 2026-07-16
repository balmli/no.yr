---
id: TASK-001
title: "Location changes reuse cache validators and data from the old location"
status: done
priority: high
type: bug
source: BUG_REPORT.md
source_ref: "BUG-001"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-001"]
related: []
---

# Location changes reuse cache validators and data from the old location
**Severity:** High  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L89), [`drivers/myr/device.ts`](drivers/myr/device.ts#L200), [`drivers/myr/device.ts`](drivers/myr/device.ts#L311)

When latitude, longitude, or altitude changes, `onSettings()` schedules new fetches but does not invalidate `_weatherData`, `_weatherLastModified`, `_nowcastData`, `_nowcastLastModified`, or `_textualForecast`. The next requests therefore send validators obtained for a different request URL. If MET Norway returns `304`, the app explicitly keeps and uses the old cached data.

This can produce a mixed state in which weather/nowcast data belongs to the previous coordinates while sunrise and textual requests use the new coordinates. Moving from Norway or the Nordic coverage area can also leave the previous textual forecast or nowcast available because failed replacements do not clear those fields. The public API and Flow actions read these same cached fields.

**Recommended fix:** Invalidate request validators whenever any URL-affecting setting changes. Clear or mark location-bound data stale until the first successful fetch for the new coordinates. Include the request key (rounded latitude, longitude, and altitude) with each cached response and only accept `304` for the same key.

**Regression test:** Change coordinates after seeding all caches. Assert that the next weather and nowcast calls receive no old `If-Modified-Since` value, and that old nowcast/text forecast data cannot be returned for the new location.

## Resolution

- Added `invalidateLocationCaches()` and call it before scheduling location-driven weather and nowcast refreshes.
- The invalidation clears both cached datasets, both `Last-Modified` validators, both expiry values, and the textual forecast so no old-location data can be served or conditionally revalidated.
- Added `tests/locationCacheInvalidation.ts`. The focused test initially failed because the helper did not exist, then passed after the implementation.
- Verification: focused test `1 passing`; `npm run build` passed; Node.js 22 `npm test` passed with `42 passing`, and the post-test Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the complete task record supplied the reproduction and acceptance criteria.
