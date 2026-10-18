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



// var WolfData = function(file, writeMode, options) {
// 	options = options||{};
// 	this.options = options;
	
// 	this.file = file;
// 	this.fileName = file.split(/.*[/|\\]/)[1];
// 	// console.log("%c options.stringEncoding is", "color:aqua", options.stringEncoding)
// 	// console.log("%c    AND thisAddon.getConfig(`readEncoding`)", "color:aqua", thisAddon.getConfig("readEncoding"))

// 	//this.stringEncoding = options.stringEncoding || thisAddon.getConfig("readEncoding") || 'Windows-31j'	// translate from Japanese
// 	this.stringEncoding = options.stringEncoding ||  'Windows-31j'	// translate from Japanese
	
// 	// string encoding to write used in createTextBuffer
// 	this.writeEncoding 		= options.writeEncoding || this.stringEncoding || 'Windows-31j'; 
// 	this.translationPair 	= options.translationPair || {};
// 	this.translationInfo 	= options.translationInfo || {};
// 	this.writeTranslation 	= options.writeTranslation || this.writeTranslation;
// 	this.fileInfo = options.fileInfo || {}
	
// 	this.data = fs.readFileSync(file);
// 	this.flags = {};
// 	this.length = this.data.length;
// 	this.pointer = 0;
	
// 	this.currentContext = [];
// 	this.currentGroup = ""
	
// 	this.translatableString = [];
// 	this.storeBlank = false; // store blank string?
	
// 	this.writeMode = false;
// 	if (writeMode) {
// 		this.writeMode =true;
// 		this.writeBuffer = Buffer.from([]);
// 		this.regBuffer = []
// 	}
	
// 	this.isParseSuccess = false;
// }

// WolfData.getFullContext = function() {
	
// }

// WolfData.prototype.write = function(path) {
// 	console.log("Write to ", path, "encoding", this.writeEncoding);
// 	this.writeBuffer = Buffer.concat(this.regBuffer);
// 	fs.writeFileSync(path, this.writeBuffer);
// }

// WolfData.prototype.groupEnter = function(buff) {
// 	this.currentGroup = buff;
// }
// WolfData.prototype.groupExit = function(buff) {
// 	this.currentGroup = "";
// }

// WolfData.prototype.contextEnter = function(context) {
// 	this.currentContext.push(context);
// 	return this.currentContext;
// }
// WolfData.prototype.contextExit = function() {
// 	// exit one level of context
// 	return this.currentContext.pop();
// }

// WolfData.prototype.translate = function(text, context) {
// 	if (window.monitoringMode) console.log("%c-attempt to translate ",  'background: #00F; color: #0f0;', text, this.translationPair);
	
// 	if (typeof text !== 'string') return text;
// 	if (text == '') return text;
	
// 	// compare with exact context match for Context level translation
// 	if (window.monitoringMode) console.log("%c-Looking up :",  'background: #00F; color: #0f0;', context.join("/")+"\n"+text);
// 	if (this.translationPair[context.join("/")+"\n"+text]) return this.translationPair[context.join("/")+"\n"+text];
	
	
// 	// searching for unsliced context match. Probably wont match anything. But I will keep the code for future use
// 	var prefix = this.currentContext.join("/");
// 	prefix = prefix+"\n";
// 	if (window.monitoringMode) console.log("%c-group level",  'background: #00F; color: #0f0;', this.translationInfo.groupLevel);
// 	if (window.monitoringMode) console.log("%c-Current context",  'background: #00F; color: #0f0;', context);
// 	if (window.monitoringMode) console.log("%c-current context match:",  'background: #00F; color: #0f0;', prefix, this.translationPair[prefix+text]);
// 	if (this.translationPair[prefix+text]) return this.translationPair[prefix+text];
	
	
// 	if (window.monitoringMode) console.log("%c-comparing with group",  'background: #00F; color: #0f0;');
// 	// compare with group
// 	var sliceLevel = this.translationInfo.groupLevel || 0;
// 	if (sliceLevel > 0) {
// 		if (window.monitoringMode) console.log("%c-Slice lv > 0, which is:",  'background: #00F; color: #0f0;', sliceLevel);
// 		prefix = this.currentContext.slice(0, sliceLevel).join("/")
// 		//prefix = prefix;
// 	} else {
// 		if (window.monitoringMode) console.log("%c-Slice lv == 0, prefix is",  'background: #00F; color: #0f0;', this.fileInfo.path);
// 		prefix = this.fileInfo.path;
// 	}
// 	if (window.monitoringMode) console.log("%cTranslate by group",  'background: #00F; color: #0f0;', prefix);
// 	if (this.translationPair[prefix+"\n"+text]) return this.translationPair[prefix+"\n"+text];
	
// 	// group as an object
// 	if (typeof this.translationPair[prefix] == "object") {
// 		if (this.translationPair[prefix][text]) return this.translationPair[prefix][text];
// 	}
	
	
// 	if (window.monitoringMode) console.log("this.translationPair[text]:", this.translationPair[text]);
// 	if (typeof this.translationPair[text] == 'undefined') return text;
	
// 	if (window.monitoringMode) console.log("return this.translationPair[text]", this.translationPair[text]);
// 	return this.translationPair[text];
// }


// WolfData.prototype.createTextBuffer = function(text) {
// 	// Generating wolfRPG Style text buffer
// 	var textBuffer = iconv.encode(text, this.writeEncoding);
// 	var byteLength = Buffer.allocUnsafe(4)
// 	byteLength.writeInt32LE(textBuffer.length + 1); // plus end byte
// 	var result = []
// 	result.push(byteLength, textBuffer, Buffer.from([0x00]));
// 	return Buffer.concat(result);
// }

// WolfData.prototype.writeTranslationMaster = function(translation, translatableObj) {
// 	// original of writeTranslation
// 	this.regBuffer[translatableObj.regBufferIndex] = this.createTextBuffer(translation);
// }

// WolfData.prototype.writeTranslation = function(translation, translatableObj) {
// 	this.writeTranslationMaster(translation, translatableObj);
// }

// WolfData.prototype.translatableTextAdd = function(textBuffer, context, translateLastBuffer) {
// 	// textBuffer is Buffer object
// 	context = context||[];
	
	
// 	if (this.storeBlank == false) {
// 		if (textBuffer.length < 1) return;
// 	}
	
// 	if (Array.isArray(context) == false) context = [context];
// 	translateLastBuffer = translateLastBuffer||false;
	
// 	var text = iconv.decode(textBuffer, this.stringEncoding)
	
// 	var tmpContext = this.currentContext.concat(context)
	
// 	var regBufferIndex 
// 	if (this.regBuffer) regBufferIndex = this.regBuffer.length - 1;
	
// 	var translatableObj = {
// 		"text":text,
// 		"context":tmpContext,
// 		"buffer" : textBuffer,
// 		"regBufferIndex" : regBufferIndex,
// 		"group" : this.currentGroup
// 	}
// 	this.translatableString.push(translatableObj)
	
// 	if (monitorTexts.includes(text)) {
// 		console.log("%cMonitoring", 'background: #F00; color: #fff',translateLastBuffer, text, this.translationPair);
// 		console.log("Current context", this.currentContext);
// 		console.log("This context", context);
// 		console.log("Processed context", tmpContext);
// 		console.log("FileInfo", this.options.fileInfo);
// 		window.monitoringMode = true;
// 	}
	
