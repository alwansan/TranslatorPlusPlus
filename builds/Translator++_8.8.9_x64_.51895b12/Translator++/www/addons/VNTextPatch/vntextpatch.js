var thisAddon 	= this;
// var appName 	= this.package.name;
var spawn 		= spawn || require('child_process').spawn;
var bCopy 		= require('better-copy');
var fse 		= fse || require('fs-extra');
const AddonUtils = require("www/js/AddonUtils.js");
const thisPath  = thisAddon.getPathRelativeToRoot();
thisAddon.vnTextPatchBin    = nwPath.join(thisPath, "bin/VNTextPatch/VNTextPatch.exe");
thisAddon.vnTextPatchDllProxyPath    = nwPath.join(thisPath, "bin/VNTextProxy");
thisAddon.debugLevel        = 0;
thisAddon.engineName        = "VNTrans";
const supportedEngines      = [thisAddon.engineName];

const referenceName = "Actor Reference";
var vnTextPatchInterface = "json"

class SheetData extends require("www/js/ParserBase.js").ParserBase {
	constructor(obj, options, callback) {
		super(obj, options, callback)
		this.debugLevel         = thisAddon.debugLevel;
		this.currentEntryPoint  = {};
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};
	}
}

SheetData.prototype.toTrans = async function($data, baseContext = [], basePath) {
    $data = $data || this.obj;
    if (Array.isArray(baseContext) == false) baseContext = [baseContext];
    basePath = basePath || "";

    console.log("converting sheet data:", $data);
    if (empty($data)) return;
    var $files = {};

    var createContext = function(context) {
        var thisContext = baseContext.concat(context);
        return thisContext.join("/");
    }

    var getPath = function(path) {
        path = nwPath.join(basePath, path);
        path = path.replaceAll("\\", "/");
        if (path[0] == "/") path = path.substr(1);
        return path;
    }

    for (var $sheetName in $data) {
        var $sheetContent = $data[$sheetName];
        var $fileData = {};
        $fileData["data"]         = [];
        $fileData["context"]      = [];
        $fileData["parameters"]   = [];
        $fileData["comments"]     = [];
        
        var $wordCache = {};
        for(var $rowId=0; $rowId<$sheetContent.length; $rowId++) {
            var $row = $sheetContent[$rowId];
            var $thisContext, $contextId;
            if ($rowId == 0) continue; // skip row header
            if (empty($row)) continue;
            if (empty($row[1])) continue;
            if (typeof $wordCache[$row[1]] !== "undefined") {
                // add to context
                let $id = $wordCache[$row[1]];
                if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
                $thisContext = [$sheetName, $rowId, 1, "text"];
                if (!empty($row[0])) {
                    // if has character name
                    $thisContext.push(`actorName[${$row[0]}]`);
                } else {
                    $thisContext.push("actorName[]");
                }
    
                $fileData["context"][$id].push(createContext($thisContext));
                $contextId =  $fileData["context"][$id].length -1;
                continue;
            }

            var $thisRow = [];
            // original text
            $thisRow[0] = $row[1];

            // initial text
            if (!empty($row[3])) $thisRow[1] = $row[3];
            if (!empty($row[4])) $thisRow[1] = $row[4];
            if (!empty($row[5])) $thisRow[1] = $row[5];

            // add the data
            $fileData["data"].push($thisRow);
            let $id = $fileData["data"].length -1;

            // context for data
            if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
            $thisContext = [$sheetName, $rowId, 1, "text"];
            if (!empty($row[0])) {
                // if has character name
                $thisContext.push(`actorName[${$row[0]}]`);
            } else {
                $thisContext.push("actorName[]");
            }

            $fileData["context"][$id].push(createContext($thisContext));
            $contextId =  $fileData["context"][$id].length -1;

            // parameters
            if (!empty($row[0])) {
                // only if has character name
                $fileData["parameters"][$id] = $fileData["parameters"][$id] || [];
                $fileData["parameters"][$id][$contextId] = [];
                $fileData["parameters"][$id][$contextId]["actorName"] = $row[0];
            }
            

            // note
            if (!empty($row[6])) {
                if (empty($fileData["comments"][$id])) $fileData["comments"][$id] = [];
                $fileData["comments"][$id][0] = $row[6];

            }
            // add to cache
            $wordCache[$thisRow[0]] = $id; 


            // ===========================
            // character name (at index 0)
            // ===========================
            if (empty($row[0])) continue;
            if (typeof $wordCache[$row[0]] !== "undefined") {
                thisAddon.actorNames[$row[0]] = "";
                // add to context
                $id = $wordCache[$row[0]];
                if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
                $fileData["context"][$id].push(createContext([$sheetName, $rowId, 0, "name"]));
    
                continue;
            }

            $thisRow = [];
            // original text
            $thisRow[0] = $row[0];
            $fileData["data"].push($thisRow);
            $id = $fileData["data"].length -1;

            // context
            if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
            $fileData["context"][$id].push(createContext([$sheetName, $rowId, 0, "name"]));
            
            // add to cache
            $wordCache[$thisRow[0]] = $id; 

        }
        $fileData["indexIds"]   = $wordCache;
        $fileData["lineBreak"]  = "\n";
        $fileData["originalFormat"] = "SPREADSHEET";
        $fileData["extension"]  = "";
        $fileData["basename"]   = $sheetName;
        $fileData["filename"]   = $sheetName;
        $fileData["relPath"]    = getPath($sheetName);
        $fileData["path"]       = getPath($sheetName);
        $fileData["dirname"]    = basePath;
        $files[$fileData["relPath"]] = $fileData;
    }
    return $files;
}

