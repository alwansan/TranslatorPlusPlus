//=============================================================================
// LoadDecryptedDataFallback.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Allows the game to load either encrypted-wrapper JSON ("{data: base64}") or already-decrypted plain JSON in /data. (Compatibility plugin)
 * @author Dreamsavior
 *
 * @help
 * This game’s DataManager.onXhrLoad was customized to always decrypt database/map
 * JSON files. If you replace /data with already-decrypted JSON, the stock loader
 * fails because it expects the wrapper format:
 *   { uid, bid, data: "<base64>" }
 *
 * This plugin aliases DataManager.onXhrLoad to:
 *  - If the response parses into an object with a string `.data` field, it uses
 *    the game’s existing decrypt logic (calls the original onXhrLoad).
 *  - Otherwise, it treats the response as already-decrypted JSON and loads it
 *    normally (JSON.parse), then calls DataManager.onLoad.
 *
 * Place this plugin at the very top of the plugin list.
 */

(function() {
    "use strict";

    if (typeof DataManager === "undefined") {
        // If loaded too early for some reason, do nothing.
        return;
    }

    const _DataManager_onXhrLoad = DataManager.onXhrLoad;

    DataManager.onXhrLoad = function(xhr, name, src, url) {
        if (xhr.status >= 400) {
            this.onXhrError(name, src, url);
            return;
        }

        // Try to detect wrapper-vs-plain.
        let parsed;
        try {
            parsed = JSON.parse(xhr.responseText);
        } catch (e) {
            this.onXhrError(name, src, url);
            return;
        }

        // Encrypted wrapper: delegate to original implementation.
        if (parsed && typeof parsed === "object" && typeof parsed.data === "string") {
            _DataManager_onXhrLoad.call(this, xhr, name, src, url);
            return;
        }

        // Already-decrypted JSON.
        try {
            window[name] = parsed;
            this.onLoad(window[name]);
        } catch (e) {
            this.onXhrError(name, src, url);
        }
    };
})();
