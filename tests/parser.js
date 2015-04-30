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

    describe.skip('streaming', function() {

        it('should parse a stream object', function(done) {
            var stream = new Stream();
            
            parser.parse(stream, function(err, cs) {
                if (err) {
                    throw err;
                }
                expect(cs).to.be.an.instanceof(ConfigSection);
                expect(cs.name).to.equal('root');
                expect(cs.objectList[0].name).to.equal('branch');
                done();
            });

            stream.emit('data', 'S0004root\n');
            stream.emit('data', 'B0006branch\n');
            stream.emit('data', 'b\n');
            stream.emit('data', 's\n');
            stream.emit('end');
            stream.emit('close');
        });

        it('should parse a file stream', function(done) {
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

    describe('line parsing', function() {

        var line = 'V0005quu64L42';

        it('should parse the name', function() {
            line = line.substring(1);
            var name = parser.parseName(line);
            expect(name).to.equal('quu64');
        });

        it('should parse Int64 value', function() {
            line = line.substring(1);
            parser.parseValue(line);
            // either stub call to addInt64, or getDict and check the value   
        });


    });

});