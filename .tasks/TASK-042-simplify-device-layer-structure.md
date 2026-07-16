---
id: TASK-042
title: "Simplify the device layer by extracting cohesive, testable modules"
status: done
priority: medium
type: tooling
source: user-request
source_ref: "2026-07-16: refactor to simplify and keep clean code, smaller files, TDD"
created: 2026-07-16
updated: 2026-07-16
labels: [refactor, code-quality, tdd, maintainability]
related: []
blocked_by: []
---

# Simplify the device layer by extracting cohesive, testable modules

## Context

The codebase has been progressively modularized into small, single-purpose `lib/` modules
(for example `cache_schedule.ts`, `fetch_availability.ts`, `nowcast.ts`, `sunrise.ts`,
`update_schedule.ts`), each backed by focused tests in `tests/`. The device layer, however,
has not kept pace: `drivers/myr/device.ts` is currently **851 lines** and is by a wide margin
the largest and most tangled source file in the repository.

`YrDevice` currently mixes several unrelated responsibilities in one class:

- Homey lifecycle (`onInit`, `onAdded`, `onDeleted`, `onSettings`, `migrate`, `initialize`).
- Two nearly-parallel fetch/update scheduling state machines — weather
  (`scheduleFetchData`/`doFetchWeather`/`scheduleUpdateDevice*`/`doUpdateDevice`) and nowcast
  (`scheduleFetchNowcast`/`doFetchNowcast`/`scheduleUpdateNowcastDevice*`/`doUpdateNowcastDevice`)
  — that repeat the same clear/schedule/deadline patterns with small differences.
- Capability reconciliation (`updateCapabilities`, `updateAndSortCapabilities`,
  `removeNowcastCapabilities`, `updateCapability`) and the long, hand-written capability
  mapping in `updateDevice`.
- Availability bookkeeping (`setDeviceAvailable`/`setDeviceUnavailable`).
- Flow-support glue (`nextHoursComparer`, `periodComparer`, `nextHoursSum`, `periodSum`,
  autocomplete listeners, `textforecastAction`, `nowcastAction`).

Much of this is pure or near-pure logic that only touches Homey through thin wrappers, so it
can be moved into dedicated modules that are unit-testable in isolation — matching the
established `lib/` + `tests/` pattern — leaving `YrDevice` as a thin orchestrator.

This is a **pure refactor**. It must not change runtime behavior, capability IDs, flow card
IDs, generated `app.json`, the public Web API, or any user-visible output. The goal is only to
simplify the code, reduce file size, remove duplication, and improve testability and clarity.

## Goals

- Reduce the size and cognitive load of `drivers/myr/device.ts` by extracting cohesive units
  into well-named modules, so no single file carries unrelated responsibilities.
- Remove duplication between the weather and nowcast scheduling paths where a shared,
  well-tested helper can express both without obscuring their real differences.
- Increase the amount of device logic that is exercised by fast, standalone unit tests rather
  than only reachable through the live Homey runtime.
- Keep changes small, incremental, and individually reviewable.

## Non-goals

- No behavioral change of any kind. Identical fetch timing, capability values, flow triggers,
  scheduling decisions, logging semantics, and error handling.
- No change to `dependencies`, generated application metadata (`app.json`), capability IDs, or
  flow card IDs.
- Not a rewrite. Do not introduce new frameworks, patterns, or abstractions beyond what is
  needed to separate the existing responsibilities cleanly.
- `lib/yr_lib.ts` (630 lines) and `app.ts` (437 lines) are **out of scope** for this task; they
  are worthwhile follow-up refactors and should be filed as separate tasks rather than absorbed
  here.

## Suggested approach

Prefer several tiny, safe extractions over one large restructuring. Reasonable candidate seams
(implementer may adjust as the code reveals itself, but keep each unit cohesive and small):

- A capability-reconciliation helper that decides which capabilities to add/remove from a
  `YrComplete` response (currently the body of `updateCapabilities`), returning plain
  `addCaps`/`removeCaps` arrays so the decision is unit-testable without a device.
- A pure "select symbol code" helper for the `next_1_hours` → `next_6_hours` → `next_12_hours`
  fallback currently inlined in `updateDevice`.
- A data-driven description of the `updateDevice` capability mapping (capability id → value
  selector) to replace the long repetitive block, if it can be done without changing which
  values are written or the order of side effects that matter (for example the
  `weather_description` value read back for the trigger token).
- Consolidation of the repeated timer/deadline scheduling boilerplate shared by the weather and
  nowcast paths, keeping their genuine differences explicit.

Follow the repository TDD workflow for each extraction:

1. Add or extend a focused test in `tests/` that pins the current behavior of the logic being
   moved (a characterization test), and confirm it passes against the current code.
