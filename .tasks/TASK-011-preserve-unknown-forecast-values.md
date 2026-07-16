---
id: TASK-011
title: "Missing forecast values are written as real numeric zeroes"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-011"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-011"]
related: []
---

# Missing forecast values are written as real numeric zeroes
**Severity:** Medium  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L480), [`drivers/myr/device.ts`](drivers/myr/device.ts#L589)

`updateCapability()` converts every `undefined` value to `0`. Optional API fields and unavailable forecast periods therefore become actual measurements such as 0 mm rain, 0% probability, 0 m/s gust, 0 UV, or 0 °C min/max. This changes “not supplied” into “measured zero” and can incorrectly trigger Flow conditions.

**Recommended fix:** Do not overwrite a capability when its source value is absent, or represent unknown/unavailable using the Homey-supported mechanism. Capability presence and data freshness should be handled separately from numeric values.

## Resolution

- Changed capability updates to skip `undefined` source values instead of coercing them to numeric zero. Existing values remain untouched until MET supplies a measurement.
- Preserved genuine `0` values as valid measurements and retained explicit `null` as Homey's supported unavailable-value signal.
- Added `tests/capabilityValue.ts`. The focused test first failed because the availability helper was absent, then passed with `1 passing` and distinguishes missing data from measured zero.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `64 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the actionable evidence.
