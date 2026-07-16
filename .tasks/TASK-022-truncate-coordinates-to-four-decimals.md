---
id: TASK-022
title: "coordinates are rounded rather than truncated"
status: done
priority: low
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F8"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f8"]
related: []
---

# coordinates are rounded rather than truncated
**Severity:** Low


**Terms:** Latitude/longitude coordinates should be truncated to a maximum of four decimal places; new products reject requests with five or more decimals.

**Evidence:** `lib/math.ts:3` rounds to four decimals, and the rounded values are used before locationforecast, nowcast, sunrise, and textforecast calls (`drivers/myr/device.ts:195-198` and `drivers/myr/device.ts:306-309`).

**Impact:** Requests do contain no more than four decimal places, so they satisfy the precision limit and should avoid the documented 403 behavior. They do not follow the literal instruction to truncate, however, and rounding can select a nearby cache key rather than the truncation key expected by MET guidance.

**Recommendation:** Replace rounding with truncation toward zero to four decimal places and add tests for positive and negative coordinates.

## Resolution

- Replaced the ambiguous `round4()` helper with `truncate4()`, implemented using `Math.trunc(value × 10000) / 10000` so positive and negative coordinates truncate toward zero.
- Updated every MET request and nowcast location-key calculation in the device and REST API to use the same truncation rule, preserving cache-key/request consistency.
- Added `tests/truncateCoordinates.ts`. The focused test first failed because `truncate4()` was absent, then passed with `1 passing` for positive, negative, and already-four-decimal coordinates.
- Repository search confirms no production `round4` reference remains.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `80 passing`, and the Homey publish validation passed.
- The cited local `MET_API_TERMS_REVIEW.md` was unavailable in this checkout; the task record supplied the compliance evidence.
