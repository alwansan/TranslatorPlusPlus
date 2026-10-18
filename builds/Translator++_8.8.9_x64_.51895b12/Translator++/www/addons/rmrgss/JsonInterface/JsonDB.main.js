/*
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this software except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

“Commons Clause” License Condition v1.0:
The Software is provided by the Licensor under the License with the condition
that you do not Sell the Software without written permission from the Licensor.

Software: rmrgss addon for Translator++
License: Apache 2.0
Licensor: Dreamsavior
*/
const thisAddon = this;
const pLimit	= require("p-limit");
const marshal   = require("www/addons/rmrgss/lib/legacy/marshal.js")
const JsonDB    = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
const jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
const AddonUtils = require("www/js/AddonUtils.js");
const { Worker } = require("worker_threads");
const nwPath = require("path");
const rawCode = ["232"];

const JsonDBParser = new AddonUtils();
JsonDBParser.workerNum = 10;
JsonDBParser.gameEngine = "RMJDB";
const supportedEngines = [JsonDBParser.gameEngine];

JsonDBParser.resetCache = function() {
    this.cachedData = {};
}

JsonDBParser.loadDBData = async function(file="", basePath, options={}) {
    if (!file) return null;
    if (!file.includes("::")) {
        // common file
        const baseName = nwPath.basename(file, nwPath.extname(file)).toLowerCase();
        // if basename includes "map", "troops", "commonevents" set { rawForCode: ["232"] }
        if (baseName.includes("map") || baseName.includes("troops") || baseName.includes("commonevents")) {
            console.log("Loading with raw parameters", file);
            return marshal.load(await fs.promises.readFile(nwPath.join(basePath, file)), { rawForCode: ["232"] });
        } else {
            return marshal.load(await fs.promises.readFile(nwPath.join(basePath, file)));
        }
    }
    
    // file is in the format of "file::key"
    const filename = nwPath.basename(file, nwPath.extname(file)).toLowerCase()
    const [fileKey, key] = filename.toLowerCase().split("::");
    const keyInt = parseInt(key);
    console.log("fileKey, key", fileKey, keyInt, this.cachedData);
    if (this.cachedData[fileKey]) {
        console.log(`Cached data for ${fileKey}`, this.cachedData[fileKey]);
        return this.cachedData[fileKey][keyInt];
    }
    this.cachedData[fileKey] = marshal.load(await fs.promises.readFile(nwPath.join(basePath, fileKey)), { rawForCode: ["232"] });
    console.log(`Cached data for ${fileKey}`, this.cachedData[fileKey]);
    return this.cachedData[fileKey][keyInt];
}

JsonDBParser.saveDBData = async function(file, data, basePath, options={}) {

}


JsonDBParser.afterCreateTransData = async function(transData, files, basePath, options) {
    // replace with your logic
    // delete project file
    delete transData.project.files["/data/CommonEvents.rxdata"];
    delete transData.project.files["/data/CommonEvents.rvdata"];
    delete transData.project.files["/data/CommonEvents.rvdata2"];
    delete transData.project.files["/data/Scripts.rxdata"];
    delete transData.project.files["/data/Scripts.rvdata"];
    delete transData.project.files["/data/Scripts.rvdata2"];
    this.resetCache();
}

const hasCommonEvents = function(files) {
    return files.find((file)=>file.toLowerCase().includes("commonevents"));
}

const hasRubyScripts = function(files) {
    return files.find((file)=>nwPath.extname(file).toLowerCase() == ".rb");
}

