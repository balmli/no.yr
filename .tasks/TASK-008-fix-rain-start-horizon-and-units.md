---
id: TASK-008
title: "“Starts raining in” exceeds its documented horizon and mixes units"
status: open
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
