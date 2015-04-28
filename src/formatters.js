'use strict';
var sprintf = require('sprintf-js').sprintf;

var CSECTION = require('./node_types');

function convertBooleanToInteger(b) {
    return b === true ? 1 : 0;
}

// function convertIntegerToBoolean(i) {
//     return i !== 0;
// }

module.exports = {};

module.exports[CSECTION.INTNODE] = function(name, value) {
    return sprintf("V%'04d%sI%i\n", name.length, name, value);
};

// Note: uses %d to convert float to integer
module.exports[CSECTION.FLOATNODE] = function(name, value) {
    return sprintf("V%'04d%sF%d\n", name.length, name, value);
};

module.exports[CSECTION.INT64NODE] = function(name, value) {
    return sprintf("V%'04d%sL%i\n", name.length, name, value);
};

module.exports[CSECTION.ATTRINT] = function(name, value) {
    return sprintf("A%'04d%sI%i\n", name.length, name, value);
};

module.exports[CSECTION.ATTRINT64] = function(name, value) {
    return sprintf("A%'04d%sL%i\n", name.length, name, value);
};

module.exports[CSECTION.ATTRTEXT] = function(name, value) {
    return sprintf("A%'04d%sT%'012d%s\n", name.length, name, value.length, value.toString());
};

module.exports[CSECTION.ATTRFLOAT] = function(name, value) {
    return sprintf("A%'04d%sF%.6f\n", name.length, name, value);
};

module.exports[CSECTION.TEXTNODE] = function(name, value) {
    return sprintf("V%'04d%sT%'012d%s\n", name.length, name, value.toString().length, value.toString());
};

module.exports[CSECTION.RAWNODE] = function(name, value) {
    return sprintf("V%'04d%sR%'012d%s\n", name.length, name, value.toString().length, value);
};

module.exports[CSECTION.TIMESTAMPNODE] = function(name, value) {
    return sprintf( "V%'04d%sS%u\n", name.length, name, value);
};

module.exports[CSECTION.BOOLEAN] = function(name, value) {
    return sprintf("V%'04d%sI%i\n", name.length, name, convertBooleanToInteger(value));
};