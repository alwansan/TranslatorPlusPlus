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

const fs 		= require('graceful-fs');
const iconv 	= require('iconv-lite');

var debugMode = false;

const bufferExplode = function(splitBuf, buf) {
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


const WolfData = function(file, writeMode, options) {
	options = options||{};
	this.options = options;
	
	this.file = file;
	this.fileName = file.split(/.*[/|\\]/)[1];
	// console.log("%c options.stringEncoding is", "color:aqua", options.stringEncoding)
	// console.log("%c    AND thisAddon.getConfig(`readEncoding`)", "color:aqua", thisAddon.getConfig("readEncoding"))

	//this.stringEncoding = options.stringEncoding || thisAddon.getConfig("readEncoding") || 'Windows-31j'	// translate from Japanese
	this.stringEncoding = options.stringEncoding ||  'Windows-31j'	// translate from Japanese
	
	// string encoding to write used in createTextBuffer
	this.writeEncoding 		= options.writeEncoding || this.stringEncoding || 'Windows-31j'; 
	this.translationPair 	= options.translationPair || {};
	this.translationInfo 	= options.translationInfo || {};
	this.writeTranslation 	= options.writeTranslation || this.writeTranslation;
	this.fileInfo = options.fileInfo || {}
	
	this.data = fs.readFileSync(file);
	this.flags = {};
	this.length = this.data.length;
	this.pointer = 0;
	
	this.currentContext = [];
	this.currentGroup = ""
	
	this.translatableString = [];
	this.storeBlank = false; // store blank string?
	
	this.writeMode = false;
	if (writeMode) {
		this.writeMode =true;
		this.writeBuffer = Buffer.from([]);
		this.regBuffer = []
	}
	
	this.isParseSuccess = false;
}

WolfData.getFullContext = function() {
	
}

WolfData.prototype.write = function(path) {
	console.log("Write to ", path, "encoding", this.writeEncoding);
	this.writeBuffer = Buffer.concat(this.regBuffer);
	fs.writeFileSync(path, this.writeBuffer);
}

WolfData.prototype.groupEnter = function(buff) {
	this.currentGroup = buff;
}
WolfData.prototype.groupExit = function(buff) {
	this.currentGroup = "";
}

WolfData.prototype.contextEnter = function(context) {
	this.currentContext.push(context);
	return this.currentContext;
}
WolfData.prototype.contextExit = function() {
	// exit one level of context
	return this.currentContext.pop();
}

WolfData.prototype.translate = function(text, context) {
	if (window.monitoringMode) console.log("%c-attempt to translate ",  'background: #00F; color: #0f0;', text, this.translationPair);
	
	if (typeof text !== 'string') return text;
	if (text == '') return text;
	
	// compare with exact context match for Context level translation
	if (window.monitoringMode) console.log("%c-Looking up :",  'background: #00F; color: #0f0;', context.join("/")+"\n"+text);
	if (this.translationPair[context.join("/")+"\n"+text]) return this.translationPair[context.join("/")+"\n"+text];
	
	
	// searching for unsliced context match. Probably wont match anything. But I will keep the code for future use
	var prefix = this.currentContext.join("/");
	prefix = prefix+"\n";
	if (window.monitoringMode) console.log("%c-group level",  'background: #00F; color: #0f0;', this.translationInfo.groupLevel);
	if (window.monitoringMode) console.log("%c-Current context",  'background: #00F; color: #0f0;', context);
	if (window.monitoringMode) console.log("%c-current context match:",  'background: #00F; color: #0f0;', prefix, this.translationPair[prefix+text]);
	if (this.translationPair[prefix+text]) return this.translationPair[prefix+text];
	
	
	if (window.monitoringMode) console.log("%c-comparing with group",  'background: #00F; color: #0f0;');
	// compare with group
	var sliceLevel = this.translationInfo.groupLevel || 0;
	if (sliceLevel > 0) {
		if (window.monitoringMode) console.log("%c-Slice lv > 0, which is:",  'background: #00F; color: #0f0;', sliceLevel);
		prefix = this.currentContext.slice(0, sliceLevel).join("/")
		//prefix = prefix;
	} else {
		if (window.monitoringMode) console.log("%c-Slice lv == 0, prefix is",  'background: #00F; color: #0f0;', this.fileInfo.path);
		prefix = this.fileInfo.path;
	}
	if (window.monitoringMode) console.log("%cTranslate by group",  'background: #00F; color: #0f0;', prefix);
	if (this.translationPair[prefix+"\n"+text]) return this.translationPair[prefix+"\n"+text];
	
	// group as an object
	if (typeof this.translationPair[prefix] == "object") {
		if (this.translationPair[prefix][text]) return this.translationPair[prefix][text];
	}
	
	
	if (window.monitoringMode) console.log("this.translationPair[text]:", this.translationPair[text]);
	if (typeof this.translationPair[text] == 'undefined') return text;
	
	if (window.monitoringMode) console.log("return this.translationPair[text]", this.translationPair[text]);
	return this.translationPair[text];
}


WolfData.prototype.createTextBuffer = function(text) {
	// Generating wolfRPG Style text buffer
	var textBuffer = iconv.encode(text, this.writeEncoding);
	var byteLength = Buffer.allocUnsafe(4)
	byteLength.writeInt32LE(textBuffer.length + 1); // plus end byte
	var result = []
	result.push(byteLength, textBuffer, Buffer.from([0x00]));
	return Buffer.concat(result);
}

WolfData.prototype.writeTranslationMaster = function(translation, translatableObj) {
	// original of writeTranslation
	this.regBuffer[translatableObj.regBufferIndex] = this.createTextBuffer(translation);
}

WolfData.prototype.writeTranslation = function(translation, translatableObj) {
	this.writeTranslationMaster(translation, translatableObj);
}

WolfData.prototype.translatableTextAdd = function(textBuffer, context, translateLastBuffer) {
	// textBuffer is Buffer object
	context = context||[];
	
	
	if (this.storeBlank == false) {
		if (textBuffer.length < 1) return;
	}
	
	if (Array.isArray(context) == false) context = [context];
	translateLastBuffer = translateLastBuffer||false;
	
	var text = iconv.decode(textBuffer, this.stringEncoding)
	
	var tmpContext = this.currentContext.concat(context)
	
	var regBufferIndex 
	if (this.regBuffer) regBufferIndex = this.regBuffer.length - 1;
	
	var translatableObj = {
		"text":text,
		"context":tmpContext,
		"buffer" : textBuffer,
		"regBufferIndex" : regBufferIndex,
		"group" : this.currentGroup
	}
	this.translatableString.push(translatableObj)
	
	// if (monitorTexts.includes(text)) {
	// 	console.log("%cMonitoring", 'background: #F00; color: #fff',translateLastBuffer, text, this.translationPair);
	// 	console.log("Current context", this.currentContext);
	// 	console.log("This context", context);
	// 	console.log("Processed context", tmpContext);
	// 	console.log("FileInfo", this.options.fileInfo);
	// 	window.monitoringMode = true;
	// }
	
	// DO TRANSLATION HERE
	if (translateLastBuffer) {
		var translation = this.translate(text, tmpContext);
		if (window.monitoringMode) console.log("Translation result : ", translation);
		
		if (Boolean(translation) == false) return;
		if (text !== translation) {
			if (window.monitoringMode) console.log("%cTranslating", 'background: #222; color: #bada55', text,"->", translation, this.translationPair);
			
			var last = this.regBuffer.length -1;
			if (window.monitoringMode) console.log("%cattempt to apply translated text into ", 'color: #ff0000', last, this.regBuffer[last]);
			//this.regBuffer[regBufferIndex] = this.createTextBuffer(translation);	
			
			this.writeTranslation.call(this, translation, translatableObj);
			//this.regBuffer[regBufferIndex] = this.createTextBuffer(translation);		
		}
		
	}
	window.monitoringMode = false;
}

WolfData.prototype.registerBuffer = function(buffer) {
	if (this.writeMode == false) return;
	// create a copy from buffer
	// and store it into regBuffer
	this.regBuffer.push(Buffer.from(buffer)); 
	return this.regBuffer;
}

WolfData.prototype.setFlags = function(key, value) {
	if (typeof key == 'undefined') return console.warn("Unable to set flags because of the blank key");
	this.flags[key] = value
	return this.flags;
}

WolfData.prototype.getFlags = function(key) {
	if (typeof key == 'undefined') return this.flags;
	return this.flags[key]
}

WolfData.prototype.set = function(key, value) {
	if (typeof key == 'undefined') return console.warn("Unable to set flags because of the blank key");
	this[key] = value
	return this[key];
}
WolfData.prototype.get = function(key)  {
	if (typeof key == 'undefined') return this;
	return this[key]
}

/*
WolfData.prototype.readPartial = function(length, pointer) {
	pointer = pointer||this.pointer;
	data = this.data.slice(pointer, pointer+length)
	this.pointer +=data.length;
	return data;
}
*/

// WolfData.prototype.nextIndexOf = function(needle, pointer) {
// 	pointer = pointer||this.pointer;
// 	return thisData.indexOf(needle, pointer+1);
// }
WolfData.prototype.distanceOf = function(needle, pointer) {
	// calculate distance from current pointer to the next occurance of needle
	// return current pointer if not exist
	pointer = pointer||this.pointer;
	var nextLocation =  this.data.indexOf(needle, pointer);
	if (nextLocation == -1) nextLocation = pointer;
	//console.log("Calculating distance : ", pointer, nextLocation);
	return nextLocation-pointer;
}

WolfData.prototype.resetPointer = function() {
	this.pointer = 0;
}



WolfData.prototype.goTo = function(num) {
	if (typeof num == 'undefined') return console.warn("Trying to set illegal value to pointer");
	this.pointer = num;
	return this.pointer;
}
WolfData.prototype.setPointer = function(pointer) {
	// alias of goTo
	return this.goTo(pointer);
}
WolfData.prototype.currentPos = function(pointer) {
	return this.pointer;
}

WolfData.prototype.read = function(numberOfByte, pointer) {
	// read portion of data by numberOfByte
	// update the pointer
	pointer = pointer||this.pointer;
	numberOfByte = numberOfByte||0;
	this.pointer = pointer+numberOfByte;
	var data = this.data.slice(pointer, pointer+numberOfByte);
	if (debugMode) console.log("Reading data from ", pointer, "to", pointer+numberOfByte, "data is", data);
	
	// register the buffer in writeMode
	this.registerBuffer(data);
	
	return data;
}

WolfData.prototype.readByte = function(pointer) {
	pointer = pointer||this.pointer;
	return this.read(1)[0];
}

WolfData.prototype.readInteger32LE = function(pointer) {
	pointer = pointer||this.pointer;
	var thisData = this.read(4);
	return thisData.readInt32LE();
}

WolfData.prototype.readStringBlind = function(context, pointer) {
	// read string blindly by delimiter
	context = context||[];
	if (Array.isArray(context) == false)context = [context]
	
	pointer = pointer||this.pointer;
	var stringTerminator = Buffer.from([0x00]);
	var resultBuffer = this.readToPoint(stringTerminator)
	var result = resultBuffer.toString();
	this.read(1); // read terminator but skipping it from result
	
	this.translatableTextAdd(resultBuffer, context);
	
	return result;
}

WolfData.prototype.readString = function(context, pointer, encoding) {
	// readString by header length
	/*
	string format
	0b 00 00 00 50 61 72 74 79 20 49 6e 66 6f 00  
	
	0b 00 00 00 => describes data length (strings and an end byte 0x00)
	50 61 72 74 79 20 49 6e 66 6f 00 => body string with 00 tail
	
	if the string is empty :
	01 00 00 00 00
	
	*/
	encoding = encoding||this.stringEncoding;
	pointer = pointer||this.pointer;
	context = context||[];
	if (Array.isArray(context) == false)context = [context]
	
	//var dataLength = this.readInteger32LE(pointer);
	var dataLength = this.getNext(4).readInt32LE();
	if (this.pointer+dataLength > this.length) {
		console.warn("Attempting to read ",dataLength, "at", this.pointer, "which is greater then document length");
		return this.readStringBlind(pointer);
	}
	var stringBuffer = this.getNext(dataLength-1, this.pointer+4);
	
	var string = "";
	if (encoding == 'utf8') {
		string = stringBuffer.toString(encoding)
	} else {
		string = iconv.decode( stringBuffer,encoding)
	}
	
	//this.pointer = this.pointer+dataLength;
	this.read(dataLength+4); // register to reader
	this.translatableTextAdd(stringBuffer, context, true);
	
	return string;
}

WolfData.prototype.readIntArray = function(pointer) {
	pointer = pointer||this.pointer;
	var thisLength = this.readByte();
	var result = [];
	for (var i=0; i< thisLength; i++) {
		result.push(this.readInteger32LE());
	}
	return result;
}
WolfData.prototype.readStringArray = function(context, pointer) {
	pointer = pointer||this.pointer;
	context = context||[];
	if (Array.isArray(context) == false)context = [context]
	
	var thisLength = this.readByte();
	//console.log("Expected array length is : ", thisLength);
	var result = [];
	for (var i=0; i< thisLength; i++) {
		context.push(i)
		result.push(this.readString(context));
	}
	return result;
}
WolfData.prototype.readRawArray = function(pointer) {
	pointer = pointer||this.pointer;
	var thisLength = this.readByte();
	var result = [];
	for (var i=0; i< thisLength; i++) {
		result.push(this.read(4));
	}
	return result;
}


WolfData.prototype.readToPoint = function(stringTerminator, pointer) {
	// place the pointer in front of the stringTerminator
	pointer = pointer||this.pointer;
	stringTerminator = stringTerminator||Buffer.from([0x00]);
	var result = this.read(this.distanceOf(stringTerminator));
	//this.read(stringTerminator.length); // read and shift to string terminator end pos
	//this.pointer = this.pointer+stringTerminator.length // shift to string terminator length
	return result;
}

/**
* Verify the data and moves the pointer according to the length of the pointer
* @param {...Buffer} check - Possibility of the buffer to check 
* @returns {Boolean} - True if match
* @example 
* wolfData.verify(Buffer.from([0x12]), Buffer.from([0x13]))
*/
WolfData.prototype.verify = function(check) {
	var result;
	if (arguments.length > 1){
		for (let i=0; i<arguments.length; i++) {
			var thisBuf = Buffer.from(arguments[i]);
			// console.log("%cChecking ", "color:aqua;", thisBuf, "at", this.pointer);
			let parts = this.getNext(thisBuf.length);
			// console.log("%c-Current", "color:yellow;", parts);
			
			result = thisBuf.equals(parts);
			if (result == true) {
				this.read(thisBuf.length);
				return true;
			}
		}
	}

	
	// only read the first arguments;
	check = Buffer.from(check);
	const parts = this.read(check.length)
	
	console.warn("Verify not match, trying to find one of the following:", arguments, ".  Found", parts, "instead. Pointer is at :", this.pointer, "File : ",this.file);
	// ui.logError("Verify not match, when processing :", this.file, "at", this.pointer);
	console.trace();
	
	return false;
}

WolfData.prototype.nextIs = function(check) {
	// like verify but doesn't change the pointer
	check = Buffer.from(check);
	return check.equals(this.getNext(check.length));
}

WolfData.prototype.seekTo = function(find, pointer) {
	// search buffer and place pointer after it
	// return new position pointer
	// register the range buffer
	pointer = pointer||this.pointer;
	find = Buffer.from(find);
	var result = this.data.indexOf(find, pointer);
	console.log("seeking data found at: ", result);
	if (result == -1) {
		result = this.data.length; // whole file
	} else {
		result = result+find.length;
	}
	//this.pointer = result;
	////console.log("calculated result are : ", result, "current pointer: ", this.pointer);
	this.read(result - this.pointer);
	
	//console.warn("=========seekTo result : =========", this.pointer);
	return this.pointer;
}
WolfData.prototype.getNext = function(numberOfByte, pointer) {
	// return numberOfByte after pointer
	// pointer doesn't change after operation
	pointer = pointer||this.pointer;
	numberOfByte = numberOfByte||0;
	return this.data.slice(pointer, pointer+numberOfByte);
}

WolfData.prototype.isEOF = function(find, pointer) {
	if (pointer == -1) return true;
	if (pointer >= this.data.length) return true;
	
	return false;
}

WolfData.prototype.shiftPointer = function(num) {
	this.pointer = this.pointer + num;
	return this.pointer;
}

WolfData.prototype.getPointerHex = function() {
	return this.pointer.toString(16)	
}

WolfData.prototype.getChunk = function(from, to) {
	return this.data.slice(from, to);
}


// =============================================================
// C O M M A N D
// =============================================================

const WolfCommand = function(wolfData, position) {
	console.log("%c- Parsing command started", "color:#00f")
	this.wolfData = wolfData
	this.position = position||this.wolfData.position
	this.positionHex = position.toString(16);
	//this.commandTerminator = Buffer.from([0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00]);
	this.commandTerminator = Buffer.from([0x03, 0x00, 0x00, 0x00]);
	this.commandTerminatorCE = Buffer.from([0x01, 0x00, 0x00, 0x00]);
	
	try {
		this.parse();	
	} catch(e) {
		console.error(e);
	}
}
// Command list with their parameter length.
// length are the paramter only. including end byte 0x00. Whole data length is this length + 5
WolfCommand.dataType = {
	0   : {"type":"Blank", "length": -1 },
	5   : {"type":"Debug Text", "length": -1 },
	99  : {"type":"Checkpoint", "length": -1 },
	101 : {"type":"Message", "length": -1 },
	102 : {"type":"Choices", "length": -1 },
	103 : {"type":"Comment", "length": -1 },
	104 : {"type":"UNKNOWN", "length": -1 }, // <-- need to confirm
	105 : {"type":"ForceStopMessage", "length": -1 },
	106 : {"type":"DebugMessage", "length": -1 },
	107 : {"type":"ClearDebugText", "length": -1 },
	111 : {"type":"VariableCondition", "length": -1 },
	112 : {"type":"StringCondition", "length": -1 },
	121 : {"type":"SetVariable", "length": 19 },
	122 : {"type":"SetString", "length": -1 },
	123 : {"type":"InputKey", "length": -1 },
	124 : {"type":"SetVariableEx", "length": -1 },
	125 : {"type":"AutoInput", "length": -1 },
	126 : {"type":"BanInput", "length": -1 },
	130 : {"type":"Teleport", "length": 23 },
	140 : {"type":"Sound", "length": -1 },
	150 : {"type":"Picture", "length": -1 },
	151 : {"type":"ChangeColor", "length": 11 },
	160 : {"type":"SetTransition", "length": 11 },
	161 : {"type":"PrepareTransition", "length": 3 },
	162 : {"type":"ExecuteTransition", "length": 3 },
	170 : {"type":"StartLoop", "length": 3 },
	171 : {"type":"BreakLoop", "length": 3 },
	172 : {"type":"BreakEvent", "length": 3 },
	173 : {"type":"EraseEvent", "length": 11 },
	174 : {"type":"ReturnToTitle", "length": 3 },
	175 : {"type":"EndGame", "length": 3 },
	176 : {"type":"goToLoopStart", "length": 3 }, 
	177 : {"type":"StopNonPic", "length": 3 },
	178 : {"type":"ResumeNonPic", "length": 3 },
	179 : {"type":"LoopTimes", "length": 7 },
	180 : {"type":"Wait", "length": 7 },
	201 : {"type":"Move", "length": -1 }, // special case
	202 : {"type":"WaitForMove", "length": 3 },
	210 : {"type":"CommonEvent", "length": -1 },
	211 : {"type":"CommonEventReserve", "length": 11 },
	212 : {"type":"SetLabel", "length": -1 },
	213 : {"type":"JumpLabel", "length": -1 },
	220 : {"type":"SaveLoad", "length": 11 },
	221 : {"type":"LoadGame", "length": 19 },
	222 : {"type":"SaveGame", "length": 19 },
	230 : {"type":"MoveDuringEventOn", "length": 3 },
	231 : {"type":"MoveDuringEventOff", "length": 3 },
	240 : {"type":"Chip", "length": 11 },
	241 : {"type":"ChipSet", "length": 7 },
	242 : {"type":"ChipOverwrite", "length": 27 }, // new?
	250 : {"type":"Database", "length": -1 },
	251 : {"type":"ImportDatabase", "length": -1 },
	270 : {"type":"Party", "length": 11 },
	280 : {"type":"MapEffect", "length": -1 },
	281 : {"type":"ScrollScreen", "length": 15 },
	290 : {"type":"Effect", "length": 31 },
	300 : {"type":"CommonEventByName", "length": -1 },
	401 : {"type":"ChoiceCase", "length": -1 },
	402 : {"type":"SpecialChoiceCase", "length": -1 },
	420 : {"type":"ElseCase", "length": -1 },
	421 : {"type":"CancelCase", "length": 7 },
	498 : {"type":"LoopEnd", "length": 3 },
	499 : {"type":"BranchEnd", "length": 3 },
	1000 : {"type":"Unknown1000", "length": -1 },
	
	
}

WolfCommand.prototype.fetchData = function() {
	
}

WolfCommand.prototype.isEnd = function() {
	// don't use this
	var next3Byte = this.wolfData.getNext(3);
	var endByte = Buffer.from([0x01, 0x00, 0x00]);
	if (this.wolfData.getNext(5).equals(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00]))) return false; // blank event
	if (next3Byte.equals(endByte)) return true;
	return false;
}