SheetData.prototype.selectTranslationData = function(translationData, currentPath) {
    try {
        var transPair = translationData.translationData[currentPath].translationPair;
        this.translationPair = transPair || {};
    } catch (e) {
        this.translationPair = {};
    }
    return this.translationPair;
}

SheetData.prototype.toTable = function(transData, translationData) {
    transData = transData || trans.getSaveData();
    translationData = translationData || trans.getTranslationData();
    if (!transData) return;
    if (!translationData) return;

    var result = {};
    for (var fileId in transData.project.files) {
        var thisFileObj = transData.project.files[fileId];
        if (empty(thisFileObj.data)) continue;
        if (empty(thisFileObj.context)) continue;

        this.selectTranslationData(translationData, fileId);

        result[thisFileObj.dirname] = result[thisFileObj.dirname] || {};
        result[thisFileObj.dirname][thisFileObj.basename] = [];
        for (var rowId=0; rowId<thisFileObj.context.length; rowId++) {
            var origText    = thisFileObj.data[rowId][0];
            if (!origText) continue;

            for (var contextId=0; contextId<thisFileObj.context[rowId].length; contextId++) {
                var thisContext = thisFileObj.context[rowId][contextId];
                var translation = this.translate(origText, [thisContext]);
                if (translation == origText) continue;

                // extract row components
                var contextComp = thisContext.split("/");
                var targetCol   = 3;
                if (contextComp[3] == 0) {
                    // character name
                    targetCol   = 2;
                }

                result[thisFileObj.dirname][thisFileObj.basename].push({
                    row         : contextComp[2],
                    col         : targetCol,
                    translation : translation
                });
            }

        }
    }
    return result;
}

thisAddon.SheetData = SheetData;


var VNTextPatch = function(entryPoint, options) {
    this.entryPoint = entryPoint;
    this.options    = options;
    this.init();
}

AddonUtils(VNTextPatch);

VNTextPatch.prototype.init = function() {
    if (common.isDir(this.entryPoint)) {
        this.dir = this.entryPoint;
    } else {
        this.dri = nwPath.dirname(this.entryPoint);
    }
}

// Interface JSON
VNTextPatch.jsonPatchDump = async function(dir, destinationJsonDir, format) {
    let cmd = ["extractlocal", nwPath.resolve(dir), nwPath.resolve(destinationJsonDir)];

    if (format) {
        cmd.push("--format="+format)
    }
    await common.aSpawn(thisAddon.vnTextPatchBin, cmd, {
        onData: function (data) {
            ui.log(data.toString());
        }
    });
}

VNTextPatch.jsonPatchApply = async function(destinationDir, sourceDir, jsonDir, format) {
    let cmd = ["insertlocal", nwPath.resolve(sourceDir), nwPath.resolve(jsonDir), nwPath.resolve(destinationDir)];
    if (format) {
        cmd.push("--format="+format)
    }
    await common.mkDir(destinationDir);
    await common.aSpawn(thisAddon.vnTextPatchBin, cmd, {
        onData:function(data) {
            ui.log(data.toString());
        }
    });
}

VNTextPatch.jsonPatchToTrans = async function(jsonDir, options={}) {
    if (!await common.isDirectory(jsonDir)) {
        ui.logError(`${jsonDir} is not a directory!`);
        throw new Error(`${jsonDir} is not a directory!`);
    }
    const dirContent = await common.readDir(jsonDir);
    var transObj = {
        project: {
            files: {}
        }
    }

    for (let i=0; i<dirContent.length; i++) {
        let thisFile = dirContent[i];
        if (nwPath.extname(thisFile).toLowerCase() !== ".json") continue;
        let jsonObj = await common.fileGetContents(thisFile, "UTF8");
        let vnJSONFile = new thisAddon.VNJSONFile(JSON.parse(jsonObj), options);
        console.log("VNJsonFile", vnJSONFile);
        let relativePath = common.getRelativePath(thisFile, jsonDir);
        if (options.basePath) relativePath = common.getRelativePath(nwPath.join(options.basePath, relativePath), "")
        vnJSONFile.currentContext = [relativePath]
        transObj.project.files[relativePath] = await vnJSONFile.toTrans();
    }

    return transObj;
}

VNTextPatch.jsonPatchFromTrans = async function(transData, originalJsonDir, targetDir, options) {
    if (!await common.isDirectory(originalJsonDir)) {
        ui.logError(`${originalJsonDir} is not a directory!`);
        throw new Error(`${originalJsonDir} is not a directory!`);
    }
    options ||= {}
    let translationDatas = trans.getTranslationData(transData, {filterTag:options.filterTag, filterTagMode:options.filterTagMode, files:options.files});

    const dirContent = await common.readDir(originalJsonDir);
    const result = []
    for (let i=0; i<dirContent.length; i++) {
        let thisFile = dirContent[i];
        let relativePath = common.getRelativePath(thisFile, originalJsonDir);
        if (nwPath.extname(thisFile).toLowerCase() !== ".json") continue;
        if (options.files && options.files?.length > 0) {
            if (!options.files.includes(relativePath)) continue;
        }

        let jsonObj = await common.fileGetContents(thisFile, "UTF8");
        let vnJSONFile = new thisAddon.VNJSONFile(JSON.parse(jsonObj), options);
        console.log("VNJsonFile", vnJSONFile);
        vnJSONFile.currentContext = [relativePath];
        vnJSONFile.assignTranslationPair(relativePath, translationDatas);
        await vnJSONFile.parse();
        
        let targetName = nwPath.join(targetDir, relativePath);
        let targetNameDir = nwPath.dirname(targetName)
        if (!await common.isDirectory(targetNameDir)) {
            ui.log("Creating directory", targetNameDir);
            await common.mkDir(targetNameDir);
        }
        ui.log("Writing: "+targetName);
        result.push(await common.filePutContents(targetName, vnJSONFile.toString(), "UTF8", false));
    }
    return result;
}



