//=============================================================================
// LoadDecryptedDataFallback.js
//=============================================================================
/*:
 * @target MV
 * @plugindesc Allows the game to load either encrypted-wrapper JSON ("{data: base64}") or already-decrypted plain JSON in /data. (Compatibility plugin)
 * @author Dreamsavior
 *
 * @help
 * This game's DataManager.loadDataFile was customized to always decrypt
 * database/map JSON files. If you replace /data with already-decrypted JSON,
 * the stock loader fails because it expects the wrapper format:
 *   { uid, bid, data: "<base64>" }
 *
 * This plugin aliases DataManager.loadDataFile to:
 *  - If the response parses into an object with a string `.data` field, it
 *    delegates to the game's existing loadDataFile (original decrypt logic).
 *  - Otherwise, it treats the response as already-decrypted JSON and loads it
 *    normally (JSON.parse), then calls DataManager.onLoad.
 *
 * Place this plugin at the very top of the plugin list.
 */

(function() {
    "use strict";

    if (typeof DataManager === "undefined") {
        return;
    }

    var _DataManager_loadDataFile = DataManager.loadDataFile;

    DataManager.loadDataFile = function(name, src) {
        var xhr = new XMLHttpRequest();
        var url = 'data/' + src;
        xhr.open('GET', url);
        xhr.overrideMimeType('application/json');
        xhr.onload = function() {
            if (xhr.status >= 400) {
                DataManager._errorUrl = url;
                return;
            }

            var parsed;
            try {
                parsed = JSON.parse(xhr.responseText);
            } catch (e) {
                DataManager._errorUrl = url;
                return;
            }

            // Encrypted wrapper: delegate to the original implementation.
            if (parsed && typeof parsed === 'object' && typeof parsed.data === 'string') {
                _DataManager_loadDataFile.call(DataManager, name, src);
                return;
            }

            // Already-decrypted plain JSON.
            try {
                window[name] = parsed;
                DataManager.onLoad(window[name]);
            } catch (e) {
                DataManager._errorUrl = url;
            }
        };
        xhr.onerror = function() { DataManager._errorUrl = url; };
        window[name] = null;
        xhr.send();
    };
})();
