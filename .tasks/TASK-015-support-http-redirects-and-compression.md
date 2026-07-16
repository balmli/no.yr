---
id: TASK-015
title: "HTTP client does not support required redirects or compression"
status: open
priority: high
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F1"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f1"]
related: []
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
