---
id: TASK-027
title: "Repair ESLint configuration and restore a usable lint gate"
status: done
priority: medium
type: tooling
source: REBRANDING_TODO.md
source_ref: "Final verification: npm run lint"
created: 2026-07-16
updated: 2026-07-16
labels: [eslint, typescript, release-gate]
related: []
---

# Repair ESLint configuration and restore a usable lint gate

## Context

`npm run lint` currently reports roughly 20,000 project-wide style and module-resolution findings because the JavaScript-oriented Athom configuration is being applied to TypeScript source and tests without suitable TypeScript/test configuration.

## Requirements

- Configure ESLint for the repository's TypeScript source and Mocha tests.
- Separate real defects from mechanical formatting noise.
- Apply safe formatting fixes without changing runtime behavior.
- Document or narrowly suppress any intentional exceptions.

## Acceptance criteria

- `npm run lint` completes successfully and is suitable as a release gate.
- TypeScript source and tests are included with correct parser/module resolution.
- The build and full test suite still pass.

## Resolution

- Replaced the JavaScript-oriented Athom preset with `@typescript-eslint/parser` and the matching recommended rule set, using a dedicated `tsconfig.eslint.json` that includes app, API, driver, library, and test TypeScript.
- Added a Mocha test override and removed the obsolete `eslint-config-athom` dependency. The lint command now targets the complete authored TypeScript surface explicitly.
- Narrowly excluded only bundled/generated Moment JavaScript and declaration artifacts. Legacy-compatible rules for explicit `any`, CommonJS requires, non-null assertions, and existing double-negation style are documented in the configuration rather than generating mechanical churn.
- Fixed genuine findings: unused parameters/imports/variables, one empty-interface alias, redundant runtime truthiness, and stale date-format escapes. No runtime behavior was intentionally changed.
- Baseline evidence: the old configuration failed with `21,397 problems` (`20,807 errors`, `590 warnings`). The final `npm run lint` completes successfully with zero errors or warnings.
- Verification on Node.js 22: `npx tsc -p tsconfig.test.json` passed; `npm run build` passed; `npm test` passed with `81 passing`, and the Homey publish validation passed.
- The cited local `REBRANDING_TODO.md` was unavailable in this checkout; the task record supplied the acceptance criteria.