WolfCommand.prototype.isEndOfCommand = function() {
	// don't use this
	if (this.wolfData.isEOF()) return true;
	//console.log("=======is end of command ======", this.wolfData.getNext(7), "expected : ",this.commandTerminator );
	if (this.wolfData.getNext(7).equals(this.commandTerminator)) return true;
	
	return false;
}

WolfCommand.prototype.getCommandType = function(id) {
	if (typeof WolfCommand.dataType[id] == 'undefined') {
		console.warn("unknown command ", id, "at", this.wolfData.currentPos());
		return "unknown";
	}
	return WolfCommand.dataType[id].type
	
}


WolfCommand.prototype.parse = function() {
	this.wolfData.contextEnter("Command");
	
	//console.log("Parsing Command")
	this.length = this.wolfData.readInteger32LE();
	if (this.wolfData.regBuffer) {
		this.wolfData.setFlags('commandLengthPos', this.wolfData.regBuffer.length - 1)
	}
	this.command = [];
	
	for (var x=0; x<this.length; x++) {
		this.wolfData.contextEnter(x);
		
		var thisData = {}
		thisData.position = this.wolfData.pointer;
		thisData.positionHex = this.wolfData.pointer.toString(16);
		
		//console.log("start reading command from : ", thisData.position);
		
		thisData.rawArgs = this.wolfData.readRawArray();
		thisData.commandId = thisData.rawArgs[0].readInt32LE();
		thisData.commandType = this.getCommandType(thisData.commandId);
		if (this?.logLevel >= 9) console.log("%c- Command type", "color:#00f", thisData.commandId, thisData.commandType)

		if (thisData.commandType == "unknown") {
			console.log("Found unknown command for thisData : ", thisData);
			console.log("wolfCommand : ", this);
		}
		//console.log("Command type : ", thisData.commandType);
		this.wolfData.contextEnter(thisData.commandType);
		
		switch (thisData.commandId) {
			case 201: // route
			thisData.unknownParam = this.wolfData.read(9);
			thisData.routes = new WolfMoveRoute(this.wolfData, this.wolfData.currentPos());
			break;
			
			default:
			if (this.wolfData.nextIs(Buffer.from([0x00, 0x00]))) {
				// end here
				this.wolfData.read(3);
				
			} else {
				// try to read string
				this.wolfData.read(1);
				//console.log("attempting to read string aray at : ", this.wolfData.currentPos());
				thisData.stringArgs = this.wolfData.readStringArray();
				//console.log("result is : ", thisData.stringArgs);
				//console.log("Current possition : ", this.wolfData.currentPos());
				this.wolfData.read(1);
			}
			
		}
		thisData.endPos = this.wolfData.currentPos();
		//console.log("Command end pos at ", thisData.endPos);
		thisData.rawData = this.wolfData.getChunk(thisData.position, thisData.endPos);
		this.command.push(thisData);
		this.wolfData.contextExit();
		
		
		this.wolfData.contextExit();
	}
	
	// go to the end of command;
	//console.log("closing command : ", this.wolfData.currentPos(), );
	this.wolfData.verify(this.commandTerminator, this.commandTerminatorCE);
	this.wolfData.contextExit();
	
}

