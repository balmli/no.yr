---
id: TASK-027
title: "Repair ESLint configuration and restore a usable lint gate"
status: open
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