// 	// DO TRANSLATION HERE
// 	if (translateLastBuffer) {
// 		var translation = this.translate(text, tmpContext);
// 		if (window.monitoringMode) console.log("Translation result : ", translation);
		
// 		if (Boolean(translation) == false) return;
// 		if (text !== translation) {
// 			if (window.monitoringMode) console.log("%cTranslating", 'background: #222; color: #bada55', text,"->", translation, this.translationPair);
			
// 			var last = this.regBuffer.length -1;
// 			if (window.monitoringMode) console.log("%cattempt to apply translated text into ", 'color: #ff0000', last, this.regBuffer[last]);
// 			//this.regBuffer[regBufferIndex] = this.createTextBuffer(translation);	
			
// 			this.writeTranslation.call(this, translation, translatableObj);
// 			//this.regBuffer[regBufferIndex] = this.createTextBuffer(translation);		
// 		}
		
// 	}
// 	window.monitoringMode = false;
// }

// WolfData.prototype.registerBuffer = function(buffer) {
// 	if (this.writeMode == false) return;
// 	// create a copy from buffer
// 	// and store it into regBuffer
// 	this.regBuffer.push(Buffer.from(buffer)); 
// 	return this.regBuffer;
// }

// WolfData.prototype.setFlags = function(key, value) {
// 	if (typeof key == 'undefined') return console.warn("Unable to set flags because of the blank key");
// 	this.flags[key] = value
// 	return this.flags;
// }

// WolfData.prototype.getFlags = function(key) {
// 	if (typeof key == 'undefined') return this.flags;
// 	return this.flags[key]
// }

// WolfData.prototype.set = function(key, value) {
// 	if (typeof key == 'undefined') return console.warn("Unable to set flags because of the blank key");
// 	this[key] = value
// 	return this[key];
// }
// WolfData.prototype.get = function(key)  {
// 	if (typeof key == 'undefined') return this;
// 	return this[key]
// }

// /*
// WolfData.prototype.readPartial = function(length, pointer) {
// 	pointer = pointer||this.pointer;
// 	data = this.data.slice(pointer, pointer+length)
// 	this.pointer +=data.length;
// 	return data;
// }
// */

// // WolfData.prototype.nextIndexOf = function(needle, pointer) {
// // 	pointer = pointer||this.pointer;
// // 	return thisData.indexOf(needle, pointer+1);
// // }
// WolfData.prototype.distanceOf = function(needle, pointer) {
// 	// calculate distance from current pointer to the next occurance of needle
// 	// return current pointer if not exist
// 	pointer = pointer||this.pointer;
// 	var nextLocation =  this.data.indexOf(needle, pointer);
// 	if (nextLocation == -1) nextLocation = pointer;
// 	//console.log("Calculating distance : ", pointer, nextLocation);
// 	return nextLocation-pointer;
// }

// WolfData.prototype.resetPointer = function() {
// 	this.pointer = 0;
// }



// WolfData.prototype.goTo = function(num) {
// 	if (typeof num == 'undefined') return console.warn("Trying to set illegal value to pointer");
// 	this.pointer = num;
// 	return this.pointer;
// }
// WolfData.prototype.setPointer = function(pointer) {
// 	// alias of goTo
// 	return this.goTo(pointer);
// }
// WolfData.prototype.currentPos = function(pointer) {
// 	return this.pointer;
// }

// WolfData.prototype.read = function(numberOfByte, pointer) {
// 	// read portion of data by numberOfByte
// 	// update the pointer
// 	pointer = pointer||this.pointer;
// 	numberOfByte = numberOfByte||0;
// 	this.pointer = pointer+numberOfByte;
// 	var data = this.data.slice(pointer, pointer+numberOfByte);
	
// 	// register the buffer in writeMode
// 	this.registerBuffer(data);
	
// 	return data;
// }

// WolfData.prototype.readByte = function(pointer) {
// 	pointer = pointer||this.pointer;
// 	return this.read(1)[0];
// }

// WolfData.prototype.readInteger32LE = function(pointer) {
// 	pointer = pointer||this.pointer;
// 	var thisData = this.read(4);
// 	return thisData.readInt32LE();
// }

// WolfData.prototype.readStringBlind = function(context, pointer) {
// 	// read string blindly by delimiter
// 	context = context||[];
// 	if (Array.isArray(context) == false)context = [context]
	
// 	pointer = pointer||this.pointer;
// 	var stringTerminator = Buffer.from([0x00]);
// 	var resultBuffer = this.readToPoint(stringTerminator)
// 	var result = resultBuffer.toString();
// 	this.read(1); // read terminator but skipping it from result
	
// 	this.translatableTextAdd(resultBuffer, context);
	
// 	return result;
// }

// WolfData.prototype.readString = function(context, pointer, encoding) {
// 	// readString by header length
// 	/*
// 	string format
// 	0b 00 00 00 50 61 72 74 79 20 49 6e 66 6f 00  
	
// 	0b 00 00 00 => describes data length (strings and an end byte 0x00)
// 	50 61 72 74 79 20 49 6e 66 6f 00 => body string with 00 tail
	
// 	if the string is empty :
// 	01 00 00 00 00
	
// 	*/
// 	encoding = encoding||this.stringEncoding;
// 	pointer = pointer||this.pointer;
// 	context = context||[];
// 	if (Array.isArray(context) == false)context = [context]
	
// 	//var dataLength = this.readInteger32LE(pointer);
// 	var dataLength = this.getNext(4).readInt32LE();
// 	if (this.pointer+dataLength > this.length) {
// 		console.warn("Attempting to read ",dataLength, "at", this.pointer, "which is greater then document length");
// 		return this.readStringBlind(pointer);
// 	}
// 	var stringBuffer = this.getNext(dataLength-1, this.pointer+4);
	
// 	var string = "";
// 	if (encoding == 'utf8') {
// 		string = stringBuffer.toString(encoding)
// 	} else {
// 		string = iconv.decode( stringBuffer,encoding)
// 	}
	
// 	//this.pointer = this.pointer+dataLength;
// 	this.read(dataLength+4); // register to reader
// 	this.translatableTextAdd(stringBuffer, context, true);
	
// 	return string;
// }

// WolfData.prototype.readIntArray = function(pointer) {
// 	pointer = pointer||this.pointer;
// 	var thisLength = this.readByte();
// 	var result = [];
// 	for (var i=0; i< thisLength; i++) {
// 		result.push(this.readInteger32LE());
// 	}
// 	return result;
// }
// WolfData.prototype.readStringArray = function(context, pointer) {
// 	pointer = pointer||this.pointer;
// 	context = context||[];
// 	if (Array.isArray(context) == false)context = [context]
	
// 	var thisLength = this.readByte();
// 	//console.log("Expected array length is : ", thisLength);
// 	var result = [];
// 	for (var i=0; i< thisLength; i++) {
// 		context.push(i)
// 		result.push(this.readString(context));
// 	}
// 	return result;
// }
// WolfData.prototype.readRawArray = function(pointer) {
// 	pointer = pointer||this.pointer;
// 	var thisLength = this.readByte();
// 	var result = [];
// 	for (var i=0; i< thisLength; i++) {
// 		result.push(this.read(4));
// 	}
// 	return result;
// }


