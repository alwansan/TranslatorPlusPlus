(async () => {
await addonLoader.waitFor("kagParser");// eslint-disable-line

const thisAddon = this;
const gameEngine = "tyrano";
const AddonUtils = require("www/js/AddonUtils.js");

thisAddon.gameEngine = gameEngine;
AddonUtils(thisAddon);

this.optionsForm = {
		"writeEncoding": {
			"type": "string",
			"title": "Write Encoding",
			"description": t("Will force the text encoding into the one selected when writing the scripts. (blank = auto)<br />. You can use this field to convert the script into <b>UTF-16</b> so that the game will playable without changing your locale into Japanese."),
			"enum": [ "", 
						"utf8", 
						"utf16le",
						"UTF-16", 
						"UTF-16BE",					
						"ascii", 
						"binary", 
						"base64", 
						"hex", 
						"ISO-8859-1", 
						"ISO-8859-16", 
						"koi8-r", 
						"koi8-u", 
						"koi8-ru", 
						"koi8-t", 
						"Shift_JIS",
						"Windows-31j",
						"Windows932",
						"EUC-JP",
						"GB2312",
						"GBK",
						"GB18030",
						"Windows936",
						"EUC-CN",
						"KS_C_5601",
						"Windows949",
						"EUC-KR",
						"Big5",
						"Big5-HKSCS",
						"Windows950"
					],
			"HOOK": "thisAddon.config.writeEncoding"
			},
			"useLegacy": {
			"type": "boolean",
			"title": t("Use legacy parser"),
			"inlinetitle": t("Use legacy parser"),
			"description": t("Use legacy (old parser) instead of the new parser.<br />Legacy parser is faster, but unreliable on some game.<br />New parser is more reliable, but slower."),
			"HOOK": "thisAddon.config.useLegacyParser"
		}		
}

thisAddon.config = thisAddon.config || {};

var defaultLiteralTags = ["ruby", "l", "r"];

// var encoding 	= require('encoding-japanese');
// var iconv 		= require('iconv-lite');
var path 		= require('path');
var fs 			= fs || require('graceful-fs');
var fse 		= require('fs-extra')
var bCopy 		= require('better-copy');
// var buffTool 	= require('buffer-tools');

// var kstg 		= require("kstg");
// var {TyranoParser} = require("www/addons/kagParser/TyranoParser.js")
var {spawn} 	= require('child_process');
// const { trim } = require('jquery');

var libKAG 		= require("www/addons/kagParser/libKAG.js")(thisAddon);

var TjsFile = libKAG.TjsFile
var KAGJs = libKAG.KAGJs

/**
 * Parse the weird config format of TyranoScript
 * @param  {} configContent
 */
TjsFile.prototype.parseConfig = async function(configContent) {
	configContent = configContent.replaceAll("\r", "");
	var lines = configContent.split("\n");
	var offset = 0;
	for (var i=0; i<lines.length; i++) {
		var trimmed = lines[i].trim();
		if (trimmed.substring(0,1) !== ";") {
			this.register(lines[i]+"\n");
			offset += (lines[i]+"\n").length
			continue;
		}

		// parsing the line started with ";"
		var segment = lines[i].split("=");
		var value = lines[i].substring(segment[0].length+1)
		var cols = segment[0].length + 1;
		var leftHand = segment[0].trim().substring(1)
		var context = ["line", i, "col", cols, "leftHand", leftHand];
		// register the lefthand
		this.register(segment[0]+"=");
		this.registerString(value, context, {
			start:offset+cols,
			end:offset+cols+(value.length),
			leftHand:{
				context:leftHand.split("."),
				type:"assignment"
			}
		});
		// register the new line character itself
		this.register("\n");
		offset += (lines[i]+"\n").length

	}
}

TjsFile.prototype.parse = async function() {
	if (this.file.toLowerCase().includes("\\data\\system\\config.tjs")) {
		console.warn("Overriding TJSFIle Parse for Config.tjs", this);

		return new Promise(async (resolve, reject) => {
			this.string 	= await this.readFile();
			await this.parseConfig(this.string);
			resolve();
		})
	}

    this.contextEnter(path.basename(this.file));
    this.promise = new Promise(async (resolve, reject) => {
        this.string 	= await this.readFile();
        TjsFile.fetch.call(this, this.string)
        
        this.contextEnd();
        resolve(this.string);
    })
    return this.promise;	
}

thisAddon.utils = libKAG.utils
const utils = thisAddon.utils;

thisAddon.createProjectFromSource = async function(entryPoint, options = {}) {
	entryPoint ||= options.entryPoint;
	if (!entryPoint) throw new Error("Entry point is required");

	const sourceDir = options.sourceDir || nwPath.dirname(entryPoint);
	return thisAddon.utils.createProject(entryPoint, {
		...options,
		entryPoint,
		sourceDir,
	});
}

thisAddon.prepareNewProject = async function(info = {}) {
	if (!addonLoader.addons.kagParser) {
		return alert("KAG Parser is not installed. Please install Kirikiri Adventure Game Parser add-on!");
	}

	const values = {
		...info,
	};
	values.entryPoint ||= trans.project?.options?.init?.entryPoint || trans.project?.entryPoint;
	values.literalTags ||= defaultLiteralTags;
	values.readEncoding ||= ["utf-8"];

	if (!values.entryPoint) {
		return alert("Please select game executable file");
	}

	if (values.captureTags?.length) {
		if (values.captureTags.length === 1) {
			if (!values.captureTags[0].tagName && !values.captureTags[0].attr) {
				delete values.captureTags;
			} else if (!values.captureTags[0].tagName) {
				return alert("Tag name is empty at index 0!");
			}
		} else {
			for (let i in values.captureTags) {
				if (!values.captureTags[i].tagName) return alert(`Tag name at index ${i} is empty!`);
			}
		}
	}

	const expectedAsar = path.join(nwPath.dirname(values.entryPoint), "resources/app.asar");
	if (await common.isFileAsync(expectedAsar)) {
		const conf = confirm("The game is compiled with Electron.\nDo you want to extract the game now?");
		if (!conf) return;
		const defaultTargetDir = path.join(nwPath.dirname(values.entryPoint), "extracted");
		const newEntryPoint = await TyranoUtil.showExtractDialog(expectedAsar, defaultTargetDir);
		if (!newEntryPoint) return alert("Can not extract the game. Please extract the game manually and try again.");
		values.entryPoint = newEntryPoint;
	} else {
		ui.showBusyOverlay();
		const isPackaged = await TyranoUtil.isPackagedGame(values.entryPoint);
		ui.hideBusyOverlay();
		if (isPackaged) {
			const conf = confirm("The game is packaged. You cannot continue unless you extract the game. Do you want to extract the game now?");
			if (!conf) return;
			const defaultTargetDir = path.join(nwPath.dirname(values.entryPoint), "extracted");
			const newEntryPoint = await TyranoUtil.showExtractDialog(values.entryPoint, defaultTargetDir);
			if (!newEntryPoint) return alert("Can not extract the game. Please extract the game manually and try again.");
			values.entryPoint = newEntryPoint;
		}
	}

	if (!await TyranoUtil.isValidEntryPoint(values.entryPoint)) {
		return alert(`Invalid entry point : ${values.entryPoint}\n`
			+ `- The entry point must be a file\n`
			+ `- The entry point must be exist\n`
			+ `- 'tyrano/libs.js' must be exist\n`
			+ `- 'data/scenario/first.ks' must be exist\n`
			+ `Your game may not be extracted properly. Please extract the game first.`
		);
	}

	ui.log.show();
	if (!ESScript) {
		await ui.log.error("ESScript not found. Please install/enable ESParser add-on!")
	}

	ui.loadingProgress("Processing", "Processing : " + values.entryPoint, {consoleOnly:true, mode:'consoleOutput'});
	ui.loadingProgress("Processing", "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});

	await thisAddon.createProjectFromSource(values.entryPoint, {
		engineName : "tyrano",
		literalTags : values.literalTags,
		readEncoding: values.readEncoding,
		captureTags: values.captureTags,
		actorTags: values.actorTags,
		sourceDir: nwPath.dirname(values.entryPoint),
	});
}

thisAddon.utils.createProject = async function(entryPoint, options) {
    options = options || {}
    options.engineName 	= options.engineName || "tyrano"
    var projectId 		= common.makeid(10);
    //var targetDir 	= path.join(nw.process.env.TMP, projectId);
    var stagePath 		= path.join(common.getStagePath(),projectId);
    var ksFiles 		= [];	
    var kagjs;
    
	const sourceDir = options.sourceDir || nwPath.dirname(entryPoint)
    const aec = addonLoader.getAddon("aec");
	var selfExtractLocation ;

	if (nwPath.extname(entryPoint).toLowerCase() == ".exe") {
		ui.log("Entry point is an exe file. Let's see if we can extract it...");
		let fType = await aec.detectFileType(entryPoint);
		if (fType == "ZIP") {
			selfExtractLocation = nwPath.join(sourceDir, "game-extracted");
			ui.log("Extracting ", entryPoint);
			await aec.extractFile(entryPoint, selfExtractLocation);
			ui.log("Extraction completed");
		}
	}

    try {
        //await normalizeStructure(sourceDir, options);
        var stageDir = path.join(stagePath, "game");
        fs.mkdirSync(stageDir, {recursive:true});
        

        let copyLoc = sourceDir;
        if (selfExtractLocation) copyLoc = selfExtractLocation;
        await bCopy(copyLoc, stageDir, {
            filter: function(src, dest) {
                if (path.extname(dest).toLowerCase() == '.ks' || path.extname(dest).toLowerCase() == '.tjs') {
                    console.log("copying ",src, dest);
                    ui.loadingProgress("Preparing", "Copying : "+src, {consoleOnly:true, mode:'consoleOutput'});
                    ksFiles.push(dest)
                    return true;
                }
                return false;
            },
            overwrite:true
        })
        
        if (options.decryptFiles) {
            ui.log("Decrypt option is ON... decrypting files.");
            await thisAddon.utils.decryptScenarioFile(stageDir);
        }
        kagjs = new KAGJs(stageDir, {
            engineName      : options.engineName || "tyrano",
            onParseStart    : function(currentFile) {
                                    ui.loadingProgress("Processing", "Processing "+currentFile, {consoleOnly:true, mode:'consoleOutput'});
                                },
            literalTags     : options.literalTags || defaultLiteralTags,
            readEncoding    : options.readEncoding,
			captureTags     : utils.normalizeTagSelector(options.captureTags, true),
            actorTags       : utils.normalizeTagSelector(options.actorTags),
        });	
        ui.loadingProgress("Processing", "Converting data", {consoleOnly:true, mode:'consoleOutput'});
        await kagjs.init();
    
    
        var transData = kagjs.toTrans();
        transData.project.projectId = projectId;
        transData.project.cache 	= transData.project.cache||{};
        transData.project.cache.cachePath = stagePath;
        transData.project.loc 		= sourceDir;
        transData.project.options 	= transData.project.options || {}
        transData.project.options.literalTags 	= options.literalTags || []
        transData.project.entryPoint = entryPoint;

        transData.project.options.init ||= {}
        //transData.project.options.init.extractXP3   = options.extractXP3;
		transData.project.options.init.entryPoint = entryPoint;
		transData.project.options.init.sourceDir = sourceDir;
		transData.project.options.init.literalTags = options.literalTags || [];
        transData.project.options.init.readEncoding = options.readEncoding;
		transData.project.options.init.captureTags  = options.captureTags;
        transData.project.options.init.actorTags    = options.actorTags;
        
        var gameInfo = {
            title : transData.project.gameTitle
        }
        
        fs.writeFileSync(path.join(stagePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2))
    
        
        ui.loadingProgress("Processing", "Parsing done!", {consoleOnly:true, mode:'consoleOutput'});
        ui.loadingProgress("Processing", "Creating new Project.", {consoleOnly:true, mode:'consoleOutput'});
        console.warn("trans data : ", transData);
        
        trans.openFromTransObj(transData, {isNew:true});

        ui.loadingProgress("Done", "All done", {consoleOnly:true, mode:'consoleOutput'});
        await trans.autoSave();
        ui.loadingEnd("Done", "Done");
        
    } catch (e) {
        ui.logError(e.toString())
        ui.loadingEnd("Error", "Error")
    }
}


this.utils.determineEntryPoint = async function(transData, dir) {
	if (!dir) return;
	if (!await common.isDir(dir)) return;


	const determineExeFromDir = async (dir, suggestedPath) => {
		if (suggestedPath) {
			let fname = nwPath.basename(suggestedPath) || "";
			let thisPath = nwPath.join(transData, fname);
			if (await common.isFileAsync(thisPath)) return thisPath;
		}

		const dirContent = await fs.promises.readdir(dir);
		var exes = []
		for (let i in dirContent) {
			let thisPath = dirContent[i];
			if (nwPath.extname(thisPath).toLowerCase() !== ".exe") continue;
			exes.push(nwPath.join(dir, thisPath))
		}
		
		if (exes.length == 1) return exes[0];
		if (exes.length < 1) return;

		throw new Error("Exe ambiguous. There are two exe file in the original folder. This problem is occured because You created the project using the older version of Tyrano parser. Please recreate the project.")
	}

	if (transData) {
		if (await common.isFileAsync(transData?.project?.entryPoint)) return transData?.project?.entryPoint;
		if (await common.isDir(transData.project.loc)) {
			return await determineExeFromDir(transData.project.loc, transData?.project?.entryPoint)
		}
	}



	if (!transData?.project?.entryPoint) {
		// prioritize index.html
		let htmlEntryPoint = nwPath.join(dir, "index.html")
		if (await common.isFileAsync(htmlEntryPoint)) return htmlEntryPoint;
	} else {
		let filename = nwPath.join(dir, nwPath.basename(transData?.project?.entryPoint))
		if (await common.isFileAsync(filename)) return filename;
	}

	if (transData) {
		if (await common.isDir(transData.project.loc)) {
			return await determineExeFromDir(transData.project.loc, transData?.project?.entryPoint)
		}

	}

	return await determineExeFromDir(dir);
}

this.utils.determineSourceDirToCopy = async function(sourceDir, transData) {
	if (nwPath.extname(transData.project.entryPoint|| "") == ".html") {
		// entry point is as is
		return sourceDir;
	} 


}

this.utils.applyTranslation = async function(sourceDir, targetDir, transData, options) {
	transData ||= trans.getSaveData();
	options ||= {}

	ui.log("Injecting translation to Tyrano game with options", options);
	ui.log("Source material:", sourceDir);
	ui.log("Target dir:", targetDir);

	ui.log("Checking dependency");

	console.log("apply arguments", arguments);

	await common.mkDir(targetDir);
	

	ui.log("Detecting the game executable:");
	const entryPoint = await this.determineEntryPoint(transData, sourceDir);
	// const targetGameExe = nwPath.join(targetDir, nwPath.basename(gameExe))
    const aec = addonLoader.getAddon("aec");


	// if (options.custom?.buildOption == "addNWJS") {
	// 	// pack the content
	// 	ui.log("Searching for index.html in "+sourceDir);
	// 	let indexFiles = await common.searchFile("index.html", sourceDir);
	// 	let currentSourceDir = nwPath.dirname(indexFiles[0]);

	// 	if (!indexFiles?.length) {
	// 		ui.log("Not found!, trying to extract from exe file");
	// 		if (nwPath.extname(entryPoint) == ".exe") {
	// 			//sourceDir = nwPath.join(sourceDir, "game-extracted");
	// 			await aec.extractFile(entryPoint, targetDir);
	// 			options.copyOptions =="copyNothing";
	// 		}
	// 	}

	// 	if (options.copyOptions!=="copyNothing") {
	// 		ui.log("Copying resource");
	// 		await bCopy(currentSourceDir, targetDir, {
	// 			filter: function(src, dest) {
	// 				ui.log("Copying : "+src);
	// 				if (path.extname(dest).toLowerCase() == '.bak') return false;
					
	// 				return true;
	// 			},
	// 			overwrite:true
	// 		})
	// 	}
	// 	await TyranoUtil.pack(targetDir, targetDir);
	// } else {
		if (options.copyOptions!=="copyNothing") {
			ui.log("Copying resource");
			await bCopy(sourceDir, targetDir, {
				filter: function(src, dest) {
					ui.log("Copying : "+src);
					if (path.extname(dest).toLowerCase() == '.bak') return false;
					
					return true;
				},
				overwrite:true
			})
		}
	// }

	await this.exportToFolder(undefined, targetDir, transData, options);
	ui.log.addButton("Open folder", function() {
			nw.Shell.showItemInFolder(nwPath.join(targetDir, "game.exe"));
		},{
			class: "icon-folder-open"
	});
	if (await common.isFileAsync(nwPath.join(targetDir, "game.exe"))) {
		ui.log.addButton("Play!", function() {
				console.log("Opening game");
				nw.Shell.openItem(nwPath.join(targetDir, "game.exe"));
			},{
				class: "icon-play"
		});
	} else {
		ui.log.addButton("Make the game playable", async function() {
				ui.log.hide();
				const index = nwPath.join(targetDir, "index.html");
				TyranoUtil.showPackageDialog(index, targetDir);
			},{
				class: "icon-play"
		});		
	}

}





const TyranoUtil = function() {

}

TyranoUtil.spawn = function(command) {
	var process = spawn(command, []);

	process.stdout.on('data', (data) => {
		console.log(`stdout: ${data}`);
	});
	
	process.stderr.on('data', (data) => {
		console.error(`stderr: ${data}`);
	});
	
	process.on('close', (code) => {
		console.log(`child process exited with code ${code}`);
	});

	process.on('spawn', (code) => {
		console.log(`spawned: ${process.pid}`);
	});
	
	return process.pid;
}

TyranoUtil.getTempPath = async function(gameExe) {

}

TyranoUtil.extract = async function(gameExe, destinationDir) {
	var dirContent = await fs.promises.readdir(nw.process.env.TMP);

	var difFolder = async function() {
		var currentDir = await fs.promises.readdir(nw.process.env.TMP);
		for (var i in currentDir) {
			if (dirContent.includes(currentDir[i])) continue;
			var fullPath = nwPath.join(nw.process.env.TMP, currentDir[i]);
			if (await common.isDirectory(fullPath)) {
				return fullPath;
				//break;
			}
		}
	}

	var pid = this.spawn(gameExe);
	console.log("pid", pid);

	for (var i=0; i<20; i++) {
		await common.wait(2000);
		var tempFolder = await difFolder();
		if (tempFolder) break;
	}

	var process = await common.aSpawn("tasklist", ["/fi", `"pid eq ${pid}"`], {shell:true});
	console.log(process);

	console.log("waiting based on folders mtime change");
	var lastMtime = 0;
	while (true) { //eslint-disable-line
		var thisStat = await common.fstat(tempFolder);
		console.log(JSON.stringify(thisStat, undefined, 2));
		console.log(`${thisStat.atimeMs} == ${lastMtime}`);
		if (thisStat.atimeMs == lastMtime) break;
		await common.wait(1000);
		lastMtime = thisStat.atimeMs;
	}

	process = await common.aSpawn("tasklist", ["/fi", `"pid eq ${pid}"`], {shell:true});
	console.log(process);

	console.log("temp folder: ", tempFolder);
	await bCopy(tempFolder, destinationDir);
	console.log("done copying");
}


TyranoUtil.showExtractDialogLegacy = async function(gameExe, destinationDir) {
	gameExe = gameExe || "";
	destinationDir = destinationDir || "";
	var dvField = new DVField();
	var	$popup = $("<div id='tyrano_decryptorDialog'></div>");

	var fieldData = {};

	var openGame = async function() {
		var dirContent = await fs.promises.readdir(nw.process.env.TMP);

		var difFolder = async function() {
			var currentDir = await fs.promises.readdir(nw.process.env.TMP);
			for (var i in currentDir) {
				if (dirContent.includes(currentDir[i])) continue;
				var fullPath = nwPath.join(nw.process.env.TMP, currentDir[i]);
				if (await common.isDirectory(fullPath)) {
					return fullPath;
					//break;
				}
			}
		}
	
		fieldData.process = this.spawn(fieldData.gameExe);
		console.log("process", fieldData.process);	
		for (var i=0; i<20; i++) {
			await common.wait(2000);
			var tempFolder = await difFolder();
			if (tempFolder) break;
		}
		fieldData.tempFolder = tempFolder;
		return tempFolder;
	}

	var showSlideMain = function() {
		var $content = $(`<div>
			<h2 data-tran="">${t('Select TyranoBuilder packaged game')}</h2>
			<div data-tran="">
				${t('Select the exe file of your packaged game.')}
			</div>
			<label>
				<input type="dvSelectPath" class="fromPath form-control" accept=".exe" value="${gameExe}" />
			</label>
			<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">Field can not be empty!</div>
			</div>

			<div class="blockBox warningBlock withIcon" data-tran="">
				Pressing <b>Next</b> will open the game.<br />
				Do not close the game window manually.
			</div>
			`);
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));
		$content.find(".fromPath").on("change", function() {
			fieldData.gameExe = $(this).val();
		})
		$popup.empty();
		$popup.append($content);
		$popup.dialog( "option", "buttons", buttons.showSlideMain);
	}

	var showSlideOpenGame = async function() {
		var $content = $(`
			<div class="blockBox warningBlock withIcon" data-tran="">
				Please wait until the game is fully loaded and the game screen is displayed properly (Displays main screen and ready to play).<br />
				Do not close the game window manually!
			</div>
		`);
		$popup.empty();
		$popup.append($content);
		$popup.dialog( "option", "buttons", buttons.showSlideOpenGame);		
	}


	var showSelectDestination = async function() {
		var $content = $(`
			<div>
				<h2 data-tran="">${t('Target folder')}</h2>
				<div data-tran="">
				${t('Select destination folder. The process will replace the existing files.')}
				</div>
				<label>
					<input type="dvSelectPath" class="toPath form-control" nwdirectory value="${destinationDir}" />
				</label>
				<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">Field can not be empty!</div>
			</div>
		`);
		
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));
		$content.find(".toPath").on("change", function() {
			fieldData.destinationDir = $(this).val();
		})		
		$popup.empty();
		$popup.append($content);
		$popup.dialog( "option", "buttons", buttons.showSelectDestination);		
	}	

	var showLastScreen = async function() {
		var $content = $(`
			<div>
				<h2 data-tran="">${t('Extraction completed')}</h2>
			</div>
		`);
		
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));
		$popup.empty();
		$popup.append($content);
		$popup.dialog( "option", "buttons", buttons.showLastScreen);		
	}	


	var buttons = {};
	buttons.showSlideMain = [
		{
			text: t("Close"),
			icon: "ui-icon-close",
			click: function() {
				$(this).dialog( "close" );
			}
		},
		{
			text: t("Next"),
			click: async function() {
				if (!fieldData.gameExe) return alert(t(`Please select game executable file`));
				await showSlideOpenGame();
				await openGame();
			}
		}

	]

	buttons.showSlideOpenGame = [
		{
			text: t("Back"),
			icon: "ui-icon-close",
			click: function() {
				showSlideMain();
			}
		},
		{
			text: t("The game is fully loaded, proceed!"),
			click: async function() {
				await showSelectDestination();
			}
		}

	]

	buttons.showSelectDestination = [
		{
			text: t("Back"),
			icon: "ui-icon-close",
			click: function() {
				showSlideOpenGame();
			}
		},
		{
			text: t("Extract data"),
			click: async function() {
				console.log("copying data");
				ui.showBusyOverlay();
				await bCopy(fieldData.tempFolder, fieldData.destinationDir);
				ui.hideBusyOverlay();
				showLastScreen();
			}
		}

	]

	buttons.showLastScreen = [
		{
			text: t("Open extracted folder"),
			icon: "ui-icon-close",
			click: function() {
				nw.Shell.showItemInFolder(nwPath.join(fieldData.destinationDir, "index.html"));
			}
		},
		{
			text: t("Close"),
			click: async function() {
				$(this).dialog("close");
				await common.aSpawn("taskkill", ["/F", "/PID", fieldData.process.pid], {shell:true})
			}
		}
	]	

	$popup.dialog({
		title: t("Extract resources"),
		autoOpen: false,
		modal:true,
		width:640,
		height:340,
		minWidth:640,
		minHeight:340,
		show: {
			effect: "fade",
			duration: 200
		},
		hide: {
			effect: "fade",
			duration: 200
		},
		buttons:buttons.main
	});	

	showSlideMain();
	$popup.dialog("open");

	return new Promise((resolve, reject) => {
		$popup.on("dialogclose", (evt, ui)=>{
			resolve(fieldData.tempFolder);
		})
	})
}

