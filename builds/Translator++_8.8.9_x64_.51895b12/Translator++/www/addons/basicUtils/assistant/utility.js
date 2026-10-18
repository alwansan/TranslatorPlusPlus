const util = {};
util.getQueryParam = function(param) {
    if (typeof window === 'undefined' || !window.location || !window.location.search) return null;
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}
util.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}