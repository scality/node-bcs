'use strict';
var fs = require('fs');
var util = require('util');

var CSECTION = require('./node_types');
var ConfigSectionBranch = require('./branch.js');
var ConfigSectionReadableStream = require('./readable_stream.js');

function ConfigSection(name) {
    ConfigSection.super_.call(this, name);
    this.nodetype = CSECTION.ROOT;
}

util.inherits(ConfigSection, ConfigSectionBranch);
module.exports = ConfigSection;

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

ConfigSection.prototype.getReadableStream = function() {
    return new ConfigSectionReadableStream(this);
}

// Convenience function for tests
ConfigSection.prototype.writeFile = function(filePath, options, callback) {
    var readStream = new ConfigSectionReadableStream(this);
    var writeStream = fs.createWriteStream(filePath, options);

    readStream.pipe(writeStream)
    .on('error', function(err) {
        console.log('error', err);
        if (callback) {
            process.nextTick(callback.call(this, err));
        }
    })
    .on('close', function() {
        if (callback) {
            process.nextTick(callback);
        }
    });
};