TyranoUtil.showExtractDialog = async function(from="", to="", options) {
	const aec = addonLoader.getAddon("aec");
	if (!aec) return alert("AEC addon is not installed. Please install it first");
    const value = await ui.form({jsonForm: 
        {
            schema: {
                sourceFile: {
                    type: "string",
                    title: t("Select the game executable"),
					description: t("Select the game executable or asar file to extract"),
					default: from
                },
                targetDir: {
                    type: "string",
                    title: t("Target directory"),
                    description: t("Select the target directory to store the unpacked files"),
					default: to
                },
            },
            form: [
                {
                    type: "info",
                    content: `This tool will extract the archive file into the target directory overwriting existing content.`
                        +`<br>`    
                        +`You are using AEC version ${aec.package.version}`
                },
                {
                    key: "sourceFile",
                    type: "selectfile",
                    multiple: false,
					onChange: async function(e) {
						let value = $(e.target).val();
						// check if asar file is detected
						if (value.toLowerCase().endsWith(".exe")) {
							const asarFile = nwPath.join(nwPath.dirname(value), "resources/app.asar");
							if (await common.isFileAsync(asarFile)) {
								// if asar file is detected, set the source file to asar file
								const conf = confirm(t("Electron archive file detected. Do you want to extract the asar file instead?"));
								if (!conf) return;
								// set the source file to asar file
								$(e.target).val(asarFile);

							}
						}
					}
                },
                {
                    key: "targetDir",
                    type: "selectdir",
                },
                
            ]
        }
    },
    {
        title: t("Tyranobuilder Game Extractor"),
    });

    if (!value) return;
    console.log("value", value);
    if (!value.sourceFile || !value.targetDir) return alert("Please select the source files and target directory");
    
	return new Promise(async (resolve, reject) => {
		ui.log.show();
		ui.one("loadingConsoleClosed.tyranoExtractMenu", function() {
			const expectedFile = nwPath.join(value.targetDir, "index.html");
			if (!common.isFileAsync(expectedFile)) {
				ui.log("Extraction failed. The expected file is not found: "+expectedFile);
				return resolve();
			}
			resolve(nwPath.join(value.targetDir, "index.html"));
		});
		if (!await common.isDir(value.targetDir)) {
			ui.log("Creating target directory");
			await common.mkDir(value.targetDir);
		}
		ui.log.progress(100, "Unpacking files");
		await aec.extractFile(value.sourceFile, value.targetDir);
		ui.log("Done!");
		ui.log.end();
		ui.log.addButton("Open Output Directory", function() {
			nw.Shell.openItem(value.targetDir);
		},
		{
			class: "icon-folder-open"
		});
	})

}


