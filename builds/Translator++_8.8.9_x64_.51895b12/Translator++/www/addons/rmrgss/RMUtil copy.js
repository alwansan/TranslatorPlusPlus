var thisAddon 	= this;
var appName 	= this.package.name;
var spawn 		= spawn || require('child_process').spawn;
var ws 			= ws || require('windows-shortcuts');
var ini 		= ini || require('ini')
var stripBom	= require('strip-bom');
var bCopy 		= require('better-copy');
var fse 		= fse || require('fs-extra');
var afs 		= afs || require('await-fs');
var pSpawn 		= require('promisify-child-process').spawn;
var ini 		= require("ini");
var pLimit 		= require('p-limit');
const shell 	= require('shelljs');

var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");

const decrypterPath = nwPath.join(__dirname, "3rdParty/RgssDecrypter/");
const thisPath  = thisAddon.getPathRelativeToRoot();
thisAddon.debugLevel = 0;

this.optionsForm = {
		"booleanValue": {
			"type": "boolean",
			"title": t("Use legacy parser"),
			"description": t("Use the old parser prior to (Translator++ ver. 3.8.12). The old parser doesn't support some newly added features."),
			"HOOK": "thisAddon.config.useLegacyParser",
			"inlinetitle": t("Use old parser"),
			"fieldHtmlClass":"flipSwitch"
		},
		"eventThreadsConcurrency": {
			"type": "range",
			"maximum" : 16,
			"minimum" : 0,
			"indicator":true,
			"title": t("Event's thread concurrency"),
			"description": t("<b>Warning! Experimental feature!</b><br />This option determines the maximum number of worker threads that can concurrently parse event data on the Map and CommonEvents. <b>Set to 0 to disable worker thread</b>. <br />This option has the potential to accelerate the parsing process in larger games. However, it is important to note that in smaller games, enabling this option may actually slow down the parsing process due to the higher execution overhead compared to the parsing time for each data."),
			"HOOK": "thisAddon.config.eventThreadsConcurrency",
			"onInput": function() {
				console.log("onInput");
			}
		},
		"numberOfCommandInEventToThread": {
			"type": "number",
			"minimum" : 0,
			"indicator":true,
			"title": t("The minimum number of command in an event that allowed in thread worker"),
			"description": t("<b>Warning! Experimental feature!</b><br />Thread workers incur overhead during execution, which means that processing blank events or events with a low number of commands can actually hinder the overall process. This option enables you to specify the minimum number of commands an event must have in order to be parsed in a worker thread. <br />It is important to note that even blank events contain one command, and it is more efficient to process such events in the main thread rather than in a worker thread. Therefore, it is recommended to set this number to a value <b>greater than 1</b>.<br />Set to 0 to disable splitting task based on commands."+
			"Note that a blank event actually contains one command, and you definitely want to process blank events in the main thread instead of a worker thread. You should set this number to a value greater than 1."),
			"HOOK": "thisAddon.config.numberOfCommandInEventToThread",
			"onInput": function() {
				console.log("onInput");
			}
		},
}

thisAddon.config = thisAddon.config || {};
if (typeof thisAddon.config.eventThreadsConcurrency == 'undefined')  thisAddon.config.eventThreadsConcurrency = 0;
if (typeof thisAddon.config.numberOfCommandInEventToThread == 'undefined')  thisAddon.config.numberOfCommandInEventToThread = 2;

var limit		= pLimit(parseInt(thisAddon.config.eventThreadsConcurrency)||1);

var {
    YAML,
    GameIniParser,
    RGSSParser,
    RMData,
    attachments,
	customTags,
	decodeBinaryInYAML,
	b64DecodeUnicode,
    b64EncodeUnicode,
    YAMLUtil,
} = require("www/addons/rmrgss/rmrgss.module.js");

thisAddon.GameIniParser = GameIniParser;
thisAddon.RGSSParser 	= RGSSParser;
thisAddon.RMData 		= RMData;



/**
 * @param  {} gameFile
 * @param  {} options
 * @class
 */
var RMUtil = function(gameFile, options) {
	if (common.isDir(gameFile)) {
		this.dirname = gameFile;
	} else {
		this.dirname = nwPath.dirname(gameFile);
	}
	this.options 	= options || {};
	this.engineCode = this.options.engineCode || "";
	this.writeMode 	= false;
	this.targetDir  = undefined;


	thisAddon.config.numberOfCommandInEventToThread = parseInt(thisAddon.config.numberOfCommandInEventToThread)
	thisAddon.config.eventThreadsConcurrency = parseInt(thisAddon.config.eventThreadsConcurrency);
}

RMUtil.translateEngineType = function(parserType) {
	if (parserType == "ace") return "rmvxace";
	if (parserType == "xp") return "rmxp";
	if (parserType == "vx") return "rmvx";
}

RMUtil.attachments = attachments;

/*
RMUtil.type = {};

if (isYamlVer2) {
	RMUtil.type.binary = {
		identify: value => value instanceof Uint8Array,
		// Buffer inherits from Uint8Array
		default: false,
		tag: '!binary',
	  
		resolve: (doc, node) => {
		  //const src = YAMLUtil.resolveString(doc, node);
		  return b64DecodeUnicode(doc);
		},
		options: YAMLUtil.binaryOptions,
		stringify: function (data, ctx, onComment, onChompKeep) {
		  // convert to plain
		  //console.log(arguments);
		  data.value = b64EncodeUnicode(data.value);
		  //type = "PLAIN"
		  return YAMLUtil.stringifyString(data, ctx, onComment, onChompKeep);
		}
	}
} else {
	// use legacy
	RMUtil.type.binary = {
		identify: value => value instanceof Uint8Array,
		// Buffer inherits from Uint8Array
		default: false,
		tag: '!binary',
	  
		resolve: (doc, node) => {
			const src = YAMLUtil.resolveString(doc, node);
			const result = b64DecodeUnicode(src);
			console.log("----Resolving binary", src, "result:", result);
	
			return result;
		},
		options: YAMLUtil.binaryOptions,
		stringify: function (data, ctx, onComment, onChompKeep) {
			// convert to plain
			//console.log(arguments);
			data.value = b64EncodeUnicode(data.value);
			//type = "PLAIN"
			return YAMLUtil.stringifyString(data, ctx, onComment, onChompKeep);
		}
	}
}
*/
RMUtil.customTags =  customTags;

/**
 * Decode all binary in YAML files in a folder
 * This function cannot be used in the sub thread. Because the custom decoder doesn't work in the sub thread
 * @param  {string} directoryPath - The directory path
 */
RMUtil.decodeAllYAML = async function(directoryPath) {
	if (!await common.isDir(directoryPath)) return console.warn("Directory not found", directoryPath);
	const yamlFiles = await common.searchFile("*.yaml", directoryPath);
	for (let i=0; i<yamlFiles.length; i++) {
		let yamlFile = yamlFiles[i];
		//await decodeBinaryInYAML(yamlFile, yamlFile, "utf8");
		const yamlContent = await fs.promises.readFile(yamlFile, "utf8");
		if (!yamlContent.includes("!binary")) {
			continue;
		}
		ui.log(`Decoding binary in ${yamlFile}`);

		const yamlData = YAML.parseDocument(yamlContent, { customTags: [{
			identify: value => value instanceof Uint8Array,
			// Buffer inherits from Uint8Array
			default: false,
			tag: '!binary',
	
			resolve: (doc, node) => {
				console.log("----Binary mode");
				const src = YAMLUtil.resolveString(doc, node);
				const result = b64DecodeUnicode(src);
				console.log("----Resolving", src, "result:", result);
		
				return result;
			},
			options: YAMLUtil.binaryOptions,
			stringify: function (data, ctx, onComment, onChompKeep) {
				// convert to plain
				//console.log("encoding", arguments);
				data.value = data.value;
				data.type = "QUOTE_DOUBLE"
				// data.tag = "PLAIN";
				//type = "PLAIN"
				return YAMLUtil.stringifyString(data, ctx, onComment, onChompKeep);
			}
		}] });
		let yamlString = yamlData.toString();
		yamlString = yamlString.replace(/!binary /g, "");
		await fs.promises.writeFile(yamlFile, yamlString, "utf8");
	}
}

RMUtil.decodeAllYAMLThread = async function (directoryPath) {
    if (!await common.isDir(directoryPath)) {
        return console.warn("Directory not found", directoryPath);
    }

    const yamlFiles = await common.searchFile("*.yaml", directoryPath);
    if (!yamlFiles.length) {
        return console.log("No YAML files found in directory", directoryPath);
    }

    const limit = pLimit(10); // Limit to 10 concurrent worker threads

    async function fetchFromWorker(parameter) {
        return new Promise((resolve, reject) => {
            const worker = new Worker("./www/addons/rmrgss/xp-decoder.thread.js", { workerData: parameter });
            worker.on("message", (msg) => {
                console.log(`--Worker message received:`, msg);
                resolve(msg);
            });
            worker.on("error", (err) => {
                console.error(err);
                reject(err);
            });
            worker.on("exit", (code) => {
                if (code !== 0) {
                    console.error(`--Worker exited with code:`, code);
                    reject(new Error(`Worker exited with code ${code}`));
                } else {
                    console.log(`--Worker exited successfully`);
                    resolve();
                }
            });
        });
    }

    // Prepare tasks for decoding YAML files
    const tasks = yamlFiles.map((filepath) => {
		ui.log(`Decoding binary in ${filepath}`);
        const param = {
            command: "decodeXPDataFile",
            file: filepath,
            saveTo: filepath,
        };
        return limit(() => fetchFromWorker(param));
    });

    try {
        await Promise.all(tasks);
        console.log("All YAML files have been processed.");
    } catch (error) {
        console.error("Error while processing YAML files:", error);
    }
};

/**
 * Merge the segmented common events into a single file
 * Will combine the files inside given yamlFolder with the project's staging directory
 * Will remove the segmented files after merging
 * @param {String} yamlFolder 
 * @return {Promise<String>|boolean} - The path of the merged file
 */
RMUtil.prototype.prepareSegmentedCommonEvents = async function(yamlFolder) {
	console.log("prepareSegmentedCommonEvents", yamlFolder);
	const stagingDir = nwPath.join(this.getUnpackedDir(), "YAML");
	const targetDir = nwPath.join(yamlFolder, "YAML");
	let commonEventsFiles = await common.searchFile("CommonEvents-*.yaml", targetDir);
	console.log("Looking up commonEvents segment at stagingDir", stagingDir, "found", commonEventsFiles);

	// if no segmented commonevents file found, exit
	if (commonEventsFiles.length === 0) {
		return false;
	}
	ui.log("Merging segmented common events at "+targetDir);

	const originalCommonEventsFile = await common.searchFile("CommonEvents-*.yaml", stagingDir);

	// remove original commonevents.yaml file

	// copy original common events file to yamlFolder, do not overwrite!
	for (let i = 0; i < originalCommonEventsFile.length; i++) {
		// if file exist, skip
		if (await common.isFile(nwPath.join(targetDir, nwPath.basename(originalCommonEventsFile[i])))) {
			continue;
		}
		await fs.promises.copyFile(originalCommonEventsFile[i], nwPath.join(targetDir, nwPath.basename(originalCommonEventsFile[i])));
	}

	// merge segmented common events
	await thisAddon.mergeCommonEvents(targetDir);

	// remove segmented common events
	commonEventsFiles = await common.searchFile("CommonEvents-*.yaml", targetDir);
	for (let i = 0; i < commonEventsFiles.length; i++) {
		await common.unlink(commonEventsFiles[i]);
	}
}

