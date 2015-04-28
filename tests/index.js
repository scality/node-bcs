'use strict';
var fs = require('fs');
var assert = require('assert');
var expect = require('chai').expect;

var ConfigSection = require('../src/config_section');
var ConfigSectionException = require('../src/exception');

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
            assert(cs.getBranch('cmd_desc').getValInt('id') === 1234);
            assert(cs.getBranch('cmd_desc').getValString('name') === 'STATUS');
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
        it.only('should match output from python library', function(done) {
            fs.readFile(__dirname + '/expected-results.txt', 'utf-8', 
                function(err, expected) {
                    if (err) {
                        throw err;
                    }
                    var actual = cs.getBinary();
                    expect(actual).to.be.equal(expected);
                    done();
                }
            );
        });
    });
});