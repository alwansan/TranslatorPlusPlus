const thisAddon = this;


// translation procedure with wolftl.js
const bCopy	    = require("better-copy");
const supportedEngines = ["wolfrpg"];
const AddonUtils = require("www/js/AddonUtils.js");
const shell = require('shelljs');
const {Worker} = require('worker_threads');
const {extractWolfGameTitle} = require('www/addons/wolfJs/wolfGameTitle.js');
var wolfTl = new AddonUtils();
wolfTl.gameEngine = "wolfrpg";
wolfTl.parserName = "wolfTL";
wolfTl.parserVersion = "24.8.21"
wolfTl.workerNum = 8;
wolfTl.alwaysExportFromStage = true; // ensure that the export is always from the staging directory
wolfTl.wolfTlBin = nwPath.join(thisAddon.getLocation(), "bin/wolftl/WolfTL.exe");


thisAddon.wolfTl = wolfTl;
const {JSONTranslate} = require('www/addons/ESParser/ESParser.module.js');
const WolfTlMap = require('www/addons/wolfJs/wolfTlMap.js');
const WolfTlCommon = require('www/addons/wolfJs/wolfTlCommon.js');
const WolfTlCsv = require('www/addons/wolfJs/wolfTlCsv.js');
const WolfTlDb  = require('www/addons/wolfJs/wolfTlDb.js');
const wolfTlJsonWorkerPath = nwPath.join(thisAddon.getLocation(), 'wolfTlJsonParser.worker.js');

const createBlankTransData = () => ({
    data: [[]],
    context: [[]],
    tags: [],
    parameters: [],
    indexIds: {},
});

const getJsonFileGroup = (file) => nwPath.basename(nwPath.dirname(file));

const sanitizeWorkerData = (value) => {
    if (typeof value === 'undefined') return undefined;
    return JSON.parse(JSON.stringify(value));
};

const runJsonParseWorker = async function(command, file, basePath, parserOptions = {}) {
    const fullPath = nwPath.join(basePath, file);
    const fileGroup = getJsonFileGroup(file);
    const basename = nwPath.basename(file);
    const workerParserOptions = sanitizeWorkerData(parserOptions) || {};

    return new Promise((resolve, reject) => {
        const worker = new Worker(wolfTlJsonWorkerPath, {
            workerData: {
                command,
                fullPath,
                fileGroup,
                basename,
                parserOptions: workerParserOptions,
            },
        });

        let settled = false;
        const finish = (handler, value) => {
            if (settled) return;
            settled = true;
            handler(value);
        };

        worker.on('message', (msg) => {
            if (msg?.error) {
                const error = new Error(msg.error.message || 'WolfTL worker failed');
                error.stack = msg.error.stack || error.stack;
                worker.terminate().catch(() => {});
                finish(reject, error);
                return;
            }
            worker.terminate().catch(() => {});
            finish(resolve, msg?.result);
        });
        worker.on('error', (error) => finish(reject, error));
        worker.on('exit', (code) => {
            if (code !== 0 && !settled) {
                finish(reject, new Error(`WolfTL JSON worker exited with code ${code}`));
            }
        });
    });
};

const parseJsonOnMainThread = async function(command, file, basePath, parserOptions = {}) {
    const fullPath = nwPath.join(basePath, file);
    const jsonObj = JSON.parse(await common.fileGetContents(fullPath));
    const fileGroup = getJsonFileGroup(file);

    if (fileGroup === 'mps') {
        const parsedJSON = new WolfTlMap(jsonObj, parserOptions);
        return command === 'writeFile' ? await parsedJSON.toString() : await parsedJSON.toTrans();
    }

    if (fileGroup === 'common') {
        const parsedJSON = new WolfTlCommon(jsonObj, parserOptions);
        return command === 'writeFile' ? await parsedJSON.toString() : await parsedJSON.toTrans();
    }

    if (fileGroup === 'db') {
        if (nwPath.basename(file) === 'SysDatabase.json') {
            return command === 'writeFile' ? JSON.stringify(jsonObj, null, 4) : createBlankTransData();
        }
        const parsedJSON = new WolfTlDb(jsonObj, parserOptions);
        return command === 'writeFile' ? await parsedJSON.toString() : await parsedJSON.toTrans();
    }

    const parsedJSON = new JSONTranslate(jsonObj, parserOptions);
    return command === 'writeFile' ? await parsedJSON.toString() : await parsedJSON.toTrans();
};