TyranoUtil.debugEnvDir = nwPath.join(__dirname, "3rdParty/nwjs/debug");

TyranoUtil.prepareDebugEnv = async function() {
	var nwJsLink = "https://dl.nwjs.io/v0.52.2/nwjs-sdk-v0.52.2-win-x64.zip"

	var debugApp = nwPath.join(this.debugEnvDir, "debug.exe");
	if (await common.isFileAsync(debugApp)) return debugApp;
	ui.showLoading();
	ui.loadingProgress(0, "Processing");
	await ui.log("Preparing debug environment for the first run");


	await ui.log(`Downloading nwjs ${nwJsLink} to ${this.debugEnvDir}`);
	ui.loadingProgress(0, "Downloading");
	await common.mkDir(TyranoUtil.debugEnvDir);
	var nwDir = nwPath.join(TyranoUtil.debugEnvDir, "..");

	var downloadedLink = await common.download(nwJsLink, nwDir, {
		onProgress : (state) =>  {
			ui.loadingProgress(parseInt(state.percent));
		}
	});
	//var downloadedLink = nwPath.join(nwDir, nwPath.basename(nwJsLink));
	await ui.log("Extracting archive");
	await common.extract(downloadedLink, nwDir);

	await common.rmdir(this.debugEnvDir);

	var expectedDir = nwPath.join(nwDir, common.getFilename(nwJsLink))
	if (!await common.isDirectory(expectedDir)) {
		ui.loadingEnd();
		return console.warn(`Can not find expected directory: ${expectedDir}`);
	}
	await fse.rename(expectedDir, this.debugEnvDir);
	await fse.rename(nwPath.join(this.debugEnvDir, "nw.exe"), debugApp);

	await ui.log("Copying required files");
	await bCopy(nwPath.join(thisAddon.getLocation(), "env/debug"), this.debugEnvDir)
	ui.loadingProgress(100, "Downloading");
	ui.hideLoading();
	return debugApp;
}