RMUtil.getDataFiles = async function(gameDir, engineType, options) {
	if (engineType == "ace") {
		return await common.searchFile("*.rvdata2", gameDir);
	} else if (engineType == "xp") {
		return await common.searchFile("*.rxdata", gameDir);
	} else if (engineType == "vx") {
		return await common.searchFile("*.rvdata", gameDir);
	}
}


/**
 * Decode rpgMaker data files in a folder into YAML files
 * @param  {string} targetDir - The directory path
 */
RMUtil.prototype.unpackTo = async function (targetDir) {
    targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
    console.log("Unpacking RM data", this.dirname, "to", targetDir);

    const thisEngineType = await this.getEngineCode();
    await common.mkDir(targetDir);
    const binPath = nwPath.join(thisPath, "bin/rvpacker/rvpacker.rb");
    const options = {
        onData: function (buffer) {
            ui.log(buffer.toString());
        }
    };

    // Get the list of data files to process
    const dataFiles = await RMUtil.getDataFiles(this.dirname, thisEngineType);

    // Limit the number of concurrent instances to 7
    const limit = pLimit(7);

    const tasks = dataFiles.map((file) => {
        const fileNameWithoutExt = nwPath.basename(file, nwPath.extname(file));
        return limit(() =>
            common.aSpawn(nw.App.manifest.localConfig.ruby, [
                binPath,
                "-a", "unpack",
                "-d", this.dirname,
                "-t", thisEngineType,
                "-V", "-f",
                "-T", targetDir,
                "-D", fileNameWithoutExt
            ], options)
        );
    });

    // Wait for all tasks to complete
    await Promise.all(tasks);

    await ui.log(`Copy: ${nwPath.join(this.dirname, "Game.ini")} to ${targetDir}`);
    await common.copyFile(nwPath.join(this.dirname, "Game.ini"), targetDir);

    console.log("Decoding binary in YAML files");
    await RMUtil.decodeAllYAMLThread(targetDir);

    // Look for common events and split them
    const commonEventFiles = await common.searchFile("CommonEvents.yaml", targetDir);
    if (commonEventFiles.length) {
        ui.log("Splitting common events " + commonEventFiles[0]);
        await thisAddon.splitCommonEvents(commonEventFiles[0]);
        // Remove the original file
        await common.unlink(commonEventFiles[0]);
    }

    this.targetDir = targetDir;
    this.unpacked = true;
    return this;
};


/**
 * Repack YAML files into RPG Maker binary data into the target directory
 * @param  {string} targetDir - The target directory
 * @param  {string} yamlFolder - The folder where the YAML files are placed
 * @returns {RMUtil} - The RMUtil object
 * @async
 */
RMUtil.prototype.repackTo = async function(targetDir, yamlFolder) {
	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
	console.log("Repack project", this.dirname, "to", targetDir);
	if (await common.isDirectory(targetDir) == false) return console.warn(`ERROR: Directory ${targetDir} is not found!`);
	
	await common.mkDir(yamlFolder);

	await ui.log("Repacking project to "+targetDir);
	await this.prepareSegmentedCommonEvents(yamlFolder);
	
	var thisEngineType = await this.getEngineCode();
	//await common.aSpawn(nwPath.join(thisPath, "bin/rvpacker.exe"), ["-a", "pack", "-d", this.dirname, "-t", thisEngineType, "-V", "-f", "-T", targetDir]);
	var binPath = nwPath.join(thisPath, "bin/rvpacker/rvpacker.rb");
	var options = {
		onData: function(buffer) {
			ui.log(buffer.toString());
		}
	}
	await common.aSpawn(nw.App.manifest.localConfig.ruby, [binPath, "-a", "pack", "-d", targetDir, "-t", thisEngineType, "-V", "-f", "-T", yamlFolder], options);

	//await ui.log(`Copy: ${nwPath.join(this.dirname, "Game.ini")} to ${targetDir}`);
	//await common.copyFile(nwPath.join(this.dirname, "Game.ini"), targetDir);

	console.log("Repack finished!");
	return this;
}

/**
 * Set the RMUtil with the previously unpacked game using RMUtil.prototype.unpackTo
 * Root directory of the game or cache where folder "YAML" and "Scripts" are placed
 * @param  {String} targetDir
 */
RMUtil.prototype.setUnpackedDir = async function(targetDir) {
	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
	ui.log("Set unpacked dir to :"+targetDir);

	this.targetDir = targetDir;
	this.unpacked = true;

	// check existance of extracted tes
	var dataExtension = await this.getDataExtension();
	var tesDir 	= nwPath.join(targetDir, "main."+dataExtension);
	this.hasTes	= false;
	if (await common.isDir(tesDir)) {
		this.hasTes 		= true;
		this.tesExtractPath = tesDir;
	}
	return this;	
}

RMUtil.prototype.getUnpackedDir = function() {
	return this.targetDir;
}

RMUtil.prototype.addFiles = async function(files) {
	if (typeof files == "string") files = [files];

	this.contents = this.contents || {
		yaml:[],
		scripts:[],
		gameIni: ""
	};
	this.parsed = this.parsed ||{
		document:{},
		scripts:{}
	};

	for (var i=0; i<files.length; i++) {
		var extName = nwPath.extname(files[i]).toLowerCase();
		if (extName == ".yaml") {
			this.contents.yaml.push(files[i]);
		} else if (extName == ".rb") {
			this.contents.scripts.push(files[i]);
		} else if (extName == ".ini") {
			this.contents.gameIni = files[i];
		} else {
			console.warn("Unknown handler file with extension : ", extName);
		}

	}

	/*
	for (var i=0; i<this.contents.yaml.length; i++) {
		if (nwPath.extname(this.contents.yaml[i]) !== ".yaml") continue;
		this.parsed.document[this.contents.yaml[i]] = YAML.parseDocument(await common.fileGetContents(this.contents.yaml[i], "utf8"), {customTags: RMUtil.customTags});
	}
	*/
	return this;
}

RMUtil.prototype.toObj = async function(targetDir) {
	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;;
	if (!this.unpacked) await this.unpackTo(targetDir);

	this.contents = {
		yaml	:[],
		scripts	:[],
		gameIni	:nwPath.join(targetDir, "Game.ini")
	};
	this.parsed = {
		document:{},
		scripts	:{}
	};

	this.contents.yaml 		= await common.readDir(nwPath.join(targetDir, "YAML"));
	this.contents.scripts 	= await common.readDir(nwPath.join(targetDir, "Scripts"));
	
	this.targetDir 			= targetDir;
	return this;
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

RMUtil.prototype.parseScript = async function(options) {
	options = options || this.options || {};
	options.translationDatas = options.translationDatas || this.options.translationDatas || {};
	if (this.contents.scripts.length) {
		console.log("Parsing script");
		ui.log("Start parsing scripts");
	}

	for (var i=0; i<this.contents.scripts.length; i++) {
		var scriptPath = this.contents.scripts[i];
		if (nwPath.extname(scriptPath) !== ".rb") continue;

		var fileInfo = {};
		var relativePath 		= common.getRelativePathFromNode(scriptPath, "Scripts", true);
		fileInfo.extension 		= nwPath.extname(scriptPath).toLowerCase().substring(1);
		fileInfo.dataType 		= "ruby";
		fileInfo.filename 		= nwPath.basename(scriptPath, nwPath.extname(scriptPath));
		fileInfo.basename 		= nwPath.basename(scriptPath);
		fileInfo.path 			= relativePath;
		fileInfo.relPath		= relativePath;
		fileInfo.dirname 		= "/"+nwPath.dirname(relativePath);

		this.parsed.scripts[scriptPath] = new RGSSParser(await common.fileGetContents(scriptPath, "utf8"), options)
		var rgssParser = this.parsed.scripts[scriptPath];
		rgssParser.fileInfo		= fileInfo;
		rgssParser.assignTranslationPair(relativePath);

		//var relativePath 		= common.getRelativePath(scriptPath, this.dirname);
		//var relativePath 		= common.getRelativePathFromNode(scriptPath, "Scripts", true);
		ui.log(`Parsing : ${relativePath}`);

		rgssParser.parse();
	}
	return this;
}

RMUtil.prototype.parseGameIni = async function(options) {
	if (!this.contents.gameIni) return this;
	console.log("Parsing Game.ini");
	ui.log("Parsing Game.ini");
	options = options || this.options || {};
	options.translationDatas = options.translationDatas || this.options.translationDatas || {};
	var scriptPath = this.contents.gameIni;

	var fileInfo = {};
	// todo determine relative path
	var relativePath 		= "Game.ini"
	fileInfo.extension 		= "ini";
	fileInfo.dataType 		= "ini";
	//fileInfo.filename 		= nwPath.basename(scriptPath, nwPath.extname(scriptPath));
	fileInfo.filename 		= "Game.ini";
	fileInfo.basename 		= nwPath.basename(scriptPath);
	fileInfo.path 			= relativePath;
	fileInfo.relPath		= relativePath;
	fileInfo.dirname 		= "/"

	this.parsed.gameIni = new GameIniParser(await common.fileGetContents(scriptPath), options)
	var iniParser 		= this.parsed.gameIni;
	iniParser.fileInfo		= fileInfo;

	ui.log(`Parsing : ${scriptPath}`);

	iniParser.assignTranslationPair(relativePath);


	await iniParser.parse();
	console.log("Game.ini parser:", iniParser);
	this.gameTitle = iniParser.gameTitle;
	await ui.log("detected game title:"+this.gameTitle);
	return this;
}

RMUtil.prototype.parseThisPath = function(path) {
	if (empty(this.options.files)) return true;
	if (this.options.files.includes(path)) return true;
	path = path.replaceAll("\\", "/");
	if (this.options.files.includes(path)) return true;

	var mergedPath = "|"+this.options.files.join("|");
	if (path == "YAML/Scripts.yaml") {
		if (mergedPath.includes("|Scripts/")) return true;
	//} else if (path.includes("YAML/System.yaml")) {
	//	if (mergedPath.includes("|main.rvdata2/")) return true;
	} else if (path.includes("YAML/main.yaml")) {
		if (mergedPath.includes("|main.rvdata2/")) return true;
	}

	return false;
}

RMUtil.detectMode = function(file) {
	if (nwPath.basename(file).toLowerCase == "scripts.yaml") {
		return "script";
	} else if (nwPath.basename(file).toLowerCase == "main.yaml") {
		return "tes";
	} else if (nwPath.extname(file).toLowerCase == ".ini") {
		return "ini";
	} else if (nwPath.extname(file).toLowerCase == ".yaml") {
		return "data";
	}
}

RMUtil.fetchCommandListWorker = async function(rmData, commands, baseContext=[], options={}) {
	// if not using worker
	console.log("fetchCommandListWorker", arguments);
	//return await rmData.fetchCommandList(commands, baseContext);
	if (!thisAddon.config.eventThreadsConcurrency) {
		console.log("eventThreadsConcurrency is disabled sending event in one batch");
		return await rmData.fetchCommandList(commands, baseContext);
	}
	console.log("using worker");
	if (commands?.items.length <= thisAddon.config.numberOfCommandInEventToThread) {
		var result = await rmData.fetchCommandList(commands, baseContext);
		console.log("Expected result is", result);
	
		return result;
	}

	async function fetchFromWorker(parameter) {
		return new Promise((resolve, reject) => {
			var worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {workerData: parameter});
			worker.on("message", msg => {
				console.log(`--Worker message received: `, msg);
				resolve(msg)
			});
			worker.on("error", err => {
				console.error(err)
				reject()
			});
			worker.on("exit", code => {
				console.log(`--Worker exited with code :`, code)
				resolve()	
			});
		})
	}


	var docEventList = rmData.script.newDocumentIn(options.documentPath);
	console.log("docEventList", docEventList);
	var param = {
		command: "parseEventList",
		baseContext: baseContext,
		rmDataProperties: {
			options: {
				options: rmData.options?.options,
				engineType:rmData.options?.engineType,
			},
			translationPair:rmData.translationPair,
			translationInfo:rmData.translationInfo
		},
		yamlList : docEventList.toString(),
	}
	console.log("Generated parameter", param)

	var workerResult = await fetchFromWorker(param);
	console.log("workerResult", workerResult)

	rmData.importTransData(workerResult?.result);
	
	console.log("current rmData:", rmData);
	// if workerResult.translatedCommands is empty, then thread do not send back the new translation commands because there are no translations
	// this is to save execution time. Return back the original commands
	if (!workerResult?.result?.translatedCommands) return commands.items;

	var listDoc = YAML.parseDocument(workerResult?.result?.translatedCommands);
	rmData.script.anchors.map = {...rmData.script.anchors.map, ...listDoc.anchors.map}
	console.log("Original yaml list:", commands);
	console.log("Translated yaml list:", listDoc.contents.items);
	console.log("translated yamlData", listDoc);

	return listDoc.contents.items;
}

