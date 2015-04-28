'use strict';
var fs = require('fs');
var expect = require('chai').expect;
var Stream = require('stream');

var ConfigSection = require('../src/config_section');
var Parser = require('../src/parser');

describe('Parser', function() {

    var parser;

    beforeEach(function() {
        parser = new Parser();
    });

    it('parses a basic stream', function(done) {
        var stream = new Stream();
        
        parser.parse(stream, function(err, cs) {
            if (err) {
                throw err;
            }
            expect(cs).to.be.an.instanceof(ConfigSection);
            done();
        });

        stream.emit('data', 'S0004root\n');
        stream.emit('data', 'B0006branch\n');
        stream.emit('data', 'b\n');
        stream.emit('data', 's\n');
        stream.emit('end');
        stream.emit('close');
    });

    it.skip('parses file stream', function(done) {
        var readStream = fs.createReadStream(__dirname + '/expected-results.txt');
        
        // could also have parser trigger stream events, but let's start with a callback
        parser.parse(readStream, function(err, cs) {
            if (err) {
                throw err;
            }
            expect(cs).to.be.an.instanceof(ConfigSection);
            done();
        });

    });
});