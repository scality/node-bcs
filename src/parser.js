'use strict';
var es = require('event-stream');

var ConfigSection = require('./config_section');
var ConfigSectionException = require('./exception');
var CSECTION = require('./node_types');

function Parser() {
    this.currentLineNumber = 0;
}

module.exports = Parser;

Parser.prototype.parse = function(readStream, callback) {
    var self = this;

    readStream
    .pipe(es.split())
    .pipe(es.mapSync(function(line) {
        self.currentLineNumber += 1;
        try {
            // console.log(self.currentLineNumber, line);
            self.readLine(line);
        } catch (err) {
            // todo: do we need this, or will error bubble to .on('error') ?
            console.error(err);
            callback(err);
        }
    }))
    .on('error', function(err) {
        console.error('Error occurred while reading stream', err);
        process.nextTick(function() {
            callback(err);
        });
    })
    .on('end', function() {
        process.nextTick(function() {
            callback(undefined, self.cs);
        });
    });
};

Parser.prototype.continueMultiline = function(line) {
    var newValue = '\n' + line;
    this.context.setValue(this.context.getValue() + newValue);

    if (this.context.getValue().length === this.context.expectedLength) {
        this.context = this.context.parent; // pop
    } else {
        if (line === '') {
            throw new ConfigSectionException(
                'Unexpected value found (length doesn\'t match). ' +
                'Expected ' + this.context.getName() + ' to be ' +
                this.context.expectedLength +
                ', got length = ' + this.context.getValue().length);
        }
    }
};

Parser.prototype.readLine = function(line) {
    var firstLetter = line[0];
    var restOfLine = line.substr(1);

    if (this.context && this.context.isMultiline()) {
        this.continueMultiline(line);
        return;
    }

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
// This just parses the length of the value, and the first
// chunk of the value up to the end of the first line
Parser.prototype.parseTextOrRaw = function(type, name, line) {
    var length = parseInt(line.substring(0, 12), 10);
    var data = line.substring(12);

    var node;

    switch (type) {
        case CSECTION.ATTRTEXT:
            node = this.context.addAttrText(name, data);
            break;
        case CSECTION.RAWNODE:
            node = this.context.addRaw(name, data);
            break;
        case CSECTION.TEXTNODE:
            node = this.context.addText(name, data);
            break;
    }

    // did we get all the text?
    if (data.length !== length) {
        if (type === CSECTION.ATTRTEXT) {
            throw new ConfigSectionException("Attribute text length mismatch");
        } else {
            // values can be multiline
            this.context = node;
            node.expectedLength = length; // remember for next line
        }
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
