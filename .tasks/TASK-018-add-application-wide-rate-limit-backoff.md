---
id: TASK-018
title: "a 429 does not trigger application-wide immediate traffic reduction"
status: done
priority: high
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F4"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f4"]
related: []
---

# a 429 does not trigger application-wide immediate traffic reduction
**Severity:** High


**Terms:** Always inspect status codes and limit traffic immediately after a 429. The 20 requests/second limit applies to the whole application, not each client.

**Evidence:**

- `doFetch()` logs a 429 and returns `null` (`lib/yr_lib.ts:199-206`), but it does not expose the status or `Retry-After` to the scheduler.
- After a failed locationforecast fetch, previously cached `_weatherData` remains populated. The code can therefore continue immediately to sunrise and both textforecast requests (`drivers/myr/device.ts:227-263`).
- The locationforecast loop then resumes its ordinary hourly schedule (`drivers/myr/device.ts:264-270`) without shared backoff.
- A 429 from sunrise is caught, after which textforecast is still attempted (`drivers/myr/device.ts:234-262`).
- There is no application-wide request limiter or circuit breaker coordinating devices or endpoints.
- Nowcast stops rescheduling after any null result (`drivers/myr/device.ts:340-355`), which reduces traffic but conflates rate limiting, unsupported locations, and transient failures; it does not coordinate the other endpoints.

## Resolution

- Added a process-wide `RateLimitBackoff` shared by the common MET transport. Every device and endpoint checks the same deadline before making a network request.
- HTTP 429 now parses `Retry-After` as either delta-seconds or an HTTP date, uses a 60-second safe fallback when absent/invalid, and never shortens an existing longer deadline.
- Once a 429 is seen, subsequent locationforecast, nowcast, sunrise, and textforecast calls return without network traffic until the deadline. This also prevents auxiliary calls from continuing after a rate-limited primary or auxiliary request.
- Added `tests/rateLimitBackoff.ts` with delta/date/fallback/monotonic deadline coverage and extended `tests/nativeFetch.ts` to prove that a second endpoint call after 429 does not reach the local server.
- TDD evidence: the focused suite first failed because the rate-limit module was absent, then passed with `3 passing`; the transport integration also passed.
- Verification on Node.js 22: `npx tsc -p tsconfig.test.json` passed; `npm run build` passed; `npm test` passed with `78 passing`, and the Homey publish validation passed.
- The cited local `MET_API_TERMS_REVIEW.md` was unavailable in this checkout; the task record supplied the compliance evidence.

**Impact:** The app may issue more MET calls immediately after being told to reduce traffic. Independent devices can continue at their existing schedules. At sufficient adoption, randomized local schedules alone also cannot guarantee that aggregate traffic from all installations remains below the application-wide 20 requests/second threshold.

**Recommendation:** Return structured status information from `doFetch()`, including status code and `Retry-After`. On 429, activate an app-wide circuit breaker/backoff shared by all devices and MET endpoints, cancel or defer follow-up calls, add jitter, and gradually recover. For aggregate traffic across many Homey installations, monitor usage with MET and consider a shared caching proxy if traffic approaches the application-wide limit.
