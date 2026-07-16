---
id: TASK-036
title: "Refresh sunrise and sunset when the forecast day changes"
status: done
priority: medium
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-004"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, sunrise, settings]
related: [TASK-034]
blocked_by: []
---

# Refresh sunrise and sunset when the forecast day changes

## Context

The `period` setting controls which forecast date/time the device displays and is also passed to `fetchSunrise()`. Changing that setting updates weather capabilities almost immediately, but does not refresh the date-bound sunrise/sunset data.

## Evidence

- `drivers/myr/device.ts:111-114` handles a `period` change by scheduling only `updateDevice()` and `updateDeviceNowcast()`.
- Sunrise data is fetched only inside `doFetchWeather()` (`drivers/myr/device.ts:259-278`).
- `fetchSunrise()` derives its request date from the selected period (`lib/yr_lib.ts:376-390`).
- A normal weather fetch may be scheduled nearly an hour later (`drivers/myr/device.ts:183-199`).

For example, changing from `Now` to `+4 days, 12:00 UTC` updates the main forecast after one second while sunrise and sunset can still describe today's date until the next network refresh.

## Impact

The device can display a mixed forecast: temperature/weather for the newly selected day and sunrise/sunset for the previously selected day. The mismatch is especially misleading for multi-day selections and high-latitude locations.

## Recommended fix

Treat changes that alter the selected calendar date as invalidating the active sunrise/sunset result. Fetch or resolve the new date-keyed cached sunrise resource immediately, while avoiding unnecessary network traffic when two period values still map to the same date.

## Testing strategy

Use a fixed clock and a mocked/cached sunrise fetch. Change periods across a day boundary and assert that the public capabilities do not retain the old date while the new main forecast is visible. Also verify that same-day hour changes reuse the appropriate cached event data.

## Acceptance criteria

- A period change across a calendar date refreshes or invalidates sunrise/sunset before exposing a mixed-date device state.
- Same-date period changes do not cause avoidable duplicate MET requests.
- Cache expiry and shared resource-cache behavior remain intact.
- Focused regression tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Added a sunrise request identity based on the exact date and UTC offset used by the MET sunrise URL, plus `shouldRefreshSunEvents()` for period-setting comparisons.
- Period changes that select a different sunrise request identity now clear both public sun capabilities and schedule an immediate forced refresh. The existing URI-keyed `HttpResourceCache` remains responsible for reuse, expiry, and revalidation.
- Same-date/same-offset period changes keep the existing sunrise values and only schedule the normal capability update, avoiding an unnecessary fetch path.
- Added `clearSunEventCapabilities()` so cross-day changes cannot briefly expose new forecast measurements beside old-day sunrise/sunset strings.
- Added `tests/sunrisePeriodChange.ts`. The focused test first failed because the comparison and invalidation helpers did not exist, then the relevant sunrise/cache suites passed with `8 passing`.
- Verification under Node.js 22.14.0: focused/relevant tests `8 passing`; `npm run build` passed; `npm run lint` passed; `npm test` passed with `90 passing`; the post-test Homey publish validation passed.
