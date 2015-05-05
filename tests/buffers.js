'use strict';
var fs = require('fs');
var expect = require('chai').expect;

var ConfigSection = require('../src/config_section');
var ConfigSectionReadableStream = require('../src/readable_stream');

describe('ConfigSection', function() {
    var cs;
    var tempFilePath = __dirname + '/../tmp/buffer_output.txt';

    beforeEach(function() {
        cs = new ConfigSection('command');
    });

    it('should accept and stream buffers', function(done) {
        var b1 = new Buffer("ABC");
        var b2 = new Buffer("DEFG");

        var buffer = Buffer.concat([b1, b2], b1.length + b2.length);

        cs.addRaw('buffer', buffer);

        var configStream = new ConfigSectionReadableStream(cs);
        var writeStream = fs.createWriteStream(tempFilePath);

        configStream.pipe(writeStream)
        .on('close', function() {
            var actual = fs.readFileSync(tempFilePath, 'utf-8');
            var expected = 'S0007command\nV0006bufferR000000000007ABCDEFG\ns\n';
            expect(actual).to.be.equal(expected);
            done();
        });
    });
});

