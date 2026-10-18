//=============================================================================
// DLExJSONDump.js
//=============================================================================
/*:
 * @target MZ
 * @plugindesc Dumps JSON game data from encrypted files to plaintext in a folder
 * @author Phoenaix
 *
 * @help
 * Dumps all RPG Maker Data files from memory into plaintext JSON.
 */

const DEBUG = false;
const DUMP_IMAGES = false;

const fs = require('fs');
const path = require('path');


(() => {
    const openDevTools = () => {
        if (typeof nw !== "undefined") {
            const win = nw.Window.get();
            win.showDevTools();
        } else {
            console.warn("NW.js not detected. DevTools cannot be opened.");
        }
    };


    /**
     * Recursively get all files in a directory.
     * @param {string} dirPath - Directory to scan.
     * @param {string[]} extensions - Optional: filter by extensions.
     * @returns {string[]} - Array of full file paths.
     */
    function getAllFileEntries(dirPath, extensions = []) {
        let results = [];
        const entries = fs.readdirSync(dirPath);

        entries.forEach(entry => {
            const fullPath = path.join(dirPath, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                results = results.concat(getAllFileEntries(fullPath, extensions));
            } else if (stat.isFile()) {
                const ext = path.extname(entry).toLowerCase();
                if (extensions.length === 0 || extensions.includes(ext)) {
                    results.push(fullPath);
                }
            }
        });

        return results;
    }

    /**
     * Dumps a single image file.
     * - If the file name does NOT end with 'png_', it is copied directly.
     * - If it ends with 'png_', it is loaded with ImageManager and saved as a bitmap.
     * @param {string} filePath - Full path to source file.
     * @param {string} folderOutputDir - Output folder path.
     * @param {string} folder - RPG Maker folder name (e.g., 'titles2').
     * @param {string} srcDir - Root folder of current category (used for relative paths).
     */
    function dumpImage(filePath, folderOutputDir, folder, srcDir) {
        // Compute relative path from the folder root, with forward slashes
        let relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
        const nameWithoutExt = relativePath.replace(/\.[^/.]+$/, "");

        // Copy files that don't end with 'png_'
        if (!path.basename(filePath).endsWith('png_')) {
            const outPath = path.join(folderOutputDir, relativePath);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.copyFileSync(filePath, outPath);
            if (DEBUG) console.log(`Copied: ${outPath}`);
            return;
        }

        // Ensure folder ends with a slash
        if (!folder.endsWith("/")) folder += "/";

        // Load bitmap via ImageManager
        const bitmap = ImageManager.loadBitmap("img/" + folder, nameWithoutExt);

        bitmap.addLoadListener(() => {
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');

            // Draw bitmap or bitmap.canvas depending on type
            ctx.drawImage(bitmap.canvas || bitmap, 0, 0);

            canvas.toBlob(blob => {
                const reader = new FileReader();
                reader.onload = () => {
                    const buffer = Buffer.from(reader.result);
                    const outPath = path.join(folderOutputDir, relativePath.replace("_.", ".").replace(".png_", ".png").replace(".jpg_", ".jpg").replace(".jpeg_", ".jpeg"));
                    fs.mkdirSync(path.dirname(outPath), { recursive: true });
                    fs.writeFileSync(outPath, buffer);
                    if (DEBUG) console.log(`Saved image: ${outPath}`);
                };
                reader.readAsArrayBuffer(blob);
            });
        });
    }

    /**
     * Dumps all images recursively from RPG Maker img folders.
     * @param {string} outputDir - Output directory for dumped images.
     */
    function dumpAllImages(outputDir) {
        const imgDirs = [
            'animations', 'battlebacks1', 'battlebacks2', 'characters',
            'enemies', 'faces', 'parallaxes', 'pictures',
            'sv_actors', 'sv_enemies', 'tilesets', 'titles1', 'titles2', 'system'
        ];

        const imgOutputDir = path.join(outputDir, 'img');
        if (!fs.existsSync(imgOutputDir)) fs.mkdirSync(imgOutputDir, { recursive: true });

        imgDirs.forEach(folder => {
            const srcDir = path.join(process.cwd(), 'img', folder);
            if (DEBUG) console.log("Current src dir: " + srcDir);
            const folderOutputDir = path.join(imgOutputDir, folder);

            if (!fs.existsSync(srcDir)) { console.error("Missing src dir"); return; }// skip missing folders
            if (!fs.existsSync(folderOutputDir)) fs.mkdirSync(folderOutputDir, { recursive: true });

            const allFiles = getAllFileEntries(srcDir, ['.png_', '.jpg_', '.jpeg_', '.png', '.jpg', '.jpeg']); // image extensions only
            //console.log("All files size: " + allFiles.length)
            //allFiles.forEach(f => console.log(f));
            allFiles.forEach(filePath => {
                dumpImage(filePath, folderOutputDir, folder, srcDir);
            });
        });
    }

    function loadMap(mapId, outputDir) {
        return new Promise((resolve, reject) => {
            if (mapId > 999) {
                resolve(); // End condition
                return;
            }

            const src = `Map${mapId.toString().padStart(3, '0')}.json`;
            window.$dataMap = null; // reset

            // Call existing loadDataFile
            DataManager.loadDataFile('$dataMap', src);

            const attemptsLimit = 100; // max attempts
            let attempts = 0;

            const pollInterval = setInterval(() => {
                if (window.$dataMap) {
                    clearInterval(pollInterval);
                    // Save data
                    const jsonString = JSON.stringify(window.$dataMap, null, 2);
                    const outPath = path.join(outputDir, src);
                    fs.writeFileSync(outPath, jsonString, 'utf8');
                    if (DEBUG) console.log(`Saved map: ${outPath}`);
                    resolve(); // finished for this map
                } else if (attempts >= attemptsLimit) {
                    clearInterval(pollInterval);
                    console.warn(`Timeout loading map ${src}`);
                    resolve(); // or reject() if you prefer
                }
                attempts++;
            }, 50);
        });
    }

    async function loadAllMaps(outputDir) {
        let mapId = 1;
        while (mapId <= 999) {
            await loadMap(mapId, outputDir);
            mapId++;
        }
    }

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);
        if (DEBUG) openDevTools();
        // Folder to save the dumps
        var outputDir = path.join(process.cwd(), "dumped_data");
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // Helper to get data from window/base namespace
        function getDataObject(name) {
            return window[name] || window["$" + name] || null;
        }

        // 1 Dump database files
        DataManager._databaseFiles.forEach(file => {
            const name = file.name;
            const src = file.src;
            const dataObj = getDataObject(name);

            if (!dataObj) {
                console.warn(`Data object ${name} not found.`);
                return;
            }

            const jsonString = JSON.stringify(dataObj, null, 2);
            const outPath = path.join(outputDir, `${src}`);
            fs.writeFileSync(outPath, jsonString, "utf8");
            if (DEBUG) console.log(`Saved: ${outPath}`);
        });

        // 2 Dump all maps (Map001.json -> Map999.json)
        loadAllMaps(outputDir).then(() => {
            console.log('All maps loaded and saved.');
        });

        // The DRM has many anti-consumer functions inside that prevent you from running certain applications and images also seem to have additional protection
        // Ironically, you need to unencrypt images to completely strip the DRM and make the software user friendly.
        // However, you can also leave the DRM in if necessary as of the current version.
        if (DUMP_IMAGES) dumpAllImages(outputDir);

    };
})();