# OLD VERSION!
This branch is currently a test for users that may have issues with the v5 Api. 
This is a fork of the V1.0.4 version of the plugin with the User Agent Fix.

# homebridge-chamberlain
A Homebridge plugin for Chamberlain garage door openers with MyQ.

# Installation
1) Install HomeBridge  - ```sudo npm i -g homebridge --unsafe-perm```
2) Install this plugin - ```sudo npm i -g homebridge-chamberlain```
3) Ensure your garages are connected to your MyQ account and fill out the ```config.json```

# Config
```json
{
  "accessory": "Chamberlain",
  "name": "Garage Door",
  "username": "your mychamberlain.com email",
  "password": "your mychamberlain.com password"
}
```

If you have multiple garage doors, the plugin will throw an error and list the controllable device IDs. Use those IDs to create individual accessories. Be sure to uniquely name the door via the "name" field, otherwise you'll get a UUID error in the console (`Error: Cannot add a bridged Accessory with the same UUID as another bridged Accessory`).

```json
{
  "accessory": "Chamberlain",
  "name": "Main Garage Door",
  "username": "your mychamberlain.com email",
  "password": "your mychamberlain.com password",
  "deviceId": "xxx"
},
{
  "accessory": "Chamberlain",
  "name": "Side Garage Door",
  "username": "your mychamberlain.com email",
  "password": "your mychamberlain.com password",
  "deviceId": "xxx"
},
...
```
If you experience any issues please see the [common issues](https://github.com/caseywebdev/homebridge-chamberlain/wiki/Common-Issues) page, before opening an issue.

```
