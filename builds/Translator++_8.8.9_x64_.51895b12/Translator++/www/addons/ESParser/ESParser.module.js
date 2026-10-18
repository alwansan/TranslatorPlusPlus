var {ParserBase} = require("www/js/ParserBase.js");
const jsTokens = require("js-tokens");

class ESScript extends ParserBase {
	constructor(script, options, callback) {
		super(script, options, callback);
	}
}

ESScript.stringTypes = ["StringLiteral", "NoSubstitutionTemplate", "TemplateHead", "TemplateMiddle", "TemplateTail"];

ESScript.detectEncoding = function(d) {
    // var d = new Buffer.alloc(5, [0, 0, 0, 0, 0]);
    // var fd = fs.openSync(f, 'r');
    // fs.readSync(fd, d, 0, 5, 0);
    // fs.closeSync(fd);
	d = Buffer.from(d);

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


ESScript.prototype.filterText = function(text, context) {
	// filter text for trans
	var result = text;

	if (text == `""` || text == '``' || text == "''") return "";

	//console.log("Filtering ", text);
	if (context.includes("TemplateHead")) {
		text = "`"+text.substring(1, text.length-2)+"`";
	} else if (context.includes("TemplateMiddle")) {
		text = "`"+text.substring(1, text.length-2)+"`";
	} else if (context.includes("TemplateTail")) {
		text = "`"+text.substring(1, text.length-1)+"`";
	} 

	try {
		result = eval(text);
		//console.log("Filtering result:", result, "type", typeof result);
	} catch (e) {
		console.warn("Error when trying to eval from string : ", text);
	}

	if (typeof result !== "string") {
		console.warn(`${result} is not string. Evaluating:`, text, "type:", typeof text);
	}

	return result;
}

ESScript.prototype.replaceLineBreak = function(text) {
	if (typeof text !== 'string') {
		console.warn("Attempt to replace line break of non string typed variable", text);
		return text;
	}
	return text.replace(/\n/g, "\\n");
}

ESScript.prototype.unfilterText = function(text, context) {
	// generate text from trans to javascript
	//console.log("Unfilter with text: ", text, "type:", typeof text);
	if (typeof text !== "string") return text;

	//console.log("Processing unfilter");
	var newText = text;
	newText = this.replaceLineBreak(text);
	newText = newText.replace(/\\/g, "\\\\");
	newText = newText.replace(/`/g, "\\`");
	
	if (context.includes("TemplateHead")) return "`"+newText+"${";
	if (context.includes("TemplateMiddle")) return "}"+newText+"${";
	if (context.includes("TemplateTail")) return "}"+newText+"`";

	var result = JSON.stringify(text);

	return result;
}


ESScript.prototype.getRowCol = function(index) {
	var chunck = this.script.substring(0, index);
	var lines = chunck.split("\n");
	return {
		row:lines.length,
		col:lines[lines.length -1].length
	}
}

ESScript.prototype.leftHandContext = function(index, tokens) {
	tokens = tokens || this.tokens || [];
	var result = {
		type:"",
		context:[]
	};
	var countComma = 0;
	var bracketLevel = 0;
	var sqBracketLevel = 0;
	var counter = 0;
	for (var i=index; i>=0; i--) {
		var thisToken = tokens[i];
		if (thisToken.type == "Punctuator") {
			if ([";", "}"].includes(thisToken.value)) {
				return result;
			} else if (thisToken.value == ",") {
				countComma++;
			} else if (thisToken.value == ")") {
				bracketLevel++;
			} else if (thisToken.value == "(") {
				if (bracketLevel > 0) {
					bracketLevel--;
					continue;
				}
				result.context.unshift(countComma);
				countComma = 0;
				result.type = "functionArgs";
			} else if (thisToken.value == "]") {
				sqBracketLevel++;
			} else if (thisToken.value == "[") {
				if (sqBracketLevel > 0) {
					sqBracketLevel--;
					continue;
				}
				result.type = "objectKey";
			} else if (["+", "+="].includes(thisToken.value)) {
				result.type = "concatenate"
				return result;
			} else if (thisToken.value == "=") {
				result.type = "assignment";
			}
		} else if (ESScript.stringTypes.includes(thisToken.type)) {
			if (counter == 0) continue;
			if (bracketLevel > 0) continue;
			return result;
		} else if (thisToken.type == "IdentifierName") {
			if (countComma > 0) {
				// do nothing
			} else {
				result.context.unshift(thisToken.value);
			}
			if (["if", "var", "const", "typeof", "let"].includes(thisToken.value.toLowerCase())) return result;
		} else if (thisToken.type == "LineTerminatorSequence") {
			return result;
		}
		counter++;
	}
	return result;
}

ESScript.prototype.isJSONString = function(str) {
	if (typeof str !== 'string') return false;
	if (!str) return false;
	try {
		var jsonStr = eval(str);
		return common.isJSONString(jsonStr);
	} catch (e) {
		return false;
	}
}

ESScript.prototype.quote = function(text, quoteType) {
	quoteType = quoteType || '"';
	var quoteTypes = ["'", "`", '"'];
	if (!quoteTypes.includes(quoteType)) quoteType = '"';
	text = text.replaceAll(quoteType, "\\"+quoteType);
	return quoteType+text+quoteType;
}


ESScript.prototype.parse = async function() {
	this.tokens = Array.from(jsTokens(this.script), (token) => token);
	var start = 0;
	for (var i=0; i < this.tokens.length; i++) {
		var end = start+this.tokens[i].value.length
		this.tokens[i].start 	= start;
		this.tokens[i].end 		= end;
		//var rowCol = this.getRowCol(start);
		this.lastToken = this.tokens[i];
		if (ESScript.stringTypes.includes(this.tokens[i].type)) {
			//console.log(">Processing text:", this.tokens[i].value);
			
			if (this.isJSONString(this.tokens[i].value)) {
				var jsonValue = eval(this.tokens[i].value);
				console.log("jsonValue:", jsonValue);
				if (this.debugLevel > 2) console.log('Processing JSON type string', this.tokens[i].value);
				var jsonObj = JSON.parse(jsonValue);
				console.log("jsonObj", jsonObj);
				var thisOptions = {
					translationPair : this.translationPair,
					translationInfo : this.translationInfo,
					baseContext 	: ["tok", i,"type", this.tokens[i].type, "pos", start, "JSON"],
					baseParameter	: {
						start	:start,
						end		:end,
						leftHand:this.leftHandContext(i)
					}
				}
				var jsonTrans = new JSONTranslate(jsonObj, thisOptions);
				jsonTrans.debugLevel = 9;
				jsonTrans.parse();
				console.log("JSON within script:", jsonTrans);
				this.importTransData(jsonTrans);
				this.register(this.quote(jsonTrans.toString(), "`"));
			} else if (!common.isTranslatableText(this.tokens[i].value)) {
				// symbols etc, not translatable
				this.register(this.tokens[i].value);
			} else {
				this.registerString(this.tokens[i].value, ["tok", i,"type", this.tokens[i].type, "pos", start], {
					start:start,
					end:end,
					leftHand:this.leftHandContext(i)
				});
			}
		} else {
			this.register(this.tokens[i].value);
		}

		start = end;
	}
	this.isParsed = true;
}


/**
 * Get string from inside a function's parameter
 */
ESScript.prototype.fetchFromFn = async function() {
	this.tokens = Array.from(jsTokens(this.script), (token) => token);

	var start = 0;
	for (var i=0; i < this.tokens.length; i++) {
		var end = start+this.tokens[i].value.length
		this.tokens[i].start 	= start;
		this.tokens[i].end 		= end;		
		if (this.tokens[i].type == "StringLiteral") {
			this.registerString(this.tokens[i].value, ["tok", i]);
		} else {
			this.register(this.tokens[i].value);
		}

		start = end;
	}
	return this;
}



const ESFile = function(file, options, callback) {
	this.file 			 	= file;
	this.options 			= options || {};
	// basedir is required to calculate relative path
	this.options.baseDir	= this.options.baseDir || "";
	if (!this.options.baseDir) console.warn("options.baseDir is not defined, trans path will show full path instead");
	this.translationData 	= this.options.translationData||{};
	this.contextSeparator 	= this.options.contextSeparator || "/"
	this.showBlank 			= this.options.showBlank || false;
	this.engineName			= 'esfile'
	this.parser				= 'ESParser';
	this.callback 			= callback || function() {}
	this.promise;
	this.isInitialized 		= false;
	this.options.filterOptions = this.options.filterOptions || {};
	this.options.filterOptions.files = this.options.filterOptions.files || [];
}

ESFile.prototype.getRelativePath = function() {
	var newPath = this.file.replace(/\\/g, "/");
	newPath = newPath.substring(this.options.baseDir.length);
	if (newPath[0] == "/") newPath = newPath.substr(1);
	return newPath;
}

ESFile.prototype.toTrans = async function() {
	if (!this.isInitialized) await this.init();
	this.esScript.parse();
	console.log("parsed ES : ", this);

	var thisRelPath = this.getRelativePath();
	this.trans = await this.esScript.toTrans();
	this.trans.basename 	= nwPath.basename(thisRelPath);
	this.trans.filename 	= nwPath.basename(thisRelPath);
	this.trans.extension 	= nwPath.extname(thisRelPath);
	this.trans.dirname 		= nwPath.dirname(thisRelPath);
	this.trans.path			= thisRelPath;
	this.trans.tags			= [];

	return this.trans;
}

ESFile.prototype.writeTo = async function(target) {
	if (!this.isInitialized) await this.init();
	try {
		await common.mkDir(nwPath.dirname(target));
		await common.writeFile(target, this.esScript.writableData.join(""));
	} catch (e) {
		console.warn(e);
	}
}
/**
 * @param  {} translationData
 * Format :
 * {
 * "info": {},
 * "translationPair": {
 *   "MOG_TitlePictureCom": "MOG_TitlePictureCom22"
 * }

 */
ESFile.prototype.setTranslationData = function(translationData) {
	translationData = translationData ||{};
	this.options = this.options || {}
	this.options.translationData = translationData || {};
	this.options.translationPair = this.options.translationData.translationPair
	this.options.translationInfo = this.options.translationData.info
	return this;
}

ESFile.prototype.init = async function() {
	try {
		this.content = await common.fileGetContents(this.file);
	} catch (e) {
		console.warn("Can not initialize ESFile", e);
		return;
	}
	console.log(`parsing ${this.file} with options :`, this.options);
	this.esScript  = new ESScript(this.content, this.options); 
	this.isInitialized = true;

}

class JSONTranslate extends require("www/js/ParserBase.js").ParserBase {
	constructor(obj, options, callback) {
		super(obj, options, callback)
		this.obj = obj || {};
		this.beautifyOutput = options.beautifyOutput || false;
	}
}

JSONTranslate.isCommonOperatorString = function(string) {
	if (typeof string !== 'string') return false;
	var common = ["on", "off", "true", "false"];
	if (common.includes(string.toLowerCase())) return true;
	return false;
}


JSONTranslate.prototype.filter = function(text, context) {
	// do something
	return true;
}

JSONTranslate.prototype.parse = function(obj, context, translationPair) {
	obj = obj || this.obj;
	obj = common.clone(obj);
	translationPair = translationPair || this.translationPair;
	context = context || [];
	if (Array.isArray(context) == false) context = [context];

	var fetchChild = (childObj, localContext) => {
		// create new clone of localContext
		if (Array.isArray(localContext) == false) localContext = [localContext];
		if (this.debugLevel > 5) console.log(">parsing JSON obj",childObj);

		for (var i in childObj) {
			var newContext = common.clone(localContext);
			newContext.push(i);
			if (Boolean(childObj[i]) == false) continue
			if (common.isNumeric(childObj[i])) continue;
			if (typeof childObj[i] == 'object') {
				fetchChild(childObj[i], newContext);
			} else if (typeof childObj[i] == 'string') {
				if (this.debugLevel > 5) console.log(">entering string mode", childObj[i]);
				//var contextString = newContext.join("/");
				//if (contextString.includes("parameters") == false) continue;
				if (!this.filter.call(this, childObj[i], newContext)) continue;
				if (JSONTranslate.isCommonOperatorString(childObj[i])) continue;
				if (!common.isTranslatableText(childObj[i])) continue;				
				if (this.debugLevel > 5) console.log(">registering text", childObj[i]);
				

				if (common.isJSONString(childObj[i])) {
					newContext.push("JSON");
					var jsonObj = fetchChild(JSON.parse(childObj[i]), newContext);
					childObj[i] = JSON.stringify(jsonObj);
				} else {
					childObj[i] = this.registerString(childObj[i], newContext);
				}

			}
			
		}
		return childObj;
	}

	fetchChild(obj, context);
	this.translated = obj;
	return obj;
}

JSONTranslate.prototype.toString = function() {
	if (this.beautifyOutput) return JSON.stringify(this.translated, undefined, 2);
	return JSON.stringify(this.translated);
}

module.exports = {ESScript, ESFile, JSONTranslate};