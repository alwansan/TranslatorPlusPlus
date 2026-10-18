var thisAddon	= this;
var path 		= require('path');
var fs 			= fs || require('fs');
var fse 		= require('fs-extra')
var bCopy 		= require('better-copy');
var ini 		= require('ini');
var iconv 		= require('iconv-lite');
const pLimit	= require("p-limit");
var spawn 		= spawn||require("child_process").spawn;
const Rm2kUtils = require(path.join(thisAddon.getRelativePath(), "Rm2kUtils.js"));

thisAddon.optionsForm = {
	"useNative": {
		"type": "boolean",
		"title": t("Use Native RPG Player"),
		"description": t("Use native RPG Player instead of Easy RPG Player"),
		"inlinetitle": t("Use native RPG Player")
	},
	"writeEncoding": {
		"type": "string",
		"title": "Write Encoding",
		"description": "Will force the text encoding into the one selected when writing the scripts. (blank = auto)<br />It's better to leave this field blank and use post processor converter instead.",
		"preventAutoCamelCase" : true,
		"enum": [ "", 
		"utf8", 
		"utf16le",
		"UTF-16", 
		"UTF-16BE",					
		"ascii", 
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
}


var RM2k = function(directory, options) {
	options = options || {}
	this.options 			= options;
	this.translationPair 	= this.options.translationPair || {}
	this.translationInfo 	= this.options.translationInfo || {};
	this.directory 			= directory;
	this.contextSeparator 	= "/"
	this.isParsed 			= false;
	this.cacheLocation;
	this.iniEncoding 		= this.options.iniEncoding || 'Windows-31j';
	this.writeEncoding 		= this.options.writeEncoding || 'utf-8';
	
}

RM2k.RPGM_EVENT_CODE = Rm2kUtils.RPGM_EVENT_CODE;

RM2k.codeToString = function(code) {
	if (RM2k.RPGM_EVENT_CODE[code]) return RM2k.RPGM_EVENT_CODE[code];
	return code
}

RM2k.prototype.xmlTrans = function(file, options) {
	options 				= options || {};
	options.translationPair = options.translationPair || {}
	options.translationInfo = options.translationInfo || {}
	
	
	return new addonLoader.addons.xmlTrans.XmlTrans(file,
		{
			config: [
				{
					queryString : "event_commands string",
					onBeforeRegisterString : function(text, context, targetElm, configuration, options) {
						var $targetElm = $(targetElm);
						var code = parseInt($targetElm.find("code").text());
						//console.log("this event code is : ", code);
						const codeStr = RM2k.codeToString(code);
						context.push("code", codeStr);

						// adding default tags
						if ([10130, 11110, 10220, 10630, 10640, 10650, 10660, 10670, 10680, 10710, 
							11510,11550, 11560, 11720].includes(code)) {
							options.tags = ["red"]
						} else if ([10140].includes(code)) {
							options.tags = ["blue"]
						}

						// skips notes as it will not affect gameplay in 2k & 2k3 
						if ([12410, 22410].includes(code)) return undefined; 
						if (code == 20110) {
							var previousCommand = $targetElm.prev("event_commands")[0];
							var previousMessage = this.translatableTexts[this.translatableTexts.length - 1];
							if (!previousMessage || !previousMessage.elm.includes(previousCommand)) {
								return text;
							}
							// process 20110 further
							this.appendString("\n"+text, undefined, targetElm);
							return undefined;
						}
						return text;
					},
					getTranslatableElement : function(elm) {
						var $elm = $(elm);
						return $elm.parent()[0]; // return parent instead of self element
					},
					translateElement : function(elm, text, config) {
						console.log("translating element", elm, text);
						var $elm = $(elm)
						var code = $elm.eq(0).find("code").text()
						if (code !== "10110" && code !== "20110") {
							$(elm).find("string").text(text);
							return $(elm)[0];
						}
						
						// split message by line and then generates interpreter object
						var texts = text.split("\n");
						for (let i=0 ; i<texts.length; i++) {
							var $thisElm = $(elm[0]).clone(true, true);
							if (i%4 !== 0)  {
								$thisElm.find('code').text("20110");
							} 
							$thisElm.find('string').text(texts[i]);
							$thisElm.insertBefore($elm.eq(0))
						}
						
						for (let i=0; i<elm.length; i++) {
							$(elm[i]).remove();
						}
						
					}
					
				},
				{
					queryString : "name, description, terms>Terms>*, states message_actor, states message_enemy, states message_already, states message_affected, states message_recovery, skills using_message1,  skills using_message2, actors title",
				}
			],
			onBeforeWrite :function(string) {
				// retain SJIS encoding
				/*
				string = string.replace(/\<string\>(.*?)\<\/string\>/g, function() {
					
					return "<string>"+jEncoding.convert(arguments[1], 'SJIS', 'UTF8')+"</string>";
				})	
				*/
				return string.replace(/<(.*?)\s?\/>/g, '<$1></$1>')
			},
			translationPair : options.translationPair,
			translationInfo : options.translationInfo,
			writeEncoding	: this.writeEncoding,
			writeUseBom		: this.writeUseBom,
			
			
		})
}

// RM2k.prototype.generateData = function(fileObject) {
// 	var result = {
// 		data:[],
// 		context:[],
// 		tags:[],
// 		indexIds:{}
// 	}
// 	if (!fileObject.translatableTexts) return result;
	
// 	for (var i=0; i<fileObject.translatableTexts.length; i++) {
// 		var thisObj = fileObject.translatableTexts[i];
		
// 		if (typeof result.indexIds[thisObj.text] == "undefined") result.indexIds[thisObj.text] = result.data.length;
// 		//result.indexIds[thisObj.text] = result.indexIds[thisObj.text] || result.data.length;
		
// 		var row = result.indexIds[thisObj.text];
// 		result.data[row] 	= result.data[row] || [thisObj.text, ""];
// 		result.context[row] = result.context[row]||[];
	
// 		if (Array.isArray(thisObj.context) == false) thisObj.context = [thisObj.context]
// 		for (var x=0; x<thisObj.context.length; x++) {
// 			result.context[row].push(thisObj.context[x].join(this.contextSeparator))
// 		}

// 		if (Array.isArray(thisObj.tags) && thisObj.tags?.length) result.tags[row] = thisObj.tags;

		
// 	}
	
// 	return result;
	
// }

RM2k.prototype.writeToFolder = async function(targetFolder) {
	//if (this.writeMode == false) return console.warn("Unable to write. Reason : not in write mode!");
	var that = this;
	var promises 		= [];
	var processable 	= [];
	var cacheLocation 	= path.join(nw.process.env.TMP, common.makeid(10))
	
	
	
	for (var relPath in this.files) {
		var thisFile = this.files[relPath]
		
		var targetPath = path.join(cacheLocation, relPath);
		//console.log("creating directory : ", path.dirname(targetPath));
		try {
			fs.mkdirSync(path.dirname(targetPath), {recursive:true});
		} catch(e) {
			console.warn("Unable to create directory ", path.dirname(targetPath));
			throw(e);
		}
		console.log("writing to :", targetPath);
		processable.push(targetPath);
		
		
		if (thisFile.type == "ini") {
			var iniData = thisFile.translatable.translate();
			//fs.writeFileSync(path.join(targetFolder, relPath), ini.stringify(iniData))
			//file, data, encoding, bom
			await common.filePutContents(path.join(targetFolder, relPath), ini.stringify(iniData), that.iniEncoding, false);
		} else {
			promises.push(thisFile.write(targetPath))
		}
	}
	
	await Promise.all(promises)
	
	ui.log(`Converting ${processable.length} data with 4 concurrent process!`);
	let processableParts = common.arrayChunk(processable, 5);
	const queue = [];
	const limit = pLimit(4); // 4 concurrent process;
	for (let i in processableParts) {
		queue.push(limit(async ()=>{
			return new Promise((resolve, reject) => {
				let currentPart = processableParts[i];
				var lcf2xml = spawn(path.join(thisAddon.getLocation(), "bin", "lcf2xml.exe"), currentPart, {cwd: targetFolder})
				lcf2xml.on('exit', function (code) {
					console.log('Child process exited with exit code '+code);
					return resolve();
				});
			})
			
		}));
	}
	
	await Promise.all(queue);
	ui.log("Conversion done!");
	
	
	return processable;
	
	
}

RM2k.prototype.iniToTrans = function(iniData, stringOnly) {
	return TranslatableObject.generate(iniData, stringOnly);
}

RM2k.prototype.toTrans = function() {
	if (!this.isParsed) return console.error('Not parsed, Run .parse() first!');
	var transData = {
		project:{
			gameEngine: "rm2k",
			files:{},
			gameTitle: "",
			parser : addonLoader.addons.xmlTrans.package.name,
			parserVersion : addonLoader.addons.xmlTrans.package.version,
		}
	}
	
	for (var relpath in this.files) {
		// change \ to /
		
		var thisTranslatable = this.files[relpath]
		relpath = relpath.replace(/\\/g, "/")
		var thisData = {};
		var thisGenData;
		if (thisTranslatable.type == "ini") {
			thisTranslatable.data = thisTranslatable.data || {};
			if (Boolean(thisTranslatable.data.RPG_RT) == false) continue;
			transData.project.gameTitle = thisTranslatable.data.RPG_RT.GameTitle;
			thisGenData = this.iniToTrans(thisTranslatable.data);
		} else {
			thisGenData = thisTranslatable.transData;
		}
		
		
		if (!this.showBlank) if (thisGenData.data.length < 1) continue;
		thisData = {};
		thisData.data 		= thisGenData.data
		thisData.context 	= thisGenData.context
		thisData.tags 		= thisGenData.tags
		thisData.filename 	= path.basename(relpath);
		thisData.basename 	= path.basename(relpath);
		thisData.indexIds 	= thisGenData.indexIds
		//thisData.groupLevel 	= thisGenData.groupLevel;	
		thisData.extension 	= path.extname(relpath);
		thisData.originalEncoding = thisTranslatable.detectedEncoding;
		thisData.lineBreak 	= "\n";
		thisData.path 		= relpath // path is relative path from cache dir
		thisData.relPath 		= relpath // relpath is real filename address on context	
		thisData.type 		= null; // no special type
		thisData.originalFormat = "Easy's RM2K/3 XML Data";			
		thisData.dirname 		= path.dirname(relpath);	
		
		transData.project.files[relpath] = thisData;
		
		
		
	}
	this.transData = transData;
	return transData;
	
}

RM2k.prototype.getRelativePath = function(stringPath, fromDir) {
	stringPath = path.normalize(stringPath);
	fromDir = fromDir || this.directory
	return stringPath.substring(fromDir.length, stringPath.length);
}
RM2k.prototype.parseXml = function(filePath, fromDir) {
	console.log("parseXML ", filePath);
	var thisRelPath = this.getRelativePath(filePath, fromDir)
	var relPathF	= thisRelPath.replace(/\\/g, '/')
	var options 	= options || {};
	console.log("relative path : ", thisRelPath);
	this.translationPair[relPathF] = this.translationPair[relPathF]||{};
	options.translationPair = this.translationPair[relPathF].translationPair||{}
	options.translationInfo = this.translationPair[relPathF].translationInfo||{}
	
	this.files[thisRelPath] = this.xmlTrans(filePath, options);
	return this.files[thisRelPath];
}

RM2k.prototype.parse = async function() {
	// parse directory
	this.id = common.makeid(10)
	this.cacheLocation = this.cacheLocation || path.join(nw.process.env.TMP, this.id)
	this.files = {};
	// create temporary folder for data extraction
	fs.mkdirSync(this.cacheLocation, {recursive:true});
	var processableExt = [".emu", ".edb"]
	var processable = [];
	var parseable = [];
	var iniFiles = [];
	ui.log(`Copying file into temp directory:${this.cacheLocation}`);
	await bCopy.walk(this.directory, {
		onFile : (filePath, stats) => {
			if(path.extname(filePath).toLowerCase() == '.lmu') processable.push(filePath)
			if(path.extname(filePath).toLowerCase() == '.ldb') processable.push(filePath)
			if(path.extname(filePath).toLowerCase() == '.ini') iniFiles.push(filePath)
			
			if(processableExt.includes(path.extname(filePath).toLowerCase())) {
				console.log("xml file :", filePath);
				this.parseXml(filePath, this.directory);
			}
		}
	})
	
	if (processable.length) {
		console.log("processing", processable);
		ui.log(`Converting ${processable.length} data to XML with 4 concurrent process...`);
		
		// chunk into maximum of 5 file
		let processableParts = common.arrayChunk(processable, 5);
		const queue = [];
		const limit = pLimit(4); // 4 concurrent process;
		for (let i in processableParts) {
			queue.push(limit(async ()=>{
				return new Promise((resolve, reject) => {
					let currentPart = processableParts[i];
					var lcf2xml = spawn(path.join(thisAddon.getLocation(), "bin", "lcf2xml.exe"), currentPart, {cwd: this.cacheLocation})
					lcf2xml.on('exit', function (code) {
						console.log('Child process exited with exit code '+code);
						return resolve();
					});
				})
				
			}));
		}
		
		await Promise.all(queue);
		ui.log("Conversion done!");
	}
	
	
	
	console.log("processing from cache location ", this.cacheLocation);
	ui.log(`Reading XML in temp directory...`);
	await bCopy.walk(this.cacheLocation, {
		onFile : (filePath, stats) => {
			if(processableExt.includes(path.extname(filePath).toLowerCase() == false)) return;
			this.parseXml(filePath, this.cacheLocation);
			/*
			var thisRelPath = this.getRelativePath(filePath, this.cacheLocation)
			var options = options || {};
			this.translationPair[thisRelPath] = this.translationPair[thisRelPath]||{};
			options.translationPair = this.translationPair[thisRelPath].translationPair||{}
			options.translationInfo = this.translationPair[thisRelPath].translationInfo||{}
			
			this.files[thisRelPath] = this.xmlTrans(filePath, options);
			*/
		}
	})
	ui.log("Reading XML completed!");
	ui.log(`Parsing XML object, this going to take a while...`);
	await common.wait(200);
	for (var i in this.files) {
		parseable.push(this.files[i].parse())
	}
	await Promise.all(parseable);
	ui.log("Parsing XML object completed!");
	
	
	ui.log("Parsing INI file...");
	
	// parse ini file
	for (let i=0; i<iniFiles.length; i++) {
		
		var thisRelPath = this.getRelativePath(iniFiles[i])
		var relPathF	= thisRelPath.replace(/\\/g, '/')
		var options 	= options || {};
		console.log("relative path : ", thisRelPath);
		this.translationPair[relPathF] = this.translationPair[relPathF]||{};
		options.translationPair = this.translationPair[relPathF].translationPair||{}
		options.translationInfo = this.translationPair[relPathF].translationInfo||{}
		
		var thisObj = {};
		thisObj.type = "ini";
		thisObj.data = ini.parse(iconv.decode(fs.readFileSync(iniFiles[i]), this.iniEncoding))
		thisObj.data.RPG_RT 			= thisObj.data.RPG_RT || {};
		thisObj.data.RPG_RT.Encoding 	= thisObj.data.RPG_RT.Encoding || 932
		thisObj.translatable 			= new TranslatableObject(thisObj.data, options);
		this.files[thisRelPath] = thisObj;
	}
	ui.log("Parsing INI file completed!");
	
	
	this.isParsed = true;
	ui.log("Parse procedure is completed!");
	
	return this;
	
}

/**
* Patch the game to support certain character encoding
* EasyRPG caveat: https://wiki.easyrpg.org/user/player/special-features
* UTF8 is 65001 
* @param {String} gameDir 
*/
RM2k.patchCharEncoding = async function(gameDir) {
	var iniFile = nwPath.join(gameDir, "RPG_RT.ini")
	if (!await common.isFileAsync(iniFile)) throw new Error("Can not find expected file ", iniFile)
	var iniContent = await common.fileGetContents(iniFile);
	var thisIni = ini.parse(iniContent);
	
	thisIni ||= {};
	
	thisIni.EasyRPG = {
		Encoding: "65001"
	}
	
	await common.filePutContents(iniFile, ini.stringify(thisIni), common.lastFileEncoding, false);
	
	// change default write encoding
	thisAddon.config.writeEncoding = "utf8";
	await sys.saveConfig();
	return true;
}

RM2k.getType = async function(path) {
	var dir = path
	if (await common.isFileAsync(path)) {
		dir = nwPath.dirname(path);
	}

	if (common.isDir(nwPath.join(dir, "System2"))) return "2k3";
	return "2k";
}


RM2k.toXml = async function(file, targetDir, type, encoding="utf8") {
	if (!type) {
		type = await this.getType(file);
	}
	if (!await common.isDir(targetDir)) await common.mkDir(targetDir);
	const command = [`--${type}`, "--encoding", encoding, `${file}`]
	await common.aSpawn(path.join(thisAddon.getLocation(), "bin/new", "lcf2xml.exe"), command, {cwd: targetDir});
}

RM2k.toXmlOld = async function(file, targetDir, type, encoding="utf8") {
	if (!type) {
		type = await this.getType(file);
	}
	if (!await common.isDir(targetDir)) await common.mkDir(targetDir);
	const command = [file]
	await common.aSpawn(path.join(thisAddon.getLocation(), "bin", "lcf2xml.exe"), command, {cwd: targetDir});
}

window.RM2k = RM2k;



var exportToFolder = function(sourceDir, targetDir, transData, options) {
	options = options||{};
	options.writeEncoding = options.writeEncoding || thisAddon.config.writeEncoding;
	transData = transData || trans.getSaveData();
	
	//options.groupIndex = options.groupIndex||"relPath";
	ui.log("Options:", options);
	
	return new Promise((resolve, reject) => {
		var translationData = trans.getTranslationData(transData, options);
		console.log("translation Data : ", translationData);
		var rm2k = new RM2k(sourceDir, {
			'writeMode' : true,
			'translationPair':translationData.translationData,
			'writeEncoding' : options.writeEncoding,
			'onParseStart' : function(currentFile) {
				ui.loadingProgress("Processing", "Processing "+currentFile, {consoleOnly:true, mode:'consoleOutput'});
			}
		});	
		window.rm2k = rm2k;
		
		rm2k.parse()
		.then(()=> {
			console.log("%c rm2k Obj >", 'background: #F00; color: #f1f1f1', rm2k);
			return rm2k.writeToFolder(targetDir)
		})
		.then(()=> {
			console.log("file saved to ", targetDir)
			resolve();
		})
	})
	
}

async function createProject(sourceDir, options) {
	options = options || {}
	var projectId 		= common.makeid(10);
	var stagePath 		= path.join(common.getStagePath(),projectId);
	var rm2k = new RM2k(sourceDir);
	window.rm2k = rm2k;
	var transData = {};
	
	await rm2k.parse()
	
	console.log("Parsing completed!");
	
	transData = rm2k.toTrans()
	console.log("Current transData", transData);
	transData.project.projectId = projectId;
	transData.project.cache = transData.project.cache||{};
	transData.project.cache.cachePath = stagePath;
	transData.project.loc = sourceDir;
	
	fs.mkdirSync(path.join(stagePath, "game"), {recursive:true});
	var gameInfo = {
		title : transData.project.gameTitle
	}
	
	fs.writeFileSync(path.join(stagePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2))
	ui.loadingProgress("Processing", "Copy data to stage", {consoleOnly:true, mode:'consoleOutput'});
	await bCopy(rm2k.cacheLocation, path.join(stagePath, "game"))
	
	ui.loadingProgress("Processing", "Parsing done!", {consoleOnly:true, mode:'consoleOutput'});
	ui.loadingProgress("Processing", "Creating new Project.", {consoleOnly:true, mode:'consoleOutput'});
	console.warn("trans data : ", transData);
	
	trans.openFromTransObj(transData, {isNew:true});
	ui.loadingProgress("Done", "All done", {consoleOnly:true, mode:'consoleOutput'});
	ui.loadingEnd("Done", "Done");
	trans.autoSave();
	ui.showCloseButton();
	
	return transData;
	
	
	
}

var determineGameFile = function(exePaths) {
	console.log("determine game exe from ", exePaths);
	if (typeof exePaths == 'string') exePaths = [exePaths];
	exePaths = exePaths || [];
	
	var unknown = [];
	
	for (var i=0; i<exePaths.length; i++) {
		if (path.basename(exePaths[i]).toLowerCase() == "player.exe") return exePaths[i];
		if (path.basename(exePaths[i]).toLowerCase() == "rpg_rt.exe") return exePaths[i];
		unknown.push(exePaths[i]);
	}
	
	if (unknown.length == 1) return unknown[0];
}

var play = function(gameDir) {
	if (common.isDir(gameDir) == false) return alert("Invalid path", gameDir);
	if (Boolean(thisAddon.config.useNative) == false) {
		spawn(path.join(thisAddon.getLocation(), "bin", "player.exe"), ["--window"], {cwd: gameDir, detached: true, stdio:"ignore"})	
		return;
	}
	
	var files = fs.readdirSync(gameDir);
	var exeList = [];
	for (var i=0; i<files.length; i++) {
		if (path.extname(files[i]).toLowerCase() !== '.exe') continue;
		exeList.push(path.join(gameDir, files[i]))
	}
	var exeFile = determineGameFile(exeList);
	spawn(exeFile, ['TestPlay', 'ShowTitle', 'Window'], {
		detached: true,
		stdio: 'ignore'
	});
	
}



var setupEasyRPG = async function(to) {
	to = to || trans.project.devPath;
	var $popup = $("#easyRPGSetup");
	if ($popup.length == 0) {
		var dvField = new DVField();
		$popup = $("<div id='easyRPGSetup'></div>");
		var $content = ($(`
		<div class="dialogSectionBlock">
		<h2 data-tran="">${t('Target folder')}</h2>
		<div data-tran="">
		${t('Select destination folder.')}
		</div>
		<label>
		<input type="dvSelectPath" class="toPath form-control" nwdirectory value="${to}" />
		</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">${(`Field can not be empty!`)}</div>
		</div>
		<div class="dialogSectionBlock">
		<label class="flex fullWidth">
		<div class="flexMain">
		<div class="label" data-tran="">Use UTF-8</div>
		<div class="info" data-tran="">Force EasyRPG player to use UTF-8 encoding.</div>
		</div>
		<div>
		<input type="checkbox" class="flipSwitch easyRPGUseUtf8" name="easyRPGUseUtf8" data-fld="easyRPGUseUtf8" value="1"> 
		</div>
		</label>
		</div>
		`));
		console.log("rendering ", $popup);
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));
		
		$popup.empty();
		$popup.append($content);
	}
	$popup.dialog({
		title: t("Install Easy RPG Player"),
		autoOpen: false,
		modal:true,
		width:640,
		height:320,
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
		close: function() {
			
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
				text: t("Install"),
				click: async function() {
					var $this = $(this)
					
					var to = $this.find(".toPath").val();
					var useUTF8 = $this.find(".easyRPGUseUtf8").prop("checked");
					
					if (!to) return alert("Target path is empty");
					if (!await common.isDirectory(to)) return alert("Target path is invalid");
					
					if (useUTF8) await RM2k.patchCharEncoding(to);
					
					$this.dialog( "close" );
					ui.showBusyOverlay();
					await common.copyFile(nwPath.join(thisAddon.getLocation(), "bin/player.exe"), to);
					ui.hideBusyOverlay();
					
					alert(t("Process completed!"));
				}
			}
			
		]
	});	
	$popup.dialog("open");	
}