JsonDBParser.beforeExportToFolder = async function(destinationDir, transData, options) {
    this.resetCache();

    await common.mkDir(nwPath.join(destinationDir, "Data"));

    // check if exported file has CommonEvents
    const fistCommonEventsPath= hasCommonEvents(options.files);
    if (fistCommonEventsPath) {
        console.log("loading common events");
        // load from destination dir if exists
        const commonEventFile = nwPath.join(trans.project.cache.cachePath, "data", nwPath.dirname(fistCommonEventsPath), "CommonEvents"+nwPath.extname(fistCommonEventsPath));
        const commonEventDB = await marshal.load(await fs.promises.readFile(commonEventFile), { rawForCode: ["232"] });
        this.cachedData["commonevents"] = commonEventDB;

        const targetCommonEventsFile = nwPath.join(destinationDir, nwPath.dirname(fistCommonEventsPath), "CommonEvents"+nwPath.extname(fistCommonEventsPath));

        if (!await common.isFileAsync(targetCommonEventsFile)) {
            // load from stagging
            ui.log("loading common events from staging "+commonEventFile);
            this.cachedData["writable::commonevents"] = commonEventDB;
        } else {
            ui.log("loading common events file from destination (Incremental update):"+commonEventFile);
            this.cachedData["writable::commonevents"] = await marshal.load(await fs.promises.readFile(targetCommonEventsFile), { rawForCode: ["232"] });
        }
    }


    // handle Ruby scripts
    if (hasRubyScripts(options.files)) {
        // check if in the destination data dir has "scripts" file
        const ext = jsonDBUtil.detectExtensionTypeFromTrans(transData);
        if (await common.isFileAsync(nwPath.join(destinationDir, "Data", "Scripts"+ext))) {
            // extracts the scripts from the destination
            console.log("Extracting existing scripts in the destination directory");
            await jsonDBUtil.extractScripts(destinationDir, destinationDir);
        } else {
            // Extract Scripts file from staging to destination
            console.log("Extracting scripts from staging to destination");
            await jsonDBUtil.extractScripts(nwPath.join(trans.project.cache.cachePath, "data"), destinationDir);
        }
    }

}

JsonDBParser.afterExportToFolder = async function(exportResult, destinationDir, transData, options) {
    // replace with your logic
    // save the actual common events
    console.log("exportResult", exportResult);
    const commonEventFile = hasCommonEvents(options.files);
    if (commonEventFile) {
        const target = nwPath.join(destinationDir, nwPath.dirname(commonEventFile), "CommonEvents"+nwPath.extname(commonEventFile));
        console.log("Merging common events to ", target);
        await fs.promises.writeFile(target, marshal.dump(this.cachedData["writable::commonevents"]));
    }

    if (hasRubyScripts(options.files)) {
        // save the scripts
        await ui.log("Repacking scripts");
        const engine = jsonDBUtil.detectEngineTypeFromTrans(transData);
        console.log("Engine type", engine);

        // by this time, the scripts are already extracted to the destination dir
        await jsonDBUtil.packScripts(destinationDir, engine);
    }
    
    this.resetCache();
}

JsonDBParser.getTransData = async function(file, basePath, options={}) {
    //console.log("Getting transData", arguments);
    const fullPath = nwPath.join(basePath, file)
    //if (!await common.isFileAsync(fullPath)) throw new Error("File not found "+fullPath)
    //options.baseContext = [file]

    const fileExt = nwPath.extname(file).toLowerCase();
    console.log("Working on file: ", fullPath);

    if ([`.rvdata`, `.rvdata2`, `.rxdata`].includes(fileExt)) {
        const fileName = nwPath.basename(file, fileExt).toLowerCase();
        if (["actors", "items", "armors", "weapons", "skills", "states", "classes", "enemies", "tilesets", "animations", "mapinfos"].includes(fileName)) {
            await ui.log(`Parsing common data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseCommonData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: {
                    engineType: options?.init?.engineType,
                    // translationPair: options?.translationPair || {},
                    // translationInfo: options?.translationInfo || {}
                }                
            });
            return data?.result?.transData;
        } else if (fileName == "troops") {
            await ui.log(`Parsing common data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseTroopsData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: {
                    engineType: options?.init?.engineType,
                    // translationPair: options?.translationPair || {},
                    // translationInfo: options?.translationInfo || {}
                }
            });
            return data?.result?.transData;
        } else if (/map\d{3}/i.test(fileName)) {
            await ui.log(`Parsing map data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseMapData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: {
                    engineType: options?.init?.engineType,
                    // translationPair: options?.translationPair || {},
                    // translationInfo: options?.translationInfo || {}
                }
            });
            return data?.result?.transData;
        } else if (fileName == "commonevents") {
            // skip the unsplitted commonevents file

        } else if (fileName.includes("commonevents::")) {
            await ui.log(`Parsing common events data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const [fname, key] = fileName.split("::");
            const keyInt = parseInt(key);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseSingleCommonEvent",
                baseContext: [fname, keyInt],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: {
                    engineType: options?.init?.engineType,
                    // translationPair: options?.translationPair || {},
                    // translationInfo: options?.translationInfo || {}
                }
            });
            return data?.result?.transData;
        } else if (fileName == "system") {
            await ui.log(`Parsing system data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseSystemData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: {
                    engineType: options?.init?.engineType,
                    // translationPair: options?.translationPair || {},
                    // translationInfo: options?.translationInfo || {}
                }
            });
            return data?.result?.transData;
        } else if (["scripts", "main"].includes(fileName)) {
            // do nothing;
        } else {
            await ui.log(`Parsing arbitrary data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseArbitraryData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: {
                    engineType: options?.init?.engineType,
                    // translationPair: options?.translationPair || {},
                    // translationInfo: options?.translationInfo || {}
                }
            });
            return data?.result?.transData;
        }

        // handle RPG Maker data files
    } else if (fileExt == `.rb`) {
        // handle Ruby scripts
        await ui.log(`Parsing ruby script: ${file}`);
        const rbScript = await common.fileGetContents(fullPath, "utf8");
        const data = await jsonDBUtil.fetchFromWorker({
            command: "parseRuby",
            baseContext: [file],
            dbData: rbScript,
            rmDataProperties: {
                // translationPair: options?.translationPair || {},
                // translationInfo: options?.translationInfo || {}
            }
        });
        return data?.result?.transData;
    } else if (fileExt == `.ini`) {
        console.log("Parsing Game.ini");
        const iniData = await common.fileGetContents(fullPath);
        const thisEncoding = common.lastFileEncoding
        const GameIniParser = require("www/addons/rmrgss/GameIniParser.js");
        const gameIni = new GameIniParser(iniData, {
            defaultEncoding: thisEncoding,
        });
        
        await gameIni.parse();
        this.setProjectTitle = () => {
            return gameIni.gameTitle;
        }
        return gameIni.transData;
    }

}

