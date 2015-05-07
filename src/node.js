'use strict';
var util = require('util');

var CSECTION = require('./node_types'); // section constants
var ConfigSectionObject = require('./object');
var ConfigSectionException = require('./exception');
var formatters = require('./formatters');

function ConfigSectionNode(name) {
    ConfigSectionNode.super_.call(this, name);
    this.nodevalue = undefined;
}

util.inherits(ConfigSectionNode, ConfigSectionObject);
module.exports = ConfigSectionNode;

ConfigSectionNode.prototype.setType = function(newtype) {
    this.nodetype = newtype;
};

ConfigSectionNode.prototype.setValue = function(value) {
    this.nodevalue = value;
};

ConfigSectionNode.prototype.getValue = function() {
    return this.nodevalue;
};

ConfigSectionNode.prototype.isAttr = function() {
    var t = this.getType();
    return (
        t === CSECTION.ATTRTEXT  ||
        t === CSECTION.ATTRINT   ||
        t === CSECTION.ATTRINT64 ||
        t === CSECTION.ATTRFLOAT ||
        t === CSECTION.ATTRDOUBLE
    );
};

ConfigSectionNode.prototype.getString = function() {
    var t = this.getType();

    if (t === CSECTION.UNK) {
        throw new ConfigSectionException("CS Type invalid");
    }

    if (!(t in formatters)) {
        throw new ConfigSectionException("CS Type not known");
    }

    return formatters[t](this.name, this.nodevalue);
};

ConfigSectionNode.prototype.getBuffer = function() {
    var t = this.getType();

    if (this.nodevalue instanceof Buffer) {
        // use formatter for prefix, but don't convert buffer to string
        var prefix = formatters[t](this.name, '', this.nodevalue.length);
        prefix = prefix.substring(0, prefix.length - 1); // remove \n
        return Buffer.concat([
            new Buffer(prefix),
            this.nodevalue,
            new Buffer('\n')
        ], prefix.length + this.nodevalue.length + 1);
    } else {
        return new Buffer(this.getString());
    }
};

// warning: maintains Python compatibility
// Python Boolean True => "True"
// Javascript Boolean true => "true"
ConfigSectionNode.prototype.getDict = function() {
    var dict = {};
    var value = this.nodevalue;

    if (typeof(this.nodevalue) === 'boolean') {
        var s = this.nodevalue.toString();
        value = s[0].toUpperCase() + s.substring(1);
    } else {
        value = this.nodevalue.toString();
    }

    if (this.isAttr()) {
        dict["ATTR::" + this.name] = value.toString();
    } else {
        dict[this.name] = value;
    }

    return dict;
};

// convert to a JS object without parent reference
// Note: does not truncate long values
ConfigSectionNode.prototype.toObject = function() {
    var obj = ConfigSectionNode.super_.prototype.toObject.call(this);
    obj.value = this.getValue() || null;
    return obj;
};