var WolfMoveRoute = function(wolfData, position) {
	this.wolfData = wolfData
	this.position = position
	this.positionHex = position.toString(16);
	this.delimiter = Buffer.from([0x01, 0x00])
	
	this.parse();	
}

WolfMoveRoute.dataType = {
	"0": {
		"name": "Down"
	},
	"1": {
		"name": "Left"
	},
	"2": {
		"name": "Right"
	},
	"3": {
		"name": "Up"
	},
	"4": {
		"name": "Down Left"
	},
	"5": {
		"name": "Down right"
	},
	"6": {
		"name": "Up left"
	},
	"7": {
		"name": "Up right"
	},
	"8": {
		"name": "Face Down"
	},
	"9": {
		"name": "Face Left"
	},
	"10": {
		"name": "Face Down Right"
	},
	"11": {
		"name": "Face Up Right"
	},
	"12": {
		"name": "Face Down Left"
	},
	"13": {
		"name": "Turn Right"
	},
	"14": {
		"name": "Face Up Left"
	},
	"15": {
		"name": "Face Right"
	},
	"16": {
		"name": "Move random"
	},
	"17": {
		"name": "Move Toward Hero"
	},
	"18": {
		"name": "Move Away From hero"
	},
	"19": {
		"name": "Step Forward"
	},
	"20": {
		"name": "Step Backward"
	},
	"21": {
		"name": "Jump"
	},
	"22": {
		"name": "Turn Left"
	},
	"23": {
		"name": "Turn Left/Right Random"
	},
	"24": {
		"name": "Face Random Direction"
	},
	"25": {
		"name": "Face Away From Hero"
	},
	"26": {
		"name": "Assign Variable"
	},
	"27": {
		"name": "Face Toward Hero"
	},
	"28": {
		"name": "Add Variable"
	},
	"29": {
		"name": "Set Move Frequency"
	},
	"30": {
		"name": "Set Animation Speed"
	},
	"31": {
		"name": "Half0Tile Movement"
	},
	"32": {
		"name": "Iddle Animation Off"
	},
	"33": {
		"name": "Move Animation On"
	},
	"34": {
		"name": "Move Animation Off"
	},
	"35": {
		"name": "Fixed Direction On"
	},
	"36": {
		"name": "Fixed Direction Off"
	},
	"37": {
		"name": "Slip-Through On"
	},
	"38": {
		"name": "Slip-Through Off"
	},
	"39": {
		"name": "Always On Top On"
	},
	"40": {
		"name": "Always On Top Off"
	},
	"41": {
		"name": "??"
	},
	"44": {
		"name": "Set Opacity to X"
	},
	"45": {
		"name": "Set Height to X"
	},
	"46": {
		"name": "Wait X Frame"
	},
	"47": {
		"name": "Iddle Animation On"
	},
	"48": {
		"name": "Full-Tile Movement"
	},
	"49": {
		"name": "Pattern 1"
	},
	"50": {
		"name": "Pattern 2"
	},
	"51": {
		"name": "Pattern 3"
	},
	"52": {
		"name": "Pattern 4"
	},
	"53": {
		"name": "Approach Event"
	},
	"54": {
		"name": "Approach Position"
	},
	"55": {
		"name": "Set Move Speed"
	},
	"56": {
		"name": "Pattern 5"
	},
	"57": {
		"name": "Set Graphic to X"
	},
	"58": {
		"name": "Play Sound"
	}
};

