'use strict';
var expect = require('chai').expect;

var ConfigSectionNode = require('../src/node');
var CSECTION = require('../src/node_types');
var Parser = require('../src/parser');

describe('Attribute parsing', function() {

    var parser;

    beforeEach(function() {
        parser = new Parser();
    });

    it('should parse integer', function() {
        parser.readLine('S0004root');
        parser.readLine('A0004nameI42');
        var node = parser.cs.attrList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(42);
        expect(node.getType()).to.equal(CSECTION.ATTRINT);
    });

    it('should parse long integer value', function() {
        parser.readLine('S0004root');
        parser.readLine('A0004nameL42');
        var node = parser.cs.attrList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(42);
        expect(node.getType()).to.equal(CSECTION.ATTRINT64);
    });

    it('should parse float', function() {
        parser.readLine('S0004root');
        parser.readLine('A0004nameF1.234567890');
        var node = parser.cs.attrList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(1.234567890);
        expect(node.getType()).to.equal(CSECTION.ATTRFLOAT);
    });

    it('should parse single line text value', function() {
        parser.readLine('S0004root');
        parser.readLine('A0004nameT000000000011justoneline');            
        var node = parser.cs.attrList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal('justoneline');
        expect(node.getType()).to.equal(CSECTION.ATTRTEXT);
        expect(parser.context).to.equal(parser.cs);
    });

});