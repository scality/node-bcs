'use strict';
var fs = require('fs');
var expect = require('chai').expect;

var Parser = require('../src/parser');
var ConfigSection = require('../src/config_section');

describe('Generating a large file', function() {
    var cs;
    var parser;
    var tempPath = __dirname + '/../tmp';
    var tempFile = tempPath + '/large_output.txt';

    this.timeout(60000); // this takes longer than default 2000ms

    before(function() {
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath);
        }
    });

    beforeEach(function() {
        cs = new ConfigSection('command');
        parser = new Parser();
    });

    // todo: send output to stream (instead of calling getString())
    // and increase number of objects
    it('should generate from lots of objects', function(done) {
        for (var i = 0; i < 10; i++) {
            var b = cs.addBranch('test-branch' + i);

            for (var j = 0; j < 10; j++) {
                b.addAttrText('test-attr-text', 'test-attr-text');
                b.addAttrInt('test-attr-int', i * j);
                b.addAttrInt64('test-attr-int64', i * j);
                b.addAttrFloat('test-attr-float', i / (j + 1));

                b.addInt('test-integer', j);

                var text = "this is going to be long...";
                var raw = "this is going to be long..."; // bugbug: should be buffer

                for (var k = 0; k < 10; k++) {
                    text += '\nline ' + [i, j, k].join('.');
                    raw += '\nbuffer line ' + [i, j, k].join('.');
                }

                b.addText('test-text' + j, text);
                b.addRaw('test-raw' + j, new Buffer(raw));

                b = b.addBranch('test-branch' + i + '.' + j);
            }
        }

        // using the pipe interface should be much faster
        fs.writeFileSync(tempFile, cs.getString());
        done();

        // todo: sample memory usage
        // todo: expect file size
    });

    it('should parse lots of objects', function(done) {
        var readStream = fs.createReadStream(tempFile);

        // could also have parser trigger stream events,
        // but let's start with a callback
        parser.parse(readStream, function(err, cs) {
            if (err) {
                throw err;
            }
            expect(cs).to.be.an.instanceof(ConfigSection);

            // now dump it back to a string
            var actual = cs.getString();

            // and compare that to the contents of the file
            var expected = fs.readFileSync(tempFile, 'utf-8');
            expect(actual.length).to.be.equal(expected.length);
            expect(actual).to.be.equal(expected);

            // in case you need to diff the files...
            fs.writeFileSync(tempPath + '/large_output_actual.txt',
                cs.getString());

            done();
        });
    });
});
