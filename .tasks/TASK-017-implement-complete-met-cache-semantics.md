---
id: TASK-017
title: "cache expiry is not respected and several endpoints are never cached"
status: open
priority: high
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F3"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f3"]
related: [TASK-007]
---

# cache expiry is not respected and several endpoints are never cached
**Severity:** High


**Terms:** Do not repeat requests before `Expires`; cache responses locally; use `If-Modified-Since` when `Last-Modified` exists; avoid requests for data that has not changed.

**Evidence:**

- `doFetch()` extracts `Last-Modified` and `Expires` (`lib/yr_lib.ts:221-228`).
- Locationforecast and nowcast pass their previous `Last-Modified` values (`drivers/myr/device.ts:200-206` and `drivers/myr/device.ts:311-317`). This is a positive control.
- `_weatherExpires` and `_nowcastExpires` are assigned (`drivers/myr/device.ts:211-212` and `drivers/myr/device.ts:322-323`) but are never consulted when scheduling. Locationforecast always uses the hourly schedule and nowcast always uses a five-minute schedule (`drivers/myr/device.ts:170-185` and `drivers/myr/device.ts:281-295`).
- A 304 response discards any new response cache headers and returns only the old `Last-Modified` (`lib/yr_lib.ts:187-190`, `lib/yr_lib.ts:257-261`, and `lib/yr_lib.ts:382-386`).
- Sunrise is fetched after every hourly locationforecast cycle without `If-Modified-Since`, even though its request is for one date (`drivers/myr/device.ts:232-242`; `lib/yr_lib.ts:326-340`).
- Textforecast `/areas` and `/landoverview` are also fetched after every hourly cycle without validators (`drivers/myr/device.ts:252-258`; `lib/yr_lib.ts:409-432`). `/areas` is common data that is redundantly downloaded once per device.
- Cache data and validators live only in memory and are reset on every device initialization (`drivers/myr/device.ts:17-26,39-41`).

**Impact:** The implementation can request resources before MET says they expire. It repeatedly downloads daily or shared resources and loses all cache state on restart. For a Norwegian nowcast device, the steady-state maximum is approximately 16 MET requests/hour (12 nowcast, 1 locationforecast, 1 sunrise, and 2 textforecast), before conditional 304 responses; three of the four hourly endpoint requests have no validation at all.

**Recommendation:**

1. Make `Expires` the earliest allowed next-fetch time, with randomized delay after expiry.
2. Preserve cache headers returned with 304 responses.
3. Cache sunrise by rounded coordinates, date, and offset until its expiry (or at least for the requested date), using validators when supplied.
4. Cache textforecast areas and landoverview at app scope, not device scope, and respect their cache headers.
5. Persist response data and cache metadata across restarts where practical.
6. Deduplicate in-flight requests for identical rounded coordinates.
