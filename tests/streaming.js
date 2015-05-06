'use strict';
var fs = require('fs');
var expect = require('chai').expect;
var Stream = require('stream');

var ConfigSection = require('../src/config_section');
var Parser = require('../src/parser');
var ConfigSectionReadableStream = require('../src/readable_stream');

var expectedResultsFilePath = __dirname + '/samples/expected_results.txt';
var tempFilePath = __dirname + '/../tmp/stream_output.txt';

describe('Writeable interface', function() {
    var parser;

    beforeEach(function() {
        parser = new Parser();
    });

    it('should handle partial writes', function() {
        parser._write('S0006');
        parser._write('answer\n');
        parser._write('A0008protocol');
        parser._write('T000000000005chord\n');

        var cs = parser.cs;
        expect(cs.name).to.be.equal('answer');
        expect(cs.attrList[0].name).to.be.equal('protocol');
        expect(cs.attrList[0].nodevalue).to.be.equal('chord');
    });

    it('should handle exactly one line per write', function() {
        parser._write('S0006answer\n');
        parser._write('A0008protocolT000000000005chord\n');

        var cs = parser.cs;
        expect(cs.name).to.be.equal('answer');
        expect(cs.attrList[0].name).to.be.equal('protocol');
        expect(cs.attrList[0].nodevalue).to.be.equal('chord');
    });

    it('should handle multiple lines in one write', function() {
        parser._write('S0006answer\nA0008protocolT000000000005chord\n');

        var cs = parser.cs;
        expect(cs.name).to.be.equal('answer');
        expect(cs.attrList[0].name).to.be.equal('protocol');
        expect(cs.attrList[0].nodevalue).to.be.equal('chord');
    });

    it('should handle new line in the middle of a raw node', function() {
        parser._write('S0006answer\n');
        parser._write('V0008protocolR000000000011bar\nbar\nbar\n');
        var cs = parser.cs;
        expect(cs.name).to.be.equal('answer');
        expect(cs.objectList[0].nodevalue).to.be.equal('bar\nbar\nbar');
    });

    it('should handle being interrupted in middle of raw node', function() {
        parser._write('S0006answer\n');
        parser._write('V0008protocolR000000000011bar');
        parser._write('\nb');
        parser._write('ar\nb');
        parser._write('ar\n');
        parser._write('A0009proto');
        parser._write('col1T000000000004test\n');
        var cs = parser.cs;
        expect(cs.name).to.be.equal('answer');
        expect(cs.objectList[0].name).to.be.equal('protocol');
        expect(cs.objectList[0].nodevalue).to.be.equal('bar\nbar\nbar');
        expect(cs.attrList[0].name).to.be.equal('protocol1');
        expect(cs.attrList[0].nodevalue).to.be.equal('test');
    });
});

describe('Parser', function() {
    var parser;

    beforeEach(function() {
        parser = new Parser();
    });

    it.skip('should parse a stream', function(done) {
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
        var readStream = fs.createReadStream(expectedResultsFilePath);

        parser.parse(readStream, function(err, cs) {
            if (err) {
                throw err;
            }
            expect(cs).to.be.an.instanceof(ConfigSection);

            // now dump it back to a string
            var actual = cs.getString();

            // and compare that to the contents of the file
            var expected = fs.readFileSync(expectedResultsFilePath, 'utf-8');
            expect(actual).to.be.equal(expected);
            done();
        });
    });

    it('should be a writeable stream (support pipe to)', function(done) {
        var sampleRawFilePath = __dirname + '/samples/raw.txt';
        var readStream = fs.createReadStream(sampleRawFilePath, {
            encoding: 'utf-8'
        });

        readStream
        .pipe(parser)
        .on('error', function(err) {
            console.log('error', err);
            throw err;
        })
        .on('close', function() {
            var expected = fs.readFileSync(sampleRawFilePath, 'utf-8');
            var actual = parser.cs.getString();
            fs.writeFileSync(__dirname + '/../tmp/actual.txt', actual);
            expect(actual).to.be.equal(expected);
            done();
        });
    });

    // TODO
    it.skip('should throw error for an empty file', function(done) {
        done();
    });
});

describe('ConfigSectionReadableStream', function() {
    it('should be a readable stream (support pipe from)', function(done) {
        var readStream = fs.createReadStream(expectedResultsFilePath, 'utf-8');
        var parser = new Parser();
        var writeStream = fs.createWriteStream(tempFilePath);

        readStream
        .pipe(parser)
        .on('close', function() {
            var configSectionStreamer = new ConfigSectionReadableStream(parser.cs);

            configSectionStreamer.pipe(writeStream)
            .on('error', function(err) {
                console.log('error', err);
                throw err;
            })
            .on('close', function() {
                var actual = fs.readFileSync(tempFilePath, 'utf-8');
                var expected = fs.readFileSync(expectedResultsFilePath, 'utf-8');
                expect(actual).to.be.equal(expected);
                done();
            });
        });
    });

    // TODO
    it.skip('should stream an empty object', function(done) {
        done();
    });
});