// WolfData.prototype.readToPoint = function(stringTerminator, pointer) {
// 	// place the pointer in front of the stringTerminator
// 	pointer = pointer||this.pointer;
// 	stringTerminator = stringTerminator||Buffer.from([0x00]);
// 	var result = this.read(this.distanceOf(stringTerminator));
// 	//this.read(stringTerminator.length); // read and shift to string terminator end pos
// 	//this.pointer = this.pointer+stringTerminator.length // shift to string terminator length
// 	return result;
// }

// /**
// * Verify the data and moves the pointer according to the length of the pointer
// * @param {...Buffer} check - Possibility of the buffer to check 
// * @returns {Boolean} - True if match
// * @example 
// * wolfData.verify(Buffer.from([0x12]), Buffer.from([0x13]))
// */
// WolfData.prototype.verify = function(check) {
// 	var result;
// 	for (let i=0; i<arguments.length; i++) {
// 		var thisBuf = Buffer.from(arguments[i]);
// 		let parts = this.getNext(thisBuf.length);
		
// 		result = thisBuf.equals(parts);
// 		if (result == true) {
// 			this.read(thisBuf.length);
// 			return true;
// 		}
// 	}
	
// 	// only read the first arguments;
// 	check = Buffer.from(check);
// 	const parts = this.read(check.length)
	
// 	console.warn("Verify not match, trying to find one of the following:", arguments, ".  Found", parts, "instead. Pointer is at :", this.pointer, "File : ",this.file);
// 	console.trace();
	
// 	return false;
// }

// WolfData.prototype.nextIs = function(check) {
// 	// like verify but doesn't change the pointer
// 	check = Buffer.from(check);
// 	return check.equals(this.getNext(check.length));
// }

// WolfData.prototype.seekTo = function(find, pointer) {
// 	// search buffer and place pointer after it
// 	// return new position pointer
// 	// register the range buffer
// 	pointer = pointer||this.pointer;
// 	find = Buffer.from(find);
// 	var result = this.data.indexOf(find, pointer);
// 	console.log("seeking data found at: ", result);
// 	if (result == -1) {
// 		result = this.data.length; // whole file
// 	} else {
// 		result = result+find.length;
// 	}
// 	//this.pointer = result;
// 	////console.log("calculated result are : ", result, "current pointer: ", this.pointer);
// 	this.read(result - this.pointer);
	
// 	//console.warn("=========seekTo result : =========", this.pointer);
// 	return this.pointer;
// }
// WolfData.prototype.getNext = function(numberOfByte, pointer) {
// 	// return numberOfByte after pointer
// 	// pointer doesn't change after operation
// 	pointer = pointer||this.pointer;
// 	numberOfByte = numberOfByte||0;
// 	return this.data.slice(pointer, pointer+numberOfByte);
// }

// WolfData.prototype.isEOF = function(find, pointer) {
// 	if (pointer == -1) return true;
// 	if (pointer >= this.data.length) return true;
	
// 	return false;
// }

// WolfData.prototype.shiftPointer = function(num) {
// 	this.pointer = this.pointer + num;
// 	return this.pointer;
// }

// WolfData.prototype.getPointerHex = function() {
// 	return this.pointer.toString(16)	
// }

// WolfData.prototype.getChunk = function(from, to) {
// 	return this.data.slice(from, to);
// }


// // =============================================================
// // C O M M A N D
// // =============================================================

// var WolfCommand = function(wolfData, position) {
// 	console.log("%c- Parsing command started", "color:#00f")
// 	this.wolfData = wolfData
// 	this.position = position||this.wolfData.position
// 	this.positionHex = position.toString(16);
// 	//this.commandTerminator = Buffer.from([0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00]);
// 	this.commandTerminator = Buffer.from([0x03, 0x00, 0x00, 0x00]);
// 	this.commandTerminatorCE = Buffer.from([0x01, 0x00, 0x00, 0x00]);
	
// 	try {
// 		this.parse();	
// 	} catch(e) {
// 		console.error(e);
// 	}
// }
// // Command list with their parameter length.
// // length are the paramter only. including end byte 0x00. Whole data length is this length + 5
// WolfCommand.dataType = {
// 	0   : {"type":"Blank", "length": -1 },
// 	5   : {"type":"Debug Text", "length": -1 },
// 	99  : {"type":"Checkpoint", "length": -1 },
// 	101 : {"type":"Message", "length": -1 },
// 	102 : {"type":"Choices", "length": -1 },
// 	103 : {"type":"Comment", "length": -1 },
// 	104 : {"type":"UNKNOWN", "length": -1 }, // <-- need to confirm
// 	105 : {"type":"ForceStopMessage", "length": -1 },
// 	106 : {"type":"DebugMessage", "length": -1 },
// 	107 : {"type":"ClearDebugText", "length": -1 },
// 	111 : {"type":"VariableCondition", "length": -1 },
// 	112 : {"type":"StringCondition", "length": -1 },
// 	121 : {"type":"SetVariable", "length": 19 },
// 	122 : {"type":"SetString", "length": -1 },
// 	123 : {"type":"InputKey", "length": -1 },
// 	124 : {"type":"SetVariableEx", "length": -1 },
// 	125 : {"type":"AutoInput", "length": -1 },
// 	126 : {"type":"BanInput", "length": -1 },
// 	130 : {"type":"Teleport", "length": 23 },
// 	140 : {"type":"Sound", "length": -1 },
// 	150 : {"type":"Picture", "length": -1 },
// 	151 : {"type":"ChangeColor", "length": 11 },
// 	160 : {"type":"SetTransition", "length": 11 },
// 	161 : {"type":"PrepareTransition", "length": 3 },
// 	162 : {"type":"ExecuteTransition", "length": 3 },
// 	170 : {"type":"StartLoop", "length": 3 },
// 	171 : {"type":"BreakLoop", "length": 3 },
// 	172 : {"type":"BreakEvent", "length": 3 },
// 	173 : {"type":"EraseEvent", "length": 11 },
// 	174 : {"type":"ReturnToTitle", "length": 3 },
// 	175 : {"type":"EndGame", "length": 3 },
// 	176 : {"type":"goToLoopStart", "length": 3 }, 
// 	177 : {"type":"StopNonPic", "length": 3 },
// 	178 : {"type":"ResumeNonPic", "length": 3 },
// 	179 : {"type":"LoopTimes", "length": 7 },
// 	180 : {"type":"Wait", "length": 7 },
// 	201 : {"type":"Move", "length": -1 }, // special case
// 	202 : {"type":"WaitForMove", "length": 3 },
// 	210 : {"type":"CommonEvent", "length": -1 },
// 	211 : {"type":"CommonEventReserve", "length": 11 },
// 	212 : {"type":"SetLabel", "length": -1 },
// 	213 : {"type":"JumpLabel", "length": -1 },
// 	220 : {"type":"SaveLoad", "length": 11 },
// 	221 : {"type":"LoadGame", "length": 19 },
// 	222 : {"type":"SaveGame", "length": 19 },
// 	230 : {"type":"MoveDuringEventOn", "length": 3 },
// 	231 : {"type":"MoveDuringEventOff", "length": 3 },
// 	240 : {"type":"Chip", "length": 11 },
// 	241 : {"type":"ChipSet", "length": 7 },
// 	242 : {"type":"ChipOverwrite", "length": 27 }, // new?
// 	250 : {"type":"Database", "length": -1 },
// 	251 : {"type":"ImportDatabase", "length": -1 },
// 	270 : {"type":"Party", "length": 11 },
// 	280 : {"type":"MapEffect", "length": -1 },
// 	281 : {"type":"ScrollScreen", "length": 15 },
// 	290 : {"type":"Effect", "length": 31 },
// 	300 : {"type":"CommonEventByName", "length": -1 },
// 	401 : {"type":"ChoiceCase", "length": -1 },
// 	402 : {"type":"SpecialChoiceCase", "length": -1 },
// 	420 : {"type":"ElseCase", "length": -1 },
// 	421 : {"type":"CancelCase", "length": 7 },
// 	498 : {"type":"LoopEnd", "length": 3 },
// 	499 : {"type":"BranchEnd", "length": 3 },
// 	1000 : {"type":"Unknown1000", "length": -1 },
	
	
// }

