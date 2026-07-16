---
id: TASK-032
title: "Update development dependencies"
status: done
priority: medium
type: tooling
source: user-request
source_ref: "2026-07-16: update package.json devDependencies"
created: 2026-07-16
updated: 2026-07-16
labels: [dependencies, tooling]
related: [TASK-027, TASK-031]
blocked_by: []
---

## Context

The development toolchain in `package.json` includes packages targeting older Node.js and TypeScript generations, including the Node.js 12 shared TypeScript configuration, Node.js 16 type definitions, TypeScript 4.7, ESLint 7, and typescript-eslint 5. The project now develops and tests against Node.js 22 as pinned in `.nvmrc`.

Update the direct development dependencies to actively supported, mutually compatible versions without changing production dependencies or application behavior. Treat major-version upgrades as migrations: review their release notes, update configuration where required, and document any package intentionally held back.

## Requirements

- Inventory every direct entry in `devDependencies` and determine its latest compatible supported version.
- Align the TypeScript and Node.js development configuration with the Node.js 22 runtime.
- Upgrade related packages as compatible groups, especially:
  - TypeScript, `ts-node`, `@types/node`, and the shared `@tsconfig` package.
  - ESLint, `@typescript-eslint/parser`, and `@typescript-eslint/eslint-plugin`.
  - Mocha, Chai, and their type definitions.
  - Homey SDK type definitions.
- Review migration notes for each major-version change and make only the configuration or test changes required by those upgrades.
- Update `package-lock.json` using the Node.js version pinned in `.nvmrc`.
- Do not change `dependencies`, application runtime behavior, or generated application metadata as part of this task unless a required tooling migration makes that unavoidable and the reason is documented.
- Do not use `npm audit fix --force`. Evaluate security findings separately from compatibility upgrades and document any unresolved transitive findings.
- Record the before-and-after versions and explain any dependency that cannot safely be upgraded.

## Testing strategy

1. Capture the current lint, test type-check, build, and full test results before upgrading.
2. Upgrade compatible dependency groups incrementally so failures can be attributed to a specific migration.
3. Add or update focused configuration tests only where an automated regression check is practical; otherwise document why behavioral TDD does not apply to the dependency-only change.
4. Run all acceptance checks with Node.js 22.

## Acceptance criteria

- `package.json` contains supported, mutually compatible versions for all direct development dependencies, with any intentional hold documented in the resolution.
- The Node.js TypeScript types and shared TypeScript configuration target Node.js 22 rather than Node.js 12 or 16.
- `package-lock.json` matches `package.json` and installs reproducibly with the pinned Node.js/npm toolchain.
- `npm run lint` passes.
- `npx tsc -p tsconfig.test.json` passes.
- `npm run build` passes.
- `npm test` passes, including Homey app validation from the `posttest` hook.
- No production dependency or unrelated runtime-code changes are included.
- The resolution records exact verification results, important migration decisions, and any remaining dependency or audit limitations.

## Resolution

Updated the Node.js 22 development toolchain and migrated the configurations required by the new major releases.

### Changed files

- `package.json` and `package-lock.json`: upgraded the direct development toolchain and regenerated its locked dependency graph.
- `.eslintrc.json` and `eslint.config.mjs`: replaced legacy ESLint configuration with ESLint 10 flat configuration.
- `tsconfig.json` and `tsconfig.test.json`: aligned compilation and tests with Node.js 22 and TypeScript 6.
- `app.ts`: added type-only assertions required by TypeScript 6; emitted behavior is unchanged.
- `tests/setup.mjs`, `tests/chai-types.ts`, and the 30 existing Chai-based test files: added the Chai 6 ESM bridge and removed incompatible CommonJS runtime imports.

### Dependency changes

