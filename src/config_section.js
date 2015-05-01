'use strict';
var util = require('util');

var CSECTION = require('./node_types');
var ConfigSectionBranch = require('./branch.js');

function ConfigSection(name) {
    ConfigSection.super_.call(this, name);
    this.nodetype = CSECTION.ROOT;
}

util.inherits(ConfigSection, ConfigSectionBranch);

ConfigSection.prototype.isRoot = function() {
    return true;
};

module.exports = ConfigSection;
