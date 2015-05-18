'use strict';
var fs = require('fs');
var util = require('util');
var Writable = require('stream').Writable;

var ConfigSection = require('./config_section');
var ConfigSectionException = require('./exception');

function Parser(options) {
    Writable.call(this, options);
    this.chunks = [];

    // watch for input stream to finish so we can emit errors if input incomplete
    this.on('finish', this.onInputFinished.bind(this));
}

util.inherits(Parser, Writable);
module.exports = Parser;

// create a CS from a string
Parser.parseString = function(s) {
    var parser = new Parser();
    return parser.parseString(s);
};

// appends to this.cs based node described in string input
// expects a full line as input
// for convenience, adds a newline if it is missing
Parser.prototype.parseString = function(input) {
    input = input || '';

    // add \n if missing
    if (input[input.length - 1] !== '\n') {
        input += '\n';
    }

    this.chunks.push(new Buffer(input));
    this.readNodes();
    return this.cs;
};

// create a CS from a filePath
Parser.parseFile = function(filePath, options, callback) {
    var parser = new Parser();
    var readStream = fs.createReadStream(filePath, options);

    readStream.pipe(parser)
    .on('error', function(err) {
        callback(err);
    })
    .on('close', function() {
        callback(undefined, parser.cs);
    });

    return parser;
};

// creates a CS from a stream
Parser.prototype.parse = function(readStream, callback) {
    var self = this;

    readStream
    .pipe(this)
    .on('error', function(err) {
        console.error('Error occurred while reading stream', err);
        process.nextTick(function() {
            callback(err);
        });
    })
    .on('close', function() {
        callback(undefined, self.cs);
    });
};

// implementation of the WritableStream interface
// this interface allows the parser to be receive a .pipe()
Parser.prototype._write = function(chunk, encoding, callback) {
    // convert string input to Buffer
    if (typeof(chunk) === 'string') {
        chunk = new Buffer(chunk, "binary");
    }

    this.chunks.push(chunk);

    var error;

    try {
        this.readNodes();
    } catch (err) {
        error = err;
    }

    if (callback) {
        callback(error);
    }
};

Parser.prototype.getAllChunksLength = function() {
    var sum = 0;
    for (var i in this.chunks) {
        sum += this.chunks[i].length;
    }
    return sum;
};

// returns requested bytes of concatted chunks, null if insufficent data
// in most cases, will not need to concat
// slicing does not copy memory
Parser.prototype.peek = function(length) {
    if (this.chunks.length === 0) {
        return null;
    }

    if (length <= this.chunks[0].length) {
        return this.chunks[0].slice(0, length);
    } else if (length <= this.getAllChunksLength()) {
        return Buffer.concat(this.chunks).slice(0, length);
    }

    return null;
};

// crop specified length from the front of chunks
Parser.prototype.chomp = function(length) {
    var lengthSoFar = 0;
    while (lengthSoFar < length) {
        var lengthNeeded = length - lengthSoFar;
        if (this.chunks[0].length <= lengthNeeded) {
            lengthSoFar += this.chunks[0].length;
            this.chunks.shift();
        } else {
            // bugbug: lengthNeeded > length
            this.chunks[0] = this.chunks[0].slice(lengthNeeded);
            lengthSoFar += lengthNeeded;
        }
    }
};

// parse as many nodes as we can from chunks
Parser.prototype.readNodes = function() {
    var node = this.readNode();
    while (node) {
        node = this.readNode();
    }
};

// attempts to read a node from the data we have in chunks
Parser.prototype.readNode = function() {
    var node;

    var firstLetter = this.peek(1);
    firstLetter = firstLetter ? firstLetter.toString() : null;

    switch (firstLetter) {
        case null: // not enough data yet
            break;
        case 'S': // root
            return this.parseRoot();
        case 'B': // branch
            return this.parseBranch();
        case 'b': // end of branch
        case 's': // end of root
            this.context = this.context.parent; // pop
            this.chomp(2); // 'b\n'
            if (!this.context) { // popped past root, all done
                this.emit('close');
            }
            return true; // keep reading
        case 'V': // value
            return this.parseAttrOrValue(true);
        case 'A':  // attribute
            return this.parseAttrOrValue(false);
        default:
            console.log("Invalid CS", Buffer.concat(this.chunks).toString());
            throw new ConfigSectionException(
                'Invalid line (starts with ' + firstLetter + ')');
    }

    return node;
};

