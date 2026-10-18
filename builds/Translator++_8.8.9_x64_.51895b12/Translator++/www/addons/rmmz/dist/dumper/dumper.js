// =============================================================================
// RPG Maker MV - Decrypted Data Dumper (index.html injection)
// Usage (via debug WebSocket or DevTools console, after game boots):
//   await dumpDecryptedData("D:/decryptedGame")
//   const map = await loadDecryptedData("Map005.json")
// =============================================================================
(function () {
    'use strict';

    const _fs   = require('fs');
    const _path = require('path');

    async function loadDecryptedData(src) {
        src = src.replace(/\\/g, '/');
        // If an absolute path was supplied, strip down to the data-relative portion.
        // Relative paths (including subdirectory paths like "subdir/File.json") are kept as-is.
        if (/^(?:[A-Za-z]:\/|\/)/.test(src)) {
            const dataIdx = src.indexOf('/data/');
            src = dataIdx !== -1 ? src.slice(dataIdx + 6) : src.split('/').pop();
        }

        return new Promise(function (resolve, reject) {
            const tempKey = '__dumpDecrypt_' + src.replace(/\W/g, '_') +
                            '_' + (Math.random() * 0x100000 | 0).toString(16);

            window[tempKey] = null;

            // NOTE (MV): DataManager.onXhrError does not exist in RPG Maker MV.
            // The wrapper below is silently ignored; the 20-second poll timeout
            // acts as the fallback failure detector instead.
            const _origXhrError = DataManager.onXhrError;
            DataManager.onXhrError = function (name, srcFile, url) {
                if (name === tempKey) {
                    DataManager.onXhrError = _origXhrError;
                    delete window[tempKey];
                    reject(new Error('[Dump] XHR failed: ' + url));
                } else {
                    if (typeof _origXhrError === 'function')
                        _origXhrError.call(DataManager, name, srcFile, url);
                }
            };

            try {
                DataManager.loadDataFile(tempKey, src);
            } catch (e) {
                DataManager.onXhrError = _origXhrError;
                delete window[tempKey];
                reject(e);
                return;
            }

            var attempts = 0;
            var maxAttempts = 400; // 20 s at 50 ms
            var poll = setInterval(function () {
                if (window[tempKey] !== null && window[tempKey] !== undefined) {
                    clearInterval(poll);
                    DataManager.onXhrError = _origXhrError;
                    var data = window[tempKey];
                    delete window[tempKey];
                    resolve(data);
                } else if (++attempts >= maxAttempts) {
                    clearInterval(poll);
                    DataManager.onXhrError = _origXhrError;
                    delete window[tempKey];
                    reject(new Error('[Dump] Timeout loading: ' + src));
                }
            }, 50);
        });
    }

    // Recursively find all .json files under dir, returning paths relative to baseDir.
    function findJsonFiles(dir, baseDir) {
        var results = [];
        try {
            var entries = _fs.readdirSync(dir);
            for (var i = 0; i < entries.length; i++) {
                var fullPath = _path.join(dir, entries[i]);
                var stat = _fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    var sub = findJsonFiles(fullPath, baseDir);
                    for (var j = 0; j < sub.length; j++) results.push(sub[j]);
                } else if (entries[i].toLowerCase().slice(-5) === '.json') {
                    results.push(_path.relative(baseDir, fullPath).replace(/\\/g, '/'));
                }
            }
        } catch (e) {
            console.warn('[Dump] Cannot scan: ' + dir + ' — ' + e.message);
        }
        return results;
    }

    // Node.js < 10.12 does not support mkdirSync({recursive:true}).
    // Use a recursive fallback so this works on NW.js 0.29 (Node 9.x) and newer.
    function mkdirpSync(p) {
        try { _fs.mkdirSync(p); }
        catch (e) {
            if (e.code === 'ENOENT') { mkdirpSync(_path.dirname(p)); _fs.mkdirSync(p); }
            else if (e.code !== 'EEXIST') throw e;
        }
    }

    async function dumpDecryptedData(outputDir) {
        if (outputDir === undefined || outputDir === null) {
            outputDir = _path.join(process.cwd(), 'dump');
        }
        outputDir = outputDir.replace(/\\/g, '/');
        const dataDir = _path.join(outputDir, 'data');

        mkdirpSync(dataDir);

        console.log('[Dump] Starting dump to: ' + outputDir);

        // Phase 1: database files already in memory
        for (const file of DataManager._databaseFiles) {
            const obj = window[file.name];
            if (obj === null || obj === undefined) {
                console.warn('[Dump] Skipping (not in memory): ' + file.src);
                continue;
            }
            const outPath = _path.join(dataDir, file.src);
            _fs.writeFileSync(outPath, JSON.stringify(obj, null, 2), 'utf8');
            console.log('[Dump] Saved: ' + file.src);
        }

        // Phase 2: map files loaded on-demand
        const mapInfoList = window.$dataMapInfos;
        const mapIds = (Array.isArray(mapInfoList)
            ? mapInfoList.filter(function (m) { return m !== null; })
                         .map(function (m) { return m.id; })
                         .sort(function (a, b) { return a - b; })
            : []);

        if (mapIds.length === 0) {
            let missCount = 0;
            for (let id = 1; id <= 999 && missCount < 3; id++) {
                const src = 'Map' + String(id).padStart(3, '0') + '.json';
                try {
                    const data = await loadDecryptedData(src);
                    const outPath = _path.join(dataDir, src);
                    _fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                    console.log('[Dump] Saved: ' + src);
                    missCount = 0;
                } catch (_) {
                    missCount++;
                    console.warn('[Dump] Missing (skipped): ' + src);
                }
            }
        } else {
            for (const id of mapIds) {
                const src = 'Map' + String(id).padStart(3, '0') + '.json';
                try {
                    const data = await loadDecryptedData(src);
                    const outPath = _path.join(dataDir, src);
                    _fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                    console.log('[Dump] Saved: ' + src);
                } catch (e) {
                    console.error('[Dump] Failed: ' + src, e.message);
                }
            }
        }

        // Phase 3: JSON files inside subdirectories of data/ (not covered by Phases 1 & 2)
        // process.cwd() may be the game root (MV) or www/ (MV/MZ depending on NW.js version).
        // Try <cwd>/data first; if absent, try <cwd>/www/data (MV with cwd=game root).
        var gameDataSrcDir = _path.join(process.cwd(), 'data');
        var gameDataExists = false;
        try { gameDataExists = _fs.statSync(gameDataSrcDir).isDirectory(); } catch (_) {}
        if (!gameDataExists) {
            var alt = _path.join(process.cwd(), 'www', 'data');
            try { if (_fs.statSync(alt).isDirectory()) { gameDataSrcDir = alt; gameDataExists = true; } } catch (_) {}
        }
        if (gameDataExists) {
            const allGameFiles = findJsonFiles(gameDataSrcDir, gameDataSrcDir);
            // Only process files that live inside a subdirectory (path contains '/')
            const subDirFiles = allGameFiles.filter(function (f) { return f.indexOf('/') !== -1; });
            if (subDirFiles.length > 0) {
                console.log('[Dump] Phase 3: ' + subDirFiles.length + ' subdirectory file(s) found...');
                for (const relPath of subDirFiles) {
                    try {
                        const data = await loadDecryptedData(relPath);
                        const outPath = _path.join(dataDir, relPath);
                        mkdirpSync(_path.dirname(outPath));
                        _fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
                        console.log('[Dump] Saved: ' + relPath);
                    } catch (e) {
                        console.error('[Dump] Failed: ' + relPath, e.message);
                    }
                }
            }
        }

        // Completion marker next to index.html (www/.dump_complete)
        const markerPath = _path.join(process.cwd(), '.dump_complete');
        _fs.writeFileSync(markerPath, JSON.stringify({
            completedAt: new Date().toISOString(),
            outputDir:   outputDir
        }, null, 2), 'utf8');

        console.log('[Dump] Done. All files written to: ' + outputDir);
        console.log('[Dump] Marker written: ' + markerPath);
    }

    var _enginePoll = setInterval(function () {
        if (typeof DataManager  === 'undefined') return;
        if (typeof Scene_Boot   === 'undefined') return;
        if (typeof SceneManager === 'undefined') return;

        clearInterval(_enginePoll);

        var _orig_Scene_Boot_start = Scene_Boot.prototype.start;
        Scene_Boot.prototype.start = function () {
            _orig_Scene_Boot_start.call(this);

            window.loadDecryptedData = loadDecryptedData;
            window.dumpDecryptedData = dumpDecryptedData;

            console.log('[Dump] Helpers ready. Auto-dump starting...');

            dumpDecryptedData();
        };
    }, 50);

})();