'use strict';
var util = require('util');

function ConfigSectionException(msg) {
    this.msg = msg;
}

util.inherits(ConfigSectionException, Error);

module.exports = ConfigSectionException;