| Dependency | Before | After |
| --- | --- | --- |
| `@tsconfig/node12` / `@tsconfig/node22` | `^1.0.11` | `^22.0.5` |
| `@types/chai` | `^4.3.0` | `^5.2.3` |
| `@types/homey` alias | `homey-apps-sdk-v3-types@^0.3.3` | `homey-apps-sdk-v3-types@^0.3.12` |
| `@types/mocha` | `^10.0.10` | `^10.0.10` (already current) |
| `@types/node` | `^16.11.12` | `^22.20.1` |
| `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` | `^5.62.0` | Replaced by `typescript-eslint@^8.64.0` |
| `chai` | `^4.3.6` | `^6.2.2` |
| `eslint` | `^7.32.0` | `^10.7.0` |
| `mocha` | `^11.7.6` | `^11.7.6` (already current) |
| `ts-node` | `^10.9.2` | `^10.9.2` (already current) |
| `typescript` | `^4.7.4` | `^6.0.3` |
| New flat-config support | n/a | `@eslint/js@^10.0.1`, `globals@^17.7.0` |

TypeScript 7.0.2 was intentionally not selected because typescript-eslint 8.64.0 supports TypeScript versions below 6.1. Node type definitions were intentionally kept on the latest Node 22 release line rather than upgraded to Node 26, matching `.nvmrc` and the Homey runtime.

### Implementation decisions

- Replaced the removed ESLint legacy configuration with `eslint.config.mjs`, preserving the existing recommended rules, TypeScript project linting, ignore patterns, and deliberate rule exceptions. ESLint 10's new `preserve-caught-error` rule was disabled and caught-error handling retained its previous behavior to keep this tooling task from changing runtime code.
- Updated both TypeScript configurations for the Node 22 shared configuration, Node16 module resolution, and TypeScript 6's explicit type-loading behavior.
- Added erased type assertions in `app.ts` for eight existing boolean-or-number comparison expressions that TypeScript 6 now rejects. The emitted JavaScript and runtime behavior are unchanged.
- Chai 6 is ESM-only. The tests remain CommonJS TypeScript under `ts-node`, so `tests/setup.mjs` loads Chai as ESM and exposes `expect` to the existing suites. `tests/chai-types.ts` supplies its global type, and the obsolete runtime Chai imports were removed from 30 test files.
- Regenerated `package-lock.json` under Node.js 22.14.0 and npm 10.9.2. TDD was not applicable to dependency metadata itself; a pre-upgrade baseline was captured, the Chai bootstrap was verified with a focused test, and the complete suite was then run.

### Verification

- `npm install --package-lock-only --ignore-scripts --legacy-peer-deps`: passed; updated the dev graph while retaining the unchanged private `@balmli/homey-logger` lock entry.
- `npm install --ignore-scripts --legacy-peer-deps`: passed; installed the migrated graph.
- `npm ls --depth=0`: passed with all selected direct versions and no invalid peer dependencies.
- `npm run lint`: passed with ESLint 10.7.0.
- `npx tsc -p tsconfig.test.json`: passed with TypeScript 6.0.3.
- `npm run build`: passed with TypeScript 6.0.3.
- Focused Chai bootstrap check (`tests/calculateFeelsLike.ts`): 3 passing.
- `npm test`: 81 passing; the `posttest` hook validated the app successfully at Homey publish level.
- `git diff --check`: passed.

### Remaining limitations

- A clean `npm ci` reaches the unchanged private `@balmli/homey-logger@1.0.0` download but receives HTTP 401 from GitHub Packages because the configured local credential is invalid. This is an external authentication limitation rather than a lockfile or dev-dependency resolution failure; installation succeeds when the already-authorized package is present. A valid GitHub Packages token is required to repeat a completely clean install.
- `npm audit` reports four development-only findings: one low-severity `diff` finding, two moderate findings (`js-yaml` and the aggregate Mocha report), and one high-severity `serialize-javascript` finding. They are transitive dependencies of the latest Mocha and ts-node releases. No production dependency is affected. Major transitive overrides and `npm audit fix --force` were intentionally avoided because they would bypass the direct packages' declared compatibility ranges.
