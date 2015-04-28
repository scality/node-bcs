'use strict';
var util = require('util');

var CSECTION = require('./node_types'); // section constants
var ConfigSectionObject = require('./object');
var ConfigSectionException = require('./exception');

function ConfigSectionNode(name) {
    ConfigSectionNode.super_.call(this, name);
    this.nodevalue = undefined;
}

util.inherits(ConfigSectionNode, ConfigSectionObject);
module.exports = ConfigSectionNode;

ConfigSectionNode.prototype.isBranch = function() {
    return false;    
};

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
    return  (
        t === CSECTION.ATTRTEXT  || 
        t === CSECTION.ATTRINT   || 
        t === CSECTION.ATTRINT   || 
        t === CSECTION.ATTRFLOAT || 
        t === CSECTION.ATTRDOUBLE
    );
};

ConfigSectionNode.prototype.getBinary = function() {
    var t = this.getType();

    if (t === CSECTION.UNK) {
        throw new ConfigSectionException("CS Type invalid");
    }

    // todo: where does cs_mapping come from?
    if (!(t in this.cs_mapping)) {
        throw new ConfigSectionException("CS Type not known");
    }

    return "NYI"; // this.cs_mapping[t]["dump_bcs"](this.name, this.nodevalue);
};

ConfigSectionNode.prototype.getDict = function() {
    var dict = {};

    if (this.isAttr()) {
        dict["ATTR::" + this.name] = this.nodevalue.toString();
    } else {
        dict[this.name] = this.nodevalue.toString();
    }

    return dict;
};