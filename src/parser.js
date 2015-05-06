'use strict';
var util = require('util');
var Writable = require('stream').Writable;

var ConfigSection = require('./config_section');
var ConfigSectionException = require('./exception');
var CSECTION = require('./node_types');

function Parser(options) {
    Writable.call(this, options);
    this.chunks = [];
    var self = this;

    this.on('finish', function() {
        console.log('got finish', this.getAllChunksLength());
        this.end('');
        this.emit('end');
        this.emit('close');
    });
}

util.inherits(Parser, Writable);
module.exports = Parser;

Parser.parseString = function(s) {
    var parser = new Parser();
    return parser.parseString(s);
};

// assumes nodes in string are terminated properly
// leaves this.cs waiting for further input
Parser.prototype.parseString = function(input) {
    input = input || '';

    if (input[input.length - 1] !== '\n') {
        input += '\n'; // maybe should throw exception?
    }

    this.chunks.push(new Buffer(input));
    this.readNodes();
    return this.cs;
};

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
    .on('end', function() {
        console.log('parse end', this.getAllChunksLength());

        // self.readNodes();

        process.nextTick(function() {
            console.log("callback");
            callback(undefined, self.cs);
        });
    });
};

// this interface allows the parser to be receive a .pipe()
// assumes input stream is UTF-8 encoded
// bugbug: make sure handles less than 1 line
Parser.prototype._write = function(chunk, encoding, callback) {
    if (typeof(chunk) === 'string') {
        chunk = new Buffer(chunk); // to make testing easier
    }

    this.chunks.push(chunk);
    console.log('_write', this.chunks.length, chunk.length);
    this.readNodes();

    if (callback) {
        process.nextTick(callback);
    }
};

Parser.prototype.readNodes = function() {
    var node = this.readNode();
    while (node) {
        node = this.readNode();
    }

    // if (this.getAllChunksLength() !== 0) {
    //     throw new Error('Leftover chunks');
    // }
};

Parser.prototype.readNode = function() {
    // console.log('readNode chunks:', this.chunks.length, this.getAllChunksLength());
    var allChunks = Buffer.concat(this.chunks, this.getAllChunksLength());
    var node = this.readLine(allChunks);
    console.log('readNode', node ? node.name : null);
    return node;
};

// could be called "startNode"
Parser.prototype.readLine = function(line) {
    if (line.length < 1) {
        return null;
    }
    var firstLetter = line.slice(0, 1).toString();

    // console.log('readLine', firstLetter.toString());

    switch (firstLetter) {
        case 'S': // root
            if (this.cs) {
                throw new ConfigSectionException("Multiple roots found");
            }
            return this.parseRoot(line);
        case 'B': // branch
            return this.parseBranch(line);
        case 'b': // end of branch
        case 's': // end of root (section)
            // console.log('context ^', this.context.parent.name);
            this.context = this.context.parent; // pop
            this.chomp(2); // 'b\n'
            return true; // keep reading
        case 'V': // value
            return this.parseValue(line);
        case 'A':  // attribute
            return this.parseAttr(line);
        default:
            // if we have an incomplete text node
            throw new ConfigSectionException(
                'invalid line (' + line + '), length: ' + line.length);
    }
};

Parser.prototype.getAllChunksLength = function() {
    var sum = 0;
    for (var i in this.chunks) {
        sum += this.chunks[i].length;
    }
    return sum;
};

Parser.prototype.chomp = function(length) {
    console.log('chomp', length);
    console.log('from', this.chunks.length, this.getAllChunksLength());
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
    console.log('chunk length remaining', this.chunks.length, this.getAllChunksLength());
};

// helper, does not chomp
Parser.prototype.parseName = function(line) {
    if (line.length < 5) {
        return null;
    }
    var nameLength = parseInt(line.slice(1, 5).toString());
    return line.slice(5, 5 + nameLength).toString();
};

Parser.prototype.parseRoot = function(line) {
    var name = this.parseName(line);

    if (name === null) {
        return null;
    }

    var lengthNeeded = 1 + 4 + name.length + 1;

    if (line.length >= lengthNeeded) {
        // todo: assert next character is new line
        this.cs = new ConfigSection(name);
        this.context = this.cs;
        this.chomp(lengthNeeded);
        return this.cs;
    }

    return null;
};

Parser.prototype.parseBranch = function(line) {
    var name = this.parseName(line);

    if (name === null) {
        return;
    }

    var lengthNeeded = 1 + 4 + name.length + 1;

    if (line.length >= lengthNeeded) {
        // todo: assert next character is new line
        this.context = this.context.addBranch(name);
        // console.log('context ->', name);
        this.chomp(lengthNeeded);
        return this.context;
    }
};

Parser.prototype.parseTimestamp = function(name, line) {
    var timestamp = parseInt(line, 10);

    // weird check for arbitrary future time
    if (timestamp > (new Date().getTime() / 1000) * 2) {
        timestamp = -1;
    }

    this.context.addTimestamp(name, timestamp);
};

// Note: text may span multiple lines
// This just parses the length of the value (always padded to 12),
// and the first chunk of the value up to the end of the first line
Parser.prototype.parseTextOrRaw = function(type, name, line) {
    var index = 1 + 4 + name.length + 1; // start of size field
    var dataLength = parseInt(line.slice(index, index + 12), 10);
    var totalLength = index + 12 + dataLength;

    if (line.length < totalLength + 1) { // +1 for trailing \n
        return null; // wait for more chunks
    }

    index += 12;
    var data = line.slice(index, index + dataLength);
    var node;

    // console.log('parseTextOrRaw', name, dataLength, totalLength, line.length);

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
Parser.prototype.parseAttr = function(line) {
    if (!this.cs) {
        throw new ConfigSectionException("Attribute without root");
    }

    var name = this.parseName(line);

    if (name == null) {
        return null;
    }

    var lengthNeeded = 1 + 4 + name.length + 2; // for at least one digit of data

    if (line.length <= lengthNeeded) {
        return null;
    }

    var index = 5 + name.length;
    var typeIndicator = line.slice(index, index + 1).toString();
    index += 1; // 1 past indicator
    var stringValue, node;

    switch (typeIndicator) {
        case 'I': // integer
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
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

// warning: may lose \n at end at buffer boundaries
Parser.prototype._getValueToNewline = function(b, start) {
    var line = b.toString();
    var eol = line.indexOf('\n'); // bugbug: perf - converting buffer to string

    if (eol === -1) {
        // throw new Error("missing newline");
        return null; // don't have the full line
    } else {
        return line.substring(start, eol);
    }
};

Parser.prototype.parseValue = function(line) {
    if (!this.cs) {
        throw new ConfigSectionException("value without root");
    }

    var name = this.parseName(line);

    if (name == null) {
        return null;
    }

    var lengthNeeded = 1 + 4 + name.length + 2; // for at least one digit of data

    if (line.length <= lengthNeeded) {
        return null;
    }

    var index = 5 + name.length;
    var typeIndicator = line.slice(index, index + 1).toString();
    index += 1; // 1 past indicator
    var stringValue, node;

    switch (typeIndicator) {
        case 'I': // integer
            stringValue = this._getValueToNewline(line, index);
            if (stringValue) {
                node = this.context.addInt(name, parseInt(stringValue, 10));
                // console.log("got integer, chomping", stringValue, index, stringValue.length, 1);
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
