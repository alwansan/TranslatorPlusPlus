/**=====LICENSE STATEMENT START=====
    Translator++ 
    CAT (Computer-Assisted Translation) tools and framework to create quality
    translations and localizations efficiently.
        
    Copyright (C) 2018  Dreamsavior<dreamsavior@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
=====LICENSE STATEMENT END=====*/
/**
 * WOLF JS PARSER
 * By. Dreamsavior
 */
var thisAddon = this;
thisAddon.logLevel = 0;
//window.monitoringMode = true;
thisAddon.engineName = "wolf"
thisAddon.extractorApp = nwPath.join(thisAddon.getLocation(), "bin/uberwolf/UberWolfCli.exe");
thisAddon.config.maxLineMessage = thisAddon.config.maxLineMessage || 4;
this.optionsForm = {
	"maxLineMessage": {
		"type": "number",
		"title": t("Maximum number of line in message box."),
		"description": t("Default value is 4. Type 0 to disable this feature. If the number of line in message box is greater than this number, Translator++ will generates a new message box to prevents the texts overflowing the boxes."),
		"HOOK": "thisAddon.config.maxLineMessage",
		"minimum":0
	},
	"readEncoding": {
		"type": "string",
		"title": "Read encoding",
		"description": "What is the character encoding of the original game?<br />This option will determine on how Translator++ read the text from the game. WolfRPG since version 3.0 supports UTF-8 unicode.<br />Games made on engines prior to version 3.0 are locked to non unicode characters, mostly using Windows-31j or Shift_JIS",
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
	"HOOK": "thisAddon.config.readEncoding"
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
"booleanValue": {
	"type": "boolean",
	"title": t("Use shell copy if possible"),
	"description": t("Use shell copy instead of native NodeJS copy handler."),
	"HOOK": "addonLoader.addons.wolfJs.config.shellCopy",
	"inlinetitle": t("Use shell copy")
}

}

// debug mode
var monitorTexts = ["munyu", "\\E入らないでおこう。", "\\E\\cself[5]を手に入れた！"]; // insert text to be monitored here


var fs 		= fs||require('graceful-fs');
var fse 	= require('fs-extra')
var iconv 	= iconv||require('iconv-lite');
var path 	= require('path');
var bCopy 	= require('better-copy');

var bufferExplode = function(splitBuf, buf) {
	// Subject to change
	splitBuf = Buffer.from(splitBuf)
	var bufJ = buf.join(' ');
	var splitBufJ = splitBuf.join(' ');
	var splitS = bufJ.split(splitBufJ);
	var result = [];
	for (var i=0; i<splitS.length; i++) {
		var thisWord = splitS[i].trim();
		if (thisWord.length == 0) {
			result.push(Buffer.from([]))
			continue;
		}
		result.push(Buffer.from(thisWord.split(' ')));
	}
	return result;
}

function arrayChunk(arr, chunkSize) {
	var R = [];
	for (var i=0,len=arr.length; i<len; i+=chunkSize)
	R.push(arr.slice(i,i+chunkSize));
	return R;
}

const {
    WolfData,
    WolfCommand,
    WolfMoveRoute,
    WolfEventPage,
    WolfEvents,
    WolfMap,
    WolfCEFile,
    WolfCE,
    WolfDatFile,
    WolfDBType,
    WolfGameDatFile
} = require("www/addons/wolfJs/wolfJs.module.js");




// =============================================================
// WolfJs
// =============================================================
var WolfJs = function(path, writeMode, options) {
	// path is game.exe or game folder
	if (!(this instanceof WolfJs)) return console.warn("WolfJs is a constructor!")
	this.path = path;
	this.writeMode = writeMode;
	this.options = options||{};
	this.options.translationPair = this.options.translationPair||{};
	this.options.trnsData = this.options.trnsData||undefined;
	this.options.lineBreak = this.options.lineBreak||"\n";
	this.options.contextDelimiter = this.options.contextDelimiter || "/"
	this.options.stringEncoding = this.options.stringEncoding || "Windows-31j"; // assume source from japanese game
	this.options.files = this.options.files || []
	this.options.trans = this.options.trans || undefined
	
	console.log("%cWolfJs initialized with options", "color:#f00;", this.options)
	// maximum line per message
	// 0 is unlimited, default is 4;
	//this.options.maxLineMessage = this.options.maxLineMessage || 4;
	this.options.maxLineMessage = this.options.maxLineMessage || parseInt(thisAddon.config.maxLineMessage);
	
	/*
	groupType : 0
	no grouping
	
	groupType : 1
	grouping with ID
	
	groupType : 2
	grouping with name
	
	*/	
	this.options.groupType = this.options.groupType || 0 
	
	this.contextMarking = this.options.contextMarking || {
		"Comment":["blue"],
		"name":["blue"],
		"note":["blue"],
		"cSelf":["blue"],
		"JumpLabel":["red"],
		"SetLabel":["red"],
		"CommonEventByName/0":["red"],
		"CAUTION":["red"],
		"SKIPTHIS":["red"]
	}
	
	
	this.init();
	
	// debugging purpose
	window.wolfJs = this;
}

WolfJs.prototype.getAllFiles = function(dir){
	fs = fs||require("fs");
	var results = [];
	var that = this;
	fs.readdirSync(dir).forEach(function(file) {
		
		file = dir+'/'+file;
		var stat = fs.statSync(file);
		
		if (stat && stat.isDirectory()) {
			results = results.concat(that.getAllFiles(file))
		} else results.push(file);
		
	});
	
	return results;	
	
}

WolfJs.prototype.isDir = function(dirPath) {
	var fs = fs || require('fs');
	return  fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory();
}

WolfJs.prototype.isFile = function(path) {
	var fs = fs || require('fs');
	return  fs.existsSync(path) && fs.lstatSync(path).isFile();
}

WolfJs.prototype.getDirName = function(path) {
	return path.match(/(.*)[\/\\]/)[1]||'';
}

WolfJs.prototype.getFileExtension = function(filename) {
	var ext = /^.+\.([^.]+)$/.exec(filename);
	return ext == null ? "" : ext[1].toLowerCase();
}
WolfJs.prototype.getRelPath = function(path) {
	return path.substr(this.path.length+1);
}


WolfJs.prototype.generateTransData = function(wolfData, forceUngroup) {
	// wolfData;
	forceUngroup = forceUngroup || false
	var groupLevel = 0; // group by the number of this length in the context
	if (this.options.groupType == 1) groupLevel = 3;
	if (forceUngroup) groupLevel = 0;
	
	var result = {}
	
	if (wolfData instanceof WolfData == false) {
		console.warn("invalid arguments, expected WolfData object", wolfData);
		return result;
	}
	
	
	
	for (var i=0; i<wolfData.translatableString.length; i++){
		var thisTextObj = wolfData.translatableString[i]
		var currentGroup = thisTextObj.context.slice(0, groupLevel);
		var groupId = this.options.contextDelimiter;
		if (currentGroup.length > 0) groupId = currentGroup.join(this.options.contextDelimiter)
		
		result[groupId] = result[groupId] || {
			data:[],
			context:[],
			indexIds:{},
			tags:[],
			groupLevel:groupLevel,
			currentGroup : currentGroup
		}
		var index = result[groupId].data.length
		if (index == 0) {
			result[groupId].relPathArr = []
			result[groupId].filename = currentGroup[0]
			
			if (groupLevel > 0 ) {
				result[groupId].relPathArr = [currentGroup[1], currentGroup[2]]
				result[groupId].filename = [currentGroup[1], currentGroup[2]].join("/")			
			}
			
		}
		
		var text = iconv.decode(thisTextObj.buffer, this.options.stringEncoding);
		if (typeof result[groupId].indexIds[text] !== 'undefined') {
			result[groupId].context[result[groupId].indexIds[text]].push(thisTextObj.context.join(this.options.contextDelimiter));
			continue;
		}
		
		var row = [text, ""];
		thisTextObj.context = thisTextObj.context||[];
		
		var contextStrings = [thisTextObj.context.join(this.options.contextDelimiter)];
		result[groupId].data[index] = row;
		result[groupId].context[index] = contextStrings;
		result[groupId].indexIds[text] = index;
		
		// Adding tags
		result[groupId].tags[index] = result[groupId].tags[index]||[];
		if (/^[^ ]*?[\/\\].*?\.[a-zA-Z0-9]+$/.test(text)) {
			result[groupId].tags[index].push("red");
		}
		
		if (typeof this.contextMarking !== 'object') continue;
		for (var keyword in this.contextMarking) {
			if (contextStrings.join(";").includes(keyword)) {
				result[groupId].tags[index].push.apply(result[groupId].tags[index], this.contextMarking[keyword]);
				//make the tags value unique
				result[groupId].tags[index] = result[groupId].tags[index].filter((v, i, a) => a.indexOf(v) === i); 
			}
		}
		
	}
	
	return result;
}

WolfJs.prototype.analyseWolfExe = function(exePath) {
	var stats = fs.statSync(exePath)
	
	var reader = fs.createReadStream(exePath, { start: 3942936, end: 3942936+12 });
	reader.on('data', function(chunk) {
		console.log(chunk.toString());
	})	
}


WolfJs.prototype.getGameTitle = function(generatedData) {
	generatedData = JSON.parse(JSON.stringify(generatedData));
	generatedData = generatedData||{};
	generatedData.context = generatedData.context||[[]]
	
	try {
		for (var partId in generatedData) {
			var thisGenData = generatedData[partId]
			
			for (var row = 0; row<thisGenData.context.length; row++){
				if (Array.isArray(thisGenData.context[row]) == false) continue
				for (var idx = 0; idx<thisGenData.context[row].length; idx++) {
					var context = thisGenData.context[row][idx];
					//console.log("checking context", context);
					if (context.includes("title")) {
						//console.log("found keyword title", thisGenData.data[row]);
						return thisGenData.data[row][0];
					}
				}
			}
		}
	} catch (e) {
		return "";
	}
	return "";
}

WolfJs.prototype.dump = function(format) {
	format = format || "trans"
	
	var RESULT = {};
	RESULT.project = {};
	RESULT.project.files = {};
	RESULT.project.gameEngine 	= "wolf";
	//RESULT.project.parsedBy 	= "wolfJs"; // deprecated
	RESULT.project.parser 		= "wolfJs";
	RESULT.project.parserVersion	= thisAddon.package.version;
	
	// dump to trans
	var files = {};
	for (var relativePath in this.files) {
		var thisFile = this.files[relativePath]
		var thisData = {};
		
		
		if (typeof thisFile.wolfFile == 'undefined') {
			console.warn("wolfFile is undefined", thisFile);
			continue;
		}
		
		var generatedData;
		if (thisFile.originalFormat == 'WRPGE Map File') {
			// GET directory from string, with no trailing slash
			// if parse is not success, then skip
			if (!thisFile.wolfFile.wolfData.isParseSuccess) {
				console.warn("skip processing ", relativePath, "reason : Previously the file was not successfully parsed!");
				ui.log("skip processing "+ relativePath + " reason : Previously the file was not successfully parsed!");
				continue;
			}
			thisData.dirname = relativePath.substring(0,relativePath.lastIndexOf("/"));
			generatedData = this.generateTransData(thisFile.wolfFile.wolfData, true)
		} else if (thisFile.originalFormat == 'WRPGE Game.dat File') {
			thisData.dirname = relativePath.substring(0,relativePath.lastIndexOf("/"));
			generatedData = this.generateTransData(thisFile.wolfFile.wolfData, true)
			RESULT.project.gameTitle = this.getGameTitle(generatedData);
			
		} else {
			// dirname is relativePath, because we will create group from the file
			thisData.dirname = relativePath; 
			generatedData = this.generateTransData(thisFile.wolfFile.wolfData)
		}
		
		thisData.generatedData = generatedData;
		
		//Object.assign(thisData, this.generateTransData(thisFile.wolfFile.wolfData))
		
		for (var partId in generatedData) {
			var thisGenData = generatedData[partId]
			//console.log("handling ", partId, "data is ", thisGenData);
			thisGenData.relPathArr = thisGenData.relPathArr ||[];
			var thisPath = [relativePath].concat(thisGenData.relPathArr).join("/")
			//files[thisPath] = thisData;
			
			var thisFileName = relativePath.split(/.*[\/|\\]/)[1];
			//thisGenData.filename = thisGenData.filename || thisFileName
			
			files[thisPath] = {};
			files[thisPath].data 		= thisGenData.data
			files[thisPath].context 	= thisGenData.context
			files[thisPath].tags 		= thisGenData.tags
			files[thisPath].filename 	= thisGenData.filename || thisFileName
			files[thisPath].basename 	= thisGenData.filename || thisFileName
			files[thisPath].indexIds 	= thisGenData.indexIds
			files[thisPath].groupLevel 	= thisGenData.groupLevel;	
			files[thisPath].extension 	= thisFile.extension;
			files[thisPath].lineBreak 	= this.options.lineBreak;
			files[thisPath].path 		= relativePath; // path is relative path from cache dir
			files[thisPath].relPath 	= thisGenData.filename ? thisFileName+"/"+thisGenData.filename : ""; // relpath is real filename address on context	
			files[thisPath].type 		= null; // no special type
			files[thisPath].originalFormat = thisFile.originalFormat;			
			files[thisPath].dirname 	= thisData.dirname;	
			
		}
		
	}
	RESULT.project.files = files;
	
	return RESULT;
}

WolfJs.prototype.writeToFolder = function(targetFolder) {
	if (this.writeMode == false) return console.warn("Unable to write. Reason : not in write mode!");
	
	for (var path in this.files) {
		var thisFiles = this.files[path]
		
		if (thisFiles.wolfFile.wolfData.isParseSuccess == false) {
			console.warn("skip processing ", path, "reason : Previously the file was not successfully parsed!");
			continue;
		}
		
		var targetPath = targetFolder+"/"+path;
		console.log("creating directory : ", this.getDirName(targetPath));
		try {
			fs.mkdirSync(this.getDirName(targetPath), {recursive:true});
		} catch(e) {
			console.warn("Unable to create directory ", this.getDirName(targetPath));
			throw(e);
		}
		
		console.log("Writing ", targetPath);
		thisFiles.wolfFile.wolfData.write(targetPath);
		console.log("    done");
	}
	
}

WolfJs.prototype.getTranslatonPairByPath= function(path) {
	/*
	result : {
		translationInfo : {
			
		},
		translationPair : {
			
		}
	}
	*/
	try {
		let test = transData.translationData[path].translationPair
	} catch (e) {
		path = path.replaceAll("\\", "/");
	}
	
	var transData = this.options.translationData || {};
	transData.translationData = transData.translationData|| {};
	transData.translationData[path] =transData.translationData[path]||{}
	transData.translationData[path].translationInfo = transData.translationData[path].translationInfo || transData.translationData[path].info || {};
	transData.translationData[path].translationPair = transData.translationData[path].translationPair || {};
	console.log("Translation data for ", path, "is", transData.translationData[path]);
	return {
		translationInfo : transData.translationData[path].info,
		translationPair : transData.translationData[path].translationPair
	}
}

WolfJs.prototype.getSelectedFiles = function() {
	// no file selected, so process all
	if (empty(this.options.files)) return this.getAllFiles(this.path);
	
	var resultIndex = {};
	for (var i in this.options.files) {
		var thisPath = this.options.files[i];
		try {
			if (!this.options.trans.project.files[thisPath]) {
				console.warn("can not find the correlation with the trans data for file ", thisPath)
				continue;
			}
			var realPath = nwPath.join(this.path, this.options.trans.project.files[thisPath].path).replace("\\", "/") 
			resultIndex[realPath] = true;
			
		} catch (e) {
			console.warn(e);
		}
	}
	
	var result =[];
	for (var filePath in resultIndex) {
		result.push(filePath);
	}
	
	if (result.length > 0) return result;
	
	// default: process all
	console.log("Selected files is blank... so process all files");
	return this.getAllFiles(this.path);
}

WolfJs.prototype.init = function() {
	// convert to forward slash
	var that 		= this;
	this.path 		= this.path.replace(/\\/g,"/")
	this.contents 	= this.getSelectedFiles();
	this.files 		= {};
	var options 	= {};
	
	if (this.options.maxLineMessage > 0) {
		options.writeTranslation = function(translation, translatableObj) {
			// use original function if this.getFlags('commandLengthPos') is not defined
			if (typeof this.getFlags('commandLengthPos') == 'undefined') return this.writeTranslationMaster(translation, translatableObj);
			
			// override WolfData default writeTranslation method
			// in the case of message is need to be chunked
			var lines 		= translation.split("\n");
			var linesChunk 	= arrayChunk(lines, that.options.maxLineMessage);
			var inc = 0;
			for (var i=0; i<linesChunk.length; i++) {
				var thisString = linesChunk[i].join("\n")
				if (i == 0) {
					// default action, the exact same with the original writeTranslation()
					this.regBuffer[translatableObj.regBufferIndex] = this.createTextBuffer(thisString);
					continue;
				}
				inc++;
				this.regBuffer.push(Buffer.from([0]))
				this.regBuffer.push(Buffer.from([1]))
				this.regBuffer.push(Buffer.from([101, 0, 0, 0]))
				this.regBuffer.push(Buffer.from([0]))
				this.regBuffer.push(Buffer.from([1]))
				this.regBuffer.push(this.createTextBuffer(thisString))
				
			}
			
			if (inc > 0) {
				var commandLengthPos = this.getFlags('commandLengthPos')
				//console.log("adjusting command length at index ", commandLengthPos);
				var commandLength = this.regBuffer[commandLengthPos].readInt32LE();
				commandLength = parseInt(commandLength)+inc;
				var newBuffer = Buffer.from([0,0,0,0])
				newBuffer.writeInt32LE(commandLength)
				//console.log("new Buffer : ", newBuffer);
				this.regBuffer[commandLengthPos] = newBuffer;					
			}
			
		}
	}
	
	
	for (var i=0; i<this.contents.length; i++) {
		var thisFile = this.contents[i]
		var thisData = {};
		//var thisOptions = JSON.parse(JSON.stringify(this.options));
		
		thisData.path = this.getRelPath(thisFile)	
		
		thisData.extension = this.getFileExtension(thisFile);
		thisData.basename = thisFile.split(/.*[\/|\\]/)[1];
		
		if (thisFile.length < 1) continue;
		if (["dat", "mps"].includes(thisData.extension) == false) continue;
		if (thisFile.indexOf("AutoBackup") !== -1 ) continue
		if (thisFile.indexOf("EditorGraphic.dat") !== -1 ) continue
		
		console.log("Resolving translation info by path :", thisData.path);
		var translationInfo = this.getTranslatonPairByPath(thisData.path);
		console.log("Translation Info", translationInfo);
		//console.log(JSON.stringify(translationInfo, undefined, 2));
		var thisOptions = Object.assign({}, this.options, translationInfo, options);
		
		//thisOptions.translationPair = translationInfo.translationPair;
		//thisOptions.translationInfo = translationInfo.translationInfo;
		thisOptions.fileInfo = {}
		thisOptions.fileInfo.path 		= thisData.path.replaceAll("\\", "/");
		thisOptions.fileInfo.dirname 	= path.dirname(thisData.path);
		console.log("Sending option to parser : ", thisData.path, thisOptions);
		ui.log("Parsing", thisFile);
		if (thisData.extension == "mps") {
			thisData.originalFormat = "WRPGE Map File"
			thisData.wolfFile = new WolfMap(thisFile, this.writeMode, thisOptions)
		} else if (thisData.basename == "CommonEvent.dat") {
			thisData.originalFormat = "WRPGE Common Event DAT File"
			thisData.wolfFile = new WolfCEFile(thisFile, this.writeMode, thisOptions)
		} else if (thisData.basename == "Game.dat") {
			thisData.originalFormat = "WRPGE Game.dat File"
			thisData.wolfFile = new WolfGameDatFile(thisFile, this.writeMode, thisOptions)
		} else if (thisData.extension == "dat") {
			thisData.originalFormat = "WRPGE Database File"
			thisData.wolfFile = new WolfDatFile(thisFile, this.writeMode, thisOptions)
		}
		
		this.files[thisData.path] = thisData;
	}
}

thisAddon.WolfCEFile = WolfCEFile;
thisAddon.WolfMap = WolfMap;
thisAddon.WolfGameDatFile = WolfGameDatFile;
thisAddon.WolfDatFile = WolfDatFile;

// thisAddon.extractWolf = async function(paths) {
// 	// promise
// 	var path 			= require('path');
// 	var spawn 			= require('child_process').spawn;
// 	//var exePath 		= __dirname+"/3rdParty/wolfDec/WolfDec.exe";
// 	var exePath 		= nwPath.join(thisAddon.getLocation(), "bin/uberwolf/UberWolfCli.exe")
// 	var files 			= paths || [];
	
// 	if (typeof paths == 'string') {
// 		if (fs.lstatSync(paths).isDirectory()) {
// 			files = await common.readDir(paths)
// 		} else {
// 			files = [paths];
// 		}
// 	}
	
// 	if (Array.isArray(files) == false) files = [];
	
	
	
// 	var promises = [];
// 	for (var i=0; i<files.length; i++) {
// 		var thisFile = files[i]
// 		if (path.extname(thisFile).toLowerCase() !== '.wolf') continue;
// 		//var result = spawnSync(exePath, [thisFile]);
// 		console.log(thisFile);
// 		promises.push(new Promise(async (resolve, reject) => {
// 			var theFile = thisFile.replaceAll("\\", "/");
			

// 			await ui.log(`Unpacking ${theFile}`);
// 			var output = await common.aSpawn(exePath, [`"${theFile}"`]);
// 			ui.log(output);
// 			if (output.includes("Failed")) {
// 				await ui.log("Common extractor is failed, trying to extract with alternative unpacker");
// 				await common.aSpawn(nwPath.join(thisAddon.getLocation(), "bin/DxaDecode.exe"), ["-K:WLFRPrO!p(;s5((8P@((UFWlu$#5(=", theFile])
// 			}
// 			resolve(theFile)
// 		}))
// 	}	
	
// 	return Promise.all(promises)
// 	.then(function() {
// 		console.log("all .wolf has been extracted", arguments);
// 	});
// }

thisAddon.extractWolf = async function(paths) {
	await ui.log("Extracting wolf files at ", paths);
	if (typeof paths == 'string') paths = [paths];
	const exePath 		= thisAddon.extractorApp;
	const supportedExts = [".wolf", ".data", ".pak", ".bin", ".assets", ".content", ".res", ".resource"];
	const renameExtractedWolfFile = async function(wolfFilePath) {
		if (path.extname(wolfFilePath).toLowerCase() !== '.wolf') return;
		const backupPath = `${wolfFilePath}.bak`;
		if (await common.isFileAsync(backupPath)) {
			await common.unlink(backupPath);
		}
		await ui.log(`Renaming extracted wolf file to ${path.basename(backupPath)}`);
		await fs.promises.rename(wolfFilePath, backupPath);
	};
	const renameWolfFilesInDir = async function(dirPath) {
		const wolfFiles = await common.glob('*.wolf', {cwd: dirPath});
		for (let i = 0; i < wolfFiles.length; i++) {
			await renameExtractedWolfFile(nwPath.join(dirPath, wolfFiles[i]));
		}
	};
	for (let i=0; i<paths.length; i++) {
		if (await common.isFileAsync(paths[i])) {
			// is file
			await ui.log(`Unpacking ${paths[i]}`);
			await common.aSpawn(`"${exePath}"`, [`"${paths[i]}"`], {
				shell: true
			});
			await renameExtractedWolfFile(paths[i]);
		} else {
			// get all files in the directory
			const files = await common.readDir(paths[i]);
			const dirs = {};
			// iterate through the files to look for supported extensions
			for (let file of files) {
				if (supportedExts.includes(path.extname(file).toLowerCase())) {
					dirs[nwPath.dirname(file)] = true;
				}
			}

			//const dirs = await common.getAllDirs(paths[i], true) || [];
			// append the root path
			//dirs.push(paths[i]);
			console.log("%cDirs", "color:cyan;", dirs);
			for (let dir in dirs) {
				if (!dir) continue;
				await ui.log(`Unpacking ${dir}`);
				await common.aSpawn(`"${exePath}"`, [`"${dir}"`], {
					shell: true
				});
				await renameWolfFilesInDir(dir);
			}
		}
	}
}


var createNewProject = async function(sourcePath, options) {
	options = options || {}
	options.custom ||= {}
	const initOption = JSON.parse(JSON.stringify(options))
	var projectId 		= common.makeid(10);
	var targetDir 		= nw.process.env.TMP+'\\'+projectId;
	var exePath 		= __dirname+"/3rdParty/wolfDec/WolfDec.exe"
	var path 			= require('path');
	

	ui.log("Creating project with options", options);

	var sourceDir = sourcePath;
	var entryPoint = ""; //default is unknown
	if (await common.isFileAsync(sourcePath)) {
		sourceDir = path.dirname(sourcePath);
		entryPoint = path.basename(sourcePath)
	}
	
	fse.removeSync(targetDir); 
	
	fs.mkdirSync(targetDir, {recursive:true});
	
	ui.loadingProgress(100, "Source directory is : "+sourceDir, {consoleOnly:true, mode:'consoleOutput'});
	bCopy(sourceDir, targetDir, {
		filter: function(from, to){
			if(path.extname(from) === '.mps') {
				console.log("mps file found, copying");
				ui.loadingProgress(100, "Copying : "+from, {consoleOnly:true, mode:'consoleOutput'});
				
				return true;
			} else if(path.extname(from) === '.dat') {
				console.log("dat file found, copying");
				ui.loadingProgress(100, "Copying : "+from, {consoleOnly:true, mode:'consoleOutput'});
				
				return true;
			} else if(path.extname(from) === '.wolf') {
				console.log("wolf file found, copying");
				ui.loadingProgress(100, "Copying : "+from, {consoleOnly:true, mode:'consoleOutput'});
				
				return true;
			} 
			return false;
		}
	})
	.then(async (copyResult) => {
		ui.loadingProgress(100, "Extracting wolf file", {consoleOnly:true, mode:'consoleOutput'});
		
		await thisAddon.extractWolf(targetDir);
		
		var stagePath = common.getStagePath()+"/"+projectId;
		fs.mkdirSync(stagePath, {recursive:true});
		
		return bCopy(targetDir, stagePath, {
			filter: function(from, to){
				if(path.extname(from) === '.mps') {
					console.log("mps file found, copying");
					ui.loadingProgress(100, "Copying : "+from, {consoleOnly:true, mode:'consoleOutput'});
					
					return true;
				} else if(path.extname(from) === '.dat') {
					console.log("dat file found, copying");
					ui.loadingProgress(100, "Copying : "+from, {consoleOnly:true, mode:'consoleOutput'});
					
					return true;
				} 
				return false;
			}
		});
		
		
	})
	.then((copyResult) => {
		console.log("preparation done, parsing");
		ui.log("Preparation done!");
		ui.log("Parsing wolf files");

		var readEncoding = options.custom?.readEncoding || thisAddon.getConfig("readEncoding");
		ui.log("Read encoding is "+readEncoding)
		var wolfJs = new WolfJs(targetDir, false, {
			'groupType' : 1,
			'stringEncoding' : readEncoding,
		});

		var transData = wolfJs.dump()
		transData.project.projectId = projectId;
		transData.project.cache 	= transData.project.cache||{};
		transData.project.cache.cachePath = common.getStagePath()+"/"+projectId;
		transData.project.loc 		= sourceDir;
		transData.project.entryPoint = entryPoint;
		transData.project.options ||= {}
		transData.project.options.init = initOption || {}
	
		var gameInfo = {
			title : transData.project.gameTitle
		}
		
		fs.writeFileSync(transData.project.cache.cachePath+"/gameInfo.json", JSON.stringify(gameInfo, undefined, 2))
		
		
		ui.loadingProgress(100, "Parsing done!", {consoleOnly:true, mode:'consoleOutput'});
		ui.loadingProgress(100, "Creating new Project.", {consoleOnly:true, mode:'consoleOutput'});
		trans.openFromTransObj(transData, {isNew:true});
		ui.log.progress("Done!", "Done!");
		ui.log.end();
		trans.autoSave();
		
		
	})
	
}


thisAddon.setDevPath = async function(defPath) {
	defPath = defPath || trans.project.devPath
	trans.project.devPath  = await ui.openDialogSetDevPath(defPath);
}

thisAddon.openEditor = async function(targetDir) {
	console.log("opening editor at", targetDir);
	if (thirdParty.isInstalled("wrpge") == false) {
		let conf = confirm(t("WRPGE Editor is not installed\r\nPlease install it from T++ menu > Third party application installer\r\n\r\nOpen Third Party application installer now?"));
		if (conf) thirdParty.check({popup:true});
		return;
	}
	if (thirdParty.getLocation("wrpge") == false) return alert(t("Unable to determina WRPGE path."));
	
	
	if (common.isFile(path.join(targetDir, "Editor 2.24Z.exe")) == false) {
		let conf = confirm(t("Translator++ is about to install WRPGE editor in the destination folder.\r\nContinue?"));
		if (!conf) return;
		
		ui.showBusyOverlay()
		bCopy(thirdParty.getLocation("wrpge"), targetDir)
		.then(()=> {
			console.log("opening ", path.join(targetDir, "Editor 2.24Z.exe"));
			nw.Shell.openItem(path.join(targetDir, "Editor 2.24Z.exe"));
			ui.hideBusyOverlay()
		});
	} else {
		console.log("opening ", path.join(targetDir, "Editor 2.24Z.exe"));
		nw.Shell.openItem(path.join(targetDir, "Editor 2.24Z.exe"));
	}
}

thisAddon.playGame = async function(gameDir) {
	if (!gameDir) return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."))
	if (trans.project.entryPoint) {
		if (await common.isFileAsync(path.join(gameDir, trans.project.entryPoint)))	return nw.Shell.openItem(path.join(gameDir, trans.project.entryPoint));
	}
	
	// we do it hard way
	var files = await fs.promises.readdir(gameDir);
	var exeFiles = files.filter((thePath) => {
		if (path.extname(thePath).toLowerCase() == ".exe") return true;
	})
	
	console.log(exeFiles);
	var exeGame = determineWolfExe(exeFiles);
	
	if (!exeGame) return alert("Can not determine your game exe file");
	nw.Shell.openItem(path.join(gameDir, exeGame));
}

thisAddon.isWolfExe = async function(exePath) {
	//if (await common.getExeManufacturer(exePath) == "SilverSecond") return true;
	var exeInfo = await common.getFileVer(exePath);
	var infos = exeInfo?.ProductName || ""
	if (infos.toLowerCase().includes("wolf")) return true;

	infos = exeInfo?.FileDescription || ""
	if (infos.toLowerCase().includes("wolf")) return true;
	return false;
}

// thisAddon.getWolfVersion = async function(exePath) {
// 	return common.getExeVersion(exePath);
// }

thisAddon.getWolfVersion = async function(exePath) {
	var exeInfo = await common.getFileVer(exePath);
	var ver = exeInfo.FileVer || "";
	ver = ver.replaceAll(/[()]/g, "");
	ver = ver.replaceAll(/:/g, ".");
	var part = ver.split(" ");
	return part[1].split(".")
}

var exportWolfToFolder = function(sourceDir, targetDir, transData, options) {
	console.log("export to folder : ", arguments);
	console.log(JSON.stringify(options, undefined, 2));
	ui.log("Start exporting with options", options);
	options = options||{};
	options.writeEncoding = options?.custom?.writeEncoding || options.writeEncoding || trans.project.writeEncoding || thisAddon.config.writeEncoding;
	transData = transData || trans.getSaveData();

	const readEncoding = options?.custom?.readEncoding || thisAddon.getConfig("readEncoding")
	ui.log("read encoding is "+readEncoding);
	ui.log("Write encoding is "+ options.writeEncoding);

	// force getTranslationData group by ID (key index)
	//options.groupBy = "id" 
	
	// causes unexpected bug, todo : analyze this
	options.groupIndex 		= options.groupIndex||"relPath";
	options.objectGrouping 	= true;
	var translationData = trans.getTranslationData(transData, options);
	console.log("===================");
	console.log("generating translation data with options", options);
	
	console.log("translation Data : ", translationData);
	
	//return ;
	var wolfJs = new WolfJs(sourceDir, true, {
		translationData		: translationData,
		groupType 			: 1,
		writeEncoding 		: options.writeEncoding,
		stringEncoding		: readEncoding,
		files 				: options.files,
		trans				: transData
	});	
	console.log("%c wolfJs Obj >", 'background: #F00; color: #f1f1f1', wolfJs);
	wolfJs.writeToFolder(targetDir);
	
}





var determineWolfExe = function(exePaths) {
	if (typeof exePaths == 'string') exePaths = [exePaths];
	exePaths = exePaths || [];
	
	var unknown = [];
	
	for (var i=0; i<exePaths.length; i++) {
		if (path.basename(exePaths[i]).toLowerCase() == "game.exe") return exePaths[i];
		if (path.basename(exePaths[i]).toLowerCase() == "config.exe") continue;
		if (path.basename(exePaths[i]).toLowerCase().substring(0,6) == "editor") continue;
		unknown.push(exePaths[i]);
	}
	
	if (unknown.length == 1) return unknown[0];
}

var applyTranslation = async function(sourceDir, targetDir, transData, options) {
	console.log("applyTranslation(), arguments : ", arguments);
	options 		= options||{};
	transData 		= transData || trans.getSaveData();
	var path		= require('path');
	var wolfFiles 	= [];
	var exeFiles 	= [];
	
	console.log(JSON.stringify(options, undefined, 2));
	
	console.log("copy from", sourceDir, "to:", targetDir);
	// copy the material to targetDir
	bCopy(sourceDir, targetDir, {
		filter: function(src, dest) {
			console.log("copying ",src, dest);
			ui.loadingProgress(undefined, "Copying : "+src, {consoleOnly:true, mode:'consoleOutput'});
			if (path.extname(dest).toLowerCase() == '.wolf') wolfFiles.push(dest);
			if (path.extname(dest).toLowerCase() == '.exe') exeFiles.push(dest);
			
			return true;
		},
		overwrite:true
	})
	.then(async function() {
		ui.loadingProgress(undefined, "Done copying", {consoleOnly:true, mode:'consoleOutput'});
		console.log("Wolf file : ", wolfFiles);
		console.log("extracting wolf file");
		ui.loadingProgress("Loading", "extracting wolf file (if any)", {consoleOnly:true, mode:'consoleOutput'});
		
		return await thisAddon.extractWolf(wolfFiles);
	})
	.then(function() {
		console.log("done extracting");
		ui.loadingProgress("Loading", "done extracting", {consoleOnly:true, mode:'consoleOutput'});
		
		// delete file
		var promises = [];
		for (var i=0; i<wolfFiles.length; i++) {
			promises.push(new Promise((resolve, reject) => {
				var thisFile = wolfFiles[i];
				fs.unlink(wolfFiles[i], (err) => {
					if (err) reject(err);
					console.log('successfully deleted ', thisFile);
					resolve(thisFile);
				});
			}));
		}
		
		ui.loadingProgress("Loading", "Clearing wolf file (if any)", {consoleOnly:true, mode:'consoleOutput'});
		return Promise.all(promises)
		.then(function() {
			ui.loadingProgress("Loading", "Wolf file has been cleared", {consoleOnly:true, mode:'consoleOutput'});
			
			console.log("all .wolf has been deleted from target directory", arguments);
		});
	})
	.then(()=> {
		return determineWolfExe(exeFiles);
	})
	.then(async (exePath)=>  {
		
		console.log("patching the file");
		ui.loadingProgress("Loading", "Patching data. This may take a while depending on the size of the game....", {consoleOnly:true, mode:'consoleOutput'});
		
		exportWolfToFolder(targetDir, targetDir, transData, options);
		ui.loadingProgress("Loading", "Done!", {consoleOnly:true, mode:'consoleOutput'});
		
		ui.loadingEnd("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput', error:false});
		engines.wolf.onApplySuccess(targetDir);
		
		ui.log.addButton("Open folder", function() {
			nw.Shell.showItemInFolder(exePath);
		},{
			class: "icon-folder-open"
		});
		ui.log.addButton("Play!", function() {
			console.log("Opening game");
			nw.Shell.openItem(exePath);
		},{
			class: "icon-play"
		});

		ui.log.progress("Done!", "Done!");
		await ui.log.showOpenDirButton(value.sourceDir);

		ui.showCloseButton();
		
		
	})
	
}

const showExtractWolfDialog = async function() {
	const value = await ui.form({
		schema: {
			"sourceDir": {
				"type": "string",
				"title": "Source Directory",
				"description": "Select the directory where the Wolf RPG game is located",
				"default": "",
				"required": true
			},
			"removeOriginal": {
				"type": "boolean",
				"title": "Remove original .wolf file",
				"description": "Remove the original .wolf file after extracting the content",
				"default": false,
			}
		},
		form: [{
			key: "sourceDir",
			type: "selectdir",
		},
		{
			key: "removeOriginal",
			type: "checkbox",
		}]
	}, 
	{
		title: "Extract Wolf Files",
		width: 500,
		height: 300,
	});
	if (!value) return;
	console.log("value", value);
	ui.showBusyOverlay();
	const wolfFiles = await common.glob("**/*.wolf", {cwd:value.sourceDir});
	console.log("Wolf files: ", wolfFiles);
	if (wolfFiles.length == 0) {
		alert("No .wolf file found in the selected directory");
		return ui.hideBusyOverlay();
	}
	ui.hideBusyOverlay();

	ui.showLoading();
	ui.loadingProgress("Extracting", "Extracting wolf files from "+value.sourceDir, {consoleOnly:false, mode:'consoleOutput'});

	await thisAddon.extractWolf(value.sourceDir);

	if (value.removeOriginal) {
		ui.log("Removing original .wolf files");
		for (var i=0; i<wolfFiles.length; i++) {
			await common.unlink(nwPath.join(value.sourceDir, wolfFiles[i]));
		}
	}
	ui.log.progress("Done!", "Done!");
	await ui.log.showOpenDirButton(value.sourceDir);
	ui.log.end();
}

const drawNewProject = function() {
	ui.newProjectDialog.addMenu({
		icon : "addons/wolfJs/icon.png",
		descriptionBar : `<h2>Wolf RPG</h2>
		<p>${t('Translate a Wolf RPG game up to ver. 3.330 with WolfJs library. The default Wolf RPG parser for Translator++.')}</p>`,
		actionBar: "",
		goToSlide: "wolf1",
		at:10
	});


	var $slide = $(`
	<div>
		<h1><i class="icon-plus-circled"></i>${t('Wolf RPG Editor games')}</h1>
		<div class="blockBox infoBlock withIcon">
			${t('Parsing Wolf RPG Game with')} : <br /><b>WolfJS ver `+thisAddon.package.version+`</b>
		</div>
		<div class="dialogSectionBlock">
			<h2 data-tran="">${t("Wolf RPG Editor game")}</h2>
			<div class="info" data-tran="">${t("Select the game's executable file")}</div>
			<div class="selectGameWrapper"></div>
			<div class="dialogInfo alert alert-warning hidden" data-tran=""><i class="icon-attention red"></i> ${('Invalid path.')}<br>${('Some features will be disabled until this is fixed.')}</div>
		</div>
		<div class="dialogSectionBlock wolf3Alert hidden">
			<div class="blockBox warningBlock withIcon" data-tran="">
				Wolf RPG Editor has changed the structure of the map (mps) files since ver 3.330 and the data file since ver 3.340.<br />
				Games created with Wolf RPG Editor version 3.330 and later can only be parsed using WolfTL.
			</div>
		</div>
		<div class="dialogSectionBlock wolf2Alert hidden">
			<div class="blockBox warningBlock withIcon" data-tran="">
				<h2>Your game doesn't support unicode!</h2>
				Wolf RPG version 2 and below doesn't support UTF-8 encoding.
				So, if you are translating into non latin characters, you may need to upgrade your game to version 3 or above.<br />
				Follow this guide to upgrade your game : <a href="https://dreamsavior.net/docs/for-beginer/wolf-rpg/how-to-upgrade-wolf-rpg-game-into-3-xx/" external>How to upgrade Wolf RPG game into 3.xx</a>
			</div>
		</div>
		<div class="dialogSectionBlock engineInfo hidden">
			<h2 data-tran="">${t("Engine version")}</h2>
			<div class="info" data-tran="">${t("Detected WolfRPG Engine version of the selected game")}</div>
			<label><input type="text" disabled class="engineVersion"></label>
		</div>
		<form class="customFields"></form>
	</div>
	`);

    const customFields = new CustomFields($slide.find(".customFields"), {
		jsonForm: {
			schema: {
				parser: {
					"type": "string",
					"title": "Parser",
					"default": "wolftl",
					"enum": ["wolfjs", "wolftl"],
				},
				readEncoding: {
					"type": "string",
					"title": "Read Character Encoding",
				},

			},
			form: [
				{
					"key": "parser",
					"type": "radiobuttons",
					"activeClass": "btn-success",
					"description": "Select the parser to be used for this project. WolfJs is the default parser for Wolf RPG games. Wolftl is the alternative parser that works for ALL WolfRPG versions.",
					"htmlClass": "btn-select-jumbo",
					"titleMap": {
						"wolfjs": `<h1>WolfJS</h1><div>WolfJs is the original parser of Translator++ for Wolf RPG games. Supports Wolf RPG up to version 3.30. Has the ability to add additional text boxes if the translated text has more lines than the original.</div>`,
						"wolftl": `<h1>WolfTL</h1><div>WolfTL is an alternative parser that works for all WolfRPG versions, including Wolf RPG Pro. However, it lacks the ability to add additional text boxes if the translated text has more lines than the original.</div>`
					}
				},
				{
					"key": "readEncoding",
					"type": "selectencoding",
					"description": "Character encoding when reading data from a document.<br />Use UTF-8 for WolfRPG version 3 and above. Leave blank for Wolf RPG version 2 and below."
				}
			]
		}
	});

	console.log("WolfJS Custom fields", customFields);

	const $selectExe = $('<input type="dvSelectPath" class="form-control selectExe" name="selectExe" accept=".exe" value="" />')
	$selectExe.on('change', async function() {
		const exeFile = $(this).val();
		if (!await thisAddon.isWolfExe(exeFile)) {
			return(t("Heads up!\r\n")+exeFile+t("\r\ndoesn't seem to be a Wolf RPG executable file!\r\nAre you sure want to start Wolf RPG Project from this entry point?"));
		}
        $slide.find(".dialogSectionBlock.engineInfo").removeClass("hidden");
        let ver = await thisAddon.getWolfVersion(exeFile);
		const verStr = ver[0]+"."+ver[1];
		console.log("Detected Wolf RPG version", ver);
        $slide.find(".engineVersion").val(verStr);

		const majorVer = parseInt(ver[0])
		if (majorVer >= 3) {
			customFields.setValueByName("readEncoding", "utf8");
			$slide.find(".wolf3Alert").removeClass("hidden");
		} else {
			$slide.find(".wolf2Alert").removeClass("hidden");
			customFields.setValueByName("readEncoding", "");
		}

		// if version is greater than 3.330. Select wolfTL
		console.log("Comparing version", verStr, "with 3.330", common.compareVersion("3.330", verStr));
		if (common.compareVersion("3.330", verStr) <= 0) {
			console.log("Using wolftl parser", $slide);
			$slide.find("input[name=parser][value=wolftl]").trigger("click");
		}
	});	
	$slide.find(".selectGameWrapper").append($selectExe);



	ui.newProjectDialog.newSlide("wolf1", $slide, {
        onActive: ()=> {
			$slide.find(".dialogSectionBlock.engineInfo").addClass("hidden");
			$slide.find(".wolf3Alert").addClass("hidden");
			$slide.find(".wolf2Alert").addClass("hidden");
        },
        buttons: [
                    {
                        text: t("Create a new project"),
						icon: "ui-icon-plusthick",
                        click: async function() {
                            if ($slide.find(".requirementInfo").hasClass("error")) {
                                return alert("Unable to process because the requirements are not met.")
                            }
							var entryPoint = $selectExe.val();
							console.log("Selected entry point", entryPoint);

							if (!entryPoint) {
								return alert(t("Please specify a game to be processed!"))
							}
							//alert(path);
							ui.showLoading();
							var selectedDir = common.getDirectory(entryPoint);
							ui.loadingProgress(0, "Processing : "+selectedDir, {consoleOnly:true, mode:'consoleOutput'});
							ui.loadingProgress(0, "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});
							
							ui.newProjectDialog.close();
							console.log("Custom fields", customFields);
							const options = {
                                entryPoint      : entryPoint,
                                engineVersion   : $slide.find(".engineVersion").val(),
                                custom          : customFields.getValues()
                            }
							ui.log("Options", options);
							await common.wait(500);

							if (options.custom.parser == "wolftl") {
								await thisAddon.wolfTl.prepareNewProject(options);
							} else {
								await createNewProject(entryPoint, options);
							}

                        }
                    }
                ]
    })
}

var init = function() {
	//console.warn("%cINITIALIZING WOLFJS", "background:yellow; font-weight:bold;");

	drawNewProject();

	if (window.engineDetectionRegistry && !window.engineDetectionRegistry.definitions.has("wolf")) {
		window.engineDetectionRegistry.register({
			id: "wolf",
			addonId: thisAddon.id,
			engineIds: ["wolf", "wolfrpg"],
			displayName: "Wolf RPG Editor",
			priority: 100,
			detect: async function(request) {
				const entryPoint = request.entryPoint;
				if (!await thisAddon.isWolfExe(entryPoint)) return { matches: [] };

				return {
					matches: [{
						engineId: "wolf",
						confidence: 1,
						evidence: ["Found Wolf RPG Editor executable metadata."],
						entryPoint,
						gameRoot: nwPath.dirname(entryPoint),
						preferredInput: "entryPoint"
					}]
				};
			},
			openProjectWizard: async function(candidate, launchContext) {
				ui.newProjectDialog.gotoSlide("wolf1", "engineDetectResult");
				const $slide = ui.newProjectDialog.getSlide("wolf1");
				window.engineDetectionRegistry.setFieldValue(
					$slide.find(".selectExe"),
					launchContext.entryPoint
				);
			}
		});
	}
	
	if (typeof window.engines.wolf == 'undefined') engines.add('wolf');
	
	engines.wolf.addProperty('onApplySuccess', function(targetDir) {
		console.log("Running onApplySuccess", targetDir);
		
		ui.log.addButton("Open Editor", function() {
			thisAddon.openEditor(targetDir);
			
		},{
			class: "icon-edit"
		});
		
	});	
	
	engines.wolf.addProperty('exportHandler', async function(targetPath, options) {
		console.log("%cPath is : ", "color:pink", targetPath);
		console.log("options are : ", options);
		console.log(arguments);
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		
		ui.showLoading();
		ui.loadingProgress("Processing", "Parsing data. The window will appear hang sometimes. That's normal!", {consoleOnly:false, mode:'consoleOutput'});
		try {
			var pathStat = fs.lstatSync(targetPath)
			
			if (pathStat.isDirectory()) {
				await common.wait(500);

				exportWolfToFolder(trans.project.cache.cachePath, targetPath, trans.getSaveData(), options);
				ui.log.progress("Done!", "Done!");
				ui.loadingEnd();
					

				return true;
			}
		} catch (e) {
			//do nothing
		}
		
		await common.wait(500);
			
		// is file
		
		var tmpPath = nw.process.env.TMP+"/"+trans.project.projectId;
		fse.removeSync(tmpPath); 
		try {
			fs.mkdirSync(tmpPath, {recursive:true});
		} catch(e) {
			console.warn("Unable to create directory ", tmpPath);
			return true;
		}
		exportWolfToFolder(trans.project.cache.cachePath, tmpPath, trans.getSaveData(), options);
		var _7z = require('7zip-min');
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+'/Data'], async err => {
			// done
			console.log("process done");
			ui.log.progress("Done!", "Done!");
			ui.loadingEnd();			
		});

		
		
		//applyTranslation()
		return true;
	});
	
	engines.wolf.addProperty('injectHandler', function(targetDir, sourceMaterial, options) {
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
	
	
	engines.addHandler(["wolf"], "onLoadTrans", async () => {
		ui.ribbonMenu.add("wolf", {
			title : trans.gameEngine.toUpperCase(),
			toolbar : {
				buttons : {
					devPath : {
						icon : "icon-folder-add",
						title : t("Set dev path. Path to the directory of the translated game."),
						onClick : async () => {
							thisAddon.setDevPath(trans.project.devPath);
						}
					},
					play : {
						icon : "icon-play",
						title : t("Play last build"),
						onClick : async () => {
							if (await common.isDirectory(trans.project.devPath) == false) {
								return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."));
							}
							thisAddon.playGame(trans.project.devPath);
						}
					},
					openEditor : {
						img : "addons/wolfJs/icon-editor.png",
						title : t("Open editor"),
						onClick : async () => {
							if (await common.isDirectory(trans.project.devPath) == false) {
								return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."));
							}
							thisAddon.openEditor(trans.project.devPath);
						}
					},
					onlineManual : {
						icon : "icon-help-circled-1",
						title : t("Open Wolf RPG Editor online manual"),
						onClick : async () => {
							nw.Shell.openExternal("https://dreamsavior.net/docs/wolf-rpg-editor-manual/");
						}
					},
					manual : {
						img : "addons/wolfJs/icon-editor-manual.png",
						title : t("Open Wolf RPG Editor english manual"),
						onClick : async () => {
							if (!await common.isFileAsync(nwPath.join(__dirname, "3rdParty/WRPGE_2.24Z_EN/Manual 2.24Z.pdf"))) return alert(t("Can not find the manual file.\nPlease install Wolf RPG Editor through 3rd Party app installer."))
							nw.Shell.openItem(nwPath.join(__dirname, "3rdParty/WRPGE_2.24Z_EN/Manual 2.24Z.pdf"));
						}
					}				
				}
			}
		})
		
	})

	
	const exportInjectSchema = ()=> {
		return {
			jsonForm: {
				"schema": {
					"readEncoding": {
						"type": "string",
						"title": "Read Character Encoding",
					},
					"writeEncoding": {
						"type": "string",
						"title": "Write Character Encoding",
					},
					"maxLineMessage": {
						"type": "integer",
						"title": t("Maximum number of line in message box."),
						"description": t("Default value is 4. Type 0 to disable this feature. If the number of line in message box is greater than this number, Translator++ will generates a new message box to prevents the texts overflowing the boxes."),
						"minimum": 0,
					}
				},
				"form": [
					{
						"key": "readEncoding",
						"description": `Character encoding when reading data from a document.<br />Use UTF-8 for WolfRPG version 3 and above. Leave blank for Wolf RPG version 2 and below.<br />Should be <b>the same encoding you selected when creating the project which is: ${trans.project.options?.init?.custom?.readEncoding}</b>.<br />When the character decoder decodes the text differently from those in your project, it will fail to assign the translation pair. <span style="color:red">Normally there is no reason to change this</span>.`,
						"type":"selectencoding",
					},
					{
						"key": "writeEncoding",
						"description": "Character encoding to write into the wolf files.<br />Since version 3 WolfRPG supports UTF8 Unicode, so you can safely use utf8 for any language.<br />You probably need to specify target unicode for WolfRPG version 2 and lower.",
						"selectencoding":"selectencoding",
					},
					{
						"key": "maxLineMessage",
						"onChange": function (evt) {
							var value = parseInt($(evt.target).val());
							thisAddon.setConfig('maxLineMessage', value);
							console.warn("maxLineMessage", value)
						}
					}
				]
			}
		}
	}

	engines.getEngine(thisAddon.engineName).addProperty("injectOptionFields", exportInjectSchema)

	engines.getEngine(thisAddon.engineName).addProperty("exportOptionFields", exportInjectSchema)
	
	engines.getEngine(thisAddon.engineName).addProperty('onOpenInjectDialogReady', function($dialog, options) {
		console.log("Open inject dialog is ready");
		const currentReadEncoding = trans.project.options?.init?.custom?.readEncoding;
		console.log("Current encoding value", currentReadEncoding);
		$dialog.find(`[name="readEncoding"]`).val(currentReadEncoding);
		$dialog.find(`[name="writeEncoding"]`).val(currentReadEncoding);
		$dialog.find(`[name="maxLineMessage"]`).val(thisAddon.config.maxLineMessage);
	})

	engines.getEngine(thisAddon.engineName).addProperty('onOpenExportDialogReady', function($dialog, options) {
		console.log("Open inject dialog is ready");
		const currentReadEncoding = trans.project.options?.init?.custom?.readEncoding;
		console.log("Current encoding value", currentReadEncoding);
		$dialog.find(`[name="readEncoding"]`).val(currentReadEncoding);
		$dialog.find(`[name="writeEncoding"]`).val(currentReadEncoding);
		$dialog.find(`[name="maxLineMessage"]`).val(thisAddon.config.maxLineMessage);
	})

	// menu
	ui.mainMenu.addChild("tools", {
		id: "wolf",
		label: "Wolf RPG",
	});

	ui.mainMenu.addChild("wolf", {
		label: "Extract wolf archieves"
	}).on("select", function() {
		showExtractWolfDialog();
	})
}

$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});