WolfMoveRoute.dbResult = {};

WolfMoveRoute.prototype.fetchData = function() {
	var result = {};
	result.movementId = this.wolfData.readByte();
	WolfMoveRoute.dataType[result.movementId] = WolfMoveRoute.dataType[result.movementId]||{'name': "unknown"}
	result.movementType = WolfMoveRoute.dataType[result.movementId].name
	result.paramLength = this.wolfData.readByte();
	result.param = [];
	for (var i=0; i<result.paramLength; i++) {
		result.param.push(this.wolfData.readInteger32LE());
	}
	this.wolfData.verify(this.delimiter);
	//console.log("result", result);
	return result;
	
}

WolfMoveRoute.prototype.parse = function() {
	this.length = this.wolfData.readInteger32LE();
	
	this.route = [];
	for (var i=0; i<this.length; i++) {
		var thisData = {}
		thisData.position = this.wolfData.pointer;
		thisData.positionHex = this.wolfData.pointer.toString(16);
		//thisData.data = this.wolfData.readToPoint(delimiter)
		//console.log("parse movement child : ", this.wolfData.currentPos());
		thisData.data = this.fetchData();
		// to do : properly parse route length by movement code
		thisData.endPos = this.wolfData.currentPos();
		this.route.push(thisData)
	}
	
	this.endPos = this.wolfData.currentPos();
	
}

