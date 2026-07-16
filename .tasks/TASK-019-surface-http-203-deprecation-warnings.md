---
id: TASK-019
title: "HTTP 203 deprecation responses are not surfaced as warnings"
status: open
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
