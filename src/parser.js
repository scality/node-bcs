'use strict';
var es = require("event-stream");

var ConfigSection = require('./config_section');
var ConfigSectionException = require('./exception');
var CSECTION = require('./node_types');

function Parser() { 

}

module.exports = Parser;

Parser.prototype.parse = function(readStream, callback) {

    var self = this;

    readStream
    .pipe(es.split())
    .pipe(es.mapSync(function(line) {
        try {
            self.readLine(line);    
        } catch (err) {
            console.error(err);
            callback(err);
        }
    }))
    .on('error', function(err) {
        console.error('Error occurred while reading stream', err);
        callback(err);
    })
    .on('end', function() {
        callback(undefined, self.cs);
    });

};

Parser.prototype.readLine = function(line) {
    console.log('readLine', line);
    var firstLetter = line[0];
    var restOfLine = line.substr(1);

    console.log('context', this.context ? this.context.isMultiline() : 'none');

    if (this.context && this.context.isMultiline()) {
        var newValue = '\n' + line;
        this.context.setValue(this.context.getValue() + newValue);

        if (line === '') {
            if (this.context.getValue().length === this.context.expectedLength) {
                this.context = this.context.parent; // pop     
            } else {
                throw new ConfigSectionException('Unexpected value found (length doesn\'t match');
            }            
        }
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
        case 's': // end of section (end of root)
            this.context = this.context.parent; // pop
            return; 
        case 'V': // value
            this.parseValue(restOfLine);
            return;
        case 'A':  // attribute
            this.parseAttr(restOfLine);
            return;
        case '\n':             
            // extra line with \n terminates text node
            // (can also find length from size)
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

// Note: text may span multiple lines
// This just parses the length of the value, and the first
// chunk of the value up to the end of the first line
Parser.prototype.parseTextOrRaw = function(isText, name, line) {
    var length = parseInt(line.substring(0, 12), 10);
    var data = line.substring(12);
    
    console.log('parseTextOrRaw', name, length, data);

    var node;

    if (isText) {
        node = this.cs.addText(name, data);
    } else {
        node = this.cs.addRaw(name, data);
    }

    // did we get all the text?
    if (data.length === length) {
        // got all the data we were expecting
    } else {
        this.context = node;
        node.expectedLength = length; // remember for next line
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
    line = line.substing(index);

    switch (typeIndicator) {
        case 'I': // integer
            var value = parseInt(line, 10);
            this.cs.addAttrInt(name, value);
            return;
        case 'L': // long
            value = parseInt(line);
            this.cs.addAttrInt64(name, value);
            return;
        // this was commented out in the python code
        // case 'B':
        //   value = itob(int(line[curindex:]))
        //   cs.addAttrBool(name, value)
        case 'T': // text
            this.cs.addAttrText(name, this.parseText(line));
            return;
        case 'F': // float
            value = parseFloat(line);
            this.cs.addAttrFloat(name, value);
            return;
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

    console.log('parseValue', name, typeIndicator, line);
    switch (typeIndicator) {
        case 'I': // integer
            this.cs.addInt(name, parseInt(line, 10));
            break;
        case 'F':
            this.cs.addFloat(name, parseFloat(line, 10));
            break;
        case 'L':
            this.cs.addInt64(name, parseInt(line, 10));
            break;
        case 'B':
            this.cs.addBool(name, 
                parseInt(line.substring(index)) === 0 ? false : true);
            break;
        case 'T': // text
            this.parseTextOrRaw(true, name, line);
            break;
        case 'R': // raw
            this.parseTextOrRaw(false, name, line);
            break;
        case 'S': // timestamp
            var timestamp = parseInt(line, 10);
            
            // weird check for arbitrary future time
            if (timestamp > (new Date().getTime()/1000) * 2) {
                timestamp = -1;
            }
            
            this.cs.addTimestamp(name, timestamp);
            break;
        default: 
            // todo: include line number, or complete line
            throw new ConfigSectionException(
                "BCS value type not recognized (" + typeIndicator + ")");
    }
};