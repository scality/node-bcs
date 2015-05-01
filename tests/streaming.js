'use strict';
var fs = require('fs');
var expect = require('chai').expect;
var Stream = require('stream');

var ConfigSection = require('../src/config_section');
var Parser = require('../src/parser');

describe('Parser', function() {
    var parser;
    var tempPath = __dirname + '/../tmp';

    beforeEach(function() {
        parser = new Parser();
    });

    it('should parse a stream', function(done) {
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
        var readStream = fs.createReadStream(__dirname + '/expected_results.txt');

        parser.parse(readStream, function(err, cs) {
            if (err) {
                throw err;
            }
            expect(cs).to.be.an.instanceof(ConfigSection);

            // now dump it back to a string
            var actual = cs.getBinary();

            // and compare that to the contents of the file
            fs.readFile(__dirname + '/expected_results.txt', 'utf-8',
                function(err, expected) {
                    if (err) {
                        throw err;
                    }
                    expect(actual).to.be.equal(expected);
                    done();
                }
            );
        });
    });

    it('should be a writeable stream (support pipe to)', function(done) {
        var readStream = fs.createReadStream(__dirname + '/expected_results.txt');

        readStream
        .pipe(parser)
        .on('error', function(err) {
            console.log('error', err);
            throw err;
        })
        .on('end', function() {
            expect(true).to.equal(true);
        })
        .on('close', function() {
            // todo: expect that file will be the same
            done();
        });
    });
});
