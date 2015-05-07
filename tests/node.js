'use strict';
var expect = require('chai').expect;

var ConfigSectionNode = require('../src/node');
var CSECTION = require('../src/node_types.js');

describe('ConfigSectionNode', function() {
    var node = new ConfigSectionNode('test-name');

    it('should be inspectable', function() {
        node.setValue('test-value');
        node.setType(CSECTION.ATTRTEXT);

        node.attrList.push(
            new ConfigSectionNode('child-1')
        );

        node.objectList.push(
            new ConfigSectionNode('child-2')
        );

        expect(node.inspect()).to.equal(JSON.stringify({
            name: "test-name",
            type: "ATTRTEXT",
            attrList: [{
                name: "child-1",
                attrList: [],
                objectList: [],
                value: null
            }],
            objectList: [{
                name: "child-2",
                attrList: [],
                objectList: [],
                value: null
            }],
            value: "test-value"
        }));
    });
});
