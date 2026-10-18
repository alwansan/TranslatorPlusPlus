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
var iconv 		= require('iconv-lite');
var fs 			= fs || require('graceful-fs');
// var fse 		= require('fs-extra')

/**
 * A base class for parsers that handle text parsing with various options.
 * @class
 */
class ParserBase {
	/**
     * @constructor
     * @param {string|Object} script - The input script to be parsed.
     * @param {Object} options - Additional options for the parser.
     * @param {Function} options.onParseStart - Callback function called when parsing starts.
     * @param {Function} options.onParseEnd - Callback function called when parsing ends.
     * @param {string} options.readEncoding - Force this encoding when reading.
     * @param {string} options.writeEncoding - Force into this encoding when writing.
     * @param {string} options.defaultEncoding - Default encoding if not specified (default is "utf8").
     * @param {Object} options.translationPair - Translation pair for the parser.
     * @param {Object} options.translationInfo - Additional translation information.
     * @param {string} options.contextSeparator - Separator for context (default is "/").
     * @param {string|undefined} options.baseParameter - Base parameter for the parser.
     * @param {Array} options.baseContext - Base context for the parser.
     * @param {Array} options.baseTags - Base tags for the parser.
     * @param {number} options.debugLevel - Debugging level for the parser (default is 0).
     */
    constructor(script, options) {
        this.script 				= script;
        this.options 				= options || {}
        this.options.onParseStart 	= this.options.onParseStart || function(){}
        this.options.onParseEnd 	= this.options.onParseEnd || function(){}
        this.readEncoding 			= this.options.readEncoding // force this encoding when reading
        this.writeEncoding 			= this.options.writeEncoding // force into this encoding when writing
        this.defaultEncoding		= this.options.defaultEncoding || "utf8";
		this.encoding; // private, actual encoding currently used on the data
        this.translationPair 		= this.options.translationPair || {}
        this.translationInfo 		= this.options.translationInfo || {};
        this.contextSeparator		= this.options.contextSeparator || "/"
		this.baseParameter			= this.options.baseParameter || undefined;
        this.baseContext        	= this.options.baseContext || [];
        this.baseTags	        	= this.options.baseTags || [];
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};		
        this.translatableTexts 		= [];
        this.writableData 			= []; // array represents copy of the writable data
        this.currentContext 		= [];
        this.buffer;
        this.string;
        this.debugLevel             = this.options.debugLevel||0;
        this.promise;
		
		if (!empty(this.baseContext)) {
			this.contextEnter.apply(this, this.baseContext);
		}
    }
}

ParserBase.prototype.setScript = function(script) {
	this.script = script;
	return this;
}

ParserBase.mergeTransObj = function(transObj, newTransObj) {
    // check if index is already exist
    if (!newTransObj?.data?.length) return transObj
    transObj.data ||= [];
    transObj.context ||= [];
    transObj.indexIds ||= {}
    transObj.parameters||= [];
    transObj.tags||= [];
    transObj.contextTranslation||= [];
    function makeUnique(array) {
        return [...new Set(array)];
    }

    for (let rowId=0; rowId<newTransObj.data.length; rowId++) {
        let newRow = newTransObj.data[rowId]
        let thisNewText = newRow[0];
        if (!thisNewText) continue;
        var newRowId = transObj.indexIds[thisNewText]
        if (typeof newRowId == "undefined") {
            newRowId = (transObj.data.push(newRow)) -1;
            transObj.indexIds[thisNewText] = newRowId;
            transObj.context[newRowId] = newTransObj.context[rowId];
            if (newTransObj?.parameters?.[rowId]?.length) transObj.parameters[newRowId] = newTransObj.parameters[rowId];
            if (newTransObj?.tags?.[rowId]?.length) transObj.tags[newRowId] = newTransObj.tags[rowId];
            if (newTransObj?.contextTranslation?.[rowId]?.length) transObj.contextTranslation[newRowId] = newTransObj.contextTranslation[rowId];
        } else {
            if (newTransObj?.tags?.[rowId]?.length) transObj.tags[newRowId] = makeUnique((transObj.tags[newRowId]||[]).concat(newTransObj.tags[rowId]));
            for (let i=0; i<newTransObj.context[rowId].length; i++) {
                let thisContext = newTransObj.context[rowId][i];
                let contextId = (transObj.context[newRowId].push(thisContext)) -1;
                if (newTransObj.parameters?.[rowId]?.[i]?.length) {
                    transObj.parameters[rowId] ||= [];
                    transObj.parameters[rowId][contextId] = newTransObj.parameters[rowId][i];
                }
                if (newTransObj.contextTranslation?.[rowId]?.[i]?.length) {
                    transObj.contextTranslation[rowId] ||= [];
                    transObj.contextTranslation[rowId][contextId] = newTransObj.contextTranslation[rowId][i];
                }
            }
        }

    }

    return transObj
}

