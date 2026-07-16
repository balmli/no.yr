---
id: TASK-035
title: "Reject weather Flow conditions when source data is unknown"
status: done
priority: high
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-003"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, flows, stale-data]
related: [TASK-005, TASK-011, TASK-033]
blocked_by: []
---

# Reject weather Flow conditions when source data is unknown

## Context

The app has no consistent tri-state handling for Flow conditions when weather data is unavailable. Direct capability comparisons rely on JavaScript coercion, while forecast helper conditions return `false` for missing data. Both behaviors can incorrectly let an automation continue, depending on whether the user selected the normal or inverted form of the card.

## Evidence

- Homey's device API documents `getCapabilityValue()` as returning `null` when a value is unknown (`node_modules/@types/homey/lib/Device.d.ts:144-151`).
- Eighteen direct condition listeners in `app.ts` compare capability values with `<` without checking availability; JavaScript evaluates `null < 10` as `true`.
- `01_is_weather` similarly maps an unknown value to `false` through strict equality.
- The forecast helpers intentionally return `false` for absent/empty timeseries (`lib/yr_lib.ts:66-68` and `lib/yr_lib.ts:82-84`, from TASK-005).
- These cards expose Homey's `!{{|not}}` inversion. A missing-data `false` can therefore satisfy an inverted condition, while a coerced `null` can satisfy a normal "below" condition.
- Homey's Flow documentation states that rejecting a condition stops the Flow, providing a safe no-data path: https://apps.developer.homey.app/the-basics/flow

## Impact

At startup, after location changes, and during data outages, Flows can execute actions based on an unknown measurement. Depending on the card and inversion, the same missing data can be interpreted as either a real below-threshold result or a real negated result.

## Recommended fix

Centralize condition evaluation behind an availability check. When the required capability or forecast dataset is unknown, reject/throw a clear no-data error so neither the normal nor inverted condition is treated as satisfied. Only return booleans after validating finite numeric values and the required forecast fields.

## Testing strategy

1. Exercise representative direct, forecast-comparer, forecast-sum, and weather-symbol cards with `null`, `undefined`, empty, and valid-zero inputs.
2. Verify both normal and inverted Flow behavior through the closest available Homey Flow harness; if inversion cannot be unit-tested outside Homey, document that limitation and test the shared evaluator's rejection contract.
3. Retain valid zero measurements as real data.

## Acceptance criteria

- Unknown capability values are never coerced into numeric comparison results.
- Missing forecast data does not become a successful inverted condition.
- Valid zero values continue to evaluate normally.
- All affected condition families use one documented no-data policy.
- Focused regression tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Added `WeatherDataUnavailableError` and shared guards for capability strings, finite numbers, and forecast timeseries.
- Routed every direct numeric/string condition in `app.ts` through the shared capability guards, eliminating JavaScript's `null` coercion.
- Routed every forecast condition callback through required-field guards. Optional MET fields now reject when a selected timeseries lacks the measurement instead of silently evaluating to `false`.
- Changed comparer and sum helpers to reject absent, empty, or uncovered selected periods. They now filter by time before reading condition-specific fields, so missing values outside the requested interval do not cause false failures.
- Added `tests/flowConditionData.ts` and updated `tests/noForecastFlowConditions.ts`. The focused suite first failed because the shared guard module did not exist, then passed with `20 passing` alongside all existing comparer/sum tests. Valid zero values remain supported.
- Homey's inversion engine is not available in the standalone unit harness. The regression tests instead verify the required rejection contract; Homey's documented behavior stops a Flow on condition rejection before a boolean can be inverted.
- Verification under Node.js 22.14.0: focused/relevant tests `20 passing`; `npm run build` passed; `npm run lint` passed; `npm test` passed with `88 passing`; the post-test Homey publish validation passed.
