/*
Parse .ks & .tjs and convert them to .trans

convert .ks to xmlize data by replacing [ to < and ] to >
[end to </ 



macro endmacro if else elsif endif ignore endignore iscript endscript 

ignore anything inside [ignore] & [endignore]
parse anything inside [isscript] & [endscript]


cancelautomode	(Canceling "Automatically read through")
cancelskip	(Cancel skip)
ch	(Display characters)
cm	(Clear all message layers)
ct	(Reset message layer)
current	(Specify the message layer to be operated)
deffont	(Default character attribute setting)
defstyle	(Set default style)
delay	(Set character display speed)
endindent	(Remove indent)
endnowait	(Character display no wait (end of))
er	(Erase message layer characters)
font	(Character attribute setting)
glyph	(Specify click wait symbol)
graph	(Inline image display)
hch	(Display vertical-in-vertical display)
indent	(Set indent)
l	(Wait for line end click) <-- literal
locate	(Specify character display position)
locklink	(Link lock)
nowait	(Character display no weight)
p	(Waiting for page break click) <-- literal
position	(Message layer attribute)
r	( Begin on a new line ) <-- literal
resetfont	(Reset character attribute to default)
resetstyle	(Reset style to default)
ruby	(Specify ruby)
style	(Style settings)
unlocklink	(Unlock link)


WHEN EXPORTING : 
generate from line break : [r]

SCRIPTS :
capture all string inside quote
/(?<=(["']\b))(?:(?=(\\?))\2.)*?(?=\1)/gms


*/
var thisAddon = this;
const AddonUtils = require("www/js/AddonUtils.js");

thisAddon.gameEngine = "kag";
AddonUtils(thisAddon);

thisAddon.options = thisAddon.options || {};
if (typeof thisAddon.options.addFolderStructure === "undefined") thisAddon.options.addFolderStructure = true;
if (typeof thisAddon.options.prioritizeLooseScenario === "undefined") thisAddon.options.prioritizeLooseScenario = true;