const WolfEventPage = function(wolfData, position) {
	this.wolfData = wolfData
	this.position = position
	this.positionHex = position.toString(16);
	
	this.parse();
}

WolfEventPage.prototype.parse = function() {
	this.wolfData.read(1);
	this.unknownHeader = this.wolfData.read(4);
	//this.unknownData1 = this.wolfData.readInteger32LE();
	this.graphicName = this.wolfData.readString("graphicName");
	this.graphicDirection = this.wolfData.readByte();
	this.graphicFrame = this.wolfData.readByte();
	this.graphicOpacity = this.wolfData.readByte();
	this.graphicRenderMode = this.wolfData.readByte();
	
	// Condition
	// Read raw buffer for now
	this.condition = this.wolfData.read(1+4 + 4*4 + 4*4);
	this.movement = this.wolfData.read(4);
	this.flags = this.wolfData.readByte();
	this.routeFlags = this.wolfData.readByte();
	this.routesStartAt = this.wolfData.pointer
	this.routes = new WolfMoveRoute(this.wolfData, this.wolfData.pointer);
	this.routesEndAt = this.wolfData.pointer
	this.commands = new WolfCommand(this.wolfData, this.wolfData.pointer);
	
	if (this.logLevel >= 8) console.log("At this EventPage, command ended at : ", this.wolfData.currentPos());
	
	this.shadowGraphicNum = this.wolfData.readByte();
	this.collisionWidth = this.wolfData.readByte();
	this.collisionHeight = this.wolfData.readByte();
	this.terminator = this.wolfData.verify(Buffer.from([0x7a])); // should be 0x7a
	this.endPos = this.wolfData.pointer;
	this.endPosHex = this.endPos.toString(16);
	this.dataLength = this.endPos-this.position;
	
	
	
	//console.log("parsing page ended at : ", this.wolfData.currentPos());
	
	
}

