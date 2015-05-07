'use strict';
var fs = require('fs');
var util = require('util');
var Writable = require('stream').Writable;

var ConfigSection = require('./config_section');
var ConfigSectionException = require('./exception');
var CSECTION = require('./node_types');

function Parser(options) {
    Writable.call(this, options);
    this.chunks = [];
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
    this.readNodes();

    if (callback) {
        callback();
    }
};

Parser.prototype.readNodes = function() {
    var node = this.readNode();
    while (node) {
        node = this.readNode();
    }
};

Parser.prototype.readNode = function() {
    var node = this.readLine();
    return node;
};

// could be called "startNode"
Parser.prototype.readLine = function() {
    if (this.getAllChunksLength() < 1) {
        return null;
    }
    var firstLetter = this.chunks[0].slice(0, 1).toString();
    // console.log(firstLetter);

    switch (firstLetter) {
        case 'S': // root
            if (this.cs) {
                throw new ConfigSectionException("Multiple roots found");
            }
            return this.parseRoot();
        case 'B': // branch
            return this.parseBranch();
        case 'b': // end of branch
        case 's': // end of root (section)
            this.context = this.context.parent; // pop
            this.chomp(2); // 'b\n'
            if (!this.context) { // popped past root
                this.emit('close');
            }
            return true; // keep reading
        case 'V': // value
            return this.parseValue();
        case 'A':  // attribute
            return this.parseAttr();
        default:
            // if we have an incomplete text node
            throw new ConfigSectionException(
                'invalid line (starts with ' + firstLetter + ')');
    }
};

Parser.prototype.getAllChunksLength = function() {
    var sum = 0;
    for (var i in this.chunks) {
        sum += this.chunks[i].length;
    }
    return sum;
};

// if we can satisfy the request with the first buffer, return it.
// otherwise concat all of them
Parser.prototype.concatBufferForLength = function(n) {
    // console.log('concatBufferForLength', n, this.chunks[0].length);
    if (n <= this.chunks[0].length) {
        // console.log('return first chunk', n);
        return this.chunks[0];
    } else if (n <= this.getAllChunksLength()) {
        // console.log('concating!', n);
        return Buffer.concat(this.chunks);
    } else {
        throw new Error('asked for too much: ' + n);
    }
};

