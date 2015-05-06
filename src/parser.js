'use strict';
var util = require('util');
var Writable = require('stream').Writable;
var es = require('event-stream');

var ConfigSection = require('./config_section');
var ConfigSectionException = require('./exception');
var CSECTION = require('./node_types');

function Parser(options) {
    Writable.call(this, options);
    this.currentLineNumber = 0;
    this.buffer = new Buffer(0);

    this.on('finish', function() {
        console.log('finish');
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
    var self = this;

    input.split('\n').forEach(function(line) {
        self.readLine(line);
    });

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
        console.log('parse end');
        process.nextTick(function() {
            callback(undefined, self.cs);
        });
    });
};

// this interface allows the parser to be receive a .pipe()
// assumes input stream is UTF-8 encoded
// bugbug: make sure handles less than 1 line
Parser.prototype._write = function(chunk, encoding, callback) {

    // continue with remainder from last _write
    this.buffer =
        Buffer.concat([this.buffer, chunk], this.buffer.length + chunk.length);

    console.log('_write', chunk.length, this.buffer.length);

    if (this.context && this.context.isMultiline()) {
        this.buffer = this.continueMultiline(this.buffer) || '';
    }

    var i = this.buffer.indexOf('\n');

    while (i > -1) {
        var line = this.buffer.substring(0, i);
        this.readLine(line); // really "readPrefix"

        if (this.context && this.context.isMultiline()) {
            this.buffer = this.buffer.substring(i); // include the \n
            this.buffer = this.continueMultiline(this.buffer) || '';
        } else {
            this.buffer = this.buffer.substring(i + 1); // chomp the \n
        }

        i = this.buffer.indexOf('\n');
        console.log('split again at', i);
    }

    if (callback) {
        process.nextTick(callback);
    }
};

// chunk must be buffer so length is calculated correctly
Parser.prototype.continueMultiline = function(chunk) {
    var value = this.context.getValue(); // Buffer or String
    var currentLength = value.length;
    var expectedLength = this.context.expectedLength;
    var neededLength = expectedLength - currentLength;

    console.log('continueMultiline chunk', chunk.length);

    // todo: optimize for buffers
    // if (typeof(value) === 'string') {
    // var remainder = chunk.toString();
    // var needed;

    if (neededLength < chunk.length) {
        var needed = chunk.slice(0, neededLength);

        if (typeof(value) === 'string') {
            // skip past newline
            remainder = chunk.slice(neededLength + 1);
            this.context.setValue(value + needed);
        } else if (value instanceof Buffer) {
            this.context.setValue(
                Buffer.concat([value, needed], value.length + needed.length);
        }
        this.context = this.context.parent; // pop
        console.log('continueMultiline finish', neededLength);
    } else {
        needed = chunk;
        this.context.setValue(value + needed);
        remainder = null;
        console.log('continueMultiline ate all', chunk.length);
    }

    // } else if (value instanceof Buffer) {
    // todo: optimize for buffer

    return remainder;
};

// could be called "startNode"
Parser.prototype.readLine = function(line) {
    var firstLetter = line[0];
    var restOfLine = line.substr(1);
    this.currentLineNumber += 1;

    console.log('readLine', this.currentLineNumber);

    switch (firstLetter) {
        case 'S': // root
            if (this.cs) {
                throw new ConfigSectionException("Multiple roots found");
            }
            this.parseRoot(restOfLine);
            return;
        case 'B': // branch
            this.parseBranch(restOfLine);
            return;
        case 'b': // end of branch
        case 's': // end of root (section)
            this.context = this.context.parent; // pop
            return;
        case 'V': // value
            this.parseValue(restOfLine);
            return;
        case 'A':  // attribute
            this.parseAttr(restOfLine);
            return;
        case undefined: // EOF
            return;
        default:
            // if we have an incomplete text node
            throw new ConfigSectionException("invalid line " + line);
    }
};

Parser.prototype.parseName = function(line) {
    var nameLength = parseInt(line.substring(0, 4));
    return line.substring(4, 4 + nameLength);
};

Parser.prototype.parseRoot = function(line) {
    var name = this.parseName(line);

    // should not be anything after name
    if (line.length > 4 + name.length) {
        throw new ConfigSectionException("Invalid key in bcs");
    }

    this.cs = new ConfigSection(name);
    this.context = this.cs;
};

Parser.prototype.parseBranch = function(line) {
    var name = this.parseName(line);

    // should not be anything after name
    if (line.length > 4 + name.length) {
        throw new ConfigSectionException("Invalid key in bcs");
    }

    this.context = this.context.addBranch(name);
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
    var expectedLength = parseInt(line.substring(0, 12), 10);
    var data = line.substring(12);
    var actualLength = data.length;
    var node;

    console.log('parseTextOrRaw', name, expectedLength, actualLength);

    switch (type) {
        case CSECTION.ATTRTEXT:
            node = this.context.addAttrText(name, data);
            break;
        case CSECTION.RAWNODE:
            actualLength = Buffer.byteLength(data);
            node = this.context.addRaw(name, new Buffer(data));
            break;
        case CSECTION.TEXTNODE:
            node = this.context.addText(name, data);
            break;
    }

    // did we get all the text?
    if (actualLength < expectedLength) {
        if (type === CSECTION.ATTRTEXT) {
            throw new ConfigSectionException("Attribute text length mismatch");
        } else {
            // values can be multiline
            this.context = node;
            node.expectedLength = expectedLength; // remember for next line
        }
    } else if (actualLength > expectedLength) {
        throw new ConfigSectionException('Found data in excess of expected length');
    }
};

Parser.prototype.parseAttr = function(line) {
    if (!this.cs) {
        throw new ConfigSectionException("Attribute without root");
    }

    var name = this.parseName(line);
    var index = 4 + name.length;
    var typeIndicator = line[index];
    index += 1;
    line = line.substring(index);

    switch (typeIndicator) {
        case 'I': // integer
            var value = parseInt(line, 10);
            this.context.addAttrInt(name, value);
            break;
        case 'L': // long
            value = parseInt(line);
            this.context.addAttrInt64(name, value);
            break;
        case 'T': // text (single line only)
            this.parseTextOrRaw(CSECTION.ATTRTEXT, name, line);
            break;
        case 'F': // float
            value = parseFloat(line);
            this.context.addAttrFloat(name, value);
            break;
    }
};

Parser.prototype.parseValue = function(line) {
    if (!this.cs) {
        throw new ConfigSectionException("value without root");
    }

    var name = this.parseName(line);
    var index = 4 + name.length;
    var typeIndicator = line[index];
    index += 1;
    line = line.substring(index);

    switch (typeIndicator) {
        case 'I': // integer
            this.context.addInt(name, parseInt(line, 10));
            break;
        case 'F':
            this.context.addFloat(name, parseFloat(line, 10));
            break;
        case 'L':
            this.context.addInt64(name, parseInt(line, 10));
            break;
        case 'B':
            this.context.addBool(name,
                parseInt(line.substring(index)) === 0 ? false : true);
            break;
        case 'T': // text
            this.parseTextOrRaw(CSECTION.TEXTNODE, name, line);
            break;
        case 'R': // raw
            this.parseTextOrRaw(CSECTION.RAWNODE, name, line);
            break;
        case 'S': // timestamp
            this.parseTimestamp(name, line);
            break;
        default:
            // todo: include line number, or complete line
            throw new ConfigSectionException(
                "BCS value type not recognized (" + typeIndicator + ")");
    }
};
