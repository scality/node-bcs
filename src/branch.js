'use strict';
var util = require('util');
var sprintf = require('sprintf-js');

var CSECTION = require('./node_types'); // section constants
var ConfigSectionObject = require('./object');
var ConfigSectionNode = require('./node.js');
var ConfigSectionException = require('./exception');


// inherits from ConfigSectionObject
function ConfigSectionBranch(name) {    
    ConfigSectionBranch.super_.call(this, name);
    this.nodetype = CSECTION.BRANCH;
    console.log('csb', this.name, this.nodetype, this.objectList);
}

util.inherits(ConfigSectionBranch, ConfigSectionObject);
module.exports = ConfigSectionBranch;

ConfigSectionBranch.prototype.isBranch = function() {
    return true;
};

ConfigSectionBranch.prototype.addBranch = function(name) {
    console.log('ab', this.name, this.nodetype, this.objectList);
    var b = new ConfigSectionBranch(name);
    this.objectList.push(b);
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
    return n;
};

ConfigSectionBranch.prototype.addRaw = function(name, value) {
    var n = this._addNode(name);
    n.setType(CSECTION.RAWNODE);
    n.setValue(value);
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
    return(n);
};

ConfigSectionBranch.prototype._addAttrNode = function(name) {
    var n = new ConfigSectionNode(name);
    this.attrList.push(n);
    return n;
};

ConfigSectionBranch.prototype.getBinary = function() {
    var t = this.getType();
    
    if (t === CSECTION.UNK) {
        throw new ConfigSectionException('CS Type invalid');
    }

    var tmp = '';

    if (t === CSECTION.BRANCH) {
        tmp += sprintf("B%'04d%s\n", this.name.length, this.name);
    }
    else if (t === CSECTION.ROOT) {
        tmp += sprintf("S%.4d%s\n", this.name.length, this.name);
    }

    // tmp += "".join([i.getBinary() for i in this.attrList]
    //                     ) + "".join([i.getBinary() for i in this.objectList])

    var attrBinaries = this.attrList.map(function(attr) {
        return attr.getBinary();
    });
    tmp += attrBinaries.join();

    var objectBinaries = this.objectList.map(function(obj) {
        return obj.getBinary();
    });

    tmp += objectBinaries.join();

    if (t === CSECTION.ROOT) {
        tmp += "s\n";
    } else if (t === CSECTION.BRANCH) {
        tmp += "b\n";
    }

    return tmp;
};


ConfigSectionBranch.prototype.getDict = function() {
    var t = this.getType();

    if (t === CSECTION.UNK) {
        throw new ConfigSectionException("CS Type invalid");
    }
    
    var result = {};
    
    for (var i in this.attrList) {
        var attr = this.attrList[i];
        var res = attr.getDict();
        var k = Object.keys(res)[0];
        
        if (k in result) {
            result[k].extend(res.values()[0]);
        } else {
            result[k] = [];
            result[k].extend(res.values()[0]);
        }
    }

    for (var j in this.objectList) {
        var obj = this.objectList[j];
        var r = obj.getDict();
        var key = Object.keys(r)[0];
        
        if (key in result) {
            result[key].extend(r.values()[0]);
        } else {
            result[key] = [];
            result[key].extend(r.values()[0]);           
        }
    }

    var output = {};
    output[this.name] = [result];

    return output;
};

ConfigSectionBranch.prototype._getChildVal = function(name) {
    for (var i in this.objectList) {
        var obj = this.objectList[i];
        if (obj.getName() === name) {
            return obj;
        }
    }
    return undefined;
};

// TODO: replace with filter and map
// ConfigSectionBranch.prototype._iter = function(t) {
//     for (i in this.objectList) {
//         if t == i.getType() {
//             yield i
//     }
// }

// ConfigSectionBranch.prototype.iterBranch = function() {
//     return this._iter(CSECTION.BRANCH)

// ConfigSectionBranch.prototype.iterAll = function() {
//     for i in this.objectList:
//         yield i

// ConfigSectionBranch.prototype.iterValInt = function() {
//     return this._iter(CSECTION.INTNODE)

// ConfigSectionBranch.prototype.iterValInt64 = function() {
//     return this._iter(CSECTION.INT64NODE)

// ConfigSectionBranch.prototype.iterValText = function() {
//     return this._iter(CSECTION.TEXTNODE)

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