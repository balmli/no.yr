---
id: TASK-014
title: "Day/hour periods retain the current minute and second"
status: done
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

## Resolution

- Added `.startOf('day')` to the day/hour branch of `getDateAddPeriod()`, matching `getDateFromPeriod()` and clearing inherited minutes, seconds, and milliseconds.
- Added `tests/getDateAddPeriod.ts` with a controlled `10:41:48.765` clock. It reproduced `06:41:48.765` before the fix and passed with the exact `06:00:00.000Z` result afterward.
- Verification: focused test `1 passing`; `npm run build` passed; Node.js 22 `npm test` passed with `68 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the reproduction.
