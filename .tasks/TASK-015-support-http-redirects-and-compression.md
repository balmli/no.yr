---
id: TASK-015
title: "HTTP client does not support required redirects or compression"
status: done
priority: high
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F1"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f1"]
related: [TASK-031]
---

# HTTP client does not support required redirects or compression
**Severity:** High


**Terms:** Clients must support redirects and gzip compression (`Accept-Encoding: gzip, deflate`).

**Evidence:**

- `lib/yr_lib.ts:170-172` sends only `User-Agent` by default; it does not send `Accept-Encoding`.
- `package.json:17` pins `http.min` 2.1.0.
- The installed `http.min` 2.1.0 implementation reads the response directly as UTF-8 and has no decompression or redirect-following logic (`node_modules/http.min/index.js:47-63`).
- A 3xx response other than 304 is treated as an error by `lib/yr_lib.ts:207-213`, rather than followed.

**Impact:** This directly conflicts with the protocol and compression requirements. If MET enables compression for a response, parsing can fail; if an endpoint redirects, the request fails and can also create avoidable repeat traffic.

**Recommendation:** Replace `http.min` with a maintained HTTP client that follows redirects and transparently decompresses gzip/deflate, or implement and test both behaviors explicitly. Send `Accept-Encoding: gzip, deflate` and add automated tests for a compressed response and a redirect chain with a safe redirect limit.

## Resolution

- Resolved by the concrete native-fetch migration in TASK-031 (`cc6381d`). Node.js 22 fetch follows redirects with Undici's bounded redirect behavior and transparently decompresses gzip/deflate responses.
- The shared transport explicitly sends `Accept-Encoding: gzip, deflate`; `http.min` was removed from production dependencies and the lockfile.
- `tests/nativeFetch.ts` verifies a redirect into a gzip response, a deflate XML response, the compression request header, cache/request headers, status handling, timeout, and transport failure.
- Verification on Node.js 22: focused native transport/result tests passed with `7 passing`; `npm run build` passed; `npm test` passed with `73 passing`, and the Homey publish validation passed.
- TDD and implementation were intentionally kept in TASK-031 so the same transport migration was not duplicated across two related findings.
- The cited local `MET_API_TERMS_REVIEW.md` was unavailable in this checkout; the task record supplied the compliance evidence.