RMUtil.parseCommonEventsYaml = async function(file, rmData) {

}

// ============================
// new parser handler

RMUtil.prototype.parse = async function (files, mode, options) {
    console.warn("Parsing", files, "with args", arguments);
    mode = mode || "all"; // all, data, ini, script, tes
    options = options || this.options || {};
    options.translationDatas = options.translationDatas || this.options.translationDatas || {};
    console.log("Parsing option is", options);

    // Reset attachments
    RMUtil.attachments = {};

    if (!this.parsed) await this.toObj();
    this.parsed.rmdata = {};
    console.log("Start parsing game data");

    files = files || this.contents.yaml;

    if (mode === "all" || mode === "data") {
        if (this.isConcurrentParsing) {
            // Use p-limit for concurrent parsing
			console.log("%c Concurrent parsing enabled of 7", "color: pink");
            const limit = pLimit(7);

            await Promise.all(
                files.map(file => 
                    limit(async () => {
                        await this.processFile(file, options);
                    })
                )
            );
        } else {
            // Sequential processing
            for (const file of files) {
                await this.processFile(file, options);
            }
        }
    }

    if (mode === "all" || mode === "script") {
        if (empty(this.parsed.scripts) && this.parseThisPath("YAML/Scripts.yaml")) {
            await this.parseScript(options);
        }
    }

    if (mode === "all" || mode === "tes") {
        if (empty(this.parsed.tesData) && this.parseThisPath("YAML/main.yaml")) {
            await this.tesParse(options);
        }
    }

    if (mode === "all" || mode === "ini") {
        if (this.parseThisPath("Game.ini")) {
            await this.parseGameIni(options);
        }
    }

    this.isParsed = true;
};

RMUtil.prototype.processFile = async function (path, options) {
    const relativePath = common.getRelativePathFromNode(path, "YAML", true);
    if (this.parseThisPath(relativePath) === false) {
        console.log("Skipping ", relativePath);
        return;
    }

    if (nwPath.extname(path) !== ".yaml") return;

    const fileInfo = {
        extension: nwPath.extname(path).toLowerCase().substring(1),
        dataType: RMData.determineType(path),
        filename: nwPath.basename(path, nwPath.extname(path)),
        basename: nwPath.basename(path),
        path: relativePath,
        relPath: relativePath,
        dirname: "/" + nwPath.dirname(relativePath),
    };

    ui.log("Reading " + path);
    if (["map", "commoneventsegment", "unknown"].includes(fileInfo.dataType)) {
        console.log("Skipping for now", fileInfo.dataType);
        this.parsed.document[path] = undefined;
    } else {
        const fileContents = await common.fileGetContents(path, "utf8");
        this.parsed.document[path] = YAML.parseDocument(fileContents, {
            customTags: RMUtil.customTags,
        });
    }

    const thisObj = this.parsed.document[path];
    ui.log(`Parsing: ${relativePath}`);
    console.log(`%c Parsing: ${relativePath}`, "color: yellow");

    const rmData = new RMData(thisObj, options);
    rmData.engineCode = this.engineCode;
    rmData.fileInfo = fileInfo;
    rmData.assignTranslationPair(relativePath);

    this.parsed.rmdata[path] = rmData;

    console.log("%c rmData " + path, "color: yellow", rmData);

    // Handle dataType-specific logic
    switch (fileInfo.dataType) {
        case "commoneventsegment":
            await this.processCommonEventsSegment(path, rmData, fileInfo);
            break;
        case "commonevents":
            await this.processCommonEvents(thisObj, rmData, fileInfo);
            break;
        case "troops":
            await this.processTroops(thisObj, rmData, fileInfo);
            break;
        case "map":
            await this.processMap(path, rmData, fileInfo);
            break;
        case "system":
            rmData.fetchSystem(thisObj, [fileInfo.filename]);
            break;
		case "unknown":
			await this.processArbitraryData(path, rmData, fileInfo);
			break;
        default:
			await this.processCommonData(thisObj, rmData, fileInfo);
            break;
    }

    if (this.writeMode) {
        try {
            if (typeof this.parsed.document[path] === "object") {
                this.parsed.document[path] = this.parsed.document[path].toString();
            }
        } catch (e) {
            console.warn("Unable to convert document to string", e);
            this.parsed.document[path] = "";
        }
    } else {
        this.parsed.document[path] = "processed";
    }
};



// Helper methods

RMUtil.prototype.processArbitraryData = async function (path, rmData, fileInfo) {
	// this.parsed.document[path] = YAML.parseDocument(
	// 	await common.fileGetContents(path, "utf8"),
	// 	{ customTags: RMUtil.customTags }
	// );
	// const thisObj = this.parsed.document[path];

	const handleThread = async () => {
		return new Promise((resolve, reject) => {
			const worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {
				workerData: {
					command: "parseArbitraryFile",
					baseContext: [],
					file: path,
					rmDataProperties: {
						options: {
							options: rmData.options?.options,
							engineType:rmData.options?.engineType,
						},
						translationPair:rmData.translationPair,
						translationInfo:rmData.translationInfo
					},
				},
			});
	
			worker.on("message", (msg) => {
				console.log(`Worker message received: `, msg);
				resolve(msg);
			});
	
			worker.on("error", (err) => {
				console.error(`Worker error:`, err);
				reject(err);
			});
	
			worker.on("exit", (code) => {
				if (code !== 0) {
					reject(new Error(`Worker exited with code ${code}`));
				}
			});
		});
	};

	const threadResult = await handleThread();
	this.parsed.document[path] = threadResult.result?.translatedYaml; // YAML string
	rmData.translatableTexts = threadResult.result?.translatableTexts;
	rmData.transData = threadResult.result?.transData;

	// set the rmData properties
	this.parsed.rmdata[path] = rmData;
	console.log("%c threadResult of "+path, "color: yellow", threadResult);
};

RMUtil.prototype.processCommonData = async function (thisObj, rmData, fileInfo) {
	const whatToFetch = this.getCommonDataKeys(fileInfo.dataType);
	if (!whatToFetch?.length) {
		if (["scripts"].includes(fileInfo.dataType)) {
			await ui.log("Skipping a file not to be parsed with data parser : " + fileInfo.basename);
			return;
		}
		await ui.log(`<span class="yellow">Skipping non standard RPG Maker data : ${fileInfo.basename}</span>`);
		await ui.log(`<span class="yellow">We are currently investigating the behavior of non standard RPG Maker data. Please join us in discord channel to discuss about this.</span>`);
		return;
	}
	return await rmData.fetchCommonData(
		thisObj,
		whatToFetch,
		[fileInfo.filename]
	);
}

RMUtil.prototype.processCommonEventsSegment = async function (path, rmData, fileInfo) {

	const handleThread = async () => {
		return new Promise((resolve, reject) => {
			const worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {
				workerData: {
					command: "parseCommonEventsSegment",
					baseContext: [],
					file: path,
					rmDataProperties: {
						options: {
							options: rmData.options?.options,
							engineType:rmData.options?.engineType,
						},
						translationPair:rmData.translationPair,
						translationInfo:rmData.translationInfo
					},
				},
			});
	
			worker.on("message", (msg) => {
				console.log(`%cWorker message received: `, "color:cyan", msg);
				resolve(msg);
			});
	
			worker.on("error", (err) => {
				console.error(`Worker error:`, err);
				reject(err);
			});
	
			worker.on("exit", (code) => {
				if (code !== 0) {
					reject(new Error(`Worker exited with code ${code}`));
				}
			});
		});
	};

	const threadResult = await handleThread();
	this.parsed.document[path] = threadResult.result?.translatedYaml; // YAML string
	rmData.translatableTexts = threadResult.result?.translatableTexts;
	rmData.transData = threadResult.result?.transData;

	// set the rmData properties
	this.parsed.rmdata[path] = rmData;
	console.log("%c threadResult of "+path, "color: yellow", threadResult);
}

RMUtil.prototype.processCommonEvents = async function (thisObj, rmData, fileInfo) {
    const cePage = thisObj.getIn([]);
    if (empty(cePage.items)) return;

    const pool = [];
    const limit = pLimit(7);

    for (let i = 0; i < cePage.items.length; i++) {
        pool.push(
            limit(async () => {
                const currentPage = cePage.getIn([i]);
                if (empty(currentPage)) return;

                rmData.registerStringObject(currentPage, "name", [fileInfo.filename, i, "name"], [], { currentAddress: [i, "name"] });

                const commandListData = cePage.getIn([i, "list"]);
                if (!empty(commandListData)) {
                    commandListData.items = await RMUtil.fetchCommandListWorker(
                        rmData,
                        commandListData,
                        [fileInfo.filename, i],
                        { documentPath: [i, "list"] }
                    );
                }
            })
        );
    }

    await Promise.all(pool);
};

