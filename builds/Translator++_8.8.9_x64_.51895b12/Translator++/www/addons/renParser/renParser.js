/*
Parse all renpy script and convert them to .trans
Currently support renpy version 6
The latest version of Renpy might not supported due to unrpyc tool unable to decompile the script properly
*/
var thisAddon = this;
const AddonUtils = require("www/js/AddonUtils.js");
const pLimit = require("p-limit");
const { Worker } = require("worker_threads");
const supportedEngines = ["renpy"];

thisAddon.gameEngine = "renpy";
AddonUtils(thisAddon);
thisAddon.defaultInjectCopyOption = "copyEverything";

// skip decompiling rpyc when the rpy file with the same name exist
//thisAddon.config.overwriteRpy = true;


this.optionsForm = {
    // "writeEncoding": {
    //     "type": "string",
    //     "title": "Write Encoding",
    //     "description": "Will force the text encoding into the one selected when writing the scripts. (blank = auto)<br />It's better to leave this field blank and use post processor converter instead.",
    //     "enum": ["",
    //         "utf8",
    //         "utf16le",
    //         "UTF-16",
    //         "UTF-16BE",
    //         "ascii",
    //         "binary",
    //         "base64",
    //         "hex",
    //         "ISO-8859-1",
    //         "ISO-8859-16",
    //         "koi8-r",
    //         "koi8-u",
    //         "koi8-ru",
    //         "koi8-t",
    //         "Shift_JIS",
    //         "Windows-31j",
    //         "Windows932",
    //         "EUC-JP",
    //         "GB2312",
    //         "GBK",
    //         "GB18030",
    //         "Windows936",
    //         "EUC-CN",
    //         "KS_C_5601",
    //         "Windows949",
    //         "EUC-KR",
    //         "Big5",
    //         "Big5-HKSCS",
    //         "Windows950"
    //     ],
    //     "HOOK": "thisAddon.config.writeEncoding"
    // },
    // "convertEncodingTo": {
    //     "type": "string",
    //     "title": "Convert encoding into",
    //     "description": "Post processing converter. Convert the encoding after the script exported successfully.",
    //     "enum": ["",
    //         "utf8",
    //         "utf16le",
    //         "UTF-16",
    //         "UTF-16BE",
    //         "ascii",
    //         "binary",
    //         "base64",
    //         "hex",
    //         "ISO-8859-1",
    //         "ISO-8859-16",
    //         "koi8-r",
    //         "koi8-u",
    //         "koi8-ru",
    //         "koi8-t",
    //         "Shift_JIS",
    //         "Windows-31j",
    //         "Windows932",
    //         "EUC-JP",
    //         "GB2312",
    //         "GBK",
    //         "GB18030",
    //         "Windows936",
    //         "EUC-CN",
    //         "KS_C_5601",
    //         "Windows949",
    //         "EUC-KR",
    //         "Big5",
    //         "Big5-HKSCS",
    //         "Windows950"
    //     ],
    //     "HOOK": "thisAddon.config.convertEncodingTo"
    // }

}

thisAddon.config = thisAddon.config || {};
var binPath = nwPath.join(thisAddon.getLocation(), "bin");
thisAddon.config.readEncoding = "UTF-8";


//var encoding 	= require('encoding-japanese');
//var iconv 		= require('iconv-lite');
var fs 			= fs || require('graceful-fs');
//var fse 		= require('fs-extra')
var bCopy 		= require('better-copy');
//var buffTool 	= require('buffer-tools');
var spawn 		= spawn||require('child_process').spawn;
const renParserWorkerPath = nwPath.join(thisAddon.getLocation(), "renParser.worker.js");

const sanitizeWorkerData = (value) => {
	if (typeof value === "undefined") return undefined;
	return JSON.parse(JSON.stringify(value));
}


// =====================================================================
// 							RpyFile Object
// =====================================================================

class RpyFile extends require("www/js/ParserBase.js").ParserFile {
	constructor(file, options, callback) {
		super(file, options, callback)
		this.uniqueId = common.generateId();
		this.filterOutRegexp = new RegExp(`-\\?Escape_${this.uniqueId}_(\\d+)_([\\[\\]\\{\\}\\%])\\?-`, "g");
		this.excludeCommands = options?.excludeCommands
	}
}

RpyFile.prototype.unIndent = function(text, indentLevel) {
	var tmpText = text.split("\n");
	for (var i=1; i<tmpText.length; i++) {
		if (tmpText[i].substring(0, indentLevel).trim() !== "") continue;
		tmpText[i] = tmpText[i].substring(indentLevel);
	}
	return tmpText.join("\n");
}

RpyFile.prototype.reIndent = function(text, indentLevel) {
	var tmpText = text.split("\n");
	var paddingLeft = " ".repeat(indentLevel);
	for (var i=1; i<tmpText.length; i++) {
		tmpText[i] = paddingLeft+tmpText[i];
	}
	return tmpText.join("\n");	
}


RpyFile.prototype.filterText = function(text, context, parameters) {
	// filter text for trans
	var uniqueId = this.uniqueId;
	try {
		// hide double backslash
		text = text.replaceAll(/([\\]*)([\%\[\]\{\}])/g, function(match, backslashes, char) { // eslint-disable-line
			return `-?Escape_${uniqueId}_${backslashes.length}_${char}?-`
		})

		if (["'''", '"""'].includes(parameters.enclosure)) {
			// heredoc
			text = text.replaceAll("`", "\\`")
			text = eval("`"+text+"`");
			text = this.unIndent(text, parameters.lineIndent);
		} else {
			text = eval(parameters.enclosure+text+parameters.enclosure);	
		}

		text = text.replaceAll(this.filterOutRegexp, function(match, backslashes, char) {
			return "\\".repeat(parseInt(backslashes))+char
		})

	} catch (e) {
		console.warn("error filtering text : ", text, e);
		return text;
	}
	return text;
}

RpyFile.prototype.unfilterText = function(text, context, parameters) {
	// generate text from trans to raw ks
	var uniqueId = this.uniqueId;
	try {
		text = text.replaceAll(/([\\]*)([\%\[\]\{\}])/g, function(match, backslashes, char) { // eslint-disable-line
			return `-?Escape_${uniqueId}_${backslashes.length}_${char}?-`
		})

		if (["'''", '"""'].includes(parameters.enclosure)) {
			text = this.reIndent(text, parameters.lineIndent);
			text = text.replaceAll('"', '\\"');
			text = text.replaceAll("'", "\\'");
		} else {
			text = JSON.stringify(text);
			text = text.substring(1, text.length-1)
			// json stringify already escapes double quote, now handle single quote
			text = text.replaceAll("'", "\\'");
		}
		text = text.replaceAll(this.filterOutRegexp, function(match, backslashes, char) {
			return "\\".repeat(parseInt(backslashes))+char
		})

	} catch (e) {
		console.warn("Error when trying to translate : ", arguments);
		throw(e);
	}

	return text;
}


RpyFile.prototype.registerConfig = function(config, configValue) {
	if (!config) return;
	this.configValue = this.configValue || {};
	this.configValue[config] = configValue;
	//console.log("registering config", config, configValue, this.configValue);
}

