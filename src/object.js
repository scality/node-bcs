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

ConfigSectionObject.prototype.getTypeName = function() {
    return Object.keys(CSECTION)[this.nodetype];
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

// convert to a JS object without parent reference
ConfigSectionObject.prototype.toObject = function() {
    return {
        name: this.name,
        type: this.getTypeName(),
        attrList: this.attrList.map(function(attr) { return attr.toObject() }),
        objectList: this.objectList.map(function(obj) { return obj.toObject() })
    }
}

// this is the function called by console.log to get string from object
ConfigSectionObject.prototype.inspect = function() {
    return JSON.stringify(this.toObject());
};
