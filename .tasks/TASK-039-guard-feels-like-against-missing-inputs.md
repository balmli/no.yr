---
id: TASK-039
title: "Stop feels-like errors from aborting the whole device update"
status: done
priority: high
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-007"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, capabilities, robustness]
related: [TASK-009-calculate-feels-like-in-public-api.md, TASK-011-preserve-unknown-forecast-values.md]
blocked_by: []
---

# Stop feels-like errors from aborting the whole device update

## Context

`updateDevice()` writes every standard capability in a single sequence. The feels-like
value is produced by `calculateFeelsLike()`, which delegates to the `feels` library. That
library throws when it cannot pick a valid method for the supplied inputs (for example a
warm temperature with no humidity, or any temperature with neither humidity nor wind).

The public REST forecast path already recognises that these instant fields can be absent
and guards the calculation (`mapForecastInstant()` only computes feels-like when
`air_temperature`, `relative_humidity`, and `wind_speed` are all numbers). The device path
has no equivalent guard.

## Evidence

- `drivers/myr/device.ts:589` calls `yrlib.calculateFeelsLike(ts.data.instant.details)` as
  the argument to `updateCapability`, so the calculation runs before the call and its
  exception propagates directly out of `updateDevice()`.
- `lib/yr_lib.ts:160-171` `calculateFeelsLike()` builds a `feels` config from
  `air_temperature`, `relative_humidity`, and `wind_speed` and calls `.like()` with no
  validation. All three instant fields are typed as optional (`lib/types.ts` `InstantDetails`).
- `feels`'s `.like()` throws `No valid methods for these values` when required inputs are
  missing (verified locally: warm temperature without humidity, and temperature-only input,
  both throw; a cold temperature with wind but no humidity succeeds via wind chill).
- `lib/api_forecast.ts:4-13` `mapForecastInstant()` computes feels-like only when the three
  inputs are numbers, demonstrating the intended guard is missing from the device path.
- The per-capability `.catch()` handlers in `updateCapability` (`drivers/myr/device.ts:666-670`)
  cannot help: the throw happens while evaluating the argument, before `setCapabilityValue`
  is invoked.

## Impact

For any location or forecast hour whose instant details omit humidity and/or wind such that
`feels` has no valid method, the exception aborts `updateDevice()` after
`measure_temperature` is set. Every capability written after line 589 — pressure, humidity,
all rain values, cloud and fog fractions, wind speed/direction/gust/angle, thunder,
ultraviolet — is skipped, and the `01_weather_changed` trigger never fires. The failure is
caught only by the outer `doUpdateDevice()`/`doFetchWeather()` handlers, so it recurs every
cycle and leaves those capabilities stale while temperature keeps updating, which is hard to
diagnose from the UI.

## Recommended fix

Guard the device feels-like write the same way the API path does: only compute and set
`measure_temperature.feels_like` when the required inputs are present (mirroring
`mapForecastInstant`'s `canCalculateFeelsLike` check), or make `calculateFeelsLike` return
`undefined` for unsupported inputs so `updateCapability` skips it. Ensure a missing/rejected
feels-like value never prevents the remaining capabilities or the weather-changed trigger
from being processed. Prefer a shared helper so the API and device paths cannot diverge again.

## Testing strategy

- Add a focused test that runs the device update (or an extracted mapping helper) against an
  instant-details object missing `relative_humidity` and `wind_speed`, and assert that it
  does not throw and that the non-feels-like capabilities are still produced.
- Add cases for inputs that succeed (cold + wind), inputs that previously threw (warm, no
  humidity), and fully populated inputs to confirm the guard matches the API path.
- Keep the existing `tests/calculateFeelsLike.ts` and `tests/apiForecastInstant.ts` green.

## Acceptance criteria

- Missing humidity/wind can never abort `updateDevice()`; all other capabilities and the
  `01_weather_changed` trigger are still processed.
- Feels-like is written only when it can be computed, and its absence clears or leaves the
  capability rather than throwing.
- Device and API feels-like guards share one code path or are proven equivalent by tests.
- Focused regression tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Confirmed the report against `feels` 3.x: warm temperature inputs without humidity throw
  `No valid methods for these values`, and the device evaluated that call before
  `updateCapability()` could isolate it.
- Moved the complete-input guard into the shared `calculateFeelsLike()` helper. It now
  returns `undefined` unless temperature, humidity, and wind speed are all numeric, so the
  device's existing missing-value handling skips only the feels-like write and continues
  through the remaining capabilities and weather-changed trigger.
- Removed the duplicate public API guard; both device and API paths now use the same guarded
  calculation.
- Extended `tests/calculateFeelsLike.ts` with warm, cold, and temperature-missing partial
  inputs. TDD red: the focused test failed with `No valid methods for these values`; after
  the fix, the feels-like and API focused suites passed with `6 passing`.
- Verification under Node.js 22.14.0: `npm run build` passed; `npm test` passed with
  `100 passing`; the Homey publish validation passed.
