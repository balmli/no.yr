# AGENTS.md

This file contains the authoritative repository guidance for coding agents working on this project.

## Project Overview

This repository contains a Homey SDK v3 app written in TypeScript. It provides weather forecasts from MET Norway and exposes the data through Homey device capabilities, Flow cards, and a small REST API.

Core features include:

- Locationforecast data for up to 10 days, with the timeseries cadence supplied by MET Norway
- Nowcast data at 5-minute resolution where MET radar coverage is available
- Current and forecast capabilities for temperature, rain, wind, pressure, humidity, clouds, fog, UV, sunrise, and sunset
- Homey Flow triggers, conditions, and actions
- Textual forecasts for supported Norwegian locations
- Public API endpoints for devices, current weather, and forecast data

Weather data is provided by MET Norway under CC BY 4.0. Preserve the attribution and modification notices when exposing or redistributing source data:

- https://docs.api.met.no/doc/License
- https://creativecommons.org/licenses/by/4.0/

## Development Environment and Commands

Homey runs apps on Node.js 24.16.0. Use the version pinned in [.nvmrc](.nvmrc).

```bash
# Compile TypeScript into .homeybuild/
npm run build

# Run the complete Mocha suite, then validate the Homey app in the posttest hook
npm test

# Check Prettier formatting and ESLint rules
npm run lint

# Format supported source, configuration, and documentation files
npm run format

# Check formatting without writing
npm run format:check

# Run one test file with the repository test bootstrap
TS_NODE_PROJECT=tsconfig.test.json TS_NODE_FILES=true npx mocha --require ts-node/register --require ./tests/setup.mjs tests/calculateFeelsLike.ts
```

Prettier is the source of truth for formatting. ESLint owns code-quality rules. After editing supported files, run `npm run format`, followed by `npm run lint`. Run `npm test` for behavior changes and before releases.

## Release Checklist

For every release:

1. Increment the semantic version in [.homeycompose/app.json](.homeycompose/app.json). This is the app release-version source; the `package.json` version is not the Homey App Store version.
2. Add matching user-visible release notes to both [README.md](README.md) and [.homeychangelog.json](.homeychangelog.json). Keep the English and Norwegian changelog entries aligned.
3. Run `npm test`. Its `posttest` hook runs `homey app validate`, which regenerates and validates the root [app.json](app.json).
4. Confirm that `.homeycompose/app.json`, generated `app.json`, the latest `README.md` release heading, and the latest `.homeychangelog.json` key contain the same version.

Never edit the generated root `app.json` as the source of a manifest change.

## Architecture

### App layer

[app.ts](app.ts) extends `Homey.App` and registers runtime Flow listeners. It uses helpers from [lib/flow_condition.ts](lib/flow_condition.ts) for capability checks and delegates forecast-specific operations to device instances.

The current Homey Compose definitions contain:

- 13 triggers
- 42 conditions
- 2 actions

Some capability-change triggers are declarative and do not require a listener in `app.ts`.

### Driver layer

[drivers/myr/driver.ts](drivers/myr/driver.ts) extends `Homey.Driver`. Pairing defaults to Homey's geolocation and creates a persistent random `syncTime` used to distribute requests throughout the hour.

### Device layer

[drivers/myr/device.ts](drivers/myr/device.ts) extends `Homey.Device` and owns the runtime state:

- Locationforecast and nowcast data
- Cache metadata and source-retrieval timestamps
- Fetch and capability-update schedules
- Capability migrations and dynamic capability management
- Availability tracking
- Textual forecast state
- Flow helper methods that need device data

The device delegates focused behavior to modules under `lib/` instead of keeping all scheduling, validation, and transformation logic in the Homey class.

### Library layer

Important modules include:

- [lib/yr_lib.ts](lib/yr_lib.ts): MET requests, parsing, textual forecasts, and forecast comparison/sum helpers
- [lib/types.ts](lib/types.ts): MET response types
- [lib/device_schedule.ts](lib/device_schedule.ts): fetch/update timer abstractions
- [lib/cache_schedule.ts](lib/cache_schedule.ts): scheduling that honors HTTP `Expires`
- [lib/update_schedule.ts](lib/update_schedule.ts): fetch/update deadline coordination
- [lib/http_cache.ts](lib/http_cache.ts): shared resource cache and in-flight request coalescing
- [lib/rate_limit.ts](lib/rate_limit.ts): application-wide 429 backoff
- [lib/nowcast.ts](lib/nowcast.ts): validity, location binding, rain calculations, and polling decisions
- [lib/weather_capabilities.ts](lib/weather_capabilities.ts): weather capability extraction and dynamic capability decisions
- [lib/location_cache.ts](lib/location_cache.ts): location-change invalidation and capability clearing
- [lib/sunrise.ts](lib/sunrise.ts): sun-event formatting and refresh decisions
- [lib/flow_condition.ts](lib/flow_condition.ts): safe Flow comparisons when capability data is unavailable
- [lib/api_forecast.ts](lib/api_forecast.ts), [lib/api_metadata.ts](lib/api_metadata.ts), and [lib/api_query.ts](lib/api_query.ts): public API mapping and validation
- [lib/attribution.ts](lib/attribution.ts): attribution returned by the public API

