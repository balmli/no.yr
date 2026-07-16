---
id: TASK-014
title: "Day/hour periods retain the current minute and second"
status: open
priority: low
type: bug
source: BUG_REPORT.md
source_ref: "BUG-014"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-014"]
related: []
---

# Day/hour periods retain the current minute and second
**Severity:** Low  
**Affected code:** [`lib/yr_lib.ts`](lib/yr_lib.ts#L290), [`lib/yr_lib.ts`](lib/yr_lib.ts#L302)

`getDateFromPeriod('1:6')` correctly starts at midnight and produces 06:00 UTC. `getDateAddPeriod('1:6')` only changes the day and hour, retaining the current minute, second, and millisecond. When called at any time ending in `:41:48`, for example, it produces 06:41:48 on the next day, contradicting the setting label “+1 day, 06:00 UTC”.

**Recommended fix:** Apply `.startOf('day')` before adding the day and setting the hour, matching `getDateFromPeriod()`. Add a clock-controlled test with non-zero minutes and seconds.
