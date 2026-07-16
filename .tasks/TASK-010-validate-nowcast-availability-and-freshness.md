---
id: TASK-010
title: "Nowcast can be reported as available when coverage is unavailable or stale"
status: open
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-010"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-010"]
related: [TASK-021]
---

# Nowcast can be reported as available when coverage is unavailable or stale
**Severity:** Medium  
**Affected code:** [`api.ts`](api.ts#L119), [`drivers/myr/device.ts`](drivers/myr/device.ts#L527), [`drivers/myr/device.ts`](drivers/myr/device.ts#L655)

The public API sets `nowcast.available = true` based only on the existence of `_nowcastData.properties.timeseries`. It does not inspect `meta.radar_coverage`, the age of the data, or whether the data belongs to the current location. The nowcast Flow action similarly returns `_nowcastData` without those checks. Because failed updates do not consistently clear the cache, consumers can receive stale data while availability is reported as true.

The API’s `precipitationAmount` is also read from `next_1_hours`, while the app’s own 5-minute nowcast calculation derives an amount from `precipitation_rate`; the field will commonly be absent rather than representing the interval amount.

**Recommended fix:** Centralize a nowcast-validity check covering location key, radar coverage, expected age, and timeseries presence. Derive interval precipitation consistently from rate and duration, or label the field as unavailable.