var NODE_TYPE_LENGTH = 1;
var NAME_SIZE_LENGTH = 4;
var BEFORE_NAME_LENGTH = NODE_TYPE_LENGTH + NAME_SIZE_LENGTH;

// reads "name" from "V0004nameI0"
// does not chomp (just a helper for functions below)
Parser.prototype.parseName = function() {
    var line = this.peek(BEFORE_NAME_LENGTH);

    if (!line) {
        return null;
    }

    var nameSize = parseInt(
        line.slice(NODE_TYPE_LENGTH, BEFORE_NAME_LENGTH).toString(), 10);

    line = this.peek(BEFORE_NAME_LENGTH + nameSize);

    if (!line) {
        return null;
    }

    var name = line.slice(BEFORE_NAME_LENGTH,
        BEFORE_NAME_LENGTH + nameSize).toString();

    return name;
};

var NEWLINE_LENGTH = 1; // '\n'.length

// read root from "S0007command"
Parser.prototype.parseRoot = function() {
    if (this.cs) {
        throw new ConfigSectionException("Multiple roots found");
    }

    var name = this.parseName();

    if (name === null) {
        return null;
    }

    var lengthNeeded = BEFORE_NAME_LENGTH + name.length + NEWLINE_LENGTH;

    if (this.peek(lengthNeeded)) {
        // todo: assert next character is new line
        this.cs = new ConfigSection(name);
        this.context = this.cs;
        this.chomp(lengthNeeded);
        return this.cs;
    }

    return null;
};

// read branch from "B0008cmd_desc"
Parser.prototype.parseBranch = function() {
    var name = this.parseName();

    if (name === null) {
        return;
    }

    var lengthNeeded = BEFORE_NAME_LENGTH + name.length + NEWLINE_LENGTH;

    if (this.peek(lengthNeeded)) {
        // todo: assert next character is new line
        this.context = this.context.addBranch(name);
        this.chomp(lengthNeeded);
        return this.context;
    }
};

var TYPE_INDICATOR_LENGTH = 1;

// helper function for readNode
Parser.prototype.parseAttrOrValue = function(isValue) {
    if (!this.cs) {
        throw new ConfigSectionException("Attribute or value without root");
    }

    var name = this.parseName();

    if (name == null) {
        return null;
    }

    var lengthNeeded = BEFORE_NAME_LENGTH + name.length +
        TYPE_INDICATOR_LENGTH + 1; // +1 for at least one digit of data

    var line = this.peek(lengthNeeded);

    if (!line) {
        return null;
    }

    var index = BEFORE_NAME_LENGTH + name.length;
    var typeIndicator = line.slice(index, index + TYPE_INDICATOR_LENGTH).toString();
    index += 1; // 1 past indicator
    var node;

    if (typeIndicator === 'T' || typeIndicator === 'R') {
        node = this.parseTextOrRaw(isValue, typeIndicator, name);
    } else {
        node = this.parseTypedAttrOrValue(isValue, typeIndicator, name);
    }

    return node;
};

// parses integers, floats, etc.
Parser.prototype.parseTypedAttrOrValue = function(isValue, typeIndicator, name) {
    var start = BEFORE_NAME_LENGTH + name.length + TYPE_INDICATOR_LENGTH;
    var stringValue = this.sliceToNewline(start);

    if (!stringValue) {
        return;
    }

    var node = this.createTypedAttrOrValueNode(isValue, typeIndicator, name,
        stringValue);

    if (node) {
        this.chomp(BEFORE_NAME_LENGTH + name.length + TYPE_INDICATOR_LENGTH +
            stringValue.length + NEWLINE_LENGTH);
        return node;
    }
};

