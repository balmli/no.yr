# Weather Forecast

Weather Forecast from Yr.no

### Installation

* Install the Yr device.  The default location will be the location of the Homey.
* Go to settings to set the Period (now, +1 hour, +2 hours, etc..)
* If necessary the location can be updated (longitude, latitude).  The altitude will be set automatically, and can be fine-tuned afterwards.

### Yr.no license:

This app uses weather data from Yr.no.  See the license here: https://developer.yr.no/doc/License/

The app is not created or endorsed in any way by Yr.no.

### Release Notes:

#### 1.4.3

- Improvements for 'Starts raining in' capability

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