2. Perform the extraction as a behavior-preserving move.
3. Re-run the focused test and the broader suite; they must stay green throughout.

Where a unit genuinely cannot be tested without the Homey SDK (the testing strategy in
`AGENTS.md` does not mock Homey), keep the untestable shell in `device.ts` as thin as possible
and extract the pure decision it delegates to, testing that instead. Document any logic that
cannot be covered and why.

## Testing strategy

1. Capture a baseline before any change: `npm run lint`, `npx tsc -p tsconfig.test.json`,
   `npm run build`, and `npm test` (record the passing test count and Homey validation result).
2. For each extraction, add a focused characterization test first, confirm green, then move the
   code and confirm the test and suite remain green.
3. After all extractions, re-run the full acceptance checks under the Node.js version pinned in
   `.nvmrc` and confirm no behavioral or generated-metadata diffs.
4. Sanity-check that the only production changes are relocations/renames: no capability IDs,
   flow IDs, scheduling constants, or logged messages changed in a way that alters behavior.

## Acceptance criteria

- `drivers/myr/device.ts` is meaningfully smaller and no longer mixes unrelated
  responsibilities; extracted logic lives in cohesive, well-named modules.
- Duplication between the weather and nowcast scheduling paths is reduced without hiding their
  real differences.
- New/extended unit tests cover the extracted pure logic and pass.
- No functional changes: capability IDs, flow card IDs, generated `app.json`, the Web API, and
  user-visible behavior are unchanged. `dependencies` are unchanged.
- `npm run lint` passes (including the Prettier `format:check` gate).
- `npx tsc -p tsconfig.test.json` passes.
- `npm run build` passes.
- `npm test` passes, including Homey app validation from the `posttest` hook, with a test count
  no lower than the baseline.

## Resolution

Extracted the repeated device scheduling machinery and pure weather-capability decisions while
leaving Homey lifecycle, API fetch orchestration, device side effects, and Flow entry points in
`YrDevice`. The device file is 706 lines, down from 851 lines (145 lines / 17% smaller).

### Decisions and changed files

- Added `lib/device_schedule.ts` with shared fetch and update schedulers plus the periodic-offset
  calculation used by both the hourly weather and five-minute/minute nowcast paths. Weather and
  nowcast still supply their own periods, cache-expiry state, force flags, log messages/levels,
  and callbacks, so their genuine differences remain explicit.
- Added `lib/weather_capabilities.ts` with the optional-capability reconciliation plan, exact
  symbol-period precedence, and the ordered weather capability-value mapping.
- Simplified `drivers/myr/device.ts` to configure the shared schedulers and apply the returned
  capability plans/values sequentially. Capability write order and the read-back of
  `weather_description` before the trigger token are unchanged.
- Added `tests/deviceSchedule.ts` to characterize hourly/minute boundaries, the persisted
  `syncTime === 3600` edge case, explicit force scheduling, timeout replacement, deadline state,
  crossed-deadline behavior, and deletion guards.
- Added `tests/weatherCapabilities.ts` to characterize optional additions/removals, exact
  capability write order and values, and symbol selection. In particular, the existing behavior
  where a present `next_1_hours` block with no symbol does not fall through is preserved.
- Did not extract the fetch-result orchestration or Flow action shells: those sections primarily
  coordinate ordered Homey side effects, and moving them would add indirection without creating
  a useful standalone-test seam. `lib/yr_lib.ts` and `app.ts` remained out of scope.

### TDD and verification

- Pre-change baseline: `npm run lint`, `npx tsc -p tsconfig.test.json`, and `npm run build`
  passed; `npm test` passed with `102 passing` and successful Homey publish validation.
- Because the repository deliberately does not mock the Homey SDK, the device class could not
  be imported directly for a conventional pre-extraction unit test. The pure/general helper
  APIs and eight focused characterization tests were added first and passed before `YrDevice`
  was wired to them; they stayed green after the move.
- Final verification used the `.nvmrc` runtime, Node.js v22.14.0.
- Focused tests passed: `8 passing`.
- `npm run lint` passed, including the Prettier `format:check` gate.
- `npx tsc -p tsconfig.test.json` passed.
- `npm run build` passed.
- `npm test` passed with `110 passing`; the Homey posttest publish validation passed.
- `git diff --check` passed.
- `app.json` retained SHA-1 `ce996170e3db01f19cd6b725473cedb9a4b9562e`; generated metadata,
  capability IDs, Flow card IDs, the public Web API, and user-visible output were unchanged.
- `package.json` retained SHA-1 `da5a4d7d1c8862cf29d95e013a7abccd69c9c420`; dependencies were
  unchanged.
