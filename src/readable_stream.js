'use strict';
var util = require('util');

var Readable = require('stream').Readable;
var CSECTION = require('./node_types');

// Iterates through the cs object using an index path
function ConfigSectionReadableStream(cs, options) {
    Readable.call(this, options);
    this.cs = cs;

    // An indexPath has the format '0.1.0.2' (the root is the empty string)
    // Attributes come before objects, which may be branches.
    this.indexPath = '';
}

util.inherits(ConfigSectionReadableStream, Readable);
module.exports = ConfigSectionReadableStream;

// The implementation of this function is what makes this class streamable
// TODO: The caller passes the number of bytes they'd like to read.
// Currently, this returns one node (the entire value) every time.
// So, this could be optimized using a loop to return the requested bytes.
ConfigSectionReadableStream.prototype._read = function(size) {
    var self = this;
    var context = this.cs.getObjectAtIndexPath(this.indexPath);

    if (!context) {
        this.popIndexPath(); // have processed all children
        var parent = this.cs.getObjectAtIndexPath(this.indexPath);
        this.push(parent.getEndString());

        if (this.indexPath === '') {
            this.push(null); // all done
        } else {
            this.incrementIndexPath(); // move to next branch
        }

        return;
    }

    var t = context.getType();

    if (t === CSECTION.ROOT || t === CSECTION.BRANCH) {
        this.push(context.getStartString());
        this.pushIndexPath(); // process my first child next
    } else if (t === CSECTION.RAWNODE &&
        context.getValue() instanceof Readable) {
        if (this.isStreamingFromContext) {
            // continue streaming
            this._readFromStream(context, size);
        } else {
            // start streaming
            this.push(context.getPrefix());
            this.isStreamingFromContext = true; // read from stream next time

            context.getValue().on('readable', function() {
                self._readFromStream(context, size); // using the last size?
            });

            context.getValue().on('end', function() {
                self.isStreamingFromContext = false;
                self.incrementIndexPath(); // to my next sibling
                self.push('\n');
            });
        }
    } else { // attribute or object
        this.incrementIndexPath(); // to my next sibling
        this.push(context.getBuffer()); // connect stream if available
    }
};

ConfigSectionReadableStream.prototype._readFromStream = function(context, size) {
    var stream = context.getValue();
    var data = stream.read(size);

    if (data) {
        this.push(data);
    }
};

ConfigSectionReadableStream.prototype.pushIndexPath = function() {
    if (this.indexPath.length === 0) {
        this.indexPath = '0';
    } else {
        this.indexPath += '.0';
    }
};

ConfigSectionReadableStream.prototype.incrementIndexPath = function() {
    var indexes = this.indexPath.split('.');
    var lastIndex = indexes.length - 1;
    var lastIndexValue = indexes[lastIndex];
    indexes[lastIndex] = parseInt(lastIndexValue, 10) + 1;
    this.indexPath = indexes.join('.');
};

ConfigSectionReadableStream.prototype.popIndexPath = function() {
    var indexes = this.indexPath.split('.');
    indexes = indexes.slice(0, indexes.length - 1);
    this.indexPath = indexes.join('.');
};
