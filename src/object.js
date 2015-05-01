'use strict';

var CSECTION = require('./node_types'); // section constants
var ConfigSectionException = require('./exception');

function ConfigSectionObject(name) {
    this.name = name || "none";
    this.nodetype = CSECTION.UNK;
    this.objectList = [];
    this.attrList = [];
}

module.exports = ConfigSectionObject;

ConfigSectionObject.prototype.isBranch = function() {
    throw new ConfigSectionException("not defined");
};

ConfigSectionObject.prototype.isRoot = function() {
    return false;
};

ConfigSectionObject.prototype.isAttr = function() {
    return false;
};

ConfigSectionObject.prototype.getType = function() {
    return this.nodetype;
};

ConfigSectionObject.prototype.getName = function() {
    return this.name;
};

ConfigSectionObject.prototype.isMultiline = function() {
    var t = this.getType();
    return (
        t === CSECTION.ATTRTEXT   ||
        t === CSECTION.RAWNODE    ||
        t === CSECTION.RAWNODENC  ||
        t === CSECTION.ATTRDOUBLE ||
        t === CSECTION.TEXTNODE
    );
};