TyranoUtil.play = async function(gameEntryPoint) {
	var debugApp = await this.prepareDebugEnv();
	if (!debugApp) return alert("Can not initialize debug environment");

	if (!gameEntryPoint) {
		var gamePath = trans.project.devPath
		if (!gamePath) gamePath = await ui.openDialogSetDevPath();
		gameEntryPoint = nwPath.join(gamePath, "index.html");

		if (! await common.isFileAsync(gameEntryPoint)) return alert (`Path not found: ${gameEntryPoint}`)
	}

	await spawn(debugApp, ["-p", gameEntryPoint], {
		detached:true
	})
}


TyranoUtil.parseTyranoConfig = function(configString) {
    const result = {};
	if (!configString) return result;

    // Helper function to automatically cast string values to appropriate types
    function autoTypeCast(valueStr) {
        const trimmedValue = valueStr.trim();

        // Boolean
        if (trimmedValue.toLowerCase() === 'true') {
            return true;
        }
        if (trimmedValue.toLowerCase() === 'false') {
            return false;
        }

        // Hexadecimal number
        if (trimmedValue.startsWith('0x') || trimmedValue.startsWith('0X')) {
            const hexNum = parseInt(trimmedValue, 16);
            // Ensure it's a valid hex and not NaN (e.g. "0xGG")
            if (!isNaN(hexNum)) {
                return hexNum;
            }
        }
        
        // Standard number (integer or float)
        const num = parseFloat(trimmedValue);
        // Check if it's a valid number and if the original string essentially only contained the number
        // This prevents "123px" from becoming 123.
        // For this specific format, a simple isNaN and isFinite check is likely sufficient
        // as values like "123px" are not present.
        if (!isNaN(num) && isFinite(num)) {
            // If the string representation of the parsed number is the same as the trimmed original string,
            // it's a pure number. This handles "1280", "5.00" (becomes 5), etc.
            // If you need "5.00" to remain "5.00" as a string, this logic would need adjustment.
            // However, typically "5.00" in a config implies the number 5.
            if (num.toString() === trimmedValue || String(Number(trimmedValue)) === trimmedValue) {
                 return num;
            }
            // If parseFloat produced a number but the string doesn't perfectly match (e.g. "5.00" vs "5")
            // and the context suggests it should be a number anyway (like most config values).
            // For the given data, assuming if parseFloat works, it's a number.
             return num;
        }

        // Default to string
        return trimmedValue;
    }

    const lines = configString.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip comments and empty lines
        if (trimmedLine.startsWith('//') || trimmedLine === '') {
            continue;
        }

        // Process lines starting with ';'
        if (trimmedLine.startsWith(';')) {
            const content = trimmedLine.substring(1); // Remove the leading ';'
            const parts = content.split('=');

            if (parts.length >= 2) {
                const rawKey = parts[0].trim();
                // Join the rest in case the value itself contains '='
                const rawValue = parts.slice(1).join('=').trim(); 
                const value = autoTypeCast(rawValue);

                const keyParts = rawKey.split('.');
                let currentObject = result;

                for (let i = 0; i < keyParts.length; i++) {
                    const keyPart = keyParts[i];
                    if (i === keyParts.length - 1) {
                        // Last part of the key, assign the value
                        currentObject[keyPart] = value;
                    } else {
                        // Not the last part, ensure an object exists for nesting
                        if (!currentObject[keyPart] || typeof currentObject[keyPart] !== 'object') {
                            currentObject[keyPart] = {};
                        }
                        currentObject = currentObject[keyPart];
                    }
                }
            }
        }
    }

    return result;
}