Parser.prototype.chomp = function(length) {
    // console.log('chomp', length, 'from', this.getAllChunksLength());
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

// helper, does not chomp
Parser.prototype.parseName = function() {
    if (this.getAllChunksLength() < 5) {
        return null;
    }
    var line = this.concatBufferForLength(5);
    var nameLength = parseInt(line.slice(1, 5).toString());

    if (this.getAllChunksLength() < 5 + nameLength) {
        return null;
    }

    line = this.concatBufferForLength(5 + nameLength);
    var name = line.slice(5, 5 + nameLength).toString();
    // console.log('parseName', line, nameLength, name);
    return name;
};

Parser.prototype.parseRoot = function() {
    var name = this.parseName();

    if (name === null) {
        return null;
    }

    var lengthNeeded = 1 + 4 + name.length + 1;

    if (this.getAllChunksLength() >= lengthNeeded) {
        // todo: assert next character is new line
        this.cs = new ConfigSection(name);
        this.context = this.cs;
        this.chomp(lengthNeeded);
        return this.cs;
    }

    return null;
};

Parser.prototype.parseBranch = function() {
    var name = this.parseName();

    if (name === null) {
        return;
    }

    var lengthNeeded = 1 + 4 + name.length + 1;

    if (this.getAllChunksLength() >= lengthNeeded) {
        // todo: assert next character is new line
        this.context = this.context.addBranch(name);
        this.chomp(lengthNeeded);
        return this.context;
    }
};

Parser.prototype.parseTimestamp = function(name, stringValue) {
    var timestamp = parseInt(stringValue, 10);

    // weird check for arbitrary future time
    if (timestamp > (new Date().getTime() / 1000) * 2) {
        timestamp = -1;
    }

    return this.context.addTimestamp(name, timestamp);
};

// Note: text may span multiple lines
// This just parses the length of the value (always padded to 12),
// and the first chunk of the value up to the end of the first line
Parser.prototype.parseTextOrRaw = function(type, name) {
    var lengthSoFar = 1 + 4 + name.length;

    // 12 for size, at least 1 for data
    if (this.getAllChunksLength() < lengthSoFar + 13) {
        return null;
    }

    var line = this.concatBufferForLength(lengthSoFar + 13);
    var index = lengthSoFar + 1; // start of size field
    var dataLength = parseInt(line.slice(index, index + 12), 10);
    var totalLength = index + 12 + dataLength;

    if (this.getAllChunksLength() < totalLength + 1) { // +1 for trailing \n
        return null; // wait for more chunks
    }

    index += 12;
    line = this.concatBufferForLength(totalLength + 1);
    var data = line.slice(index, index + dataLength);
    var node;

    switch (type) {
        case CSECTION.ATTRTEXT:
            // bugbug: preserve buffer for unicode?
            node = this.context.addAttrText(name, data.toString());
            break;
        case CSECTION.TEXTNODE:
            node = this.context.addText(name, data.toString());
            break;
        case CSECTION.RAWNODE:
            node = this.context.addRaw(name, data);
            break;
    }

    totalLength += 1; // for trailing \n
    this.chomp(totalLength);

    return node;
};

// todo: very similar to parseValue - should be refactored
Parser.prototype.parseAttr = function() {
    if (!this.cs) {
        throw new ConfigSectionException("Attribute without root");
    }

    var name = this.parseName();

    if (name == null) {
        return null;
    }

    var lengthNeeded = 1 + 4 + name.length + 2; // for at least one digit of data

    if (this.getAllChunksLength() <= lengthNeeded) {
        return null;
    }

    var line = this.concatBufferForLength(lengthNeeded);
    var index = 5 + name.length;
    var typeIndicator = line.slice(index, index + 1).toString();
    index += 1; // 1 past indicator
    var stringValue, node;

    switch (typeIndicator) {
        case 'I': // integer
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                // console.log('I', index, stringValue.length, 1);
                node = this.context.addAttrInt(name, parseInt(stringValue, 10));
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'L': // long
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.context.addAttrInt64(name, parseInt(stringValue, 10));
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'F': // float
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.context.addAttrFloat(name, parseFloat(stringValue));
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'T': // text (single line only)
            node = this.parseTextOrRaw(CSECTION.ATTRTEXT, name, line);
            break;
    }

    return node;
};

Parser.prototype.findFirstNewline = function() {
    var k = 0;
    for (var i in this.chunks) {
        var chunk = this.chunks[i];
        for (var j = 0; j < chunk.length; j++) {
            if (chunk[j] === 10) {
                // console.log('found newline at', i, j, k);
                return k;
            }
            k += 1;
        }
    }
    return -1;
};

Parser.prototype._getValueToNewline = function(b, start) {
    var eol = this.findFirstNewline();

    if (eol === -1) {
        return null; // don't have the full line
    } else {
        var line = this.concatBufferForLength(eol + 1);
        var length = eol - start;
        var s = line.slice(start, start + length).toString();
        // console.log('gvtnl', eol, start, length, '--'+s+'--');
        return s;
    }
};

Parser.prototype.parseValue = function() {
    if (!this.cs) {
        throw new ConfigSectionException("value without root");
    }

    var name = this.parseName();

    if (name == null) {
        return null;
    }

    var lengthNeeded = 1 + 4 + name.length + 2; // for at least one digit of data

    if (this.getAllChunksLength().length <= lengthNeeded) {
        return null;
    }

    var line = this.concatBufferForLength(lengthNeeded);
    var index = 5 + name.length;
    var typeIndicator = line.slice(index, index + 1).toString();
    index += 1; // 1 past indicator
    var stringValue, node;

    switch (typeIndicator) {
        case 'I': // integer
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.context.addInt(name, parseInt(stringValue, 10));
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'F':
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.context.addFloat(name, parseFloat(stringValue, 10));
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'L':
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.context.addInt64(name, parseInt(stringValue, 10));
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'B':
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.context.addBool(name,
                    parseInt(stringValue) === 0 ? false : true);
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'S': // timestamp
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.parseTimestamp(name, stringValue);
                this.chomp(index + stringValue.length + 1); // + 1 for \n
            }
            break;
        case 'T': // text
            node = this.parseTextOrRaw(CSECTION.TEXTNODE, name, line);
            break;
        case 'R': // raw
            node = this.parseTextOrRaw(CSECTION.RAWNODE, name, line);
            break;
        default:
            // todo: include line number, or complete line
            throw new ConfigSectionException(
                "BCS value type not recognized (" + typeIndicator + ")");
    }

    return node;
};
