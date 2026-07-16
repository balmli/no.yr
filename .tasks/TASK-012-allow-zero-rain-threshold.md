---
id: TASK-012
title: "A valid rain threshold of `0` is silently replaced by `0.1`"
status: open
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