// Interface XLS
VNTextPatch.dirToXls = async function(dir, destinationFile) {
    await common.aSpawn(thisAddon.vnTextPatchBin, ["extractlocal", nwPath.resolve(dir), nwPath.resolve(destinationFile)], {
        onData:function(data) {
            ui.log(data.toString());
        }
    });
}

VNTextPatch.xlsToDir = async function(destinationDir, sourceDir, xlsFile) {
    await common.mkDir(destinationDir);
    await common.aSpawn(thisAddon.vnTextPatchBin, ["insertlocal", nwPath.resolve(sourceDir), nwPath.resolve(xlsFile), nwPath.resolve(destinationDir)], {
        onData:function(data) {
            ui.log(data.toString());
        }
    });
}

VNTextPatch.xlsToTrans = async function(xlsFile) {
    var fileData = await php.spawn("xls2trans.php", {
        args: {
            file:xlsFile
        },
        scriptPath: thisAddon.getLocation()
    });
    var baseName = nwPath.basename(xlsFile);

    var sheetData = new SheetData(fileData);
    console.log("Parsed SheetData:", sheetData);
    var transObj = {
        project: {
            files: await sheetData.toTrans(fileData, [baseName], baseName)
        }
    }
    return transObj;
}

VNTextPatch.patchXls = async function(xlsFile, patch, newXlsPath) {
    if (!newXlsPath) newXlsPath = nwPath.join(nw.process.env.TEMP, common.makeid(12)+".xlsx");
    await php.spawn("trans2xls.php", {
        args: {
            file    :nwPath.resolve(xlsFile),
            patch   :nwPath.resolve(patch),
            newFile :nwPath.resolve(newXlsPath)
        },
        onData: function(data){
            ui.log(data.toString());
        },
        scriptPath: thisAddon.getLocation()
    });

    return newXlsPath;
}


VNTextPatch.createStaging = async function(id) {
	await ui.log("Generating staging directory");

	id = id || common.makeid(10);

	var cacheInfo = {
		cacheID     : id,
		cachePath   : nwPath.join(common.getStagePath(), id)
	}

	var cacheFolderData = nwPath.join(cacheInfo.cachePath, "data");
	await common.mkDir(cacheFolderData);
	await ui.log(`New staging directory with id ${id} has been created!`);
	
	return cacheInfo;
}

VNTextPatch.supportedTypes = [
    {
        name: "AdvHD",
        extname: ".ws2",
    },
    {
        name: "ArcGameEngine",
        extname: ".bin",
    },
    {
        name: "Artemis",
        extname: [".asb", ".ast", ".txt"],
    },
    {
        name: "CatSystem2",
        extname: ".cst",
    },
    {
        name: "Cyberworks C,system",
        extname: ".a0",
    },
    {
        name: "AdvHD",
        extname: ".ws2",
    },
    {
        name: "KaGuYa",
        basename: "message.dat",
    },
    {
        name: "Kirikiri",
        extname: [".ks", ".scn", ".txt"],
    },
    {
        name: "Majiro",
        extname: ".mjo",
    },
    {
        name: "Musica",
        extname: ".sc",
    },
    {
        name: "Mware",
        extname: ".nut",
    },
    {
        name: "Propeller/Stuff Script Engine",
        extname: ".msc",
    },
    {
        name: "RealLive",
        extname: ".txt",
    },
    {
        name: "Ren'Py",
        extname: ".rpy",
    },
    {
        name: "ShSystem",
        extname: ".hst",
    },
    {
        name: "Silky's/AI6WIN",
        extname: [".mes", ".map"],
    },
    {
        name: "Softpal",
        basename: "script.src",
    },
    {
        name: "SystemNNN",
        extname: [".nnn", ".spt"],
    },
    {
        name: "TmrHiroAdvSystem",
        extname: ".srp",
    },
    {
        name: "Whale",
        extname: ".txt",
    },
    {
        name: "YU-RIS",
        extname: ".ybn",
        textProxyDll: "d3d9.dll"
    },
]

VNTextPatch.determineFileType = async function(file) {
    const result = [];
    for (let i in this.supportedTypes) {
        let supportedType = this.supportedTypes[i]
        if (supportedType?.extname) {
            let extNames = supportedType.extname;
            if (!Array.isArray(supportedType.extname)) extNames = [extNames];
            if (extNames.includes(nwPath.extname(file))) {
                result.push(supportedType);
            }
        }
    }
    return result;
}

VNTextPatch.determineDirType = async function(directory) {
    // todo determine game type by their directory
    if (!await common.isDirectory(directory)) return;
    const files = await common.readDir(directory);
    var index = {}
    for (let i in files) {
        let thisFile = files[i];
        let fType = this.determineFileType(thisFile);
        if (!fType || fType.length<1) continue;
        index[fType.name] = fType
    }
    return index;
}

VNTextPatch.copyProxyDll = async function(dllName, targetDir) {
    if (!dllName) return console.warn("Dll name is empty");
    const dllFile = nwPath.join(thisAddon.vnTextPatchDllProxyPath, dllName);
    if (!await common.isFileAsync(dllFile)) return console.warn("Cannot find dll", dllFile);
    const bCopy = require("better-copy");
    await bCopy(dllFile, targetDir)
}

VNTextPatch.getSJISpatchFile = async function(dir) {
    const result = await common.searchFile("sjis_ext.bin", dir);
    return result[0];
}

