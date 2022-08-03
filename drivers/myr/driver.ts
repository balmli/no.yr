import Homey from "homey";

const math = require('../../lib/math');

module.exports = class YrDriver extends Homey.Driver {

    async onInit() {
        this.log(`Driver onInit`);
    }

    async onPairListDevices(): Promise<any[]> {
        const lon = await this.homey.geolocation.getLongitude();
        const lat = await this.homey.geolocation.getLatitude();
        const syncTime = Math.round(Math.random() * 3600);

        return [
            {
                name: this.homey.__('device.name'),
                data: {
                    id: math.guid()
                },
                settings: {
                    lon,
                    lat
                },
                store: {
                    syncTime
                }
            }
        ];
    }

}