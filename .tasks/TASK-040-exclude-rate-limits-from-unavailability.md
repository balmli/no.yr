---
id: TASK-040
title: "Do not count rate-limit throttling as device fetch failures"
status: done
priority: medium
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-008"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, rate-limit, availability]
related: [TASK-003-count-transport-errors-toward-unavailability.md, TASK-018-add-application-wide-rate-limit-backoff.md]
blocked_by: []
---

# Do not count rate-limit throttling as device fetch failures

## Context

`doFetch()` returns `null` for several distinct situations: genuine HTTP/transport errors,
HTTP 429 rate limiting, and requests suppressed by the application-wide rate-limit backoff.
`fetchWeather()` collapses every `null` into `{data: null, notModified: false}`, so
`doFetchWeather()` cannot tell a real failure apart from deliberate throttling and treats
them all as a failed fetch — incrementing `fetchFailures` and eventually marking the device
unavailable.

The documented design is the opposite: rate limiting must be handled gracefully and must
**not** mark the device unavailable.

## Evidence

- `lib/yr_lib.ts:183-189` returns `null` when the app-wide backoff is active (request
  suppressed, not failed).
- `lib/yr_lib.ts:224-232` returns `null` on HTTP 429 after registering the backoff.
- `lib/yr_lib.ts:295-297` maps any `null` fetch result to `{data: null, notModified: false}`.
- `drivers/myr/device.ts:261-264` treats that result as a failure and calls
  `setDeviceUnavailable()`.
- `drivers/myr/device.ts:447-455` `setDeviceUnavailable()` increments `fetchFailures` and
  sets the device unavailable once it reaches 5.
- `AGENTS.md` (HTTP status handling / "How the App Avoids HTTP 429 Errors") states that on
  429 the app returns null to skip the fetch, allows the scheduled retry, and is "Not marking
  the device as unavailable."

## Impact

Sustained rate limiting (for example five consecutive hourly cycles, or the app-wide backoff
being triggered by a nowcast/other endpoint while the weather fetch is suppressed) drives
`fetchFailures` to the unavailable threshold. The device is then shown as unavailable with a
data-error warning even though nothing is wrong — the app is intentionally throttling itself.
This is most likely in multi-device installations where the shared backoff suppresses many
requests at once.

## Recommended fix

Distinguish "throttled/suppressed" from "failed" on the path from `doFetch()` through
`fetchWeather()`/`fetchNowcast()` to `doFetchWeather()` (a dedicated result flag or status,
consistent with the existing not-modified distinction). When a cycle is skipped due to HTTP
429 or active backoff, do not increment `fetchFailures` and do not mark the device
unavailable; just let the normal scheduled retry run. Keep genuine transport/HTTP errors and
malformed responses counting toward unavailability as they do today, and do not reset an
existing failure count on a throttled cycle unless that is explicitly desired.

## Testing strategy

- Exercise `doFetchWeather()` (or an extracted result-classification helper) with a
  throttled/suppressed result and assert `fetchFailures` is unchanged and the device stays
  available.
- Add a case for a genuine failure result and assert it still increments and can mark the
  device unavailable.
- Add a case where a successful fetch after throttling clears the failure count.
- Keep `tests/rateLimitBackoff.ts`, `tests/trackedFetch.ts`, and the weather-fetch-result
  tests green.

## Acceptance criteria

- HTTP 429 responses and backoff-suppressed cycles never increment `fetchFailures` and never
  mark the device unavailable.
- Real transport/HTTP failures and malformed responses still count toward unavailability.
- The throttled-vs-failed distinction is carried explicitly rather than inferred from a bare
  `null`.
- Focused regression tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Confirmed the report in the current call chain: both HTTP 429 and active-backoff
  suppression returned bare `null`, `fetchWeather()` converted either to an ordinary failed
  result, and `doFetchWeather()` incremented `fetchFailures` through
  `setDeviceUnavailable()`.
- Added an explicit `throttled` fetch outcome and carried it through the HTTP cache and both
  weather-result mappers. HTTP errors, transport rejections, and malformed successful
  responses remain non-throttled failures.
- Added `applyFetchAvailability()` and made the device use it for one availability decision:
  successes reset failures, genuine failures increment them, and throttled cycles call
  neither path. Nowcast also preserves its current state when a request is throttled.
- Added `tests/fetchAvailability.ts` and extended the native transport and weather-result
  tests. TDD red: the focused test failed because the availability helper did not exist;
  after implementation, the focused availability/result suites passed with `4 passing`.
- Verification under Node.js 22.14.0: `npm run build` passed; `npm run lint` passed;
  `npm test` passed with `102 passing`; the Homey publish validation passed.
