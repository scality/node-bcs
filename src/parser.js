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
            // this.parseValue(restOfLine);
            return;
        case 'A':  // attribute
            // this.parseAttr(restOfLine);
            return;
        case undefined: // EOF
            return;
        case '\n': 
            // note: if it starts with \n, it is a continuation of a text node
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
