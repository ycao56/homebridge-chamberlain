const _ = require('underscore');
const Api = require('./api');
const instance = require('./instance');

const ACTIVE_DELAY = 1000 * 2;
const IDLE_DELAY = 1000 * 10;

module.exports = class {
  constructor(log, {deviceId, name, password, username}) {
    this.log = log;
    this.api = new Api({MyQDeviceId: deviceId, password, username});

    const {Service, Characteristic} = instance.homebridge.hap;
    const {CurrentDoorState, TargetDoorState} = Characteristic;

    this.apiToHap = {
      // Legacy Values (leaving in case this is a defect with MyQ API)
      1: CurrentDoorState.OPEN,
      4: CurrentDoorState.OPENING,
      5: CurrentDoorState.CLOSING,
      // This one is unchanged
      2: CurrentDoorState.CLOSED,
      // New state for OPEN
      9: CurrentDoorState.OPEN,
      // API no longer supports state of OPENING/CLOSING
      0: -1
    };

    this.hapToApi = {
      [TargetDoorState.OPEN]: 1,
      [TargetDoorState.CLOSED]: 0
    };

    this.hapToEnglish = {
      [CurrentDoorState.OPEN]: 'open',
      [CurrentDoorState.CLOSED]: 'closed',
      [CurrentDoorState.OPENING]: 'opening',
      [CurrentDoorState.CLOSING]: 'closing'
    };

    this.currentToTarget = {
      [CurrentDoorState.OPEN]: TargetDoorState.OPEN,
      [CurrentDoorState.CLOSED]: TargetDoorState.CLOSED,
      [CurrentDoorState.OPENING]: TargetDoorState.OPEN,
      [CurrentDoorState.CLOSING]: TargetDoorState.CLOSED
    };

    const service = this.service = new Service.GarageDoorOpener(name);

    this.states = {
      doorstate:
        service
          .getCharacteristic(Characteristic.CurrentDoorState)
          .on('get', this.getCurrentDoorState.bind(this))
          .on('change', this.logChange.bind(this, 'doorstate')),
      desireddoorstate:
        service
          .getCharacteristic(Characteristic.TargetDoorState)
          .on('set', this.setTargetDoorState.bind(this))
          .on('change', this.logChange.bind(this, 'desireddoorstate'))
    };

    this.states.doorstate.value = CurrentDoorState.CLOSED;
    this.states.desireddoorstate.value = TargetDoorState.CLOSED;

    (this.poll = this.poll.bind(this))();
  }

  poll() {
    clearTimeout(this.pollTimeoutId);
    const {doorstate, desireddoorstate} = this.states;
    return new Promise((resolve, reject) =>
      doorstate.getValue(er => er ? reject(er) : resolve())
    ).then(() =>
      doorstate.value !== desireddoorstate.value ? ACTIVE_DELAY : IDLE_DELAY
    ).catch(_.noop).then((delay = IDLE_DELAY) => {
      clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = setTimeout(this.poll, delay);
    });
  }

  logChange(name, {oldValue, newValue}) {
    const from = this.hapToEnglish[oldValue];
    const to = this.hapToEnglish[newValue];
    this.log.info(`${name} changed from ${from} to ${to}`);

    if (name === 'doorstate') {
      this.reactiveSetTargetDoorState = true;
      this.states.desireddoorstate.setValue(this.currentToTarget[newValue]);
      delete this.reactiveSetTargetDoorState;
    }
  }

  getErrorHandler(cb) {
    return er => {
      this.log.error(er);
      cb(er);
    };
  }

  getCurrentDoorState(cb) {
    return this.api.getDeviceAttribute({name: 'doorstate'})
      .then(value =>{
        let hapValue = this.apiToHap[value];
        
        // HACK for API changes
        // If door is in a state of transition, make a best guess of opening/closing
        if(hapValue === -1) {
          // Check if target is to be open, if not assume close
          hapValue = (this.targetDoorState === 1)? this.apiToHap[4] : this.apiToHap[5]
        }

        cb(null, hapValue);
      })
      .catch(this.getErrorHandler(cb));
  }

  setTargetDoorState(value, cb) {
    if (this.reactiveSetTargetDoorState) return cb();

    value = this.hapToApi[value];
    this.targetDoorState = value;

    return this.api.setDeviceAttribute({name: 'desireddoorstate', value})
      .then(() => {
        this.poll();
        this.targetDoorState = null;
        cb();
      })
      .catch(this.getErrorHandler(cb));
  }

  getServices() {
    return [this.service];
  }
};