const parseJsonWithWorkerFallback = async function(command, file, basePath, parserOptions = {}) {
    try {
        return await runJsonParseWorker(command, file, basePath, parserOptions);
    } catch (error) {
        console.warn(`WolfTL JSON worker failed for ${file}, falling back to main thread`, error);
        return await parseJsonOnMainThread(command, file, basePath, parserOptions);
    }
};

wolfTl.setProjectTitle = async function(transData, basePath, options = {}) {
    if (options?.init?.projectTitle) return options.init.projectTitle;

    const baseDir = nwPath.dirname(options?.init?.entryPoint || "") || basePath;
    return await extractWolfGameTitle(baseDir, {
        ...(options?.init || {}),
        dumpDir: basePath,
    });
};


/**
 * Patch the binary data with JSON files and produce the patched files
 * @param {string} gameDataDir - the directory containing the game data, directly with "Data" directory
 * @param {string} patchDir - the directory containing the patch files
 * 
 */
wolfTl.patch = async function(gameDataDir, patchDir) {
    ui.log("Generating patch data");
    console.log("%c patchScript", "color:orange", arguments);
    // patch dir is directory containing dump and patched folders
    await common.aSpawn(this.wolfTlBin, [gameDataDir, patchDir, "patch"], {
        cwd:patchDir,
        onData: (data) => {
            ui.log(data.toString());
        }
    });
}

wolfTl.beforeExportToFolder = async function(destinationDir, transData, options) {
    // replace with your logic
    await common.mkDir(nwPath.join(destinationDir, "dump"));

    console.log("%c-beforeExportToFolder", "color:orange", arguments);
   
    // copy the game data recursively to the destination + Data folder
    const dumpDir = nwPath.join(destinationDir, "dump");
    ui.log("Copying game data to staging dir: ", dumpDir);
    await bCopy(trans.getStagingDataPath(), dumpDir);

    // remove the data folder in dump file
    const dataDir = nwPath.join(dumpDir, "Data");
    // await common.rmdir(nwPath.join(dumpDir, "Data"));
    const localData = await common.mkDir(nwPath.join(destinationDir, "_staging"));
    ui.log("Moving game data to: ", nwPath.join(localData, "Data"));
    await shell.mv(dataDir, nwPath.join(localData, "Data"));
}


wolfTl.afterExportToFolder = async function(exportResult, destinationDir, transData, options) {
    // replace with your logic
    console.log("%c-afterExportToFolder", "color:orange", arguments);
    //await this.patch(nwPath.join(destinationDir, "dump/Data"), destinationDir);
    await this.patch(nwPath.join(destinationDir, "_staging/Data"), destinationDir);

    await common.mkDir(nwPath.join(destinationDir, "Data/MapData"));
    await common.mkDir(nwPath.join(destinationDir, "Data/BasicData"));
    // copy the patch file produced at destinationDir/patched to destinationDir/Data according to options.files 
    let commonFileIsCopied = false;
    for (let file of options.files) {
        // CSV files are written directly by writeFile; skip binary-patch copy for them
        if (nwPath.extname(file).toLowerCase() === ".csv") continue;

        const fileGroup = nwPath.basename(nwPath.dirname(file));
        if (fileGroup === "mps") {
            let sourceFile = nwPath.join(destinationDir, "patched/Data/MapData", common.getFilename(file) + ".mps");
            await shell.cp("-f", sourceFile, nwPath.join(destinationDir, "Data/MapData"));
        } else if (fileGroup === "common") {
            if (commonFileIsCopied) continue;
            let sourceFile = nwPath.join(destinationDir, "patched/Data/BasicData/CommonEvent.dat");
            await shell.cp("-f", sourceFile, nwPath.join(destinationDir, "Data/BasicData"));
            commonFileIsCopied = true;
        } else {
            let sourceFile = nwPath.join(destinationDir, "patched/Data/BasicData", common.getFilename(file) + ".dat");
            // somehow file not exist?
            ui.log("Copying file "+sourceFile+" to "+nwPath.join(destinationDir, "Data/BasicData"));

            await shell.cp("-f", sourceFile, nwPath.join(destinationDir, "Data/BasicData"));

            // copy related project file
            let sourceProjectFile = nwPath.join(destinationDir, "patched/Data/BasicData", common.getFilename(file) + ".project");
            if (await common.isFileAsync(sourceProjectFile)) {
                ui.log("Copying file "+sourceProjectFile+" to "+nwPath.join(destinationDir, "Data/BasicData"));
                await shell.cp("-f", sourceProjectFile, nwPath.join(destinationDir, "Data/BasicData"));
            }

        }
    }

    if (await common.isFileAsync(nwPath.join(destinationDir, "Data.wolf"))) {
        await ui.log.warning("Warning: <b>Data.wolf</b> file found in the destination directory. It is recommended to remove this file before running the game.");
        await ui.log.warning("Your translation is injected in the Data directory, but if the Data.wolf file is present, the game will use it instead and your game will be untranslated.");
        await ui.log.addButton("Rename Data.wolf", async () => {
            const dataWolfFile = nwPath.join(destinationDir, "Data.wolf");
            const newName = nwPath.join(destinationDir, "Data.wolf.bak");
            await shell.mv(dataWolfFile, newName);
            await ui.log("Renamed Data.wolf to Data.wolf.bak");
            await ui.log("You may need to rename the other .wolf files to .bak as well, if they are present.");
        });
    }

    // remove dump and patched folders
    await ui.log("Cleaning up temporary folders");
    await common.rmdir(nwPath.join(destinationDir, "dump"));
    await common.rmdir(nwPath.join(destinationDir, "patched"));
    await common.rmdir(nwPath.join(destinationDir, "_staging"));

    // await ui.log.addButton("Open target directory", async () => {
    //     nw.Shell.showItemInFolder(nwPath.join(destinationDir, "Data"));
    // });
}

