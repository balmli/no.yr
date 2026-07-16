---
id: TASK-034
title: "Do not fabricate sunrise times during polar day or night"
status: done
priority: medium
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-002"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, sunrise, polar]
related: []
blocked_by: []
---

# Do not fabricate sunrise times during polar day or night

## Context

MET's sunrise response legitimately uses `null` event times when the sun does not rise or set. `parseSunrise()` converts those values to `undefined`, but still returns a truthy `Sunrise` object. The device then passes each `undefined` value to `moment()`, which interprets it as the current instant rather than as a missing event.

## Evidence

- The committed fixtures `tests/sunrise_tromsoe_2023-06-20.json` and `tests/sunrise_tromsoe_2023-12-20.json` contain `null` for both `properties.sunrise.time` and `properties.sunset.time`.
- Existing parser tests confirm that these become `undefined` (`tests/parseSunrise_1.ts`).
- `lib/yr_lib.ts:404-413` returns `{ sunrise: undefined, sunset: undefined }` as a successful result.
- `drivers/myr/device.ts:270-272` calls `moment(sunrise.sunrise)` and `moment(sunrise.sunset)` whenever the result object is truthy.
- Reproduction on 2026-07-16: `moment(undefined).format("DD.MM.YYYY HH:mm")` returned the current local time, `16.07.2026 09:55`.
- The live Tromsø sunrise test also logged `Got sunrise data! { sunrise: undefined, sunset: undefined }` without entering the error path.

## Impact

During midnight sun and polar night, the app displays plausible-looking but entirely fabricated sunrise and sunset times based on when the update ran. Users and Flows consuming these string capabilities cannot distinguish the fabricated values from real astronomical events.

## Recommended fix

Model sunrise and sunset as optional/null events throughout the type and fetch path. When an event does not occur, set an explicit unavailable/display value rather than formatting it with Moment. If useful, preserve enough response metadata (for example solar-noon visibility) to distinguish polar day from polar night.

## Testing strategy

Use the existing Tromsø summer and winter fixtures to exercise the device-facing mapping, not only `parseSunrise()`. Freeze the clock so a regression would deterministically reveal a fabricated current-time string.

## Acceptance criteria

- Null MET sunrise/sunset event times never become the current time.
- The `Sunrise` type accurately represents absent events.
- Both polar-day and polar-night fixtures produce an explicit unavailable or correctly described state.
- Ordinary Oslo and Tromsø equinox event times remain unchanged.
- Focused regression tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Updated the MET sunrise response and internal `Sunrise` types so `null` event times are represented as absent moments rather than falsely required values.
- Added `formatSunEvent()`, which formats real events and maps absent sunrise/sunset events to the explicit `-` capability display value.
- Changed the device update path to use the formatter, eliminating the `moment(undefined)` path that fabricated the current time during polar day and night.
- Added `tests/sunriseCapabilities.ts` using both committed Tromsø polar fixtures and the ordinary Oslo fixture. The focused test first failed because the formatter module did not exist, then passed with `6 passing` together with the existing parser coverage.
- Updated existing sunrise tests to acknowledge the corrected optional event types without changing their runtime assertions.
- Verification under Node.js 22.14.0: focused tests `6 passing`; `npm run build` passed; `npm run lint` passed; `npm test` passed with `85 passing`; the post-test Homey publish validation passed.