TyranoUtil.stringifyTyranoConfig = function(obj) {
	if (typeof obj !== 'object' || obj === null) {
		throw new Error("Input must be a non-null object");
	}
    const lines = [];
    const initialComment = "//ティラノビルダーによる自動ビルド　";

    /**
     * Recursively processes the object and populates the lines array.
     * @param {object} currentObj The object to process.
     * @param {string} currentPrefix The prefix for keys (e.g., "parentKey.")
     */
    function processObject(currentObj, currentPrefix) {
        // Get keys and sort them alphabetically for consistent output order
        const keys = Object.keys(currentObj).sort();

        for (const key of keys) {
            const value = currentObj[key];
            const fullKey = currentPrefix ? currentPrefix + '.' + key : key;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // If it's a non-null, non-array object, recurse.
                // Empty objects will result in no lines for themselves, which is correct.
                processObject(value, fullKey);
            } else {
                // It's a primitive value (string, number, boolean) or null/undefined.
                let stringValue;

                if (typeof value === 'undefined') {
                    continue; // Skip keys with undefined values
                } else if (value === null) {
                    stringValue = ""; // Null values become empty strings (e.g., key=)
                } else {
                    stringValue = String(value); // Converts boolean, number, string
                }
                lines.push(`;${fullKey}=${stringValue}`);
            }
        }
    }

    processObject(obj, '');

    // Sort all collected lines alphabetically. This ensures deterministic output.
    lines.sort();

    if (lines.length === 0) {
        // If the object was empty or only contained undefined values,
        // return just the initial comment.
        return initialComment;
    }

    return initialComment + '\n' + lines.join('\n');
}