// WolfCommand.prototype.fetchData = function() {
	
// }

// WolfCommand.prototype.isEnd = function() {
// 	// don't use this
// 	var next3Byte = this.wolfData.getNext(3);
// 	var endByte = Buffer.from([0x01, 0x00, 0x00]);
// 	if (this.wolfData.getNext(5).equals(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]))) return false; // blank event
// 	if (next3Byte.equals(endByte)) return true;
// 	return false;
// }

// WolfCommand.prototype.isEndOfCommand = function() {
// 	// don't use this
// 	if (this.wolfData.isEOF()) return true;
// 	//console.log("=======is end of command ======", this.wolfData.getNext(7), "expected : ",this.commandTerminator );
// 	if (this.wolfData.getNext(7).equals(this.commandTerminator)) return true;
	
// 	return false;
// }

// WolfCommand.prototype.getCommandType = function(id) {
// 	if (typeof WolfCommand.dataType[id] == 'undefined') {
// 		console.warn("unknown command ", id, "at", this.wolfData.currentPos());
// 		return "unknown";
// 	}
// 	return WolfCommand.dataType[id].type
	
// }


// WolfCommand.prototype.parse = function() {
// 	this.wolfData.contextEnter("Command");
	
// 	//console.log("Parsing Command")
// 	this.length = this.wolfData.readInteger32LE();
// 	if (this.wolfData.regBuffer) {
// 		this.wolfData.setFlags('commandLengthPos', this.wolfData.regBuffer.length - 1)
// 	}
// 	this.command = [];
	
// 	for (var x=0; x<this.length; x++) {
// 		this.wolfData.contextEnter(x);
		
// 		var thisData = {}
// 		thisData.position = this.wolfData.pointer;
// 		thisData.positionHex = this.wolfData.pointer.toString(16);
		
// 		//console.log("start reading command from : ", thisData.position);
		
// 		thisData.rawArgs = this.wolfData.readRawArray();
// 		thisData.commandId = thisData.rawArgs[0].readInt32LE();
// 		thisData.commandType = this.getCommandType(thisData.commandId);
// 		if (this?.logLevel >= 9) console.log("%c- Command type", "color:#00f", thisData.commandId, thisData.commandType)

// 		if (thisData.commandType == "unknown") {
// 			console.log("Found unknown command for thisData : ", thisData);
// 			console.log("wolfCommand : ", this);
// 		}
// 		//console.log("Command type : ", thisData.commandType);
// 		this.wolfData.contextEnter(thisData.commandType);
		
// 		switch (thisData.commandId) {
// 			case 201: // route
// 			thisData.unknownParam = this.wolfData.read(9);
// 			thisData.routes = new WolfMoveRoute(this.wolfData, this.wolfData.currentPos());
// 			break;
			
// 			default:
// 			if (this.wolfData.nextIs(Buffer.from([0x00, 0x00]))) {
// 				// end here
// 				this.wolfData.read(3);
				
// 			} else {
// 				// try to read string
// 				this.wolfData.read(1);
// 				//console.log("attempting to read string aray at : ", this.wolfData.currentPos());
// 				thisData.stringArgs = this.wolfData.readStringArray();
// 				//console.log("result is : ", thisData.stringArgs);
// 				//console.log("Current possition : ", this.wolfData.currentPos());
// 				this.wolfData.read(1);
// 			}
			
// 		}
// 		thisData.endPos = this.wolfData.currentPos();
// 		//console.log("Command end pos at ", thisData.endPos);
// 		thisData.rawData = this.wolfData.getChunk(thisData.position, thisData.endPos);
// 		this.command.push(thisData);
// 		this.wolfData.contextExit();
		
		
// 		this.wolfData.contextExit();
// 	}
	
// 	// go to the end of command;
// 	//console.log("closing command : ", this.wolfData.currentPos(), );
// 	this.wolfData.verify(this.commandTerminator, this.commandTerminatorCE);
// 	this.wolfData.contextExit();
	
// }

// var WolfMoveRoute = function(wolfData, position) {
// 	this.wolfData = wolfData
// 	this.position = position
// 	this.positionHex = position.toString(16);
// 	this.delimiter = Buffer.from([0x01, 0x00])
	
// 	this.parse();	
// }