const WolfEvents = function(wolfData) {
	this.wolfData = wolfData;
	this.terminator = Buffer.from([0x70])
	
	this.parse();
}

WolfEvents.prototype.parse = function() {
	var delimiter = Buffer.from([0x6f, 0x39, 0x30, 0x00, 0x00]);
	//console.log("calling wolfData from WolfEvents", this.wolfData);
	var parts = bufferExplode(delimiter, this.wolfData.data);
	//console.log("Event parts : ", parts);
	var partHeader = parts.shift();
	
	var eventLength = this.wolfData.getFlags("eventCount");
	if (typeof eventLength == 'undefined') {
		eventLength = parts.length;
	}
	
	this.wolfData.contextEnter("Event");
	
	this.events = []
	for (var i=0; i<parts.length; i++) {
		this.wolfData.contextEnter(i);
		
		var thisData = {};
		thisData.position = this.wolfData.currentPos();
		if (i==0) { // assign starting point of the very first event
			thisData.position = this.wolfData.seekTo(delimiter);
		} else {
			this.wolfData.verify(delimiter);
		}
		console.log("\r\n========================");
		console.log("Start parsing event at : ", thisData.position);
		thisData.data = parts[i];
		thisData.id = this.wolfData.readInteger32LE();
		thisData.name = this.wolfData.readString("name");
		thisData.x = this.wolfData.readInteger32LE();
		thisData.y = this.wolfData.readInteger32LE();
		thisData.numberOfPage = this.wolfData.readInteger32LE();
		thisData.unknownInt2 = this.wolfData.readInteger32LE();
		console.log("Handling EVENT ", thisData.id, thisData.name, thisData);
		
		if (this.wolfData.getNext(1, Buffer.from([0x79]))) {
			console.log("Event page found at", this.wolfData.pointer+1);
		}
		
		thisData.page = thisData.page||[];
		this.wolfData.contextEnter("page");
		for (var x=0; x<thisData.numberOfPage; x++) {
			this.wolfData.contextEnter(x);
			thisData.page.push(new WolfEventPage(this.wolfData, this.wolfData.pointer));
			this.wolfData.contextExit();
		}
		this.wolfData.contextExit();
		
		this.wolfData.verify(this.terminator); // end of event
		//console.log("end of event at ", this.wolfData.currentPos());
		
		
		this.events.push(thisData);
		this.wolfData.contextExit();
	}
	this.wolfData.contextExit();
	
	
}



var WolfMap = function(file, writeMode, options) {
	if (this.constructor.name !== "WolfMap") throw new Error ("WolfMap is a class, please initialize with the 'new' keyword.")
	console.log("Parsing map file : ", file, arguments);
	this.options = options||{};
	this.wolfData = new WolfData(file, writeMode, this.options);
	this.data = this.wolfData.data;
	this.terminator = Buffer.from([0x66]);
	
	this.wolfData.contextEnter(this.wolfData.fileName);
	console.log("Initializing wolfmap")
	this.init();
	console.log("Initialization completed")

	this.wolfData.contextExit();
	
}

WolfMap.marker = {
	'jp': {
		'header' : [
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x4F, 0x4C, 0x46, 0x4D, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x65, 0x05, 0x00, 0x00, 0x00, 0x82, 0xC8, 0x82, 
			0xB5, 0x00
		]
	},
	'en': {
		'header' : [
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x4F, 0x4C, 0x46, 0x4D, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x65, 0x03, 0x00, 0x00, 0x00, 0x4e, 0x6f, 0x00
		]
	}
}

WolfMap.possibleHeaders = [
	Buffer.from(WolfMap.marker.jp.header),
	Buffer.from(WolfMap.marker.en.header),
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x4F, 0x4C, 0x46, 0x4D, 0x00, 
		0x55, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x66, 0x07, 0x00, 0x00, 0x00, 0xE3, 0x81, 0xAA, 
		0xE3, 0x81, 0x97, 0x00]), // ver 3.173

	// unknown headers
	Buffer.from([0,0,0,0,0,0,0,0,0,0,87,79,76,70,77,0,85,0,0,0,100,0,0,0,102,1,0,0,0,0,1,0,0,0]),
	
	// not working
	// Wolf 3.352 known to scramble the header
	//00 55 00 00 00 65 00 00 00 67 51 11 01 00 E9 19 00 00 F2 00 01 00 00 00 00
	Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57, 0x4F, 0x4C, 0x46, 0x4D, 0x00, 
		0x55, 0x00, 0x00, 0x00, 0x65, 0x00, 0x00, 0x00, 0x67, 0x51, 0x11, 0x01, 0x00, 0xE9, 0x19, 0x00, 
		0x00, 0xF2, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]), // ver 3.352
]
	
WolfMap.prototype.init = function() {
	//console.log(WolfMap.marker);
	console.log("initializing wolfmap with option", this.options)
	this.version = 'jp'
	if (this.data.includes(Buffer.from(WolfMap.marker.en.header))) this.version = 'en'
	// console.log("%c this.options?.stringEncoding is", "color:green", this.options?.stringEncoding)
	// console.log("%c    AND thisAddon.config?.readEncoding", "color:green", this.options?.stringEncoding)
	// console.log("%c this.options?.writeEncoding is", "color:green", this.options?.stringEncoding)
	// console.log("%c    AND thisAddon.config?.writeEncoding is", "color:green", this.options?.stringEncoding)
	const readEncoding = this.options?.stringEncoding 
	const writeEncoding = this.options?.writeEncoding
	
	if (readEncoding) {
		console.info("Setting string encoding to ", readEncoding)
		this.wolfData.set('stringEncoding', readEncoding);
		
	} else if (this.version == 'jp' ) {
		// legacy character encoding switching if the game is edited with english/japanese WRPG
		// Probably not needed anymore because user can select encoding automatically
		console.info("Automatic setting string encoding to Windows-31j")
		this.wolfData.set('stringEncoding', 'Windows-31j');
	}
	
	if (writeEncoding) {
		console.info("Setting write encoding to ", writeEncoding)
		this.wolfData.set('writeEncoding', writeEncoding);
	}
	
	/**
	 * - 15 bytes header of 00 00 00 00 00 00 00 00 00 00 57 4F 4C 46 4D
	 * - Unknown length of data
	 * - 01 00 <- possible terminator
	 */
	this.wolfData.verify.apply(this.wolfData, WolfMap.possibleHeaders);	
	this.parse();
	console.log("thismap", this);
	
	return this;
}


