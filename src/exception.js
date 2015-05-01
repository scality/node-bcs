'use strict';
var util = require('util');

// TODO: rename "ConfigSectionError"
function ConfigSectionException(msg) {
    this.msg = msg;
}

util.inherits(ConfigSectionException, Error);

module.exports = ConfigSectionException;
