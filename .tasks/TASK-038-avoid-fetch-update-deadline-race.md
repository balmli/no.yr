---
id: TASK-038
title: "Apply fetched data when a fetch crosses its update deadline"
status: done
priority: medium
type: bug
source: code-audit
source_ref: "2026-07-16-AUDIT-006"
created: 2026-07-16
updated: 2026-07-16
labels: [bug, audit, scheduling, stale-data]
related: []
blocked_by: []
---

# Apply fetched data when a fetch crosses its update deadline

## Context

Weather fetching and capability updates run on independent schedules. Each fetch cancels the pending update timer before making its network request, and normal scheduled fetches do not apply fresh data immediately. If the request finishes after the next update boundary, the replacement timer targets the following boundary instead.

## Evidence

- `doFetchWeather()` clears the pending device-update timer before awaiting the network path (`drivers/myr/device.ts:206-223`).
- Fresh data is applied immediately only when `_forceUpdateDevice === true` (`drivers/myr/device.ts:231-243`); ordinary scheduled fetches leave it cached.
- `scheduleUpdateDevice()` always chooses the next `:00:03` boundary (`drivers/myr/device.ts:434-446`). If a fetch begun just before that boundary completes at `:00:04`, the next update is scheduled about 59 minutes 59 seconds later.
- The nowcast path has the same shape: it clears the minute-update timer before fetching (`drivers/myr/device.ts:331-333`) and `scheduleUpdateNowcastDevice()` chooses the next `:02` boundary (`drivers/myr/device.ts:471-483`). Crossing that boundary delays application for nearly another minute.

## Impact

Devices whose randomized fetch slot falls near an update boundary can retain an extra-hour-old standard forecast, or an extra-minute-old nowcast, solely because normal network latency crossed the boundary. Slow responses make the race more likely.

## Recommended fix

Do not discard an imminent independent update deadline without preserving it, or apply a successful fresh response immediately when its intended update boundary has already passed. Keep request spreading and cache semantics unchanged, and avoid duplicate updates/triggers when the normal timer also fires.

## Testing strategy

Use fake timers and deferred fetch promises for both schedules. Start requests immediately before `:00:03` and minute `:02`, resolve them immediately before and after the boundary, and assert that fresh data is applied once within the current cycle rather than one full cycle later.

## Acceptance criteria

- Crossing the hourly update boundary cannot defer fresh standard data for another hour.
- Crossing the minute update boundary cannot defer fresh nowcast data for another minute.
- Each successful cycle updates capabilities/triggers at most once for the relevant boundary.
- Randomized fetch distribution, expiry guards, forced updates, and retry scheduling remain intact.
- Focused deterministic timing tests and the full test/validation suite pass under Node.js 22.

## Resolution

- Changed `drivers/myr/device.ts` to retain the pending hourly and minute update deadlines while a fetch is in flight. A successful fetch that reaches or crosses its captured deadline is applied immediately; an earlier completion restores the same deadline instead of skipping to the next cycle.
- Added `lib/update_schedule.ts` for deterministic deadline decisions, non-negative timer delays, and single-application coordination shared by standard forecast and nowcast updates.
- Added `tests/fetchUpdateDeadline.ts` covering pre-boundary, exact-boundary, crossed-boundary, forced-update, absent-deadline, hourly/minute, timer-delay, and at-most-once behavior.
- TDD red phase: the focused test failed with `TS2305` because `applyFetchedDataIfDue` did not exist.
- Verification under Node.js 22.14.0:
  - Focused test: `6 passing`.
  - `npm run build`: passed.
  - `npm run lint`: passed.
  - `npm test`: `99 passing`; Homey validation succeeded at publish level.
