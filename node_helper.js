const NodeHelper = require('node_helper');
const path = require('path');
const fs = require('fs');
const Log = require('logger');
const { RingApi } = require('ring-client-api');

const filename = 'saved.json';
const configFilename = path.resolve(`${__dirname}/${filename}`);

let saved = {
    configToken: '',
    receivedRefresh: '',
};

module.exports = NodeHelper.create({
    start: function () {
        readConfig();
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === 'RING_CONFIG') {
            if (!this.config) {
                this.config = payload;
                if (!this.config || !this.config.refreshToken) {
                    this.sendSocketNotification('RING_INVALID_CONFIG');
                    Log.error('MMM-RingAlarm: unable to connect - no refresh token provided');
                    return;
                }

                this.connect();
            } else if (this.panel) {
                this.sendSocketNotification('RING_ALARM_MODE_CHANGED', this.panel.data.mode);
            }
        } else if (notification === 'RING_SET_ALARM_MODE') {
            this.setAlarmMode(payload);
        } else if (notification === 'RING_ARM_HOME') {
            this.setAlarmMode('some');
        } else if (notification === 'RING_ARM_AWAY') {
            this.setAlarmMode('all');
        } else if (notification === 'RING_DISARM') {
            this.setAlarmMode('none');
        }
    },

    connect: async function () {
        try {
            // use the last-received refresh token from the api if we have one
            let refreshToken = saved.receivedRefresh;
            // but if we don't have one, or if the user has changed the config token
            // from whatever we last knew it as, use the config-provided one instead
            if (!refreshToken || saved.configToken !== this.config.refreshToken) {
                refreshToken = this.config.refreshToken;

                saved.configToken = this.config.refreshToken;
                writeConfig();
            }

            this.ringApi = new RingApi({
                refreshToken: refreshToken,
                debug: true
            });
        } catch (e) {
            this.sendSocketNotification('RING_CONNECT_FAILED', e);
            Log.error(`MMM-RingAlarm: unable to connect - error thrown when connecting: ${e}`);
            return;
        }

        const locations = await this.ringApi.getLocations();
        // todo: check locations, notify if < or > 1
        this.location = locations[0];

        this.ringApi.onRefreshTokenUpdated.subscribe(this.refreshTokenUpdated);

        for (const location of locations) {
            let haveConnected = false;
            location.onConnected.subscribe((connected) => {
                haveConnected = this.onConnected(location, connected, haveConnected);
            });

            this.panel = await location.getSecurityPanel();
            if (this.panel) {
                this.panel.onData.subscribe((data) => {
                    if (!this.alarmMode) {
                        this.alarmMode = data.mode;
                        return;
                    }

                    if (this.alarmMode !== data.mode) {
                        Log.log(`MMM-RingAlarm: mode changed. was ${this.alarmMode}, is ${data.mode}`);
                        this.alarmMode = data.mode;
                        this.sendSocketNotification('RING_ALARM_MODE_CHANGED', this.alarmMode);
                    }
                });

                this.sendSocketNotification('RING_ALARM_MODE_CHANGED', this.panel.data.mode);
            } else {
                Log.warn('MMM-RingAlarm: no security panel detected - unable to do anything.');
                this.sendSocketNotification('RING_NO_PANEL_DETECTED');
            }
        }
    },

    setAlarmMode: async function (state) {
        if (!this.location) {
            Log.error(`MMM-RingAlarm: attempted to set alarm to state ${state} but no location has been retrieved to set it on.`);
            return;
        }

        if (state !== 'all' && state !== 'some' && state !== 'none') {
            Log.error(`MMM-RingAlarm: unrecognized alarm mode: ${state}, ignoring.`);
            return;
        }

        try {
            await this.location.setAlarmMode(state);
        } catch(e) {
            Log.error(`MMM-RingAlarm: caught error setting alarm mode to '${state}': ${e}`);
            this.sendSocketNotification('RING_ALARM_MODE_CHANGED', this.alarmMode);
        }
    },

    refreshTokenUpdated: async function ({ newRefreshToken, oldRefreshToken }) {
        Log.log('MMM-RingAlarm: Refresh Token Updated: ', newRefreshToken);

        if (!oldRefreshToken) {
            return;
        }

        saved.receivedRefresh = newRefreshToken;
        writeConfig();
    },

    onConnected: function (location, connected, haveConnected) {
        let retval = haveConnected;
        if (!haveConnected && !connected) {
            return retval;
        } else if (connected) {
            retval = true;
        }

        const status = connected ? 'Connected to' : 'Disconnected from';
        Log.log(`MMM-RingAlarm: **** ${status} location ${location.name} - ${location.id}`);

        return retval;
    }
});

function readConfig () {
    try {
        const savedStr = fs.readFileSync(configFilename);
        saved = JSON.parse(savedStr);
    } catch (e) {
        saved = {};
    }
}

function writeConfig () {
    const savedStr = JSON.stringify(saved);
    fs.writeFileSync(configFilename, savedStr);
}