// WolfMoveRoute.dataType = {
// 	"0": {
// 		"name": "Down"
// 	},
// 	"1": {
// 		"name": "Left"
// 	},
// 	"2": {
// 		"name": "Right"
// 	},
// 	"3": {
// 		"name": "Up"
// 	},
// 	"4": {
// 		"name": "Down Left"
// 	},
// 	"5": {
// 		"name": "Down right"
// 	},
// 	"6": {
// 		"name": "Up left"
// 	},
// 	"7": {
// 		"name": "Up right"
// 	},
// 	"8": {
// 		"name": "Face Down"
// 	},
// 	"9": {
// 		"name": "Face Left"
// 	},
// 	"10": {
// 		"name": "Face Down Right"
// 	},
// 	"11": {
// 		"name": "Face Up Right"
// 	},
// 	"12": {
// 		"name": "Face Down Left"
// 	},
// 	"13": {
// 		"name": "Turn Right"
// 	},
// 	"14": {
// 		"name": "Face Up Left"
// 	},
// 	"15": {
// 		"name": "Face Right"
// 	},
// 	"16": {
// 		"name": "Move random"
// 	},
// 	"17": {
// 		"name": "Move Toward Hero"
// 	},
// 	"18": {
// 		"name": "Move Away From hero"
// 	},
// 	"19": {
// 		"name": "Step Forward"
// 	},
// 	"20": {
// 		"name": "Step Backward"
// 	},
// 	"21": {
// 		"name": "Jump"
// 	},
// 	"22": {
// 		"name": "Turn Left"
// 	},
// 	"23": {
// 		"name": "Turn Left/Right Random"
// 	},
// 	"24": {
// 		"name": "Face Random Direction"
// 	},
// 	"25": {
// 		"name": "Face Away From Hero"
// 	},
// 	"26": {
// 		"name": "Assign Variable"
// 	},
// 	"27": {
// 		"name": "Face Toward Hero"
// 	},
// 	"28": {
// 		"name": "Add Variable"
// 	},
// 	"29": {
// 		"name": "Set Move Frequency"
// 	},
// 	"30": {
// 		"name": "Set Animation Speed"
// 	},
// 	"31": {
// 		"name": "Half0Tile Movement"
// 	},
// 	"32": {
// 		"name": "Iddle Animation Off"
// 	},
// 	"33": {
// 		"name": "Move Animation On"
// 	},
// 	"34": {
// 		"name": "Move Animation Off"
// 	},
// 	"35": {
// 		"name": "Fixed Direction On"
// 	},
// 	"36": {
// 		"name": "Fixed Direction Off"
// 	},
// 	"37": {
// 		"name": "Slip-Through On"
// 	},
// 	"38": {
// 		"name": "Slip-Through Off"
// 	},
// 	"39": {
// 		"name": "Always On Top On"
// 	},
// 	"40": {
// 		"name": "Always On Top Off"
// 	},
// 	"41": {
// 		"name": "??"
// 	},
// 	"44": {
// 		"name": "Set Opacity to X"
// 	},
// 	"45": {
// 		"name": "Set Height to X"
// 	},
// 	"46": {
// 		"name": "Wait X Frame"
// 	},
// 	"47": {
// 		"name": "Iddle Animation On"
// 	},
// 	"48": {
// 		"name": "Full-Tile Movement"
// 	},
// 	"49": {
// 		"name": "Pattern 1"
// 	},
// 	"50": {
// 		"name": "Pattern 2"
// 	},
// 	"51": {
// 		"name": "Pattern 3"
// 	},
// 	"52": {
// 		"name": "Pattern 4"
// 	},
// 	"53": {
// 		"name": "Approach Event"
// 	},
// 	"54": {
// 		"name": "Approach Position"
// 	},
// 	"55": {
// 		"name": "Set Move Speed"
// 	},
// 	"56": {
// 		"name": "Pattern 5"
// 	},
// 	"57": {
// 		"name": "Set Graphic to X"
// 	},
// 	"58": {
// 		"name": "Play Sound"
// 	}
// };

// WolfMoveRoute.dbResult = {};

// WolfMoveRoute.prototype.fetchData = function() {
// 	var result = {};
// 	result.movementId = this.wolfData.readByte();
// 	WolfMoveRoute.dataType[result.movementId] = WolfMoveRoute.dataType[result.movementId]||{'name': "unknown"}
// 	result.movementType = WolfMoveRoute.dataType[result.movementId].name
// 	result.paramLength = this.wolfData.readByte();
// 	result.param = [];
// 	for (var i=0; i<result.paramLength; i++) {
// 		result.param.push(this.wolfData.readInteger32LE());
// 	}
// 	this.wolfData.verify(this.delimiter);
// 	//console.log("result", result);
// 	return result;
	
// }

// WolfMoveRoute.prototype.parse = function() {
// 	this.length = this.wolfData.readInteger32LE();
	
// 	this.route = [];
// 	for (var i=0; i<this.length; i++) {
// 		var thisData = {}
// 		thisData.position = this.wolfData.pointer;
// 		thisData.positionHex = this.wolfData.pointer.toString(16);
// 		//thisData.data = this.wolfData.readToPoint(delimiter)
// 		//console.log("parse movement child : ", this.wolfData.currentPos());
// 		thisData.data = this.fetchData();
// 		// to do : properly parse route length by movement code
// 		thisData.endPos = this.wolfData.currentPos();
// 		this.route.push(thisData)
// 	}
	
// 	this.endPos = this.wolfData.currentPos();
	
// }

// var WolfEventPage = function(wolfData, position) {
// 	this.wolfData = wolfData
// 	this.position = position
// 	this.positionHex = position.toString(16);
	
// 	this.parse();
// }

// WolfEventPage.prototype.parse = function() {
// 	this.wolfData.read(1);
// 	this.unknownHeader = this.wolfData.read(4);
// 	//this.unknownData1 = this.wolfData.readInteger32LE();
// 	this.graphicName = this.wolfData.readString("graphicName");
// 	this.graphicDirection = this.wolfData.readByte();
// 	this.graphicFrame = this.wolfData.readByte();
// 	this.graphicOpacity = this.wolfData.readByte();
// 	this.graphicRenderMode = this.wolfData.readByte();
	
// 	// Condition
// 	// Read raw buffer for now
// 	this.condition = this.wolfData.read(1+4 + 4*4 + 4*4);
// 	this.movement = this.wolfData.read(4);
// 	this.flags = this.wolfData.readByte();
// 	this.routeFlags = this.wolfData.readByte();
// 	this.routesStartAt = this.wolfData.pointer
// 	this.routes = new WolfMoveRoute(this.wolfData, this.wolfData.pointer);
// 	this.routesEndAt = this.wolfData.pointer
// 	this.commands = new WolfCommand(this.wolfData, this.wolfData.pointer);
	
// 	if (this.logLevel >= 8) console.log("At this EventPage, command ended at : ", this.wolfData.currentPos());
	
// 	this.shadowGraphicNum = this.wolfData.readByte();
// 	this.collisionWidth = this.wolfData.readByte();
// 	this.collisionHeight = this.wolfData.readByte();
// 	this.terminator = this.wolfData.verify(Buffer.from([0x7a])); // should be 0x7a
// 	this.endPos = this.wolfData.pointer;
// 	this.endPosHex = this.endPos.toString(16);
// 	this.dataLength = this.endPos-this.position;
	
	
	
// 	//console.log("parsing page ended at : ", this.wolfData.currentPos());
	
	
// }

// var WolfEvents = function(wolfData) {
// 	this.wolfData = wolfData;
// 	this.terminator = Buffer.from([0x70])
	
// 	this.parse();
// }

// WolfEvents.prototype.parse = function() {
// 	var delimiter = Buffer.from([0x6f, 0x39, 0x30, 0x00, 0x00]);
// 	//console.log("calling wolfData from WolfEvents", this.wolfData);
// 	var parts = bufferExplode(delimiter, this.wolfData.data);
// 	//console.log("Event parts : ", parts);
// 	var partHeader = parts.shift();
	
// 	var eventLength = this.wolfData.getFlags("eventCount");
// 	if (typeof eventLength == 'undefined') {
// 		eventLength = parts.length;
// 	}
	
// 	this.wolfData.contextEnter("Event");
	
// 	this.events = []
// 	for (var i=0; i<parts.length; i++) {
// 		this.wolfData.contextEnter(i);
		
// 		var thisData = {};
// 		thisData.position = this.wolfData.currentPos();
// 		if (i==0) { // assign starting point of the very first event
// 			thisData.position = this.wolfData.seekTo(delimiter);
// 		} else {
// 			this.wolfData.verify(delimiter);
// 		}
// 		console.log("\r\n========================");
// 		console.log("Start parsing event at : ", thisData.position);
// 		thisData.data = parts[i];
// 		thisData.id = this.wolfData.readInteger32LE();
// 		thisData.name = this.wolfData.readString("name");
// 		thisData.x = this.wolfData.readInteger32LE();
// 		thisData.y = this.wolfData.readInteger32LE();
// 		thisData.numberOfPage = this.wolfData.readInteger32LE();
// 		thisData.unknownInt2 = this.wolfData.readInteger32LE();
// 		console.log("Handling EVENT ", thisData.id, thisData.name, thisData);
		
