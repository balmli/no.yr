---
id: TASK-012
title: "A valid rain threshold of `0` is silently replaced by `0.1`"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-012"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-012"]
related: []
---

# A valid rain threshold of `0` is silently replaced by `0.1`
**Severity:** Medium  
**Affected code:** [`drivers/myr/device.ts`](drivers/myr/device.ts#L517), [`.homeycompose/drivers/settings/raining_threshold.json`](.homeycompose/drivers/settings/raining_threshold.json#L12)

The setting explicitly permits a minimum of `0`, but the code uses `this.getSetting('raining_threshold') || 0.1`. Since zero is falsy, users cannot select the documented minimum.

**Recommended fix:** Use nullish fallback: `this.getSetting('raining_threshold') ?? 0.1`. Add tests for `0`, `null`/`undefined`, and positive values.

## Resolution

- Added `getRainingThreshold()` and changed nowcast updates to default only for `null` or `undefined`, preserving a configured threshold of `0` and all positive values.
- Added `tests/rainingThreshold.ts`. The focused test first failed because the helper was absent, then passed with `2 passing` for zero, positive, null, and undefined cases.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `66 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the actionable evidence.
