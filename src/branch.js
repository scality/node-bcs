'use strict';
var util = require('util');

var CSECTION = require('./node_types'); // section constants
var ConfigSectionObject = require('./object');
var ConfigSectionNode = require('./node.js');
var ConfigSectionException = require('./exception');
var formatters = require('./formatters');

// inherits from ConfigSectionObject
function ConfigSectionBranch(name) {
    ConfigSectionBranch.super_.call(this, name);
    this.nodetype = CSECTION.BRANCH;
}

util.inherits(ConfigSectionBranch, ConfigSectionObject);
module.exports = ConfigSectionBranch;

ConfigSectionBranch.prototype.addCS = function(b) {
    this.objectList.push(b);
    b.parent = this; // todo: getter setter?
    return b;
};

ConfigSectionBranch.prototype.addBranch = function(name) {
    var b = new ConfigSectionBranch(name);
    this.objectList.push(b);
    b.parent = this; // todo: getter setter?
    return b;
};

ConfigSectionBranch.prototype.addInt = function(name, value) {
    var n = this._addNode(name);
    n.setType(CSECTION.INTNODE);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addFloat = function(name, value) {
    var n = this._addNode(name);
    n.setType(CSECTION.FLOATNODE);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addAttrInt = function(name, value) {
    var n = this._addAttrNode(name);
    n.setType(CSECTION.ATTRINT);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addAttrFloat = function(name, value) {
    var n = this._addAttrNode(name);
    n.setType(CSECTION.ATTRFLOAT);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addInt64 = function(name, value) {
    var n = this._addNode(name);
    n.setType(CSECTION.INT64NODE);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addAttrInt64 = function(name, value) {
    var n = this._addAttrNode(name);
    n.setType(CSECTION.ATTRINT64);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addAttrText = function(name, value) {
    var n = this._addAttrNode(name);
    n.setType(CSECTION.ATTRTEXT);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addBool = function(name, value) {
    var n = this._addNode(name);
    n.setType(CSECTION.BOOLEAN);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype.addText = function(name, value) {
    var n = this._addNode(name);
    n.setType(CSECTION.TEXTNODE);
    n.setValue(value);
    n.parent = this;
    return n;
};

// todo: This should either convert value to Buffer or throw an error
ConfigSectionBranch.prototype.addRaw = function(name, value, expectedLength) {
    var n = this._addNode(name);
    n.setType(CSECTION.RAWNODE);
    n.setValue(value);
    if (expectedLength) {
        n.setExpectedLength(expectedLength);
    }
    n.parent = this;
    return n;
};

// accepts unix timestamp
ConfigSectionBranch.prototype.addTimestamp = function(name, value) {
    var n = this._addNode(name);
    n.setType(CSECTION.TIMESTAMPNODE);
    n.setValue(value);
    return n;
};

ConfigSectionBranch.prototype._addNode = function(name) {
    var n = new ConfigSectionNode(name);
    this.objectList.push(n);
    return n;
};

ConfigSectionBranch.prototype._addAttrNode = function(name) {
    var n = new ConfigSectionNode(name);
    this.attrList.push(n);
    return n;
};

ConfigSectionBranch.prototype.getStartString = function() {
    var t = this.getType();

    if (t === CSECTION.ROOT) {
        return formatters[CSECTION.ROOT](this.name);
    } else if (t === CSECTION.BRANCH) {
        return formatters[CSECTION.BRANCH](this.name);
    }
};

ConfigSectionBranch.prototype.getEndString = function() {
    var t = this.getType();

    if (t === CSECTION.ROOT) {
        return "s\n";
    } else if (t === CSECTION.BRANCH) {
        return "b\n";
    }
};

ConfigSectionBranch.prototype.getString = function() {
    var t = this.getType();

    if (t === CSECTION.UNK) {
        throw new ConfigSectionException('CS Type invalid');
    }

    var tmp = this.getStartString();

    var attrBinaries = this.attrList.map(function(attr) {
        return attr.getString();
    });
    tmp += attrBinaries.join('');

    // object list contains child branches
    var objectBinaries = this.objectList.map(function(obj) {
        return obj.getString();
    });
    tmp += objectBinaries.join('');

    tmp += this.getEndString();

    return tmp;
};

// Returns an object tree to match functionality in the Python library
// This format has branches inside of arrays of length 1.
ConfigSectionBranch.prototype.getDict = function() {
    var t = this.getType();

    if (t === CSECTION.UNK) {
        throw new ConfigSectionException("CS Type invalid");
    }

    var result = {};
    result[this.name] = [{}];
    var children = result[this.name][0];

    for (var i in this.attrList) {
        var attr = this.attrList[i];
        this.getDictForChild(children, attr);
    }

    // objectList includes child branches
    for (var j in this.objectList) {
        var obj = this.objectList[j];
        this.getDictForChild(children, obj);
    }

    return result;
};

// helper function for getDict
ConfigSectionBranch.prototype.getDictForChild = function(children, objectOrAttr) {
    var objDict = objectOrAttr.getDict();
    var key1 = Object.keys(objDict)[0];
    var value1 = objDict[key1];

    if (objectOrAttr.getType() === CSECTION.BRANCH) {
        // TODO: assuming can't have 2 branches with same name
        children[key1] = value1;
    } else {
        if (key1 in children) {
            children[key1].push(value1);
        } else {
            children[key1] = [];
            children[key1].push(value1);
        }
    }
};

// bugbug: can have two children with same name, this will return first
ConfigSectionBranch.prototype._getChildVal = function(name) {
    for (var i in this.objectList) {
        var obj = this.objectList[i];
        if (obj.getName() === name) {
            return obj;
        }
    }
    return undefined;
};

ConfigSectionBranch.prototype.getValInt = function(name) {
    var n = this._getChildVal(name);

    if (n === undefined) {
        return n;
    }

    if (n.getType() === CSECTION.INTNODE) {
        return n.getValue();
    }

    throw new ConfigSectionException("invalid type");
};

ConfigSectionBranch.prototype.getValInt64 = function(name) {
    var n = this._getChildVal(name);

    if (n === undefined) {
        return undefined;
    }

    if (n.getType() === CSECTION.INT64NODE) {
        return n.getValue();
    }

    throw new ConfigSectionException("invalid type");
};

ConfigSectionBranch.prototype.getValString = function(name) {
    var n = this._getChildVal(name);

    if (n === undefined) {
        return undefined;
    }

    if (n.getType() === CSECTION.TEXTNODE) {
        return n.getValue();
    }

    throw new ConfigSectionException("invalid type");
};

ConfigSectionBranch.prototype.getValRaw = function(name) {
    var n = this._getChildVal(name);

    if (n === undefined) {
        return undefined;
    }

    if (n.getType() === CSECTION.RAWNODE) {
        return n.getValue();
    }

    throw new ConfigSectionException("invalid type");
};

ConfigSectionBranch.prototype.getValBool = function(name) {
    var n = this._getChildVal(name);

    if (n === undefined) {
        return undefined;
    }

    if (n.getType() === CSECTION.BOOLEAN) {
        return n.getValue();
    }

    throw new ConfigSectionException("invalid type");
};

ConfigSectionBranch.prototype.getBranch = function(name) {
    var n = this._getChildVal(name);

    if (n === undefined) {
        return undefined;
    }

    if (n.getType() === CSECTION.BRANCH) {
        return n;
    }

    throw new ConfigSectionException("invalid type");
};