## Fetch and Update Scheduling

The app deliberately separates network fetches from capability updates.

### Locationforecast

- Initial fetch: two seconds after device initialization
- Nominal fetch cadence: hourly at the device's persistent `syncTime`
- Cache behavior: a later valid `Expires` value delays the next request
- Capability update: at second 3 of each hour

### Nowcast

- Initial fetch: five seconds after device initialization
- Nominal fetch cadence: every five minutes at `syncTime % 300`
- Cache behavior: a later valid `Expires` value delays the next request
- Capability update: at second 2 of every minute

The schedulers preserve pending update deadlines while fetches are running. `applyFetchedDataIfDue()` prevents a slow fetch from missing or duplicating the scheduled update.

Location or altitude changes invalidate location-bound caches, clear stale capability values, and trigger fresh fetches. Period changes refresh sun events when the selected date changes.

Do not add synchronized fixed-time requests or bypass the scheduler abstractions without considering request distribution, cache expiry, and fetch/update races.

## MET API Integration

The app currently uses:

```text
GET https://api.met.no/weatherapi/locationforecast/2.0/complete
GET https://api.met.no/weatherapi/nowcast/2.0/complete
GET https://api.met.no/weatherapi/sunrise/3.0/sun
GET https://api.met.no/weatherapi/textforecast/2.0/areas
GET https://api.met.no/weatherapi/textforecast/2.0/landoverview
```

All requests go through the centralized native-`fetch` implementation in `lib/yr_lib.ts`. The app does not use `http.min`.

Request rules:

- Identify the app with `WeatherForecastHomeyApp/{appVersion} github.com/balmli/weather.forecast`.
- Truncate latitude and longitude to at most four decimals with `truncate4()`; do not round them.
- Preserve the previous `Last-Modified` value exactly in `If-Modified-Since`.
- Honor `Expires` and HTTP 304 responses.
- Spread requests using the persistent device `syncTime`.
- Treat traffic above 20 requests per second per application as requiring prior agreement with MET Norway; do not describe this as a guaranteed capacity target.

See https://docs.api.met.no/doc/TermsOfService.html for the current terms.

### HTTP behavior

`doFetch()` uses Node.js native `fetch` and currently handles:

- `200`: normal success
- `203`: accepted for compatibility, with a deprecation warning
- `304`: cached data remains valid
- `422`: unsupported/unprocessable request; returns no data
- `429`: registers application-wide backoff from `Retry-After`, or a 60-second fallback
- Other non-success statuses and transport errors: logged as failures

The shared `HttpResourceCache` caches auxiliary resources by URL until expiry and coalesces simultaneous requests. Device-level weather and nowcast state retains `Last-Modified` and `Expires`; locationforecast also retains retrieval time for the public API.

Standard forecast failures count toward device unavailability. After five consecutive counted failures, the device becomes unavailable. Successful data or a valid 304 resets the count. Rate-limited/throttled requests do not count as availability failures.

Transient nowcast failures clear stale nowcast state and continue polling. Polling stops only when the API response confirms a permanent no-coverage state. Nowcast data is bound to the coordinates from which it was fetched and is rejected when stale or location-mismatched.

## Capabilities

The driver manifest defines 20 baseline capabilities. Migrations add sunrise/sunset capabilities to existing devices, and supported nowcast data dynamically adds:

- `measure_minutes_raining`
- `measure_rain.next_30_minutes`

Weather-dependent capabilities may be added or removed according to fields present in the MET response. Use `getWeatherCapabilityValues()` and `getCapabilityChanges()` rather than duplicating extraction logic in the device class.

Important existing IDs include:

- `measure_temperature`
- `measure_temperature.feels_like`
- `measure_rain.next_1_hour`
- `measure_rain_next_1_hour` (legacy custom capability still in use)
- `measure_rain.next_6_hours`
- `measure_rain_next_6_hours` (legacy custom capability still in use)
- `measure_temperature.min_next_6_hours`
- `measure_temperature.max_next_6_hours`
- `measure_wind_strength1`
- `measure_wind_direction`
- `measure_wind_angle`
- `measure_gust_strength1`
- `measure_thunder_next_1_hour`
- `measure_ultraviolet`
- `weather_description`

Capability IDs and Flow card IDs are public compatibility contracts. Do not rename them. When adding a capability to existing devices, add or extend a migration.

## Flow Implementation

Flow definitions are under:

- `.homeycompose/flow/triggers/`
- `.homeycompose/flow/conditions/`
- `.homeycompose/flow/actions/`

The main forecast patterns are:

- A specific future hour: `nextHoursComparer()`
- Any matching entry in a selected period: `periodComparer()`
- A sum over upcoming hours: `nextHoursSum()`
- A sum over a selected period: `periodSum()`

Safe current-value comparisons belong in `lib/flow_condition.ts`. Missing, `null`, `undefined`, or non-finite weather values must not accidentally satisfy a Flow condition.

When adding a Flow card:

1. Add its Homey Compose JSON definition.
2. Preserve all required English and Norwegian text.
3. Register a listener in `app.ts` only when runtime logic is required.
4. Put reusable or data-oriented logic in an appropriate `lib/` module.
5. Add focused tests.
6. Run `npm test` to regenerate and validate `app.json`.

## Public Web API

[api.ts](api.ts) implements the manifest endpoints:

- `GET /api/app/no.yr/devices`
- `GET /api/app/no.yr/weather/:deviceId`
- `GET /api/app/no.yr/forecast/:deviceId?hours=24`

`/devices` returns configured `myr` devices and does not require a device ID. The weather and forecast endpoints require a valid device ID and available locationforecast data.

The forecast `hours` query is an integer from 1 through 240 and defaults to 24. Invalid strings, fractions, zero, negative values, unsafe integers, and values above 240 are rejected.

Current-weather and forecast responses include:

- Device identity and location
- `timestamp` and `generatedAt`
- Source timing (`sourceUpdatedAt`, `retrievedAt`, and optional `expiresAt`)
- MET Norway attribution and CC BY 4.0 license information
- Metric weather values

Forecast instant values are mapped in `lib/api_forecast.ts` and include calculated `feelsLike` only when all required inputs are available. Nowcast output is limited to the next hour and is returned only when the cached data is fresh and matches the current device location.

Any new endpoint that redistributes MET data must include the attribution object and source-timing metadata where applicable.

## Homey Compose and Generated Files

Source manifest files live under `.homeycompose/` and in `drivers/**/*.compose.json`. The root `app.json` is generated and committed.

When adding a custom capability:

1. Add its definition under `.homeycompose/capabilities/` when a built-in Homey capability is not sufficient.
2. Add it to `drivers/myr/driver.compose.json` if it belongs on newly paired devices.
3. Add migration logic for existing devices.
4. Add extraction/update logic through the relevant library helper.
5. Add Flow definitions and listeners only when needed.
6. Run `npm test` to regenerate and validate `app.json`.

Do not edit `app.json` directly. `npm run build` compiles TypeScript; Homey validation is what regenerates the composed manifest.

## Localization

Application translations are in [locales/en.json](locales/en.json) and [locales/no.json](locales/no.json). Homey Compose definitions also contain localized fields. Preserve both English and Norwegian coverage when changing user-visible text.

Store descriptions are maintained separately in:

- [README.md](README.md): repository documentation and release notes
- [README.txt](README.txt): English Homey App Store description
- [README.no.txt](README.no.txt): Norwegian Homey App Store description

## Testing

Tests use Mocha, Chai, and TypeScript. The bootstrap in `tests/setup.mjs` is required for the current TypeScript/CommonJS test environment.

Prefer test-driven changes for pure logic:

1. Add or update a focused failing test.
2. Run the focused test with the full bootstrap command.
3. Implement the smallest complete fix.
4. Run the focused test again.
5. Run `npm run lint` and `npm test` before handing off the change.

The suite covers scheduling, caching, rate limiting, native fetch behavior, public API mapping, attribution, location invalidation, nowcast validity, capability extraction, Flow handling, sunrise edge cases, and weather utilities. Keep new logic outside Homey classes where practical so it can be unit tested without mocking the SDK.

## Dependencies

Production dependencies:

- `@balmli/homey-logger`: structured logging
- `feels`: feels-like calculations
- `xml2js`: textual forecast XML parsing

The project uses the native `fetch` supplied by Node.js 24.

Development tooling includes TypeScript, Mocha, Chai, ESLint, Prettier, `ts-node`, Homey SDK types, and Node.js 24 types.

## Important Constraints

- Preserve MET Norway attribution, identification, caching, and traffic-shaping requirements.
- Truncate coordinates to four decimals before creating MET URLs.
- Do not treat HTTP 429 responses as device-availability failures.
- Invalidate all location-bound state when latitude, longitude, or altitude changes.
- Reject stale or location-mismatched nowcast data.
- Preserve capability and Flow card IDs.
- Add migrations for capabilities that existing devices need.
- Do not edit generated `app.json` directly.
- Use Node.js 24.16.0 and the repository test bootstrap.
- Some behavior still requires verification on a real Homey device.

## Additional Resources

- MET Weather API: https://api.met.no/weatherapi
- MET Terms of Service: https://docs.api.met.no/doc/TermsOfService.html
- MET licensing: https://docs.api.met.no/doc/License
- Homey Apps SDK v3: https://apps.developer.homey.app
- Homey community topic: https://community.homey.app/t/66896
