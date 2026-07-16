---
id: TASK-004
title: "An unknown MET symbol throws instead of using the fallback"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-004"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-004"]
related: []
---

# An unknown MET symbol throws instead of using the fallback
**Severity:** Medium  
**Affected code:** [`lib/yr_lib.ts`](lib/yr_lib.ts#L124), [`drivers/myr/device.ts`](drivers/myr/device.ts#L472)

`weatherLegend()` dereferences `wl.variants` before checking whether `wl` exists. An API symbol absent from the local legend table therefore raises `TypeError`, making the fallback `return symbolCode` unreachable. This can abort the remainder of a scheduled device update when MET Norway adds or returns an unrecognized symbol.

**Observed reproduction:** `weatherLegend('unknown_symbol_day', 'en')` throws `Cannot read properties of undefined (reading 'variants')`.

**Recommended fix:** Return `symbolCode` immediately when the lookup is missing, then inspect variants. Add tests for unknown base codes and unexpected suffixes.

## Resolution

- Added an immediate fallback when the base symbol is absent from `WeatherLegends`, preventing the variants dereference from throwing and preserving the original MET symbol code.
- Kept known-symbol behavior intact, including known base symbols accompanied by unexpected suffixes.
- Added `tests/weatherLegend.ts`. The focused test reproduced the `TypeError` before the fix, then passed with `2 passing` afterward.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `48 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the reproduction.