VNTextPatch.normalizeInitOptions = function(info = {}) {
    const normalized = common.clone(info || {});
    normalized.entryPoint ||= normalized.sourceDir || "";
    normalized.interface ||= normalized.init?.interface || vnTextPatchInterface || "json";
    normalized.format ||= normalized.init?.format || "";
    return normalized;
}

VNTextPatch.createProjectViaXlsx = async function(sourceDir, options) {
    options = options || {};
    const initOptions = this.normalizeInitOptions(options.init || {});
    if (await common.isDir(sourceDir) == false) {
        await ui.log("Invalid target directory ", sourceDir);
        return;
    }
    var xlsName     = nwPath.basename(sourceDir);
    var stagingInfo = await this.createStaging();
    var xlsPath     = nwPath.join(stagingInfo.cachePath, "data/sheet", xlsName+".xlsx");
    await common.mkDir(nwPath.dirname(xlsPath));
    if (await common.isFileAsync(xlsPath)) await fse.promises.unlink(xlsPath);

    var gameData    = nwPath.join(stagingInfo.cachePath, "data/gameData");
    
    await ui.log(`Copying data from ${sourceDir} to ${gameData}`);
    await bCopy(sourceDir, gameData, {overwrite:true});

    await ui.log(`Converting xlsx ${sourceDir} to ${nwPath.resolve(xlsPath)}`);
    await this.dirToXls(sourceDir, nwPath.resolve(xlsPath), options?.init?.format);

    if (await common.isFileAsync(xlsPath) == false) return console.error("Failed to process into spreadsheet");
    await ui.log("Creating trans object");
    var transObj    = await this.xlsToTrans(nwPath.resolve(xlsPath));
    await ui.log("Building project");
    transObj.project.cache          = stagingInfo;
    transObj.project.gameEngine     = thisAddon.engineName;
    transObj.project.loc		    = sourceDir;
    transObj.project.parserVersion	= thisAddon.package.version;
    transObj.project.parser         = thisAddon.package.name;
    transObj.project.projectId      = stagingInfo.cacheID;
    transObj.project.options ||= {};
    transObj.project.options.init   = {
        ...initOptions,
        entryPoint: sourceDir,
        interface: "xlsx"
    }

    return transObj;
}

VNTextPatch.createProjectViaJson = async function(sourceDir, options) {
    options = options || {};
    const initOptions = this.normalizeInitOptions(options.init || {});
    options.basePath ||= ""
    if (await common.isDir(sourceDir) == false) {
        await ui.log("Invalid target directory ", sourceDir);
        return;
    }

    var stagingInfo = options.stagingInfo || await this.createStaging();
    const jsonPath     = nwPath.join(stagingInfo.cachePath, `data/json`, options.basePath);
    if (await common.isDirectory(jsonPath)) {
        await common.rmdir(jsonPath);
    }
    await common.mkDir(jsonPath, true);

    var gameData    = nwPath.join(stagingInfo.cachePath, `data/gameData`, options.basePath);
    
    await ui.log(`Copying data from ${sourceDir} to ${gameData}`);
    await bCopy(sourceDir, gameData, {overwrite:true});

    await ui.log(`Generating JSON from ${sourceDir} to ${nwPath.resolve(jsonPath)}`);
    await this.jsonPatchDump(sourceDir, nwPath.resolve(jsonPath), options?.init?.format);

    if (!await common.isDirectory(jsonPath)) return console.error("Failed to process into JSON");
    await ui.log("Creating trans object");
    var transObj    = await this.jsonPatchToTrans(nwPath.resolve(jsonPath), options);
    await ui.log("Building project");
    transObj.project.cache          = stagingInfo;
    transObj.project.gameEngine     = thisAddon.engineName;
    transObj.project.loc		    = sourceDir;
    transObj.project.parserVersion	= thisAddon.package.version;
    transObj.project.parser         = thisAddon.package.name+"JSON";
    transObj.project.projectId      = stagingInfo.cacheID;
    transObj.project.options ||= {};
    transObj.project.options.init   = {
        ...initOptions,
        entryPoint: sourceDir,
        interface : "json"
    }

    return transObj;
}

VNTextPatch.createProject = async function(sourceDir, options) {
    options = options || {};
    const initOptions = this.normalizeInitOptions(options.init || {});
    options.init = initOptions;
    thisAddon.actorNames = {};
    if (await common.isDir(sourceDir) == false) {
        await ui.log("Invalid target directory ", sourceDir);
        return;
    }

    var transObj
    vnTextPatchInterface = initOptions.interface;
    if (initOptions.interface == "json") {
        transObj = await this.createProjectViaJson(sourceDir, options);
    } else {
        transObj = await this.createProjectViaXlsx(sourceDir, options);
    }
    ui.log("Initializing trans data...");
    trans.openFromTransObj(transObj, {isNew:true});

    ui.log("Creating actor reference...");

    trans.createFile(referenceName, "*");
    ui.log(`Registering actor's name. ${Object.keys(thisAddon.actorNames).length} record(s) found!`);
    for (let name in thisAddon.actorNames) {
        trans.addRow(referenceName, name);
    }
    if (Object.keys(thisAddon.actorNames).length) {
        ui.log(`<span style="color: aqua;">Hint: Utilize the <b>"Translate like this" (ctrl+l)</b> feature from the <b>"${referenceName}"</b> to translate all actor names in the project.</span>`)
    }
    thisAddon.actorNames = {};
    await ui.log("Done");
}

VNTextPatch.prepareNewProject = async function(info = {}) {
    const initOptions = this.normalizeInitOptions(info);
    const sourceDir = initOptions.entryPoint;
    if (await common.isDir(sourceDir) == false) {
        throw new Error(t(`Invalid destination directory:`)+`\n${sourceDir}`);
    }

    await VNTextPatch.createProject(sourceDir, {
        init: initOptions
    });
    await common.wait(150);
}



