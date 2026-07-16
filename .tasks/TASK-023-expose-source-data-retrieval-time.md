---
id: TASK-023
title: "data retrieval time is not clearly exposed"
status: done
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

## Resolution

- Added `retrievedAt` to successful raw fetch/cache metadata and retained the original body-retrieval time through cache reuse and HTTP 304 revalidation.
- Stored the active forecast retrieval time on the device and cleared it with all other location-bound cache state.
- Added `getSourceTiming()` and exposed `sourceUpdatedAt` (MET `meta.updated_at`), `retrievedAt`, and `expiresAt` in current-weather and forecast REST responses.
- Added an explicit `generatedAt` response timestamp while retaining the legacy `timestamp` alias for API compatibility.
- Added `tests/sourceTiming.ts` and updated cache/result tests. The focused test first failed because the metadata helper was absent, then the relevant suite passed with `5 passing`.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `81 passing`, and the Homey publish validation passed.
- The cited local `MET_API_TERMS_REVIEW.md` was unavailable in this checkout; the task record supplied the compliance evidence.
