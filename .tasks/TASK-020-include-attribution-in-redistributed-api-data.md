---
id: TASK-020
title: "redistributed API responses omit attribution and modification context"
status: done
priority: medium
type: compliance
source: MET_API_TERMS_REVIEW.md
source_ref: "F6"
created: 2026-07-16
updated: 2026-07-16
labels: ["met-api", "compliance", "f6"]
related: []
---

# redistributed API responses omit attribution and modification context
**Severity:** Medium


**Terms:** Open data requires appropriate credit, a license link, and an indication if changes were made. MET's licensing page recommends crediting MET Norway as the data source.

**Evidence:**

- The repository README provides clear attribution, links to CC BY 4.0 and MET's policy, states that data is parsed/selected/presented, and disclaims endorsement (`README.md:11-15`). This is good.
- The Homey API transforms and redistributes forecast data (`api.ts:70-142`) but its JSON responses contain no source, license URL, source URL, or modification statement.
- The compact public descriptions credit MET Norway (`README.txt:1` and `README.no.txt:1`) but do not include a license link or modification statement.

**Impact:** Consumers of the app's REST API can receive and further use transformed MET data without the attribution and license information that accompanied the project README. Whether the README alone is sufficient in every Homey distribution context is uncertain; including attribution with the redistributed data is safer and makes compliance portable.

**Recommendation:** Add stable metadata to weather and forecast API responses, for example `source: "MET Norway"`, the MET endpoint/product, `license: "CC BY 4.0 / NLOD 2.0"`, license URL, and a statement that the response is transformed/selected by the app. Ensure the Homey App Store listing exposes equivalent attribution and links.

## Resolution

- Added immutable `MET_ATTRIBUTION` metadata containing the source name/URL, CC BY 4.0 license name/URL, and a clear statement that the app selects, parses, transforms, and presents the source data.
- Embedded the attribution object in both current-weather and forecast REST responses so metadata travels with redistributed data.
- Added equivalent English and Norwegian attribution, license links, modification context, and non-endorsement text to the compact public app descriptions.
- Added `tests/attribution.ts`. The focused test first failed because the metadata module was absent, then passed with `1 passing` and verifies every required field.
- Verification: `npm run build` passed; Node.js 22 `npm test` passed with `79 passing`, and the Homey publish validation passed.
- The cited local `MET_API_TERMS_REVIEW.md` was unavailable in this checkout; the task record supplied the compliance evidence.
