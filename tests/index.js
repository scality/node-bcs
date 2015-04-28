'use strict';
var assert = require('assert');
var ConfigSection = require('../src/config_section');

describe('ConfigSection', function() {
  
    var cs;

    beforeEach(function() {
        cs = new ConfigSection();    
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
        d.addTimestamp('ts', 'tbd');
            //int(calendar.timegm(
            //    dateutil.parser.parse(' '.join('2010-07-30 00:19:31 +0200 CEST'
            // .split(' ')[0:-1])).timetuple())))
        d.addInt('quu', 42);
        d.addInt64('quu64', 42);
        d.addFloat('quu12', 42.7);
        d.addBool('quu2', true);
        d.addRaw('quu2', 'aAZERTYIOIUTRDCVGHGVG\ngsjgfhdshdFhjs\n');
    });

    describe('branch', function() {
        it('should return simple data', function() {
            assert(cs.getBranch('cmd_desc').getValInt('id'), 1234);
            assert(cs.getBranch('cmd_desc').getValString('name'), 'STATUS');
            // self.assertRaises(ConfigSectionException, self.cs.getBranch('cmd_desc').getValInt, 'name')
            // self.assertRaises(ConfigSectionException, self.cs.getBranch('cmd_desc').getValString, 'id')                 
        });        
    });

    describe('binary', function() {
        it('should convert to binary and back', function() {

        });
    });
});