---
id: TASK-037
title: "Reject non-integer forecast hours parameters"
status: done
priority: low
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-005"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, api, validation]
related: []
blocked_by: []
---

# Reject non-integer forecast hours parameters

## Context

The forecast REST endpoint documents `hours` as a number of whole hours from 1 through 240, but parses it with JavaScript's permissive `parseInt()`.

## Evidence

- `api.ts:66-70` uses `parseInt(query.hours, 10)` and then validates only the resulting numeric range.
- `parseInt('2.5', 10)` returns `2`, `parseInt('24hours', 10)` returns `24`, and `parseInt('1e2', 10)` returns `1`.
- These malformed values therefore receive successful responses whose `hoursRequested` value differs silently from the request.

## Impact

API clients can send syntactically invalid parameters without receiving the promised validation error. Silent truncation can hide integration mistakes and return a materially shorter forecast than requested.

## Recommended fix

Validate the complete query string as a canonical base-10 integer before conversion, then enforce the inclusive 1-240 range. Decide and test whether surrounding whitespace is accepted; reject decimals, exponent notation, signs, and trailing characters unless explicitly documented.

## Testing strategy

Extract or directly exercise parameter parsing with valid boundaries (`1`, `240`), out-of-range values, decimals, exponent notation, trailing text, empty input, and the omitted/default case.

## Acceptance criteria

- Only documented whole-hour values from 1 through 240 are accepted.
- Malformed numeric strings are rejected rather than truncated.
- Omitting `hours` still defaults to 24.
- The response's `hoursRequested` always exactly represents an accepted request/default.
- Focused regression tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Added `parseForecastHours()` as the single query-validation path and wired the forecast endpoint to it.
- Omitted `hours` still defaults to 24. Supplied values must be canonical unsigned base-10 integer strings in the inclusive 1-240 range.
- Decimals, exponent notation, signs, whitespace, leading zeroes, trailing text, empty strings, and out-of-range values now receive the existing validation error instead of being silently truncated.
- Added `tests/forecastHoursParameter.ts`. The focused test first failed because the parser module did not exist, then passed with `3 passing` across defaults, boundaries, range failures, and malformed strings.
- Verification under Node.js 22.14.0: focused tests `3 passing`; `npm run build` passed; `npm run lint` passed; `npm test` passed with `93 passing`; the post-test Homey publish validation passed.
