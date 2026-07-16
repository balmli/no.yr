---
id: TASK-009
title: "`feelsLike` is returned as the ordinary air temperature"
status: done
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-009"
created: 2026-07-16
updated: 2026-07-16
labels: ["bug", "bug-009"]
related: []
---

# `feelsLike` is returned as the ordinary air temperature
**Severity:** Medium  
**Affected code:** [`api.ts`](api.ts#L81), [`lib/yr_lib.ts`](lib/yr_lib.ts#L142)

The public forecast endpoint exposes `instant.feelsLike`, but assigns `air_temperature` without calculating a feels-like value. The app already has `calculateFeelsLike()`, and the device capability uses it. API consumers therefore receive a confidently named but incorrect value whenever wind/humidity changes perceived temperature.

**Recommended fix:** Use the shared calculation or omit the field when required inputs are unavailable. Add an API response test where calculated feels-like differs from air temperature.

## Resolution

- Added `mapForecastInstant()` and used it for public forecast responses. `feelsLike` now comes from the same `calculateFeelsLike()` function used by the device capability.
- The field is omitted when temperature, humidity, or wind speed is unavailable rather than returning a misleading air-temperature duplicate.
- Added `tests/apiForecastInstant.ts`. The focused test first failed because the mapper was absent, then passed with `2 passing`, including a case where 10°C maps to a 4.4°C feels-like value.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `61 passing`, and the Homey publish validation passed.
- The cited local `BUG_REPORT.md` was unavailable in this checkout; the task record supplied the actionable evidence.
