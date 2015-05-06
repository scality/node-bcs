'use strict';
var expect = require('chai').expect;
var CSECTION = require('../src/node_types');
var formatters = require('../src/formatters');

describe('Formatters', function() {
    it('formats ROOT', function() {
        expect(formatters[CSECTION.ROOT]('name'))
        .to.be.equal('S0004name\n');
    });

    it('formats BRANCH', function() {
        expect(formatters[CSECTION.BRANCH]('name'))
        .to.be.equal('B0004name\n');
    });

    it('formats ATTRTEXT', function() {
        expect(formatters[CSECTION.ATTRTEXT]('name', 'text'))
        .to.be.equal('A0004nameT000000000004text\n');
    });

    it('formats ATTRINT', function() {
        expect(formatters[CSECTION.ATTRINT]('name', 1))
        .to.be.equal('A0004nameI1\n');
    });

    it('formats ATTRINT64', function() {
        expect(formatters[CSECTION.ATTRINT64]('name', '1'))
        .to.be.equal('A0004nameL1\n');
    });

    it('formats ATTRFLOAT', function() {
        expect(formatters[CSECTION.ATTRFLOAT]('name', '1'))
        .to.be.equal('A0004nameF1.000000\n');
    });

    it('formats TEXTNODE', function() {
        expect(formatters[CSECTION.TEXTNODE]('name', 'text'))
        .to.be.equal('V0004nameT000000000004text\n');
    });

    it('formats TEXTNODE with unicode', function() {
        expect(formatters[CSECTION.TEXTNODE]('name', 'おはよう'))
        .to.be.equal('V0004nameT000000000004おはよう\n');
    });

    it('formats RAWNODE', function() {
        expect(formatters[CSECTION.RAWNODE]('name', 'text'))
        .to.be.equal('V0004nameR000000000004text\n');
    });

    it('formats FLOATNODE', function() {
        expect(formatters[CSECTION.FLOATNODE]('name', 1))
        .to.be.equal('V0004nameF1\n');

        // truncating is preserved from python library
        expect(formatters[CSECTION.FLOATNODE]('name', 2.123))
        .to.be.equal('V0004nameF2\n');
    });

    it('formats INTNODE', function() {
        expect(formatters[CSECTION.INTNODE]('name', 1))
        .to.be.equal('V0004nameI1\n');
    });

    it('formats INT64NODE', function() {
        expect(formatters[CSECTION.INT64NODE]('name', 1))
        .to.be.equal('V0004nameL1\n');
    });

    it('formats BOOLEAN', function() {
        expect(formatters[CSECTION.BOOLEAN]('name', true))
        .to.be.equal('V0004nameI1\n');
    });

    it('formats TIMESTAMPNODE', function() {
        expect(formatters[CSECTION.TIMESTAMPNODE]('name', 1234))
        .to.be.equal('V0004nameS1234\n');
    });
});