RMUtil.prototype.processTroops = async function (thisObj, rmData, fileInfo) {
    const troopData = thisObj.getIn([]);
    if (empty(troopData.items)) return;

    for (let i = 1; i < troopData.items.length; i++) {
        const troop = thisObj.getIn([i]);
        if (empty(troop)) continue;

        rmData.registerStringObject(troop, "name", [fileInfo.filename, i, "name"], [], { currentAddress: [i, "name"] });

        const pages = troop.getIn(["pages"]);
        if (empty(pages?.items)) continue;

        for (let pageId = 0; pageId < pages.items.length; pageId++) {
            const oldCommands = pages.getIn([pageId, "list"]);
            if (!oldCommands) continue;

            const newCommand = await rmData.fetchCommandList(oldCommands, [fileInfo.filename, i, "pages", pageId, "list"]);
            oldCommands.items = newCommand;
        }
    }
};

RMUtil.prototype.processMapOld = async function (thisObj, rmData, fileInfo) {
    rmData.registerStringObject(thisObj, "display_name", [fileInfo.filename, "display_name"], [], { currentAddress: ["display_name"] });
    rmData.registerStringObject(thisObj, "note", [fileInfo.filename, "note"], [], { currentAddress: ["note"] });

    const docEvts = thisObj.getIn(["events"]);
    if (empty(docEvts?.items)) return;

    const pool = [];
    const limit = pLimit(7);

    for (let index = 0; index < docEvts.items.length; index++) {
        const thisEvtData = YAML.getFromIndex(thisObj.getIn(["events"]), index);
        if (empty(thisEvtData)) continue;

        const evtId = thisEvtData.get("id");
        rmData.registerStringObject(thisEvtData, "name", [fileInfo.filename, "events", evtId, "name"], [], { currentAddress: ["events", evtId, "name"] });

        const pages = thisEvtData.getIn(["pages"]);
        if (empty(pages?.items)) continue;

        for (let pageId = 0; pageId < pages.items.length; pageId++) {
            pool.push(
                limit(async () => {
                    const oldCommands = pages.getIn([pageId, "list"]);
                    if (!oldCommands) return;

                    oldCommands.items = await RMUtil.fetchCommandListWorker(
                        rmData,
                        oldCommands,
                        [fileInfo.filename, "events", evtId, "pages", pageId, "list"],
                        { documentPath: ["events", evtId, "pages", pageId, "list"] }
                    );
                })
            );
        }
    }

    await Promise.all(pool);
};

/**
 * Helper function to process map data
 * This is the old working version up to 6.11.25
 */
RMUtil.prototype.processMapNormal = async function (path, rmData, fileInfo) {
	this.parsed.document[path] = YAML.parseDocument(
		await common.fileGetContents(path, "utf8"),
		{ customTags: RMUtil.customTags }
	);
	const thisObj = this.parsed.document[path];

    rmData.registerStringObject(thisObj, "display_name", [fileInfo.filename, "display_name"], [], { currentAddress: ["display_name"] });
    rmData.registerStringObject(thisObj, "note", [fileInfo.filename, "note"], [], { currentAddress: ["note"] });

    const docEvts = thisObj.getIn(["events"]);
    if (empty(docEvts?.items)) return;

    const pool = [];
    const limit = pLimit(7);

    for (let index = 0; index < docEvts.items.length; index++) {
        const thisEvtData = YAML.getFromIndex(thisObj.getIn(["events"]), index);
        if (empty(thisEvtData)) continue;

        const evtId = thisEvtData.get("id");
        rmData.registerStringObject(thisEvtData, "name", [fileInfo.filename, "events", evtId, "name"], [], { currentAddress: ["events", evtId, "name"] });

        const pages = thisEvtData.getIn(["pages"]);
        if (empty(pages?.items)) continue;

        // for (let pageId = 0; pageId < pages.items.length; pageId++) {
        //     pool.push(
        //         limit(async () => {
        //             const oldCommands = pages.getIn([pageId, "list"]);
        //             if (!oldCommands) return;

        //             oldCommands.items = await RMUtil.fetchCommandListWorker(
        //                 rmData,
        //                 oldCommands,
        //                 [fileInfo.filename, "events", evtId, "pages", pageId, "list"],
        //                 { documentPath: ["events", evtId, "pages", pageId, "list"] }
        //             );
        //         })
        //     );
        // }
		for (var pageId=0; pageId<pages.items.length; pageId++) {
			var oldCommands = pages.getIn([pageId, "list"]);
			if (!Boolean(oldCommands)) continue;
			var newCommand  = await rmData.fetchCommandList(oldCommands, [fileInfo.filename, "events", evtId, "pages", pageId, "list"]);	
			//var newCommand  = await RMUtil.fetchCommandListWorker(rmData, oldCommands, [fileInfo.filename, "events", evtId, "pages", pageId, "list"]);	
			oldCommands.items = newCommand;
			//console.log("oldCommands.items", oldCommands.items);
		}
    }

    //await Promise.all(pool);
};

// testing process map through node's worker thread
// RMXP not working error
RMUtil.prototype.processMap = async function (path, rmData, fileInfo) {
	// this.parsed.document[path] = YAML.parseDocument(
	// 	await common.fileGetContents(path, "utf8"),
	// 	{ customTags: RMUtil.customTags }
	// );
	// const thisObj = this.parsed.document[path];

	const handleThread = async () => {
		return new Promise((resolve, reject) => {
			const worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {
				workerData: {
					command: "parseMapFile",
					baseContext: [],
					file: path,
					rmDataProperties: {
						options: {
							options: rmData.options?.options,
							engineType:rmData.options?.engineType,
						},
						translationPair:rmData.translationPair,
						translationInfo:rmData.translationInfo
					},
				},
			});
	
			worker.on("message", (msg) => {
				console.log(`Worker message received: `, msg);
				resolve(msg);
			});
	
			worker.on("error", (err) => {
				console.error(`Worker error:`, err);
				reject(err);
			});
	
			worker.on("exit", (code) => {
				if (code !== 0) {
					reject(new Error(`Worker exited with code ${code}`));
				}
			});
		});
	};

	const threadResult = await handleThread();
	this.parsed.document[path] = threadResult.result?.translatedYaml; // YAML string
	rmData.translatableTexts = threadResult.result?.translatableTexts;
	rmData.transData = threadResult.result?.transData;

	// set the rmData properties
	this.parsed.rmdata[path] = rmData;
	console.log("%c threadResult of "+path, "color: yellow", threadResult);
};


// Helper for common data keys
RMUtil.prototype.getCommonDataKeys = function (dataType) {
    const commonKeys = {
        actors: ["name", "description", "nickname", "note"],
        items: ["name", "description", "note"],
        armors: ["name", "description", "note"],
        weapons: ["name", "description", "note"],
        skills: ["name", "description", "message1", "message2", "note"],
        states: ["name", "message1", "message2", "message3", "message4", "note"],
        classes: ["name", "note"],
        enemies: ["name", "note"],
        tilesets: ["name", "note"],
        animations: ["name"],
        mapinfos: ["name"]
    };

    return commonKeys[dataType] || [];
};



// end of new parser handler
// ============================

RMUtil.prototype.toYaml = async function(outputDirectory) {
	if (!outputDirectory) return console.warn("Please set toYaml arguments[0] with output directory");
	if (!this.isParsed) await this.parse();
	this.parsed.yaml = {};
	await common.mkDir(nwPath.join(outputDirectory, "YAML"));
	await common.mkDir(nwPath.join(outputDirectory, "Scripts"));
	ui.log("Writing data files");

	for (var path in this.parsed.document) {
		var thisObj = this.parsed.document[path];
		var targetPath = nwPath.join(outputDirectory, "YAML", nwPath.basename(path));
		try {
			// Weather effect confuses YAML parser
			// this is a quick dirty way to fix the error on the weather effect
			var yamlString =thisObj.toString()
			yamlString = yamlString.replaceAll(`, p: [ !!str ':storm',`, `, p: [! ':storm',`);
			yamlString = yamlString.replaceAll(`, p: [ !!str ':rain',`, `, p: [! ':rain',`);
			yamlString = yamlString.replaceAll(`, p: [ !!str ':snow',`, `, p: [! ':snow',`);
			yamlString = yamlString.replaceAll(`, p: [ !!str ':none',`, `, p: [! ':none',`);
			
			await common.filePutContents(targetPath, yamlString, "utf8", false);
		} catch (e) {
			ui.log("Can not write "+targetPath+" See console log for more information");
			console.warn(e);
			console.log("thisObj:", thisObj);
			console.log("RMUtil:", this);
		}
	}

	ui.log("Writing scripts");
	for (var path in this.parsed.scripts) {
		var thisObj = this.parsed.scripts[path];
		var targetPath = nwPath.join(outputDirectory, "Scripts", nwPath.basename(path));
		ui.log("Writing : "+targetPath);

		await common.filePutContents(targetPath, thisObj.writableData.join(""), "utf8", false);
	}

	return this;
}

RMUtil.prototype.dumpIniFile = async function(outputDirectory) {
	if (empty(this.parsed.gameIni)) return this;
	var translated = this.parsed.gameIni.toString();
	await common.filePutContents(nwPath.join(outputDirectory, "Game.ini"), translated, "utf8", false);
	return this;
}

/**
 * Generate trans data from a RM project
 * @param  {} cacheInfo
 */
