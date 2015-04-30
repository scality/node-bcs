'use strict';
var expect = require('chai').expect;

var ConfigSectionNode = require('../src/node');
var CSECTION = require('../src/node_types');
var Parser = require('../src/parser');

describe('Value parsing', function() {

    var parser;

    beforeEach(function() {
        parser = new Parser();
    });

    it('should parse name', function() {
        var line = 'A0004nameL42';
        line = line.substring(1);
        var name = parser.parseName(line);
        expect(name).to.equal('quu64');
    });

    it('should parse longer name', function() {
        var line = 'V0010longernameL42';
        line = line.substring(1);
        var name = parser.parseName(line);
        expect(name).to.equal('longername');
    });

    it('should parse Int value', function() {
        parser.readLine('S0004root');
        parser.readLine('V0004nameI42');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(42);
        expect(node.getType()).to.equal(CSECTION.INTNODE);
    });

    it('should parse Float value', function() {
        parser.readLine('S0004root');
        parser.readLine('V0004nameF1.234567890');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(1.234567890);
        expect(node.getType()).to.equal(CSECTION.FLOATNODE);
    });

    it('should parse Int64 value', function() {
        parser.readLine('S0004root');
        parser.readLine('V0004nameL42');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(42);
        expect(node.getType()).to.equal(CSECTION.INT64NODE);
    });

    it('should parse bool value', function() {
        parser.readLine('S0004root');
        parser.readLine('V0004nameB1');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(true);
        expect(node.getType()).to.equal(CSECTION.BOOLEAN);            
    });

    it('should parse a timestamp', function() {
        var timestamp = 128044917;
        parser.readLine('S0004root');
        parser.readLine('V0004nameS' + timestamp);
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getType()).to.equal(CSECTION.TIMESTAMPNODE);            
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(timestamp);
    });

    it('should set timestamp value to -1 for far future', function() {
        var timestamp = (new Date().getTime()/1000) * 4;
        parser.readLine('S0004root');
        parser.readLine('V0004nameS' + timestamp);
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(-1);
        expect(node.getType()).to.equal(CSECTION.TIMESTAMPNODE);
    });

    it('should parse single line text value', function() {
        parser.readLine('S0004root');
        parser.readLine('V0004nameT000000000011justoneline');            
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal('justoneline');
        expect(node.getType()).to.equal(CSECTION.TEXTNODE);
        expect(parser.context).to.equal(parser.cs);
    });

    it('should parse multiline text value', function() {
        parser.readLine('S0004root');
        parser.readLine('V0004nameT000000000009bar');
        
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getType()).to.equal(CSECTION.TEXTNODE);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal('bar');
        expect(node.expectedLength).to.equal(9);
        expect(parser.context).to.equal(node);

        parser.readLine('bar2');
        expect(node.getValue()).to.equal('bar\nbar2');
        
        parser.readLine('');
        expect(node.getValue()).to.equal('bar\nbar2\n');
        expect(parser.context).to.equal(parser.cs);
    });

    it('should parse multiline raw value', function() {
        parser.readLine('S0004root');
        parser.readLine('V0004nameR000000000037aAZERTYIOIUTRDCVGHGVG');
        parser.readLine('gsjgfhdshdFhjs');
        parser.readLine('');
        
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getType()).to.equal(CSECTION.RAWNODE);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal('aAZERTYIOIUTRDCVGHGVG\ngsjgfhdshdFhjs\n');
        expect(node.getValue().length).to.equal(37);
        expect(parser.context).to.equal(parser.cs);
    });
});