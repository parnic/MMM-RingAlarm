# MMM-ScreenLogic

[MagicMirror²](https://github.com/MichMich/MagicMirror) module used to connect to Ring alarms. The current status of the alarm is displayed, and pressing the button allows changing the alarm mode (arming/disarming) optionally protected with a code.

## Installation

1. Navigate into your MagicMirror's `modules` folder and execute `git clone https://github.com/parnic/MMM-Ring.git`
2. `cd MMM-Ring`
3. Execute `npm install --production` to install the node dependencies. Note: Node 18+ is required.
4. Execute `npm run auth` and follow the instructions. Copy the resulting refresh token you receive for the config in the next step.
5. Add the module inside `config.js` placing it where you prefer. Make sure to set the refreshToken property to the one given by the previous step.

## Config

|Option|Type|Description|Default|
|---|---|---|---|
|`refreshToken`|String|Required. Contains the refresh token given by the `npm run auth` command which gives access to your account.|`''`|
|`pins`|Array of arrays of numbers|If one of the requirePin options is enabled, this is a list of valid codes to arm/disarm the alarm. Example: `[[1,2,3,4], [0,0,0,0]]`|`undefined`|
|`requirePinToArm`|Boolean|Whether to require a code when arming the alarm. If false, there is no security on arming the alarm. Requires at least one pin to be set in the `pins` property.|`false`|
|`requirePinToDisarm`|Boolean|Whether to require a code when disarming the alarm. If false, there is no security on disarming the alarm. Requires at least one pin to be set in the `pins` property.|`true`|

Here is an example of an entry in config.js

```js
{
    module: 'MMM-Ring',
    header: 'Ring alarm',
    position: 'top_left',
    config: {
        refreshToken: 'abcd1234=',
        pins: [[1,2,3,4], [0,0,0,0]],
        requirePinToArm: true
    }
},
```

## Screenshot

![Screenshot](/screenshot.png?raw=true "disarmed")

## Disclaimer

Once you've entered a refresh token, access to your account is stored on the device running MagicMirror. If someone else has access to these files, they can get a hold of your token and do anything with your account.

The client UI portion also has access to call functions on the server that will arm or disarm the system, including the ability to bypass the code (since that's enforced by the client, not the server). This means if someone has access to the client page to run arbitrary javascript functions, they can modify your alarm status from there.

I am not responsible for any unauthorized access to your alarm from the use of this module. You are responsible for securing the installation.

## Notes

Pull requests are very welcome! If you'd like to see any additional functionality, don't hesitate to let me know.