RpyFile.fetch = function(theString, parentObject) {
	var that = parentObject||this;
	var chunkOffset = [0];
	var commentsOffset = [];
	//var lastLine = 0;
	var shadowString; // string with all found string replaced by "="

	// var getValueFromString = function(val) {
	// 	// stripout "" or '' from a string
	// 	var result = val
	// 	try {
	// 		result = JSON.parse(val)
	// 	} catch(e) {
	// 		// do nothing
	// 	}

	// 	// todo : stripOut function tag _("");

	// 	return result;
	// }

	var getStartingLine = function(string, offset) {
		for (var i=offset; i>=0; i--) {
			if (string[i] == "\n") return i+1;	
		}
		return i;
	}
	// var getEndLine = function(string, offset) {
	// 	for (var i=offset; i<string.length; i++) {
	// 		if (string[i] == "\n") return i;	
	// 	}
	// 	return i;
	// }

	
	// var getWholeLine = function(string, offsetStart, offsetEnd) {
	// 	return string.substring(getStartingLine(string, offsetStart), getEndLine(string, offsetEnd));
	// }

	var isInsideCommand = function(offset) {
		for (var i=0; i<commentsOffset.length; i++) {
			var thisCommentOffset = commentsOffset[i]
			if (thisCommentOffset.start<offset && thisCommentOffset.end>offset) return true
		}
		return false;
	}
	
	/**
	 * 
	 * @param  {} string
	 * @param  {} offset
	 * Using shadowstring instead of actual string
	 */
	var isComment = function(string, offset) {
		var startingLine = getStartingLine(shadowString, offset);
		var leftString = shadowString.substring(startingLine, offset);
		leftString = leftString.replaceAll(/("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2|(?:^#?(?:(?:[0-9a-fA-F]{2}){3}|(?:[0-9a-fA-F]){3})$)/gm, "");
		if (leftString.includes('#')) return true
		return false;
	}

	var insertActorReferenceData = (currentString, leftHandString) => {
		// only in non-write mode
		if (this.options?.writeMode) return;
		if (!leftHandString || !currentString) return;
		if (leftHandString.trim().substring(0, 6) !== "define") return;
		const pattern = /[ \t]*define[ \t]+([\w]+)[ \t]*=[ \t]*(Character|DynamicCharacter)[ \t]*\([ \t]*["']+/u
		if (leftHandString.trim().replace(pattern, "") !== "") return;
		leftHandString.replace(pattern, (full, symbol) => {
			RenParser.actorList[symbol] = currentString;
		})
	}
	
	/**
	 * 
	 * @param {String} leftHandString 
	 * @returns {String}
	 * Expected text would be something like:
	 * actor "
	 */
	const getActor = (leftHandString) => {
		
		//console.log("Get actor of", leftHandString);
		var cleanText = leftHandString.trim();
		//console.log("Cleaned text", cleanText);
		var components = cleanText.replaceAll(/[ ]+/g, " ").split(" ");
		if (components.length > 2) return "";

		var leftHand = components[0].trim();
		if (leftHand.match(/[\p{Zs}\p{P}]+/gu)) return "";
		//console.log("result", leftHand);
		return leftHand;
	}


	const isExcludedCommand = (command) => {
		//console.log("isExcludedCommand()", command, "exclude commands:", this.excludeCommands);
		if (!command) return false;
		if (!this.excludeCommands) return false;
		if (!Array.isArray(this.excludeCommands)) return false;
		if (this.excludeCommands.length == 0) return false;
		if (!this.excludeCommands.includes(command)) return false;
		//console.log("isExcludedCommand result is true");
		return true;
	}

	const hasPreviousStringLiteral = (leftHandString) => {
		return /["'][^"']*["']/.test(leftHandString);
	}

	const getCurrentCallName = (leftHandString) => {
		const matched = (leftHandString || "").match(/([A-Za-z_][\w.]*)\s*\([^()]*$/);
		if (!matched || !matched[1]) return "";
		const parts = matched[1].split(".");
		return parts[parts.length - 1];
	}

	const isLikelyAssetString = (value) => {
		if (!value) return false;
		if (value.match(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/)) return true;
		if (value.match(/^<[^>]+>.+/)) return true;
		if (value.match(/[\\/].+\.(png|jpe?g|webp|bmp|gif|ogg|mp3|wav|opus|m4a|mp4|avi|webm)$/i)) return true;
		if (value.match(/^.+\.(png|jpe?g|webp|bmp|gif|ogg|mp3|wav|opus|m4a|mp4|avi|webm)$/i)) return true;
		return false;
	}

	const isPathLikeText = (value) => {
		if (!value) return false;
		if (isLikelyAssetString(value)) return true;
		if (value.match(/^(?:[A-Za-z]:[\\/]|\.\.?[\\/]|~[\\/]).+/)) return true;
		if (value.match(/^[^\s]+(?:[\\/][^\\/\s]+)+$/)) return true;
		if (value.match(/^[^\s]+\.(rpy|rpyc|rpym|json|xml|txt|csv|zip|7z|exe|dll|ttf|otf|wav|ogg|mp3|opus|m4a|mp4|avi|webm|png|jpe?g|webp|bmp|gif)$/i)) return true;
		return false;
	}

	const isNonTranslatableStatement = (leftHandString, currentString) => {
		const trimmed = (leftHandString || "").trim();
		const currentCall = getCurrentCallName(leftHandString);
		if (!trimmed) return false;

		if (trimmed.match(/^(image|scene|show|hide|play|queue|voice|stop|screen|style|style_group|transform|layeredimage)\b/)) return true;
		if (trimmed.match(/^define\s+audio\./)) return true;

		if (trimmed.match(/^\$/) && trimmed.match(/(?:^|\W)(?:renpy\.)?(?:music\.)?play\s*\(/)) return true;
		if (["Play", "Preference"].includes(currentCall)) return true;

		if (hasPreviousStringLiteral(leftHandString) && (isLikelyAssetString(currentString) || ["Play", "Preference"].includes(currentCall))) {
			return true;
		}

		return false;
	}

	const getSuspiciousStatementTags = (leftHandString, currentString) => {
		const trimmed = (leftHandString || "").trim();
		const currentCall = getCurrentCallName(leftHandString);
		const tags = [];

		if (isPathLikeText(currentString)) tags.push("red");
		if (!trimmed) return tags;

		if (["SetVariable", "SetField", "SetDict"].includes(currentCall)) {
			tags.push("red");
		}

		if (trimmed.match(/^\$[\s\w.\[\]'"-]+=[\s]*$/) && !isLikelyAssetString(currentString)) {
			tags.push("red");
		}

		return [...new Set(tags)];
	}
	// RENPY : CAPTURE CONFIGURATION value like title, version, etc
	/*
	theString.replace(/define\s+config\.(\w*)\s*\=\s*(.*)/g, function() {
		that.registerConfig(arguments[1], getValueFromString(arguments[2]));
		return arguments[0]
	})
	*/

	theString.replace(/\/\*(.+?)\*\//gs, function() {
		//console.log("Comments : ", arguments);
		commentsOffset.push({
			start:arguments[2],
			end:arguments[2]+arguments[0].length,
		});
		return arguments[0]
	})

	shadowString = theString.replace(/("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2|(?:^#?(?:(?:[0-9a-fA-F]{2}){3}|(?:[0-9a-fA-F]){3})$)/gm, function() {
		return "=".repeat(arguments[0].length);
	})
	
	theString.replace(/("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2|(?:^#?(?:(?:[0-9a-fA-F]{2}){3}|(?:[0-9a-fA-F]){3})$)/gm, function() {
		// can capture heredoc
		// arguments[0] : text with quote
		// arguments[1] : heredoc type (""",''') undefined when not heredoc
		// arguments[2] : quote type (',") undefined when heredoc
		// arguments[3] : offset (starting from before quote - see arguments[0])
		// arguments[4] : whole text

		// note: it is observed that quote can be null

		var quote = arguments[1] || arguments[2] || ""; // not sure if it is a good idea to cast the undefined to string
		if (quote == "") {
			console.log("quote is empty", arguments);
		}

		var offset 		= arguments[3] + quote.length; // plus opening quote
		var text 		= arguments[4];
		var endOffset 	= offset+arguments[0].length - (quote.length*2); // minus start and end quote 
		//var lineStartAt = getStartingLine(arguments[5], arguments[4]);
		var lastOffset 	= chunkOffset[chunkOffset.length-1]||0;
		var lines 		= text.substring(0, offset).split("\n");
		var lineCount 	= lines.length;

		var leftSideOfTheText = lines[lines.length-1]; // text of the current line up to the offset
		var marginLeft = leftSideOfTheText.length - leftSideOfTheText.trimStart().length;
		//var indentString = leftSideOfTheText.substring(0, marginLeft);
		var cols 		= leftSideOfTheText.length;
		var firstWord	= "";
		try {
			firstWord	= leftSideOfTheText.trim().split(" ")[0]
		} catch {
			// do nothing
		}

		// register everyting from previously found text up to the beginning of this text
		that.register(text.substring(lastOffset, offset));
		
		// get row command, can be an actor name
		let rowCommand = getActor(leftSideOfTheText);
		var thisString = text.substring(offset, endOffset);
		const statementTags = getSuspiciousStatementTags(leftSideOfTheText, thisString);

		// register the current text as translatable text
		if (!isInsideCommand(offset) && !isComment(text, offset) && !isExcludedCommand(rowCommand) && !isNonTranslatableStatement(leftSideOfTheText, thisString)) {
			var context = ["line", lineCount, "col", cols, "cmd", firstWord];

			// register config
			leftSideOfTheText.replace(/\s*config\.(\w*)\s*=\s*/, function(match, key) {
				that.registerConfig(key, that.filterText(thisString, context, {
							start		:offset,
							end			:endOffset,
							enclosure	:quote,
							lineIndent	:marginLeft
						}));
				return match;
			})

			// register actor's name reference
			insertActorReferenceData(thisString, leftSideOfTheText);

			// register translatable texts
			if (rowCommand) {
				that.registerString(thisString, context, {
					start		:offset,
					end			:endOffset,
					enclosure	:quote,
					lineIndent	:marginLeft,
					rowInfoText	:rowCommand
				}, {
					tags: statementTags
				});
			} else {
				that.registerString(thisString, context, {
					start		:offset,
					end			:endOffset,
					enclosure	:quote,
					lineIndent	:marginLeft
				}, {
					tags: statementTags
				});
			}

		} else {
			// register text inside comment
			that.register(text.substring(offset, endOffset));
		}

		//lastLine = lineCount;
		chunkOffset.push(endOffset);
		// registering string
			//for (var cOffset in commentsOffset) {
				//if (commentOffset[cOffset])
			//}
		// end of registering string
		return arguments[0];

	})

	var lastOffset = chunkOffset[chunkOffset.length-1]||0;
	//register the final part of the data
	that.register(theString.substring(lastOffset));


}

RpyFile.prototype.parse = async function() {
	this.contextEnter(nwPath.basename(this.file));
	await ui.log("Parsing : "+this.file);
	this.promise = new Promise(async (resolve, reject) => {
		this.string = await this.readFile(this.file);

		RpyFile.fetch.call(this, this.string)
		
		this.contextEnd();
		resolve();
	})
	return this.promise;
}

window.RpyFile = RpyFile;

const runRpyParseWorker = async function(file, parserOptions = {}) {
	const workerOptions = sanitizeWorkerData(parserOptions) || {};

	return new Promise((resolve, reject) => {
		const worker = new Worker(renParserWorkerPath, {
			workerData: {
				file,
				parserOptions: workerOptions,
			},
		});

		let settled = false;
		const finish = (handler, value) => {
			if (settled) return;
			settled = true;
			handler(value);
		};

		worker.on("message", (msg) => {
			if (msg?.error) {
				const error = new Error(msg.error.message || "RenPy parser worker failed");
				error.stack = msg.error.stack || error.stack;
				worker.terminate().catch(() => {});
				finish(reject, error);
				return;
			}

			worker.terminate().catch(() => {});
			finish(resolve, msg?.result);
		});

		worker.on("error", (error) => finish(reject, error));
		worker.on("exit", (code) => {
			if (code !== 0 && !settled) {
				finish(reject, new Error(`RenPy parser worker exited with code ${code}`));
			}
		});
	});
}

const hydrateParsedRpyFile = function(file, parserOptions, parsedResult = {}) {
	const parsedFile = new RpyFile(file, parserOptions);
	parsedFile.writableData = parsedResult.writableData || [];
	parsedFile.translatableTexts = parsedResult.translatableTexts || [];
	parsedFile.configValue = parsedResult.configValue || {};
	parsedFile.detectedEncoding = parsedResult.detectedEncoding;
	parsedFile.encoding = parsedResult.encoding;
	parsedFile.transData = {
		data: [],
		context: [],
		tags: [],
		parameters: [],
		indexIds: {},
	};

	for (let i = 0; i < parsedFile.translatableTexts.length; i++) {
		parsedFile.addTransData(common.clone(parsedFile.translatableTexts[i]));
	}

	parsedFile.isParsed = true;
	parsedFile.promise = Promise.resolve(parsedFile);
	return parsedFile;
}

const parseRpyOnMainThread = async function(file, parserOptions = {}) {
	const parsedFile = new RpyFile(file, parserOptions);
	await parsedFile.parse();
	return {
		fileObject: parsedFile,
		actorList: common.clone(RenParser.actorList || {}),
	};
}

const parseRpyWithWorkerFallback = async function(file, parserOptions = {}) {
	try {
		const parsedResult = await runRpyParseWorker(file, parserOptions);
		return {
			fileObject: hydrateParsedRpyFile(file, parserOptions, parsedResult),
			actorList: parsedResult?.actorList || {},
		};
	} catch (error) {
		console.warn(`RenPy parser worker failed for ${file}, falling back to main thread`, error);
		return await parseRpyOnMainThread(file, parserOptions);
	}
}



// =====================================================================
// 							Renpy Utility Object
// =====================================================================
var RenUtils = function() {
	
}

RenUtils.prototype.extractRPA = async function(gameFolder, options) {
	// extract renpy's RPA archive 
	options = options || {}
	options.onExtract = options.onExtract || function(filePath){};
	options.preserve = options.preserve || false; // preserve original .rpa file
	//var rpatool = nwPath.join(binPath, "rpatool.exe");
	var rpatool = nwPath.join(binPath, "rpatool/rpatool.exe");

	var rpaFiles = [];
	
	return new Promise(async (resolve, reject) => {
		await ui.log(`Collecting rpa files from: ${gameFolder}`);

		await bCopy.walk(gameFolder, {
			onFile: (filePath, stats) => {
				//console.log("processing", filePath);
				if (nwPath.extname(filePath).toLowerCase() !== ".rpa") return;
				console.log("is RPA file : ", filePath);
				rpaFiles.push(filePath);
				
			}
		})
		await ui.log(`${rpaFiles.length} found!`);

		for (var i=0; i<rpaFiles.length; i++) {
			var filePath = rpaFiles[i];
			await ui.log(`Extracting ${i+1}/${rpaFiles.length}: ${filePath}`);
			await common.aSpawn(rpatool, ['-x', filePath], {cwd:nwPath.dirname(filePath)});
			console.log("extract finished : ", filePath);
			options.onExtract.call(this, filePath)
			if (options.preserve == false) {
				fs.unlinkSync(filePath);
			}
			await ui.log(`done!`);
		}
		await ui.log(`rpa extraction are all done!`);
		resolve();
	})
}


// function chunk (arr, len) {
//   var chunks = [],
//       i = 0,
//       n = arr.length;

//   while (i < n) {
//     chunks.push(arr.slice(i, i += len));
//   }

//   return chunks;
// }

// RenUtils.prototype.unRpycLegacy = async function(gameFolder, options) {
// 	// Decompile all .rpyc files from gameFolder and its subfolder
// 	options = options || {}
// 	options.onExtract = options.onExtract || function(filePath){};
// 	options.preserve = options.preserve || false; // preserve original .rpa file
// 	var rpyctool = nwPath.join(binPath, "unrpyc.exe");

// 	var rpycfiles = [];

// 	return new Promise(async (resolve, reject) => {
// 		var renpyPath 	= nwPath.join(gameFolder, 'renpy')
// 		var libPath 	= nwPath.join(gameFolder, 'lib')
// 		await bCopy.walk(gameFolder, {
// 			onFile: (filePath, stats) => {
// 				//console.log("processing", filePath);
// 				if (nwPath.extname(filePath).toLowerCase() !== ".rpyc") return;
// 				if (filePath.includes(renpyPath)) return;
// 				if (filePath.includes(libPath)) return;
			
// 				if (options.overwrite || thisAddon.config.overwriteRpy) {
// 					var filename = nwPath.parse(filePath).name;
// 					if (common.isFile(nwPath.join(nwPath.dirname(filePath), filename+".rpy"))) return
// 				}
// 				rpycfiles.push(filePath);
// 			}
// 		})

// 		console.log("rpyc files :", rpycfiles);
// 		var chunks = chunk(rpycfiles, 20);
// 		console.log(chunks);
	
// 		await ui.log(`Decompiling ${rpycfiles.length} files`);
// 		for (var i=0; i<chunks.length; i++) {
// 			var thisArg = chunks[i];
// 			await ui.log(`Decompiling batch ${i+1} of ${chunks.length}:\n${thisArg.join("\n")}\n`);

// 			thisArg.unshift("-c");
		
// 			await common.aSpawn(rpyctool, thisArg, {cwd:gameFolder})
// 			thisArg.shift();
// 			await ui.log(`done!`);
// 			await ui.log(`removing decompiled rpyc files`);
// 			if (options.preserve == false) {
// 				for (var f=0; f<thisArg.length; f++) {
// 					//console.log("delete", thisArg[f]);
// 					try {
// 						fs.unlinkSync(thisArg[f]);
// 					} catch (e) {
// 						console.warn(e);
// 					}
// 				}
// 			}
// 			await ui.log(`done!`);

// 		}
// 		resolve();
// 		return;
// 	})
// }



RenUtils.prototype.unRpycLegacy = async function(gameFolder, options) {
	ui.log("Running unRpycLegacy");
	options				 = options || {}
	options.preserve 	= options.preserve || false; // preserve original .rpa file
	gameFolder = gameFolder.replace("\\", "/")
	const unrpyc = nwPath.join(binPath, "unrpyc-py2\\unrpyc.exe");

	let command = ["--init-offset", ".\\game\\"];
	if (options.overwrite || thisAddon.config.overwriteRpy) command = ["--clobber", "--init-offset", ".\\game\\"]

	await common.aSpawn(unrpyc, command, {
		cwd:gameFolder,
		onData:(msg)=>{
			ui.log(msg.toString())
		}
	});

	if (options.preserve == false) {
		ui.log("Removing all rpyc:");
		await bCopy.walk(gameFolder, {
			onFile: async (filePath, stats) => {
				//console.log("processing", filePath);
				if (nwPath.extname(filePath).toLowerCase() !== ".rpyc") return;
				await fs.promises.unlink(filePath);
				ui.log(filePath, "removed!");
			}
		})
	}
}

RenUtils.prototype.unRpyc = async function(gameFolder, options) {
	options				 = options || {}
	options.preserve 	= options.preserve || false; // preserve original .rpa file
	gameFolder = gameFolder.replace("\\", "/")
	const pPath = await common.searchFile("python.exe", gameFolder);
	if (!pPath || pPath.length == 0) {
		return this.unRpycLegacy(gameFolder, options);
	}

	await bCopy(nwPath.join(__dirname, "www/addons/renParser/bin/unrpyc"), gameFolder);
	var pythonPath = common.getRelativePath(pPath[0], gameFolder);
	
	let command = ["unrpyc.py", "--init-offset", ".\\game\\"];
	if (options.overwrite || thisAddon.config.overwriteRpy) command = ["unrpyc.py", "--clobber", "--init-offset", ".\\game\\"]

	const runCommand = async ()=> {
		return new Promise(async (resolve, reject) => {
			var result = {};
			await common.aSpawn(pythonPath, command, {
				cwd:gameFolder,
				onData:(msg)=>{
					ui.log(msg.toString())
				},
				onError:(msg)=> {
					ui.logError(msg.toString());
					result.error = msg.toString();
					resolve(result)
				}
			});
			resolve(result);
		})
	}

	const result = await runCommand();
	if (result.error) {
		return this.unRpycLegacy(gameFolder, options);
	}

	ui.log("Removing temporary files");
	await common.unlink(nwPath.join(gameFolder, "deobfuscate.py"));
	await common.unlink(nwPath.join(gameFolder, "unrpyc.py"));
	await common.rmdir(nwPath.join(gameFolder, "decompiler"));

	if (options.preserve == false) {
		ui.log("Removing all rpyc:");
		await bCopy.walk(gameFolder, {
			onFile: async (filePath, stats) => {
				//console.log("processing", filePath);
				if (nwPath.extname(filePath).toLowerCase() !== ".rpyc") return;
				await fs.promises.unlink(filePath);
				ui.log(filePath, "removed!");
			}
		})
	}
}


RenUtils.prototype.makeEditable = async function(gameFolder) {
	// make the renpy game editable by running extractRPA & unrpyc sequentially
	return new Promise(async (resolve, reject) => {
		await this.extractRPA(gameFolder);
		if (thisAddon.config.decompileRpyc) {
			ui.loadingProgress("Preparing", "Decompiling rpyc files", {consoleOnly:true, mode:'consoleOutput'});
			await this.unRpyc(gameFolder);
		} else {
			await ui.log("Skip decompiling rpyc files");
		}
		resolve();
	})
}

thisAddon.hasRenpySignature = async function(entryPoint) {
	if (!entryPoint) return false;
	if (!await common.isFileAsync(entryPoint)) return false;

	const gameDir = nwPath.dirname(entryPoint);
	const entryBaseName = nwPath.parse(entryPoint).name;
	const candidatePaths = [
		nwPath.join(gameDir, "game"),
		nwPath.join(gameDir, "renpy"),
		nwPath.join(gameDir, entryBaseName + ".py"),
		nwPath.join(gameDir, "lib"),
		nwPath.join(gameDir, "common"),
		nwPath.join(gameDir, "renpy.code"),
		nwPath.join(gameDir, "python23.dll"),
		nwPath.join(gameDir, "python27.dll"),
		nwPath.join(gameDir, "python37.dll"),
		nwPath.join(gameDir, "python38.dll"),
		nwPath.join(gameDir, "python39.dll"),
		nwPath.join(gameDir, "python310.dll"),
		nwPath.join(gameDir, "python311.dll"),
	];

	const [
		hasGameDir,
		hasRenpyDir,
		hasLauncherPy,
		hasLibDir,
		hasCommonDir,
		hasRenpyCode,
		hasPython23,
		hasPython27,
		hasPython37,
		hasPython38,
		hasPython39,
		hasPython310,
		hasPython311,
	] = await Promise.all(candidatePaths.map((candidatePath, index) => {
		if (index <= 1 || index === 3 || index === 4) {
			return common.isDirectory(candidatePath);
		}
		return common.isFileAsync(candidatePath);
	}));

	const hasPythonRuntime = [
		hasPython23,
		hasPython27,
		hasPython37,
		hasPython38,
		hasPython39,
		hasPython310,
		hasPython311,
	].some(Boolean);

	if (hasGameDir && hasRenpyDir && hasLauncherPy) return true;
	if (hasGameDir && hasRenpyDir && (hasLibDir || hasCommonDir || hasPythonRuntime || hasRenpyCode)) return true;

	return false;
}

RenUtils.prototype.isRenpyExe = async function(file, callback) {
	// detect wether the given file is Renpy's executable file
	console.log('checking', file);
	
	if (!await common.isFileAsync(file)) return false;
	callback = callback || function(){};
	const result = await thisAddon.hasRenpySignature(file);
	callback.call(this, result);
	return result;
}

RenUtils.prototype.getPythonInfo = async function(gameFolder) {
	gameFolder = gameFolder.replace("\\", "/")
	const pPath = await common.searchFile("python.exe", gameFolder);
	const relativePath = common.getRelativePath(pPath[0], gameFolder);
	if (!pPath[0]) return {}
	const result = {
		path : pPath,
		relativePath:relativePath
	}
	if (relativePath.match(/py3-/)) {
		result.ver = 3
	} else {
		result.ver = 2
	}
	return result;

}


RenUtils.prototype.getVersion = async function(gameFolder) {
	if (!gameFolder) throw new Error("Empty parameter 0: gameFolder:string")
	const baseDir = nwPath.join(gameFolder, "renpy");
	if (!await common.isDirectory(baseDir)) throw new Error("Cannot find directory ", baseDir);

	if (await common.isFileAsync(nwPath.join(baseDir, "versions.py"))) {
		let verPy = await common.fileGetContents(nwPath.join(baseDir, "versions.py"));
		let result = "";
		
		let pyInfo = await this.getPythonInfo(gameFolder);
		let pattern = /Version[\s]*\([\s]*"fix"[\s]*,[\s]*[\d]+[\s]*,[\s]*"([\d.]+)"[\s]*,/;
		if (pyInfo.ver == 3) {
			pattern = /Version[\s]*\([\s]*"fix"[\s]*,[\s]*3[\s]*,[\s]*"([\d.]+)"[\s]*,/;
		} else {
			pattern = /Version[\s]*\([\s]*"fix"[\s]*,[\s]*2[\s]*,[\s]*"([\d.]+)"[\s]*,/;
		}
		verPy.replace(pattern, (all, ver)=> {
			result = ver;
		})

		return result;
	} else {
		let initPy = await common.fileGetContents(nwPath.join(baseDir, "__init__.py"));
		if (initPy.match(/version_tuple[\s]*=[\s]*\([\s]*([\d, ]+)/)) {
			let result = "";
			initPy.replace(/version_tuple[\s]*=[\s]*\([\s]*([\d, ]+)/, (all, ver)=> {
				let cleaned = ver.replaceAll(/[\s]+/g, "");
				let splited = cleaned.split(",")
				let vers = [];
				for (let i in splited) {
					if (!splited[i]) continue;
					vers.push(splited[i])
				}

				result = vers.join(".");
			})
			return result;
		} else if (initPy.match(/version[\s]*=[\s]*"Ren'Py ([\d.]+[\w]*)"/)) {
			let result = "";
			initPy.replace(/version[\s]*=[\s]*"Ren'Py ([\d.]+[\w]*)"/, (all, ver)=> {
				result = ver
			})
			return result;
		}
		
	}

	return "unknown"

}

RenUtils.prototype.getLowestPaths = function(paths) {
// get the most lowest path from collection of path
	if (!Array.isArray(paths)) return paths;
	paths = paths || [];
	var collections = {};
	var list = [];
	for (var i in paths) {
		var thisPath = nwPath.normalize(paths[i]);
		var num = thisPath.split("\\").length - 1;
		collections[num] = collections[num]||[];
		collections[num].push(thisPath);
		list.push(num)
	}
	
	var min = Math.min(...list);
	return collections[min]
		
}

RenUtils.prototype.determineGameFile = function(exePaths) {
	var renUtils = this;
	console.log("determine game exe from ", exePaths);
	if (typeof exePaths == 'string') exePaths = [exePaths];
	exePaths = exePaths || [];
	
	if (exePaths.length == 1) return Promise.resolve(exePaths[0]);

	exePaths = this.getLowestPaths(exePaths);

	var result = false;
	
	var promises = [];
	for (let i=0; i<exePaths.length; i++) {
		void function() {
			var thisPath = exePaths[i];
			promises.push(
				renUtils.isRenpyExe(thisPath, (isYes)=>{
					console.log("result of", thisPath, isYes);
					if (isYes) result = thisPath;
				})
			)
		}()
	}
	
	return new Promise((resolve, reject)=>{
		Promise.all(promises)
		.then(()=>{
			resolve(result)
		})
	})
	
}

RenUtils.prototype.playGame = async function(gameDir) {
	if (!gameDir) return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."))
	if (trans.project.entryPoint) {
		if (await common.isFileAsync(nwPath.join(gameDir, nwPath.basename(trans.project.entryPoint))))	return nw.Shell.openItem(nwPath.join(gameDir, nwPath.basename(trans.project.entryPoint)));
	}
	
	// we do it hard way
	var files = await fs.promises.readdir(gameDir);
	var exeFiles = files.filter((thePath) => {
		if (nwPath.extname(thePath).toLowerCase() == ".exe") return true;
	})

	console.log(exeFiles);
	var exeGame = this.determineGameFile(exeFiles);

	if (!exeGame) return alert("Can not determine your game exe file");
	nw.Shell.openItem(nwPath.join(gameDir, exeGame));
}

thisAddon.renUtils = new RenUtils();

// =====================================================================
// 							RenParser Object
// =====================================================================
var RenParser = function(dir, options, callback) {
	this.dir 				= nwPath.normalize(dir);
	this.options 			= options || {};
	this.translationData 	= this.options.translationData||{};
	this.contextSeparator 	= this.options.contextSeparator || "/"
	this.showBlank 			= this.options.showBlank || false;
	this.engineName			= 'renpy'
	this.callback 			= callback || function() {}
	this.promise;
	this.isInitialized 		= false;
	this.translatable 		= {};
	this.options.filterOptions = this.options.filterOptions || {};
	this.options.filterOptions.files = this.options.filterOptions.files || [];
}

RenParser.prototype.getRelativePath = function(stringPath) {
	stringPath = nwPath.normalize(stringPath);
	
	return stringPath.substring(this.dir.length, stringPath.length);
}


RenParser.prototype.readDir = async function(dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (error, files) => {
      if (error) {
        return reject(error);
      }
      Promise.all(files.map((file) => {
        return new Promise((resolve, reject) => {
          const filepath = nwPath.join(dir, file);
          fs.stat(filepath, (error, stats) => {
            if (error) {
              return reject(error);
            }
            if (stats.isDirectory()) {
              this.readDir(filepath).then(resolve);
            } else if (stats.isFile()) {
              resolve(filepath);
            }
          });
        });
      }))
      .then((foldersContents) => {
        resolve(foldersContents.reduce((all, folderContents) => all.concat(folderContents), []));
      });
    });
  });
	
}


RenParser.prototype.writeToFolder = async function(targetFolder) {
	for (var relPath in this.translatable) {
		var thisFile = this.translatable[relPath]
		
		var targetPath = nwPath.join(targetFolder, relPath);
		console.log("Writing file : ", targetPath);
		await ui.log("Writing file : "+ targetPath);
		try {
			fs.mkdirSync(nwPath.dirname(targetPath), {recursive:true});
		} catch(e) {
			console.warn("Unable to create directory ", nwPath.dirname(targetPath));
			throw(e);
		}
		
		/*
		var encoding = thisAddon.config.importEncoding || thisAddon.config.writeEncoding || thisFile.encoding || 'utf16le';
					//  setting from inject dialog     ||  setting from options          || file's original encoding || 'utf16le';
		
		// force UTF-8 if read encoding is ascii
		if (["ascii", "windows-1252", "cp-1252"].includes(encoding.toLowerCase())) encoding = "utf8";
		*/
		// force encoding to UTF-8. Renpy support it anyway.
		let encoding = "UTF-8";
		await thisFile.write(targetPath, encoding, false);
	}
	
}



RenParser.prototype.generateData = function(fileObject) {
	var result = {
		data:[],
		context:[],
		tags:[],
		parameters:[],
		indexIds:{}
	}
	if (!fileObject.translatableTexts) return result;
	for (var i=0; i<fileObject.translatableTexts.length; i++) {
		var thisObj = fileObject.translatableTexts[i];
		if (typeof result.indexIds[thisObj.text] == "undefined") result.indexIds[thisObj.text] = result.data.length;
		//result.indexIds[thisObj.text] = result.indexIds[thisObj.text] || result.data.length;
		
		var row = result.indexIds[thisObj.text];
		result.data[row] 		= result.data[row] || [thisObj.text, ""];

		result.context[row] 	= result.context[row]||[];
		result.context[row].push(thisObj.context.join(this.contextSeparator))

		if (thisObj.tags?.length) {
			result.tags[row] = Array.isArray(thisObj.tags) ? thisObj.tags : [thisObj.tags];
		}

		result.parameters[row] 	= result.parameters[row] || [];
		result.parameters[row].push(thisObj.parameters);
	}
	
	return result;
	
}

RenParser.prototype.toTrans = function() {
	if (this.isInitialized == false) return console.error('Not initialized, Run init() first!');
	var transData = {
		project:{
			gameEngine: this.engineName,
			files:{}
		}
	}
	
	// skip registering config on this folder
	const configSkipDir = ["/common", "/renpy"]

	for (var relpath in this.translatable) {
		// change \ to /
		
		var thisTranslatable = this.translatable[relpath]
		
		relpath = relpath.replace(/\\/g, "/")
		
		var thisData = {};
		
		
		var thisGenData = this.generateData(thisTranslatable);
		if (!this.showBlank) if (thisGenData.data.length < 1) continue;
		thisData = {};
		thisData.data 		= thisGenData.data
		thisData.context 	= thisGenData.context
		thisData.tags 		= thisGenData.tags
		thisData.parameters = thisGenData.parameters
		thisData.filename 	= nwPath.basename(relpath);
		thisData.basename 	= nwPath.basename(relpath);
		thisData.indexIds 	= thisGenData.indexIds
		//thisData.groupLevel 	= thisGenData.groupLevel;	
		thisData.extension 	= nwPath.extname(relpath);
		thisData.lineBreak 	= "\n";
		thisData.nwPath 	= relpath // path is relative path from cache dir
		thisData.relPath 	= relpath // relpath is real filename address on context	
		thisData.type 		= null; // no special type
		thisData.originalFormat = "Renpy's .rpy File";			
		thisData.dirname 		= nwPath.dirname(relpath);	
		
		transData.project.files[relpath] = thisData;
		
		//if (thisGenData.title) transData.project.gameTitle = thisGenData.title;
		if (configSkipDir.includes(thisData.dirname)) continue;
		//console.log("----Determining game title:", thisTranslatable)
		if (typeof thisTranslatable.configValue == 'object') {
			transData.project.gameTitle = transData.project.gameTitle || thisTranslatable.configValue?.name || thisTranslatable.configValue?.window_title || ""
			transData.project.version = transData.project.version|| thisTranslatable.configValue.version || ""
		}
	
	}
	console.log("Returned trans data", transData);
	return transData;
	
}

RenParser.prototype.isMatchFilter = function(filePath) {
	// accept all for blank array
	if (this.options.filterOptions.files.length == 0) return true;
	if (typeof this.options.filterOptions.files == 'string') {
		if (this.options.filterOptions.files == filePath) return true;
	}
	if (this.options.filterOptions.files.includes(filePath)) {
		console.log("Match filter : ", filePath);
		return true;
	}

	return false;
}

RenParser.prototype.init = async function() {
	RenParser.actorList = {};
	const limit = pLimit(8);
	return new Promise(async (resolve, reject) =>{
		var files = await this.readDir(this.dir)
		const jobs = [];
		for (var i=0; i<files.length; i++) {
			const thisFile = files[i];
			const relativePath = this.getRelativePath(thisFile);
			const relativePathInv = relativePath.replace(/\\/g, "/");

			if (!this.isMatchFilter(relativePathInv)) continue;
			if (nwPath.extname(thisFile).toLowerCase() !== ".rpy") continue;

			const translationPair = this.translationData[relativePathInv] || {};
			const thisOptions = Object.assign({}, this.options, translationPair);

			jobs.push(limit(async () => {
				await ui.log("Parsing : " + thisFile);
				if (typeof this.options.onParseStart === "function") {
					this.options.onParseStart(nwPath.basename(thisFile));
				}

				var parsedRpy = await parseRpyWithWorkerFallback(thisFile, thisOptions);
				var thisRpy = parsedRpy.fileObject;
				Object.assign(RenParser.actorList, parsedRpy.actorList || {});
				console.log("Renpy object:", thisRpy);
				this.translatable[relativePath] = thisRpy;
			}));
		}

		await Promise.all(jobs);
		
		this.isInitialized = true;
		resolve();

	})

	
}

RenParser.isRenpyExe = async function(exePath) {
	return thisAddon.hasRenpySignature(exePath);
}

RenParser.getActorReferenceData = function() {
	ui.log("Generating actor reference data");
	console.log("RenParser.getActorReferenceData", RenParser.actorList);
	if (!RenParser.actorList) return;
	const result = [];
	for (let i in RenParser.actorList) {
		result.push([i, RenParser.actorList[i]])
	}

	return result;
}

window.RenParser = RenParser

thisAddon.normalizeInitOptions = function(info) {
	info = info || {};
	const normalized = JSON.parse(JSON.stringify(info));
	if (normalized.entryPoint && !normalized.sourceDir) {
		normalized.sourceDir = nwPath.dirname(normalized.entryPoint);
	}
	if (typeof normalized.excludeCommands == "string") {
		normalized.excludeCommands = normalized.excludeCommands.replaceAll(/[\s]+/g, " ").trim();
		normalized.excludeCommands = normalized.excludeCommands ? normalized.excludeCommands.split(" ") : [];
	}
	if (normalized.excludeCommands && Array.isArray(normalized.excludeCommands) == false) {
		normalized.excludeCommands = [normalized.excludeCommands];
	}
	return normalized;
}





// =====================================================================
// 							COMMON
// =====================================================================

thisAddon.createProjectFromSource = async function(sourceDir, options) {
	options = options || {}
	const initOptions = thisAddon.normalizeInitOptions({
		...(options.init || {}),
		entryPoint: options.entryPoint || options.init?.entryPoint,
		sourceDir: sourceDir
	});
	var projectId 		= common.makeid(10);
	var stagePath 		= nwPath.join(common.getStagePath(),projectId);
	var rpyFiles 		= [];
	var renParser;
	var renpyVersion;
	try {
		renpyVersion = await thisAddon.renUtils.getVersion(sourceDir);
	} catch(e) {
		renpyVersion = "unknown";
	}

	ui.log("Creating a new RenPy project with option", options);
	ui.log("From", sourceDir);
	ui.log("Detected renpy version:", renpyVersion);
	await thisAddon.renUtils.makeEditable(sourceDir)

	console.log("Copying file to stage. From",sourceDir, " TO", nwPath.join(stagePath, "game"));
	fs.mkdirSync(nwPath.join(stagePath, "game"), {recursive:true});

	await ui.log(`Copy from ${sourceDir} to ${nwPath.join(stagePath, "game")}`);
	await bCopy(sourceDir, nwPath.join(stagePath, "game"), {
		filter: function(src, dest) {
			if (nwPath.extname(dest).toLowerCase() == '.rpy') {
				console.log("copying ",src, dest);
				ui.loadingProgress("Preparing", "Copying : "+src, {consoleOnly:true, mode:'consoleOutput'});
				rpyFiles.push(dest)
				return true;
			}
			return false;
		},
		overwrite:true
	})

	console.log('Running renParser')
	ui.loadingProgress("Processing", "Parsing file", {consoleOnly:true, mode:'consoleOutput'});
	renParser = new RenParser(sourceDir, {
		entryPoint 		: initOptions.entryPoint,
		excludeCommands	: initOptions.excludeCommands,
		onParseStart 	: function(currentFile) {
			ui.loadingProgress("Processing", "Processing "+currentFile, {consoleOnly:true, mode:'consoleOutput'});
		}
	});

	await renParser.init()
	try {
		var transData = renParser.toTrans();
		transData.project.projectId = projectId;
		transData.project.cache 	= transData.project.cache||{};
		transData.project.cache.cachePath = stagePath;
		transData.project.loc 		= sourceDir;
		transData.project.options 	= transData.project.options || {}
		transData.project.options.literalTags 	= options.literalTags || []
		transData.project.options.init = initOptions;
		transData.project.parser	= thisAddon.package.name;
		transData.project.parserVersion	= thisAddon.package.version;
		transData.project.entryPoint = initOptions.entryPoint
		transData.project.gameEngine = transData.project.gameEngine || thisAddon.gameEngine;
		transData.project.files 	||= {};
		transData.project.files["Actor Reference"] = trans.createFileData("Actor Reference", {
			originalFormat 	: "TRANSLATOR++ GENERATED TABLE",
			type			: "reference",
			dirname			: "*",
			data			: RenParser.getActorReferenceData() || []
		});

		var gameInfo = {
			title : transData.project.gameTitle
		}

		fs.writeFileSync(nwPath.join(stagePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2))

		ui.loadingProgress("Processing", "Parsing done!", {consoleOnly:true, mode:'consoleOutput'});
		ui.loadingProgress("Processing", "Creating new Project.", {consoleOnly:true, mode:'consoleOutput'});
		console.warn("trans data : ", transData);

		trans.openFromTransObj(transData, {isNew:true});
		ui.loadingProgress("Done", "All done", {consoleOnly:true, mode:'consoleOutput'});
		ui.loadingEnd("Done", "Done");
		trans.autoSave();
		ui.showCloseButton();
	} catch(message)  {
		console.log("terminated prematurely");
		console.warn(message)
		if (message) ui.loadingProgress("Processing", message, {consoleOnly:true, mode:'consoleOutput'});
		ui.loadingProgress("Done", "All done", {consoleOnly:true, mode:'consoleOutput'});
		ui.loadingEnd("Done", "Done");
		ui.showCloseButton();
	}
}


thisAddon.getStageGamePath = function(transData) {
	transData = transData || trans.getSaveData();
	return nwPath.join(transData?.project?.cache?.cachePath || trans.project.cache.cachePath, "game");
}


thisAddon.exportToFolder = async function(targetDir, transData, options) {
	console.log("Running exportToFolder", arguments);
	ui.log("Exporting RenPy's project with options", options);
	ui.log("Target directory", targetDir);
	options = options||{};
	transData = transData || trans.getSaveData();
	trans.project.options 	= trans.project.options || {};
	options.literalTags 	= options.literalTags || trans.project.options.literalTags || [];
	options.writeEncoding 	= thisAddon.config.writeEncoding || options.writeEncoding || trans.project.writeEncoding;
	const sourceDir 		= options.resourcePath || thisAddon.getStageGamePath(transData);
	const transDataClone 	= JSON.parse(JSON.stringify(transData));
	var translationData 	= options.translationDatas || trans.getTranslationData(transDataClone, options);
	console.warn("====================================")
	console.log("captured options", options);
	console.log(JSON.stringify(options, undefined, 2));

	console.log("translation Data : ", translationData);
	var renParser = new RenParser(sourceDir, {
		'writeMode' : true,
		'translationData': translationData.translationData,
		'writeEncoding' : thisAddon.config.writeEncoding||options.writeEncoding,
		'literalTags' : options.literalTags,
		'onParseStart' : function(currentFile) {
			ui.loadingProgress("Processing", "Processing "+currentFile, {consoleOnly:true, mode:'consoleOutput'});
		},
		excludeCommands	: transData?.project?.options?.init?.excludeCommands,
		filterOptions : options.options
	});

	await renParser.init();
	console.warn("renparser", renParser)
	await renParser.writeToFolder(targetDir);
	return Object.keys(renParser.translatable).map((relPath) => nwPath.join(targetDir, relPath));
}


thisAddon.handleExport = async function(targetPath, options) {
	ui.showLoading();
	try {
		if (options.mode == "zip") {
			ui.loadingProgress("Processing", "Exporting as a zip", {consoleOnly:false, mode:'consoleOutput'});
			ui.log("Target path: ", targetPath);
			ui.log("Exporting with options: ", options);
			var tmpPath = nwPath.join(nw.process.env.TMP, trans.project.projectId);
			fs.removeSync(tmpPath);
			fs.mkdirSync(tmpPath, {recursive:true});
			await thisAddon.exportToFolder(tmpPath, undefined, options);
			var _7z = require('7zip-min');
			await new Promise((resolve, reject) => {
				_7z.cmd(['a', '-tzip', targetPath, tmpPath+'\\*'], (err) => {
					if (err) return reject(err);
					resolve(targetPath);
				});
			});
		} else if (options.mode == "dir") {
			ui.loadingProgress("Processing", "Exporting to directory", {consoleOnly:false, mode:'consoleOutput'});
			ui.log("Target directory: ", targetPath);
			ui.log("Exporting with options: ", options);
			await thisAddon.exportToFolder(targetPath, undefined, options);
		}
	} catch (e) {
		ui.loadingEnd();
		throw new Error(e);
	}
	ui.loadingProgress("Completed", "Completed!", {consoleOnly:false, mode:'consoleOutput'});
	ui.loadingEnd();
}


thisAddon.injectCopyMaterials = async function(sourceDir, targetDir, injectOption) {
	if (await common.isFileAsync(sourceDir)) {
		sourceDir = nwPath.dirname(sourceDir);
	}
	return await AddonUtils.prototype.injectCopyMaterials.call(thisAddon, sourceDir, targetDir, injectOption);
}


thisAddon.injectDone = async function(targetDir, sourceMaterial, options) {
	if (typeof thisAddon.afterInject == "function") {
		await thisAddon.afterInject(targetDir, sourceMaterial, options);
	}
	let exeFile = false;
	try {
		const files = await fs.promises.readdir(targetDir);
		const exeFiles = files
			.filter((thePath) => nwPath.extname(thePath).toLowerCase() == ".exe")
			.map((thePath) => nwPath.join(targetDir, thePath));
		exeFile = await thisAddon.renUtils.determineGameFile(exeFiles);
	} catch (e) {
		console.warn("Can not determine output executable", e);
	}
	ui.loadingProgress("Completed", "Completed!", {consoleOnly:false, mode:'consoleOutput'});
	if (exeFile) {
		ui.LoadingAddButton("Open folder", function() {
			nw.Shell.showItemInFolder(exeFile);
		}, {
			class: "icon-folder-open"
		});
		ui.LoadingAddButton("Play!", function() {
			nw.Shell.openItem(exeFile);
		}, {
			class: "icon-play"
		});
	} else {
		await ui.log.showOpenDirButton(targetDir);
	}
	ui.log.end();
	ui.showCloseButton();
	return common.halt();
}


thisAddon.prepareNewProject = async function(info) {
	const initOptions = thisAddon.normalizeInitOptions(info);
	const sourceDir = initOptions.sourceDir || (initOptions.entryPoint ? nwPath.dirname(initOptions.entryPoint) : "");
	if (!sourceDir) {
		await ui.logError("Can not refresh Ren'Py project: source directory is missing from the saved project options.");
		return;
	}
	await thisAddon.createProjectFromSource(sourceDir, {
		entryPoint: initOptions.entryPoint,
		init: initOptions
	});
}

function init() {
	// handling 3rdParty :
	//thirdParty.loadConfig("www\\addons\\unityTrans\\3rdParty.json");
	
	var $slide = $(`
		<div class="renParserSlide">
			<h1><i class="icon-plus-circled"></i>Renpy game</h1>
			<div class="blockBox infoBlock withIcon">
				<h2>renParser Ver.`+thisAddon.package.version+`</h2>
				<p>This parser is still under active development.</p>
			</div>
			<div class="blockBox warningBlock withIcon">
				<h1>Please backup your project!</h1>
				<p>
					This action will convert your game into an editable project. <br />
					The selected Renpy Game will be modified. <br />
					And if the process is failed, there is a chance that your game will be broken and unplayable.
				</p>
			</div>
			<div class="renParserCustomField"></div>
		</div>`);

	let customField;

	const createProject = async function() {
		if (!customField) {
			return alert(t("Error: form not ready."));
		}
		const value = customField.getValues
			? customField.getValues()
			: customField.getFormValues();
		if (!value?.decompileRpyc) {
			var conf = confirm(t("Are you sure want to start a project without decompiling the rpyc files?"));
			if (!conf) return;
		}
		if (!value?.entryPoint) {
			return alert(t("Please select the game executable file."));
		}
		if (!await common.isFileAsync(value.entryPoint)) {
			return alert(t("Invalid executable path")+"\n"+value.entryPoint);
		}
		if (!await RenParser.isRenpyExe(value.entryPoint)) {
			var continueAnyway = confirm(t("The file you're selected is not a Ren'Py game executable file.\nDo you want to continue anyway?"));
			if (!continueAnyway) return;
		}

		thisAddon.config.decompileRpyc = !!value.decompileRpyc;
		thisAddon.config.overwriteRpy = !!value.overwriteRpy;

		const initSetting = {
			excludeCommands: Array.isArray(value.excludeCommands) ? value.excludeCommands.filter(Boolean) : []
		};
		initSetting.entryPoint = value.entryPoint;
		initSetting.sourceDir = nwPath.dirname(value.entryPoint);

		ui.showLoading();
		ui.loadingProgress("Processing", "Processing : "+initSetting.sourceDir, {consoleOnly:true, mode:'consoleOutput'});
		ui.loadingProgress("Processing", "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});
		ui.newProjectDialog.close();

		await thisAddon.createProjectFromSource(initSetting.sourceDir, {
			entryPoint: value.entryPoint,
			init: initSetting
		});
	};
	
	ui.newProjectDialog.addMenu({
		icon : "addons/renParser/icon.png",
		descriptionBar : `<h2>Ren'Py Games</h2>
						<p>Start translation from Renpy Games</p>`,
		actionBar: "",
		goToSlide: 'renpy',
		at:3,
		slides : {
			'renpy': ui.newProjectDialog.newSlide('renpy', $slide, {
				buttons: [
					{
						text: t("Create Project"),
						icon: "ui-icon-check",
						click: async function() {
							await createProject();
						}
					}
				],
				onActive: () => {
					customField = new CustomFields($("<form></form>"), {
						jsonForm: {
							schema: {
								entryPoint: {
									type: "string",
									title: t("Game Exe"),
									description: t("Path to the Ren'Py game executable file (.exe). This will be stored as the project's entry point for refresh and launch actions."),
									required: true,
								},
								decompileRpyc: {
									type: "boolean",
									title: t("Decompile all rpyc files"),
									description: t("Attempt to decompile all rpyc files into .rpy before the project is created."),
									default: !!thisAddon.config.decompileRpyc,
								},
								overwriteRpy: {
									type: "boolean",
									title: t("Overwrite rpy"),
									description: t("If checked then the decompiler will overwrite existing uncompiled rpy files."),
									default: !!thisAddon.config.overwriteRpy,
								},
								excludeCommands: {
									type: "array",
									title: t("Exclude command"),
									description: t("Commands listed here will be ignored during parsing. Add one command per tag."),
									items: {
										type: "string"
									},
									default: [],
								},
							},
							form: [
								{
									key: "entryPoint",
									type: "selectfile",
									accept: ".exe",
								},
								{
									key: "decompileRpyc",
									type: "checkbox",
									onChange: function(evt) {
										const isChecked = $(evt.target).prop("checked");
										$(evt.target).closest("form").find("[name='overwriteRpy']").prop("disabled", !isChecked);
									}
								},
								{
									key: "overwriteRpy",
									type: "checkbox",
								},
								{
									key: "excludeCommands",
									type: "tag",
									placeholder: t("old"),
								},
							],
							value: {
								entryPoint: "",
								decompileRpyc: !!thisAddon.config.decompileRpyc,
								overwriteRpy: !!thisAddon.config.overwriteRpy,
								excludeCommands: [],
							}
						}
					});
					$slide.find(".renParserCustomField").empty().append(customField.getElm());
					const $form = $slide.find(".renParserCustomField form");
					$form.find("[name='overwriteRpy']").prop("disabled", !$form.find("[name='decompileRpyc']").prop("checked"));
				}
			})
		}
	})

	if (window.engineDetectionRegistry && !window.engineDetectionRegistry.definitions.has("renpy")) {
		window.engineDetectionRegistry.register({
			id: "renpy",
			addonId: thisAddon.id,
			engineIds: supportedEngines,
			displayName: "Ren'Py",
			priority: 100,
			detect: async function(request) {
				const entryPoint = request.entryPoint;
				if (!await thisAddon.hasRenpySignature(entryPoint)) return { matches: [] };

				return {
					matches: [{
						engineId: "renpy",
						confidence: 1,
						evidence: ["Found Ren'Py game, runtime, and launcher files."],
						entryPoint,
						gameRoot: nwPath.dirname(entryPoint),
						preferredInput: "entryPoint"
					}]
				};
			},
			openProjectWizard: async function(candidate, launchContext) {
				ui.newProjectDialog.gotoSlide("renpy", "engineDetectResult");
				if (!customField) throw new Error("Ren'Py project form is not ready.");
				window.engineDetectionRegistry.setFieldValue(
					customField.$elm.find("[name='entryPoint']"),
					launchContext.entryPoint
				);
			}
		});
	}

	// register handler
	if (typeof window.engines.renpy == 'undefined') engines.add('renpy');

	engines.addHandler(supportedEngines, "onLoadTrans", async () => {
		require('prismjs/components/prism-renpy');

		//var appIcon =  "addons/renParser/icon.png"
		ui.ribbonMenu.add("renpy", {
			title : trans.gameEngine.toUpperCase(),
			toolbar : {
				buttons : {
					play : {
						icon : "icon-play",
						title : t("Play last build"),
						onClick : async () => {
							if (await common.isDirectory(trans.project.devPath) == false) {
								return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."));
							}
							thisAddon.renUtils.playGame(trans.project.devPath);
						}
					},
					loadPlugins : {
						icon : "icon-help-circled-1",
						title : t("Open Ren'Py documentation"),
						onClick : async () => {
							nw.Shell.openExternal('https://dreamsavior.net/docs/translator/renpy/');
						}
					},
					
				}
			}
		})
		
		// check version
		thisAddon.config = thisAddon.config || {};
		if (common.versionToFloat(trans.project.editorVersion) < common.versionToFloat("3.9.15") && trans.project.parser == "rmmvjs") {
			var popupOption = {
				title: "Project requires update",
				buttons : [
					{
						text: "Switch to old parser",
						icon: "ui-icon-close",
						click: function() {
							thisAddon.config.useLegacyParser = true;
							alert(t("The option has been set to use the legacy parser.\nYou can switch back to the new parser anytime via option menu."));
							$(this).dialog( "close" );
						}
					},{
						text: "Close",
						icon: "ui-icon-close",
						click: function() {
							$(this).dialog( "close" );
						}
					}
				]
			}
			var content = $(`
			<h1>${(`This project is not compatible with the current parser`)}</h1>
			<p>${(`Your project is created with the older version of the parser. Some features may not be compatible with the current version.`)}</p>
			<p><b>${(`Advice:`)}</b> ${(`Create a new project and then import the translation of the current project into the newly created project.`)} <a href="https://dreamsavior.net/docs/translator/getting-started/updating-a-project/" external>${(`(read more on the documentation)`)}</a></p>
			<p>${(`Or alternatively you can also switch back to the old version of parser on the options menu (not recomended though, since the old parser is deprecated).`)}</p>`)
			await ui.showPopup("rmmv_rquireUpgrade", content, popupOption);
		}

		// Show warning if opened file is created with the lower version of Renpy
		if (common.versionToFloat(trans.project?.parserVersion) < common.versionToFloat(thisAddon.package.version)) {
			var msg = `This trans file was created with an older version of ${thisAddon.package.name} than the one you are currently using.<br /><br />`;
			msg += `The current version of your ${thisAddon.package.name} : ver. <b>${thisAddon.package.version}</b><br />`;
			if (trans.project?.parserVersion) msg += `This trans file was created with version: ver. <b>${trans.project?.parserVersion}</b>`;
			msg += `<br /><br />You can keep working on your translation project. But, there is a possibility that your translation will not be exported or injected correctly. If that happens, it is highly recommended to <a href="https://dreamsavior.net/docs/translator/getting-started/refreshing-project/" external>refresh your translation project.</a>`
			ui.showPopup("renpyLowerVersion", msg, {width:420, height:340, rebuild:true})
		}
		
	})

	AddonUtils.applyCommonHandlers(supportedEngines, thisAddon);

	var allowedExtension = [".rpy"];
	engines.addHandler(["renpy"], 'onLoadSnippet', async function(selectedCell) {
		console.log("Renpy onLoadSnippet handler");
		console.log("selected cell:", selectedCell);
		var obj = trans.getSelectedObject();

		if (allowedExtension.includes(obj.extension) == false) return;

		this.commonHandleFile(selectedCell, "renpy");

	});	
	
}

$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});