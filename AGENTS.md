# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a Homey app that provides weather forecasts from MET Norway (Norwegian Meteorological Institute). The app uses Homey SDK v3 and TypeScript, offering comprehensive weather data integration with 60+ flow cards for home automation.

**Key Features:**
- Hourly weather forecasts (10 days ahead)
- Nowcast/immediate forecast (Nordic countries only, 5-minute resolution)
- 20+ weather capabilities (temperature, rain, wind, UV, clouds, etc.)
- Extensive Homey Flow integration with triggers, conditions, and actions
- Textual forecasts for Norway
- Dual API data sources for different forecast granularity

**License Note:** This app uses weather data from MET Norway under CC BY 4.0: https://docs.api.met.no/doc/License

## Development Commands

Homey v12.9.0 and newer run apps on Node.js 22. Use the version pinned in `.nvmrc` for development and tests.

```bash
# Build TypeScript to JavaScript
npm run build

# Run tests with Mocha
npm test

# Run tests and validate app structure
npm test  # posttest hook runs 'homey app validate' automatically

# Lint code
npm run lint

# Run a single test file
TS_NODE_PROJECT=tsconfig.test.json npx mocha --require ts-node/register tests/calculateFeelsLike.ts
```

## Release Checklist

For every release, complete these versioning steps before publishing:

1. Increment the semantic version in [.homeycompose/app.json](.homeycompose/app.json). This is the source manifest; never change the version only in the generated root `app.json`.
2. Add a matching version entry under “Release Notes” in [README.md](README.md), summarizing the user-visible changes.
3. Run `npm test` so Homey Compose regenerates and validates the root `app.json`.
4. Confirm that `.homeycompose/app.json`, the generated `app.json`, and the latest `README.md` release-note heading all contain the same version.

## Architecture Overview

### Layered Structure

The app follows a multi-layer architecture:

1. **App Layer** ([app.ts](app.ts))
   - Extends `Homey.App`
   - Registers all 60+ flow cards in `_initFlows()`
   - Sets timezone using `moment.tz.setDefault()`
   - Flow cards delegate logic to device instances

2. **Driver Layer** ([drivers/myr/driver.ts](drivers/myr/driver.ts))
   - Extends `Homey.Driver`
   - Handles device pairing with Homey's geolocation as default
   - Minimal logic, delegates to device

3. **Device Layer** ([drivers/myr/device.ts](drivers/myr/device.ts)) - Core business logic
   - Extends `Homey.Device`
   - Manages two parallel data fetching loops (standard + nowcast)
   - Updates 20+ device capabilities
   - Triggers flow cards with weather tokens
   - Handles capability migrations for version compatibility

4. **Library Layer** ([lib/yr_lib.ts](lib/yr_lib.ts))
   - API integration with Yr.no services
   - Data parsing and transformation
   - Weather condition evaluation functions
   - Flow comparison/sum logic helpers

### Dual Data Source Architecture

The app manages two independent weather data streams:

**Standard Forecast:**
- API: `https://api.met.no/weatherapi/locationforecast/2.0/complete`
- Resolution: Hourly
- Range: 10 days ahead
- Update cycle: Every hour (with random offset 0-3 seconds)
- Flow: `scheduleFetchData()` → `doFetchWeather()` → `scheduleUpdateDevice()` → `doUpdateDevice()`

**Nowcast (Nordic countries only):**
- API: `https://api.met.no/weatherapi/nowcast/2.0/complete`
- Resolution: 5 minutes
- Range: 1 hour ahead
- Update cycle: Every minute
- Flow: `scheduleFetchNowcast()` → `doFetchNowcast()` → `updateDeviceNowcast()`

### Key Architectural Patterns

**Separate Fetch and Update Cycles:**
- Weather data fetch runs hourly
- Device update runs every 3 seconds after the hour
- Allows multiple devices to sync without API overload
- Random offset (0-3 sec) distributes load

**Dynamic Capability Management:**
- Device adds/removes capabilities based on API response availability
- Some data isn't available for all locations (e.g., UV index)
- Uses `device.addCapability()` / `device.removeCapability()`
- Ensures clean UI without unsupported options

**Migration System:**
- Device runs migrations in `onInit()` to handle version upgrades
- Adds new capabilities or removes deprecated ones
- Ensures existing users get new features seamlessly