// 		if (this.wolfData.getNext(1, Buffer.from([0x79]))) {
// 			console.log("Event page found at", this.wolfData.pointer+1);
// 		}
		
// 		thisData.page = thisData.page||[];
// 		this.wolfData.contextEnter("page");
// 		for (var x=0; x<thisData.numberOfPage; x++) {
// 			this.wolfData.contextEnter(x);
// 			thisData.page.push(new WolfEventPage(this.wolfData, this.wolfData.pointer));
// 			this.wolfData.contextExit();
// 		}
// 		this.wolfData.contextExit();
		
// 		this.wolfData.verify(this.terminator); // end of event
// 		//console.log("end of event at ", this.wolfData.currentPos());
		
		
// 		this.events.push(thisData);
// 		this.wolfData.contextExit();
// 	}
// 	this.wolfData.contextExit();
	
	
// }



// var WolfMap = function(file, writeMode, options) {
// 	if (this.constructor.name !== "WolfMap") throw new Error ("WolfMap is a class, please initialize with the 'new' keyword.")
// 	console.log("Parsing map file : ", file, arguments);
// 	this.options = options||{};
// 	this.wolfData = new WolfData(file, writeMode, this.options);
// 	this.data = this.wolfData.data;
// 	this.terminator = Buffer.from([0x66]);
	
// 	this.wolfData.contextEnter(this.wolfData.fileName);
// 	console.log("Initializing wolfmap")
// 	this.init();
// 	console.log("Initialization completed")

// 	this.wolfData.contextExit();
	
// }

// WolfMap.marker = {
// 	'jp': {
// 		'header' : [
// 			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x4F, 0x4C, 0x46, 0x4D, 0x00,
// 			0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x65, 0x05, 0x00, 0x00, 0x00, 0x82, 0xC8, 0x82, 
// 			0xB5, 0x00
// 		]
// 	},
// 	'en': {
// 		'header' : [
// 			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x4F, 0x4C, 0x46, 0x4D, 0x00,
// 			0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x65, 0x03, 0x00, 0x00, 0x00, 0x4e, 0x6f, 0x00
// 		]
// 	}
// }

// WolfMap.possibleHeaders = [
// 	Buffer.from(WolfMap.marker.jp.header),
// 	Buffer.from(WolfMap.marker.en.header),
// 	Buffer.from([
// 		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x4F, 0x4C, 0x46, 0x4D, 0x00, 
// 		0x55, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x66, 0x07, 0x00, 0x00, 0x00, 0xE3, 0x81, 0xAA, 
// 		0xE3, 0x81, 0x97, 0x00]), // ver 3.173
// 	]
	
// WolfMap.prototype.init = function() {
// 	//console.log(WolfMap.marker);
// 	console.log("initializing wolfmap with option", this.options)
// 	this.version = 'jp'
// 	if (this.data.includes(Buffer.from(WolfMap.marker.en.header))) this.version = 'en'
// 	// console.log("%c this.options?.stringEncoding is", "color:green", this.options?.stringEncoding)
// 	// console.log("%c    AND thisAddon.config?.readEncoding", "color:green", this.options?.stringEncoding)
// 	// console.log("%c this.options?.writeEncoding is", "color:green", this.options?.stringEncoding)
// 	// console.log("%c    AND thisAddon.config?.writeEncoding is", "color:green", this.options?.stringEncoding)
// 	const readEncoding = this.options?.stringEncoding 
// 	const writeEncoding = this.options?.writeEncoding
	
// 	if (readEncoding) {
// 		console.info("Setting string encoding to ", readEncoding)
// 		this.wolfData.set('stringEncoding', readEncoding);
		
// 	} else if (this.version == 'jp' ) {
// 		// legacy character encoding switching if the game is edited with english/japanese WRPG
// 		// Probably not needed anymore because user can select encoding automatically
// 		console.info("Automatic setting string encoding to Windows-31j")
// 		this.wolfData.set('stringEncoding', 'Windows-31j');
// 	}
	
// 	if (writeEncoding) {
// 		console.info("Setting write encoding to ", writeEncoding)
// 		this.wolfData.set('writeEncoding', writeEncoding);
// 	}
	
// 	//this.marker = JSON.parse(JSON.stringify(WolfMap.marker[this.version]));
// 	this.wolfData.verify.apply(this.wolfData, WolfMap.possibleHeaders);	
// 	this.parse();
// 	console.log("thismap", this)
	
// 	return this;
// }

// WolfMap.prototype.parse = function() {
// 	// WARNING :  ORDER DOES MATTER!
// 	//console.log("Parsing Map : ", this.wolfData.currentPos());
// 	this.tilesetId = this.wolfData.readInteger32LE();
// 	this.width = this.wolfData.readInteger32LE();
// 	this.height = this.wolfData.readInteger32LE();
// 	this.eventCount = this.wolfData.readInteger32LE();
// 	this.wolfData.setFlags("eventCount", this.eventCount);
// 	this.wolfEvents = new WolfEvents(this.wolfData);
// 	if (this.wolfData.verify(this.terminator)) this.success = true; // end of file
// 	this.wolfData.isParseSuccess = true;
	
// }

// // =============================================================
// // C O M M O N  E V E N T
// // =============================================================
// var WolfCEFile = function(file, writeMode, options) {
// 	if (!(this instanceof WolfCEFile)) return console.warn("WolfCEFile is a constructor!")
// 	this.headerBuffers = [
// 		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x43, 0x00, 0x8F]),
// 		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x55, 0x46, 0x43, 0x00, 0xC9]), // ver 3.173
// 	];
// 	// At wolf version 3.173 the terminator is 0x90
// 	this.terminators = [
// 		Buffer.from([0x8F]), 
// 		Buffer.from([0x90]), // ver 3.173
// 	];
// 	this.wolfData = new WolfData(file, writeMode, options);
// 	this.file = file;
// 	this.wolfData.contextEnter(this.wolfData.fileName);
// 	this.parse();
// 	this.wolfData.contextExit();
// }

// WolfCEFile.prototype.parse = function() {
// 	this.wolfData.contextEnter("CommonEvent");
	
// 	this.wolfData.verify.apply(this.wolfData, this.headerBuffers)
// 	this.length = this.wolfData.readInteger32LE()
	
// 	this.commonEvents = [];
// 	for (var i=0; i<this.length; i++) {
// 		this.wolfData.contextEnter(i);
// 		var wolfCE;
// 		try {
// 			wolfCE = new WolfCE(this.wolfData);
// 		} catch (e) {
// 			this.wolfData.contextExit();
// 			this.wolfData.contextExit();
// 			this.wolfData.isParseSuccess = false;
// 			console.error("Error parsing ", this.file, e);
// 			return;
// 		}
// 		this.commonEvents.push(wolfCE);
// 		this.wolfData.contextExit();
// 	}
// 	this.wolfData.verify.apply(this.wolfData, this.terminators);
// 	this.endPos = this.wolfData.currentPos();
// 	this.wolfData.contextExit();
	
