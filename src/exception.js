'use strict';
var util = require('util');

// TODO: rename "ConfigSectionError"
function ConfigSectionException(message) {
    this.message = message;
}

util.inherits(ConfigSectionException, Error);
module.exports = ConfigSectionException;
