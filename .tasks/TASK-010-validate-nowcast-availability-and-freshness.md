---
id: TASK-010
title: "Nowcast can be reported as available when coverage is unavailable or stale"
status: done
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

## Resolution

- Added a centralized `isNowcastValid()` check requiring a matching rounded-coordinate cache key, `radar_coverage: ok`, source metadata no more than 15 minutes old, and at least one current/usable timeseries entry.
- Stored the location key with successful nowcast responses and cleared it with all other location-bound or invalid nowcast state.
- Applied the shared validity check to device updates, the nowcast Flow action, and REST availability reporting so stale, moved, or unsupported data is no longer exposed.
- Added `mapNowcastEntry()` to derive each five-minute precipitation amount from `precipitation_rate × 5/60`, rounded consistently with the device calculation.
- Added `tests/nowcastValidity.ts`. The focused suite first failed because the helpers were absent, then passed with `5 passing` alongside polling tests; it covers location mismatch, coverage, freshness, empty data, and interval amount.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `63 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the actionable evidence. Related TASK-021 is not present in this backlog.
