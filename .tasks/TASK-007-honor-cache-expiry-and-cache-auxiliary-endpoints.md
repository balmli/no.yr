---
id: TASK-007
title: "`Expires` is ignored and auxiliary endpoints are fetched every hour"
status: open
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-007"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-007"]
related: [TASK-017]
---

# `Expires` is ignored and auxiliary endpoints are fetched every hour
**Severity:** Medium  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L170), [`drivers/myr/device.ts`](drivers/myr/device.ts#L232), [`lib/yr_lib.ts`](lib/yr_lib.ts#L409)

The app stores `_weatherExpires` and `_nowcastExpires`, but never reads either value when scheduling the next request. Sunrise and textual forecast requests also run after every hourly location-forecast cycle whenever any `_weatherData` cache exists. `fetchTextforecast()` downloads the areas document each time and, for supported locations, then downloads the land overview.

This creates avoidable traffic and makes the implementation less responsive to MET Norway’s cache instructions. It also means a failed main refresh can still trigger auxiliary calls because old `_weatherData` remains truthy.

**Recommended fix:** Schedule no earlier than the response’s `Expires` value, with a safe fallback if the header is missing or invalid. Cache sunrise by location/date and cache textual areas/forecast using their validators and expiry; consider sharing location-independent textual documents across devices.

**Regression test:** Supply future `Expires` headers and assert that no request is scheduled before them. Assert that repeated hourly weather refreshes do not redownload unchanged sunrise/text documents.