const stripFirstSlash = (str) => {
    if (str.startsWith("/")) return str.substring(1);
    return str;
}

wolfTl.writeFile = async function(file, basePath, targetDir, options={}) {
    console.log("%c-writing file", "color:orange", arguments);

    const ext = nwPath.extname(file).toLowerCase();

    // --- CSV multilingual files ---
    if (ext === ".csv") {
        const fullPath = nwPath.join(basePath, file);
        const csvContent = await common.fileGetContents(fullPath);

        const parserOptions = {...this.selectTranslationData(options.translationDatas, file), ...options.parserOptions};
        parserOptions.baseContext = [stripFirstSlash(file)];

        const parsedCSV = new WolfTlCsv(csvContent, parserOptions);
        await parsedCSV.parse();
        const csvString = await parsedCSV.toString();

        // Write back using the original filename, overwriting the source
        const outputFilename = nwPath.basename(file);
        const targetFile = nwPath.join(targetDir, "Data", outputFilename);
        await common.mkDir(nwPath.dirname(targetFile));
        await common.filePutContents(targetFile, csvString, "utf8", true);
        ui.log(`Written translated CSV: ${outputFilename}`);
        return nwPath.join(basePath, file);
    }

    if (ext !== ".json") return false;

    const parserOptions = {...this.selectTranslationData(options.translationDatas, file), ...options.parserOptions};
    parserOptions.baseContext = [stripFirstSlash(file)];
    console.log("%c-parserOptions", "color:orange", parserOptions);

    const jsonString = await parseJsonWithWorkerFallback('writeFile', file, basePath, parserOptions);

    // write the string into the file
    const targetFile = nwPath.join(targetDir, "dump", file);
    await common.mkDir(nwPath.dirname(targetFile));
    await common.filePutContents(targetFile, jsonString, "utf8", false);

    // replace with your logic
    return nwPath.join(basePath, file)
}


wolfTl.getTransData = async function(file, basePath, options={}) {
    const transData = createBlankTransData();

    const ext = nwPath.extname(file).toLowerCase();

    // --- CSV multilingual files ---
    if (ext === ".csv") {
        await ui.log("Parsing multilingual CSV: " + file);
        const fullPath = nwPath.join(basePath, file);
        const csvContent = await common.fileGetContents(fullPath);
        const parserOptions = { baseContext: [stripFirstSlash(file)] };
        const parsedCSV = new WolfTlCsv(csvContent, parserOptions);
        const outputTrans = await parsedCSV.toTrans();
        return {...transData, ...outputTrans};
    }

    // get the folder name of the file
    const fileGroup = nwPath.basename(nwPath.dirname(file));
    if (ext !== ".json") return false;
    if (fileGroup === "mps") {
        await ui.log("Parsing with WolfTlMap "+ file);
    } else if (fileGroup === "common") {
        await ui.log("Parsing with CommonEvent parser "+ file);
    } else if (fileGroup === "db") {
        await ui.log("Parsing with Database parser "+ file);
    } else {
        await ui.log("Parsing with Common JSON parser "+ file);
    }

    const outputTrans = await parseJsonWithWorkerFallback('getTransData', file, basePath, {
        baseContext: [file]
    });

    return {...transData, ...outputTrans};
}