// 	this.wolfData.isParseSuccess = true;
	
// }

// var WolfCE = function(wolfData) {
// 	if (!(this instanceof WolfCE)) return console.warn("WolfCE is a constructor!")
// 	this.headerBuffer = Buffer.from([0x8e])
// 	this.wolfData = wolfData;
// 	this.checkPointBuffer = Buffer.from([0x0a, 0x00, 0x00, 0x00]);
// 	this.parse();
// }
// WolfCE.prototype.parse = function() {
// 	//console.log("Common event start at : ", this.wolfData.currentPos());
// 	this.position = this.wolfData.currentPos();
// 	this.wolfData.verify(this.headerBuffer);
// 	this.id = this.wolfData.readInteger32LE();
// 	this.unknown1 = this.wolfData.readInteger32LE();
// 	this.unknown2 = this.wolfData.read(7);
// 	this.name = this.wolfData.readString("name");
	
// 	this.wolfData.groupEnter(this.name); // register group
// 	this.commands = new WolfCommand(this.wolfData, this.wolfData.currentPos())
// 	this.wolfData.groupExit(); // register group
	
// 	//console.log("command end at :", this.wolfData.currentPos());
// 	this.wolfData.verify(Buffer.from([0x00]));
// 	this.description = this.wolfData.readString("note")
// 	this.wolfData.verify(Buffer.from([0x8f]));
	
	
// 	// string arguments
// 	var stringArgsLength = this.wolfData.readInteger32LE();
// 	this.stringArgs = [];
// 	for (let i=0; i<stringArgsLength; i++) {
// 		this.stringArgs.push(this.wolfData.readString(["stringArgs", i]));
// 	}
// 	//console.warn("==============> int Args", this.wolfData.currentPos());
	
// 	var intArgsLength = this.wolfData.readInteger32LE();
// 	this.byteArgs = [];
// 	for (let i=0; i<intArgsLength; i++) {
// 		this.byteArgs.push(this.wolfData.readByte());
// 	}
// 	//console.warn("==============> Special arguments", this.wolfData.currentPos());
	
// 	// Special arguments
// 	var spArgsLength = this.wolfData.readInteger32LE();
// 	this.spOptionsArgs = [];
// 	for (let i=0; i<spArgsLength; i++) {
// 		let optionsLength = this.wolfData.readInteger32LE();
// 		let thisData = [];
// 		for (var x=0; x<optionsLength; x++) {
// 			thisData.push(this.wolfData.readString(["optionArgs", i, x]));
// 		}
// 		this.spOptionsArgs.push(thisData);
// 	}
	
// 	spArgsLength = this.wolfData.readInteger32LE();
// 	this.spOptionsValArgs = [];
// 	for (let i=0; i<spArgsLength; i++) {
// 		let optionsLength = this.wolfData.readInteger32LE();
// 		let thisData = [];
// 		for (let x=0; x<optionsLength; x++) {
// 			thisData.push(this.wolfData.readInteger32LE());
// 		}
// 		this.spOptionsValArgs.push(thisData);
// 	}
	
// 	var defIntLength = this.wolfData.readInteger32LE();
// 	this.intArgs = [];
// 	for (let i=0; i<defIntLength; i++) { // only 5?
// 		this.intArgs.push(this.wolfData.readInteger32LE());
// 	}
// 	this.unknown3 = this.wolfData.read(5);
	
// 	//console.warn("==============> cSelf", this.wolfData.currentPos());
// 	this.cSelf = [];
// 	for (let i=0; i<100; i++) {
// 		this.cSelf.push(this.wolfData.readString(["cSelf", i]));
// 	}
	
// 	//console.warn("==============>", this.wolfData.currentPos());
// 	this.wolfData.verify(Buffer.from([0x91]));
// 	this.unknown4 = this.wolfData.readString('SKIPTHIS');
// 	this.wolfData.verify(Buffer.from([0x92]));
// 	this.unknown5 = this.wolfData.readString('SKIPTHIS');
// 	this.wolfData.read(4); // 0xff, 0xff, 0xff, 0xff
// 	this.wolfData.verify(Buffer.from([0x92]));
	
// 	this.endPos = this.wolfData.currentPos();
// }

// // =============================================================
// // D A T A B A S E
// // =============================================================

// var WolfDatFile = function(file, writeMode, options) {
// 	if (!(this instanceof WolfDatFile)) return console.warn("WolfDatFile is a constructor!")
// 	console.log("Parsing .dat file : ", file, arguments);
// 	this.headerBuffers = [
// 		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x00, 0xC1]),
// 		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x55, 0x46, 0x4D, 0x00, 0xC2]), // ver 3.173
// 	];
// 	this.terminators = [
// 		Buffer.from([0xC1]),
// 		Buffer.from([0xC2]), // ver 3.173
// 	];
// 	this.file = file;
// 	this.writeMode = writeMode;
// 	this.options = options || {}
// 	this.wolfData = new WolfData(file, writeMode, options);
	
// 	this.parse();
	
// }

// WolfDatFile.prototype.parse = function() {
// 	this.wolfData.contextEnter(this.wolfData.fileName);
// 	this.position = this.wolfData.currentPos();
// 	if (this.wolfData.verify.apply(this.wolfData, this.headerBuffers) == false) {
// 		console.warn("Skipping ", this.file, "reason: wrong header! Most likely not a dat file that you want to edit anyway.");
// 		return;
// 	}
	
// 	this.typesCount = this.wolfData.readInteger32LE();
	
// 	this.wolfData.contextEnter("db");
// 	this.types = []
// 	for (var i=0; i<this.typesCount; i++) {
// 		this.wolfData.contextEnter(i);
// 		this.types.push(new WolfDBType(this.wolfData));
// 		this.wolfData.contextExit();
// 	}
// 	this.wolfData.contextExit("db");
	
// 	this.wolfData.verify.apply(this.wolfData, this.terminators);
// 	this.endPos = this.wolfData.currentPos();
// 	this.wolfData.contextExit();
	
// 	this.wolfData.isParseSuccess = true;
	
// }

// var WolfDBType = function(wolfData) {
// 	if (!(this instanceof WolfDBType)) return console.warn("WolfDBType is a constructor!")
// 	this.headerBuffer = Buffer.from([0xFE, 0xFF, 0xFF, 0xFF]);
// 	this.terminator = Buffer.from([0xC1]);
// 	this.wolfData = wolfData;
	
// 	this.parse();
// }
// WolfDBType.prototype.parse = function() {
// 	this.position = this.wolfData.currentPos();
// 	this.wolfData.verify(this.headerBuffer);
// 	this.typeId = this.wolfData.readInteger32LE();
// 	this.fieldCount = this.wolfData.readInteger32LE();
	
// 	this.fieldTypes = [];
// 	for (var i=0; i<this.fieldCount; i++) {
// 		this.fieldTypes.push(this.wolfData.readInteger32LE());
// 		//this.fields.push(new WolfDBField(this.wolfData));
// 	}
	
// 	// sorting the types.
// 	// this will ensure that the string data will always parsed after int
// 	this.fieldTypes.sort(); 
	