/**
 * Parse the script asynchronously.
 * @returns {Promise<ParserBase>} - A promise resolving to the parsed ParserBase instance.
 */
ParserBase.prototype.parse = async function() {
	// to be overwritten
	return this;
}

/**
 * Get the parsed text.
 * @returns {string} - The parsed text.
 */
ParserBase.prototype.getText = function() {
	return this.writableData.join("");
}

/**
 * Enter one or more contexts.
 * @param {...string} arguments - Contexts to enter.
 */
ParserBase.prototype.contextEnter = function() {
	for (var i=0; i<arguments.length; i++) {
		this.currentContext.push(arguments[i])
	}
}

/**
 * End the current context.
 */
ParserBase.prototype.contextEnd = function() {
	this.currentContext.pop()
}

/**
 * Replace line breaks in the given text.
 * @param {string} text - The text to process.
 * @returns {string} - The text with line breaks replaced.
 */
ParserBase.prototype.replaceLineBreak = function(text) {
	return text.replace(/\n/g, "\\n");
}

/**
 * Detect the encoding of the given buffer.
 * @static
 * @param {Buffer} buffer - The buffer to detect encoding from.
 * @returns {string} - The detected encoding.
 */
ParserBase.detectEncoding = function(buffer) {
    var d = new Buffer.alloc(5, [0, 0, 0, 0, 0]);
    // var fd = fs.openSync(f, 'r');
    // fs.readSync(fd, d, 0, 5, 0);
    // fs.closeSync(fd);

    // https://en.wikipedia.org/wiki/Byte_order_mark
    var e = false;
    if ( !e && d[0] === 0xEF && d[1] === 0xBB && d[2] === 0xBF)
        e = 'utf8';
    if (!e && d[0] === 0xFE && d[1] === 0xFF)
        e = 'utf16be';
    if (!e && d[0] === 0xFF && d[1] === 0xFE)
        e = 'utf16le';
    if (!e)
        e = 'ascii';

    return e;
	
}

/**
 * Set translation pair from translationDatas
 * If translationDatas is not set, this.options.translationDatas is used
 * @param  {} path - local path
 * @param  {} translationDatas - Collection of translation data
 * @returns {ParserBase}
 */
ParserBase.prototype.assignTranslationPair = function(path, translationDatas) {
	console.log("assignTranslationPair:", arguments);
	if (!path) return this;
	translationDatas = translationDatas || this.options.translationDatas || {
		info:{},
		translationData:{}
	}

	if (!translationDatas) return this;
	if (!translationDatas.translationData) return this;
	if (!translationDatas.translationData[path]) {
		path = "/"+path;
		if (!translationDatas.translationData[path]) return this;
	}
	if (empty(translationDatas.translationData[path].translationPair)) return this;

	this.translationInfo = translationDatas.translationData[path].translationInfo || {};
	this.translationPair = translationDatas.translationData[path].translationPair || {};
	return this;
}

/**
 * Determine whether the file path should be processed or not
 * True : process
 * False : should not process
 * @param  {String} relPath - Path's key
 * @returns {Boolean}
 */
ParserBase.prototype.processThispath = function(relPath) {
	if (!(this.options)) return true;
	if (empty(this.options.files)) return true;

	if (this.options.files.includes(relPath)) return true;

	return false;
}

/**
 * Apply translation pair
 * @param {Object} translationPair - Translation Pair
 * @returns {ParserBase}
 */
ParserBase.prototype.setTranslationPair = function(translationPair) {
	translationPair = translationPair ||{};
	this.translationPair = translationPair;
	return this;
}

/**
 * Filter text for Translator++ front end
 * Please overwrite this function based on the engine
 * @param  {} text
 * @param  {} context
 * @param  {} parameters
 */
ParserBase.prototype.filterText = function(text, context, parameters) {
	return text;
}

/**
 * Unfilter text to prepare the data to be exported
 * Please overwrite this function based on the engine
 * @param  {} text
 * @param  {} context
 * @param  {} parameters
 */
ParserBase.prototype.unfilterText = function(text, context, parameters) {
    return text;
}

/**
 * Translate text based on this.translationPair
 * @param  {String} text - Text to be translated
 * @param  {Array} context - Array of the current context
 * @returns {String} - Translation
 */
