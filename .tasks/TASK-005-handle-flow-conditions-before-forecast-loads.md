---
id: TASK-005
title: "Forecast Flow cards throw before weather data is loaded"
status: open
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