**Fault Tolerance:**
- Tracks consecutive API failures
- Sets device unavailable after 5 failures
- Allows recovery when API returns

## File Structure and Purpose

### Source Files

- [app.ts](app.ts) - Main app entry point, flow card registration (209 lines)
- [drivers/myr/device.ts](drivers/myr/device.ts) - Core device logic (623 lines)
- [drivers/myr/driver.ts](drivers/myr/driver.ts) - Driver pairing and setup
- [lib/yr_lib.ts](lib/yr_lib.ts) - API client and weather utilities
- [lib/types.ts](lib/types.ts) - TypeScript type definitions for Yr.no API
- [lib/legends.ts](lib/legends.ts) - Weather condition code descriptions
- [lib/math.ts](lib/math.ts) - Mathematical utilities (distance, bearing)
- [lib/moment-timezone-with-data.js](lib/moment-timezone-with-data.js) - Date/timezone handling

### Configuration Files

**.homeycompose/** - Source files that generate [app.json](app.json):
- [.homeycompose/app.json](.homeycompose/app.json) - Base app metadata
- [.homeycompose/capabilities/](.homeycompose/capabilities/) - Custom capability definitions (15+ files)
- [.homeycompose/flow/triggers/](.homeycompose/flow/triggers/) - 13 trigger definitions
- [.homeycompose/flow/conditions/](.homeycompose/flow/conditions/) - 45+ condition definitions
- [.homeycompose/flow/actions/](.homeycompose/flow/actions/) - 2 action definitions
- [drivers/myr/driver.compose.json](drivers/myr/driver.compose.json) - Driver manifest
- [drivers/myr/driver.settings.compose.json](drivers/myr/driver.settings.compose.json) - User settings

**Generated:**
- [app.json](app.json) - Complete app manifest (3446 lines, auto-generated by Homey CLI)

**Build Configuration:**
- [tsconfig.json](tsconfig.json) - TypeScript compiler config, outputs to `.homeybuild/`
- [package.json](package.json) - Dependencies and scripts

### Tests

All tests are in [tests/](tests/) directory using Mocha + Chai:
- [calculateFeelsLike.ts](tests/calculateFeelsLike.ts) - Wind chill calculations
- [degreesToText.ts](tests/degreesToText.ts) - Compass direction conversion
- [nextHoursSum_1.ts](tests/nextHoursSum_1.ts) - Period-based rain summation
- [periodComparer_1.ts](tests/periodComparer_1.ts) - Time range condition logic
- [parseTextforecastLandovervie_1.ts](tests/parseTextforecastLandovervie_1.ts) - Text forecast parsing
- [locationInPolygon_1.ts](tests/locationInPolygon_1.ts) - Area detection for regional forecasts

## Key Device Capabilities

The app exposes 20+ capabilities (see [.homeycompose/capabilities/](.homeycompose/capabilities/) for definitions):

**Standard Capabilities:**
- `measure_temperature` - Current temperature
- `measure_temperature.feels_like` - Feels-like temperature (wind chill)
- `measure_humidity` - Relative humidity
- `measure_pressure` - Air pressure
- `measure_wind_strength1` - Wind speed (m/s)
- `measure_wind_angle` - Wind direction (degrees)
- `measure_gust_strength1` - Gust speed (m/s)

**Forecast Capabilities:**
- `measure_temperature.min_next_6_hours` - Minimum temp next 6h
- `measure_temperature.max_next_6_hours` - Maximum temp next 6h
- `measure_rain_next_1_hour` - Rain amount next 1h (mm)
- `measure_rain_next_6_hours` - Rain amount next 6h (mm)
- `measure_rain_probability_next_1_hour` - Rain probability
- `measure_thunder_next_1_hour` - Thunder probability

**Nowcast Capabilities (Nordic only):**
- `measure_minutes_raining` - Minutes until rain starts
- `measure_rain_30_minutes` - Rain amount next 30 min (mm)

**Other Capabilities:**
- `measure_cloud_area_fraction` - Cloud coverage (%)
- `measure_fog_area_fraction` - Fog coverage (%)
- `measure_ultraviolet` - UV index
- `weather_description` - Current weather condition code

## Flow Card Implementation

### Flow Card Types

**Triggers** ([.homeycompose/flow/triggers/](.homeycompose/flow/triggers/)):
- Weather data updates (hourly)
- Capability value changes (cloudiness, rain, wind, etc.)
- Provides tokens for use in flow actions

**Conditions** ([.homeycompose/flow/conditions/](.homeycompose/flow/conditions/)):
- Current value comparisons (e.g., "Is temperature below X?")
- Future value checks (e.g., "Will it rain more than X mm in next 2-4 hours?")
- Period aggregations (e.g., "Is sum of rain above X mm in period?")

**Actions** ([.homeycompose/flow/actions/](.homeycompose/flow/actions/)):
- Display textual forecast (Norway only)
- Display nowcast data

### How Flow Cards Work

All flow cards are registered in [app.ts](app.ts) `_initFlows()` method:

1. **Simple capability checks** - Direct capability value comparison:
   ```typescript
   this.homey.flow.getConditionCard('02_measure_temperature_below')
       .registerRunListener(args => args.device.getCapabilityValue('measure_temperature') < args.value);
   ```

2. **Time-based comparisons** - Use `nextHoursComparer()` helper in device:
   ```typescript
   this.homey.flow.getConditionCard('02_temperature_next_hours_below')
       .registerRunListener((args, state) => args.device.nextHoursComparer(args, state,
           (ts: YrTimeserie, value: number) => (ts.data.instant.details.air_temperature as number) < value))
   ```

3. **Period aggregations** - Use `periodSum()` for accumulation over time:
   ```typescript
   this.homey.flow.getConditionCard('03_rain_sum_period_above')
       .registerRunListener((args, state) => args.device.periodSum(args,
           (ts: YrTimeserie) => ts.data.next_1_hours.details.precipitation_amount as number,
           (sum: number | undefined, value: number) => !!sum && sum > value));
   ```

4. **Autocomplete arguments** - Dynamic dropdowns for user input:
   ```typescript
   .getArgument('start')
   .registerAutocompleteListener((query, args) => args.device.onTimeStartAutocomplete(query, args));
   ```

### Helper Functions in Device

Device implements comparison/sum helpers that iterate through forecast timeseries:
- `nextHoursComparer(args, state, compareFn)` - Checks if condition is true in specific future hour
- `periodComparer(args, state, compareFn)` - Checks if condition is true in any hour within period
- `nextHoursSum(args, extractFn, compareFn)` - Sums values over future hours and compares
- `periodSum(args, extractFn, compareFn)` - Sums values over period and compares

## Working with .homeycompose Files

### Why .homeycompose?

Modern Homey SDK uses a compose-based approach where you define app components in separate files under [.homeycompose/](.homeycompose/), and Homey CLI generates the complete [app.json](app.json) manifest.

**Benefits:**
- Modular configuration (one file per capability, flow card, etc.)
- Easier to maintain and review
- Automatic merging of translations
- Reduces merge conflicts

### Making Changes

**To add a new flow card:**
1. Create a new JSON file in [.homeycompose/flow/triggers/](.homeycompose/flow/triggers/), [conditions/](.homeycompose/flow/conditions/), or [actions/](.homeycompose/flow/actions/)
2. Define the card structure with `id`, `title`, `args`, etc.
3. Add translations in `titleFormatted` for each locale
4. Register the flow card handler in [app.ts](app.ts) `_initFlows()`
5. Implement the logic in [device.ts](drivers/myr/device.ts)
6. Run `npm run build` to regenerate [app.json](app.json)

**To add a new capability:**
1. Create a JSON file in [.homeycompose/capabilities/](.homeycompose/capabilities/)
2. Define capability with `type`, `title`, `units`, `getable`, `setable`, etc.
3. Add the capability to the driver in [driver.compose.json](drivers/myr/driver.compose.json)
4. Update device logic in [device.ts](drivers/myr/device.ts) to fetch and set the capability value
5. Add migration in `onInit()` if adding to existing app

**To modify device settings:**
1. Edit [drivers/myr/driver.settings.compose.json](drivers/myr/driver.settings.compose.json)
2. Add setting fields with `id`, `type`, `label`, `value`, etc.
3. Access settings in device via `this.getSetting('settingId')`

### Localization

Translations are in [locales/en.json](locales/en.json) and [locales/no.json](locales/no.json). The app fully supports English and Norwegian.

## Web API

The app exposes a REST API that other Homey apps can use to query weather data. The API is defined in [api.ts](api.ts) and automatically registered by Homey when the `homey:manager:api` permission is present.

### Available Endpoints

**GET /api/app/no.yr/devices**
- Lists all weather devices configured in the app
- Returns: Array of devices with id, name, availability, and location

**GET /api/app/no.yr/weather/:deviceId**
- Gets current weather conditions for a specific device
- Parameters:
  - `deviceId` - The device ID (required)
- Returns: Current weather data including all capability values (temperature, rain, wind, etc.)

**GET /api/app/no.yr/forecast/:deviceId?hours=24**
- Gets weather forecast for the next X hours
- Parameters:
  - `deviceId` - The device ID (required)
  - `hours` - Number of hours ahead (1-240, default: 24)
- Returns:
  - Hourly forecast data with temperature, precipitation, wind, etc.
  - Nowcast data (5-minute resolution) if available for Nordic countries
  - Each forecast entry includes instant values and 1h/6h/12h predictions

### API Usage Examples

**From another Homey app:**
```javascript
// List all weather devices
const devices = await homey.api.getApiApp('no.yr').get('/devices');

// Get current weather for a device
const deviceId = devices[0].id;
const currentWeather = await homey.api.getApiApp('no.yr').get(`/weather/${deviceId}`);
console.log(`Temperature: ${currentWeather.current.measure_temperature}°C`);

// Get 12-hour forecast
const forecast = await homey.api.getApiApp('no.yr').get(`/forecast/${deviceId}?hours=12`);
forecast.forecast.forEach(entry => {
    console.log(`${entry.time}: ${entry.instant.temperature}°C, Rain: ${entry.next1Hour?.precipitationAmount}mm`);
});
```

**Response Structure - Current Weather:**
```json
{
  "deviceId": "abc123",
  "deviceName": "Home Weather",
  "location": {
    "latitude": 59.9139,
    "longitude": 10.7522,
    "altitude": 10
  },
  "timestamp": "2025-10-17T12:00:00.000Z",
  "current": {
    "measure_temperature": 15.2,
    "measure_humidity": 65,
    "measure_wind_strength1": 3.5,
    "measure_rain_next_1_hour": 0.2,
    // ... all other capabilities
  }
}
```

**Response Structure - Forecast:**
```json
{
  "deviceId": "abc123",
  "deviceName": "Home Weather",
  "location": { ... },
  "timestamp": "2025-10-17T12:00:00.000Z",
  "hoursRequested": 24,
  "forecast": [
    {
      "time": "2025-10-17T12:00:00Z",
      "instant": {
        "temperature": 15.2,
        "windSpeed": 3.5,
        "relativeHumidity": 65,
        "cloudAreaFraction": 50,
        // ... other instant values
      },
      "next1Hour": {
        "symbolCode": "partlycloudy_day",
        "precipitationAmount": 0.2,
        "probabilityOfPrecipitation": 30,
        "probabilityOfThunder": 0
      },
      "next6Hours": {
        "airTemperatureMin": 13.5,
        "airTemperatureMax": 16.8,
        "precipitationAmount": 1.2
      }
    }
    // ... more hourly entries
  ],
  "nowcast": {
    "available": true,
    "data": [
      {
        "time": "2025-10-17T12:05:00Z",
        "precipitationRate": 0.1,
        "precipitationAmount": 0.008
      }
      // ... 5-minute resolution for next hour
    ]
  }
}
```

### Implementation Notes

- The API automatically finds devices by the driver ID `myr`
- All endpoints require a valid device ID
- Weather data comes from the device's internal `_weatherData` and `_nowcastData` properties
- Nowcast data is only available for Nordic countries (Norway, Sweden, Denmark, Finland)
- The `hours` parameter is validated (1-240 range)
- Timestamps are returned in ISO 8601 format
- All measurements use metric units (°C, m/s, mm, %, hPa)

## Common Development Patterns

### Adding a New Weather Parameter

Example: Adding "dew point" capability

1. **Define capability** in [.homeycompose/capabilities/measure_dewpoint.json](.homeycompose/capabilities/measure_dewpoint.json):
   ```json
   {
     "type": "number",
     "title": { "en": "Dew Point", "no": "Doggpunkt" },
     "units": { "en": "°C" },
     "getable": true,
     "setable": false,
     "uiComponent": "sensor",
     "icon": "/assets/dewpoint.svg"
   }
   ```

2. **Add to driver** in [drivers/myr/driver.compose.json](drivers/myr/driver.compose.json) capabilities array

3. **Extract from API** in [device.ts:doUpdateDevice()](drivers/myr/device.ts):
   ```typescript
   if (ts.data.instant.details.dew_point_temperature !== undefined) {
       await this.setCapabilityValue('measure_dewpoint', ts.data.instant.details.dew_point_temperature);
   }
   ```

4. **Add migration** in [device.ts:onInit()](drivers/myr/device.ts):
   ```typescript
   if (!this.hasCapability('measure_dewpoint')) {
       await this.addCapability('measure_dewpoint');
   }
   ```

5. **Create flow cards** if needed in [.homeycompose/flow/conditions/](.homeycompose/flow/conditions/)

6. **Register flow handlers** in [app.ts:_initFlows()](app.ts)

### Understanding Time-Based Flow Conditions

Many flow cards let users check weather in future periods. The device implements these patterns:

**"Next hours" pattern** - Check specific hour in future:
- User selects "start" (e.g., "+2 hours")
- App finds timeseries entry for that specific hour
- Applies condition function to that entry

**"Period" pattern** - Check range of hours:
- User selects "from" and "to" (e.g., "2 to 6 hours later")
- App iterates all timeseries entries in that range
- Returns true if condition is true for ANY hour in period

**"Sum" pattern** - Accumulate values over period:
- User selects range (e.g., "0 to 3 hours later")
- App sums values (e.g., rain mm) across all hours
- Compares total against threshold

See [device.ts](drivers/myr/device.ts) methods `nextHoursComparer()`, `periodComparer()`, `nextHoursSum()`, `periodSum()` for implementation.

### Textual Forecast Feature (Norway Only)

The app provides textual forecasts using polygon-based area detection:

1. Fetches XML with forecast areas (polygons) from Yr.no
2. Parses XML using `xml2js`
3. Determines which polygon contains device location using point-in-polygon algorithm
4. Fetches textual forecast for that area
5. Displays in Flow action card

See [lib/yr_lib.ts:fetchTextForecastLandOverview()](lib/yr_lib.ts) and [lib/yr_lib.ts:locationInPolygon()](lib/yr_lib.ts).

## API Integration Details

### Yr.no API Endpoints

**Location Forecast:**
```
GET https://api.met.no/weatherapi/locationforecast/2.0/complete
Query params: lat, lon, altitude
Response: JSON with timeseries array (hourly for 10 days)
```

**Nowcast (Nordic only):**
```
GET https://api.met.no/weatherapi/nowcast/2.0/complete
Query params: lat, lon
Response: JSON with timeseries array (5-min resolution for 1 hour)
```

**Sunrise/Sunset:**
```
GET https://api.met.no/weatherapi/sunrise/2.0/.json
Query params: lat, lon, date, offset
Response: JSON with sunrise/sunset times
```

**Text Forecast Areas (Norway):**
```
GET https://api.met.no/weatherapi/textforecast/2.0/landoverview
Response: XML with polygon areas and forecast texts
```

### API Client Implementation

All API calls are in [lib/yr_lib.ts](lib/yr_lib.ts) using the `http.min` library:

- User-Agent header required: `WeatherForecastHomeyApp/1.4.4 github.com/balmli/weather.forecast`
- Handles JSON and XML responses
- Error handling with detailed logging
- Returns parsed data structures

**HTTP Status Code Handling in `doFetch()`:**
- `200, 203` - Success, returns data
- `422` - Unprocessable Entity (logged as info, returns null)
- `429` - Too Many Requests / Rate Limiting (logged as warning, returns null)
- Other errors - Logged as error, returns null

When rate limited (HTTP 429), the app handles it gracefully by:
- Logging a warning instead of an error
- Returning null to skip the current fetch
- Allowing the scheduled retry mechanism to automatically try again later
- Not marking the device as unavailable

### Rate Limiting and Caching

**Current Implementation:**
- Standard forecast: Fetched every hour
- Nowcast: Fetched every 5 minutes (300 seconds)
- Sunrise/Sunset: Fetched once per day during weather data fetch
- Textual forecast: Fetched once per day during weather data fetch
- Random offset (0-3 sec) prevents thundering herd
- Device stores last sync time in `device.store`
- Multiple devices coordinate to avoid duplicate API calls

**Yr.no API Rate Limit Rules:**
Per [MET Weather API Terms of Service](https://docs.api.met.no/doc/TermsOfService):
- **Hard limit:** 20 requests/second per application (total across all users)
- **Coordinate precision:** Max 4 decimal places (currently implemented via `math.round4()`)
- **Caching:** Must respect `Expires` and `Last-Modified` headers
- **User-Agent:** Required for all requests (currently: `WeatherForecastHomeyApp/{version} github.com/balmli/weather.forecast`)
- **Avoid synchronized requests:** Distribute requests to prevent bursts at fixed times

### How the App Avoids HTTP 429 Errors

**1. Randomized Request Timing**
- Each device generates a unique `syncTime` (0-3600 seconds) during pairing in [driver.ts:14](drivers/myr/driver.ts#L14)
- `syncTime` is stored in `device.store` and persists across app restarts
- Standard forecast: Devices schedule fetches at their specific `syncTime` within each hour
- Nowcast: Uses `syncTime % 300` to distribute requests across each 5-minute window
- Prevents all devices from requesting simultaneously (thundering herd problem)
- Example: Device A has syncTime=120 (fetches at :02:00), Device B has syncTime=2400 (fetches at :40:00)

**2. Scheduled Retry Logic**
- Failed requests (including 429) automatically retry on next scheduled cycle
- No exponential backoff needed since schedules are already spaced appropriately
- Device remains available during rate limit failures

**3. Efficient Data Fetching**
- Coordinates rounded to 4 decimals to maximize cache hits
- Single fetch per device per cycle (not per capability)
- Sunrise/sunset and textual forecast only fetched during main weather update

**4. Request Frequency Per Device**
Standard forecast cycle (hourly):
- 1x Location forecast request
- 1x Sunrise/sunset request (per day, reuses data throughout day)
- 1x Textual forecast areas request (only for Norway, optional)
- 1x Textual forecast data request (only for Norway, optional)
Total: ~4 requests/hour maximum per device

Nowcast cycle (5 minutes for Nordic countries):
- 1x Nowcast request
Total: ~12 requests/hour per device

**Total per device: ~16 requests/hour maximum**

**5. Multi-Device Scaling**
- With N devices, total app requests = N × 16 requests/hour
- Random offset spreads these across time
- At 20 req/sec limit (72,000 req/hour), theoretical max: ~4,500 devices
- In practice, recommend max 1,000-2,000 devices per Homey instance

**6. Cache Header Support**
✅ **Implemented:** The app now fully supports HTTP cache headers:
- Sends `If-Modified-Since` header with cached `Last-Modified` value
- Handles HTTP 304 (Not Modified) responses to avoid redundant data transfer
- Stores `Last-Modified` and `Expires` headers per device for both weather and nowcast data
- Automatically uses cached data when API returns 304

**Implementation Details:**
- Cache metadata stored in device properties: `_weatherLastModified`, `_weatherExpires`, `_nowcastLastModified`, `_nowcastExpires`
- [lib/yr_lib.ts:162-235](lib/yr_lib.ts#L162-L235) - Enhanced `doFetch()` with If-Modified-Since support
- [lib/yr_lib.ts:243-274](lib/yr_lib.ts#L243-L274) - `fetchWeather()` returns WeatherResult with cache headers
- [lib/yr_lib.ts:368-399](lib/yr_lib.ts#L368-L399) - `fetchNowcast()` returns WeatherResult with cache headers
- [drivers/myr/device.ts:188-272](drivers/myr/device.ts#L188-L272) - `doFetchWeather()` handles 304 responses
- [drivers/myr/device.ts:298-357](drivers/myr/device.ts#L298-L357) - `doFetchNowcast()` handles 304 responses

**Benefits:**
- Significantly reduces API load when weather data hasn't changed
- Lower risk of HTTP 429 rate limiting
- Complies with Yr.no Terms of Service cache requirements
- No bandwidth wasted transferring unchanged data

### Troubleshooting HTTP 429 Errors

**If users experience rate limiting:**

1. **Check number of devices:** Too many weather devices can exceed rate limits
   - Solution: Reduce to 1-2 devices per location, use multiple Homey instances for larger deployments

2. **Verify syncTime distribution:** All devices should have different `syncTime` values
   - Check: `this.getStoreValue('syncTime')` should vary across devices
   - Fix: Delete and re-add devices to regenerate random offset

3. **Inspect logs for request patterns:** Look for synchronized bursts
   - Check logs for multiple devices fetching at same second
   - Verify random offset is being applied (0-3 second spread)

4. **Temporary rate limiting:** API may throttle during high load periods
   - App will automatically recover on next fetch cycle
   - No user intervention needed

5. **Monitor cache effectiveness:** Check logs for HTTP 304 responses
   - More 304 responses = effective caching, fewer API requests
   - If you see many full fetches despite stable weather, check that cache headers are being stored correctly

### Best Practices for Rate Limit Compliance

**When Adding New API Endpoints:**
1. Always use the centralized `doFetch()` function in [lib/yr_lib.ts:155](lib/yr_lib.ts#L155)
2. Ensure proper User-Agent header (automatically handled by `doFetch()`)
3. Round coordinates to 4 decimals using `math.round4()`
4. Batch related requests together (e.g., sunrise and weather in same cycle)
5. Handle 429 responses gracefully (return null, don't throw errors)

**When Modifying Fetch Schedules:**
1. Maintain random offset mechanism (`syncTime`)
2. Don't increase fetch frequency without considering rate limits
3. Consider whether data really needs more frequent updates
4. Test with multiple devices to verify offset distribution

**Monitoring Rate Limit Health:**
- Check logs for HTTP 429 warnings
- Monitor `fetchFailures` store value per device
- Verify devices don't all have same `syncTime`
- Calculate total requests/hour: `num_devices × 16`

**Implementation Notes:**
- The 0-3 second random offset in [device.ts:176](drivers/myr/device.ts#L176) adds additional jitter on top of `syncTime`
- This double-randomization ensures even distribution across time
- Nowcast scheduling in [device.ts:262](drivers/myr/device.ts#L262) uses modulo arithmetic for 5-minute cycles
- Sunrise API only called once per weather fetch, not separately
- Textual forecast only enabled for Norwegian locations, reducing API load

## TypeScript Types

All Yr.no API response types are defined in [lib/types.ts](lib/types.ts):

- `YrProperties` - Root response structure
- `YrTimeserie` - Individual forecast entry
- `YrTimeserieInstant` - Current conditions
- `YrTimeserieNext1Hour` / `Next6Hours` / `Next12Hours` - Forecast periods
- `YrDetails` - Weather parameter values

When working with API data, always reference these types for intellisense and type safety.

## Testing Strategy

Tests focus on utility functions and data transformation logic:

- **Unit tests** for pure functions (math, conversions, comparisons)
- **Integration tests** for API parsing and flow logic
- No mocking of Homey SDK (tests run standalone)

To add a test:
1. Create file in [tests/](tests/) directory
2. Import function to test
3. Write test cases using Chai assertions
4. Run with `npm test` or `npx mocha -r ts-node/register tests/yourtest.ts`

## Build Output

- TypeScript compiles to `.homeybuild/` directory
- Homey CLI uses `.homeybuild/` for app packaging
- `.homeybuild/` is gitignored
- Generated [app.json](app.json) is committed to repository

## Important Notes

- **Do not edit app.json directly** - It's auto-generated from [.homeycompose/](.homeycompose/)
- **Capability IDs cannot change** - Breaking change for existing users
- **Flow card IDs cannot change** - Breaks existing user flows
- **Always add migrations** - When adding new capabilities to existing driver
- **Test with real Homey device** - Some features require actual hardware
- **Nowcast is Nordic-only** - Check radar coverage before enabling features
- **Respect Yr.no terms** - Proper User-Agent, rate limiting, attribution

## Dependencies

**Production:**
- `@balmli/homey-logger` - Structured logging with severity levels
- `feels` - Wind chill and heat index calculations
- `http.min` - Lightweight HTTP client for API calls
- `xml2js` - XML parsing for textual forecast areas

**Development:**
- `@types/homey` - Homey SDK v3 TypeScript definitions
- `typescript` - TypeScript compiler
- `mocha` + `chai` - Testing framework
- `ts-node` - Run TypeScript tests directly
- `eslint` + `eslint-config-athom` - Linting with Homey standards

## Additional Resources

- Yr.no API Documentation: https://api.met.no/weatherapi
- Homey SDK v3 Docs: https://apps-sdk-v3.developer.homey.app
- Homey Community Topic: https://community.homey.app/t/66896