ParserBase.prototype.translate = function(text, context) {
	if (typeof text !== 'string') return text;
	if (text.trim() == '') return text;
	if (this.debugLevel >= 2) console.log("%cattempt to translate: ", "color:green;", text, context);
	if (this.debugLevel >= 3) console.log("%cJSON text: ", "color:green;", JSON.stringify(text));
	if (this.debugLevel >= 2) console.log("%cTranslation pair: ", "color:green;", this.translationPair);

	// compare with exact context match
	var prefix = context.join("/");
	if (this.debugLevel >= 2) console.log("%cCurrent context:", "color:green;", prefix);
	prefix = prefix+"\n";
	if (this.translationPair[prefix+text]) {
		if (this.debugLevel >= 1) console.log("%cTranslation found in this.translationPair[prefix+text]:", "color:cyan;", this.translationPair[prefix+text]);
		return this.translationPair[prefix+text];
	}

	// compare with group
	var sliceLevel = this.translationInfo.groupLevel || 0;
	if (sliceLevel > 0) {
		prefix = context.slice(0, sliceLevel).join("/")
		prefix = prefix+"\n";
		//if (window.monitoringMode) console.log("%cTranslate by group",  'background: #00F; color: #fff', prefix);
		if (this.translationPair[prefix+text]) {
			if (this.debugLevel >= 1) console.log("%cTranslation found in GROUP this.translationPair[prefix+text]:", "color:cyan;", this.translationPair[prefix+text]);
			return this.translationPair[prefix+text];
		}
	}

	//console.log("found in translation pair?", this.translationPair[text]);
	
	if (typeof this.translationPair[text] == 'string') {
		// careful, some keyword would result something like this: function String() { [native code] }
		// for example : "constructor"
		if (this.translationPair[text]) {
			if (this.debugLevel >= 1) console.log("%cTranslation FOUND, returning:", "color:cyan;", this.translationPair[text]);
			return this.translationPair[text];
	
		}
	}
	
	if (this.debugLevel >= 1) console.log("%cTranslation NOT FOUND, returning:", "color:cyan;", text);
	return text;

}

ParserBase.prototype.addTransData = function(translatableObj) {
	var result = this.transData;
	if (typeof result.indexIds[translatableObj.text] == "undefined") result.indexIds[translatableObj.text] = result.data.length;
	//result.indexIds[thisObj.text] = result.indexIds[thisObj.text] || result.data.length;
	
	var row = result.indexIds[translatableObj.text];
	result.data[row] 		= result.data[row] || [translatableObj.text, translatableObj.defaultTranslation||""];

	result.context[row] 	= result.context[row]||[];
	result.context[row].push(translatableObj.context.join(this.contextSeparator))

	if (!empty(translatableObj.parameters)) {
		result.parameters[row] 	= result.parameters[row] || [];
		result.parameters[row].push(translatableObj.parameters);
	}

	if (translatableObj.tags?.length > 0) {
		// always override with new value
		// todo: merge with another occurance?		
		if (Array.isArray(translatableObj.tags) == false) translatableObj.tags = [translatableObj.tags]
		result.tags[row] 	= translatableObj.tags;

		//result.tags[row].push(translatableObj.tags);
	}
	
	return this;	
}

/**
 * Register a translatable string
 * @param {String} string - Translatable string to register 
 * @param {String[]|undefined} [localContext] - Local context. The overall context will be appended into ParserBase.baseContext 
 * @param {Object|undefined} [parameters] - Parameters to be added 
 * @param {String|undefined} [parameters.rowInfoText] - Row information text, For example, character name or other information to be added to the translatable text
 * @param {Object|undefined} [options] - Options to pass misc data
 * @param {Object|undefined} [options.defaultObject] - default object to be stored to the translatableTexts
 * @param {Object|undefined} [options.currentAddress] - Current address
 * @param {String|undefined} [options.defaultTranslation] - Register default translation
 * @returns {String} - Translated string if match translation, Original string if no translation is found.
 */