VNTextPatch.exportToFolderViaXlsx = async function(targetFolder, options) {
	console.log("export to folder with options:", options);
	options 						= options || this.options || {};
	options.transData				= options.transData || trans.getSaveData();

    // direct instance of trans.getTranslationData
    options.translationData = options.translationData || trans.getTranslationData(options.transData, {filterTag:options.filterTag, filterTagMode:options.filterTagMode, files:options.files});

    await common.mkDir(targetFolder);

    ui.log("Creating translation table");
    var sheetData = new SheetData();
    var transTable = sheetData.toTable(options.transData, options.translationData);

    for (var xlsBasename in transTable) {
        // source xlsx file
        var xlsxPath    = nwPath.join(options.transData.project.cache.cachePath, "data/sheet", xlsBasename);
        var sourceDir   = nwPath.join(options.transData.project.cache.cachePath, "data/gameData");

        ui.log(`Generating patch`);

        var patchFile = nwPath.join(nw.process.env.TEMP, "cellData.json");
        await common.filePutContents(patchFile, JSON.stringify(transTable[xlsBasename]), "utf-8", false);


        ui.log("Patching xlsx file");
        var newXls = await this.patchXls(xlsxPath, patchFile);
        ui.log(`Patched xlsx file: ${newXls}`);

        if (await common.isFileAsync(newXls) == false) {
            ui.log("Error: expected xlsx file not found at: ", newXls);
            ui.log("Probably the previous action was not completed successfully.");
            return;
        }

        ui.log(`Generating patch at: ${targetFolder}`);
        await this.xlsToDir(targetFolder, sourceDir, newXls);
        ui.log("Done");
    }
}

VNTextPatch.exportToFolderViaJson = async function(targetFolder, options) {
	console.log("export to folder with options:", options);
	options 						= options || this.options || {};
	options.transData				= options.transData || trans.getSaveData();

    ui.log("Creating target directory", targetFolder);
    await common.mkDir(targetFolder);
    
    const tempDir = nwPath.join(nw.process.env.TMP, options.transData.project.cache.cacheID);
    const tempJson = nwPath.join(tempDir, "json")
    const stagingPath = nwPath.resolve(options.transData.project.cache.cachePath);

    ui.log("Creating temp dir:"+tempJson);
    await common.rmdir(tempJson);
    await common.mkDir(tempJson);

    ui.log("Generating translated JSON");
    const jsonStaging = nwPath.join(stagingPath, "data/json");
    if (!await common.isDirectory(jsonStaging)) {
        ui.logError("Unable to find the target path on staging directory:", jsonStaging);
        return;
    }

    await this.jsonPatchFromTrans(options.transData, jsonStaging, tempJson, options);

    const dataStaging = nwPath.join(stagingPath, "data/gameData");
    ui.log("Patching original files with JSON into", targetFolder);

    if (!await common.isDirectory(dataStaging)) {
        ui.logError("Unable to find the target path on staging directory:", dataStaging);
        return;
    }

    
    if (!options.files || options.files?.length == 0) {
        ui.log("Patch directly from staging directory");
        await this.jsonPatchApply(targetFolder, dataStaging, tempJson, options.transData?.project?.options?.init?.format);
    } else {
        ui.log("Patch selected files", options.files);
        ui.log("Attention! Partial patch generation is not possible for some engine. ");
        ui.log("So, the parser will scann all the files and copy selected files into the target directory!")
        let tempBin = nwPath.join(tempDir, "bin");
        await common.mkDir(tempBin);

        ui.log("Generating filename filter");
        let fileNameFilter = []
        for (let i in options.files) {
            fileNameFilter.push(common.getFilename(options.files[i]))
        }

        await this.jsonPatchApply(tempBin, dataStaging, tempJson, options.transData?.project?.options?.init?.format);


        let tempBinContent = await common.readDir(tempBin)
        for (let i in tempBinContent) {
            let thisFile = tempBinContent[i]
            let thisFilename = common.getFilename(thisFile);
            if (!fileNameFilter.includes(thisFilename)) continue;

            ui.log("Copying :", thisFile);
            await common.copyFile(thisFile, targetFolder)
        }

        ui.log("Checking for the generated sjis_ext.bin file...")
        let sjisPatch = await this.getSJISpatchFile(tempBin);
        if (sjisPatch) {
            ui.log("Found at ", sjisPatch);
            await bCopy(sjisPatch, targetFolder, {overwrite:true})
        } else {
            ui.log("Not found.");
        }
    }



}

VNTextPatch.exportToFolder = async function(targetFolder, options) {
    if (trans.getOption("init")?.interface == "json") return this.exportToFolderViaJson(targetFolder, options);
    return this.exportToFolderViaXlsx(targetFolder, options);
}


VNTextPatch.exportAsZip = async function(targetPath, options) {
    // todo
    var tmpDir = nwPath.join(nw.process.env.TEMP, "tpp_"+common.generateId());
    try {
        await fse.remove(tmpDir); 
        await common.mkDir(tmpDir, {recursive:true});
    } catch(e) {
        console.warn("Unable to create directory ", tmpDir);
        console.error(e);
        return;
    }

    await this.exportToFolder(tmpDir, options);
    await ui.log("Zipping temporary data");
    var _7z = require('7zip-min');

    return new Promise((resolve, reject) => {
        _7z.cmd(['a', '-tzip', targetPath, tmpDir+"\\*"], err => {
            // done
            console.log("process done");
            resolve(targetPath);
        });	
    })
}

VNTextPatch.injectTranslation = async function(targetDir, sourceMaterial, options) {

    await this.exportToFolder(targetDir, options);

}



