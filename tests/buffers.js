'use strict';
var fs = require('fs');
var expect = require('chai').expect;

var ConfigSection = require('../src/config_section');
var ConfigSectionReadableStream = require('../src/exception');

describe.skip('ConfigSection', function() {
    var cs;

    beforeEach(function() {
        cs = new ConfigSection('command');
    });

    it('should accept and stream buffers', function() {
        var b1 = new Buffer("ABC");
        var b2 = new Buffer("DEFG");

        cs.addRawArray('buffers', [b1, b2], b1.length + b2.length);

        var configStream = new ConfigSectionReadableStream(cs);
        var writeStream = fs.createWriteStream(tempFilePath);

        console.log(cs.getBinary());

        configStream.pipe(writeStream)
        .on('close', function() {
            // var actual = fs.readFileSync(tempFilePath, 'utf-8');
            // var expected = fs.readFileSync(expectedResultsFilePath, 'utf-8');
            // expect(actual).to.be.equal(expected);
            done();
        });

    });
});

