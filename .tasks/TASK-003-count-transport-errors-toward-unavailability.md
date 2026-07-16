---
id: TASK-003
title: "Transport exceptions do not count toward device unavailability"
status: open
priority: high
type: bug
source: BUG_REPORT.md
source_ref: "BUG-003"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-003"]
related: []
---

# Transport exceptions do not count toward device unavailability
**Severity:** High  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L188), [`drivers/myr/device.ts`](drivers/myr/device.ts#L359)

Normal null fetch results call `setDeviceUnavailable()`, but a rejected HTTP request, DNS failure, or timeout is caught by the outer `catch` and only logged. Consequently, repeated transport failures never increment `fetchFailures`; the device can remain available indefinitely while exposing stale values. This bypasses the intended “unavailable after five failures” behavior.

**Recommended fix:** Count fetch-specific exceptions through the same failure path. Keep update/parsing/programming errors distinct if they should not affect connectivity health.

**Regression test:** Reject `fetchWeather()` five consecutive times and assert that `fetchFailures` increments and the device becomes unavailable; then return valid data and assert recovery.
