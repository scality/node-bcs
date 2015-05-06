'use strict';
var expect = require('chai').expect;

var ConfigSectionNode = require('../src/node');
var CSECTION = require('../src/node_types.js');

describe('ConfigSectionNode', function() {
    var obj = new ConfigSectionNode('test-name');

    it('should be inspectable', function() {
        obj.setValue('test-value');
        obj.setType(CSECTION.ATTRTEXT);
        expect(obj.inspect()).to.equal(
            '{"name":"test-name","type":"ATTRTEXT",' +
            '"attrList":[],"objectList":[],"value":"test-value"}'
        );
    });
});
