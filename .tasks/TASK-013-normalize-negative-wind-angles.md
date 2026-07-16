---
id: TASK-013
title: "Negative angles map to the opposite compass direction"
status: done
priority: low
type: bug
source: BUG_REPORT.md
source_ref: "BUG-013"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-013"]
related: []
---

# Negative angles map to the opposite compass direction
**Severity:** Low  
**Affected code:** [`lib/yr_lib.ts`](lib/yr_lib.ts#L135), [`tests/degreesToText.ts`](tests/degreesToText.ts#L5)

`degreesToText()` applies `Math.abs()` after modulo/rounding instead of normalizing the angle into `[0, 360)`. For example, `-90` returns `E` even though it normalizes to `270°` (`W`); `-270` returns `W` instead of `E`. Existing tests cover values near north but miss negative cardinal directions.

**Recommended fix:** Normalize with `((num % 360) + 360) % 360` before selecting the label. Add negative tests for all cardinal directions.

## Resolution

- Normalized all angles into `[0, 360)` before rounding to a compass sector, removing the direction-reversing `Math.abs()` behavior for negative values.
- Extended `tests/degreesToText.ts` with negative east, south, and west cardinal cases. The focused suite reproduced `-90 → E` before the fix and then passed with `8 passing`.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `67 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the reproduction.