VNTextPatch.drawNewProject = async function() {
    var $slide = $(`
		<h1><i class="icon-plus-circled"></i>VN Translation Tool</h1>
		<div class="blockBox infoBlock withIcon">
            <h2>VNTranslationTools Ver.`+thisAddon.package.version+`</h2>

            <div><strong>Supported format:</strong></div>
			<ul>
                <li>AdvHD (.ws2)</li>
                <li>ArcGameEngine (.bin)</li>
                <li>Artemis (.txt)</li>
                <li>Buriko General Interpreter/Ethornell (no file extension; tool expects .bgi)</li>
                <li>CatSystem2 (.cst)</li>
                <li>Cyberworks C,system (no file extension; tool expects .csa)</li>
                <li>KaGuYa (message.dat)</li>
                <li>Kirikiri (.ks/.ks.scn)</li>
                <li>Majiro (.mjo)</li>
                <li>Musica (.sc)</li>
                <li>Mware (.nut)</li>
                <li>Propeller/Stuff Script Engine (.msc)</li>
                <li>RealLive (.rl)</li>
                <li>Ren'Py (.rpy)</li>
                <li>ShSystem (.hst)</li>
                <li>Silky's/AI6WIN (.mes/.map)</li>
                <li>Qlie (.s)</li>
                <li>Softpal (script.src - make sure text.dat is available in the same folder)</li>
                <li>SystemNNN (.nnn, .spt)</li>
                <li>WillPlus AdvHD (.ws2)</li>
                <li>Whale</li>
                <li>YU-RIS (.ybn)</li>
            </ul>
            <h2>Before you started</h2>
            <p>Please make sure you have a folder with unencrypted and extracted game data.<br />
            You can use various tool such as <a href='https://github.com/morkt/GARbro/releases/' class="external" external>GARBro</a> to extract your game data.</p>
            <p>After that, click the <b>"I have extracted the game data"</b> button on this dialog window.</p>
		</div>`);
		

	
	ui.newProjectDialog.addMenu({
		icon : thisAddon.getWebLocation()+"/icon.png",
        classes : "invertableImageColor",
		descriptionBar : `<h2>VN Translation Tools</h2>
						<p>Translate visual novels with VNTranslationTools.<br /> 
                            Supports 
                            AdvHD (.bin), 
                            ArcGameEngine (.bin), 
                            Artemis,
                            Buriko General Interpreter/Ethornell, 
                            CatSystem2 (.cst),
                            Cyberworks C,system,
                            KaGuYa (message.dat),
                            Majiro (.mjo),
                            Musica (.sc),
                            Mware (.nut),
                            Kirikiri (.ks/.ks.scn), 
                            Propeller (.msc),
                            RealLive (.rl),
                            Ren'Py (.rpy),
                            ShSystem (.hst),
                            Silky's/AI6WIN (.mes/.map),
                            Qlie (.s),
                            SystemNNN (.nnn, .spt),
                            WillPlus AdvHD (.ws2),
                            Whale
                            YU-RIS (.ybn),
                        </p>`,
		actionBar: "",
		goToSlide: 'VNTransTool',
		at:3,
		slides : {
			'VNTransTool': ui.newProjectDialog.newSlide("VNTransTool", $slide, {
                buttons: [
                            {
                                text: t("I have extracted the game data"),
                                click: async function() {
                                    ui.newProjectDialog.gotoSlide("VNTransTool2", "VNTransTool");
                                }
                            }
                        ]
            })
		}
	});

    var $slide2 = $(`
        <div>
            <div class="dialogSectionBlock">
                <h2 data-tran="">${t("Load game's data folder")}</h2>
                <div class="info" data-tran="">${t("Select the game's data folder")}</div>
                <div class="openDir"></div>
                <div class="dialogInfo alert alert-warning hidden" data-tran=""><i class="icon-attention red"></i> ${('Invalid path.')}<br>${('Some features will be disabled until this is fixed.')}</div>
            </div>
            <div class="dialogSectionBlock engineInfo hidden">
                <h2 data-tran="">${t("Engine Info")}</h2>
                <div class="info" data-tran="">${t("Currently detected engine")}</div>
                <label><input type="text" disabled class="engineInfoFld"></label>
            </div>
            <div class="dialogSectionBlock fieldgroup">
                <h2 data-tran="">${t("Manually Specify Format")}</h2>
                <div class="info" data-tran="">${t("Manually specify the game format.<br />VNTranslationTools will automatically detect the format based on the file extension. However, if you encounter ambiguous file extensions, please provide the format explicitly.")}</div>
                <label><input type="search" name="vnTextPatch_format" class="vnTextPatch_format" list="vnTextPatch_formatList" id="vnTextPatch_format"></label>
                <datalist id="vnTextPatch_formatList">
                    <option value="artemistxt" >Artemis engine (*.asb; *.ast; *.txt)</option>
                    <option value="ethornell" >Buriko General Interpreter/Ethornell (no extension)</option>
                    <option value="kirikiriks" >KiriKiri's scenario format (*.ks; *.scn; *.txt)</option>
                    <option value="reallive" >Uncompiled RealLive script (*.txt)</option>
                    <option value="tmrhiroadvsystemtext" >TmrHiroAdvSystem (*.srp; no extension)</option>
                    <option value="whale" >Whale engine(*.txt)</option>
                </datalist>
            </div>
            <div class="dialogSectionBlock fieldgroup">
                <h2 data-tran="">${t("Interface")}</h2>
                <div class="info" data-tran="">${t("VNTextPatch can parse the game into two formats: JSON or an XLSX spreadsheet. Please select the interface you want to use.")}<br /><b>${t("Warning: There is a row limit if you're choosing XLSX spreadsheet.")}</b></div>
                <label>
                    <select name="vnTextPatch_interface" class="vnTextPatch_interface">
                        <option value="json">JSON</option>
                        <option value="xlsx">xlsx</option>
                    </select>
                </label>
            </div>
        </div>    
    `);
    

    var $button = $('<input type="dvSelectPath" nwdirectory class="form-control selectDataFolder" name="selectDataFolder" value="" />')
	$button.on('change', async function() {
        //$slide2.find(".dialogSectionBlock.engineInfo").removeClass("hidden");
	});
	$slide2.find(".openDir").append($button);

    ui.newProjectDialog.newSlide("VNTransTool2", $slide2, {
		onActive : function(e, newProjectDialog) {
			$slide2.find(".dialogSectionBlock.engineInfo").addClass("hidden");
			$slide2.find(".vnTextPatch_format").val("");
			$slide2.find(".engineInfoFld").val("");
			$slide2.find(".vnTextPatch_interface").val("json");
            vnTextPatchInterface = $(this).val()
		},
		buttons: [
					{
						text: t("Create a new project"),
                        icon: "ui-icon-plusthick",
						click: async function() {
                            var sourceDir = $button.val();
                            if (await common.isDir(sourceDir) == false) return alert(t(`Invalid destination directory:`)+`\n${sourceDir}`);
                            ui.showLoading();
                            await ui.newProjectDialog.close();
                            await common.wait(300);

                            ui.loadingProgress("Processing", "Creating a new project via VNTranslationTools : "+sourceDir, {consoleOnly:false, mode:'consoleOutput'});
                            const options = VNTextPatch.normalizeInitOptions({
                                entryPoint: sourceDir,
                                format: $slide2.find(".vnTextPatch_format").val(),
                                interface: $slide2.find(".vnTextPatch_interface").val()
                            });
                            ui.log("Creating a new project via VNTextPatch with option:", options)

                            vnTextPatchInterface = options.interface;
                            ui.log("Using interface: "+ vnTextPatchInterface);

                            await VNTextPatch.prepareNewProject(options);
                            ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
                            ui.loadingEnd();
						}
					}
				]
	});
}

