---
id: TASK-041
title: "Add Prettier for automatic code formatting in the workflow"
status: done
priority: medium
type: tooling
source: user-request
source_ref: "2026-07-16: add Prettier automatic formatting to the workflow"
created: 2026-07-16
updated: 2026-07-16
labels: [tooling, formatting, prettier]
related: [TASK-032]
blocked_by: []
---

# Add Prettier for automatic code formatting in the workflow

## Context

The project has no automatic code formatter. Formatting is currently governed only by
ESLint (`eslint.config.mjs`) and the editor, so style is applied inconsistently across the
TypeScript sources (`app.ts`, `api.ts`, `drivers`, `lib`, `tests`) and configuration files.
Introduce [Prettier](https://prettier.io/) as the single source of truth for code formatting
and make it a first-class part of the development workflow rather than an optional manual step.

Prettier must own formatting concerns (spacing, quotes, semicolons, line width, trailing
commas) while ESLint keeps ownership of code-quality rules. The two must not fight over the
same rules.

## Requirements

- Add `prettier` as a direct `devDependency` at a supported version compatible with the
  Node.js 22 toolchain pinned in `.nvmrc`.
- Add a committed Prettier configuration (for example `.prettierrc.json`) and a `.prettierignore`
  that excludes build output, `node_modules`, generated Homey metadata, and anything already
  excluded from formatting concerns.
- Choose configuration values that match the existing prevailing style where reasonable so the
  initial formatting pass is as small and reviewable as possible; document any deliberate
  style decisions.
- Prevent ESLint and Prettier from conflicting. Either integrate Prettier through
  `eslint-config-prettier` (and optionally `eslint-plugin-prettier`) in the flat
  `eslint.config.mjs`, or clearly separate their responsibilities. Do not leave contradictory
  formatting rules active in both tools.
- Wire Prettier into `package.json` scripts so it is part of the workflow, not an ad hoc call:
  - A `format` script that writes formatting to all supported files.
  - A `format:check` (or equivalently named) script that verifies formatting without writing,
    suitable for use as a gate.
- Make formatting an enforced part of the workflow. The formatting check must run as part of
  the standard verification the repository already uses (for example alongside `lint`), so a
  formatting regression fails the checks rather than passing silently.
- Apply Prettier once across the codebase so the tree is fully formatted, and keep that
  formatting-only change reviewable and free of behavioral edits.
- Do not change `dependencies`, runtime behavior, or generated application metadata. This is a
  tooling and formatting task only.
- Update `package-lock.json` using the Node.js version pinned in `.nvmrc`.
- Document the new commands and the formatting policy where contributors will find them
  (for example `AGENTS.md`), so the workflow expectation is explicit.

## Testing strategy

1. Capture the current `npm run lint`, type-check, `npm run build`, and `npm test` results
   before adding Prettier.
2. Add and configure Prettier, then reconcile it with ESLint.
3. Run the new `format:check` script and confirm it reports the tree as formatted after the
   initial formatting pass.
4. Confirm `npm run lint` no longer reports rules that Prettier now owns and does not conflict
   with Prettier's output.
5. Re-run the full acceptance checks under Node.js 22 to confirm the formatting-only change did
   not alter behavior.

## Acceptance criteria

- `prettier` is a direct development dependency with committed configuration and ignore files.
- `package.json` exposes a formatting write script and a non-writing formatting check script.
- The formatting check is part of the enforced workflow and fails when code is not formatted.
- ESLint and Prettier do not conflict; formatting rules are owned by Prettier only.
- The entire codebase passes `format:check` after a single formatting-only pass, with no
  runtime or generated-metadata changes included.
- `npm run lint` passes.
- `npx tsc -p tsconfig.test.json` passes.
- `npm run build` passes.
- `npm test` passes, including Homey app validation from the `posttest` hook.
- `package-lock.json` matches `package.json` and installs reproducibly with the pinned toolchain.
- Contributor documentation describes the formatting commands and policy.

## Resolution

Added Prettier as the repository's formatting owner and made its non-writing check part of
the existing lint gate.

### Decisions and changed files

- Added Prettier 3.9.5 as a direct development dependency in `package.json` and regenerated
  `package-lock.json` under Node.js 22.14.0/npm 10.9.2. The selected release declares
  support for Node.js 14 and newer.
- Added `.prettierrc.json` with the prevailing four-space TypeScript style, a two-space JSON
  override, single quotes, semicolons, no bracket spacing, 120-column lines, trailing commas,
  LF endings, and preserved prose wrapping.
- Added `.prettierignore` for dependency/build output, generated `app.json`, vendored Moment
  files, assets, local agent state, and task records.
- Added `format` and `format:check` scripts. `npm run lint` now runs `format:check` before
  ESLint, so formatting regressions fail the standard verification workflow.
- Kept ESLint responsible only for code quality. Its flat configuration has no formatting
  rules, so an additional ESLint/Prettier compatibility package was unnecessary; the
  separation is documented in `eslint.config.mjs`.
- Documented the commands and ownership policy in `AGENTS.md`, and updated the conflicting
  whitespace guidance in `CONTRIBUTING.md`.
- Applied one mechanical Prettier pass across supported source, test, Homey Compose,
  configuration, fixture, and documentation files. Generated root `app.json` and production
  dependencies were unchanged. A semantic comparison confirmed that every formatted tracked
  JSON file retained identical data.

### TDD and verification

- Pre-change baseline under Node.js 22.14.0: `npm run lint`,
  `npx tsc -p tsconfig.test.json`, and `npm run build` passed; `npm test` passed with
  `102 passing` and successful Homey publish validation.
- Red state: `npm run format:check` initially failed because the script did not exist. After
  wiring the tool but before the formatting pass, the check failed on the unformatted tree.
- `npm run format` completed, and repeated `npm run format:check` passed with all matched
  files formatted.
- `npm run lint` passed, including its new formatting gate.
- `npx tsc -p tsconfig.test.json` passed.
- `npm run build` passed.
- `npm test` passed with `102 passing`; the Homey posttest publish validation passed.
- `npm ls --depth=0` passed and reported `prettier@3.9.5` without invalid direct packages.
- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps` reported the lockfile
  up to date. The pre-existing four development-only audit findings remain unchanged; no
  forced audit fix was applied.
- `git diff --check` passed.