RMUtil.prototype.toTrans = async function(cacheInfo) {
	await ui.log("Creating project");
	cacheInfo 				= cacheInfo || await RMUtil.createCacheFolder();
	this.options 			= this.options || {};
	this.options.targetDir 	= nwPath.join(cacheInfo.cachePath, "data/");

	// Get parsable files from the project
	if (!this.contents) await this.toObj();

	this.trans = {
		projectId		: cacheInfo.cacheID,
		cache			: cacheInfo,
		gameEngine		: RMUtil.translateEngineType(this.engineCode),
		gameTitle		: this.gameTitle || "",
		loc				: this.dirname,
		parser			: 'rmrgss',
		parserVersion	: thisAddon.package.version,
		attachments		: RMUtil.attachments,
		files			: {}
	}

	console.log("current content", this.contents);
	await ui.log("Generating trans data from Game.ini");
	if (this.contents.gameIni) {
		await this.parse([this.contents.gameIni], "ini");
		var gameIni 	= this.parsed.gameIni;
		var thisRelPath = this.parsed.gameIni.fileInfo.relPath;
		this.trans.files[thisRelPath] = Object.assign({}, gameIni.transData, gameIni.fileInfo);
		this.trans.gameTitle = this.gameTitle || "";
	}

	await ui.log("Generating trans data from RMData");
	// plimit this
	// for (var i in this.contents.yaml) {
	// 	var file = this.contents.yaml[i];
	// 	await this.parse([file], "data");
	// 	var thisData 	= this.parsed.rmdata[file];
	// 	if (empty(thisData)) continue;
	// 	var thisRelPath = thisData.fileInfo.relPath
	// 	this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	// 	// removing rendered data
	// 	this.parsed.rmdata[i] = {};
	// 	thisData = undefined;
	// }

	// Process the tasks with concurrency limit
	const limit = pLimit(10); // Set the concurrency limit to 10
	const tasks = this.contents.yaml.map((file) =>
		limit(async () => {
			console.log("%c Parsing: " + file, "color: yellow");
			await this.parse([file], "data");
			const thisData = this.parsed.rmdata[file];
			console.log("%c Data of: " + file, "color: yellow", thisData);

			if (empty(thisData)) return;
			const thisRelPath = thisData.fileInfo.relPath;
			this.trans.files[thisRelPath] = {
				...thisData.transData,
				...thisData.fileInfo,
			};
			console.log("%c Parsing done: " + file, "color: yellow", this.trans.files[thisRelPath]);

			// Removing rendered data
			this.parsed.rmdata[file] = {};
		})
	);
	await Promise.all(tasks);

	await ui.log("Generating trans data from Script");
	await this.parse(undefined, "script");
	for (var i in this.parsed.scripts) {
		var thisData = this.parsed.scripts[i];
		var thisRelPath = thisData.fileInfo.relPath
		this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	this.parsed.scripts = {};

	await this.parse(undefined, "tes");
	if (this.parsed.tesData) {
		await ui.log("Generating trans data from TES data");
		for (var i in this.parsed.tesData) {
			var thisData = this.parsed.tesData[i];
			var thisRelPath = thisData.fileInfo.relPath
			this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
		}
		this.parsed.tesData = undefined;
	}

	await ui.log("generating initial.json");
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "initial.json"), JSON.stringify(this.trans), 'utf8', false);
	
	await ui.log("generating game information");
	var gameInfo = {
		title : this.gameTitle,
		Title : this.gameTitle,
		engine : this.engineCode,
		tes : await this.tesHasTes()
	}
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2), 'utf8', false);

	await ui.log("done converting to trans");

	return this.trans;
}


RMUtil.prototype.toTrans_legacy = async function(cacheInfo) {
	await ui.log("Creating project");
	cacheInfo 				= cacheInfo || await RMUtil.createCacheFolder();
	this.options 			= this.options || {};
	this.options.targetDir 	= nwPath.join(cacheInfo.cachePath, "data/");

	if (!this.isParsed) await this.parse();

	this.trans = {
		projectId		: cacheInfo.cacheID,
		cache			: cacheInfo,
		gameEngine		: RMUtil.translateEngineType(this.engineCode),
		gameTitle		: this.gameTitle || "",
		loc				: this.dirname,
		parser			: 'rmrgss',
		parserVersion	: thisAddon.package.version,
		attachments		: RMUtil.attachments,
		files			: {}
	}

	await ui.log("Generating trans data from Game.ini");
	var gameIni = this.parsed.gameIni;
	var thisRelPath = this.parsed.gameIni.fileInfo.relPath;
	this.trans.files[thisRelPath] = Object.assign({}, gameIni.transData, gameIni.fileInfo);

	await ui.log("Generating trans data from RMData");
	for (var i in this.parsed.rmdata) {
		var thisData = this.parsed.rmdata[i];
		var thisRelPath = thisData.fileInfo.relPath
		this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}

	await ui.log("Generating trans data from Script");
	for (var i in this.parsed.scripts) {
		var thisData = this.parsed.scripts[i];
		var thisRelPath = thisData.fileInfo.relPath
		this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}

	if (this.parsed.tesData) {
		await ui.log("Generating trans data from TES data");
		for (var i in this.parsed.tesData) {
			var thisData = this.parsed.tesData[i];
			var thisRelPath = thisData.fileInfo.relPath
			this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
		}
	}

	await ui.log("generating initial.json");
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "initial.json"), JSON.stringify(this.trans), 'utf8', false);
	
	await ui.log("generating game information");
	var gameInfo = {
		title : this.gameTitle,
		Title : this.gameTitle,
		engine : this.engineCode,
		tes : await this.tesHasTes()
	}
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2), 'utf8', false);

	await ui.log("done converting to trans");
	console.log("RMUtil data:", this);
	return this.trans;
}

RMUtil.getType = async function(path) {
    var dir = path;
    if (await common.isFileAsync(path)) {
        dir = nwPath.dirname(path)
    }
	if (await common.isFileAsync(nwPath.join(dir, "Game.rgss3a"))) return "ace";
	if (await common.isFileAsync(nwPath.join(dir, "Data/System.rvdata2"))) return "ace";
	if (await common.isFileAsync(nwPath.join(dir, "Game.rgss2a"))) return "vx";
	if (await common.isFileAsync(nwPath.join(dir, "Data/System.rvdata"))) return "vx";
	if (await common.isFileAsync(nwPath.join(dir, "Game.rgssad"))) return "xp";
	if (await common.isFileAsync(nwPath.join(dir, "Data/System.rxdata"))) return "xp";
	if (await common.isFileAsync(nwPath.join(dir, "Game.rvproj2"))) return "ace";
}

RMUtil.prototype.detectEngineType = async function() {
	if (this.options.engineType) {
		var gameEngines ={
			"rmvxace" : "ace",
			"rmvx" : "vx",
			"rmxp" : "xp"
		}
		return gameEngines[this.options.engineType]
	}

	return await RMUtil.getType(this.dirname);
}

RMUtil.prototype.getEngineCode = async function() {
	if (this.engineCode) return this.engineCode;
	this.engineCode = await this.detectEngineType();
	return this.engineCode;
}

RMUtil.createCacheFolder = async function(id) {
	await ui.log("Generating staging directory");

	id = id || common.makeid(10);

	var cacheInfo = {
		cacheID: id,
		cachePath: nwPath.join(common.getStagePath(), id)
	}

	var cacheFolderData = nwPath.join(cacheInfo.cachePath, "data");
	await common.mkDir(cacheFolderData);
	await ui.log(`New staging directory with id ${id} has been created!`);
	
	return cacheInfo;
}

RMUtil.prototype.getDataExtension = async function() {
	var engine = await this.getEngineCode();
	if (engine == "ace") return "rvdata2";
	if (engine == "vx") return "rvdata";
	if (engine == "xp") return "rxdata";
	
}

// TES Utility


RMUtil.prototype.tesHasTes = async function() {
	if (typeof this.hasTes !== "undefined") return this.hasTes;
	var dataExtension = await this.getDataExtension();
	var expectedPath = nwPath.join(this.dirname, "Data/main."+dataExtension);
	console.log("Expected path:", expectedPath);
	if (await common.isFileAsync(expectedPath)) {
		await ui.log("Encrypted TES data detected at: "+expectedPath);
		console.log("TES data detected!");
		this.hasTes = true;
		return true;
	}
	console.log("No TES data detected. Process accordingly!");
	return false;
}

RMUtil.prototype.tesExtractTo = async function(targetDir) {
	if (!await this.tesHasTes()) return this;

	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
	console.log("Unpack main data", this.dirname, "to", targetDir);
	var thisEngineType = await this.getEngineCode();
	await common.mkDir(targetDir);

	var absolutePath = nwPath.resolve(targetDir);

	var binPath = nwPath.join(__dirname, "3rdParty/TES-Patcher/TES_Patcher.rb");
	var options = {
		cwd: this.dirname, // Important! set current directory to the Game's root folder
		onData: function(buffer) {
			ui.log(buffer.toString());
		}
	}	
	await common.aSpawn(nwPath.join(__dirname, nw.App.manifest.localConfig.ruby), [binPath, "-e", absolutePath], options);
	this.tesExtractPath = targetDir;
	return this;
}

RMUtil.prototype.tesBuildTo = async function(destinationDir, options) {
	//TODO
	options = options || this.options;
	if (!await this.tesHasTes()) return this;
	if (empty(this.parsed.tesData)) return this;

	await ui.log("Start building TES data with destination: "+destinationDir);
	console.log("Current rmUtil:", this);
	// set extract path
	//var folderName 		= "main."+await this.getDataExtension();
	//this.tesExtractPath = nwPath.join(this.targetDir, folderName);

	// parse data
	//await ui.log("Parsing TES scripts:"+this.tesExtractPath);
	//if (!this.tesIsParsed) await this.tesParse(options);

	var tmpDirBase 		= nwPath.join(nw.process.env.TEMP, "tpp_tes_"+common.generateId());
	var dumpDir 		= await common.mkDir(nwPath.join(tmpDirBase, "translated"));
	//var fakeGameDirData	= await common.mkDir(nwPath.join(tmpDirBase, "gameRoot", "data"));

	await ui.log("Dumping TES scripts into "+dumpDir);
	for (var path in this.parsed.tesData) {
		var thisObj 	= this.parsed.tesData[path];
		var targetPath 	= nwPath.join(dumpDir, nwPath.basename(path));
		await ui.log("Writing "+targetPath);
		await common.filePutContents(targetPath, thisObj.toString(), "utf8", false);
	}

	await ui.log("Generating stagging path:"+fakeGameDir);

	var cacheGame = nwPath.join(this.tesExtractPath, "../gameRoot");
	ui.log("copy "+cacheGame+" to "+tmpDirBase);
	await bCopy(cacheGame, tmpDirBase, {overwrite:true});

	var fakeGameDir		= nwPath.join(tmpDirBase, "gameRoot");

	var binPath 		= nwPath.join(__dirname, "3rdParty/TES-Patcher/TES_Patcher.rb");


	// TODO here
	await ui.log("Compiling TES scripts to:"+destinationDir);
	var spawnOpt = {
		// Important! set current directory to the root folder of the game where Data/scripts.rvdata2 and Data/main.rvdata2 is existed
		cwd: tmpDirBase, 
		onData: function(buffer) {
			ui.log(buffer.toString());
		}
	}	
	// F:\GDrive\Other\Translator++\ruby\bin\ruby.exe F:\GDrive\Other\Translator++\3rdParty\TES-Patcher\TES_Patcher.rb -p "location/of/the/scripts"
	await common.aSpawn(nwPath.join(__dirname, nw.App.manifest.localConfig.ruby), [binPath, "-p", dumpDir], spawnOpt);

	//await common.mkDir(destinationDir);
	await ui.log("Copy main.rvdata2 to:"+nwPath.join(destinationDir, "Data"));
	await common.copyFile(nwPath.join(tmpDirBase, "main."+await this.getDataExtension()), nwPath.join(destinationDir, "Data"))
	ui.log("Done processing TES!");
	return this;

}

RMUtil.prototype.tesCopyRequiredFiles = async function() {
	if (!await this.tesHasTes()) return;
	if (!this.tesExtractTo) return console.warn("this.tesExtractTo is required in tesCopyRequiredFiles");
	var gameData = nwPath.join(this.targetDir, "gameRoot/Data");
	await common.mkDir(gameData);

	var fileToCopy 		= ["main", "Scripts"];
	var dataExtension 	= await this.getDataExtension();
	for (var i=0; i<fileToCopy.length; i++) {
		var source = nwPath.join(this.dirname, "Data", fileToCopy[i]+"."+dataExtension);
		ui.log("Copying :"+source+" to "+gameData);
		await common.copyFile(source, gameData);
	}
}