WolfMap.prototype.parse = function() {
	// WARNING :  ORDER DOES MATTER!
	//console.log("Parsing Map : ", this.wolfData.currentPos());

	// on version 3.352, reading 2 byte instead of 4?
	// console.log("%c- parsing tileset", "color:#00ff00");
	// debugMode = true;
	this.tilesetId = this.wolfData.readInteger32LE();
	// console.log("%c- parsing width", "color:#00ff00");
	this.width = this.wolfData.readInteger32LE();
	this.height = this.wolfData.readInteger32LE();
	// debugMode = false;

	this.eventCount = this.wolfData.readInteger32LE();
	this.wolfData.setFlags("eventCount", this.eventCount);
	this.wolfEvents = new WolfEvents(this.wolfData);
	if (this.wolfData.verify(this.terminator)) this.success = true; // end of file
	this.wolfData.isParseSuccess = true;
	
}

// =============================================================
// C O M M O N  E V E N T
// =============================================================
const WolfCEFile = function(file, writeMode, options) {
	if (!(this instanceof WolfCEFile)) return console.warn("WolfCEFile is a constructor!")
	this.headerBuffers = [
		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x43, 0x00, 0x8F]),
		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x55, 0x46, 0x43, 0x00, 0xC9]), // ver 3.173
	];
	// At wolf version 3.173 the terminator is 0x90
	this.terminators = [
		Buffer.from([0x8F]), 
		Buffer.from([0x90]), // ver 3.173
	];
	this.wolfData = new WolfData(file, writeMode, options);
	this.file = file;
	this.wolfData.contextEnter(this.wolfData.fileName);
	this.parse();
	this.wolfData.contextExit();
}

WolfCEFile.prototype.parse = function() {
	this.wolfData.contextEnter("CommonEvent");
	
	this.wolfData.verify.apply(this.wolfData, this.headerBuffers)
	this.length = this.wolfData.readInteger32LE()
	
	this.commonEvents = [];
	for (var i=0; i<this.length; i++) {
		this.wolfData.contextEnter(i);
		var wolfCE;
		try {
			wolfCE = new WolfCE(this.wolfData);
		} catch (e) {
			this.wolfData.contextExit();
			this.wolfData.contextExit();
			this.wolfData.isParseSuccess = false;
			console.error("Error parsing ", this.file, e);
			return;
		}
		this.commonEvents.push(wolfCE);
		this.wolfData.contextExit();
	}
	
	let parseScucess = this.wolfData.verify.apply(this.wolfData, this.terminators);
	this.endPos = this.wolfData.currentPos();
	this.wolfData.contextExit();
	
	this.wolfData.isParseSuccess = parseScucess;
	
}

const WolfCE = function(wolfData) {
	if (!(this instanceof WolfCE)) return console.warn("WolfCE is a constructor!")
	this.headerBuffer = Buffer.from([0x8e])
	this.wolfData = wolfData;
	this.checkPointBuffer = Buffer.from([0x0a, 0x00, 0x00, 0x00]);
	this.parse();
}
WolfCE.prototype.parse = function() {
	//console.log("Common event start at : ", this.wolfData.currentPos());
	this.position = this.wolfData.currentPos();
	this.wolfData.verify(this.headerBuffer);
	this.id = this.wolfData.readInteger32LE();
	this.unknown1 = this.wolfData.readInteger32LE();
	this.unknown2 = this.wolfData.read(7);
	this.name = this.wolfData.readString("name");
	
	this.wolfData.groupEnter(this.name); // register group
	this.commands = new WolfCommand(this.wolfData, this.wolfData.currentPos())
	this.wolfData.groupExit(); // register group
	
	//console.log("command end at :", this.wolfData.currentPos());
	this.wolfData.verify(Buffer.from([0x00]));
	this.description = this.wolfData.readString("note")
	this.wolfData.verify(Buffer.from([0x8f]));
	
	
	// string arguments
	var stringArgsLength = this.wolfData.readInteger32LE();
	this.stringArgs = [];
	for (let i=0; i<stringArgsLength; i++) {
		this.stringArgs.push(this.wolfData.readString(["stringArgs", i]));
	}
	//console.warn("==============> int Args", this.wolfData.currentPos());
	
	var intArgsLength = this.wolfData.readInteger32LE();
	this.byteArgs = [];
	for (let i=0; i<intArgsLength; i++) {
		this.byteArgs.push(this.wolfData.readByte());
	}
	//console.warn("==============> Special arguments", this.wolfData.currentPos());
	
	// Special arguments
	var spArgsLength = this.wolfData.readInteger32LE();
	this.spOptionsArgs = [];
	for (let i=0; i<spArgsLength; i++) {
		let optionsLength = this.wolfData.readInteger32LE();
		let thisData = [];
		for (var x=0; x<optionsLength; x++) {
			thisData.push(this.wolfData.readString(["optionArgs", i, x]));
		}
		this.spOptionsArgs.push(thisData);
	}
	
	spArgsLength = this.wolfData.readInteger32LE();
	this.spOptionsValArgs = [];
	for (let i=0; i<spArgsLength; i++) {
		let optionsLength = this.wolfData.readInteger32LE();
		let thisData = [];
		for (let x=0; x<optionsLength; x++) {
			thisData.push(this.wolfData.readInteger32LE());
		}
		this.spOptionsValArgs.push(thisData);
	}
	
	var defIntLength = this.wolfData.readInteger32LE();
	this.intArgs = [];
	for (let i=0; i<defIntLength; i++) { // only 5?
		this.intArgs.push(this.wolfData.readInteger32LE());
	}
	this.unknown3 = this.wolfData.read(5);
	
	//console.warn("==============> cSelf", this.wolfData.currentPos());
	this.cSelf = [];
	for (let i=0; i<100; i++) {
		this.cSelf.push(this.wolfData.readString(["cSelf", i]));
	}
	
	//console.warn("==============>", this.wolfData.currentPos());
	this.wolfData.verify(Buffer.from([0x91]));
	this.unknown4 = this.wolfData.readString('SKIPTHIS');
	this.wolfData.verify(Buffer.from([0x92]));
	this.unknown5 = this.wolfData.readString('SKIPTHIS');
	this.wolfData.read(4); // 0xff, 0xff, 0xff, 0xff
	this.wolfData.verify(Buffer.from([0x92]));
	
	this.endPos = this.wolfData.currentPos();
}

