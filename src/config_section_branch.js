'use strict';
var ConfigSectionNode = require('./config_section_node.js');
var CSECTION = require('./node_types'); // section constants

// inherits from ConfigSectionObject
function ConfigSectionBranch() {    
    var nodetype = nodeTypes.CSECTION.BRANCH;
}

module.exports = ConfigSectionBranch;

ConfigSectionBranch.prototype.isBranch = function() {
    return true;
};

ConfigSectionBranch.prototype.addBranch = function(name) {
    var b = new ConfigSectionBranch(name);
    this.object_list.append(b);
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
    this.object_list.append(n);
    return(n);
};

ConfigSectionBranch.prototype._addAttrNode = function(name) {
    var n = new ConfigSectionNode(name);
    this.attr_list.append(n);
    return n;
};

ConfigSectionBranch.prototype.getBinary = function() {{
    var t = this.getType();
    
    if (t === CSECTION.UNK) {
        throw new ConfigSectionException('CS Type invalid');
    }

    var tmp = '';

    if (t === CSECTION.BRANCH) {
        // sprintf("B%'04d%s\n", 1, "two")
        tmp = tmp + "B%.4d%s\n" % (len(this.name), this.name)
    }
    else if (t === CSECTION.ROOT) {
        tmp = tmp + "S%.4d%s\n" % (len(this.name), this.name)

    tmp = tmp + "".join([i.getBinary() for i in this.attr_list]
                        ) + "".join([i.getBinary() for i in this.object_list])
    
    if (t == CSECTION.ROOT) {
        tmp = tmp + "s\n";
    } else if (t == CSECTION.BRANCH) {
        tmp = tmp + "b\n";
    }
    return tmp;
};

ConfigSectionBranch.prototype.getXml = function() {
    t = this.getType()
    if t == CSECTION.UNK:
        raise ConfigSectionException("CS Type invalid")
    tmp = ""
    if t == CSECTION.BRANCH:
        tmp = tmp + "<branch>" + "<name>" + this.name + "</name>\n"
    elif t == CSECTION.ROOT:
        tmp = tmp + "<section>" + "<name>" + \
            this.name + "</name>\n<version>2</version>\n"
    else:
        raise ConfigSectionException("cs type invalid")

    for i in this.attr_list:
        tmp = tmp + i.getXml()
    for i in this.object_list:
        tmp = tmp + i.getXml()
    if t == CSECTION.ROOT:
        tmp = tmp + "</section>\n"
    elif t == CSECTION.BRANCH:
        tmp = tmp + "</branch>\n"
    return(tmp)

ConfigSectionBranch.prototype.getDict = function() {
    t = this.getType()
    if t == CSECTION.UNK:
        raise ConfigSectionException("CS Type invalid")
    result = {}
    for i in this.attr_list:
        res = i.getDict()
        k = res.keys()[0]
        if k in result:
            result[k].extend(res.values()[0])
        else:
            result[k] = []
            result[k].extend(res.values()[0])

    for i in this.object_list:
        res = i.getDict()
        k = res.keys()[0]
        if k in result:
            result[k].extend(res.values()[0])
        else:
            result[k] = []
            result[k].extend(res.values()[0])

    return ({this.name: [result]})

ConfigSectionBranch.prototype._getChildVal = function(name):
    for i in this.object_list:
        if i.getName() == name:
            return i
    return None

ConfigSectionBranch.prototype._iter = function(t):
    for i in this.object_list:
        if t == i.getType():
            yield i

ConfigSectionBranch.prototype.iterBranch = function() {
    return this._iter(CSECTION.BRANCH)

ConfigSectionBranch.prototype.iterAll = function() {
    for i in this.object_list:
        yield i

ConfigSectionBranch.prototype.iterValInt = function() {
    return this._iter(CSECTION.INTNODE)

ConfigSectionBranch.prototype.iterValInt64 = function() {
    return this._iter(CSECTION.INT64NODE)

ConfigSectionBranch.prototype.iterValText = function() {
    return this._iter(CSECTION.TEXTNODE)

ConfigSectionBranch.prototype.getValInt = function(name):
    n = this._getChildVal(name)
    if n == None:
        return None
    if n.getType() == CSECTION.INTNODE:
        return n.getValue()
    raise ConfigSectionException("invalid type")

ConfigSectionBranch.prototype.getValInt64 = function(name):
    n = this._getChildVal(name)
    if n == None:
        return None
    if n.getType() == CSECTION.INT64NODE:
        return n.getValue()
    raise ConfigSectionException("invalid type")

ConfigSectionBranch.prototype.getValString = function(name):
    n = this._getChildVal(name)
    if n == None:
        return None
    if n.getType() == CSECTION.TEXTNODE:
        return n.getValue()
    raise ConfigSectionException("invalid type")

ConfigSectionBranch.prototype.getValBool = function(name):
    n = this._getChildVal(name)
    if n == None:
        return None
    if n.getType() == CSECTION.BOOLEAN:
        return n.getValue()
    raise ConfigSectionException("invalid type")

ConfigSectionBranch.prototype.getBranch = function(name):
    n = this._getChildVal(name)
    if n == None:
        return None
    if n.getType() == CSECTION.BRANCH:
        return n
    raise ConfigSectionException("invalid type")

};