ParserBase.prototype.registerString = function(string, localContext, parameters, options) {
	if (typeof string !== "string") {
		console.warn("Attempt to register translatable text for a non string with value:", string, arguments);
		return string; // return as is
	}

	options ||= {};
	options.currentAddress = options.currentAddress || this.currentAddress;

	
	var copyContext = common.clone(this.currentContext)
	localContext 	= localContext||[];
	if (Array.isArray(localContext) == false) localContext = [localContext];
	copyContext = copyContext.concat(localContext);

	// merge parameters and baseParameter
	if (this.baseParameter) parameters = {...this.baseParameter, ...parameters};
	var filteredText 	= this.filterText(string, copyContext, parameters)
	var thisTag 		= this.baseTags.concat(options.tags||[])

	const obj = options.defaultObject || {};
	if (string.trim().length > 0) {
		obj.text		=filteredText,
		obj.rawText		=string,
		obj.context		=copyContext,
		obj.parameters	=parameters,
		obj.tags		=thisTag,
		obj.address		=common.clone(options.currentAddress)
		obj.defaultTranslation = options.defaultTranslation || ""

		this.translatableTexts.push(obj);

		this.addTransData(obj);
	}
	
	var translation = this.translate(filteredText, copyContext);
	if (translation !== filteredText) {
		if (this.debugLevel >= 1) console.log("%cTranslating:", 'background: #222; color: #bada55', filteredText,"->", translation, this.translationPair);
		
		this.writableData.push(this.unfilterText(translation, copyContext, parameters, obj));
	} else {
		this.writableData.push(string);
	}
	return translation;
}

/**
 * Register a string to the writable data array.
 * @param {string} string - The string to register.
 * @returns {string} - The registered string.
 */
ParserBase.prototype.register = function(string) {
	this.writableData.push(string);
	return string;
}

/**
 * Edit the last string in the writable data array.
 * @param {string} string - The new string to replace the last one.
 * @returns {string} - The edited string.
 */
ParserBase.prototype.editLastWritableData = function(string) {
	this.writableData[this.writableData.length-1] = string;
	return string;
}

/**
 * Asynchronously get the transData after parsing if not already parsed.
 * @returns {Promise<Object>} - A promise resolving to the transData.
 */
ParserBase.prototype.toTrans = async function() {
	if (!this.isParsed) await this.parse();
	
	return this.transData;
}

/**
 * Append transData from a new parsed instance to the original transData.
 * @static
 * @param {Object} originalTrans - The original transData.
 * @param {Object} newTrans - The new transData to append.
 * @returns {Object} - The combined transData.
 */
ParserBase.appendTransData = function(originalTrans, newTrans) {
	newTrans = common.clone(newTrans);
	this.keyColumn = this.keyColumn || 0;
	//this.linkedObject = ["context", "parameters", "tags"]
	originalTrans.indexIds = originalTrans.indexIds || {};

	if (empty(newTrans.data)) return originalTrans;
	for (var row=0; row<newTrans.data.length; row++) {
		var thisText = newTrans.data[row][this.keyColumn];
		if (empty(thisText)) continue;
		var newIndex
		if (originalTrans.indexIds[thisText]) {
			// add context
			newIndex = originalTrans.indexIds[thisText];
		} else {
			newIndex = originalTrans.data.push(newTrans.data[row]) - 1;
			originalTrans.indexIds[thisText] = newIndex;
		}


		// context & parameters
		if (!empty(newTrans.context)) {
			originalTrans.context[newIndex] = originalTrans.context[newIndex] || [];
			newTrans.context[row] = newTrans.context[row] || [];
			for (var contextId=0; contextId<newTrans.context[row].length; contextId++) {
				var newCtxIdx = originalTrans.context[newIndex].push(newTrans.context[row][contextId]) -1;
				if (empty(newTrans.parameters)) continue;
				if (empty(newTrans.parameters[row])) continue;
				originalTrans.parameters = originalTrans.parameters || [];
				originalTrans.parameters[newIndex] = originalTrans.parameters[newIndex] || [];
				originalTrans.parameters[newIndex][newCtxIdx] = newTrans.parameters[row][contextId];
			}
		}

		// tags
		if (!empty(newTrans.tags)) {
			if (!empty(newTrans.tags[row])) {
				originalTrans.tags = originalTrans.tags || [];
				originalTrans.tags[newIndex] = originalTrans.tags[newIndex] || [];
				originalTrans.tags[newIndex] = originalTrans.tags[newIndex].concat(newTrans.tags[row]);
				
				// make unique
				originalTrans.tags[newIndex] = originalTrans.tags[newIndex].filter((value, index, self)=>{
					return self.indexOf(value) === index;
				});
			}
		}

	}
	return originalTrans;
}

/**
 * Import transData from another parsed instance of ParserBase.
 * @param {Object} exportedObj - The exported object containing transData.
 */
ParserBase.prototype.importTransData = function(exportedObj) {
	if (!exportedObj) return this;
	if (empty(exportedObj.transData)) return this;
	ParserBase.appendTransData(this.transData, exportedObj.transData);
	return this;
}

/**
 * Convert the ParserBase instance to a string.
 * @returns {string} - The concatenated writableData string.
 */
ParserBase.prototype.toString = function() {
	return this.writableData.join("");
}

