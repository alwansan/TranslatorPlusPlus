const { parentPort, workerData } = require("worker_threads");
const Module = require("module");
const nwPath = require("path");

process.env.NODE_PATH = process.cwd();
Module._initPaths();

global.window = global.window || {};
global.nwPath = global.nwPath || nwPath;
global.ui = global.ui || {
	log: async function() {},
};
global.common = global.common || {
	generateId() {
		return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
	},
	clone(value) {
		if (typeof value === "undefined") return undefined;
		return JSON.parse(JSON.stringify(value));
	},
	getEncodingName(string) {
		if (!string) return "";
		const normalizeEncoding = (str) => {
			str = str.toLowerCase().trim();
			str = str.replace("utf-", "utf");
			str = str.replace("sjis", "shift-jis");
			str = str.replaceAll("_", "-");
			return str;
		};

		if (Array.isArray(string)) {
			return string.map(normalizeEncoding);
		}

		return normalizeEncoding(string);
	},
	detectEncoding(buffer) {
		if (buffer?.[0] === 0xEF && buffer?.[1] === 0xBB && buffer?.[2] === 0xBF) return "utf8";
		if (buffer?.[0] === 0xFE && buffer?.[1] === 0xFF) return "utf16be";
		if (buffer?.[0] === 0xFF && buffer?.[1] === 0xFE) return "utf16le";

		this.jsChardet = this.jsChardet || require("jschardet");
		const maxLength = 1024 * 256;
		const result = this.jsChardet.detect(buffer.subarray(0, maxLength));
		const encoding = Array.isArray(result) ? result[0]?.encoding : result?.encoding;
		return this.getEncodingName(encoding) || "utf8";
	},
};
global.empty = global.empty || function(mixedVar) {
	if (Array.isArray(mixedVar)) return mixedVar.length === 0;
	if (mixedVar == null) return true;
	if (typeof mixedVar === "object") return JSON.stringify(mixedVar) === "{}";
	return !mixedVar;
};

class RpyFile extends require("www/js/ParserBase.js").ParserFile {
	constructor(file, options, callback) {
		super(file, options, callback);
		this.uniqueId = common.generateId();
		this.filterOutRegexp = new RegExp(`-\\?Escape_${this.uniqueId}_(\\d+)_([\\[\\]\\{\\}\\%])\\?-`, "g");
		this.excludeCommands = options?.excludeCommands;
	}
}

const actorList = {};

RpyFile.prototype.unIndent = function(text, indentLevel) {
	var tmpText = text.split("\n");
	for (var i = 1; i < tmpText.length; i++) {
		if (tmpText[i].substring(0, indentLevel).trim() !== "") continue;
		tmpText[i] = tmpText[i].substring(indentLevel);
	}
	return tmpText.join("\n");
}

RpyFile.prototype.reIndent = function(text, indentLevel) {
	var tmpText = text.split("\n");
	var paddingLeft = " ".repeat(indentLevel);
	for (var i = 1; i < tmpText.length; i++) {
		tmpText[i] = paddingLeft + tmpText[i];
	}
	return tmpText.join("\n");
}

RpyFile.prototype.filterText = function(text, context, parameters) {
	var uniqueId = this.uniqueId;
	try {
		text = text.replaceAll(/([\\]*)([\%\[\]\{\}])/g, function(match, backslashes, char) {
			return `-?Escape_${uniqueId}_${backslashes.length}_${char}?-`;
		});

		if (["'''", '"""'].includes(parameters.enclosure)) {
			text = text.replaceAll("`", "\\`");
			text = eval("`" + text + "`");
			text = this.unIndent(text, parameters.lineIndent);
		} else {
			text = eval(parameters.enclosure + text + parameters.enclosure);
		}

		text = text.replaceAll(this.filterOutRegexp, function(match, backslashes, char) {
			return "\\".repeat(parseInt(backslashes)) + char;
		});
	} catch (e) {
		console.warn("error filtering text : ", text, e);
		return text;
	}
	return text;
}