/**
 * Reads and parses the VNTextPatch.exe.config file.
 *
 * @returns {object} An object containing the configuration values.
 */
VNTextPatch.getConfiguration = function() {
    const path = require("path");
    const configPath = path.join('www', 'addons', 'VNTextPatch', 'bin', 'VNTextPatch', 'VNTextPatch.exe.config');
    try {
        const xmlContent = fs.readFileSync(configPath, 'utf-8');
        const config = {};

        const appSettingsRegex = /<add key="([^"]+)" value="([^"]+)" \/>/g;
        let match;
        while ((match = appSettingsRegex.exec(xmlContent)) !== null) {
            const key = match[1];
            const value = match[2];

            if (key === 'MonospaceCharactersPerLine' || key === 'ProportionalFontSize' || key === 'ProportionalLineWidth' || key === 'SecondaryProportionalLineWidth') {
                config[key] = parseInt(value, 10);
            } else if (key === 'ProportionalFontBold') {
                config[key] = value.toLowerCase() === 'true';
            } else {
                config[key] = value;
            }
        }
        return config;
    } catch (error) {
        console.error("Error reading or parsing the configuration file:", error);
        return null;
    }
}
/**
 * Updates the VNTextPatch.exe.config file with new values.
 *
 * @param {object} newConfig - An object with the configuration keys and their new values.
 */
VNTextPatch.setConfiguration = function(newConfig = {}) {
    // handle two arguments of string;
    if (typeof newConfig === 'string' && arguments.length === 2) {
        const key = newConfig;
        const value = arguments[1];
        newConfig = {};
        newConfig[key] = value;
    }
    if (!newConfig || typeof newConfig !== 'object') {
        console.error("Invalid configuration object provided.");
        return;
    }
    const path = require("path");
    const configPath = path.join('www', 'addons', 'VNTextPatch', 'bin', 'VNTextPatch', 'VNTextPatch.exe.config');
    try {
        let xmlContent = fs.readFileSync(configPath, 'utf-8');

        for (const key in newConfig) {
            if (Object.hasOwnProperty.call(newConfig, key)) {
                let value = newConfig[key];
                if (key=== "ProportionalFontBold") {
                    value = value ? "true" : "false"; // Convert boolean to string
                    if (value === "1") value = "true"; // Handle numeric boolean
                }
                const updateRegex = new RegExp(`(<add key="${key}" value=")([^"]+)(" \\/>)`);
                if (updateRegex.test(xmlContent)) {
                    xmlContent = xmlContent.replace(updateRegex, `$1${value}$3`);
                }
            }
        }

        fs.writeFileSync(configPath, xmlContent, 'utf-8');
    } catch (error) {
        console.error("Error reading or writing the configuration file:", error);
    }
}

