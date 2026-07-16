---
id: TASK-005
title: "Forecast Flow cards throw before weather data is loaded"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-005"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-005"]
related: []
---

# Forecast Flow cards throw before weather data is loaded
**Severity:** Medium  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L620), [`lib/yr_lib.ts`](lib/yr_lib.ts#L62)

The device wrappers cast optional `_weatherData?.properties.timeseries` to `YrTimeseries`, even when it is `undefined`. The helpers immediately call `.filter()` or `.map()`. Homey can evaluate a Flow condition before the initial fetch completes, or while no forecast is available, causing the condition listener to reject instead of returning a safe result.

**Observed reproduction:** Calling `nextHoursComparer(..., undefined, ...)` throws `Cannot read properties of undefined (reading 'filter')`.

**Recommended fix:** Treat absent/empty forecast data explicitly. Return `false` for comparer conditions and define the intended result for sum conditions. Add startup/no-data tests for every helper family.

## Resolution

- Updated the shared comparer and sum implementations to return `false` when forecast timeseries are absent or empty. This gives every forecast Flow condition family a consistent safe startup result and avoids invoking condition callbacks with fabricated data.
- Updated helper types to explicitly accept an unavailable timeseries.
- Added `tests/noForecastFlowConditions.ts`. Before the fix, the focused suite produced two `TypeError`s for absent data and an incorrect `true` for an empty sum; afterward all `3` tests passed.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `51 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the reproduction.
