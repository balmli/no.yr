---
id: TASK-033
title: "Clear location-derived capability values when coordinates change"
status: done
priority: high
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-001"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, location, stale-data]
related: [TASK-001]
blocked_by: []
---

# Clear location-derived capability values when coordinates change

## Context

`onSettings()` correctly calls `invalidateLocationCaches()` when latitude, longitude, or altitude changes, but that helper clears only internal response/cache fields. The capability values already stored by Homey remain unchanged until a successful fetch and device update replaces them.

## Evidence

- `drivers/myr/device.ts:106-110` invalidates internal caches and schedules forced refreshes, but does not clear standard weather, sunrise/sunset, or dynamic nowcast capability state.
- `lib/location_cache.ts:13-22` clears `_weatherData`, `_nowcastData`, validators, expiry metadata, and textual data only.
- `api.ts:19-40` reads every retained capability into the current-weather response even when `_weatherData` has just been invalidated.
- The response location is read from the new settings (`api.ts:23-27`), so old measurements can be returned as though they belong to the new coordinates.
- Simple Flow conditions in `app.ts` also continue reading the retained values during this interval.

This is a remaining state-surface issue related to TASK-001: request caches no longer cross locations, but Homey's persisted capability state still can.

## Impact

Immediately after a location change—and indefinitely if the replacement fetch keeps failing—the device UI, REST current-weather endpoint, and capability-based Flows can expose readings from the old location under the new location metadata. That can produce incorrect automation decisions rather than an explicit unavailable-data result.

## Recommended fix

Invalidate all location-derived public state together with the internal caches. Set fixed weather/sun capabilities to Homey's unknown value, remove or clear dynamic nowcast capabilities consistently, and prevent `getWeather()` from presenting retained values as current data while no location-matched `_weatherData` exists.

## Testing strategy

1. Seed internal caches and representative standard, sunrise/sunset, and nowcast capability values for location A.
2. Simulate a change to location B.
3. Assert that no location-A capability value is readable through the current-weather API or capability-based condition path before the location-B fetch succeeds.
4. Assert that a failed replacement fetch does not restore or continue serving the old values.
5. Assert that a successful location-B refresh repopulates the capabilities normally.

## Acceptance criteria

- Location changes atomically invalidate both internal caches and externally visible location-derived values.
- The REST current-weather response cannot pair new coordinates with old capability values.
- Dynamic nowcast capabilities are cleared/removed consistently with their cached data.
- A successful replacement fetch restores all supported values without requiring device recreation.
- Focused regression tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Added `clearLocationCapabilityValues()` and invoke it whenever latitude, longitude, or altitude changes, before scheduling replacement fetches. Every remaining exposed capability is set to Homey's explicit unknown value.
- Remove both dynamic nowcast capabilities after clearing their values, keeping their public state aligned with the already-invalidated nowcast cache.
- Changed the current-weather API to reject with `No weather data available` while no location-matched weather response is active, preventing retained values from being paired with new coordinates.
- Added `tests/currentWeatherApi.ts` and expanded `tests/locationCacheInvalidation.ts`. The focused test first failed because `clearLocationCapabilityValues()` did not exist, then passed with `3 passing` after implementation.
- Verification under Node.js 22.14.0: focused tests `3 passing`; `npm run build` passed; `npm run lint` passed; `npm test` passed with `83 passing`; the post-test Homey publish validation passed.