VNTextPatch.getConfigurationForm = function() {
    const that = this;
    const form = {
        jsonForm: {
            schema: {
                MonospaceCharactersPerLine: {
                    title: "Monospace Characters Per Line",
                    description: "Set the number of monospaced characters per line in the exported project.",
                    type: "number",
                    default: 50
                },
                ProportionalFontName: {
                    title: "Proportional Font Name",
                    description: "Set the name of the proportional font for line width calculation used in the exported project.",
                    type: "string",
                    default: "Franklin Gothic Book"
                },
                ProportionalFontSize: {
                    title: "Proportional Font Size",
                    description: "Set the size of the proportional font for line width calculation used in the exported project.",
                    type: "number",
                    default: 40
                },
                ProportionalFontBold: {
                    title: "Proportional Font Bold",
                    description: "Set whether the proportional font is bold for line width calculation used in the exported project.",
                    type: "boolean",
                    default: false
                },
                ProportionalLineWidth: {
                    title: "Proportional Line Width",
                    description: "Set the line width for proportional font used in the exported project.",
                    type: "number",
                    default: 1000
                },
                SecondaryProportionalLineWidth: {
                    title: "Secondary Proportional Line Width",
                    description: "Set the secondary line width for proportional font used in the exported project.",
                    type: "number",
                    default: 1000
                }
            },
            form: [
                {
                    type: "html",
                    value: `<h2>VNTextPatch Configuration</h2>`
                },
                // {
                //     type: "info",
                //     value: `Your previous save data may not be fully compatible with the translated Game.`
                // },
                {
                    key: "MonospaceCharactersPerLine",
                    onChange: function(event) {
                        const value = event.target.value;
                        that.setConfiguration({ MonospaceCharactersPerLine: value });
                    }
                },
                {
                    key: "ProportionalFontName",
                    onChange: function(event) {
                        const value = event.target.value;
                        that.setConfiguration({ ProportionalFontName: value });
                    }
                },
                {
                    key: "ProportionalFontSize",
                    onChange: function(event) {
                        const value = event.target.value;
                        that.setConfiguration({ ProportionalFontSize: value });
                    }
                },
                {
                    key: "ProportionalFontBold",
                    onChange: function(event) {
                        const value = event.target.checked;
                        that.setConfiguration({ ProportionalFontBold: value });
                    }
                },
                {
                    key: "ProportionalLineWidth",
                    onChange: function(event) {
                        const value = event.target.value;
                        that.setConfiguration({ ProportionalLineWidth: value });
                    }
                },
                {
                    key: "SecondaryProportionalLineWidth",
                    onChange: function(event) {
                        const value = event.target.value;
                        that.setConfiguration({ SecondaryProportionalLineWidth: value });
                    }
                },
            ],
            value: this.getConfiguration()
        }
    };
    return form;
}

thisAddon.VNTextPatch = VNTextPatch;


var init = async function() {
    VNTextPatch.drawNewProject();

    engines.addHandler(thisAddon.engineName, 'exportHandler', async function(targetPath, options) {
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		console.log("%cExport handler", "color:salmon", arguments);

		ui.showLoading();
		ui.loadingProgress("Processing", "Export into : "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		await ui.log("Target directory:", targetPath);
		await ui.log("Options : ", options);
		await ui.log("Origin path is cache path");

		if (options.mode == "dir") {
			await VNTextPatch.exportToFolder(targetPath, options);
		} else if (options.mode == "zip") {
			await VNTextPatch.exportAsZip(targetPath, options);
		}
        ui.loadingEnd();
        return common.halt();
	});

    engines.addHandler(thisAddon.engineName, 'injectHandler', async function(targetDir, sourceMaterial, options) {
		console.log("%cInject handler", "color:salmon", arguments);

        if (!await common.isDirectory(sourceMaterial)) {
            alert("Source material directory not found!");
            return common.halt();
        }
        if (!await common.isDirectory(targetDir)) {
            alert("Target directory not found!");
            return common.halt();
        }
		ui.showLoading();
		ui.loadingProgress("Processing", "Injecting translation", {consoleOnly:false, mode:'consoleOutput'});

        await ui.log("This action will combine all the resource from "+sourceMaterial);
        await ui.log("with your translated material of your selection!");

        const bCopy = require("better-copy")
		if (["copyNothing"].includes(options.copyOptions) == false) {
			await ui.log(`Copy ${sourceMaterial} to ${targetDir}`);
			var overWrite = true;
			if (options.copyOptions == "copyIfNotExist") overWrite = false;
			await ui.log("Overwrite option: "+overWrite.toString());
			await bCopy(sourceMaterial, targetDir, {
				onBeforeCopy: async (from, to) => {
					await ui.log(`Start copying ${from}`);
				},
				onAfterCopy: async (from, to) => {
					await ui.log(`Successfully copied into ${to}`);
				},
				overwrite: overWrite
			});
		}

        options.files = trans.getCheckedFiles();
        if (empty(options.files)) options.files = trans.getAllFiles();
		await VNTextPatch.injectTranslation(targetDir, sourceMaterial, options);

		ui.loadingProgress("Finished", "Finished!", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingEnd();
		ui.showCloseButton();

		return common.halt();
	});

    engines.addHandler(thisAddon.engineName, 'onOpenInjectDialog', async function($dialog, options) {
        console.log("%cInject dialog handler", "color:salmon", arguments);
		var $copyOption = $dialog.find(".copyOptionsBlock");
		$copyOption.removeClass("hidden");
	});

    engines.addHandler(thisAddon.engineName,"exportOptionFields", ()=> {
		return VNTextPatch.getConfigurationForm();
	})

	engines.addHandler(thisAddon.engineName,"injectOptionFields", ()=> {    
        return VNTextPatch.getConfigurationForm();
    });

        engines.addHandler(supportedEngines, 'updateProjectHandler', async function() {
		await VNTextPatch.updateProject();
		return common.halt();
	});


    ui.mainMenu.addChild("tools", {
        id: "vntextpatch",
        label: "VN Translation Tools"
    });

    ui.mainMenu.addChild("vntextpatch", {
        label: "Edit Configuration",
    }).on("select", async function() {
        ui.form(VNTextPatch.getConfigurationForm(), {
            title: "VNTextPatch Configuration",
            buttons: [
				{
					text: t("Close"),
					icon: "ui-icon-close",
					click: function() {
						$(this).dialog( "close" );
					}
				},
            ]
        });
    });
}

$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});