/**
 * Generate file information from the given relative path.
 * @static
 * @param {string} relativePath - The relative path of the file.
 * @returns {Object} - An object containing file information.
 */
ParserBase.generateFileInfo = function(relativePath) {
    var fileInfo = {};
    fileInfo.extension 		= nwPath.extname(relativePath).toLowerCase().substring(1);
    fileInfo.filename 		= nwPath.basename(relativePath, nwPath.extname(relativePath));
    fileInfo.basename 		= nwPath.basename(relativePath);
    fileInfo.path 			= relativePath;
    fileInfo.relPath		= relativePath;
    fileInfo.dirname 		= "/"+nwPath.dirname(relativePath);
    return fileInfo;
}

/**
 * Generate file information for the current instance from the given relative path.
 * @param {string} relativePath - The relative path of the file.
 * @returns {Object} - An object containing file information.
 */
ParserBase.prototype.generateFileInfo = function(relativePath) {
	this.fileInfo = ParserBase.generateFileInfo(relativePath);
	return this.fileInfo;
}


/**
 * ParserFile class for handling file-related operations and text parsing.
 * @class
 */
class ParserFile extends ParserBase {

	constructor(file, options, callback) {
		//first argument of ParserBase is the content of the file
		//which at the construction of the object still unavailable
		super(undefined, options, callback)
		this.file = file;
		this.detectedEncoding; // encoding detected by this.readfile
		this.readEncoding;
		this.writeEncoding;
		
	}
}

/**
 * Detect the encoding of the given buffer.
 * @static
 * @param {Buffer} buffer - The buffer to detect encoding from.
 * @returns {string} - The detected encoding.
 */
ParserFile.detectEncoding = function(buffer) {
    var d = new Buffer.alloc(5, [0, 0, 0, 0, 0]);
    // var fd = fs.openSync(f, 'r');
    // fs.readSync(fd, d, 0, 5, 0);
    // fs.closeSync(fd);

    // https://en.wikipedia.org/wiki/Byte_order_mark
    var e = false;
    if ( !e && d[0] === 0xEF && d[1] === 0xBB && d[2] === 0xBF)
        e = 'utf8';
    if (!e && d[0] === 0xFE && d[1] === 0xFF)
        e = 'utf16be';
    if (!e && d[0] === 0xFF && d[1] === 0xFE)
        e = 'utf16le';
    if (!e)
        e = 'ascii';

    return e;
	
}

/**
 * Asynchronously read the contents of a file.
 * @param {string} file - The path of the file to read.
 * @param {string} readEncoding - The encoding to use for reading (optional).
 * @returns {Promise<string>} - A promise resolving to the decoded file content.
 */
ParserFile.prototype.readFile = async function(file, readEncoding) {
	file = file || this.file;
	readEncoding = readEncoding || this.readEncoding;
	console.log("loading :", file);

	return new Promise((resolve, reject) => {
		fs.readFile(file, (err, data) => {
			if (err) return reject();
			this.buffer = data;
			this.detectedEncoding = common.detectEncoding(data);
			if (this.detectedEncoding == "UNICODE") ParserFile.detectEncoding(data)
			this.encoding = readEncoding || this.detectedEncoding;


			var result;
			try {
				console.log("encoding file with ", this.encoding);
				result = iconv.decode(data, this.encoding);
			} catch (e) {
				console.warn("Unable to decode string try 'UTF8'", e);
				result = iconv.decode(data, this.defaultEncoding);
			}
			resolve(result)
		})	
	})
}

/**
 * Asynchronously read the text contents of a file.
 * @param {string} file - The path of the file to read.
 * @param {string} readEncoding - The encoding to use for reading (optional).
 * @returns {Promise<string>} - A promise resolving to the text content of the file.
 */
ParserFile.prototype.readTextFromFile = async function(file, readEncoding) {
	file ||= this.file;
	readEncoding ||= this.readEncoding;
	let text = await common.fileGetContents(file, readEncoding)
	this.detectedEncoding = common.getOpenedFileEncoding(file)
	this.encoding = common.getOpenedFileEncoding(file)
	this.encodingBOM = common.getOpenedFileBom(file)
	return text;
}

/**
 * Asynchronously write the parsed text to a file.
 * @param {string} file - The path of the file to write.
 * @param {string} encoding - The encoding to use for writing (optional).
 * @param {boolean} bom - Whether to include a byte order mark (optional).
 * @returns {Promise} - A promise indicating the success of the write operation.
 */
ParserFile.prototype.write = async function(file, encoding, bom) {
	return await common.filePutContents(file, this.getText(), encoding, bom);
}



exports.ParserBase = ParserBase;
exports.ParserFile = ParserFile;