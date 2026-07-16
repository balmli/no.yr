# Local task workspace

This directory contains the backlog for findings that were extracted from local source review documents. The task files and agent instructions are committed to Git, while the directory is excluded from Homey release packages through `.homeyignore`. The three original reports are retained locally as read-only context and must never be staged or committed:

- `BUG_REPORT.md`
- `MET_API_TERMS_REVIEW.md`
- `REBRANDING_TODO.md`

## Task file standard

Each actionable issue has exactly one file named `TASK-###-slug.md`.

- `TASK-###` is a unique, zero-padded, monotonically increasing identifier. Never reuse or renumber an ID.
- `slug` is a short lowercase kebab-case summary.
- One file must describe one independently completable outcome. Use `related` for overlap and `blocked_by` for dependencies instead of combining separate outcomes.
- New tasks start with the next unused ID. The next available ID is `TASK-032`.

Every task begins with YAML frontmatter using this schema:

```yaml
---
id: TASK-032
title: "Short action-oriented title"
status: open
priority: medium
type: bug
source: BUG_REPORT.md
source_ref: "BUG-015"
created: 2026-07-16
updated: 2026-07-16
labels: [bug]
related: []
blocked_by: []
---
```

Required fields are `id`, `title`, `status`, `priority`, `type`, `source`, `source_ref`, `created`, `updated`, `labels`, and `related`. Add `blocked_by` when applicable.

Allowed values:

- `status`: `open`, `in_progress`, `blocked`, `done`, `wont_fix`
- `priority`: `critical`, `high`, `medium`, `low`
- `type`: `bug`, `compliance`, `rebranding`, `testing`, `tooling`, `coordination`, `documentation`

## Handling tasks

1. Read the complete task and its cited source report before changing code.
2. Check `related` and `blocked_by`; do not silently absorb another task's scope.
3. Update the task file throughout the work, not only at the end:
   - Set `status: in_progress` and update `updated` before making implementation changes.
   - Add useful progress notes, newly discovered constraints, and verification results as they become known.
   - Set `status: blocked` promptly when work cannot continue, and record the concrete blocker.
4. Prefer test-driven development whenever the behavior can be exercised automatically:
   - Add or update a focused test that fails for the reported issue.
   - Run it and confirm the expected failure.
   - Implement the smallest complete fix that makes the test pass.
   - Refactor only while the focused test remains green, then run the relevant broader suite.
   - If TDD is impractical, explain why in the task's `## Resolution` section and use the strongest feasible verification.
5. Keep implementation, tests, and documentation limited to the current task. Do not combine unrelated tasks in one worktree change or commit.
6. Run the task's verification plus relevant repository checks. Use Node.js 22 as pinned by `.nvmrc`.
7. Record a `## Resolution` section with the changed files, decisions, and exact verification results.
8. Set `status: done` only after all acceptance criteria pass. Use `blocked` with a concrete explanation when external input is required, or `wont_fix` with rationale for an intentional rejection.
9. Create one atomic commit for each completed task:
   - A commit must contain the complete fix for exactly one task, including its tests, required documentation, and updated `TASK-###-slug.md` file.
   - Do not mix opportunistic cleanup or another task into the commit.
   - Use a commit message that starts with the task ID, for example `TASK-004 Handle unknown weather symbols`.
   - Confirm the staged diff contains only the current task before committing.

Working directly on the main branch is allowed. Creating or switching to a feature branch is optional unless the user explicitly asks for one.

Do not edit the original reports to track progress, and never force-add or commit them. Task files are the version-controlled working records and their status must reflect the current state throughout execution. Before committing, set the task's final status, update its `updated` date, add the `## Resolution`, and stage that task file together with its implementation, tests, and documentation. The task ID in the commit message provides the durable link between the task record and its atomic commit.
