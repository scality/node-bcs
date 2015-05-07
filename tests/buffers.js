'use strict';
var fs = require('fs');
var expect = require('chai').expect;

var ConfigSection = require('../src/config_section');
var ConfigSectionReadableStream = require('../src/readable_stream');
var Parser = require('../src/parser');

describe('ConfigSection', function() {
    var cs;

    before(function() {
        var tempPath = __dirname + '/../tmp';
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath);
        }
    });

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
            var actual = fs.readFileSync(tempFilePath).toString();
            var expected = 'S0007command\nV0006bufferR000000000007ABCDEFG\ns\n';
            expect(actual).to.be.equal(expected);
            done();
        });
    });

    it('should accept a readableStream as a raw value', function(done) {
        // replace with '/samples/large-earth.png' for 100MB file
        var imageStream = fs.createReadStream(__dirname + '/samples/win.jpeg');
        var expectedLength = 9065; // replace with 113357104 for large file
        cs.addRaw('image', imageStream, expectedLength);

        // write cs to temp file
        var tempFilePath = __dirname + '/../tmp/cs_with_streamed_image.raw';

        cs.writeFile(tempFilePath, null, function() {
            // read temp file to verify
            Parser.parseFile(tempFilePath, null, function(err, cs) {
                var buffer = cs.getValRaw('image');
                expect(buffer).to.be.instanceof(Buffer);
                expect(buffer.length).to.be.equal(expectedLength);
                // so we can check image not corrupted
                // replace with /../tmp/output.png for large file
                var outputImagePath = __dirname + '/../tmp/out.jpeg';
                fs.writeFileSync(outputImagePath, buffer);

                done();
            });
        });
    });

    /*
        to run this, first get the giant image (run this as one line):

        wget -O tests/samples/large-earth.png
            http://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73751/
            world.topo.bathy.200407.3x21600x21600.A2.png

        then, remove ".skip" below
    */
    it.skip('should transmit binary image', function(done) {
        this.timeout(10000);

        // Add an image to a CS
        var imageFilePath = __dirname + '/samples/large-earth.png';
        var imageBuffer = fs.readFileSync(imageFilePath);

        cs.addRaw('image', imageBuffer);

        var s = cs.objectList[0].getString();
        expect(s.substring(0, 23)).to.be.equal('V0005imageR000113357104');

        // write the CS to a temp file
        var configStream = new ConfigSectionReadableStream(cs);
        var tempFilePath = __dirname + '/../tmp/cs_with_image.txt';
        var writeStream = fs.createWriteStream(tempFilePath);
        var startTime = new Date();

        configStream.pipe(writeStream)
        .on('close', function() {
            // read the CS back in
            var readStream = fs.createReadStream(tempFilePath);
            var parser = new Parser();

            readStream.pipe(parser)
            .on('close', function() {
                // write the image from the new CS
                var imageObject = cs.objectList[0];
                expect(imageObject.nodevalue.length).to.be.equal(imageBuffer.length);

                console.log('Elapsed: ', new Date() - startTime);

                var outputImagePath = __dirname + '/../tmp/large-earth-out.png';
                fs.writeFileSync(outputImagePath, imageObject.nodevalue);

                // todo: assert equal to original image
                done();
            });
        });
    });
});