// =============================================================
// D A T A B A S E
// =============================================================

const WolfDatFile = function(file, writeMode, options) {
	if (!(this instanceof WolfDatFile)) return console.warn("WolfDatFile is a constructor!")
	console.log("Parsing .dat file : ", file, arguments);
	this.headerBuffers = [
		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x00, 0xC1]),
		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x55, 0x46, 0x4D, 0x00, 0xC2]), // ver 3.173
	];
	this.terminators = [
		Buffer.from([0xC1]),
		Buffer.from([0xC2]), // ver 3.173
	];
	this.file = file;
	this.writeMode = writeMode;
	this.options = options || {}
	this.wolfData = new WolfData(file, writeMode, options);
	
	this.parse();
	
}

WolfDatFile.prototype.parse = function() {
	this.wolfData.contextEnter(this.wolfData.fileName);
	this.position = this.wolfData.currentPos();
	if (this.wolfData.verify.apply(this.wolfData, this.headerBuffers) == false) {
		console.warn("Skipping ", this.file, "reason: wrong header! Most likely not a dat file that you want to edit anyway.");
		return;
	}
	
	this.typesCount = this.wolfData.readInteger32LE();
	
	this.wolfData.contextEnter("db");
	this.types = []
	for (var i=0; i<this.typesCount; i++) {
		this.wolfData.contextEnter(i);
		this.types.push(new WolfDBType(this.wolfData));
		this.wolfData.contextExit();
	}
	this.wolfData.contextExit("db");
	
	this.wolfData.verify.apply(this.wolfData, this.terminators);
	this.endPos = this.wolfData.currentPos();
	this.wolfData.contextExit();
	
	this.wolfData.isParseSuccess = true;
	
}

const WolfDBType = function(wolfData) {
	if (!(this instanceof WolfDBType)) return console.warn("WolfDBType is a constructor!")
	this.headerBuffer = Buffer.from([0xFE, 0xFF, 0xFF, 0xFF]);
	this.terminator = Buffer.from([0xC1]);
	this.wolfData = wolfData;
	
	this.parse();
}
WolfDBType.prototype.parse = function() {
	this.position = this.wolfData.currentPos();
	this.wolfData.verify(this.headerBuffer);
	this.typeId = this.wolfData.readInteger32LE();
	this.fieldCount = this.wolfData.readInteger32LE();
	
	this.fieldTypes = [];
	for (var i=0; i<this.fieldCount; i++) {
		this.fieldTypes.push(this.wolfData.readInteger32LE());
		//this.fields.push(new WolfDBField(this.wolfData));
	}
	
	// sorting the types.
	// this will ensure that the string data will always parsed after int
	this.fieldTypes.sort(); 
	
	this.data = []
	this.dataLength = this.wolfData.readInteger32LE();
	for (var dataIndex=0; dataIndex<this.dataLength; dataIndex++) {
		var fieldData = [];
		for (let i=0; i<this.fieldCount; i++) {
			
			var thisData = {};
			thisData.position = this.wolfData.currentPos();
			if (this.fieldTypes[i] < 2000) {
				thisData.type = "int";
				thisData.value = this.wolfData.readInteger32LE();
			} else {
				thisData.type = "str";
				thisData.value = this.wolfData.readString(["fldSet", dataIndex, "idx", i, "val"]);
			}
			thisData.endPos = this.wolfData.currentPos();
			
			fieldData.push(thisData);
		}
		this.data.push(fieldData);
	}
	
	this.endPos = this.wolfData.currentPos();
}


// =============================================================
// G a m e . d a t
// =============================================================
var WolfGameDatFile = function(file, writeMode, options) {
	if (!(this instanceof WolfGameDatFile)) return console.warn("WolfGameDatFile is a constructor!")
	this.headerBuffers = [
		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x00]),
		Buffer.from([0x00, 0x57, 0x00, 0x00, 0x4F, 0x4C, 0x00, 0x46, 0x4D, 0x55]),
	];
	this.terminator = Buffer.from([]);
	this.wolfData = new WolfData(file, writeMode, options);
	this.file = file;
	this.wolfData.contextEnter(this.wolfData.fileName);
	this.parse();
	this.wolfData.contextExit();
	this.wolfData.isParseSuccess = true;
}

WolfGameDatFile.prototype.parse = function() {
	try {
		this.position = this.wolfData.currentPos();
		this.wolfData.verify.apply(this.wolfData, this.headerBuffers);
		
		this.byteDataLength = this.wolfData.readInteger32LE();
		this.byteData = [];
		for (let i=0; i<this.byteDataLength; i++) {
			this.byteData.push(this.wolfData.readByte());
		}
		this.stringDataLength = this.wolfData.readInteger32LE();
		this.stringData = [];
		var stringContext = [
			"title",
			["unknown", "CAUTION"],
			["decryptKey", "CAUTION"],
			["font", 0, "CAUTION"],
			["font", 1, "CAUTION"],
			["font", 2, "CAUTION"],
			["font", 3, "CAUTION"],
			["font", 4, "CAUTION"],
			"version"
		]
		for (let i=0; i<this.stringDataLength; i++) {
			this.stringData.push(this.wolfData.readString(stringContext[i]));
		}
		
		// read the rest of data as a raw;
		this.dataBody = this.wolfData.read(this.wolfData.length - this.wolfData.currentPos());
		
		this.endPos = this.wolfData.currentPos();
	} catch (e) {
		console.error("Error parsing ", this.file, e);
		return;
	}
}

module.exports = {
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
}