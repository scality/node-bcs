'use strict';
var util = require('util');

var Readable = require('stream').Readable;
// var CSECTION = require('./node_types');

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
}

util.inherits(ConfigSectionReadableStream, Readable);
module.exports = ConfigSectionReadableStream;

ConfigSectionReadableStream.prototype._read = function(n) {
    console.log('_read', n);
    // output the next line
    this.push('hi'); // stop if returns false
    this.push(null);
    return this;
};