RpyFile.prototype.unfilterText = function(text, context, parameters) {
	var uniqueId = this.uniqueId;
	try {
		text = text.replaceAll(/([\\]*)([\%\[\]\{\}])/g, function(match, backslashes, char) {
			return `-?Escape_${uniqueId}_${backslashes.length}_${char}?-`;
		});

		if (["'''", '"""'].includes(parameters.enclosure)) {
			text = this.reIndent(text, parameters.lineIndent);
			text = text.replaceAll('"', '\\"');
			text = text.replaceAll("'", "\\'");
		} else {
			text = JSON.stringify(text);
			text = text.substring(1, text.length - 1);
			text = text.replaceAll("'", "\\'");
		}
		text = text.replaceAll(this.filterOutRegexp, function(match, backslashes, char) {
			return "\\".repeat(parseInt(backslashes)) + char;
		});
	} catch (e) {
		console.warn("Error when trying to translate : ", arguments);
		throw e;
	}

	return text;
}

RpyFile.prototype.registerConfig = function(config, configValue) {
	if (!config) return;
	this.configValue = this.configValue || {};
	this.configValue[config] = configValue;
}

RpyFile.fetch = function(theString, parentObject) {
	var that = parentObject || this;
	var chunkOffset = [0];
	var commentsOffset = [];
	var shadowString;

	var getStartingLine = function(string, offset) {
		for (var i = offset; i >= 0; i--) {
			if (string[i] == "\n") return i + 1;
		}
		return i;
	}

	var isInsideCommand = function(offset) {
		for (var i = 0; i < commentsOffset.length; i++) {
			var thisCommentOffset = commentsOffset[i];
			if (thisCommentOffset.start < offset && thisCommentOffset.end > offset) return true;
		}
		return false;
	}

	var isComment = function(string, offset) {
		var startingLine = getStartingLine(shadowString, offset);
		var leftString = shadowString.substring(startingLine, offset);
		leftString = leftString.replaceAll(/("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2|(?:^#?(?:(?:[0-9a-fA-F]{2}){3}|(?:[0-9a-fA-F]){3})$)/gm, "");
		if (leftString.includes('#')) return true;
		return false;
	}

	var insertActorReferenceData = (currentString, leftHandString) => {
		if (that.options?.writeMode) return;
		if (!leftHandString || !currentString) return;
		if (leftHandString.trim().substring(0, 6) !== "define") return;
		const pattern = /[ \t]*define[ \t]+([\w]+)[ \t]*=[ \t]*(Character|DynamicCharacter)[ \t]*\([ \t]*["']+/u;
		if (leftHandString.trim().replace(pattern, "") !== "") return;
		leftHandString.replace(pattern, (full, symbol) => {
			actorList[symbol] = currentString;
		});
	}

	const getActor = (leftHandString) => {
		var cleanText = leftHandString.trim();
		var components = cleanText.replaceAll(/[ ]+/g, " ").split(" ");
		if (components.length > 2) return "";

		var leftHand = components[0].trim();
		if (leftHand.match(/[\p{Zs}\p{P}]+/gu)) return "";
		return leftHand;
	}

	const isExcludedCommand = (command) => {
		if (!command) return false;
		if (!that.excludeCommands) return false;
		if (!Array.isArray(that.excludeCommands)) return false;
		if (that.excludeCommands.length == 0) return false;
		if (!that.excludeCommands.includes(command)) return false;
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

		// show text is a special case, because it can be used to show a text box with a string literal, but it can also be used to show a text box with a variable or expression. We want to allow the former, but not the latter.
		//if (trimmed.match(/^(image|scene|show|hide|play|queue|voice|stop|screen|style|style_group|transform|layeredimage)\b/)) return true;
		if (trimmed.match(/^(image|scene|hide|play|queue|voice|stop|screen|style|style_group|transform|layeredimage)\b/)) return true;
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

	theString.replace(/\/\*(.+?)\*\//gs, function() {
		commentsOffset.push({
			start: arguments[2],
			end: arguments[2] + arguments[0].length,
		});
		return arguments[0];
	});

	shadowString = theString.replace(/("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2|(?:^#?(?:(?:[0-9a-fA-F]{2}){3}|(?:[0-9a-fA-F]){3})$)/gm, function() {
		return "=".repeat(arguments[0].length);
	});

	theString.replace(/("""|''')[\s\S]+?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2|(?:^#?(?:(?:[0-9a-fA-F]{2}){3}|(?:[0-9a-fA-F]){3})$)/gm, function() {
		var quote = arguments[1] || arguments[2] || "";
		var offset = arguments[3] + quote.length;
		var text = arguments[4];
		var endOffset = offset + arguments[0].length - (quote.length * 2);
		var lastOffset = chunkOffset[chunkOffset.length - 1] || 0;
		var lines = text.substring(0, offset).split("\n");
		var lineCount = lines.length;

		var leftSideOfTheText = lines[lines.length - 1];
		var marginLeft = leftSideOfTheText.length - leftSideOfTheText.trimStart().length;
		var cols = leftSideOfTheText.length;
		var firstWord = "";
		try {
			firstWord = leftSideOfTheText.trim().split(" ")[0];
		} catch {
		}

		that.register(text.substring(lastOffset, offset));

		let rowCommand = getActor(leftSideOfTheText);
		var thisString = text.substring(offset, endOffset);
		const statementTags = getSuspiciousStatementTags(leftSideOfTheText, thisString);

		if (!isInsideCommand(offset) && !isComment(text, offset) && !isExcludedCommand(rowCommand) && !isNonTranslatableStatement(leftSideOfTheText, thisString)) {
			var context = ["line", lineCount, "col", cols, "cmd", firstWord];

			leftSideOfTheText.replace(/\s*config\.(\w*)\s*=\s*/, function(match, key) {
				that.registerConfig(key, that.filterText(thisString, context, {
					start: offset,
					end: endOffset,
					enclosure: quote,
					lineIndent: marginLeft,
				}));
				return match;
			});

			insertActorReferenceData(thisString, leftSideOfTheText);

			if (rowCommand) {
				that.registerString(thisString, context, {
					start: offset,
					end: endOffset,
					enclosure: quote,
					lineIndent: marginLeft,
					rowInfoText: rowCommand,
				}, {
					tags: statementTags,
				});
			} else {
				that.registerString(thisString, context, {
					start: offset,
					end: endOffset,
					enclosure: quote,
					lineIndent: marginLeft,
				}, {
					tags: statementTags,
				});
			}
		} else {
			that.register(text.substring(offset, endOffset));
		}

		chunkOffset.push(endOffset);
		return arguments[0];
	});

	var lastOffset = chunkOffset[chunkOffset.length - 1] || 0;
	that.register(theString.substring(lastOffset));
}

RpyFile.prototype.parse = async function() {
	this.contextEnter(nwPath.basename(this.file));
	this.string = await this.readFile(this.file);
	RpyFile.fetch.call(this, this.string);
	this.contextEnd();
	return this;
}

const parse = async () => {
	const parsedFile = new RpyFile(workerData.file, workerData.parserOptions || {});
	await parsedFile.parse();

	return {
		translatableTexts: parsedFile.translatableTexts,
		writableData: parsedFile.writableData,
		configValue: parsedFile.configValue || {},
		actorList,
		detectedEncoding: parsedFile.detectedEncoding,
		encoding: parsedFile.encoding,
	};
}

parse()
	.then((result) => {
		parentPort.postMessage({ result });
		parentPort.close();
	})
	.catch((error) => {
		parentPort.postMessage({
			error: {
				message: error.message,
				stack: error.stack,
			},
		});
		parentPort.close();
	});