TyranoUtil.showPackageDialog = async function(from, to, options = {}) {
	let HTMLPacker;
	try {
		HTMLPacker = addonLoader.getAddon("basicUtils").HTMLPacker;
	} catch(e) {
		alert("Unable to load HTMLPacker from Basic Utilities addon. Please update your Translator++");
		return;
	}

	const thisOptions = {...options, ...{
		onAfterPack: async function(fieldValue, packOptions) {
			// check if package.json file is present
			const packageJson = nwPath.join(fieldValue.toPath, "package.json");
			if (!await common.isFileAsync(packageJson)) return;

			// read and parse package.json
			const packageContent = await common.fileGetContents(packageJson);
			const packageObj = JSON.parse(packageContent);
			// add "nodejs": false flag
			packageObj.nodejs = false;
			// write back to package.json
			await common.filePutContents(packageJson, JSON.stringify(packageObj, null, 2));

			// set TyranoBuilder config.tjs's configSave to webStorage 
			const configTjs = nwPath.join(fieldValue.toPath, "data/system/Config.tjs");
			if (await common.isFileAsync(configTjs)) {
				ui.log("Rewriting config.tjs");
				const configContent = await common.fileGetContents(configTjs);
				const configObj = TyranoUtil.parseTyranoConfig(configContent);
				configObj.configSave = "webstorage";
				const newConfigContent = TyranoUtil.stringifyTyranoConfig(configObj);
				await common.filePutContents(configTjs, newConfigContent);
			}

		}
	}}
	thisOptions.nwjsVersion = options.nwJsVersion || "https://dl.nwjs.io/v0.60.0/nwjs-sdk-v0.60.0-win-x64.zip";
	HTMLPacker.showPackageDialog(from, to, thisOptions);
}

TyranoUtil.getNWJSlinks = async function() {
	var basePath = 'https://dl.nwjs.io/'
	var data 	= await fetch(basePath)
	var nwjsPage = await data.text()
	var pattern = /<td><a href="(v[\d.\-a-zA-Z]+)\/">/g
	var found = [];
	nwjsPage.replaceAll(pattern, (all, match)=> {
		found.unshift(match);
	});

	var result = {};
	for (var i=0; i<found.length; i++) {
		var ver = found[i];
		var parts = ver.split(".");
		if (parseInt(parts[1]) < 13) continue;
		result[ver] = {};
		result[ver].x64 = `${basePath}${ver}/nwjs-${ver}-win-x64.zip`
		result[ver].i32 = `${basePath}${ver}/nwjs-${ver}-win-ia32.zip`
		result[ver].sdkx64 = `${basePath}${ver}/nwjs-sdk-${ver}-win-x64.zip`
		result[ver].sdki32 = `${basePath}${ver}/nwjs-sdk-${ver}-win-ia32.zip`
	}
	return result
}

TyranoUtil.drawNWJSOptions = async function() {
	ui.showBusyOverlay();
	var options = await this.getNWJSlinks();
	var result = [];
	for (var ver in options) {
		result.push(`<option value="${options[ver].x64}">${ver} x64</option>`);
		result.push(`<option value="${options[ver].i32}">${ver} i32</option>`);
	}
	ui.hideBusyOverlay();
	return result.join("\n");
}

/**
 * Check if the entry point is valid
 * @param {string} entryPoint - The entry point of the game
 * @returns {boolean} - True if the entry point is valid
 * @async
 * @desc Will check the validity of TyranoBuilder entry point
 * - The entry point must be a file
 * - The entry point must be exist
 * - `tyrano/libs.js` must be exist
 * - `data/scenario/first.ks` must be exist
 */
TyranoUtil.isValidEntryPoint = async function(entryPoint) {
	const aec = addonLoader.getAddon("aec");
	var selfExtractLocation ;

	if (!entryPoint) return false;
	if (!await common.isFileAsync(entryPoint)) return false;
	if (!await common.isFileAsync(nwPath.join(nwPath.dirname(entryPoint), "tyrano/libs.js"))) return false;
	if (!await common.isFileAsync(nwPath.join(nwPath.dirname(entryPoint), "data/scenario/first.ks"))) return false;
	return true;
}

TyranoUtil.isPackagedGame = async function(entryPoint = "") {
	if (!entryPoint) return false;
	const aec = addonLoader.getAddon("aec");
	if (nwPath.extname(entryPoint).toLowerCase() == ".exe") {
		let fType = await aec.detectFileType(entryPoint);
		if (fType == "ZIP") {
			return true;
		}
	}
	return false;
}

this.TyranoUtil = TyranoUtil;

