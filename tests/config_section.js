'use strict';
var fs = require('fs');
var expect = require('chai').expect;

var ConfigSection = require('../src/config_section');
var ConfigSectionException = require('../src/exception');
var CSECTION = require('../src/node_types.js');

describe('ConfigSection', function() {
    var cs;

    beforeEach(function() {
        cs = new ConfigSection('command');
        var b = cs.addBranch('cmd_desc');
        b.addInt('id', 1234);
        b.addText('name', 'STATUS');
        b.addText('type', 'REQUEST');
        b.addInt('vnodeid', 0);
        b.addBranch('data');

        var d = b.addBranch('data2');
        d = d.addBranch('data_inside');
        d.addAttrText('attr', 'a');
        d.addAttrInt('attr2', 5);
        d.addAttrInt64('attr3', 5);
        d.addAttrFloat('attr4', 5.5);

        d.addText('foo', 'bar');
        d.addText('foo2', 'bar\nbar');
        d.addText('foo3', 'bar\nbar2\n');
        d.addTimestamp('ts', 1280449171);
        d.addInt('quu', 42);
        d.addInt64('quu64', 42);
        d.addFloat('quu12', 42.7);
        d.addBool('quu2', true);
        d.addRaw('quu2', 'aAZERTYIOIUTRDCVGHGVG\ngsjgfhdshdFhjs\n');
    });

    describe('branch', function() {
        it('should return simple data', function() {
            expect(cs.getBranch('cmd_desc').getValInt('id')).to.equal(1234);
            expect(cs.getBranch('cmd_desc').getValString('name')).to.equal('STATUS');
        });

        it('should throw error when value has different type', function() {
            expect(function() {
                cs.getBranch('cmd_desc').getValInt('name');
            }).to.throw(ConfigSectionException);

            expect(function() {
                cs.getBranch('cmd_desc').getValString('id');
            }).to.throw(ConfigSectionException);
        });
    });

    describe('binary', function() {
        it('should match output from python library', function(done) {
            fs.readFile(__dirname + '/samples/expected_results.txt', 'utf-8',
                function(err, expected) {
                    if (err) {
                        throw err;
                    }
                    var actual = cs.getString();
                    expect(actual).to.be.equal(expected);
                    done();
                }
            );
        });
    });

    describe('getDict', function() {
        var expectedResults = require('./samples/expected_results_python.json');

        it('should generate a dictionary object', function() {
            var dict = cs.getDict();
            expect(dict).to.be.an('object');
            expect(dict).to.deep.equal(expectedResults);
        });
    });

    describe('getObjectAtIndexPath', function() {
        it('should find the right objects', function() {
            expect(cs.getObjectAtIndexPath('')).to.be.equal(cs);

            var b = cs.getObjectAtIndexPath('0');
            expect(b.name).to.be.equal('cmd_desc');

            b = cs.getObjectAtIndexPath('0.5.0');
            expect(b.name).to.be.equal('data_inside');

            var attr = cs.getObjectAtIndexPath('0.5.0.0');
            expect(attr.name).to.be.equal('attr');

            var r = cs.getObjectAtIndexPath('0.5.0.12');
            expect(r.name).to.be.equal('quu2');
            expect(r.getType()).to.be.equal(CSECTION.RAWNODE);
        });
    });
});
