// Script that must be run before everything else. It sets up the environment and loads the main script.
/**
 * CreateObjectURL error because node's Blob collides with the browser's newly implemented Blob on NW 80+. Use a polyfill to fix it.
 * https://github.com/nwjs/nw.js/issues/8075
 */
if (window?.Blob) {
    delete window.Blob;
    window.Blob = require('blob-polyfill').Blob;
}
