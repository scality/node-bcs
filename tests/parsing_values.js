'use strict';
var assert = require('assert');
var expect = require('chai').expect;

var ConfigSectionNode = require('../src/node');
var ConfigSectionBranch = require('../src/branch');
var CSECTION = require('../src/node_types');
var Parser = require('../src/parser');

describe('Chomping', function() {
    var parser;

    beforeEach(function() {
        parser = new Parser();
    });

    it('should chomp first', function() {
        parser.chunks.push(new Buffer('123'));
        parser.chunks.push(new Buffer('456'));
        parser.chomp(3);
        assert(parser.chunks.length === 1);
        assert(parser.chunks[0].toString() === '456');
    });

    it('should chomp both', function() {
        parser.chunks.push(new Buffer('123'));
        parser.chunks.push(new Buffer('456'));
        parser.chomp(6);
        assert(parser.chunks.length === 0);
    });

    it('should chomp part of second', function() {
        parser.chunks.push(new Buffer('123'));
        parser.chunks.push(new Buffer('456'));
        parser.chomp(4);
        assert(parser.chunks.length === 1);
        assert(parser.chunks[0].toString() === '56');
    });
});

describe('Value parsing', function() {
    var parser;

    beforeEach(function() {
        parser = new Parser();
    });

    it('should parse name', function() {
        var name = parser.parseName(new Buffer('A0004nameL42'));
        expect(name).to.equal('name');
    });

    it('should parse longer name', function() {
        var line = 'V0010longernameL42';
        var name = parser.parseName(new Buffer(line));
        expect(name).to.equal('longername');
    });

    it('should parse root', function() {
        var line = 'S0006answer\n';
        var cs = parser.parseString(line);
        expect(cs.getType()).to.equal(CSECTION.ROOT);
        expect(cs.name).to.equal('answer');
    });

    it('should parse branch', function() {
        parser.parseString('S0006answer\n');
        parser.parseString('B0008cmd_desc\n');

        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionBranch);
        expect(node.getName()).to.equal('cmd_desc');
        expect(node.getType()).to.equal(CSECTION.BRANCH);
    });

    it('should parse Int value', function() {
        parser.parseString('S0004root');
        parser.parseString('V0004nameI42');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(42);
        expect(node.getType()).to.equal(CSECTION.INTNODE);
    });

    it('should parse Float value', function() {
        parser.parseString('S0004root');
        parser.parseString('V0004nameF1.234567890');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(1.234567890);
        expect(node.getType()).to.equal(CSECTION.FLOATNODE);
    });

    it('should parse Int64 value', function() {
        parser.parseString('S0004root');
        parser.parseString('V0004nameL42');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(42);
        expect(node.getType()).to.equal(CSECTION.INT64NODE);
    });

    it('should parse bool value', function() {
        parser.parseString('S0004root');
        parser.parseString('V0004nameB1');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(true);
        expect(node.getType()).to.equal(CSECTION.BOOLEAN);
    });

    it('should parse a timestamp', function() {
        var timestamp = 128044917;
        parser.parseString('S0004root');
        parser.parseString('V0004nameS' + timestamp);
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getType()).to.equal(CSECTION.TIMESTAMPNODE);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(timestamp);
    });

    it('should set timestamp value to -1 for far future', function() {
        var timestamp = (new Date().getTime() / 1000) * 4;
        parser.parseString('S0004root');
        parser.parseString('V0004nameS' + timestamp);
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal(-1);
        expect(node.getType()).to.equal(CSECTION.TIMESTAMPNODE);
    });

    it('should parse single line text value', function() {
        parser.parseString('S0004root');
        parser.parseString('V0004nameT000000000011justoneline');
        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal('justoneline');
        expect(node.getType()).to.equal(CSECTION.TEXTNODE);
        expect(parser.context).to.equal(parser.cs);
    });

    it('should parse multiline text value', function() {
        parser.parseString('S0004root\n');
        parser.parseString('V0004nameT000000000009bar\nbar2\n\n');

        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getType()).to.equal(CSECTION.TEXTNODE);
        expect(node.getName()).to.equal('name');
        expect(node.getValue()).to.equal('bar\nbar2\n');
        expect(parser.context).to.equal(parser.cs);
    });

    it('should parse multiline raw value', function() {
        parser.parseString('S0004root');
        parser.parseString('V0004nameR000000000037aAZERTYIOIUTRDCVGHGVG\n' +
                           'gsjgfhdshdFhjs\n\n');

        var node = parser.cs.objectList[0];
        expect(node).to.be.an.instanceof(ConfigSectionNode);
        expect(node.getType()).to.equal(CSECTION.RAWNODE);
        expect(node.getName()).to.equal('name');
        expect(node.getValue().toString())
            .to.equal('aAZERTYIOIUTRDCVGHGVG\ngsjgfhdshdFhjs\n');
        expect(node.getValue().toString().length).to.equal(37);
        expect(parser.context).to.equal(parser.cs);
    });
});
