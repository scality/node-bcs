'use strict';
var es = require("event-stream");

var ConfigSection = require('./config_section');
var ConfigSectionException = require('./exception');

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
            this.context = this.context.parent;
            return; // ignored
        case 'V': // value
            this.parseValue(restOfLine);
            return;
        case 'A':  // attribute
            this.parseAttr(restOfLine);
            return;
        case undefined: // EOF
            return;
        case '\n': 
            // note: if it starts with \n, it is a continuation of a text node
            // extra line with \n terminates text node
            // (can also find length from size)
            // append to context
            return;
        default:
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

// todo: text may span multiple lines
// this just parses the length of the value, and the first
// chunk of the value up to the end of the first line
Parser.prototype.parseTextOrRaw = function(line) {
    var length = parseInt(line.substring(0, 12), 10);
    var data = line.substring(13);
    
    return {
        length: length,
        data: data
    };
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
    line = line.substing(index);

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
                parseInt(line.substing(index)) === 0 ? false : true);
            break;
        case 'T': // text
            this.cs.addText(name, this.parseText(line));
            break;
        case 'R': // raw
            var results = this.parseTextOrRaw(line);
            this.cs.addRaw(name, results.data);
            break;
        case 'S': // timestamp
            // v = int(line[curindex:])
            // if v > time.time() * 2:
            //     v = -1
            // cs.addTimestamp(name, v)
            break;
        default: 
            // todo: include line number, or complete line
            throw new ConfigSectionException(
                "BCS value type not recognized (" + typeIndicator + ")");
    }
};