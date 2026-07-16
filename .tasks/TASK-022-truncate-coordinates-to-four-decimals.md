---
id: TASK-022
title: "coordinates are rounded rather than truncated"
status: open
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
