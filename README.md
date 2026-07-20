# Weather Forecast

Weather Forecast from MET Norway.

### Installation

- Install the Weather device. The default location will be Homey’s location.
- Go to the device settings to select the forecast period (now, +1 hour, +2 hours, etc.).
- Locationforecast values update hourly. MET supplies one-hour values only for its short-range forecast; use “Rain next 30 minutes” for five-minute Nowcast updates where radar coverage is available.
- If necessary, the location can be changed by adjusting the longitude and latitude. The altitude is set automatically but can be adjusted to provide more accurate temperature readings.

### Data source and license

Weather data is provided by MET Norway and is used under the [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/). See the [MET Norway Licensing and Data Policy](https://docs.api.met.no/doc/License) for details.

The source data is parsed, selected and presented for use in Homey. This independently developed app is not created or endorsed by Yr, NRK or MET Norway.

### Release Notes:

#### 1.5.3

- Rebranded the app and weather device
- Replaced Yr branding and logos with original weather artwork
- Updated MET Norway attribution and API identification
- Updated the test setup for Node.js 22

#### 1.4.3

- Improvements to 'Starts raining in' capability

#### 1.4.2

- Small textual changes

#### 1.4.1

- Added setting for the raining threshold for immediate weather forecast
- Added 'Rain next 30 minutes' capability for immediate weather forecast
- Added triggers for 'Rain next hour (mm) changed', 'Rain next 6 hours (mm) changed' and 'Rain next 30 minutes (mm) changed'

#### 1.4.0

- Added support for immediate weather forecast for Nordic countries (Nowcast)

#### 1.3.0

- Added triggers for 'The wind strength changed' and 'The gust strength changed'

#### 1.2.2

- Fixed 'Is the sum of rain !{{|not}} above X mm starting Y to Z hours later' flow
- Fixed sunset and sunrise
- Fixed 'wind strength' and 'gust strength'

#### 1.2.1

- Added sunrise and sunset
- Support for textual forecast for Norway, for advanced flow

#### 1.1.1

- Fix issue if 'Altitude' has decimals

#### 1.1.0

- New conditions for UV for next hours and a period

#### 1.0.3

- New conditions for the weather situation for next hours and a period
- New conditions for checking rain (mm/h) for next hours and a period
- Fixed smaller issues

#### 1.0.2

- Adjustments for app store

#### 1.0.1

- Set the ID for Homey community

#### 1.0.0

- Initial release
