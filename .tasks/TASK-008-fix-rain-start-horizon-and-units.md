---
id: TASK-008
title: "“Starts raining in” exceeds its documented horizon and mixes units"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-008"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-008"]
related: []
---

# “Starts raining in” exceeds its documented horizon and mixes units
**Severity:** Medium  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L517), [`.homeycompose/capabilities/measure_minutes_raining.json`](.homeycompose/capabilities/measure_minutes_raining.json#L11)

The capability description says it assesses only the first 90 minutes. When no rain is found in nowcast, however, the code searches the entire standard forecast timeseries and can return a value many hours or days ahead. The same threshold configured in `mm/h` is compared directly with `next_6_hours.precipitation_amount`, which is an accumulated amount in `mm`, so the comparison is dimensionally incorrect.

**Recommended fix:** Enforce the documented 90-minute cutoff. Compare rate with rate, or derive a clearly documented amount threshold for hourly/six-hour data. Use a defined no-rain state rather than the magic numeric value `99999` if Homey capabilities allow it.

## Resolution

- Added `minutesUntilRain()` to evaluate only nowcast `precipitation_rate` values in mm/h, using an inclusive 90-minute horizon.
- Removed the fallback that compared the mm/h user threshold with accumulated one-hour/six-hour precipitation amounts and could select rain days in the future.
- Replaced the magic `99999` no-rain value with `null`, which Homey's capability API accepts as an unavailable numeric measurement.
- Added `tests/minutesUntilRain.ts`. The focused test initially failed because the helper was absent, then passed with `3 passing` for the boundary, current rain, and no-rain state.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `59 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the actionable evidence.
