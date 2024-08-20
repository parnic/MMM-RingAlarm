/* Magic Mirror
 * Module: MMM-RingAlarm
 *
 * By parnic https://github.com/parnic/MMM-RingAlarm
 * MIT Licensed.
 */

Module.register('MMM-RingAlarm', {
    defaults: {
        refreshToken: undefined,
        pins: undefined, // array of arrays, e.g. [[1,2,3,4], [0,0,0,0]],
        requirePinToArm: false,
        requirePinToDisarm: true
    },

    start: function () {
        this.sendSocketNotification('RING_CONFIG', this.config);

        this.createKeypad();
    },

    getStyles: function () {
        return ['ring.css'];
    },

    getDom: function () {
        if (!this.initialized) {
            let wrapper = document.createElement('div');
            wrapper.innerHTML = 'Loading Ring...';
            wrapper.className += 'dimmed light small text-center';

            return wrapper;
        } else if (this.changingMode) {
            let wrapper = document.createElement('div');
            // todo: make this look nicer. an overlay on the button or something instead.
            wrapper.innerHTML = 'Changing alarm mode...';
            wrapper.classList.add('dimmed', 'light', 'small', 'text-center');

            return wrapper;
        } else if (this.ringState !== 'good') {
            let wrapper = document.createElement('div');
            if (this.ringState === 'invalid-config') {
                wrapper.textContent = 'Configuration is invalid. Please verify the refresh token is set correctly.';
            } else if (this.ringState === 'connect-failed') {
                wrapper.textContent = 'Unable to connect to your Ring system. Please verify the refresh token is set correctly.';
            } else if (this.ringState === 'no-panel') {
                wrapper.textContent = 'No panel was detected in your system. Unable to use module.';
            }
            wrapper.classList.add('dimmed', 'light', 'small', 'text-center');
            return wrapper;
        }

        let wrapper = document.createElement('div');

        let btn = document.createElement('button');
        btn.classList.add('ring-control', 'light');
        btn.addEventListener('click', (evt) => {
            const isDisarming = this.alarmMode !== 'none';
            const isArming = !isDisarming;
            if (isDisarming) {
                this.desiredMode = 'none';
                if (this.config.requirePinToDisarm && Array.isArray(this.config.pins)) {
                    this.showKeypad(true);
                    return;
                } else {
                    Log.info('MMM-RingAlarm: no PIN required to disarm or no pins specified in config - disarming alarm');
                }

                this.setAlarmMode(this.desiredMode);
                return;
            }

            this.desiredMode = 'some';
            if (this.config.requirePinToArm && Array.isArray(this.config.pins)) {
                this.showKeypad(true);
                return;
            } else {
                Log.info('MMM-RingAlarm: no PIN required to arm or no pins specified in config - arming alarm home');
            }

            this.setAlarmMode(this.desiredMode);
        });
        wrapper.appendChild(btn);

        let btnStatus = document.createElement('div');
        btnStatus.innerHTML = this.alarmMode === 'none' ?
            'Status: <i class="fa fa-lock-open" aria-hidden="true"></i> Disarmed'
            : 'Status: <i class="fa fa-lock" aria-hidden="true"></i> Armed';
        btn.appendChild(btnStatus);

        let btnLabel = document.createElement('div');
        btnLabel.textContent = this.alarmMode === 'none' ? 'Press to arm Home' : 'Press to disarm';
        btn.appendChild(btnLabel);

        return wrapper;
    },

    showKeypad: function (show) {
        const pinBg = document.getElementById('ring-pin-bg');
        if (show) {
            pinBg.classList.remove('ring-d-none');
        } else {
            pinBg.classList.add('ring-d-none');
        }
    },

    createKeypad: function () {
        let bg = document.createElement('div');
        bg.classList.add('ring-pin-bg', 'ring-d-none');
        bg.id = 'ring-pin-bg';
        bg.addEventListener('click', (evt) => bg.classList.add('ring-d-none'));

        let wrapper = document.createElement('div');
        bg.appendChild(wrapper);
        wrapper.classList.add('ring-pin-outer');

        let header = document.createElement('div');
        wrapper.appendChild(header);
        header.classList.add('light', 'text-center', 'ring-pin-header');
        header.textContent = 'Enter alarm code';

        let container = document.createElement('div');
        container.classList.add('ring-pin-container');
        wrapper.appendChild(container);

        for (let i = 1; i <= 10; i++) {
            let btn = document.createElement('button');
            container.appendChild(btn);

            btn.textContent = (i % 10).toString();
            btn.classList.add('ring-control', 'light', 'ring-pin-btn');
            btn.addEventListener('click', (evt) => this.clickedKeypadButton(btn, evt));
        }

        const elems = document.getElementsByTagName('html');
        const root = elems[0];
        root.appendChild(bg);
    },

    clickedKeypadButton: function (btn, evt) {
        if (!this.pressedButtons) {
            this.pressedButtons = [];
        }

        const pressed = parseInt(btn.textContent);
        this.pressedButtons.push(pressed);

        evt.stopPropagation();

        const longestPin = this.config.pins.reduce((longest, val) => (val.length > longest ? val.length : longest), 0);
        while (this.pressedButtons.length > longestPin) {
            this.pressedButtons.shift();
        }

        for (const pin of this.config.pins) {
            if (this.pressedButtons.length < pin.length) {
                continue;
            }

            const startIdx = this.pressedButtons.length - pin.length;
            const endIdx = startIdx + pin.length;
            if (this.pressedButtons.slice(startIdx, endIdx).every((val, idx) => val === pin[idx])) {
                Log.info(`MMM-RingAlarm: matched PIN, changing alarm mode to ${this.desiredMode}`);
                this.showKeypad(false);
                this.setAlarmMode(this.desiredMode);
                this.pressedButtons.length = 0;
                return;
            }
        }

        Log.info('MMM-RingAlarm: no PINs matched entered sequence. Doing nothing.');
    },

    setAlarmMode: function (mode) {
        this.sendSocketNotification('RING_SET_ALARM_MODE', mode);
        this.changingMode = mode;
        this.updateDom();
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === 'RING_ALARM_MODE_CHANGED') {
            console.log('Alarm mode changed to', payload);
            this.ringState = 'good';
            this.initialized = true;
            this.changingMode = false;
            this.alarmMode = payload;
            this.updateDom();
        } else if (notification === 'RING_INVALID_CONFIG') {
            this.ringState = 'invalid-config';
        } else if (notification === 'RING_CONNECT_FAILED') {
            this.ringState = 'connect-failed';
        } else if (notification === 'RING_NO_PANEL_DETECTED') {
            this.ringState = 'no-panel';
        }
    },

    translateMode: function (mode) {
        switch (mode) {
        case 'some':
            return 'Armed Home';

        case 'all':
            return 'Armed Away';

        case 'none':
            return 'Disarmed';
        }

        return 'Unknown';
    },
});
