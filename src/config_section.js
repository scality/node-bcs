'use strict';
var nodeTypes = require('./node_type');

function ConfigSection() {
    var nodeType = nodeTypes.CSECTION_ROOT;
}

ConfigSection.prototype.isRoot = function() {
    return true;
};

module.exports = ConfigSection;