RMUtil.prototype.tesParse = async function(options) {
	options = options || this.options || {}
	if (!await this.tesHasTes()) return this;
	ui.log("Parsing TES data");
	var folderName = "main."+await this.getDataExtension();
	if (!this.tesExtractPath) {
		// extract if not yet extracted
		await this.tesExtractTo(nwPath.join(this.targetDir, folderName));
	}
	this.contents.tesFiles 	= await common.readDir(this.tesExtractPath);
	this.parsed.tesData 	= {};
	var RmTransFile 		= require("www/addons/rmrgss/RmTransFile.js");

	for (var i=0; i<this.contents.tesFiles.length; i++) {
		var scriptPath = this.contents.tesFiles[i];
		if (nwPath.extname(scriptPath) !== ".txt") continue;

		var fileInfo = {};
		var relativePath 		= common.getRelativePathFromNode(scriptPath, folderName, true);
		fileInfo.extension 		= nwPath.extname(scriptPath).toLowerCase().substring(1);
		fileInfo.dataType 		= "text";
		fileInfo.filename 		= nwPath.basename(scriptPath, nwPath.extname(scriptPath));
		fileInfo.basename 		= nwPath.basename(scriptPath);
		fileInfo.path 			= relativePath;
		fileInfo.relPath		= relativePath;
		fileInfo.dirname 		= "/"+nwPath.dirname(relativePath);

		this.parsed.tesData[scriptPath] = new RmTransFile(await common.fileGetContents(scriptPath, "utf8"), options)
		var tesParser 			= this.parsed.tesData[scriptPath];
		tesParser.fileInfo		= fileInfo;
		tesParser.assignTranslationPair(relativePath);

		ui.log(`Parsing : ${relativePath}`);
		/*
		if (!empty(options.translationDatas)) {
			var translationData = RMData.selectTranslationData(options.translationDatas, relativePath);
			console.log("current file:", relativePath);
			console.log("Translation Data:", translationData);
			translationData 			= translationData || {};
			tesParser.translationPair 	= translationData.translationPair || {};
			tesParser.translationInfo 	= translationData.info || {};
		}
		*/

		tesParser.parse();
	}
	this.tesIsParsed = true;
	return this;

}

thisAddon.RMUtil = RMUtil;








xSpawn = async function(command, args, options) {
	args = args || [];
	if (Array.isArray(args) == false) args = [args];
	options = options||{};
	options.args = options.args||{};
	options.onData = options.onData||function(result, e) {};
	options.onDone = options.onDone||function(result, e) {};
	options.onError = options.onError||function(result, e) {};
	//options.onReceive = options.onReceive||function(result, e) {};
	var resolver;
	var rejecter;
	var thisPromise = new Promise((resolve, reject)=>{
		resolver = resolve;
		rejecter = reject;
	});	
	
	
	var outputBuffer = "";
	var child = spawn(command, args, options);
	
	child.stdout.on('data', function (data) {
		//console.log('stdout: ' + data);
		outputBuffer += data;
		//console.log("Received buffer : "+data);
		options.onData.call(this, data);
		//options.onReceive.call(this, data);
	});

	child.stderr.on('data', function (data) {
		console.log('stderr: ' + data);
		options.onError.call(this, data);
		
	});

	child.on('close', function (code) {
		console.log('child process exited with code ' + code);
		//console.log("data is : "+outputBuffer);
		var result = php.evalResult(outputBuffer)
		options.onDone.call(this, result);
		resolver(result);
	});	
	
	return thisPromise;
}




var RMRGSS = function(exeFile) {
	this.file 	= exeFile;
	this.dir 	= nwPath.dirname(this.file);
}

RMRGSS.prototype.init = async function() {
	
}

RMRGSS.prototype.type = async function() {
	return await Engines.detect(this.file);
}

RMRGSS.prototype.extractTo = async function(to) {
	// to is dirname
	console.log("Extracting to ", to);

	console.log("copying");
	await bCopy(this.dir, to, {overwrite:true});

	console.log("done copying");
	
	var dirContent = await afs.readdir(this.dir);
	var monitor = [".rgss3a", ".rgss2a", ".rgssad"]
	for (var i in dirContent) {
		var ext = nwPath.extname(dirContent[i]);
		if (monitor.includes(ext.toLowerCase()) == false) continue;
		var result = await common.aSpawn("start", [nwPath.join(decrypterPath, "RgssDecrypter.exe"), dirContent[i]], {
			cwd : to,
			shell: true,
			windowsHide: false		
		});
		
		fs.unlinkSync(nwPath.join(to, dirContent[i]));
		console.log("Unlink done");
	}
	
	console.log("Extraction done");
	
}

RMRGSS.prototype.isPacked = async function() {
	var dirContent = await afs.readdir(this.dir);
	for (var i in dirContent) {
		var ext = nwPath.extname(dirContent[i]);
		//vxace archive
		if (ext.toLowerCase() == ".rgss3a") return true;
		//vx archive
		if (ext.toLowerCase() == ".rgss2a") return true;
		//xp archive
		if (ext.toLowerCase() == ".rgssad") return true;
	}
	return false;
}

window.RMRGSS = RMRGSS;


thisAddon.createProject = async function(exeFile, options) {
	options = options || {};
	await ui.log("Creating project");
	try {
		var rmUtil = new RMUtil(exeFile, options)	
		rmUtil.writeMode = false;
		await rmUtil.toTrans();
		await rmUtil.tesCopyRequiredFiles();
		// sorting the object
		rmUtil.trans.files = common.sortObj(rmUtil.trans.files);
		trans.openFromTransObj({project:rmUtil.trans}, {isNew:true});
		console.log("rmUtil:", rmUtil);
		return rmUtil;
	} catch (e) {
		console.error(e);
		ui.logError("Error occured! Please see console window(F12) for more information", e.toString());
	}
}

thisAddon.exportToFolder = async function(destinationDir, transData, options) {
	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.engineType	= options.engineType || transData.project.gameEngine || trans.project.gameEngine;
	options.translationDatas = options.translationDatas || trans.getTranslationData(transData, options);
	//var currentGamePath = transData.project.loc;

	try {
		if (! await common.isDirectory(transData.project.cache.cachePath)) {
			ui.log("Error: Unable to find directory:"+transData.project.cache.cachePath);
			return;
		}
	
		if (empty(transData)) {
			ui.log("Error: Trans data is blank!");
			return console.warn("trans data is blank");
		}
	
		var stagingData		= nwPath.join(transData.project.cache.cachePath, "data");
	
		await ui.log("Export to folder"+destinationDir);
		console.log(`%c Exporting to folder ${destinationDir}, with options:`, "color: yellow", options);
		const rmUtil = new RMUtil(destinationDir, options);
		rmUtil.isConcurrentParsing = true; // set to true to enable concurrent parsing
		rmUtil.writeMode = true;
		await rmUtil.setUnpackedDir(stagingData);
		console.log("RMUtil is:", rmUtil);
		var tmpDir = nwPath.join(nw.process.env.TEMP, "tpp_"+common.generateId());
		await ui.log("Translate raw data into: "+tmpDir);
		await common.mkDir(tmpDir);
	
		await rmUtil.toYaml(tmpDir);
	
		await ui.log("Repack to: "+destinationDir);
		await rmUtil.repackTo(destinationDir, tmpDir);
	
		await rmUtil.tesBuildTo(destinationDir, options);
	
		await ui.log("Writing ini file to: "+destinationDir);
		await rmUtil.dumpIniFile(destinationDir);
	
		return rmUtil;
	} catch (e) {
		console.error(e);
		console.log("current rmUtil:", rmUtil)
		ui.logError("Error occured! Please see console window(F12) for more information", e.toString());
	}

}

thisAddon.exportToFolderThread = async function(destinationDir, transData, options) {
	console.log("exportToFolderThread with option sys.config.threadNum:", sys.config.threadNum);
	if (!parseInt(sys.config.threadNum)) {
		return await this.exportToFolder(destinationDir, transData, options);
	}

	transData = transData || trans.getSaveData();
	await Thread.saveSession('lastTransData', transData);
	await Thread.saveSession('lastTranslationData', trans.getTranslationData(transData, options));
	
	await threadServer.startThread(sys.config.threadNum, {addons:["rmrgss"]});
	var selectedFiles = options.files;
	if (empty(selectedFiles)) selectedFiles = trans.getAllFiles();
	// grouping files
	var fileGroup = {
		data:[],
		scripts:[],
		tes:[]
	};
	for (var i=0; i<selectedFiles.length; i++) {
		if (nwPath.dirname(selectedFiles[i]) == "Scripts") {
			fileGroup.scripts.push(selectedFiles[i]);
		} else if (nwPath.dirname(selectedFiles[i]) == "main.rvdata2") {
			fileGroup.tes.push(selectedFiles[i]);
		} else {
			fileGroup.data.push(selectedFiles[i]);
		}
	}
	console.log("fileGroup is", fileGroup);
	var queue = [];

	var processThread = (files=[])=> {
		if (typeof files == "string") files = [files];
		var fn = `async ()=> {
			var options = ${JSON.stringify(options)};
			options.translationDatas = await Thread.loadSession('lastTranslationData');
			options.files = ${JSON.stringify(files)};
			var transData = await Thread.loadSession('lastTransData');
			return await addonLoader.addons.rmrgss.exportToFolder(${JSON.stringify(destinationDir)}, transData, options)
		}`
		queue.push(fn);
	}

	// distribute the process of data files into threads
	for (var i=0; i<fileGroup.data.length; i++) {
		processThread([fileGroup.data[i]]);
	}
	// send SCRIPT data into a thread
	if (!empty(fileGroup.scripts)) processThread(fileGroup.scripts[i]); 

	// send TES data into a thread
	if (!empty(fileGroup.tes)) processThread(fileGroup.tes[i]); 

	console.log("queue is", queue);
	var result = await threadServer.processQueue(queue);
	await threadServer.closeThreads();
	await Thread.removeSession('lastTransData');
	await Thread.removeSession('lastTranslationData');
	return result;
}