wolfTl.dump = async function(baseDir) {
    // basePath is the location of the game executable file
    // extracts any supported files

    ui.log("Extracting Wolf RPG package files "+baseDir);

    await thisAddon.extractWolf(baseDir);

    const locations = {
        dump: nwPath.join(baseDir, "dump"), // location of json files
        patch: nwPath.join(baseDir, "patch"), // location of translated files
    }

    // clean up the dump folder
    await common.rmdir(locations.dump);
    ui.log("Running WolfTL to extract data");
    await common.aSpawn(this.wolfTlBin, [nwPath.join(baseDir, "Data"), baseDir, "create"], {
        cwd:baseDir,
        onData: (data) => {
            ui.log(data.toString());
        }
    });

    return locations;
}

/**
 * Detect Wolf RPG multilingual CSV files in the game Data directory.
 *
 * @param {string} dataDir - Absolute path to the game's Data directory
 * @returns {Promise<{files: string[]}>}
 */
wolfTl.detectCsvSourceFiles = async function(dataDir) {
    if (!await common.isDir(dataDir)) return { files: [] };
    const allCsvFiles = await common.glob("*.csv", {cwd: dataDir});
    return { files: allCsvFiles };
};

wolfTl.prepareNewProject = async function(info = {}) {
    ui.showLoading();
    ui.loadingProgress("Processing", `Creating a new Wolf RPG translation project with wolftl tool.`, {consoleOnly:false, mode:'consoleOutput'});

    const baseDir = nwPath.dirname(info.entryPoint);

    this.setProjectLocation = () => {
        return baseDir;
    }

    const locations = await this.dump(baseDir);
    info.projectTitle ||= await extractWolfGameTitle(baseDir, {...info, dumpDir: locations.dump});
    console.log("locations", locations);

    console.log("info", info);

    const files = await common.glob("**/*.json", {cwd:locations.dump});

    if (!files.length) {
        await ui.logError("No files found to translate!");
    } else {
        await ui.log(`Found ${files.length} file(s) to translate`);
    }

    // --- Detect and include multilingual CSV files ---
    const dataDir = nwPath.join(baseDir, "Data");
    const csvInfo = await this.detectCsvSourceFiles(dataDir);
    if (csvInfo.files.length) {
        ui.log(`Found ${csvInfo.files.length} multilingual CSV file(s)`);
        // Copy CSV files into the dump directory so initStaging picks them up
        const csvDumpDir = nwPath.join(locations.dump, "Data");
        await common.mkDir(csvDumpDir);
        for (const csvFile of csvInfo.files) {
            const srcPath = nwPath.join(dataDir, csvFile);
            const dstPath = nwPath.join(csvDumpDir, csvFile);
            await shell.cp("-f", srcPath, dstPath);
        }
        // Add CSV paths (relative to dump) to the file list
        const csvFilePaths = csvInfo.files.map(f => nwPath.join("Data", f));
        files.push(...csvFilePaths);
    }

    // assign the hooks
    this.finalizeTransData = async (transData, basePath, options) => {
        const gameData = nwPath.join(transData.project.cache.cachePath, "data/Data");

        ui.log("Copying game data to staging dir: ", nwPath.join(baseDir, "Data"));
        await bCopy(nwPath.join(baseDir, "Data"), gameData, {
            filter: (from, to) => {
                // copy .dat & .mps & .project only
                // .project is needed to export the data via wolfTL
                if ([ ".dat", ".mps", ".project" ].includes(nwPath.extname(from))) {
                    ui.log(`Copying ${from} to ${to}`);
                    return true;
                }
                return false;
            }
        });

        return transData;
    }

    await this.createProject(files, locations.dump, {
        init:info,
        files:files,
    });
    
    ui.loadingEnd();
}


wolfTl.init = async function() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log("%c-wolfTl.init", "color:orange", this);
    AddonUtils.applyCommonHandlers(supportedEngines, wolfTl);

}

$(document).ready(function() {
    wolfTl.init();
});