this.optionsForm = {
    "writeEncoding": {
        "type": "string",
        "title": "Write Encoding",
        "description": "Will force the text encoding into the one selected when writing the scripts. (blank = auto)<br />. You can use this field to convert the script into <b>UTF-16</b> so that the game will playable without changing your locale into Japanese.",
        "enum": ["",
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
    /*
    "convertEncodingTo": {
      "type": "string",
      "title": "Convert encoding into",
      "description": "Post processing converter. Convert the encoding after the script exported successfully.<br />Most KAG Games use <b>Shift_JIS</b> or <b>UTF-16</b>",
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
      "HOOK": "thisAddon.config.convertEncodingTo"
    },
    */
    "useLegacy": {
        "type": "boolean",
        "title": "Use legacy parser",
        "inlinetitle": "Use legacy parser",
        "description": "Use legacy (old parser) instead of the new parser.<br />Legacy parser is faster, but unreliable on some game.<br />New parser is more reliable, but slower.",
        "HOOK": "thisAddon.config.useLegacyParser"
    }
}

thisAddon.config = thisAddon.config || {};
//thisAddon.config = thisAddon.config||{};
//thisAddon.config.convertEncodingTo = "utf16";

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
var libKAG 		= require("www/addons/kagParser/libKAG.js")(thisAddon);


// var KAGFile 	= libKAG.KAGFile;
// var TjsFile 	= libKAG.TjsFile;
// var KsFile 		= libKAG.KsFile;
// var KAGJs 		= libKAG.KAGJs;
//window.KsFile 	= KsFile;

//console.log(ksFile);
this.utils = libKAG.utils;
var createProject 		= this.utils.createProject
var exportToFolder 		= this.utils.exportToFolder;

thisAddon.createProjectFromSource = async function(entryPoint, options = {}) {
	entryPoint ||= options.entryPoint;
	if (!entryPoint) throw new Error("Entry point is required");

	return createProject(entryPoint, {
		...options,
		entryPoint,
		sourceDir: options.sourceDir || nwPath.dirname(entryPoint),
	});
}

thisAddon.prepareNewProject = async function(info = {}) {
	const values = {
		...info,
	};
	values.entryPoint ||= trans.project?.options?.init?.entryPoint || trans.project?.entryPoint;
	values.literalTags ||= defaultLiteralTags;
	values.readEncoding ||= ["shift-jis", "utf-16", "utf-16le", "utf8"];
	if (Array.isArray(values.readEncoding) && values.readEncoding.length) {
		const normalizedReadEncoding = values.readEncoding.map((enc) => common.getEncodingName(enc));
		if (!normalizedReadEncoding.includes("utf8")) values.readEncoding = [...values.readEncoding, "utf8"];
	}

	if (!values.entryPoint) return alert("Please select the game executable file!");

	if (values.captureTags?.length) {
		if (values.captureTags.length == 1) {
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

	ui.log.show();
	if (!ESScript) {
		await ui.log.error("ESScript not found. Please install/enable ESParser add-on!")
	}

	ui.loadingProgress("Processing", "Processing : " + values.entryPoint, {consoleOnly:true, mode:'consoleOutput'});
	ui.loadingProgress("Processing", "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});

	await thisAddon.createProjectFromSource(values.entryPoint, {
		literalTags : values.literalTags,
		extractXP3 : values.extractXP3,
		decryptFiles : values.decryptFiles,
		readEncoding: values.readEncoding,
		captureTags: values.captureTags,
		actorTags: values.actorTags,
		sourceDir: nwPath.dirname(values.entryPoint),
	});
}

this.utils.determineGameExe = async function(transData, dir) {
	transData ||= trans;
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

		for (let i in exes) {
			let versionInfo = await common.getFileVer(exes[i]);
			if (!versionInfo) {
				console.warn("Cannot get version info of", exes[i])
				continue;
			}
			if (versionInfo.FileDescription) {
				if (versionInfo.FileDescription.match(/KIRIKIRI/i)) return exes[i]
			}
		}
	}

	if (transData) {
		if (await common.isFileAsync(transData?.project?.entryPoint)) return transData?.project?.entryPoint;
		if (await common.isDir(transData.project.loc)) {
			return await determineExeFromDir(transData.project.loc, transData?.project?.entryPoint)
		}
	}

	if (!dir) return;
	if (!await common.isDir(dir)) return;
	return await determineExeFromDir(dir);
}

this.utils.copyKirikiriBin = async function(engineType, targetDir, winType) {
	await common.mkDir(targetDir);
	const baseBin = nwPath.join(thisAddon.getLocation(), "bin/engine")
	let file = ""
	if (engineType == "krkrz") {
		if (winType == "win64") {
			file = "krkrz_20171225r2/tvpwin32.exe"
		} else {
			file = "krkrz_20171225r2/tvpwin64.exe"
		}
	} else {
		file = "kr2_232r2/krkr.exe"
	}
	console.log(`await common.copy(${JSON.stringify(nwPath.join(baseBin, file))}, ${JSON.stringify(targetDir)})`)
	await common.copyFile(nwPath.join(baseBin, file), targetDir)
}

this.utils.getKiriKiriType = async function(gameExe, transData = {}) {
	ui.log("Determining KiriKiri Engine Type of ", gameExe);

	if (transData?.project?.options?.init?.engineType) return transData?.project?.options?.init?.engineType;

	var fileVer = await common.getFileVer(gameExe);
	ui.log("What we know about the EXE", fileVer);
	fileVer ||= {}
	fileVer.FileDescription ||= ""
	fileVer.ProductName ||= ""
	fileVer.OS ||= ""

	const result = {}
	result.version = fileVer.FileVersion
	if (fileVer.FileDescription.match(/\(KIRIKIRI\) 2/i) || fileVer.ProductName.match(/\(KIRIKIRI\) 2/i)) {
		result.engineType = "krkr2"
	} else if (fileVer.FileDescription.match(/\(KIRIKIRI\) Z/i) || fileVer.ProductName.match(/\(KIRIKIRI\) Z/i)) {
		result.engineType = "krkrz"
	}

	if (fileVer.OS.includes("NT Win32")) {
		result.engineOS = "win64"
	} else {
		result.engineOS = "win32"
	}

	ui.log("KiriKiri Type:", result);
	return result;
}


this.utils.applyTranslation = async function(sourceDir, targetDir, transData, options) {
	transData ||= trans.getSaveData();
	options ||= {}

	ui.log("Injecting translation to Kirikiri game with options", options);
	ui.log("Source material:", sourceDir);
	ui.log("Target dir:", targetDir);

	ui.log("Checking dependency");
	if (common.versionToFloat(addonLoader.getAddon("aec")?.package?.version) < 200000) {
		await ui.logError("AEC ver 0.2+ is needed. Please install from add-on manager!");
		return 
	}

	console.log("apply arguments", arguments);

	await common.mkDir(targetDir);
	
	ui.log("Detecting the game executable:");
	const gameExe = await this.determineGameExe(transData);
	const targetGameExe = nwPath.join(targetDir, nwPath.basename(gameExe))

	ui.log(gameExe);

	const krkrType = await this.getKiriKiriType(gameExe, transData);

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

	const repackOption = options.custom?.repackOption || "";
	if (repackOption) {
		await this.repackTranslationArchive(targetDir, transData, options, repackOption);
		return;
	}

	if (options.custom?.buildOption == "packed") {
		// pack the content
	
	} else if (options.custom?.buildOption == "unpackEssential") {
		ui.log("Build mode: Unpack essential");
		if (await common.isFileAsync(targetGameExe)) {
			await this.extractEssential(targetGameExe, transData);
		}
		ui.log("Data extraction done!");
		await this.copyKirikiriBin(krkrType.engineType, targetDir, krkrType.engineOS)
	} else {
		ui.log("Making playable plain data");
		if (await common.isFileAsync(targetGameExe)) {
			await this.extractAllXP3Playable(targetGameExe);
		}
		ui.log("Data extraction done!");
		await this.copyKirikiriBin(krkrType.engineType, targetDir, krkrType.engineOS)
	}


	await this.exportToFolder(undefined, targetDir, transData, options);

}

var repackToXP3 = async function(from, to, options) {
	options ||= {};
	const addFolderStructure = options.addFolderStructure ?? thisAddon.options.addFolderStructure;
	const prioritizeLooseScenario = options.prioritizeLooseScenario ?? thisAddon.options.prioritizeLooseScenario;
	console.log("Repacking into xp3", arguments);
	console.log("process folder sctructure:", addFolderStructure);
	console.log("prioritize loose scenario:", prioritizeLooseScenario);
	var isPatched;
	if (addFolderStructure || prioritizeLooseScenario) {
		let newFrom = nwPath.join(from, "\\");
		var targetName = nwPath.basename(to);
		var dirStructure = await bCopy.walk(newFrom);
		var directory = {}
		var xp3Files = []
		var configFile = "";
		var confLines=[];
		for (var i in dirStructure) {
			directory[nwPath.dirname(dirStructure[i])] = true;
			if (nwPath.basename(dirStructure[i]).toLowerCase() == "config.tjs") configFile = dirStructure[i];
			if (nwPath.extname(dirStructure[i]).toLowerCase() == ".xp3") {
				xp3Files.push(dirStructure[i]);
			}
		}
		if (configFile) {
			if (addFolderStructure) {
				for (var dir in directory) {
					var relPath = dir.substr(newFrom.length);
					if (!relPath) continue;
					relPath = nwPath.join(relPath, "\\");
					relPath = relPath.replaceAll("\\", "/");
					confLines.push(`Storages.addAutoPath(System.exePath + "${targetName}>${relPath}");`);
				}
				for (let i in xp3Files) {
					let relPath = xp3Files[i].substr(newFrom.length);
					if (!relPath) continue;
					relPath = nwPath.join(relPath, "\\");
					relPath = relPath.replaceAll("\\", "/");
					confLines.push(`Storages.addAutoPath(System.exePath + "${targetName}>${relPath}");`);
				}
			}
			if (prioritizeLooseScenario) {
				confLines.push('Storages.addAutoPath("scenario/"); // Re-register loose scenario files after archive paths.');
			}
			console.log(confLines.join("\n"))
			console.log(`copying  ${configFile}, ${configFile}.bak_`);
			await bCopy(configFile, configFile+".bak_", {overwrite:true});
			var newPath = nwPath.join(newFrom, nwPath.basename(configFile))
			if (configFile !== newPath) fs.renameSync(configFile, newPath);
			var config = await common.fileGetContents(newPath);
			config = confLines.join("\n")+"\n\n"+config.toString();
			await common.filePutContents(newPath, config);
			isPatched = true;
		}

	}


	var packer = nwPath.join(__dirname, "www/addons/kagParser/bin/KirikiriTools/Xp3Pack.exe")
	var expectedResult = from + ".xp3";
	if (await common.isFileAsync(expectedResult)) {
		await common.rename(expectedResult, expectedResult+".bak_");
		var origFileExist = true;
	}
	await common.aSpawn(packer, [from], {});

	if (expectedResult !== to) {
		let backupTarget;
		if (await common.isFileAsync(to)) {
			backupTarget = to+".bak_";
			if (await common.isFileAsync(backupTarget)) await common.unlink(backupTarget);
			await common.rename(to, backupTarget);
		}

		try {
			await common.rename(expectedResult, to);
			if (backupTarget && await common.isFileAsync(backupTarget)) await common.unlink(backupTarget);
		} catch (err) {
			if (backupTarget && await common.isFileAsync(backupTarget)) {
				await common.rename(backupTarget, to);
			}
			throw err;
		}

		if (origFileExist) {
			await common.rename(expectedResult+".bak_", expectedResult);
		}
	}


	if (isPatched)  {
		console.log("Restoring config");
		fs.renameSync(configFile+".bak_", configFile);
		fs.unlinkSync(newPath);
	}

}

var patchArchivePathsInDataXp3 = async function(dataXp3, archiveName, archiveRoot, extractDir, tempArchiveDir) {
	const aec = addonLoader.getAddon("aec");
	if (!aec) throw new Error("AEC addon not found");
	if (!await common.isFileAsync(dataXp3)) throw new Error("data.xp3 is not found in target directory");

	await common.rmdir(extractDir);
	await common.rmdir(tempArchiveDir);
	await common.mkDir(extractDir);
	await aec.extractFile(dataXp3, extractDir);

	let configFile = "";
	const directory = {};
	for (let file of await bCopy.walk(archiveRoot)) {
		directory[nwPath.dirname(file)] = true;
	}
	for (let file of await bCopy.walk(extractDir)) {
		if (nwPath.basename(file).toLowerCase() !== "config.tjs") continue;
		configFile = file;
		break;
	}
	if (!configFile) throw new Error("Config.tjs is required in data.xp3 to register patch archive paths");

	let confLines = [];
	for (let dir in directory) {
		let relPath = nwPath.relative(archiveRoot, dir);
		if (!relPath) continue;
		relPath = nwPath.join(relPath, "\\");
		relPath = relPath.replaceAll("\\", "/");
		confLines.push(`Storages.addAutoPath(System.exePath + "${archiveName}>${relPath}");`);
	}
	confLines = [...new Set(confLines)];
	if (!confLines.length) return;

	let config = await common.fileGetContents(configFile);
	config = config.toString();
	const missingLines = confLines.filter((line) => !config.includes(line));
	if (!missingLines.length) return;

	await common.mkDir(tempArchiveDir);
	await bCopy(extractDir, tempArchiveDir, {overwrite:true});
	const patchedConfigFile = nwPath.join(tempArchiveDir, nwPath.relative(extractDir, configFile));
	await common.filePutContents(patchedConfigFile, `${missingLines.join("\n")}\n\n${config}`);
	await repackToXP3(tempArchiveDir, dataXp3, {
		addFolderStructure: false,
		prioritizeLooseScenario: false,
	});
}
//thisAddon.repackToXP3 = repackToXP3;
this.utils.repackToXP3 = repackToXP3;

this.utils.repackTranslationArchive = async function(targetDir, transData, options, repackOption) {
	const aec = addonLoader.getAddon("aec");
	if (!aec) throw new Error("AEC addon not found");

	const dataXp3 = nwPath.join(targetDir, "data.xp3");
	const repackTarget = nwPath.join(targetDir, repackOption);
	const repackDir = nwPath.join(targetDir, "_tpp_repack_xp3");
	const translatedDir = nwPath.join(targetDir, "_tpp_repack_xp3_translated");
	const extractDir = nwPath.join(targetDir, "_tpp_repack_xp3_extract");
	const dataPatchDir = nwPath.join(targetDir, "_tpp_repack_xp3_data_patch");

	await common.rmdir(repackDir);
	await common.rmdir(translatedDir);
	await common.rmdir(extractDir);
	await common.rmdir(dataPatchDir);
	await common.mkDir(repackDir);

	const repackIntoData = repackOption.toLowerCase() == "data.xp3";
	const repackIntoPatch = repackOption.toLowerCase() == "patch9.xp3";
	if (!repackIntoData && !repackIntoPatch) {
		throw new Error(`Unknown repack option: ${repackOption}`);
	}

	try {
		if (repackIntoData) {
			if (!await common.isFileAsync(dataXp3)) throw new Error("data.xp3 is not found in target directory");
			await aec.extractFile(dataXp3, repackDir);
			await common.mkDir(translatedDir);
			await this.exportToFolder(undefined, translatedDir, transData, options);
			const translatedOverlayRoot = await common.isDir(nwPath.join(translatedDir, "data"))
				? nwPath.join(translatedDir, "data")
				: translatedDir;
			await bCopy(translatedOverlayRoot, repackDir, {overwrite:true});
			await repackToXP3(repackDir, repackTarget, {
				addFolderStructure: false,
				prioritizeLooseScenario: false,
			});
			return true;
		}

		await this.exportToFolder(undefined, repackDir, transData, options);
		const patchArchiveRoot = await common.isDir(nwPath.join(repackDir, "data"))
			? nwPath.join(repackDir, "data")
			: repackDir;

		await patchArchivePathsInDataXp3(dataXp3, repackOption, patchArchiveRoot, extractDir, dataPatchDir);

		for (let file of await bCopy.walk(patchArchiveRoot)) {
			if (nwPath.basename(file).toLowerCase() !== "config.tjs") continue;
			await common.unlink(file);
		}

		await repackToXP3(patchArchiveRoot, repackTarget, {
			addFolderStructure: false,
			prioritizeLooseScenario: false,
		});
		return true;
	} finally {
		await common.rmdir(repackDir);
		await common.rmdir(translatedDir);
		await common.rmdir(extractDir);
		await common.rmdir(dataPatchDir);
	}
}



var repackToXP3Dialog = function(from, to, options) {
	from = from || "";
	to = to || "";
	var $popup = $("#kag_repack");
	if ($popup.length == 0) {
		var dvField = new DVField();
		$popup = $("<div id='kag_repack'></div>");
		var $content = ($(`<div class="dialogSectionBlock">
			<h2 data-tran="">${t('Select directory')}</h2>
			<div data-tran="">
				${t('Select a directory to repack')}
			</div>
			<label>
				<input type="dvSelectPath" class="fromPath form-control" nwdirectory value="${from}" />
			</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">Field can not be empty!</div>
		</div>
		<div class="dialogSectionBlock">
			<h2 data-tran="">${t('Target xp3')}</h2>
			<div data-tran="">
			${t('Select filename. Special filename such as <b>patch.xp3</b>, <b>patch2.xp3</b>...etc get priority over data.xp3 when loaded.')}
			</div>
			<label>
				<input type="dvSelectPath" class="toPath form-control" nwsaveas="data.xp3" accept=".xp3" value="${to}" />
			</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">Field can not be empty!</div>
		</div>
		<div class="dialogSectionBlock">
			<label class="flex fullWidth">
				<div class="flexMain">
					<div class="label">${t('Patch to allow folder structure')}</div>
					<div class="info" data-tran="">${t('By default KAG engine do not read files inside a folder within xp3 files. This option will automatically add folder structure definition to Config.tjs. Has no effect if no Config.tjs file is found.')}</div>
				</div>
				<div>
					<input type="checkbox" class="flipSwitch addFolderStructure" data-fld="addFolderStructure" value="1" data-default="False"> 
				</div>
			</label>
		</div>
		<div class="dialogSectionBlock">
			<label class="flex fullWidth">
				<div class="flexMain">
					<div class="label">${t('Prioritize loose scenario folder')}</div>
					<div class="info" data-tran="">${t('Patch Config.tjs so loose files in data\\scenario override scripts inside the repacked archive. This is enabled by default because some KAG games otherwise keep reading scenario text from data.xp3.')}</div>
				</div>
				<div>
					<input type="checkbox" class="flipSwitch prioritizeLooseScenario" data-fld="prioritizeLooseScenario" value="1" data-default="True"> 
				</div>
			</label>
		</div>		
		`));

		$content.find(".addFolderStructure").prop("checked", thisAddon.options.addFolderStructure);
		$content.find(".addFolderStructure").on("change", function() {
			thisAddon.options.addFolderStructure = $(this).prop("checked")
		})
		$content.find(".prioritizeLooseScenario").prop("checked", thisAddon.options.prioritizeLooseScenario);
		$content.find(".prioritizeLooseScenario").on("change", function() {
			thisAddon.options.prioritizeLooseScenario = $(this).prop("checked")
		})

		$content.find(".fromPath").on("change", function() {
			var thisVal = $(this).val();
			if (Boolean(thisVal) == false) return;
			var $toPath = $(this).closest(".ui-dialog-content").find(".toPath");
			$toPath.attr("nwsaveas", nwPath.basename(thisVal)+".xp3");
		})
		console.log("rendering ", $popup);
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));

		$popup.empty();
		$popup.append($content);
	}
	$popup.dialog({
		title: t("Repack into xp3"),
		autoOpen: false,
		modal:true,
		width:640,
		height:400,
		minWidth:640,
		minHeight:320,
		show: {
			effect: "fade",
			duration: 200
		},
		hide: {
			effect: "fade",
			duration: 200
		},
		buttons:[
			{
				text: t("Close"),
				icon: "ui-icon-close",
				click: function() {
					$(this).dialog( "close" );
				}
			},
			{
				text: t("Process"),
				click: async function() {
					var $this = $(this)

					
					var from = $this.find(".fromPath").val();
					var to = $this.find(".toPath").val();

				
					$this.dialog( "close" );
					ui.showBusyOverlay();
					await repackToXP3(from, to);
					ui.hideBusyOverlay();
				}
			}

		]
	});	
	$popup.dialog("open");
}
this.utils.repackToXP3Dialog = repackToXP3Dialog;


this.utils.unpackXP3Dialog = async function(from, to, options) {
	const value = await ui.form({jsonForm: 
        {
            schema: {
                sourceFiles: {
					type: "string",
					title: "Source files",
					description: "Select the xp3 files to unpack"
						+"<br>"+t("<b>Order does matter</b> if you unpack multiple files at once! The files will be unpacked in ordered manner. If the files exist it will be overwritten."),
                },
                targetDir: {
					type: "string",
					title: "Target directory",
					description: "Select the target directory to store the unpacked files",
                },
            },
            form: [
                {
                    key: "sourceFiles",
					type: "selectfile",
					multiple: true,
					accept: ".xp3,.exe",
                },
                {
                    key: "targetDir",
					type: "selectdir",
				},
                
            ]
        }
    },
    {
        title: t(`Unpack XP3 files`),
    });

	if (!value) return;
	console.log("value", value);
	if (!value.sourceFiles || !value.targetDir) return alert("Please select the source files and target directory");
	ui.log.show();
	ui.log.progress(100, "Unpacking XP3 files");
	await this.extractXP3Files(value.sourceFiles, value.targetDir);
	ui.log("Done!");
	ui.log.end();
}

function init() {
	// tool menu
	ui.mainMenu.addChild("tools", {
		id: "kag",
		label: "KAG"
	});

	let $newTransMenu = ui.mainMenu.addChild("kag", {
		label: t("Repack a folder to xp3")
	});

	$newTransMenu.on("select", function() {
		repackToXP3Dialog();
	});

	$newTransMenu = ui.mainMenu.addChild("kag", {
		label: t("Unpack xp3 file")
	});

	$newTransMenu.on("select", function() {
		thisAddon.utils.unpackXP3Dialog();
	})

	


	// console.log("%cINITIALIZING KAG Parser", "background:yellow; font-weight:bold;");
	// var $slide = $(`
	// 	<h1><i class="icon-plus-circled"></i>Kirikiri Adventure Game</h1>
	// 	<div class="blockBox infoBlock withIcon">
	// 		<h2>KAG Parser Ver.`+thisAddon.package.version+`</h2>
	// 		<p>${t("Before you create a new project, please make sure that :")}
	// 			<ol>
	// 				<li>${t("All the xp3 files has been extracted")}</li>
	// 				<li>${t("All .ks & .tjs files are in plain text (uncompiled, unscrambled, and unencrypted)")}</li>
	// 				<li>${t("KAG Games should be playable even without being repacked. So you should check whether your game is playable or not after being extracted.")}</li>
	// 				<li>${t("Some of the actions will modify your game. <b>So make sure to create a backup of your game!</b>")}</li>
	// 			</ol>
	// 		</p>
	// 	</div>
	// 	<div class="dialogSectionBlock">
	// 		<h2>${t("Literal tags")}</h2>
	// 		<div>${t("Literal tags are the tags that will be escaped into Translator++ editor.")}</div>
	// 		<div>${t("List out the literal tags here, separate each tags with a white space.")}</div>
	// 		<div><b>ruby l r</b> ${t("are mandatory.")}</div>
	// 		<div>${t("<b>[r]</b> Tags will be interpolated by Translator++ into a new line. So you don't need to write <b>[r]</b> explicitly.")}</div>
	// 		<textarea class="kagParser_literalTags fullWidth" ></textarea>
	// 	</div>
	// 	<div class="dialogSectionBlock">
	// 		<label class="flex fullWidth">
	// 			<div class="flexMain">
	// 				<div class="label" data-tran="">${t("Try to extract XP3 files")}</div>
	// 				<div class="info" data-tran="">${t("Translator++ can extract XP3 files with AEC addon. <b>But the extractor is not a surefire solution for all kind XP3</b>.")}</div>
	// 			</div>			
	// 			<div>
	// 				<input type="checkbox" class="flipSwitch extractXP3" name="extractXP3" data-fld="extractXP3" value="1" checked /> 
	// 			</div>
	// 		</label>
	// 	</div>
	// 	<div class="dialogSectionBlock">
	// 		<label class="flex fullWidth">
	// 			<div class="flexMain">
	// 				<div class="label" data-tran="">${t("Try to decrypt the encrypted ks/tjs files")}</div>
	// 				<div class="info" data-tran="">${t("Some scenario files are encrypted. Check this option if you wish Translator++ to try to decrypt them.")}
	// 				${t("This may not work on some projects.")}</div>
	// 			</div>
	// 			<div>
	// 				<input type="checkbox" class="flipSwitch decryptFiles" name="decryptFiles" data-fld="decryptFiles" value="1" /> 
	// 			</div>
	// 		</label>
	// 	</div>
	// 	<div class="dialogSectionBlock">
	// 		<h2>${t("Preferred encodings")}</h2>
	// 		<div class="info" data-tran="">${t("List of the possible character encodings. <b>Order does matter!</b>. Separate each value with a comma.")}</div>
	// 		<label>
	// 			<input type="text" class="fullWidth readEncoding" name="readEncoding" data-fld="readEncoding" value="shift-jis, utf-16, utf-16le" /> 
	// 		</label>
	// 	</div>
	// 	<div class="fieldgroup">
	// 		<div class="actionButtons">
	// 		</div>
	// 	</div>`);
	// 	$slide.find('.kagParser_literalTags').val(defaultLiteralTags.join(" "));
		
		
		
	// var $button = $('<button class="btnSelectExe selectRPGExe"><i class="icon-doc-inv"></i>Select executable file from your the game</button>')
	// $button.on('click', function() {
	
	// 	ui.openFileDialog({
	// 		accept:".exe",
	// 		onSelect : async function(selectedFile) {				
	// 			ui.showLoading();
	// 			// processing literal tags 
	// 			if (!ESScript) { 
	// 				await ui.logError("ESScript not found. Please install/enable ESParser add-on!")
	// 			}
	// 			var tagStr = $("#dialogNewProject .kagParser_literalTags").val();
	// 			tagStr = tagStr.replace(/s+/g, " ")
	// 			var tagArr = tagStr.split(" ");
	// 			var literalTags = [];
	// 			for (var i=0; i<tagArr.length; i++) {
	// 				tagArr[i] = tagArr[i].trim();
	// 				if (!tagArr[i]) continue;
	// 				literalTags.push(tagArr[i]);
	// 			}
	// 			console.log("-----------------------------");
	// 			console.log("literalTags", literalTags);				
				
				
	// 			ui.loadingProgress("Processing", "Processing : "+selectedFile, {consoleOnly:true, mode:'consoleOutput'});
	// 			ui.loadingProgress("Processing", "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});
	// 			ui.newProjectDialog.close()

	// 			let readEncoding = $slide.find(".readEncoding").val().replaceAll(" ", "").split(",");

	// 			new Promise((resolve, reject) => {
	// 				return createProject(selectedFile, {
	// 					literalTags : literalTags,
	// 					extractXP3 : $slide.find(".extractXP3").prop("checked"),
	// 					decryptFiles : $slide.find(".decryptFiles").prop("checked"),
	// 					readEncoding: readEncoding
	// 				})

	// 			}).then(function() {
	// 				ui.loadingProgress("Processing", "Parsing .ks files...", {consoleOnly:true, mode:'consoleOutput'});
					
	// 			})
	// 		}
	// 	})		
	// });

	// $slide.find(".actionButtons").append($button);
	const $slide = $(`<div>
			<h1><i class="icon-plus-circled"></i>Kirikiri Adventure Game</h1>
			<div class="blockBox infoBlock withIcon">
				<h2>KAG Parser Ver.`+thisAddon.package.version+`</h2>
				<p>${t("Before you create a new project, please make sure that :")}
					<ol>
						<li>${t("All .ks & .tjs files are in plain text (uncompiled, unscrambled, and unencrypted)")}</li>
						<li>${t("KAG Games should be playable even without being repacked. So you should check whether your game is playable or not after being extracted.")}</li>
						<li>${t("Some of the actions will modify your game. <b>So make sure to create a backup of your game!</b>")}</li>
					</ol>
				</p>
			</div>
			<div class="${thisAddon.package.name}CustomField"></div>
		</div>`);
	var customField;

	ui.newProjectDialog.addMenu({
		icon 			: "addons/kagParser/icon.png",
		descriptionBar 	: `<h2>Kirikiri Adventure Game</h2>
						<p>Start translation from KAG Games</p>`,
		actionBar		: "",
		goToSlide		: "kag",
		at				:3,
		slides : {
			kag: ui.newProjectDialog.newSlide("kag", $slide, {
                onActive: ()=> {
					customField = new CustomFields($("<form></form>"), {jsonForm: 
                        {
							schema:{
								entryPoint: {
									type: "string",
									title: "Game executable",
									description: t("Select the game executable file. This file is the main game file that will be used to extract the game data."),
									required: true
								},
								extractXP3: {
									type: "boolean",
									default: true,
									title: "XP3 files",
									description: t("Translator++ can extract XP3 files with AEC addon. <b>But the extractor is not a surefire solution for all kind XP3</b>."),
								},
								decryptFiles: {
									type: "boolean",
									title: "Decrypt encrypted files",
									description: t("Some scenario files are encrypted. Check this option if you wish Translator++ to try to decrypt them.")+"<br />"+t("This may not work on some projects."),
								},
								readEncoding: {
									type: "json",
									title: "Preferred encodings",
									description: t("List of the possible character encodings. <b>Order does matter!</b>. You can drag to sort the list."),
									default: ["shift-jis", "utf-16", "utf-16le", "utf8"]
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
									accept: ".exe",
								},
								{
									key: "extractXP3",
									inlinetitle: "Extract XP3 files",
								},
								{
									key: "decryptFiles",
									inlinetitle: "Decrypt encrypted files",
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
											+t('However, Translator++ cannot handle custom tags created by developers.')
											+t('Therefore, you may need to define the tags and attributes that need to be translated and those that need to be marked as actor names.')
											+"<br />"
											+t('You might need to <input type="button" value="extract your xp3 game" onclick="addonLoader.addons.kagParser.utils.unpackXP3Dialog()" /> and analyze the ks script inside it before starting the project.')
											
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
                    // $slide.find(`input[name=filepath]`).closest("fieldset").addClass("hidden")
                    // $slide.find(`input[name=dirpath]`).closest("fieldset").addClass("hidden")

                },
				buttons: [
					{
						text: t("Create Project"),
						click: async function() {
                            if (!customField) return alert("Error: customField is not defined. This should not happen!");
							const values = customField.getFormValues();
                            console.log("values", values);

							if (!values.entryPoint) return alert("Please select the game executable file!");
							
							// check if any of the tagName is empty
							if (values.captureTags?.length) {
								if (values.captureTags.length == 1) {
									// unset values.captureTags if attr and tagName is empty
									if (!values.captureTags[0].tagName && !values.captureTags[0].attr) {
										delete values.capture;
									} else if (!values.captureTags[0].tagName) {
										return alert(`Tag name is empty at index 0!`);
									}
								} else {
									for (let i in values.captureTags) {
										if (!values.captureTags[i].tagName) return alert(`Tag name at index ${i} is empty!`);
									}
								}
							}

							ui.log.show();
							// processing literal tags 
							if (!ESScript) { 
								await ui.log.error("ESScript not found. Please install/enable ESParser add-on!")
							}
							
							ui.loadingProgress("Processing", "Processing : "+values.entryPoint, {consoleOnly:true, mode:'consoleOutput'});
							ui.loadingProgress("Processing", "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});
							ui.newProjectDialog.close()

							await thisAddon.prepareNewProject(values);


						}
					}
				],
			})
		}
	})

	// register handler
	if (typeof window.engines.kag == 'undefined') engines.add('kag');
	engines.kag.addProperty('exportHandler', async function(targetPath, options) {
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		
		ui.showLoading();
		await ui.log("Exporting KAG(like) project into ", targetPath);
		await ui.log("Options:", options);
		
		ui.loadingProgress("Processing", "Parsing KAG games from "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		try {
			var pathStat = fs.lstatSync(targetPath)
			
			if (pathStat.isDirectory()) {
				
				await exportToFolder(path.join(trans.project.cache.cachePath, "game"), targetPath, trans.getSaveData(), options)
				ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
				ui.loadingEnd();


				return true;
			}
		} catch (e) {
			// do nothing
		}
		
		
		// is file
		var tmpPath = path.join(nw.process.env.TMP, trans.project.projectId);
		fse.removeSync(tmpPath); 
		await common.mkDir(tmpPath)
		
		await exportToFolder(path.join(trans.project.cache.cachePath, "game"), tmpPath, trans.getSaveData(), options);
		var _7z = require('7zip-min');
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+"/*"], err => {
			// done
			console.log("process done");
			ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
			ui.loadingEnd();				
		});
		
		return true;
	});
	
	engines.kag.addProperty('injectHandler', async function(targetDir, sourceMaterial, options) {
		console.log("Path is : ", targetDir);
		console.log("options are : ", options);
		console.log(arguments);
		ui.showLoading();

        if (await common.isFileAsync(sourceMaterial)) {
            sourceMaterial = nwPath.dirname(sourceMaterial);
			if (nwPath.basename(sourceMaterial).toLowerCase() == ".exe") {
				ui.log("Entry point updated to :", sourceMaterial);
				trans.project.entryPoint = sourceMaterial;
			}
        }
        trans.project.loc = sourceMaterial;

        // const bCopy = require("better-copy")
		// if (["copyNothing"].includes(options.copyOptions) == false) {
		// 	await ui.log(`Copy ${sourceMaterial} to ${targetDir}`);
		// 	var overWrite = true;
		// 	if (options.copyOptions == "copyIfNotExist") overWrite = false;
		// 	await ui.log("Overwrite option: "+overWrite.toString());
		// 	await bCopy(sourceMaterial, targetDir, {
		// 		onBeforeCopy: async (from, to) => {
		// 			await ui.log(`Start copying ${from}`);
		// 		},
		// 		onAfterCopy: async (from, to) => {
		// 			await ui.log(`Successfully copied into ${to}`);
		// 		},
		// 		overwrite: overWrite
		// 	});
		// }

		// convert sourceMaterial to folder if path is file
		var sourceStat = fs.lstatSync(sourceMaterial)
		if (sourceStat.isFile()) sourceMaterial = path.dirname(sourceMaterial);
		
		ui.loadingProgress("Processing", "Parsing data. The window may sometimes unresponsive. That's normal!", {consoleOnly:false, mode:'consoleOutput'});
		
		options ||= {};
		options.injectMode 	= "kirikiri"
		
		await thisAddon.utils.applyTranslation(sourceMaterial, targetDir, trans.getSaveData(), options);
		
		ui.loadingEnd("Done!");
		return true;
	});

	engines.kag.addProperty('onOpenInjectDialog', function($dialogInject, options) {
		console.log(arguments);
		$dialogInject.find(".copyOptionsBlock").removeClass("hidden");

		// var $options = $dialogInject.find(".options");
		// var $writeEncoding = $options.find(".field_writeEncoding");
		// if ($writeEncoding.length == 0) {
		// 	$writeEncoding = $(`
		// 		<h2>KAG Options</h2>
		// 		<div class="dialogSectionBlock field_writeEncoding">
		// 			<h2 data-tran="">${t('Character Encoding')}</h2>
		// 			<div class="info">${t('Most Japanese KAG games are written with SHIFT-JIS, but KAG actually has support for UTF16LE which can be read on all windows regardless of locale setting. Many translators change the character encoding to UTF16LE so that the game can be played on non-Japanese windows.<br />By default Translator++ will write to its original character encoding.')}
		// 			</div>
		// 			<div class="">
		// 				<select class="writeEncoding">
		// 					<option value="">Use original</option>
		// 					<option value="UTF-16LE">UTF-16LE</option>
		// 					<option value="SHIFT_JIS">SHIFT_JIS</option>
		// 				</select>
		// 			</div>
		// 		</div>
		// 		<div class="dialogSectionBlock field_buildOption">
		// 			<h2 data-tran="">${t('Build option')}</h2>
		// 			<div class="info">${t('There are several ways to produce playable localized game for KAG. Please select one that suit your preference.')}
		// 			</div>
		// 			<div class="">
		// 				<select class="buildOption">
		// 					<option value="">${t('Use recommended')}</option>
		// 					<option value="unpacked">Unpacked distribution</option>
		// 					<option value="packed">Packed with XP3 archive</option>
		// 				</select>
		// 			</div>
		// 		</div>
		// 	`);
		// 	$options.append($writeEncoding);
		// }

		// var $writeEncodingFld = $writeEncoding.find(".writeEncoding")
		// $writeEncodingFld.val(thisAddon.config.importEncoding);
		// $writeEncodingFld.on("change", function() {
		// 	thisAddon.config.importEncoding = $(this).val();
		// })

		
	});	

	engines.addHandler(["kag"], 'updateProjectHandler', async function() {
		await thisAddon.updateProject();
		return common.halt();
	});

	engines.addHandler(["kag"], "onLoadTrans", 
	() => {
		if (addonLoader.addons.tyranoTrans) require("www/addons/tyranoTrans/Prism.tyrano.js");

		ui.ribbonMenu.add("KAG", {
			title : trans.gameEngine.toUpperCase(),
			toolbar : {
				buttons : {
					/*
					play : {
						icon : "icon-play",
						title : t("Play last build"),
						onClick : async () => {
							if (await common.isDirectory(trans.project.devPath) == false) {
								return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."));
							}
							playGame(trans.project.devPath);
						}
					},
					*/
					openEditor : {
						icon : "icon-box",
						title : t("Pack a folder into xp3"),
						onClick : async () => {
							repackToXP3Dialog();
						}
					},
					
				}
			}
		})		
	})	

	engines.addHandler(["kag"], 'onLoadSnippet', async function(selectedCell) {
		console.log("KAG onLoadSnippet handler");
		console.log("selected cell:", selectedCell);
		var obj = trans.getSelectedObject();

		if (obj.extension.toLowerCase() == ".tjs") this.commonHandleFile(selectedCell, "js");
		if (obj.extension.toLowerCase() == ".ks") this.commonHandleFile(selectedCell, "ks");

	});

	engines.kag.addProperty("stagingDataPath", "game");

	engines.kag.addProperty("exportOptionFields", ()=> {
		return {
			jsonForm: {
				"schema": {
					"readEncoding": {
						"title": "Read Character encoding",
						"description": "List of the possible character encodings. <b>Order does matter!</b>. Separate each value with a comma.<br />Translator++ will read the original file with the following encodings, patch the files and write with the <b>Write Character encoding</b> option. Leave blank to use the original character encoding when the project is created. KAG games generally accepts shift-jis, utf-16, utf-16le<br />Unless this field is filled, Translator++ will use the read encoding used when creating the project.",
						"type": "string",
						"default" :  ""
					},
					"writeEncoding": {
						"title": "Write Character encoding",
						"description": t('Select the target character encoding.<br />Most Japanese KAG games are written with SHIFT-JIS, but KAG actually has support for UTF16LE unicode. Many translators set the character encoding to UTF16LE so that the game is playable non-Japanese windows without locale emulator. And most importantly, can displays characters outside SHIFT-JIS such as "café".<br />By default Translator++ will write to its original character encoding.'),
						"type": "string",
						"default" :  "",
						"enum" :  [
							"",
							"UTF-16LE",
							"SHIFT-JIS",
						]					
					},
				},
				"form": [
					{type: "msg", "msg": "<h2>Misc Options</h2>"},
					"*",
				]
			}
		}
	})

	engines.kag.addProperty("injectOptionFields", ()=> {
		return {
			jsonForm: {
				"schema": {
					"readEncoding": {
						"title": "Read Character encoding",
						"description": "List of the possible character encodings. <b>Order does matter!</b>. Separate each value with a comma.<br />Translator++ will read the original file with the following encodings, patch the files and write with the <b>Write Character encoding</b> option. Leave blank to use the original character encoding when the project is created. KAG games generally accepts shift-jis, utf-16, utf-16le.",
						"type": "string",
						"default" :  ""
					},
					"writeEncoding": {
						"title": "Write Character encoding",
						"description": t('Select the target character encoding.<br />Most Japanese KAG games are written with SHIFT-JIS, but KAG actually has support for UTF16LE unicode. Many translators set the character encoding to UTF16LE so that the game is playable non-Japanese windows without locale emulator. And most importantly, can displays characters outside SHIFT-JIS such as "café".<br />By default Translator++ will write to its original character encoding.'),
						"type": "string",
						"default" :  "",
						"enum" :  [
							"",
							"UTF-16LE",
							"SHIFT-JIS",
						]					
					},
					"buildOption": {
						"title": "Build option",
						"description": t('There are several ways to produce playable localized game for KAG. Please select one that suit your preference.'),
						"type": "string",
						"enum" :  [
							"",
							"unpacked",
							"unpackEssential",
						]
					},
					"repackOption": {
						"title": "Repack Option",
						"description": t('Repack the translated scripts into an archive instead of relying on loose files next to an existing data.xp3. The default is to rebuild data.xp3 because that works across most KAG titles.'),
						"type": "string",
						"default": "data.xp3",
						"enum": [
							"",
							"data.xp3",
							"patch9.xp3"
						]
					},
				},
				"form": [
					{type: "help", "helpvalue": "<h2>Misc Options</h2>"},
					"readEncoding",
					"writeEncoding",
					{
						key:"repackOption",
						titleMap: {
							"": t("Do not repack translation"),
							"data.xp3": t("Repack translation into data.xp3"),
							"patch9.xp3": t("Repack translation into patch9.xp3"),
						}
					},
					{
						key:"buildOption",
						titleMap: {
							"": t("Use default"),
							"unpacked": t("Unpack all archive (produce development state)"),
							"unpackEssential": t("Unpack essential archive only"),
						}
					},
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