// 	this.data = []
// 	this.dataLength = this.wolfData.readInteger32LE();
// 	for (var dataIndex=0; dataIndex<this.dataLength; dataIndex++) {
// 		var fieldData = [];
// 		for (let i=0; i<this.fieldCount; i++) {
			
// 			var thisData = {};
// 			thisData.position = this.wolfData.currentPos();
// 			if (this.fieldTypes[i] < 2000) {
// 				thisData.type = "int";
// 				thisData.value = this.wolfData.readInteger32LE();
// 			} else {
// 				thisData.type = "str";
// 				thisData.value = this.wolfData.readString(["fldSet", dataIndex, "idx", i, "val"]);
// 			}
// 			thisData.endPos = this.wolfData.currentPos();
			
// 			fieldData.push(thisData);
// 		}
// 		this.data.push(fieldData);
// 	}
	
// 	this.endPos = this.wolfData.currentPos();
// }


// // =============================================================
// // G a m e . d a t
// // =============================================================
// var WolfGameDatFile = function(file, writeMode, options) {
// 	if (!(this instanceof WolfGameDatFile)) return console.warn("WolfGameDatFile is a constructor!")
// 	this.headerBuffers = [
// 		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x00]),
// 		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x55]),
// 	];
// 	this.terminator = Buffer.from([]);
// 	this.wolfData = new WolfData(file, writeMode, options);
// 	this.file = file;
// 	this.wolfData.contextEnter(this.wolfData.fileName);
// 	this.parse();
// 	this.wolfData.contextExit();
// 	this.wolfData.isParseSuccess = true;
// }

// WolfGameDatFile.prototype.parse = function() {
// 	try {
// 		this.position = this.wolfData.currentPos();
// 		this.wolfData.verify.apply(this.wolfData, this.headerBuffers);
		
// 		this.byteDataLength = this.wolfData.readInteger32LE();
// 		this.byteData = [];
// 		for (let i=0; i<this.byteDataLength; i++) {
// 			this.byteData.push(this.wolfData.readByte());
// 		}
// 		this.stringDataLength = this.wolfData.readInteger32LE();
// 		this.stringData = [];
// 		var stringContext = [
// 			"title",
// 			["unknown", "CAUTION"],
// 			["decryptKey", "CAUTION"],
// 			["font", 0, "CAUTION"],
// 			["font", 1, "CAUTION"],
// 			["font", 2, "CAUTION"],
// 			["font", 3, "CAUTION"],
// 			["font", 4, "CAUTION"],
// 			"version"
// 		]
// 		for (let i=0; i<this.stringDataLength; i++) {
// 			this.stringData.push(this.wolfData.readString(stringContext[i]));
// 		}
		
// 		// read the rest of data as a raw;
// 		this.dataBody = this.wolfData.read(this.wolfData.length - this.wolfData.currentPos());
		
// 		this.endPos = this.wolfData.currentPos();
// 	} catch (e) {
// 		console.error("Error parsing ", this.file, e);
// 		return;
// 	}
// }


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
	const exePath 		= nwPath.join(thisAddon.getLocation(), "bin/uberwolf/UberWolfCli.exe");
	for (let i=0; i<paths.length; i++) {
		if (await common.isFileAsync(paths[i])) {
			// is file
			await ui.log(`Unpacking ${paths[i]}`);
			await common.aSpawn(exePath, [`"${paths[i]}"`], {
				shell: true
			});
		} else {
			const dirs = await common.getAllDirs(paths[i], true) || [];
			// append the root path
			dirs.push(paths[i]);
			console.log("%cDirs", "color:cyan;", dirs);
			for (let dir of dirs) {
				if (!dir) continue;
				await ui.log(`Unpacking ${dir}`);
				await common.aSpawn(exePath, [`"${dir}"`], {
					shell: true
				});
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
		ui.loadingEnd();
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
	.then((exePath)=>  {
		
		console.log("patching the file");
		ui.loadingProgress("Loading", "Patching data. This may take a while depending on the size of the game....", {consoleOnly:true, mode:'consoleOutput'});
		
		exportWolfToFolder(targetDir, targetDir, transData, options);
		ui.loadingProgress("Loading", "Done!", {consoleOnly:true, mode:'consoleOutput'});
		
		ui.loadingEnd("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput', error:false});
		engines.wolf.onApplySuccess(targetDir);
		
		ui.LoadingAddButton("Open folder", function() {
			nw.Shell.showItemInFolder(exePath);
		},{
			class: "icon-folder-open"
		});
		ui.LoadingAddButton("Play!", function() {
			console.log("Opening game");
			nw.Shell.openItem(exePath);
		},{
			class: "icon-play"
		});
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
	ui.loadingEnd();
}

const drawNewProject = function() {
	ui.newProjectDialog.addMenu({
		icon : "addons/wolfJs/icon.png",
		descriptionBar : `<h2>Wolf RPG</h2>
		<p>${t('Translate from WRPG games with WolfJs')}</p>`,
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
			"schema": {
				"readEncoding": {
					"type": "string",
					"title": "Read Character Encoding",
				}
			},
			"form": [
				{
					"key": "readEncoding",
					"type": "selectencoding",
					"description": "Character encoding when reading data from a document.<br />Use UTF-8 for WolfRPG version 3 and above. Leave blank for Wolf RPG version 2 and below."
				}
			]
		}
	});

	const $selectExe = $('<input type="dvSelectPath" class="form-control selectExe" name="selectExe" accept=".exe" value="" />')
	$selectExe.on('change', async function() {
		const exeFile = $(this).val();
		if (!await thisAddon.isWolfExe(exeFile)) {
			return(t("Heads up!\r\n")+exeFile+t("\r\ndoesn't seem to be a Wolf RPG executable file!\r\nAre you sure want to start Wolf RPG Project from this entry point?"));
		}
        $slide.find(".dialogSectionBlock.engineInfo").removeClass("hidden");
        let ver = await thisAddon.getWolfVersion(exeFile);
        $slide.find(".engineVersion").val(ver[0]+"."+ver[1]);

		const majorVer = parseInt(ver[0])
		if (majorVer >= 3) {
			customFields.setValueByName("readEncoding", "utf8")
		} else {
			customFields.setValueByName("readEncoding", "")
		}
	});	
	$slide.find(".selectGameWrapper").append($selectExe);



	ui.newProjectDialog.newSlide("wolf1", $slide, {
        onActive: ()=> {
			$slide.find(".dialogSectionBlock.engineInfo").addClass("hidden");
        },
        buttons: [
                    {
                        text: t("Create a new project"),
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
							
							ui.newProjectDialog.close()
							const options = {
                                entryPoint      : entryPoint,
                                engineVersion   : $slide.find(".engineVersion").val(),
                                custom          : customFields.getValues()
                            }
							await common.wait(500);

							await createNewProject(entryPoint, options);

                        }
                    }
                ]
    })
}

var init = function() {
	console.warn("%cINITIALIZING WOLFJS", "background:yellow; font-weight:bold;");

	drawNewProject();
	
	if (typeof window.engines.wolf == 'undefined') engines.add('wolf');
	
	engines.wolf.addProperty('onApplySuccess', function(targetDir) {
		console.log("Running onApplySuccess", targetDir);
		
		ui.LoadingAddButton("Open Editor", function() {
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
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+'/Data'], err => {
			// done
			console.log("process done");
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