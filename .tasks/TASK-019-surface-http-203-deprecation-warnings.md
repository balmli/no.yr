---
id: TASK-019
title: "HTTP 203 deprecation responses are not surfaced as warnings"
status: done
priority: medium
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F5"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f5"]
related: []
---

# HTTP 203 deprecation responses are not surfaced as warnings
**Severity:** Medium


**Terms:** A deprecated product version is signaled by status 203 and should be logged and/or shown as a warning.

**Evidence:** `lib/yr_lib.ts:207-219` accepts 200 and 203 identically and logs both only through the generic successful-fetch debug message. There is no explicit deprecation warning or user-visible signal.

**Impact:** A deprecated endpoint may be terminated (the Terms say usually after about one month) without maintainers or users receiving a clear actionable warning.

**Recommendation:** Treat 203 as successful data plus a prominent warning. Log the endpoint and status at warning level, report it through diagnostics/telemetry if available, and avoid clearing the warning until the endpoint is updated.

## Resolution

- HTTP 203 remains a successful payload response but now emits a warning-level diagnostic explicitly identifying deprecation, status 203, and the endpoint path without query coordinates.
- Extended `tests/nativeFetch.ts` to capture logger warnings and assert the deprecation message and structured endpoint/status fields.
- TDD evidence: the focused transport suite first failed with zero warnings, then passed with `6 passing` after the implementation.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `78 passing`, and the Homey publish validation passed.
- The app has no configured diagnostics/telemetry channel beyond its structured logger, so the persistent warning is surfaced through that available mechanism.
- The cited local `MET_API_TERMS_REVIEW.md` was unavailable in this checkout; the task record supplied the compliance evidence.
