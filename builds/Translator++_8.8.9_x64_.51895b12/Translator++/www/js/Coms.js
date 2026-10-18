const Coms = {};
Coms.get = function(key) {
    return this[key];
}
Coms.set = function(key, value) {
    this[key] = value;
}

module.exports = Coms;