thisAddon.exportAsZip = async function(targetPath, transData, options) {
	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.engineType	= options.engineType || transData.project.gameEngine || trans.project.gameEngine;
	options.translationDatas = options.translationDatas || trans.getTranslationData(transData, options);

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

	await this.exportToFolderThread(tmpDir, transData, options);
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

thisAddon.injectTranslation = async function(targetDir, sourceMaterial, options) {
	console.log("Running on inject handler", arguments);

	var sourceDir = sourceMaterial;
	if (await common.isFileAsync(sourceMaterial)) {
		sourceDir = path.dirname(sourceMaterial);
	}

	if (["copyNothing"].includes(options.copyOptions) == false) {
		await ui.log(`Copy ${sourceDir} to ${targetDir}`);
		var overWrite = true;
		if (options.copyOptions == "copyIfNotExist") overWrite = false;
		await ui.log("Overwrite option: "+overWrite.toString());
		await bCopy(sourceDir, targetDir, {
			onBeforeCopy: async (from, to) => {
				await ui.log(`Start copying ${from}`);
			},
			onAfterCopy: async (from, to) => {
				await ui.log(`Successfully copied into ${to}`);
			},
			overwrite: overWrite
		});
	}


	await ui.log("--Handling RM Data");
	var originPath 	= nwPath.join(trans.project.cache.cachePath, "data");
	await ui.log("Generating translation from cache data "+originPath);
	await thisAddon.exportToFolderThread(targetDir, undefined, options);
}

/*
thisAddon.yamlFileToTrans = async function(targetDir, file) {
	var rmUtil = new RMUtil(targetDir)
	await rmUtil.setUnpackedDir(targetDir);
	await rmUtil.addFiles([file]);
	await rmUtil.parse();
	var files = {};
	for (var i in rmUtil.parsed.rmdata) {
		var thisData = rmUtil.parsed.rmdata[i];
		var thisRelPath = thisData.fileInfo.relPath
		files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	return files	
}
*/


/**
 * Split a single YAML file containing multiple common events into separate files.
 * @param {string} filePath - The path to the YAML file to split.
 * @param {string} [targetDir] - The directory where the split files will be saved.
 * @returns {Promise<void>}
 * @throws {Error} If an error occurs while reading or writing files.
 */
thisAddon.splitCommonEvents = async function(filePath, targetDir) {
    const readStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const directory = targetDir||nwPath.dirname(filePath);
    let buffer = '';
    let segment = '';
    let segmentIndex = 0;
    let insideSegment = false;

    for await (const chunk of readStream) {
        buffer += chunk;

        // Process the buffer line by line
        let lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the incomplete line in the buffer for the next chunk

        for (let line of lines) {
            line = line.trimEnd();

            // Detect the start of a segment
            if (line.startsWith('-')) {
                // Skip "---" segments without incrementing the index
                if (segment.trim() === "---") {
                    segment = '';
                    insideSegment = true;
                    continue;
                }

                // Save the previous segment if it is non-blank
                if (insideSegment && segment.trim() && segment.trim() !== "-" && segment.trim() !== "- null") {
                    segmentIndex++;
                    const outputFile = nwPath.join(
                        directory,
                        `CommonEvents-${String(segmentIndex).padStart(4, '0')}.yaml`
                    );
                    await fs.promises.writeFile(outputFile, segment.trim(), 'utf-8');
                }

                // Reset for the new segment
                segment = line + '\n';
                insideSegment = true;
            } else if (insideSegment) {
                segment += line + '\n';
            }
        }
    }

    // Handle the final segment
    if (insideSegment && segment.trim() && segment.trim() !== "-" && segment.trim() !== "---") {
        segmentIndex++;
        const outputFile = nwPath.join(
            directory,
            `CommonEvents-${String(segmentIndex).padStart(4, '0')}.yaml`
        );
        await fs.promises.writeFile(outputFile, segment.trim(), 'utf-8');
    }
}

/**
 * Merge multiple CommonEvents segment files into a single YAML file.
 * By default, the target file will be overwritten with the merged content.
 * @param {string} baseDir - The path to the source CommonEvents file.
 * @param {string} [targetCommonEventsFile] - The path to the target CommonEvents file.
 * @returns {Promise<void>}
 * @throws {Error} If an error occurs while reading or writing files.
 */
thisAddon.mergeCommonEvents = async (baseDir, targetCommonEventsFile) => {
	targetCommonEventsFile ||= nwPath.join(baseDir, "CommonEvents.yaml");

	ui.log(`Merging CommonEvents segment files from: ${baseDir}`);
    try {
        // Ensure the base directory exists
        const dirExists = await fs.promises.stat(baseDir).then(() => true).catch(() => false);
        if (!dirExists) {
            throw new Error(`Directory not found: ${baseDir}`);
        }

        // Use glob to find all segment files
        const files = await common.searchFile("CommonEvents-*.yaml", baseDir);
        if (files.length === 0) {
            throw new Error(`No CommonEvents segment files found in directory: ${baseDir}`);
        }

        // Determine the maximum segment number from filenames
        const maxSegment = files.reduce((max, file) => {
            const match = nwPath.basename(file).match(/CommonEvents-(\d{4})\.yaml/);
            if (match) {
                const segmentNumber = parseInt(match[1], 10);
                return Math.max(max, segmentNumber);
            }
            return max;
        }, 0);

        // Write the merged content into the target file
        const writeStream = await fs.promises.open(targetCommonEventsFile, "w");
        await writeStream.writeFile("---\n"); // Write the very first line

        try {
            // Iterate through all segments from 1 to maxSegment
            for (let i = 0; i <= maxSegment; i++) {
                const segmentFile = nwPath.join(baseDir, `CommonEvents-${i.toString().padStart(4, "0")}.yaml`);

                try {
                    // If the segment file exists, read and write its content
                    const content = await fs.promises.readFile(segmentFile, "utf8");
                    await writeStream.write(`${content.trim()}\n`);
                } catch {
                    // If file doesn't exist, write a single "-"
                    await writeStream.write("-\n");
                }
            }
        } finally {
            await writeStream.close(); // Close the write stream after processing
        }

        console.log(`Merged CommonEvents file written to: ${targetCommonEventsFile}`);
    } catch (error) {
        console.error(`Error during merging: ${error.message}`);
    }
};


thisAddon.yamlToTrans = async function(targetDir, file, mode) {
	mode = mode || RMUtil.detectMode(file);
	var result = {
		attachments		: {},
		files			: {}
	}
	var rmUtil = new RMUtil(targetDir)
	await rmUtil.setUnpackedDir(targetDir);
	await rmUtil.addFiles([file]);
	await rmUtil.parse([file], mode);
	for (var i in rmUtil.parsed.rmdata) {
		var thisData = rmUtil.parsed.rmdata[i];
		var thisRelPath = thisData.fileInfo.relPath
		result.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	result.attachments 	= RMUtil.attachments;
	if (rmUtil.gameTitle) result.gameTitle = rmUtil.gameTitle;
	return result;
}

thisAddon.createProjectThread = async function(exeFile, options) {
	console.log("Creating project with thread");
	ui.log(`Number of thread: ${sys.config.threadNum}`);
	ui.log(`Concurrent workers for event: ${sys.config.eventThreadsConcurrency}`);
	ui.log(`Minimum command in event allowed in worker: ${sys.config.numberOfCommandInEventToThread}`);


	if (!parseInt(sys.config.threadNum)) {
		return await this.createProject(exeFile, options);
	}

	options 		= options || {};
	var cacheInfo 	= await RMUtil.createCacheFolder();

	// Get parsable files from the project
	var rmUtil = new RMUtil(exeFile, options)	
	rmUtil.writeMode 	= false;
	rmUtil.targetDir 	= nwPath.join(cacheInfo.cachePath, "data/");
	if (!rmUtil.contents) await rmUtil.toObj();

	console.log(rmUtil);

	await threadServer.startThread(sys.config.threadNum, {addons:["rmrgss"]});
	await ui.log("Generating trans data from RMData");
	var queue = [];
	for (var i in rmUtil.contents.yaml) {
		var thisFile = rmUtil.contents.yaml[i];
		var fn = `async ()=> {
			return await addonLoader.addons.rmrgss.yamlToTrans(${JSON.stringify(cacheInfo.cachePath)}, ${JSON.stringify(thisFile)})
		}`
		queue.push(fn);
	}


	var result = await threadServer.processQueue(queue);
	await threadServer.closeThreads();

	var newTrans = {
		projectId		: cacheInfo.cacheID,
		cache			: cacheInfo,
		gameEngine		: RMUtil.translateEngineType(rmUtil.engineCode),
		gameTitle		: "",
		loc				: rmUtil.dirname,
		parser			: 'rmrgss',
		parserVersion	: thisAddon.package.version,
		attachments		: {},
		files			: {}
	}
	if (Array.isArray(result) == false) return;
	if (empty(result)) return;
	for (let i=0; i<result.length; i++) {
		if (!result[i]) continue;
		if (result[i].gameTitle) newTrans.gameTitle 	= result[i].gameTitle;
		if (!empty(result[i].attachments)) newTrans.attachments = Object.assign({}, newTrans.attachments, result[i].attachments);
		if (!empty(result[i].files)) newTrans.files = Object.assign({}, newTrans.files, result[i].files);
	}

	await ui.log("Generating trans data from Game.ini");
	if (rmUtil.contents.gameIni) {
		await rmUtil.parse([rmUtil.contents.gameIni], "ini");
		var gameIni 	= rmUtil.parsed.gameIni;
		var thisRelPath = rmUtil.parsed.gameIni.fileInfo.relPath;
		newTrans.files[thisRelPath] = Object.assign({}, gameIni.transData, gameIni.fileInfo);
	}

	
	await ui.log("Generating trans data from Script");
	await rmUtil.parse(undefined, "script");
	for (var i in rmUtil.parsed.scripts) {
		var thisData = rmUtil.parsed.scripts[i];
		var thisRelPath = thisData.fileInfo.relPath
		newTrans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	rmUtil.parsed.scripts = {};

	await rmUtil.parse(undefined, "tes");
	if (rmUtil.parsed.tesData) {
		await ui.log("Generating trans data from TES data");
		for (var i in rmUtil.parsed.tesData) {
			var thisData = rmUtil.parsed.tesData[i];
			var thisRelPath = thisData.fileInfo.relPath
			newTrans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
		}
		rmUtil.parsed.tesData = undefined;
	}

	await ui.log("Sorting object data");
	newTrans.files = common.sortObj(newTrans.files);

	await rmUtil.tesCopyRequiredFiles()
	trans.openFromTransObj({project:newTrans}, {isNew:true});
	console.log("rmUtil:", rmUtil);
	return rmUtil;

	//return trans;
}



var drawProjectCreator = function() {
	var $slide = $(`<h1><i class="icon-plus-circled"></i><span data-tran="">RPG Maker XP, VX, Ace, MV & MZ Parser Ver. ${thisAddon.package.version}</span></h1>
	<div class="fieldgroup">
		<div class="dialogSectionBlock fieldgroup">
			<h2 data-tran="">${('Select the game')}</h2>
			<div class="info" data-tran="">${('Select the executable file from your original game.')}</div>
			<label><input type="dvSelectPath" class="rpgMakerLocation" accept=".exe,.html,.htm" /></label>
		</div>		
		<div class="dialogSectionBlock fieldgroup detectedTypeWrapper hidden">
			<h2 data-tran="">${('Detected engine / type')}</h2>
			<div class="info" data-tran=""></div>
			<label><input type="text" class="detectedType" readonly="readonly" /></label>
		</div>	
		<div class="dialogSectionBlock fieldgroup createCopyWrapper hidden">
			<label class="flex fullWidth">
				<div class="flexMain">
					<div class="label">${('Create a development copy ')}<span class="copyIsRequired">${('(required)')}</span></div>
					<div class="info" data-tran="">${('Will create an editable copy of your game (required for some project)')}</div>
				</div>
				<div>
					<input type="checkbox" class="createCopy flipSwitch"> 
				</div>
			</label>
		</div>			
		<div class="fieldgroup devLocationWrapper">
			<h2 data-tran="">${('Set development directory')}</h2>
			<div class="info" data-tran="">${('Translator++ will generate an extracted, ready to translate copy of your game in this directory.')}</div>
			<label><input type="dvSelectPath" class="devLocation" nwdirectory /></label>
		</div>		
		<div class="fieldgroup devLocationTypeWrapper hidden">
			<h2 data-tran="">${(`Development directory's Engine Type`)}</h2>
			<div class="info" data-tran="">${('The detected engine type of the source materials in the development directory.')}</div>
			<label><input type="text" class="devLocationType fullWidth" /></label>
		</div>		
		<div class="fieldgroup devLocationExeWrapper hidden">
			<h2 data-tran="">${(`Development directory's Executable`)}</h2>
			<div class="info" data-tran="">${('Path of the Executable of the source materials in the development directory.')}</div>
			<label><input type="text" class="devLocationExe fullWidth" /></label>
		</div>		
		<div class="actionButtons">
		<!--
			<button class="selectRPGExe"><i class="icon-doc-inv"></i>${('Create project!')}</button>
		-->
			<button class="createProjectFromRPGM"><i class="icon-doc-inv"></i>${(`Create project!`)}</button>
		</div>
	</div>`);
	
	ui.newProjectDialog.addMenu({
		icon 			: thisAddon.getWebLocation()+"/icon-v2.png",
		descriptionBar 	: `<h2>${t('RPG Maker XP, VX, Ace, MV & MZ Parser V.2')}</h2>
						   <p>${t('Start translation from RPG Maker game using the latest parser.')}</p>`,
		actionBar		: "",
		goToSlide		: "rmrgss",
		at				: 1,
		slides 			: {"rmrgss": $slide}
	})

	var initializeSlide = ($slide)=> {
		var resetSlide = ()=> {
			console.log("initializing slide");
			$slide.find(".rpgMakerLocation").val("");
			$slide.find(".devLocation").val("");
			$slide.find(".devLocationWrapper").addClass("hidden");
			$slide.find(".detectedTypeWrapper").addClass("hidden");
			$slide.find(".devLocationTypeWrapper").addClass("hidden");
			$slide.find(".devLocationExeWrapper").addClass("hidden");
			// initializing create a copy
			$slide.find(".createCopyWrapper").addClass("hidden");
			$slide.find(".createCopy").prop("checked", false);
			$slide.find(".createCopy").prop("disabled", false);
			$slide.find(".copyIsRequired").addClass("hidden");
			
			$slide.find(".detectedType").val("");
			$slide.find(".devLocationType").val("");
			$slide.find(".devLocationExe").val("");
			$slide.find(".devLocationWrapper").removeClass("mandatory");
			$slide.find(".createProjectFromRPGM").prop("disabled", true);
		};
		resetSlide();

		if ($slide.hasClass("isInitialized")) return;

		$slide.find(".rpgMakerLocation").on("change", async function(e) {
			var loc = $(this).val();
			console.log("analyzing path : ", loc);
			var projectType = await Engines.detect(loc);
	
			$slide.find(".detectedTypeWrapper").removeClass("hidden");
			
			// create a copy
			$slide.find(".createCopyWrapper").removeClass("hidden");
			$slide.find(".detectedType").val(projectType);
			$slide.find(".devLocation").val("");
			
			if (!Boolean(projectType)) return alert(t("Error!\r\nTranslator++ is unable to detect the type of ")+loc);
			
			if (projectType == "enigma") {
				console.log("Is Enigma");
				// create a copy is mandatory
				$slide.find(".createCopy").prop("checked", true);
				$slide.find(".createCopy").prop("disabled", true);
				$slide.find(".copyIsRequired").removeClass("hidden");
	
				$slide.find(".devLocationWrapper").addClass("mandatory");
				
				$slide.find(".createCopy").trigger("change");
				
				return;
			} else if (["rmvxace", "rmvx", "rmxp"].includes(projectType)) {
	
				console.log("RPG Maker - RSS Variant");
				ui._thisGame = new RMRGSS(loc);
				if (await ui._thisGame.isPacked()) {
					// create a copy is mandatory
					$slide.find(".createCopy").prop("checked", true);
					$slide.find(".createCopy").prop("disabled", true);
					$slide.find(".copyIsRequired").removeClass("hidden");
	
					$slide.find(".devLocationWrapper").addClass("mandatory");
					
					$slide.find(".createCopy").trigger("change");
					return;
				}
			}
			
			// not enigma
			$slide.find(".createProjectFromRPGM").prop("disabled", false);
		});
		$slide.find(".createCopy").on("change", async function(e) {

			
			if ($(this).prop("checked")) {
				$slide.find(".devLocationWrapper").removeClass("hidden");
			} else {
				$slide.find(".devLocationWrapper").addClass("hidden");
			}
			
		})
		
		
		$slide.find(".devLocation").on("change", async function(e) {
			var to 		= $(this).val();
			var from 	= $slide.find(".rpgMakerLocation").val();
			var detectedType = $slide.find(".detectedType").val().toLowerCase()
	
			if (common.isRelated(nwPath.dirname(from)+"/", to+"/")) {
				alert(`${nwPath.dirname(from)}\r\nis related to\r\n${to}\r\n`+t("You should change the path!\r\nThe Dev directory should not inside the original game's directory, as this will cause problem if you inject the game latter."));
				$(this).val("");
				return;
			}

			if (detectedType == "enigma") {
				var conf = confirm(t("The game is packed with Enigma.\r\nDo you want to extract the package?\r\nThis will take minutes, depend on the size of your game."))
				if (!conf) {
					$(this).val("");
					return 
				}
				
				ui.showBusyOverlay();
				await php.extractEnigma(from, to);
				var thisEngine = await Engines.detect(to);
				if (thisEngine == "rmmz") {
					var executable = await RMMZ.getExe(nwPath.join(to));
				} else { // rmmv
					var executable = await RMMV.getExe(nwPath.join(to));
				}
				$slide.find(".devLocationTypeWrapper").removeClass("hidden");
				$slide.find(".devLocationType").val(thisEngine);
				$slide.find(".devLocationExeWrapper").removeClass("hidden");
				$slide.find(".devLocationExe").val(nwPath.join(to, executable));
				
				ui.hideBusyOverlay();
			} else if (["rmvxace", "rmvx", "rmxp"].includes(detectedType)) {
	
				var conf = confirm(t("Copy & extract data into ")+to+" ?")
				if (!conf) {
					$(this).val("");
					return 
				}
				ui.showBusyOverlay();
				
				ui._thisGame 		= ui._thisGame || new RMRGSS(from);
				var thisEngine 		= $slide.find(".detectedType").val();
				var devExecutable 	= nwPath.join(to, nwPath.basename(from));
				
				await ui._thisGame.extractTo(to);
				
				$slide.find(".devLocationTypeWrapper").removeClass("hidden");
				$slide.find(".devLocationType").val(thisEngine);
				$slide.find(".devLocationExeWrapper").removeClass("hidden");
				$slide.find(".devLocationExe").val(devExecutable);
				ui.hideBusyOverlay();
				
			}
			
			$slide.find(".createProjectFromRPGM").prop("disabled", false)
			
		});
		
		$slide.find(".createProjectFromRPGM").on("click", async function(e) {
			if ($(this).prop("disabled")) return;

			console.log("Creating a new project from RMRGSS addon");
			var master 	= $slide.find(".rpgMakerLocation").val();
			var devExe 	= $slide.find(".devLocationExe").val();
			
			var targetPath = devExe || master;
			var engineType = $slide.find(".devLocationType").val() ||  $slide.find(".detectedType").val(); // determined type

			ui.showLoading();
			ui.loadingProgress("Processing", "Creating a new project", {consoleOnly:false, mode:'consoleOutput'});
			await ui.log(`This window will look like it hangs. Open console log(F12) if you're using the dev version to see what's happening in the background.`);
			await ui.log("Target path:", targetPath);
			await ui.log("Engine type:", engineType);
			await ui.newProjectDialog.close();


			await common.benchmark(async ()=>{
				await engines.getEngine(engineType).triggerHandler("rmCreateProject", thisAddon, [targetPath]);
			})
			ui.loadingProgress("Finished", "Done!", {consoleOnly:false, mode:'consoleOutput'});
			ui.loadingEnd("Done!");
			return common.halt();
						
		});

		$slide.addClass("isInitialized");
	}
	
	$(document).on("newProjectSlideChange", async (e, slideInfo) => {
		if (slideInfo.id !== "rmrgss") return;
		initializeSlide(slideInfo.elm);
	});

}


function init() {
	var supportedEngines = ["rmxp", "rmvx", "rmvxace"];
	engines.addHandler(supportedEngines, "onLoadTrans", 
	() => {
		console.log("Executing onloadtrans");
		ui.translationByContext.dataLocation = "contextTranslation";
	});

	drawProjectCreator();

	engines.addHandler(supportedEngines, 'rmCreateProject', async function(targetPath) {
		await ui.log("Handling RGSS Based RPG Maker");
		await thisAddon.createProjectThread(targetPath);
	});

	engines.addHandler(supportedEngines, 'exportHandler', async function(targetPath, options) {
		if (trans.project.parser != "rmrgss") return;
	
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		console.log("Export handler", arguments);

		ui.showLoading();
		ui.loadingProgress("Processing", "Export into : "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		await ui.log("Target directory:", targetPath);
		await ui.log("Options : ", options);
		await ui.log("Origin path is cache path");
		var originPath = nwPath.join(trans.project.cache.cachePath, "data");

		if (await await common.isDirectory(targetPath)) {
			await thisAddon.exportToFolderThread(targetPath, undefined, options);
		} else {
			await thisAddon.exportAsZip(targetPath, undefined, options);
		}
		ui.loadingProgress("Finished", "Done!", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingEnd();
		return common.halt();
	});
	
	engines.addHandler(supportedEngines, 'onOpenInjectDialog', async function(ui, $dialog, options) {
		var $copyOption = $(".copyOptionsBlock");
		$copyOption.removeClass("hidden");
	});

	engines.addHandler(supportedEngines, 'injectHandler', async function(targetDir, sourceMaterial, options) {
		if (trans.project.parser != "rmrgss") return;
	
		ui.showLoading();
		ui.loadingProgress("Processing", "Injecting translation", {consoleOnly:false, mode:'consoleOutput'});

		await thisAddon.injectTranslation(targetDir, sourceMaterial, options);

		ui.loadingProgress("Finished", "Finished!", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingEnd();
		ui.showCloseButton();

		return common.halt();
	});

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

	thisAddon.resolveState("mainModuleLoaded")
}


$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});