JsonDBParser.writeFile = async function(file, basePath, targetDir, options={}) {
    console.log("Writing file", arguments);
    const fullPath = nwPath.join(basePath, file);
    const targetFile = nwPath.join(targetDir , file);

    const parserOptions = {
        translationPair: options?.translationDatas?.translationData?.[file]?.translationPair || {},
        engineType: options?.projectInfo?.init?.engineType,
    }
    
    console.log("parserOptions", parserOptions);
    
    const fileExt = nwPath.extname(file).toLowerCase();
    console.log("Working on file: ", fullPath);

    if ([`.rvdata`, `.rvdata2`, `.rxdata`].includes(fileExt)) {
        const fileName = nwPath.basename(file, fileExt).toLowerCase();
        if (["actors", "items", "armors", "weapons", "skills", "states", "classes", "enemies", "tilesets", "animations", "mapinfos"].includes(fileName)) {
            await ui.log(`Parsing common data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseCommonData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: parserOptions                
            });
            await fs.promises.writeFile(targetFile, marshal.dump(data?.result?.translatedObject));
        } else if (fileName == "troops") {
            await ui.log(`Parsing common data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseTroopsData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: parserOptions
            });
            await fs.promises.writeFile(targetFile, marshal.dump(data?.result?.translatedObject));
        } else if (/map\d{3}/i.test(fileName)) {
            await ui.log(`Parsing map data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseMapData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: parserOptions
            });
            await fs.promises.writeFile(targetFile, marshal.dump(data?.result?.translatedObject));
        } else if (fileName == "commonevents") {
            // skip the unsplitted commonevents file

        } else if (fileName.includes("commonevents::")) {
            await ui.log(`Parsing common events data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const [fname, key] = fileName.split("::");
            const keyInt = parseInt(key);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseSingleCommonEvent",
                baseContext: [fname, keyInt],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: parserOptions
            });

            // write to writable::commonevents
            this.cachedData["writable::commonevents"][keyInt] = data?.result?.translatedObject;
        } else if (fileName == "system") {
            await ui.log(`Parsing system data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseSystemData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: parserOptions
            });
            await fs.promises.writeFile(targetFile, marshal.dump(data?.result?.translatedObject));
        } else if (["scripts", "main"].includes(fileName)) {
            // do nothing;
        } else {
            await ui.log(`Parsing arbitrary data: ${fileName}`);
            const dbData = await this.loadDBData(file, basePath);
            const data = await jsonDBUtil.fetchFromWorker({
                command: "parseArbitraryData",
                baseContext: [file],
                dbData: dbData,
                filename: fileName,
                rmDataProperties: parserOptions
            });
            await fs.promises.writeFile(targetFile, marshal.dump(data?.result?.translatedObject));
        }
        // handle RPG Maker data files
    } else if (fileExt == `.rb`) {
        // handle Ruby scripts
        await ui.log(`Parsing ruby script: ${file}`);
        const rbScript = await common.fileGetContents(fullPath, "utf8");
        const data = await jsonDBUtil.fetchFromWorker({
            command: "parseRuby",
            baseContext: [file],
            dbData: rbScript,
            rmDataProperties: parserOptions
        });
        await fs.promises.writeFile(targetFile, data?.result?.translatedObject);

    } else if (fileExt == `.ini`) {
        console.log("Parsing Game.ini");
        const iniData = await common.fileGetContents(fullPath);
        const thisEncoding = common.lastFileEncoding
        const GameIniParser = require("www/addons/rmrgss/GameIniParser.js");
        const gameIni = new GameIniParser(iniData, {...parserOptions, defaultEncoding: thisEncoding});
        
        await gameIni.parse();
        this.setProjectTitle = () => {
            return gameIni.gameTitle;
        }
        await fs.promises.writeFile(targetFile, gameIni.toString());
    }

    return targetFile;
}



JsonDBParser.prepareNewProject = async function(info = {}) {
    console.log("info", info);

    ui.showLoading();
    ui.loadingProgress("Processing", `Creating a new ${info.engineType} translation project with JSONDB tool.`, {consoleOnly:false, mode:'consoleOutput'});

    const baseDir = nwPath.dirname(info.entryPoint);

    // this.setEngineName = () => {
    //     return info.engineType;
    // }

    this.setProjectLocation = () => {
        return baseDir;
    }

    // extract ruby file
    await jsonDBUtil.extractScripts(baseDir, baseDir);

    const gameIni = await common.glob('Game.ini', {cwd:baseDir});
    const rpgData = await common.glob('data/*.{rxdata,rvdata,rvdata2}', {cwd:baseDir});
    const rubyFiles = await common.glob("Scripts/*.rb", {cwd:baseDir});
    const files = [...gameIni, ...rpgData, ...rubyFiles];

    // get commonevents and split it.
    // :: in the file name will mark the file as splitted file
    ui.log("loading common events");
    this.resetCache();
    const commonEvents = "data/CommonEvents"+nwPath.extname(rpgData[0]);
    const commonEventDB = await this.loadDBData(commonEvents, baseDir);
    ui.log("Splitting common events into "+ commonEventDB.length + " files");
    console.log("%ccommonEventDB", "color:orange", commonEventDB);
    this.cachedData["commonevents"] = commonEventDB;
    for (let key in commonEventDB) {
        if (!commonEventDB[key]) continue;
        if (JsonDB.isEmptyEventList(commonEventDB[key]['__symbol__@list'])) continue;
        const paddedKey = key.toString().padStart(3, "0");
        console.log("Registering", `data/CommonEvents::${paddedKey}${nwPath.extname(rpgData[0])}`);
        files.push(`data/CommonEvents::${paddedKey}${nwPath.extname(rpgData[0])}`);
    }

    
    console.log("files", files);


    if (!files.length) {
        await ui.logError("No files found to translate!");
    } else {
        await ui.log(`Found ${files.length} file(s) to translate`);
    }

    // // assign the hooks
    // this.finalizeTransData = async (transData, basePath, options) => {
    //     if (transData?.project?.init) {
    //         transData.project.init.unpacker = locations.unpacker;
    //     }
    //     return transData;
    // }

    await this.createProject(files, baseDir, {
        init:info,
        files:files,
    });
    ui.log.progress("Done!", "Done!");
    ui.loadingEnd();
}


const init = function() {
    AddonUtils.applyCommonHandlers(supportedEngines, JsonDBParser);

    engines.addHandler(supportedEngines, 'onLoadSnippet', async function(selectedCell) {
        const selectedParams = trans.getSelectedParameters();
        if (!selectedParams?.length) return;
        const thisParam = selectedParams[0]; // assume index 0 for ease of use. Todo: check each parameter content.
		if (thisParam.attachment) {
			console.log("Handle attachment");
			this.handleAttachment(selectedCell, "ruby", undefined, thisParam.attachment);
		} else {
			this.commonHandleFile(selectedCell, "ruby");
		}
		// var obj = trans.getSelectedObject();

	});
}


thisAddon.JsonDBParser = JsonDBParser;
$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});