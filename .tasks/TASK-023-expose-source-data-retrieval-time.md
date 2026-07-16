---
id: TASK-023
title: "data retrieval time is not clearly exposed"
status: open
priority: low
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F9"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f9"]
related: []
---

# data retrieval time is not clearly exposed
**Severity:** Low/advisory


**Terms:** MET says it is desirable to tell users when data was retrieved so they can judge whether it is outdated.

**Evidence:**

- The device exposes `forecast_time`, which is the forecast validity time (`drivers/myr/device.ts:467-470`), not retrieval time.
- REST responses use `new Date()` as `timestamp` (`api.ts:21` and `api.ts:79`), which is response-generation time rather than MET retrieval time.
- MET's `properties.meta.updated_at` is logged but not exposed to REST consumers (`lib/yr_lib.ts:263-268` and `lib/yr_lib.ts:388-393`).

**Impact:** Users and API consumers cannot reliably distinguish fresh, cached, and stale source data.

**Recommendation:** Store and expose `retrievedAt`, MET's `updated_at`, and, when useful, `expiresAt`. Keep response-generation time as a separately named field.