function init() {
	// copy utils from kagParser

	// tool menu
	ui.mainMenu.addChild("tools", {
		id: "tyrano",
		label: "Tyrano"
	});

	var $newTransMenu = ui.mainMenu.addChild("tyrano", {
		label: "Extract TyranoBuilder package"
	});

	$newTransMenu.on("select", function() {
		TyranoUtil.showExtractDialog();
	})
	$newTransMenu = ui.mainMenu.addChild("tyrano", {
		label: "Create a Windows executable package"
	});

	$newTransMenu.on("select", function() {
		TyranoUtil.showPackageDialog();
	})

	// game created with TyranoBuilder is in UTF-8 LF encoding
	const $slide = $(`<div>
		<h1><i class="icon-plus-circled"></i>Tyrano Game</h1>
		<div class="blockBox infoBlock withIcon">
			<h2>Tyrano Parser Ver.`+thisAddon.package.version+`</h2>
			<p>${t("Before you create a new project, please make sure that :")}
				<ol>
					<li>${t("<b>Kirikiri Adventure Game parser</b> add-on is installed in your Translator++")}</li>
					<li>
						${t("Your game is fully extracted.")} <br/>
						<input type="button" class="btnSelectExe openTyranoExtractor" value="${t("Extract TyranoBuilder package")}" /> <br />
						The parser will try to extract the packed game automatically. The built-in unpacker may not work for all of the Tyrano game.
					</li>
					<li>${t("All .ks & .tjs files are in plain text (uncompiled, unscrambled, and unencrypted)")}</li>
					<li>${t("Some of the actions will modify your game. <b>So make sure to create a backup of your game!</b>")}</li>
				</ol>
			</p>
		</div>
		<div class="${thisAddon.package.name}CustomField"></div>
	</div>`);

	$slide.find(".openTyranoExtractor").on("click", async (e)=>{
		e.preventDefault();
		await TyranoUtil.showExtractDialog();
	});

	ui.newProjectDialog.addMenu({
		icon : thisAddon.getWebLocation()+"/icon.png",
		descriptionBar : `<h2>TyranoScript Game</h2>
						<p>${('Start translation from TyranoScript based game')}</p>`,
		actionBar: "",
		goToSlide: "tyrano1",
		at:4,
		// slides : {
		// 	"tyrano1": $slide
		// }
	})

	ui.newProjectDialog.newSlide("tyrano1", $slide, {
		onActive: ()=> {
			customField = new CustomFields($("<form></form>"), {jsonForm: 
				{
					schema:{
						entryPoint: {
							type: "string",
							title: "Game executable",
							description: t("Select the game executable file. This file is the main game file that will be used to extract the game data.")+
								"<br />"+t("In Tyrano games it is usually <b>index.html</b> or <b>exe</b> file."),
							required: true
						},
						readEncoding: {
							type: "json",
							title: "Preferred encodings",
							description: t("List of the possible character encodings. <b>Order does matter!</b>. You can drag to sort the list.")+"<br />"
								+t("Game created with TyranoBuilder is in <b>UTF-8</b> encoding")+"<br />",
							default: ["utf-8"]
						},
						literalTags: {
							type: "json",
							title: "Literal tags",
							description: t("Literal tags are the tags that will be escaped into Translator++ editor.")+"<br />"
								+t("<b>ruby l r</b> are mandatory.")+"<br />"
								+t("<b>[r]</b> Tags will be interpolated by Translator++ into a new line. So you don't need to write <b>[r]</b> explicitly."),
							default: defaultLiteralTags
						},
						
						captureTags: {
							type: "array",
							items: {
								type: "object",
								properties: {
									tagName: {
										title : "Tag name",
										description: "The tag name that will be captured",
										type: "string",
										required: true
									},
									attr: {
										type: "json",
										title: "Attributes",
										description: "The attributes that will be captured. You can capture texts from more than one attributes in a tag. Press enter to add new attribute.",
									},
								
								}
							}
						},
						actorTags: {
							type: "array",
							items: {
								type: "object",
								properties: {
									tagName: {
										title : "Tag that contains actor name",
										description: "The tag that contains actor name",
										type: "string",
										required: true
									},
									attr: {
										type: "string",
										title: "Attribute that contains actor name",
										description: "The attributes of the selected tag that will be captured. Leave blank if the actor name is in the tag itself.",
									},
								
								}
							}
						}					
					},
					form: [
						{
							key: "entryPoint",
							type: "selectfile",
							accept: ".exe, .html",
						},
						{
							key: "readEncoding",
							type: "tag",
							sortable: true,
						},

						{
							type: "fieldset",
							title: "Advanced settings",
							expandable: true,
							items: [
								{
									type: "info",
									value: t('Kirikiri script (.ks) is heavily customizable and allows developers to create their own tags.')
									+t('Translator++ can handle standard tags such as character names that start with a sharp (#).')
									+t('However, Translator++ may not be able to handle custom tags created by developers.')
									+t('Therefore, you may need to define the tags and attributes that need to be translated and those that need to be marked as actor names.')
									+t(`<p>Please visit the <a href="https://tyranobuilder.com/tag/" external target="_blank">TyranoBuilder tag reference</a> for more information about the tags.</p>`)
									+t('You might need to <input type="button" value="extract your game" onclick="addonLoader.addons.tyranoTrans.TyranoUtil.showExtractDialog()" /> and analyze the <b>ks</b> script inside it before starting the project.')
									
								},
								{
									key: "literalTags",
									type: "tag",
								},
								{
									type: "html",
									value: `<h2 class="mt-3">Capture tags and attributes</h2>`,
								},
								{
									type: "tabarray",
									items: {
									  type: "section",
									  items: [
										{
											key: "captureTags[].tagName",
										},
										{
											key: "captureTags[].attr",
											type:"tag",
											maxTags: 10,
										},
									  ]
									}
								},
								{
									type: "html",
									value: `<h2 class="mt-3">Define how to find actor names</h2>`
									+`<p>Define which tags or attributes are used for custom character names. The default character name tag <code>#</code> is handled automatically.</p>`,
								},
								{
									type: "tabarray",
									items: {
									  type: "section",
									  items: [
										{
											key: "actorTags[].tagName",
										},
										{
											key: "actorTags[].attr",
										},
									  ]
									}
								}
							]
						},
					]
				}
			});

			$slide.find(`.${thisAddon.package.name}CustomField`).empty();
			$slide.find(`.${thisAddon.package.name}CustomField`).append(customField.getElm());
		},
		buttons: [
			{
				text: t("Create Project"),
				click: async function() {
					if (!customField) return alert("Error: customField is not defined. This should not happen!");
					if (!addonLoader.addons.kagParser) return alert("KAG Parser is not installed. Please install Kirikiri Adventure Game Parser add-on!");
					const values = customField.getFormValues();
					console.log("values", values);
					ui.newProjectDialog.close()
					await thisAddon.prepareNewProject(values);


				}
			}
		],
	});

	if (window.engineDetectionRegistry && !window.engineDetectionRegistry.definitions.has("tyrano")) {
		window.engineDetectionRegistry.register({
			id: "tyrano",
			addonId: thisAddon.id,
			engineIds: [gameEngine],
			displayName: "TyranoScript / TyranoBuilder",
			priority: 100,
			detect: async function(request) {
				const entryPoint = request.entryPoint;
				if (!await TyranoUtil.isValidEntryPoint(entryPoint)) return { matches: [] };

				return {
					matches: [{
						engineId: gameEngine,
						confidence: 1,
						evidence: ["Found Tyrano runtime and first scenario files."],
						entryPoint,
						gameRoot: nwPath.dirname(entryPoint),
						preferredInput: "entryPoint"
					}]
				};
			},
			openProjectWizard: async function(candidate, launchContext) {
				ui.newProjectDialog.gotoSlide("tyrano1", "engineDetectResult");
				if (!customField) throw new Error("Tyrano project form is not ready.");
				window.engineDetectionRegistry.setFieldValue(
					customField.$elm.find("[name='entryPoint']"),
					launchContext.entryPoint
				);
			}
		});
	}


	// register handler
	if (typeof window.engines[gameEngine] == 'undefined') engines.add(gameEngine);
	engines.addHandler([gameEngine], 'exportHandler', async function(targetPath, options) {
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		
		ui.showLoading();
		ui.loadingProgress("Processing", "Parsing TyranoScript games from "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		try {
			var pathStat = fs.lstatSync(targetPath)
			
			if (pathStat.isDirectory()) {
				
				await thisAddon.utils.exportToFolder(path.join(trans.project.cache.cachePath, "game"), targetPath, trans.getSaveData(), options)
				ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
				ui.log.end();

				return true;
			}
		} catch (e) {
			// do nothing
		}
		
		
		// is file
		var tmpPath = path.join(nw.process.env.TMP, trans.project.projectId);
		fse.removeSync(tmpPath); 
		try {
			fs.mkdirSync(tmpPath, {recursive:true});
		} catch(e) {
			await ui.logError("Unable to create directory ", tmpPath);
			console.error(e);
			return true;
		}
		
		await thisAddon.utils.exportToFolder(trans.project.cache.cachePath, tmpPath, trans.getSaveData(), options)
		const _7z = require('7zip-min');
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+'/Data'], err => {
			// done
			console.log("process done");
			ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
			ui.log.end();				
		});

		
		return true;
	});
	
	engines.addHandler([gameEngine], 'injectHandler', async function(targetDir, sourceMaterial, options) {
		console.log("Path is : ", targetDir);
		console.log("options are : ", options);
		console.log(arguments);
		ui.log.start();
		// convert sourceMaterial to folder if path is file
		var sourceStat = fs.lstatSync(sourceMaterial)
		if (sourceStat.isFile()) sourceMaterial = path.dirname(sourceMaterial);
		
		ui.loadingProgress("Processing", "Parsing data. The window will appear hang sometimes. That's normal!", {consoleOnly:false, mode:'consoleOutput'});
		
		options ||= {};
		options.injectMode 	= gameEngine;

		await thisAddon.utils.applyTranslation(sourceMaterial, targetDir, trans.getSaveData(), options);
		ui.log.progress("Done!", "Done!");
		ui.log.end();
		return true;
	});

	engines.addHandler([gameEngine], 'updateProjectHandler', async function() {
		await thisAddon.updateProject();
		return common.halt();
	});


	engines.addHandler([gameEngine], "onLoadTrans", 
	() => {
		require("www/addons/tyranoTrans/Prism.tyrano.js");
		ui.ribbonMenu.add("Tyrano", {
			title : trans.gameEngine.toUpperCase(),
			toolbar : {
				buttons : {
					
					play : {
						icon : "icon-play",
						title : t("Play last build"),
						onClick : async () => {
							TyranoUtil.play(trans.project.devPath);
						}
					},
					
					openEditor : {
						icon : "icon-link-ext",
						title : t("Extract TyranoBuilder"),
						onClick : async () => {
							TyranoUtil.showExtractDialog();
						}
					},
					makeGame : {
						icon : "icon-box",
						title : t("Create playable package"),
						onClick : async () => {
							TyranoUtil.showPackageDialog();
						}
					},
				}
			}
		})		
	})	


	engines.addHandler([gameEngine], 'onLoadSnippet', async function(selectedCell) {
		console.log("tyrano onLoadSnippet handler");
		console.log("selected cell:", selectedCell);
		var obj = trans.getSelectedObject();

		if (obj.extension.toLowerCase() == ".tjs") this.commonHandleFile(selectedCell, "js");
		if (obj.extension.toLowerCase() == ".ks") this.commonHandleFile(selectedCell, "ks");

	});

	
	engines.getEngine(gameEngine).addProperty("injectOptionFields", ()=> {
		return {
			jsonForm: {
				"schema": {
					"readEncoding": {
						"title": "Read Character encoding",
						"description": "List of the possible character encodings. <b>Order does matter!</b>. Separate each value with a comma.<br />Translator++ will read the original file with the following encodings, patch the files and write with the <b>Write Character encoding</b> option. Leave blank to use the original character encoding.",
						"type": "string",
						"default" :  ""
					},
					"writeEncoding": {
						"title": "Write Character encoding",
						"description": "Translator++ will write the files with the selected character encoding",
						"type": "string",
						"default" :  "",
						"enum" :  [
							"",
							"UTF-8",
							"SHIFT-JIS",
						]
					},
					// "buildOption": {
					// 	"title": "Build option",
					// 	"description": t('There are several ways to produce playable localized game for Tyrano game. Please select one that suit your preference.'),
					// 	"type": "string",
					// 	"enum" :  [
					// 		"asIs",
					// 		"addNWJS",
					// 	]
					// },
				},
				"form": [
					{type: "msg", "msg": "<h2>Misc Options</h2>"},
					"readEncoding",
					"writeEncoding",
					// {
					// 	key:"buildOption",
					// 	titleMap: {
					// 		"asIs": "As is",
					// 		"addNWJS": "Add NWJS player",
					// 	}
					// },
				]
			}
		}
	})
	
}

$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});
})()