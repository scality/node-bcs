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

    before(function(done) {
        if (fs.existsSync(tempPath)) {
            done();
        } else {
            fs.mkdir(tempPath, function(err) {
                if (err) {
                    throw err;
                }
                done();
            });
        }
    });

    beforeEach(function() {
        cs = new ConfigSection('command');
        parser = new Parser();
    });

    // this generates an 18.6MB file
    it('should generate from lots of objects', function(done) {
        for (var i = 0; i < 100; i++) {
            var b = cs.addBranch('test-branch' + i);

            for (var j = 0; j < 100; j++) {
                b.addInt('test-integer', j);

                var text = "this is going to be long...";
                var raw = "this is going to be long...";

                for (var k = 0; k < 100; k++) {
                    text += '\nline ' + k;
                    raw += '\nline ' + k;
                }

                b.addText('test-text' + j, text);
                b.addRaw('test-raw' + j, raw);
                b.addAttrText('test-attr-text', 'test-attr-text');
                b.addAttrInt('test-attr-int', i * j);
                b.addAttrInt64('test-attr-int64', i * j);
                b.addAttrFloat('test-attr-float', i / (j + 1));

                b = b.addBranch('test-branch' + i + '.' + j);
            }
        }

        fs.writeFile(tempFile, cs.getString(),
            function(err) {
                if (err) {
                    throw err;
                }
                done();
            }
        );

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
            fs.readFile(tempFile, 'utf-8',
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
});
