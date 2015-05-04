ConfigSectionBranch = require('./src/branch.js');

module.exports = {
    ConfigSection: require('./src/config_section.js'),
    makeBranch: function (name) {
        return new ConfigSectionBranch(name);
    },
    Parser: require('./src/parser.js'),
}
