'use strict';
var fs = require('fs');
var expect = require('chai').expect;

var ConfigSection = require('../src/config_section');
var ConfigSectionReadableStream = require('../src/readable_stream');
var Parser = require('../src/parser');

describe('ConfigSection', function() {
    var cs;

    beforeEach(function() {
        cs = new ConfigSection('command');
    });

    it('should accept and stream buffers', function(done) {
        var tempFilePath = __dirname + '/../tmp/buffer_output.txt';
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

    it.only('should transmit binary image', function(done) {
        // Add an image to a CS
        var imageFilePath = __dirname + '/samples/win.jpeg';
        var imageBuffer = fs.readFileSync(imageFilePath);

        cs.addRaw('image', imageBuffer);

        var s = cs.objectList[0].getString();
        expect(s.substring(0, 23)).to.be.equal('V0005imageR000000009065');

        // write the CS to a temp file
        var configStream = new ConfigSectionReadableStream(cs);
        var tempFilePath = __dirname + '/../tmp/cs_with_image.txt';
        var writeStream = fs.createWriteStream(tempFilePath);

        configStream.pipe(writeStream)
        .on('close', function() {
            // read the CS back in
            var readStream = fs.createReadStream(tempFilePath, 'utf-8');
            var parser = new Parser();

            readStream.pipe(parser)
            .on('close', function() {

                // write the image from the new CS
                var imageObject = cs.objectList[0];
                var newImageBuffer = imageObject.getBuffer();

                expect(newImageBuffer.length).to.be.equal(imageBuffer.length);

                var outputImagePath = __dirname + '/../tmp/output-image.jpg';
                fs.writeFileSync(outputImagePath, newImageBuffer);

                // todo: assert equal to original image
                done();
            });
        });
    });
});