var rebuildPlay = function() {
	// inject and play
	// if trans.project.loc or trans.project.devPath are not defined open applyTranslation
	
	if (!trans.project.loc || !trans.project.devPath || !common.isDir(trans.project.loc) || !common.isDir(trans.project.devPath)) {
		var conf = confirm("Game path or Development environment are not defined or invalid!\nYou can generate this by running the Apply Translation once.\nApply Translation now?");
		if (!conf) return;
		ui.openInjectDialog();
		return;
	}
	
	applyTranslation(trans.project.loc, trans.project.devPath, trans.getSaveData(), {play:true});
}

var applyTranslation = function(sourceDir, targetDir, transData, options) {
	options 		= options||{};
	options.play	= options.play || false;
	transData 		= transData || trans.getSaveData();
	var exeFiles 	= [];
	
	
	console.log("copy from", sourceDir, "to:", targetDir);
	// copy the material to targetDir
	bCopy(sourceDir, targetDir, {
		filter: function(src, dest) {
			console.log("copying ",src, dest);
			ui.loadingProgress(undefined, "Copying : "+src, {consoleOnly:true, mode:'consoleOutput'});
			if (path.extname(dest).toLowerCase() == '.exe') exeFiles.push(dest);
			if (path.extname(dest).toLowerCase() == '.bak') {
				console.log("Ignoring ", dest);
				return false;
			}
			
			return true;
		},
		overwrite:true
	})
	.then(() => {
		ui.loadingProgress("Loading", "Done copying", {consoleOnly:true, mode:'consoleOutput'});
		
		console.log("patching the file");
		ui.loadingProgress("Loading", "Patching data. This may take a while...", {consoleOnly:true, mode:'consoleOutput'});
		
		//return exportToFolder(targetDir, targetDir, transData, options);
		return exportToFolder(sourceDir, targetDir, transData, options);
	})
	.then(() => {
		ui.loadingEnd("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput', error:false});
		
		if (options.play) {
			play(targetDir);
			ui.showCloseButton();
			return;
		}
		
		
		var exeFile = determineGameFile(exeFiles);
		//engines.kag.onApplySuccess ? engines.kag.onApplySuccess(targetDir);
		
		console.log("exe file is :", exeFile);
		
		
		ui.LoadingAddButton("Open folder", function() {
			nw.Shell.showItemInFolder(exeFile);
		},
		{
			class: "icon-folder-open"
		});
		ui.LoadingAddButton("Play!", () => {
			console.log("Opening game ", exeFile);
			play(targetDir)
		},
		{
			class: "icon-play"
		});
		ui.showCloseButton();
		ui.loadingEnd();
		
	})
	
}



function init() {
	console.log("%cINITIALIZING RM2K/3 Parser", "background:yellow; font-weight:bold;");
	var $slide = $(`
	<h1><i class="icon-plus-circled"></i>RPG Maker 2k & 2k3</h1>
	<div class="blockBox infoBlock withIcon">
	${t(`RPG Maker 2000 & 2003 Parser with xmlTrans plugin.`)}<br />
	RM2k2k3 ver. ${thisAddon.package.version}<br />
	</div>
	
	<div class="fieldgroup">
	<div class="actionButtons">
	</div>
	</div>			
	`);
	
	var $button = $('<button class="btnSelectExe selectRPGExe"><i class="icon-doc-inv"></i>Select executable file from your the game</button>')
	$button.on('click', function() {
		ui.openFileDialog({
			accept:".exe",
			onSelect : function(selectedFile) {
				ui.showLoading();
				var selectedDir = path.dirname(selectedFile);
				ui.loadingProgress("Processing", "Processing : "+selectedDir, {consoleOnly:true, mode:'consoleOutput'});
				ui.loadingProgress("Processing", "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});
				ui.newProjectDialog.close()
				
				new Promise((resolve, reject) => {
					return createProject(selectedDir)
					
				}).then(function() {
					ui.loadingProgress("Processing", "Parsing files...", {consoleOnly:true, mode:'consoleOutput'});
					
				})
			}
		})		
	})
	$slide.find(".actionButtons").append($button);
	
	ui.newProjectDialog.addMenu({
		icon : "addons/rm2k2k3/icon.png",
		descriptionBar : `<h2>RM2K & RM2K3</h2>
		<p>${(`Start translation from RPG Maker 2000 & 2003`)}</p>`,
		actionBar: "",
		goToSlide: 101,
		at:3,
		slides : {
			101: $slide
		}
	})
	
	// register handler
	if (typeof window.engines.rm2k == 'undefined') engines.add('rm2k');
	engines.addHandler(["rm2k", "rm2k3"], 'exportHandler', async function(targetPath, options) {
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		
		ui.showLoading();
		ui.loadingProgress("Processing", "Parsing game from "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		try {
			var pathStat = fs.lstatSync(targetPath)
			
			if (pathStat.isDirectory()) {
				
				exportToFolder(path.join(trans.project.cache.cachePath, "game"), targetPath)
				.then(() => {
					ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
					ui.showCloseButton();
					ui.loadingEnd();
				})
				
				return common.halt();
			}
		} catch (e) {
			// do nothing
		}
		
		
		// is file
		var tmpPath = path.join(nw.process.env.TMP, trans.project.projectId);
		await ui.log("Writing to temp directory", tmpPath);
		fse.removeSync(tmpPath); 
		try {
			fs.mkdirSync(tmpPath, {recursive:true});
		} catch(e) {
			console.warn("Unable to create directory ", tmpPath);
			throw(e);
		}
		await exportToFolder(trans.project.cache.cachePath, tmpPath)

		var _7z = require('7zip-min');
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+'/Data'], err => {
			// done
			console.log("process done");
			ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
			ui.showCloseButton();
			ui.loadingEnd();		
		});

		
		return common.halt();
	});
	
	engines.addHandler(["rm2k", "rm2k3"], 'injectHandler', function(targetDir, sourceMaterial, options) {
		console.log("Path is : ", targetDir);
		console.log("options are : ", options);
		console.log(arguments);
		ui.showLoading();
		// convert sourceMaterial to folder if path is file
		var sourceStat = fs.lstatSync(sourceMaterial)
		if (sourceStat.isFile()) sourceMaterial = path.dirname(sourceMaterial);
		
		ui.loadingProgress("Processing", "Parsing data. The window will appear hang sometimes. That's normal!", {consoleOnly:false, mode:'consoleOutput'});
		applyTranslation(sourceMaterial, targetDir, trans.getSaveData(), options);
		
		return true;
	});
	//if (typeof window.engines.rm2k3 == 'undefined') engines.add('rm2k3');
	//engines.rm2k3 = engines.rm2k;
	
	
	engines.addHandler(["rm2k", "rm2k3"], "onLoadTrans", 
	() => {
		ui.ribbonMenu.add("rm2k", {
			title : "RM2k/3",
			toolbar : {
				buttons : {
					play : {
						icon : "icon-play",
						title : t("Play last build"),
						onClick : () => {
							play(trans.project.devPath);
						}
					},
					playBuild : {
						icon : "icon-play green",
						title : t("Apply translation then play"),
						onClick : () => {
							rebuildPlay();
						}
					},
					setupEasyRPG : {
						img : "/www/addons/rm2k2k3/easyrpg-setup.png",
						title : t("Setup Easy RPG in the current directory"),
						onClick : () => {
							setupEasyRPG();
						}
					}
					
				}
			}
		})		
	});

	
	
}




$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});