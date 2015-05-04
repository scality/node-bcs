'use strict';
var util = require('util');

var Readable = require('stream').Readable;
var CSECTION = require('./node_types');

// Since the serialized file represents an inorder
// traversal, order is important. The underlying
// ConfigSection objects can't change after they've been pushed to the stream.

// So this class could simply traverse the tree and push as it goes
// or...
// if you assume the parser or client code that is building
// the CS is doing it in the right order,
// just maintain a pointer up to the last pushed node,
// and always push a flat serialization of that node (don't recurse)
// (could throw an exception if out of order)

function ConfigSectionReadableStream(cs, options) {
    Readable.call(this, options);
    this.cs = cs;
    this.indexPath = '';
}

util.inherits(ConfigSectionReadableStream, Readable);
module.exports = ConfigSectionReadableStream;

ConfigSectionReadableStream.prototype._read = function(n) {
    console.log('_read', n, this.indexPath);

    var context = this.cs.getObjectAtIndexPath(this.indexPath);

    if (context === undefined) {
        this.popIndexPath(); // have processed all children
        var parent = this.cs.getObjectAtIndexPath(this.indexPath);
        console.log('push', parent.getEndString());
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
        console.log('push', context.getStartString());
        this.push(context.getStartString());
        this.pushIndexPath(); // process my first child next
    } else { // attribute or object
        console.log('push', context.getBinary());
        this.push(context.getBinary());
        this.incrementIndexPath(); // to my next sibling
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
    console.log('iip', indexes);
};

ConfigSectionReadableStream.prototype.popIndexPath = function() {
    var indexes = this.indexPath.split('.');
    indexes = indexes.slice(0, indexes.length - 1);
    this.indexPath = indexes.join('.');
};
