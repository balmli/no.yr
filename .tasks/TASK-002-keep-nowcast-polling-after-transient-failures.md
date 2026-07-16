---
id: TASK-002
title: "A transient HTTP/API failure can stop nowcast polling permanently"
status: open
priority: high
type: bug
source: BUG_REPORT.md
source_ref: "BUG-002"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-002"]
related: []
---

# A transient HTTP/API failure can stop nowcast polling permanently
**Severity:** High  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L298), [`lib/yr_lib.ts`](lib/yr_lib.ts#L368)

`doFetchNowcast()` sets `newSchedule = false` whenever `fetchNowcast()` returns `{ data: null }` without a `lastModified` value. That result is used for permanent lack of support, but also for transient HTTP statuses such as `429`, `5xx`, `422`, and parse failures. The `finally` block then schedules no further fetch or update. A successful response with `radar_coverage: temporarily unavailable` can also stop the scheduler during an initial or forced update.

The failure branch removes only `measure_minutes_raining`; `measure_rain.next_30_minutes` and `_nowcastData` can remain stale.

**Recommended fix:** Represent fetch outcomes explicitly: `ok`, `not-modified`, `no-coverage`, `temporarily-unavailable`, and `error`. Continue polling with normal cadence or backoff for temporary failures. Only disable polling for confirmed permanent no-coverage, and clear/remove both nowcast capabilities together when data is invalid.

**Regression test:** Simulate a `429`, a `500`, malformed data, and temporary radar coverage, followed by a valid response. Assert that a retry is scheduled and both capabilities recover.
