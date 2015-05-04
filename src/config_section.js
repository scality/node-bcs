'use strict';
var util = require('util');

var CSECTION = require('./node_types');
var ConfigSectionBranch = require('./branch.js');

function ConfigSection(name) {
    ConfigSection.super_.call(this, name);
    this.nodetype = CSECTION.ROOT;
}

util.inherits(ConfigSection, ConfigSectionBranch);
module.exports = ConfigSection;

ConfigSection.prototype.isRoot = function() {
    return true;
};

ConfigSection.prototype.getObjectAtIndexPath = function(path) {
    if (path.trim().length === 0) {
        return this;
    }

    var self = this;
    var context = self;
    var indexes = path.split('.');

    indexes = indexes.map(function(i) {
        return parseInt(i);
    });

    for (var j in indexes) {
        var index = indexes[j];

        if (index < context.attrList.length) {
            context = context.attrList[index];
        } else {
            var objIndex = index - context.attrList.length;
            context = context.objectList[objIndex];
        }
    }

    return context;
};