Parser.prototype.createTypedAttrOrValueNode = function(isValue, typeIndicator,
    name, stringValue) {
    var node;

    switch (typeIndicator) {
        case 'I': // integer
            if (isValue) {
                node = this.context.addInt(name, parseInt(stringValue, 10));
            } else {
                node = this.context.addAttrInt(name, parseInt(stringValue, 10));
            }
            break;
        case 'L': // long
            if (isValue) {
                node = this.context.addInt64(name, parseInt(stringValue, 10));
            } else {
                node = this.context.addAttrInt64(
                    name, parseInt(stringValue, 10));
            }
            break;
        case 'F': // float
            if (isValue) {
                node = this.context.addFloat(name, parseFloat(stringValue));
            } else {
                node = this.context.addAttrFloat(name, parseFloat(stringValue));
            }
            break;
        case 'B': // bool
            node = this.context.addBool(name,
                parseInt(stringValue) === 0 ? false : true);
            break;
        case 'S': // timestamp
            node = this.parseTimestamp(name, stringValue);
            break;
    }

    return node;
};

// find the first newline character in chunks
Parser.prototype.findFirstNewline = function() {
    var k = 0;
    for (var i in this.chunks) {
        var chunk = this.chunks[i];
        for (var j = 0; j < chunk.length; j++) {
            if (chunk[j] === 10) {
                return k;
            }
            k += 1;
        }
    }
    return -1;
};

// get substring from start to newline
Parser.prototype.sliceToNewline = function(start) {
    var eol = this.findFirstNewline(); // warning: starts at beginning of line

    if (eol === -1) {
        return null; // don't have the full line
    } else {
        // todo: assert eol > start
        var line = this.peek(eol + 1);
        var length = eol - start;
        var s = line.slice(start, start + length).toString();
        return s;
    }
};

Parser.prototype.parseTimestamp = function(name, stringValue) {
    var timestamp = parseInt(stringValue, 10);

    // weird check for arbitrary future time (copied from python)
    if (timestamp > (new Date().getTime() / 1000) * 2) {
        timestamp = -1;
    }

    return this.context.addTimestamp(name, timestamp);
};

var TEXT_SIZE_LENGTH = 12;

// read "V0008metadataR000000000006{data}"
Parser.prototype.parseTextOrRaw = function(isValue, typeIndicator, name) {
    var lengthSoFar = NODE_TYPE_LENGTH + NAME_SIZE_LENGTH + name.length;

    var line = this.peek(lengthSoFar + TYPE_INDICATOR_LENGTH +
        TEXT_SIZE_LENGTH + 1); // we know data will be at least length 1

    if (!line) {
        return null;
    }

    var index = lengthSoFar + TYPE_INDICATOR_LENGTH; // start of size field
    var dataSize = parseInt(line.slice(index, index + TEXT_SIZE_LENGTH), 10);
    var totalLength = index + TEXT_SIZE_LENGTH + dataSize;

    line = this.peek(totalLength + NEWLINE_LENGTH);

    if (!line) {
        return; // wait for more chunks
    }

    index += TEXT_SIZE_LENGTH;
    var data = line.slice(index, index + dataSize);
    var node;

    switch (typeIndicator) {
        case 'T':
            if (isValue) {
                node = this.context.addText(name, data.toString());
            } else {
                node = this.context.addAttrText(name, data.toString());
            }
            break;
        case 'R':
            node = this.context.addRaw(name, data);
            break;
    }

    this.chomp(totalLength + NEWLINE_LENGTH);
    return node;
};

// checks to see if we are in an incomplete state
Parser.prototype.onInputFinished = function() {
    if (!this.cs) {
        this.emit('error',
            new Error('Input stream did not contain root node'));
    }

    if (this.context) { // in the middle of a node
        this.emit('error',
            new Error('Input stream incomplete'));
    }
};
