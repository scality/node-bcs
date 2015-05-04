'use strict';
var fs = require('fs');
var expect = require('chai').expect;

var Parser = require('../src/parser');
var expectedResultsFilePath = __dirname + '/expected_results.txt';

describe('Parser', function() {
    var fixture = fs.readFileSync(expectedResultsFilePath, 'utf-8');

    it('should parse string', function() {
        var cs = Parser.parseString(fixture);

        expect(cs.getBranch('cmd_desc').getValInt('id')).to.equal(1234);
        expect(cs.getBranch('cmd_desc')
            .getValString('name')).to.equal('STATUS');
    });
});
