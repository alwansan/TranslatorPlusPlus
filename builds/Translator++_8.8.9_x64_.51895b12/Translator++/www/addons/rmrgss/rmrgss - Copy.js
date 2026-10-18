var thisAddon 	= this;
var appName 	= this.package.name;
var spawn 		= spawn || require('child_process').spawn;
var ws 			= ws || require('windows-shortcuts');
var ini 		= ini || require('ini')
var stripBom	= require('strip-bom');
var bCopy 		= require('better-copy');
var fse 		= fse || require('fs-extra');
var afs 		= afs || require('await-fs');
var pSpawn 		= require('promisify-child-process').spawn;
var decrypterPath = nwPath.join(__dirname, "3rdParty/RgssDecrypter/");
var ini 		= require("ini");
const thisPath  = thisAddon.getPathRelativeToRoot();
thisAddon.debugLevel = 0;

this.optionsForm = {
		"booleanValue": {
			"type": "boolean",
			"title": t("Use legacy parser"),
			"description": t("Use the old parser prior to (Translator++ ver. 3.8.12). The old parser doesn't support some newly added features."),
			"HOOK": "thisAddon.config.useLegacyParser",
			"inlinetitle": t("Use old parser"),
			"fieldHtmlClass":"flipSwitch"
		},
		"numberOfThread": {
			"type": "range",
			"maximum" : 7,
			"minimum" : 0,
			"indicator":true,
			"title": t("Number of thread"),
			"description": t("Warning: this is experimental feature! If 0 then multi threading will be disabled. If this value is greater than 0, than the parsing process will be handled by separate thread. The most ideal value is your machine's core - 1."),
			"HOOK": "thisAddon.config.numberOfThread",
			"onInput": function() {
				console.log("onInput");
			}
		}
}

thisAddon.config = thisAddon.config || {};
if (typeof thisAddon.config.numberOfThread == 'undefined')  thisAddon.config.numberOfThread = 0;



moduleAlias.addAliases({
  '@rmrgss': thisPath + "/node_modules"
})
moduleAlias.addPath(thisPath+'/node_modules');
moduleAlias(thisPath+'/package.json');

window.yaml = require('@rmrgss/yaml');
var yamlVer2 = false;
var resolveSeq;
if (common.isFile("www/addons/rmrgss/node_modules/yaml/dist/resolveSeq-d03cb037.js")) {
	resolveSeq = require('www/addons/rmrgss/node_modules/yaml/dist/resolveSeq-d03cb037.js');
} else {
	resolveSeq = require('@rmrgss/yaml/util');
	yamlVer2 = true;
}

/**
 * Create a new document based on a node
 * @param {*} path 
 * @returns 
 */
yaml.Document.prototype.newDocumentIn = function(path) {
	var newDocument = new this.constructor();
	var content = this.getIn(path);
	newDocument.contents 	= content;
	newDocument.anchors.map 	= {...newDocument.anchors.map, ...this.anchors.map};
	return newDocument;
}

yaml.Document.prototype.toStringIn = function(path) {
	return this.newDocumentIn(path).toString();
}

yaml.Document.prototype.setDocumentIn = function(path, newDocument) {
	this.setIn(path, newDocument.contents);
	this.anchors.map 	= {...this.anchors.map, ...newDocument.anchors.map};
	return this;
}

/**
 * Fetch data from any iterable objects, Sequence (Array), or Map (Hash)
 * @param  {} data
 * @param  {} index
 */
if (yamlVer2) {
	yaml.getFromIndex = function(data, index) {
		//console.log("yaml.getFromIndex", data, index);
		if (empty(data)) return data;
		if (data.constructor.name !== "YAMLMap" && data.constructor.name !== "YAMLSeq") return console.warn("Trying to get index from an invalid iteratable object.")
		if (typeof index !== "number") return console.warn("Invalid number", index);
	
		if (this.isSeq(data)) {// MAP : hash, SEQ : array
			// array
			//console.log("data is array", data);
			return data.items[index];
		} else {
			// hash
			//console.log("data is hash", data);
			return data.items[index].value;
		}
	}
} else {
	yaml.getFromIndex = function(data, index) {
		if (empty(data)) return data;
		if (data.constructor.name !== "YAMLMap" && data.constructor.name !== "YAMLSeq") return console.warn("Trying to get index from an invalid iteratable object.")
		if (typeof index !== "number") return console.warn("Invalid number", index);
	
		if (data.type == "SEQ") {// MAP : hash, SEQ : array
			// array
			return data.items[index];
		} else {
			// hash
			return data.items[index].value;
		}
	}
}

function b64EncodeUnicode(str) {
	// first we use encodeURIComponent to get percent-encoded UTF-8,
	// then we convert the percent encodings into raw bytes which
	// can be fed into btoa.
	// b64EncodeUnicode('✓ à la mode'); // "4pyTIMOgIGxhIG1vZGU="
	return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
		function toSolidBytes(match, p1) {
			return String.fromCharCode('0x' + p1);
	}));
}
function b64DecodeUnicode(str) {
	// Going backwards: from bytestream, to percent-encoding, to original string.
	// b64DecodeUnicode('4pyTIMOgIGxhIG1vZGU='); // "✓ à la mode"
	return decodeURIComponent(atob(str).split('').map(function(c) {
		return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
	}).join(''));
}

class GameIniParser extends require('www/js/ParserBase.js').ParserBase {
	constructor(script, options, callback) {
		super(script, options, callback)
		this.debugLevel = thisAddon.debugLevel;
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};

	}
}
GameIniParser.prototype.registerStringObject = function(obj, key, parameters, options) {
	var translation = this.registerString(obj[key], parameters, options);
	// apply translation
	obj[key] = translation;
	return translation;
}

GameIniParser.prototype.filterText = function(text, context, parameters) {
	return ini.unsafe(text);
}

GameIniParser.prototype.unfilterText = function(text, context, parameters) {
    return ini.safe(text);
}

GameIniParser.prototype.toString = function() {
	return ini.stringify(this.ini);
}

GameIniParser.prototype.parse = async function() {
	this.ini = ini.parse(this.script);

	if (empty(this.ini)) return this;
	for (var category in this.ini) {
		if (typeof this.ini[category] !== "object") continue;
		for (var varName in this.ini[category]) {
			var tags=["red"];
			if (category.toLowerCase()=="game" && varName.toLowerCase()=="title") {
				tags=[];
				this.gameTitle = this.ini[category][varName];
				console.log("Game title:", this.gameTitle);
			}
			this.registerStringObject(this.ini[category], varName, ["Game.ini", category, varName], {}, {tags:tags})
		}
	}
	return this;
}

//var ScriptParser = require('www/js/ScriptParser.js');
//const { join, relative } = require('path');



class RGSSParser extends require('www/js/ScriptParser.js') {
	constructor(script, options, callback) {
		super(script, options, callback)
		this.language = "rgss";
		this.debugLevel = thisAddon.debugLevel;
		this.currentEntryPoint = {};
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};

		this.init();
	}
}

RGSSParser.extendPrism = function () {
	if (Prism.languages.rgss) return;
	Prism.languages.rgss = Prism.languages.extend('ruby')
	var interpolation = {
		pattern: /#\{[^}]+\}/,
		inside: {
			'delimiter': {
				pattern: /^#\{|\}$/,
				alias: 'tag'
			},
			rest: Prism.languages.ruby
		}
	};
	Prism.languages.rgss.string.push(
		{
			pattern: /<<[-~]?([a-z_]\w*)(.*)[\r\n](?:.*[\r\n])*?[\t ]*\1/i,
			alias: 'heredoc-string',
			greedy: true,
			inside: {
				'delimiter': {
					pattern: /^<<[-~]?[a-z_]\w*(.*)[\r\n]|[a-z_]\w*$/i,
					alias: 'symbol',
					inside: {
						'punctuation': /^<<[-~]?/
					}
				},
				'interpolation': interpolation
			}
		}	
	)
	
	Prism.languages.rgss.string[0].alias = 'string-misc';
	Prism.languages.rgss.string[0].pattern = /%[qQiIwWxs]?(?:([^a-zA-Z0-9\s{(\=[<])(?:(?!\1)[^\\]|\\[\s\S])*\1|\((?:[^()\\]|\\[\s\S])*\)|\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}|\[(?:[^\[\]\\]|\\[\s\S])*\]|<(?:[^<>\\]|\\[\s\S])*>)/;
	Prism.languages.rgss.string[1].alias = 'string-quote';
	Prism.languages.rgss.string[1].pattern = /("|')(?:#\{[^}]+\}|#(?!\{)|\\(?:\r\n|[\s\S])|(?!\1)[^\\#])*\1/
	Prism.languages.rgss.string[2].inside.delimiter.pattern = /^<<[-~]?[a-z_]\w*[\r\n]|[a-z_]\w*$/i
	Prism.languages.rgss.string[3].inside.delimiter.pattern = /^<<[-~]?'[a-z_]\w*'[\r\n]|[a-z_]\w*$/i
	//Prism.languages.rgss.string[2].inside.punctuation = /[\r\n]/
	//Prism.languages.rgss.string[3].inside.punctuation = /[\r\n]/
}

RGSSParser.prototype.filterText = function(text, context, parameters) {
	if (parameters.parentAlias == "string-quote") {
		// strip slashes from quote
		text = common.stripSlashes(text);
	} else if (parameters.parentAlias == "string-misc") {
		var bkEscaper = '[----backslashEscape:'+common.rand(10000000,99999999)+":----]"
		text = text.replaceAll('\\\\', bkEscaper)
		.replaceAll('\\}', '}')
		.replaceAll('\\)', ')')
		.replaceAll('\\/', '/')
		.replaceAll('\\]', ']')
		.replaceAll('\\>', '>')
		.replaceAll('\\n', "\n")
		.replaceAll('\\r', "\r")
		.replaceAll(bkEscaper, '\\')
	}
	
	return text;
}

RGSSParser.prototype.unfilterText = function(text, context, parameters) {
	if (parameters.parentAlias == "string-quote") {
		// add slashes to quote
		text = common.addSlashes(text);
	} else if (parameters.parentAlias == "string-misc") {
		text = text.replace(/[\\/})\]>]/g, function(match) {
			return "\\"+match;
		})
	}
    return text;
}

RGSSParser.prototype.init = function() {
	RGSSParser.extendPrism();
	this.on('beforeRegisterString', (args)=>{
		var token 		= args[0];
		var parentType 	= args[1]
		var options 	= args[2]

		var parentAlias = ""
		try {
			parentAlias = options.parent.alias;
		} catch (e) {
			console.warn(e);
		}

		if (parentAlias == "string-quote") {
			//console.log("handling string quote", args);
			var quote = ['"', "'"]
			if (options.index == 0) {
				// first index
				if (quote.includes(token.charAt(0))) {
					this.register(token.charAt(0));
					token = token.substring(1);
					this.currentOffset += 1;
				}
			}

			if (options.index == (options.siblingNumber -1)) {
				// last index
				var closingQuote = token.substring(token.length-1);
				if (quote.includes(closingQuote)) {
					token = token.substring(0, token.length -1);
					//this.registerString(token, this.baseContext.concat([this.currentOffset]), {parentType:"string-quote", start:this.currentOffset, end:this.currentOffset+token.length});
					this.registerString(token, this.baseContext.concat([this.currentOffset]), {parentType:"string-quote", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					
					// register closing quote
					this.register(closingQuote);
					this.currentOffset += closingQuote.length;
					return common.thru(); // skip default behavior
				}
			} else {
				this.registerString(token, this.baseContext.concat([this.currentOffset]), {parentType:"string-quote", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
				this.currentOffset += token.length;
				return common.thru(); // skip default behavior
			}
		} else if (parentAlias == "heredoc-string") {
			//console.log("handling heredoc string", args);
			if (options.index == 1) { // first after delimiter
				var firstChar = token.charAt(0);

				try {
					var delimiter = options.members[0].content[1]
					if (delimiter.substring(0, delimiter.length - 1) == "\n") return;
				} catch (e) {
					console.warn(e);
					return;
				}

				if (token.substring(0,2) == "\r\n" || token.substring(0,2) == "\n\r") {
					this.register("\r\n");
					this.currentOffset += 2;

					token = token.substring(2);
					this.registerString(token, this.baseContext.concat([this.currentOffset]), {parentType:"heredoc-string", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					return common.thru(); // skip default behavior

				} else if (firstChar == "\n") {
					this.register(firstChar);
					this.currentOffset += 1;

					token = token.substring(1);
					this.registerString(token, this.baseContext.concat([this.currentOffset]), {parentType:"heredoc-string", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					return common.thru(); // skip default behavior

				}

			}
		} else if (parentAlias == "string-misc") {
			//console.log("handling string-misc", args);
			if (options.index == 0) {
				var match = token.match(/%[qQiIwWxs]?[/{(\[<]?/);
				if (match) {
					if (match.index == 0) {
						this.register(match[0]);
						token = token.substring(match[0].length);
						this.currentOffset += match[0].length;
					}
				}
			}
			
			if (options.index == (options.siblingNumber -1)) {
				var quote = ["/", "}", ")", ">", "]"];
				var closingQuote = token.substring(token.length-1);
				if (quote.includes(closingQuote)) {
					token = token.substring(0, token.length -1);
					this.registerString(token, this.baseContext.concat([this.currentOffset]), {parentType:"string-misc", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					
					// register closing quote
					this.register(closingQuote);
					this.currentOffset += closingQuote.length;
					return common.thru(); // skip default behavior
				}
			} else {
				this.registerString(token, this.baseContext.concat([this.currentOffset]), {parentType:"string-misc", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
				this.currentOffset += token.length;
				return common.thru(); // skip default behavior
			}
		}
		

	});

	this.on('afterRegisterString', (args)=>{
		
	})	
}


thisAddon.RGSSParser = RGSSParser;
window.RGSSParser = RGSSParser;

class RMData extends require("www/js/ParserBase.js").ParserBase {
	constructor(obj, options, callback) {
		super(obj, options, callback)
		this.debugLevel = thisAddon.debugLevel;
		this.currentEntryPoint = {};
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};
	}
}
RMData.RPGM_EVENT_CODE = {
	"0": "Empty",
	"101": "Show Text Attributes",
	"102": "Show Choices",
	"103": "Input Number",
	"104": "Select Key Item",
	"105": "Show Scrolling Text Attributes",
	"108": "Comment",
	"111": "Conditional Branch",
	"112": "Loop",
	"113": "Break Loop",
	"115": "Exit Event Processing",
	"117": "Call Common Event",
	"118": "Label",
	"119": "Jump to Label",
	"121": "Control Switches",
	"122": "Control Variables",
	"123": "Control Self Switch",
	"124": "Control Timer",
	"125": "Change Gold",
	"126": "Change Items",
	"127": "Change Weapons",
	"128": "Change Armor",
	"129": "Change Party Member",
	"132": "Change Battle BGM",
	"133": "Change Battle End ME",
	"134": "Change Save Access",
	"135": "Change Menu Access",
	"136": "Change Encounter",
	"137": "Change Formation Access",
	"138": "Change Window Color",
	"201": "Transfer Player",
	"202": "Set Vehicle Location",
	"203": "Set Event Location",
	"204": "Scroll Map",
	"205": "Set Move Route",
	"206": "Get on/off Vehicle",
	"211": "Change Transparency",
	"212": "Show Animation",
	"213": "Shot Balloon Icon",
	"214": "Erase Event",
	"216": "Change Player Followers",
	"217": "Gather Followers",
	"221": "Fadeout Screen",
	"222": "Fadein Screen",
	"223": "Tint Screen",
	"224": "Flash Screen",
	"225": "Shake Screen",
	"230": "Wait",
	"231": "Show Picture",
	"232": "Move Picture",
	"233": "Rotate Picture",
	"234": "Tint Picture",
	"235": "Erase Picture",
	"236": "Set Weather Effects",
	"241": "Play BGM",
	"242": "Fadeout BGM",
	"243": "Save BGM",
	"244": "Replay BGM",
	"245": "Play BGS",
	"246": "Fadeout BGS",
	"249": "Play ME",
	"250": "Play SE",
	"251": "Stop SE",
	"261": "Play Movie",
	"281": "Change Map Display",
	"282": "Change Tileset",
	"283": "Change Battle Back",
	"284": "Change Parallax Back",
	"285": "Get Location Info",
	"301": "Battle Processing",
	"302": "Shop Processing",
	"303": "Name Input Processing",
	"311": "Change HP",
	"312": "Change MP",
	"313": "Change State",
	"314": "Recover All",
	"315": "Change EXP",
	"316": "Change Level",
	"317": "Change Parameters",
	"318": "Change Skills",
	"319": "Change Equipment",
	"320": "Change Actor Name",
	"321": "Change Actor Class",
	"322": "Change Actor Graphic",
	"323": "Change Vehicle Graphic",
	"324": "Change Actor Nickname",
	"325": "Change Actor Profile",
	"331": "Change Enemy HP",
	"332": "Change Enemy MP",
	"333": "Change Enemy State",
	"334": "Enemy Recover All",
	"335": "Enemy Appear",
	"336": "Enemy Transform",
	"337": "Show Battle Animation",
	"339": "Force Action",
	"340": "Abort Battle",
	"351": "Open Menu Screen",
	"352": "Open Save Screen",
	"353": "Game Over",
	"354": "Return to Title Screen",
	"355": "Script Header",
	"356": "Plugin Command",
	"401": "Show Text",
	"402": "Choice",
	"403": "Choice Cancel",
	"404": "Choices End",
	"405": "Show Scrolling Text",
	"408": "Comment More",
	"411": "Else",
	"412": "Branch End",
	"413": "Repeat Above",
	"601": "If Win",
	"602": "If Escape",
	"603": "If Lose",
	"604": "Battle Processing End",
	"605": "Shop Item",
	"655": "Script"
}

RMData.determineType = function($path) {
	var fileName = nwPath.basename($path, nwPath.extname($path));
	if (/Map[0-9]+/g.test(fileName)) {
		return "map"
	} else {
		return fileName.toLowerCase();
	}
}

RMData.prototype.addTransData = function(translatableObj) {
	var result = this.transData;
	if (typeof result.indexIds[translatableObj.text] == "undefined") result.indexIds[translatableObj.text] = result.data.length;
	//result.indexIds[thisObj.text] = result.indexIds[thisObj.text] || result.data.length;
	
	var row = result.indexIds[translatableObj.text];
	result.data[row] 		= result.data[row] || [translatableObj.text, ""];

	result.context[row] 	= result.context[row]||[];
	result.context[row].push(translatableObj.context.join(this.contextSeparator))

	if (!empty(translatableObj.parameters)) {
		result.parameters[row] 	= result.parameters[row] || [];
		result.parameters[row].push(translatableObj.parameters);
	} 

	if (translatableObj.tags.length > 0) {
		result.tags[row] 	= result.tags[row] || [];
		result.tags[row].push(translatableObj.tags);
	}
	
	return this;	
}

RMData.prototype.registerStringObject = function(yamlMap, key, parameters, options) {
	console.log("registerStringObject", arguments);
	if (empty(yamlMap)) {
		console.warn("ERROR:registerStringObject yamlMap is empty!", arguments);
		return yamlMap;
	}
	if (Array.isArray(key) == false) key = [key];

	if (yamlMap.hasIn(key) == false) {
		console.log("Can not find key :", key);
		return yamlMap;
	}

	try {
		var value = yamlMap.getIn(key);
	} catch(e) {
		console.warn("ERROR: can not get the value", arguments, e);
	}

	if (thisAddon.debugLevel > 2) console.log("registerStringObject", value, "key:", key);
	if (typeof value !== "string") {
		console.warn("ERROR: trying to registerString non string value. In registerStringObject", arguments);
		return value;
	}
	var translation = this.registerString(value, parameters, options);
	// apply translation

	if (value !== translation) yamlMap.setIn(key, translation);

	return translation;
}


RMData.prototype.unfilterText = function(text, context, parameters) {
	// adding carriage return
	// without carriage return all newlines are glued together
	// ... and the weird part is, this is only applied to the database items. Maps are OK.
	return text.replaceAll("\r", "").replaceAll("\n", "\r\n");
}

RMData.prototype.registerString = function(string, localContext, parameters, options) {
	options = options || {};
	options.currentAddress = options.currentAddress || this.currentAddress;

	//console.log("registering string:", arguments);

	var copyContext = JSON.parse(JSON.stringify(this.currentContext))
	localContext = localContext||[];
	if (Array.isArray(localContext) == false) localContext = [localContext];
	copyContext = copyContext.concat(localContext);

	var filteredText = this.filterText(string, copyContext, parameters)

	if (string.trim().length > 0) {
		var obj = {
			text:filteredText,
			rawText:string,
			context:copyContext,
			parameters:parameters,
			tags:options.tags||[],
			address:common.clone(options.currentAddress)
		}
		this.translatableTexts.push(obj);

		this.addTransData(obj);
	}
	
	var translation = this.translate(filteredText, copyContext);
	if (translation !== filteredText) {
		if (this.debugLevel >= 1) console.log("%cTranslating", 'background: #222; color: #bada55', filteredText,"->", translation, this.translationPair);
		
		translation = this.unfilterText(translation, copyContext, parameters);

		this.writableData.push(translation);
		return translation;

	} else {
		this.writableData.push(string);
		return string;
	}
}


if (yamlVer2) {
	RMData.prototype.fetchCommonData = function(data, whatToFetch, parentContext, options) {
		//console.log("Handling common data", arguments);
		whatToFetch = whatToFetch || [];
		options = options || {};
		options.currentAddress = options.currentAddress || [];
	
		var arrayContent = data.getIn([]);
		//var iterableType = arrayContent.type; // MAP : hash, SEQ : array
		if (empty(arrayContent)) return this;
		if (!Array.isArray(arrayContent.items)) return this;
		for (var i=0; i<arrayContent.items.length; i++) {
			//console.log('arrayContent.items[i]', arrayContent.items[i]);
			if (empty(arrayContent.items[i])) continue;
			//if (arrayContent.items[i].constructor.name !== "YAMLMap") continue;
			for (var t=0; t<whatToFetch.length; t++) {
				var topic = whatToFetch[t];
				if (this.debugLevel > 2) console.log("Fetch", topic, "from", arrayContent.items[i]);
				//if (iterableType == "SEQ") {
				if (yaml.isSeq(arrayContent)) {
					// Array
					if (data.hasIn([i, topic]) == false) continue;
					//var context = parentContext.concat([i, topic]);
					//var thisCurrentAddress = options.currentAddress.concat([i, topic]);
					// arrayContent.items[0].value.getIn(["name"])
					this.registerStringObject(arrayContent.items[i], topic, parentContext.concat([i, topic]), [], {currentAddress:options.currentAddress.concat([i, topic])})
				} else {
					// Hash. Be careful! i does't represents KEY!
					var key = arrayContent.items[i].key;
					this.registerStringObject(arrayContent.items[i].value, topic, parentContext.concat([key, topic]), [], {currentAddress:options.currentAddress.concat([key, topic])})
				}
			}
		}
		return this;
	}
} else {

	RMData.prototype.fetchCommonData = function(data, whatToFetch, parentContext, options) {
		//console.log("Handling common data", arguments);
		whatToFetch = whatToFetch || [];
		options = options || {};
		options.currentAddress = options.currentAddress || [];
	
		var arrayContent = data.getIn([]);
		var iterableType = arrayContent.type; // MAP : hash, SEQ : array
		if (empty(arrayContent)) return this;
		if (!Array.isArray(arrayContent.items)) return this;
		for (var i=0; i<arrayContent.items.length; i++) {
			//console.log('arrayContent.items[i]', arrayContent.items[i]);
			if (empty(arrayContent.items[i])) continue;
			//if (arrayContent.items[i].constructor.name !== "YAMLMap") continue;
			for (var t=0; t<whatToFetch.length; t++) {
				var topic = whatToFetch[t];
				if (thisAddon.debugLevel > 2) console.log("Fetch", topic, "from", arrayContent.items[i]);
				if (iterableType == "SEQ") {
					// Array
					if (data.hasIn([i, topic]) == false) continue;
					//var context = parentContext.concat([i, topic]);
					//var thisCurrentAddress = options.currentAddress.concat([i, topic]);
					// arrayContent.items[0].value.getIn(["name"])
					this.registerStringObject(arrayContent.items[i], topic, parentContext.concat([i, topic]), [], {currentAddress:options.currentAddress.concat([i, topic])})
				} else {
					// Hash. Be careful! i does't represents KEY!
					var key = arrayContent.items[i].key;
					this.registerStringObject(arrayContent.items[i].value, topic, parentContext.concat([key, topic]), [], {currentAddress:options.currentAddress.concat([key, topic])})
				}
			}
		}
		return this;
	}
}


RMData.prototype.fetchSystem = function(data, parentContext, options) {
	options = options || {};
	options.currentAddress = options.currentAddress || [];

	var type = ['elements', 'skill_types', 'weapon_types', 'armor_types'];	
	if (thisAddon.config.loadVariableName) type.push("variables", "switches");

	for (var i in type) {
		var key = type[i];
		if (!data.hasIn([key])) continue;
		var db = data.getIn([key]);
		if (empty(db)) continue;
		if (empty(db.items)) continue;
		for (var idx=0; idx<db.items.length; idx++) {
			this.registerStringObject(db, idx, parentContext.concat(key, idx), [], {currentAddress:options.currentAddress.concat[key, idx]})
		}
	}


	// fetch terms
	// XP : not exist
	// vx : key pair content
	// ace: category and array
	if (data.hasIn(["terms", "params"])) {
		// ACE
		this.registerStringObject(data, 'game_title', parentContext.concat("game_title"), [], {currentAddress:options.currentAddress.concat["game_title"]})
		this.registerStringObject(data, 'currency_unit', parentContext.concat("currency_unit"), [], {currentAddress:options.currentAddress.concat["currency_unit"]})
	
		var category = data.getIn(["terms"]).items;
		for (var i in category) {
			if (empty(category[i])) continue;
			var key = category[i].key.value;

			var terms = data.getIn(["terms", key]);
			if (!terms.items) continue;
			for (var idx=0; idx<terms.items.length; idx++) {
				this.registerStringObject(terms, idx, parentContext.concat("terms", key, idx), [], {currentAddress:options.currentAddress.concat["terms", key, idx]})
			}
		}

	} else if (data.hasIn(["terms"])) {
		// VX
		this.registerStringObject(data, 'game_title', parentContext.concat("game_title"), [], {currentAddress:options.currentAddress.concat["game_title"]})

		var terms = data.getIn(["terms"]).items;
		for (var i in terms) {
			if (empty(terms[i])) continue;
			var key = terms[i].key.value;
			this.registerStringObject(data.getIn(["terms"]), key, parentContext.concat("terms", key), [], {currentAddress:options.currentAddress.concat["terms", key]})
		}
	} else if (data.hasIn(["words"])) {
		// XP
		//this.registerStringObject(data, 'title_name', parentContext.concat("title_name"), [], {currentAddress:options.currentAddress.concat["title_name"]})
	
		var terms = data.getIn(["words"]).items;
		for (var i in terms) {
			if (empty(terms[i])) continue;
			var key = terms[i].key.value;
			this.registerStringObject(data.getIn(["words"]), key, parentContext.concat("words", key), [], {currentAddress:options.currentAddress.concat["words", key]})
		}
	}

	for (var i in type) {
		var key = type[i];
		
		var db = data.getIn([key]);
		if (empty(db)) continue;
		if (empty(db.items)) continue;
		for (var idx=0; idx<db.items; idx++) {
			this.registerStringObject(db, idx, parentContext.concat(key, idx), [], {currentAddress:options.currentAddress.concat[key, idx]})
		}
	}
	return this; 
}

RMData.prototype.buildTextList = function(text, headerParam, translatedList) {
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	var textArray = text.split("\n");

	for (var i=0; i<textArray.length; i++) {
		if ((i+1)%4 == 1) {
			if (this.engineCode == "xp") {
				// in XP, header 101 contains the first line of the text
				translatedList.push(RMData.generateEventCommandData(headerParam.i, headerParam.c, [textArray[i]]));
				continue; // <-- only in XP! this is important
			} else {
				translatedList.push(RMData.generateEventCommandData(headerParam.i, headerParam.c, headerParam.p));
			}
		}
		translatedList.push(RMData.generateEventCommandData(headerParam.i, 401, [textArray[i]]));
	}
	return translatedList;
}

RMData.prototype.buildScrollTextList = function(text, headerParam, translatedList) {
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	var textArray = text.split("\n");

	translatedList.push(RMData.generateEventCommandData(headerParam.i, headerParam.c, headerParam.p));
	for (var i=0; i<textArray.length; i++) {
		translatedList.push(RMData.generateEventCommandData(headerParam.i, 405, [textArray[i]]));
	}	
	return translatedList;
}

RMData.prototype.buildScriptList = function(text, headerParam, translatedList) {
	console.log(">>buildScriptList", arguments);
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	var textArray = text.split("\n");

	console.log("Text array:", textArray);
	// first line is on header
	translatedList.push(RMData.generateEventCommandData(headerParam.i, 355, [textArray[0]]));
	for (var i=1; i<textArray.length; i++) {
		translatedList.push(RMData.generateEventCommandData(headerParam.i, 655, [textArray[i]]));
	}
	//console.log("script list", translatedList);
	return translatedList;
}


/**
 * Enter the index of choice header to process choice members
 * @param  {Array} pageList - Array of commands
 * @param  {Number} index - Index of the choice header
 * @param  {Array} context - parent context
 * @returns {Object} translated pageList[index]
 */
 RMData.prototype.fetchChoices = function(pageList, index, context) {
	// this command = choice header
	if (thisAddon.debugLevel > 1) console.log("fecthChoices", arguments);
	var currentLine = pageList.getIn([index]);
	var thisTexts 	= currentLine.getIn(["p", 0]).toJSON(); // array of texts
	var thisTextsTranslated = [];
	var choices = []; 

	if (thisAddon.debugLevel > 1) console.log("Choices:", thisTexts);
	if (empty(thisTexts)) return currentLine;

	for (x=0; x<thisTexts.length; x++) {
		var thisText 	= thisTexts[x];
		var thisContext = context.concat([index, `${x+1}from${thisTexts.length}`]);
		if (thisAddon.debugLevel > 1) console.log("Registering:", thisText);
		var translation = this.registerString(thisText, thisContext, [], {});
		thisTextsTranslated.push(translation);
		//this.setEntryPointValue(thisTexts, x, translation);

		// create index
		choices[x] = {
			originalText	:thisText,
			indent			:currentLine.indent,
			translation		:translation
		}		
	}
	var currentLineObj = currentLine.toJSON();
	currentLineObj.p[0] = thisTextsTranslated;
	currentLine = RMData.generateEventCommandData(currentLineObj.i, currentLineObj.c, currentLineObj.p);

	// Choice member are translated directly without registering

	var processed = 0;

	// the rest of the choice is current indent + 1
	//var expectedIndent = currentLine.indent+1;
	for (var i=index+1; i<pageList.items.length; i++) {
		var currentPageDoc = yaml.getFromIndex(pageList, i);
		var currentPage = currentPageDoc.toJSON();
		if (currentPage.c !== 402) continue;
		if (currentPage.i !== currentLineObj.i) continue;

		var currentChoice = choices[processed];
		if (Boolean(currentChoice) == false) continue;

		currentPage.p[1] = translation;
		//currentPageDoc.setIn(["p", 1], currentChoice.translation)
		//currentPageDoc.setIn(["p", 1], currentPage.p)
		
		pageList.items[i] = RMData.generateEventCommandData(currentPage.i, currentPage.c, currentPage.p);

		processed++;
		if (processed >= choices.length) break;

	}

	// returns mutated currentLine
	return currentLine;
}

/**
 * @param  {} commandList
 * @param  {} parentContext
 */
RMData.prototype.fetchCommandList = async function(commandList, parentContext) {
	if (empty(commandList)) return this;
	if (thisAddon.debugLevel >= 1) console.log("Processing command list:", commandList);
	/*
	if (typeof commandList == "object") {
		if (Array.isArray(commandList.items)) commandList = commandList.items;
	}
	*/

	var translatedList = [];
	var last101 = {};
	var last105 = {};
	var last355 = {};
	var textStack 			= [];
	var scrollingTextStack 	= [];
	var scriptStack 		= [];
	var currentTextParam 			= {};
	var currentScrollingTextParam 	= {};
	var currentScriptParam 			= {};
	const messagePossition = ["top", "middle", "bottom"];

	for (var i=0; i<commandList.items.length; i++) {
		//!ruby/object:RPG::EventCommand {i: 0, c: 105, p: [2, false]}
		//var currentMap 		= commandList[parseInt(i)];
		var currentMap 		= yaml.getFromIndex(commandList, i);
		console.log("currentMap for", i, " is" ,currentMap.toJSON());
		// expect YAMLMap object
		if (currentMap.constructor.name !== "YAMLMap") continue;
		
		var command 		= currentMap.toJSON();
		// command will be : {i: 0, c: 105, p: [2, false]}

		// Process textStack
		if (textStack.length>0 && command.c!== 401) {
			// end of text stack
			if (thisAddon.debugLevel > 2) console.log("Current textstack", textStack);
			var pictureStatus = "noPicture";
			if (!empty(currentTextParam.headerParam[0])) pictureStatus = "hasPicture";

			var context = common.clone(parentContext);
			context.push("list", currentTextParam.headerIndex, "message", pictureStatus, messagePossition[currentTextParam.headerParam[3]]);

			var translation = this.registerString(textStack.join("\n"), context, last101);
			if (thisAddon.debugLevel > 2) console.log(">>Generated combined text:", translation);
			this.buildTextList(translation, last101, translatedList);

			textStack = [];
		}

		if (scrollingTextStack.length>0 && command.c!== 405) {
			// end of text stack

			var context = common.clone(parentContext);
			context.push("list", currentScrollingTextParam.headerIndex, "scrollingMessage");

			var translation = this.registerString(scrollingTextStack.join("\n"), context, last105);
			if (thisAddon.debugLevel > 2)console.log(">>Generated combined text:", translation);
			this.buildScrollTextList(translation, last105, translatedList);

			scrollingTextStack = [];
		}


		if (scriptStack.length>0 && command.c!== 655) {
			// end of text stack
			console.log("executing scriptstack");

			var context = common.clone(parentContext);
			context.push("list", currentScriptParam.headerIndex, "script");

			// this is raw script
			var script = scriptStack.join("\n");

			// for raw viewer store raw script as Attachment, because we won't save the code into files.
			var attachmentName = "scriptCommand/"+common.generateId()+".rb";

			
			console.log("registering string within event's RGSS code.");
			var copyOptions 				= common.clone(this.options);
				copyOptions.baseContext 	= context;
				copyOptions.baseParameter 	= {attachment:attachmentName}
				copyOptions.baseTags		= ["red"];
				copyOptions.translationInfo = this.translationInfo;
				copyOptions.translationPair = this.translationPair;

			var scriptObj = new RGSSParser(script, copyOptions);
			//scriptObj.debugLevel = 9;
			await scriptObj.parse();
			console.log("ScriptObj:", scriptObj);
			// produce translated script from scriptObj
			script = scriptObj.toString();
			console.log("parsed text below:\n", script);
			// import transData from scriptObj into rmData
			this.importTransData(scriptObj);

			// assign attachment only if has atleast one translatable string / data length > 0
			if (scriptObj.transData.data.length > 0) {
				RMUtil.attachments[attachmentName] = new Attachment({
					type:"text/ruby",
					data:script
				})
			}

			//var translation = this.registerString(script, context, last355);
			if (thisAddon.debugLevel > 2)console.log(">>Generated combined text:", script);
			
			this.buildScriptList(script, last355, translatedList);

			scriptStack = [];
		}

		switch(command.c) {
			// handling interpolatable texts
			case 101: //text parameters
				textStack = [];
				currentTextParam.headerIndex = i;
				currentTextParam.headerParam = command.p;
				// in XP 101 contains the first line of the text
				if (this.engineCode == "xp") textStack.push(command.p[0]);
				last101 = command;
				break;
			case 105: //start text scroll
				scrollingTextStack = [];
				currentScrollingTextParam.headerIndex = i;
				currentScrollingTextParam.headerParam = command.p;
				last105 = command;
				break;
			case 401: //text
				textStack.push(command.p[0]);
				break;
			case 405: //long text
				scrollingTextStack.push(command.p[0]);
				break;
			
			case 355: //Script Header
				console.log("Code 355", command);
				scriptStack = [];
				currentScriptParam.headerIndex = i;
				currentScriptParam.headerParam = command.p;
				last355 = command;
				scriptStack.push(command.p[0]);
				break;					
			case 655: //Script
				console.log("Code 655", command);

				scriptStack.push(command.p[0]);
				break;


			// handling non interpolatable texts
			case 122: //set variable
				var thisText = currentMap.getIn(["p", 4]);
				if (typeof thisText !== 'string') {
					translatedList.push(currentMap);
					break;
				}
				var context = common.clone(parentContext);
				context.push("list", i, RMData.RPGM_EVENT_CODE[122], "/var:"+currentMap.getIn(["p", 0])+"-"+currentMap.getIn(["p", 1]));
				var translation = this.registerString(thisText, context, [], {tags: ["red"]});
				
				//currentMap.setIn(["p", 4], translation);
				var translatedP = command.p || [];
				translatedP[4] = translation;
				var newMap = RMData.generateEventCommandData(command.i, command.c, translatedP)

				translatedList.push(newMap);
				break;

			case 102: //choice header
				var context = common.clone(parentContext);
				context.push("list", i, RMData.RPGM_EVENT_CODE[102]);

				var translatedLine = this.fetchChoices(commandList, i, context);
				translatedList.push(translatedLine);
				
				break;
				/*				
			case 402: //choice
				var thisText = currentMap.getIn(["p", 1]);
				if (typeof thisText !== 'string') break;
				var context = common.clone(parentContext);
				context.push("list", i, RMData.RPGM_EVENT_CODE[402]);
				var translation = this.registerString(thisText, context, [], {});
				
				currentMap.setIn(["p", 1], translation);
				translatedList.push(currentMap);
				break;
				*/

			case 320: //Change name
			case 324: //Change nick name
			case 325: //Change profile
				var thisText = currentMap.getIn(["p", 1]);
				if (typeof thisText !== 'string') break;
				var context = common.clone(parentContext);
				context.push("list", i, RMData.RPGM_EVENT_CODE[currentMap.getIn(["c"])]);
				var translation = this.registerString(thisText, context, [], {});
				
				//currentMap.setIn(["p", 1], translation); <-- causes bug
				var translatedP = command.p || [];
				translatedP[1] = translation;
				var newMap = RMData.generateEventCommandData(command.i, command.c, translatedP)
				translatedList.push(newMap);
				break;

			/*
			case 356: //plugin command
				var thisText = currentMap.getIn(["p", 0]);
				if (typeof thisText !== 'string') break;
				var context = common.clone(parentContext);
				context.push("list", i, RMData.RPGM_EVENT_CODE[currentMap.getIn(["c"])]);
				var translation = this.registerString(thisText, context, [], {tags:["red"]});
				
				currentMap.setIn(["p", 0], translation);
				translatedList.push(currentMap);
				break;
			*/

			default:
				// append current document map as is
				translatedList.push(currentMap);	
		}
	}

	if (thisAddon.debugLevel > 1) console.log("Translated list:", translatedList);
	return translatedList;
}

/**
 * @param  {Object} document
 * @param  {Number} eventId
 * @param  {Number} pageId
 * @param  {Number} commandIndex - new command will be inserted at this index
 * @param  {} command
 */
RMData.insertEventCommandAt = function(document, eventId, pageId, commandIndex, command) {
	var page1Evt = document.getIn(['events', eventId, 'pages', pageId, 'list']).items
	var insertedDoc = yaml.parseDocument('- !ruby/object:RPG::EventCommand {i: 0, c: 401, p: [inserted doc]}')
	var newItem = insertedDoc.getIn([0])
	insertArrayAt(page1Evt, commandIndex, [newItem])
}

RMData.generateEventCommandData = function(i, c, p) {
	var newData = yaml.parseDocument(`- !ruby/object:RPG::EventCommand {i: ${i}, c: ${c}, p: ${JSON.stringify(p)}}`);
	return newData.getIn([0]);
}

RMData.selectTranslationData = function(translationDatas, path) {
	// must match trans.project.files[thefile].path
	var newPath = path;
	newPath = newPath.replace(/\\/g, "/");
	translationDatas.translationData = translationDatas.translationData || {};
	return translationDatas.translationData[newPath];
}

window.RMData = RMData;











/**
 * @param  {} gameFile
 * @param  {} options
 * @class
 */
var RMUtil = function(gameFile, options) {
	if (common.isDir(gameFile)) {
		this.dirname = gameFile;
	} else {
		this.dirname = nwPath.dirname(gameFile);
	}
	this.options 	= options || {};
	this.engineCode = this.options.engineCode || "";
	this.writeMode 	= false;
	this.targetDir  = undefined;
}

RMUtil.translateEngineType = function(pareserType) {
	if (pareserType == "ace") return "rmvxace";
	if (pareserType == "xp") return "rmxp";
	if (pareserType == "vx") return "rmvx";
}

RMUtil.attachments = {};
RMUtil.type = {};

if (yamlVer2) {
	RMUtil.type.binary = {
		identify: value => value instanceof Uint8Array,
		// Buffer inherits from Uint8Array
		default: false,
		tag: '!binary',
	  
		resolve: (doc, node) => {
		  //const src = resolveSeq.resolveString(doc, node);
		  return b64DecodeUnicode(doc);
		},
		options: resolveSeq.binaryOptions,
		stringify: function (data, ctx, onComment, onChompKeep) {
		  // convert to plain
		  //console.log(arguments);
		  data.value = b64EncodeUnicode(data.value);
		  //type = "PLAIN"
		  return resolveSeq.stringifyString(data, ctx, onComment, onChompKeep);
		}
	}
} else {
	RMUtil.type.binary = {
		identify: value => value instanceof Uint8Array,
		// Buffer inherits from Uint8Array
		default: false,
		tag: '!binary',
	  
		resolve: (doc, node) => {
		  const src = resolveSeq.resolveString(doc, node);
		  return b64DecodeUnicode(src);
		},
		options: resolveSeq.binaryOptions,
		stringify: function (data, ctx, onComment, onChompKeep) {
		  // convert to plain
		  //console.log(arguments);
		  data.value = b64EncodeUnicode(data.value);
		  //type = "PLAIN"
		  return resolveSeq.stringifyString(data, ctx, onComment, onChompKeep);
		}
	}
}

RMUtil.customTags =  [RMUtil.type.binary];

RMUtil.prototype.unpackTo = async function(targetDir) {
	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
	console.log("Unpack project", this.dirname, "to", targetDir);
	var thisEngineType = await this.getEngineCode();
	await common.mkDir(targetDir);
	//await common.aSpawn(nwPath.join(thisPath, "bin/rvpacker.exe"), ["-a", "unpack", "-d", this.dirname, "-t", thisEngineType, "-V", "-f", "-T", targetDir]);
	var binPath = nwPath.join(thisPath, "bin/rvpacker/rvpacker.rb");
	var options = {
		onData: function(buffer) {
			ui.log(buffer.toString());
		}
	}	
	await common.aSpawn(nw.App.manifest.localConfig.ruby, [binPath, "-a", "unpack", "-d", this.dirname, "-t", thisEngineType, "-V", "-f", "-T", targetDir], options);
	
	await ui.log(`Copy: ${nwPath.join(this.dirname, "Game.ini")} to ${targetDir}`);
	await common.copyFile(nwPath.join(this.dirname, "Game.ini"), targetDir);

	this.targetDir = targetDir;
	this.unpacked = true;
	return this;
}

RMUtil.prototype.repackTo = async function(targetDir, yamlFolder) {
	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
	console.log("Repack project", this.dirname, "to", targetDir);
	if (await common.isDirectory(targetDir) == false) return console.warn(`ERROR: Directory ${targetDir} is not found!`);
	
	await common.mkDir(yamlFolder);
	var thisEngineType = await this.getEngineCode();
	//await common.aSpawn(nwPath.join(thisPath, "bin/rvpacker.exe"), ["-a", "pack", "-d", this.dirname, "-t", thisEngineType, "-V", "-f", "-T", targetDir]);
	var binPath = nwPath.join(thisPath, "bin/rvpacker/rvpacker.rb");
	var options = {
		onData: function(buffer) {
			ui.log(buffer.toString());
		}
	}
	await common.aSpawn(nw.App.manifest.localConfig.ruby, [binPath, "-a", "pack", "-d", targetDir, "-t", thisEngineType, "-V", "-f", "-T", yamlFolder], options);

	//await ui.log(`Copy: ${nwPath.join(this.dirname, "Game.ini")} to ${targetDir}`);
	//await common.copyFile(nwPath.join(this.dirname, "Game.ini"), targetDir);

	console.log("Repack finished!");
	return this;
}

/**
 * Set the RMUtil with the previously unpacked game using RMUtil.prototype.unpackTo
 * Root directory of the game or cache where folder "YAML" and "Scripts" are placed
 * @param  {String} targetDir
 */
RMUtil.prototype.setUnpackedDir = async function(targetDir) {
	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
	ui.log("Set unpacked dir to :"+targetDir);

	this.targetDir = targetDir;
	this.unpacked = true;

	// check existance of extracted tes
	var dataExtension = await this.getDataExtension();
	var tesDir 	= nwPath.join(targetDir, "main."+dataExtension);
	this.hasTes	= false;
	if (await common.isDir(tesDir)) {
		this.hasTes 		= true;
		this.tesExtractPath = tesDir;
	}
	return this;	
}

RMUtil.prototype.addFiles = async function(files) {
	if (typeof files == "string") files = [files];

	this.contents = this.contents || {
		yaml:[],
		scripts:[],
		gameIni: ""
	};
	this.parsed = this.parsed ||{
		document:{},
		scripts:{}
	};

	for (var i=0; i<files.length; i++) {
		var extName = nwPath.extname(files[i]).toLowerCase();
		if (extName == ".yaml") {
			this.contents.yaml.push(files[i]);
		} else if (extName == ".rb") {
			this.contents.scripts.push(files[i]);
		} else if (extName == ".ini") {
			this.contents.gameIni = files[i];
		} else {
			console.warn("Unknown handler file with extension : ", extName);
		}

	}

	/*
	for (var i=0; i<this.contents.yaml.length; i++) {
		if (nwPath.extname(this.contents.yaml[i]) !== ".yaml") continue;
		this.parsed.document[this.contents.yaml[i]] = yaml.parseDocument(await common.fileGetContents(this.contents.yaml[i], "utf8"), {customTags: RMUtil.customTags});
	}
	*/
	return this;
}

RMUtil.prototype.toObj = async function(targetDir) {
	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;;
	if (!this.unpacked) await this.unpackTo(targetDir);

	this.contents = {
		yaml	:[],
		scripts	:[],
		gameIni	:nwPath.join(targetDir, "Game.ini")
	};
	this.parsed = {
		document:{},
		scripts	:{}
	};

	this.contents.yaml 		= await common.readDir(nwPath.join(targetDir, "YAML"));
	this.contents.scripts 	= await common.readDir(nwPath.join(targetDir, "Scripts"));
	
	this.targetDir 			= targetDir;
	return this;
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

RMUtil.prototype.parseScript = async function(options) {
	options = options || this.options || {};
	options.translationDatas = options.translationDatas || this.options.translationDatas || {};
	if (this.contents.scripts.length) {
		console.log("Parsing script");
		ui.log("Start parsing scripts");
	}

	for (var i=0; i<this.contents.scripts.length; i++) {
		var scriptPath = this.contents.scripts[i];
		if (nwPath.extname(scriptPath) !== ".rb") continue;

		var fileInfo = {};
		var relativePath 		= common.getRelativePathFromNode(scriptPath, "Scripts", true);
		fileInfo.extension 		= nwPath.extname(scriptPath).toLowerCase().substring(1);
		fileInfo.dataType 		= "ruby";
		fileInfo.filename 		= nwPath.basename(scriptPath, nwPath.extname(scriptPath));
		fileInfo.basename 		= nwPath.basename(scriptPath);
		fileInfo.path 			= relativePath;
		fileInfo.relPath		= relativePath;
		fileInfo.dirname 		= "/"+nwPath.dirname(relativePath);

		this.parsed.scripts[scriptPath] = new RGSSParser(await common.fileGetContents(scriptPath, "utf8"), options)
		var rgssParser = this.parsed.scripts[scriptPath];
		rgssParser.fileInfo		= fileInfo;
		rgssParser.assignTranslationPair(relativePath);

		//var relativePath 		= common.getRelativePath(scriptPath, this.dirname);
		//var relativePath 		= common.getRelativePathFromNode(scriptPath, "Scripts", true);
		ui.log(`Parsing : ${relativePath}`);

		rgssParser.parse();
	}
	return this;
}

RMUtil.prototype.parseGameIni = async function(options) {
	if (!this.contents.gameIni) return this;
	console.log("Parsing Game.ini");
	ui.log("Parsing Game.ini");
	options = options || this.options || {};
	options.translationDatas = options.translationDatas || this.options.translationDatas || {};
	var scriptPath = this.contents.gameIni;

	var fileInfo = {};
	// todo determine relative path
	var relativePath 		= "Game.ini"
	fileInfo.extension 		= "ini";
	fileInfo.dataType 		= "ini";
	//fileInfo.filename 		= nwPath.basename(scriptPath, nwPath.extname(scriptPath));
	fileInfo.filename 		= "Game.ini";
	fileInfo.basename 		= nwPath.basename(scriptPath);
	fileInfo.path 			= relativePath;
	fileInfo.relPath		= relativePath;
	fileInfo.dirname 		= "/"

	this.parsed.gameIni = new GameIniParser(await common.fileGetContents(scriptPath), options)
	var iniParser 		= this.parsed.gameIni;
	iniParser.fileInfo		= fileInfo;

	ui.log(`Parsing : ${scriptPath}`);

	iniParser.assignTranslationPair(relativePath);


	await iniParser.parse();
	console.log("Game.ini parser:", iniParser);
	this.gameTitle = iniParser.gameTitle;
	await ui.log("detected game title:"+this.gameTitle);
	return this;
}

RMUtil.prototype.parseThisPath = function(path) {
	if (empty(this.options.files)) return true;
	if (this.options.files.includes(path)) return true;
	path = path.replaceAll("\\", "/");
	if (this.options.files.includes(path)) return true;

	var mergedPath = "|"+this.options.files.join("|");
	if (path == "YAML/Scripts.yaml") {
		if (mergedPath.includes("|Scripts/")) return true;
	//} else if (path.includes("YAML/System.yaml")) {
	//	if (mergedPath.includes("|main.rvdata2/")) return true;
	} else if (path.includes("YAML/main.yaml")) {
		if (mergedPath.includes("|main.rvdata2/")) return true;
	}

	return false;
}

RMUtil.detectMode = function(file) {
	if (nwPath.basename(file).toLowerCase == "scripts.yaml") {
		return "script";
	} else if (nwPath.basename(file).toLowerCase == "main.yaml") {
		return "tes";
	} else if (nwPath.extname(file).toLowerCase == ".ini") {
		return "ini";
	} else if (nwPath.extname(file).toLowerCase == ".yaml") {
		return "data";
	}
}

RMUtil.prototype.parse = async function(files, mode, options) {
	console.log("Parsing with arg", arguments);
	mode 	= mode || "all"; // all, data, ini, script, tes
	options = options || this.options || {};
	options.translationDatas = options.translationDatas || this.options.translationDatas || {};
	
	// resets Attachments
	RMUtil.attachments = {};

	//if (!this.parsed) return console.warn("Trying to dump unparsed project");
	if (!this.parsed) await this.toObj();
	//this.parsed.yaml = {};
	this.parsed.rmdata = {};
	ui.log("Start parsing game data");


	files = files || this.contents.yaml;

	if (mode == "all" || mode == "data") {
		for (var ci=0; ci<files.length; ci++) {
			var path 			= files[ci];
			var relativePath 	= common.getRelativePathFromNode(path, "YAML", true);
			
			if (this.parseThisPath(relativePath) == false) {
				console.log("Skipping ", relativePath);
				continue;
			}
	
			
			if (nwPath.extname(path) !== ".yaml") continue;
			ui.log("Reading "+path);
			this.parsed.document[path] = yaml.parseDocument(await common.fileGetContents(path, "utf8"), {customTags: RMUtil.customTags});
	
			var thisObj = this.parsed.document[path];
			if (empty(thisObj)) continue;
			var basename = nwPath.basename(path)
			var filename = basename.substring(0, basename.length - nwPath.extname(path).length);
	
			//this.parsed.yaml[path]  = yaml.stringify(thisObj);
			//var relativePath 		= common.getRelativePath(path, this.dirname);
	
			ui.log(`Parsing : ${relativePath}`);
	
			var fileInfo = {};
			fileInfo.extension 		= nwPath.extname(path).toLowerCase().substring(1);
			fileInfo.dataType 		= RMData.determineType(path);
			fileInfo.filename 		= nwPath.basename(path, nwPath.extname(path));
			fileInfo.basename 		= nwPath.basename(path);
			fileInfo.path 			= relativePath;
			fileInfo.relPath		= relativePath;
			fileInfo.dirname 		= "/"+nwPath.dirname(relativePath);
			
			var rmData 				= new RMData(thisObj, options);
			rmData.engineCode		= this.engineCode;
			rmData.fileInfo			= fileInfo;
			rmData.assignTranslationPair(relativePath);
			/*
			if (!empty(options.translationDatas)) {
				var translationData = RMData.selectTranslationData(options.translationDatas, relativePath);
				console.log("current file:", relativePath);
				console.log("Translation Data:", translationData);
				translationData = translationData || {};
				rmData.translationPair = translationData.translationPair || {};
				rmData.translationInfo = translationData.info || {};
			}
			*/
	
			this.parsed.rmdata[path] = rmData;
	
			var $THISFETCH;
			switch (fileInfo.dataType) {
				case "actors":
					$THISFETCH = rmData.fetchCommonData(thisObj, ["name", "description", "nickname", "note"], [fileInfo.filename]);
					break
				case "items":
				case "armors":
				case "weapons":
					$THISFETCH = rmData.fetchCommonData(thisObj, ["name", "description", "note"], [fileInfo.filename]);
					break;
				case "skills":
					$THISFETCH = rmData.fetchCommonData(thisObj, ["name", "description", "message1", "message2", "note"], [fileInfo.filename]);
					break;
				case "states":
					$THISFETCH = rmData.fetchCommonData(thisObj, ["name", "message1", "message2", "message3", "message4", "note"], [fileInfo.filename]);
					break;
				case "classes":
				case "enemies":
				case "tilesets":
					$THISFETCH = rmData.fetchCommonData(thisObj, ["name", "note"], [fileInfo.filename]);
					break;
				case "animations":
				case "mapinfos":
					$THISFETCH = rmData.fetchCommonData(thisObj, ["name"], [fileInfo.filename]);
					break;
				case "commonevents":
					if (empty(thisObj)) continue;
	
					var cePage = thisObj.getIn([]);
					if (!cePage) continue;
					if (empty(cePage.items)) continue;
					for (var i=0; i<cePage.items.length; i++) {
						await ui.log(`Handling common event's page ${i}/${cePage.items.length-1}`);
						var currentPage = cePage.getIn([i]);
						if (empty(currentPage)) continue;
						// name
						rmData.registerStringObject(currentPage, "name", [fileInfo.filename, i, "name"], [], {currentAddress:[i, "name"]})
						
						// command list
						var commandListData = cePage.getIn([i, "list"]);
						if (empty(commandListData)) continue;
						var newCommandList = await rmData.fetchCommandList(commandListData, [fileInfo.filename, i]);
						if (thisAddon.debugLevel > 1) console.log("New command list:", newCommandList);
						commandListData.items = newCommandList;
					}
					break;
				case "troops":
					if (empty(thisObj)) continue;
	
					//rmmvData.fetchCommonData($currentData, ["name"], [$fileInfo['filename']]);
					var troopData = thisObj.getIn([]);
					if (!troopData) continue;
					if (empty(troopData.items)) continue;
	
					for (var i=1; i < troopData.items.length;i++) {
						if (empty(thisObj.getIn([i]))) continue;
						// register name
						rmData.registerStringObject(thisObj.getIn([i]), "name", [fileInfo.filename, i, "name"], [], {currentAddress:[i, "name"]})
						
						var pages = thisObj.getIn([i, 'pages']);
						if (empty(pages)) continue;
	
						// fetch event pages content
						if (empty(pages.items)) continue;
						for (var pageId=0; pageId<pages.items.length; pageId++) {
							var oldCommands = thisObj.getIn([i, "pages", pageId, "list"]);
							if (!Boolean(oldCommands)) continue;
							var newCommand  = await rmData.fetchCommandList(oldCommands, [fileInfo.filename, i, "pages", pageId, "list"]);	
							oldCommands.items = newCommand;
						}
	
					}
					break;
				case "map":
					// fetch map name
					rmData.registerStringObject(thisObj, 'display_name', [fileInfo.filename, "display_name"], [], {currentAddress:["display_name"]})
	
					// fetch map note
					rmData.registerStringObject(thisObj, 'note', [fileInfo.filename, "note"], [], {currentAddress:["note"]})
	
					var docEvts = thisObj.getIn(["events"]);
					if (empty(docEvts.items)) break;
					//if (docEvts.items.length<2) break;
	
					// iterate events
					for (var index=0; index<docEvts.items.length; index++) {
						//var thisEvtData = thisObj.getIn(["events", evtId]);
						var thisEvtData = yaml.getFromIndex(thisObj.getIn(["events"]), index);
						if (empty(thisEvtData)) continue;
						var evtId = thisEvtData.get("id");
						// fetch event name
						rmData.registerStringObject(thisEvtData, 'name', [fileInfo.filename, "events", evtId, "name"], [], {currentAddress : ["events", evtId, "name"]})
					
						// fetch event pages content
						var pages = thisEvtData.getIn(['pages']);
						if (empty(pages)) continue;
	
						// fetch event pages content
						if (empty(pages.items)) continue;
						for (var pageId=0; pageId<pages.items.length; pageId++) {
							var oldCommands = pages.getIn([pageId, "list"]);
							if (!Boolean(oldCommands)) continue;
							var newCommand  = await rmData.fetchCommandList(oldCommands, [fileInfo.filename, "events", evtId, "pages", pageId, "list"]);	
							oldCommands.items = newCommand;
						}
	
					}
					break;	
				case "system":
					rmData.fetchSystem(thisObj,  [fileInfo.filename]);
					break;
			}
	
			if (this.writeMode) {
				// storing document as a plain string is better than storing as obj
				try {
					this.parsed.document[path] = this.parsed.document[path].toString();

				} catch (e) {
					console.warn("Unable to convert document to string", e)
					this.parsed.document[path] = "";

				}
			} else {
				// remove if not write mode
				this.parsed.document[path] = "processed";
			}
		}
	}
	
	if (mode == "all" || mode == "script") {
		if (empty(this.parsed.scripts)) {
			if (this.parseThisPath("YAML/Scripts.yaml")) await this.parseScript(options);
		}
	}

	if (mode == "all" || mode == "tes") {
		if (empty(this.parsed.tesData)) {
			if (this.parseThisPath("YAML/main.yaml")) await this.tesParse(options);
		}
	}

	if (mode == "all" || mode == "ini") {
		if (this.parseThisPath("Game.ini")) await this.parseGameIni(options);
	}



	this.isParsed = true;
	//return this;
}



RMUtil.prototype.toYaml = async function(outputDirectory) {
	if (!outputDirectory) return console.warn("Please set toYaml arguments[0] with output directory");
	if (!this.isParsed) await this.parse();
	this.parsed.yaml = {};
	await common.mkDir(nwPath.join(outputDirectory, "YAML"));
	await common.mkDir(nwPath.join(outputDirectory, "Scripts"));
	ui.log("Writing data files");

	for (var path in this.parsed.document) {
		var thisObj = this.parsed.document[path];
		var targetPath = nwPath.join(outputDirectory, "YAML", nwPath.basename(path));
		ui.log("Writing : "+targetPath);
		try {
			// Weather effect confuses YAML parser
			// this is a quick dirty way to fix the error on the weather effect
			var yamlString =thisObj.toString()
			yamlString = yamlString.replaceAll(`, p: [ !!str ':storm',`, `, p: [! ':storm',`);
			yamlString = yamlString.replaceAll(`, p: [ !!str ':rain',`, `, p: [! ':rain',`);
			yamlString = yamlString.replaceAll(`, p: [ !!str ':snow',`, `, p: [! ':snow',`);
			yamlString = yamlString.replaceAll(`, p: [ !!str ':none',`, `, p: [! ':none',`);
			
			await common.filePutContents(targetPath, yamlString, "utf8", false);
		} catch (e) {
			ui.log("Can not write "+targetPath+" See console log for more information");
			console.warn(e);
			console.log("thisObj:", thisObj);
			console.log("RMUtil:", this);
		}
	}

	ui.log("Writing scripts");
	for (var path in this.parsed.scripts) {
		var thisObj = this.parsed.scripts[path];
		var targetPath = nwPath.join(outputDirectory, "Scripts", nwPath.basename(path));
		ui.log("Writing : "+targetPath);

		await common.filePutContents(targetPath, thisObj.writableData.join(""), "utf8", false);
	}

	return this;
}

RMUtil.prototype.dumpIniFile = async function(outputDirectory) {
	if (empty(this.parsed.gameIni)) return this;
	var translated = this.parsed.gameIni.toString();
	await common.filePutContents(nwPath.join(outputDirectory, "Game.ini"), translated, "utf8", false);
	return this;
}

/**
 * Generate trans data from a RM project
 * @param  {} cacheInfo
 */
 RMUtil.prototype.toTrans = async function(cacheInfo) {
	await ui.log("Creating project");
	cacheInfo 				= cacheInfo || await RMUtil.createCacheFolder();
	this.options 			= this.options || {};
	this.options.targetDir 	= nwPath.join(cacheInfo.cachePath, "data/");

	// Get parsable files from the project
	if (!this.contents) await this.toObj();

	this.trans = {
		projectId		: cacheInfo.cacheID,
		cache			: cacheInfo,
		gameEngine		: RMUtil.translateEngineType(this.engineCode),
		gameTitle		: this.gameTitle || "",
		loc				: this.dirname,
		parser			: 'rmrgss',
		parserVersion	: thisAddon.package.version,
		attachments		: RMUtil.attachments,
		files			: {}
	}

	console.log("current content", this.contents);
	await ui.log("Generating trans data from Game.ini");
	if (this.contents.gameIni) {
		await this.parse([this.contents.gameIni], "ini");
		var gameIni 	= this.parsed.gameIni;
		var thisRelPath = this.parsed.gameIni.fileInfo.relPath;
		this.trans.files[thisRelPath] = Object.assign({}, gameIni.transData, gameIni.fileInfo);
		this.trans.gameTitle = this.gameTitle || "";
	}

	await ui.log("Generating trans data from RMData");
	for (var i in this.contents.yaml) {
		var file = this.contents.yaml[i];
		await this.parse([file], "data");
		var thisData 	= this.parsed.rmdata[file];
		if (empty(thisData)) continue;
		var thisRelPath = thisData.fileInfo.relPath
		this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
		// removing rendered data
		this.parsed.rmdata[i] = {};
		thisData = undefined;
	}

	await ui.log("Generating trans data from Script");
	await this.parse(undefined, "script");
	for (var i in this.parsed.scripts) {
		var thisData = this.parsed.scripts[i];
		var thisRelPath = thisData.fileInfo.relPath
		this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	this.parsed.scripts = {};

	await this.parse(undefined, "tes");
	if (this.parsed.tesData) {
		await ui.log("Generating trans data from TES data");
		for (var i in this.parsed.tesData) {
			var thisData = this.parsed.tesData[i];
			var thisRelPath = thisData.fileInfo.relPath
			this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
		}
		this.parsed.tesData = undefined;
	}

	await ui.log("generating initial.json");
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "initial.json"), JSON.stringify(this.trans), 'utf8', false);
	
	await ui.log("generating game information");
	var gameInfo = {
		title : this.gameTitle,
		Title : this.gameTitle,
		engine : this.engineCode,
		tes : await this.tesHasTes()
	}
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2), 'utf8', false);

	await ui.log("done converting to trans");

	return this.trans;
}


RMUtil.prototype.toTrans_legacy = async function(cacheInfo) {
	await ui.log("Creating project");
	cacheInfo 				= cacheInfo || await RMUtil.createCacheFolder();
	this.options 			= this.options || {};
	this.options.targetDir 	= nwPath.join(cacheInfo.cachePath, "data/");

	if (!this.isParsed) await this.parse();

	this.trans = {
		projectId		: cacheInfo.cacheID,
		cache			: cacheInfo,
		gameEngine		: RMUtil.translateEngineType(this.engineCode),
		gameTitle		: this.gameTitle || "",
		loc				: this.dirname,
		parser			: 'rmrgss',
		parserVersion	: thisAddon.package.version,
		attachments		: RMUtil.attachments,
		files			: {}
	}

	await ui.log("Generating trans data from Game.ini");
	var gameIni = this.parsed.gameIni;
	var thisRelPath = this.parsed.gameIni.fileInfo.relPath;
	this.trans.files[thisRelPath] = Object.assign({}, gameIni.transData, gameIni.fileInfo);

	await ui.log("Generating trans data from RMData");
	for (var i in this.parsed.rmdata) {
		var thisData = this.parsed.rmdata[i];
		var thisRelPath = thisData.fileInfo.relPath
		this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}

	await ui.log("Generating trans data from Script");
	for (var i in this.parsed.scripts) {
		var thisData = this.parsed.scripts[i];
		var thisRelPath = thisData.fileInfo.relPath
		this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}

	if (this.parsed.tesData) {
		await ui.log("Generating trans data from TES data");
		for (var i in this.parsed.tesData) {
			var thisData = this.parsed.tesData[i];
			var thisRelPath = thisData.fileInfo.relPath
			this.trans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
		}
	}

	await ui.log("generating initial.json");
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "initial.json"), JSON.stringify(this.trans), 'utf8', false);
	
	await ui.log("generating game information");
	var gameInfo = {
		title : this.gameTitle,
		Title : this.gameTitle,
		engine : this.engineCode,
		tes : await this.tesHasTes()
	}
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2), 'utf8', false);

	await ui.log("done converting to trans");
	console.log("RMUtil data:", this);
	return this.trans;
}


RMUtil.prototype.detectEngineType = async function() {
	if (this.options.engineType) {
		var gameEngines ={
			"rmvxace" : "ace",
			"rmvx" : "vx",
			"rmxp" : "xp"
		}
		return gameEngines[this.options.engineType]
	}
	if (await common.isFileAsync(nwPath.join(this.dirname, "Game.rgss3a"))) return "ace";
	if (await common.isFileAsync(nwPath.join(this.dirname, "Data/System.rvdata2"))) return "ace";
	if (await common.isFileAsync(nwPath.join(this.dirname, "Game.rgss2a"))) return "vx";
	if (await common.isFileAsync(nwPath.join(this.dirname, "Data/System.rvdata"))) return "vx";
	if (await common.isFileAsync(nwPath.join(this.dirname, "Game.rgssad"))) return "xp";
	if (await common.isFileAsync(nwPath.join(this.dirname, "Data/System.rxdata"))) return "xp";
	if (await common.isFileAsync(nwPath.join(this.dirname, "Game.rvproj2"))) return "ace";
	
}

RMUtil.prototype.getEngineCode = async function() {
	if (this.engineCode) return this.engineCode;
	this.engineCode = await this.detectEngineType();
	return this.engineCode;
}

RMUtil.createCacheFolder = async function(id) {
	await ui.log("Generating staging directory");

	id = id || common.makeid(10);

	var cacheInfo = {
		cacheID: id,
		cachePath: nwPath.join(common.getStagePath(), id)
	}

	var cacheFolderData = nwPath.join(cacheInfo.cachePath, "data");
	await common.mkDir(cacheFolderData);
	await ui.log(`New staging directory with id ${id} has been created!`);
	
	return cacheInfo;
}

RMUtil.prototype.getDataExtension = async function() {
	var engine = await this.getEngineCode();
	if (engine == "ace") return "rvdata2";
	if (engine == "vx") return "rvdata";
	if (engine == "xp") return "rxdata";
	
}

// TES Utility


RMUtil.prototype.tesHasTes = async function() {
	if (typeof this.hasTes !== "undefined") return this.hasTes;
	var dataExtension = await this.getDataExtension();
	var expectedPath = nwPath.join(this.dirname, "Data/main."+dataExtension);
	console.log("Expected path:", expectedPath);
	if (await common.isFileAsync(expectedPath)) {
		await ui.log("Encrypted TES data detected at: "+expectedPath);
		console.log("TES data detected!");
		this.hasTes = true;
		return true;
	}
	console.log("No TES data detected. Process accordingly!");
	return false;
}

RMUtil.prototype.tesExtractTo = async function(targetDir) {
	if (!await this.tesHasTes()) return this;

	targetDir = targetDir || this.targetDir || this.options.targetDir || this.dirname;
	console.log("Unpack main data", this.dirname, "to", targetDir);
	var thisEngineType = await this.getEngineCode();
	await common.mkDir(targetDir);

	var absolutePath = nwPath.resolve(targetDir);

	var binPath = nwPath.join(__dirname, "3rdParty/TES-Patcher/TES_Patcher.rb");
	var options = {
		cwd: this.dirname, // Important! set current directory to the Game's root folder
		onData: function(buffer) {
			ui.log(buffer.toString());
		}
	}	
	await common.aSpawn(nwPath.join(__dirname, nw.App.manifest.localConfig.ruby), [binPath, "-e", absolutePath], options);
	this.tesExtractPath = targetDir;
	return this;
}

RMUtil.prototype.tesBuildTo = async function(destinationDir, options) {
	//TODO
	options = options || this.options;
	if (!await this.tesHasTes()) return this;
	if (empty(this.parsed.tesData)) return this;

	await ui.log("Start building TES data with destination: "+destinationDir);
	console.log("Current rmUtil:", this);
	// set extract path
	//var folderName 		= "main."+await this.getDataExtension();
	//this.tesExtractPath = nwPath.join(this.targetDir, folderName);

	// parse data
	//await ui.log("Parsing TES scripts:"+this.tesExtractPath);
	//if (!this.tesIsParsed) await this.tesParse(options);

	var tmpDirBase 		= nwPath.join(nw.process.env.TEMP, "tpp_tes_"+common.generateId());
	var dumpDir 		= await common.mkDir(nwPath.join(tmpDirBase, "translated"));
	//var fakeGameDirData	= await common.mkDir(nwPath.join(tmpDirBase, "gameRoot", "data"));

	await ui.log("Dumping TES scripts into "+dumpDir);
	for (var path in this.parsed.tesData) {
		var thisObj 	= this.parsed.tesData[path];
		var targetPath 	= nwPath.join(dumpDir, nwPath.basename(path));
		await ui.log("Writing "+targetPath);
		await common.filePutContents(targetPath, thisObj.toString(), "utf8", false);
	}

	await ui.log("Generating stagging path:"+fakeGameDir);

	var cacheGame = nwPath.join(this.tesExtractPath, "../gameRoot");
	ui.log("copy "+cacheGame+" to "+tmpDirBase);
	await bCopy(cacheGame, tmpDirBase, {overwrite:true});

	var fakeGameDir		= nwPath.join(tmpDirBase, "gameRoot");

	var binPath 		= nwPath.join(__dirname, "3rdParty/TES-Patcher/TES_Patcher.rb");


	// TODO here
	await ui.log("Compiling TES scripts to:"+destinationDir);
	var spawnOpt = {
		// Important! set current directory to the root folder of the game where Data/scripts.rvdata2 and Data/main.rvdata2 is existed
		cwd: tmpDirBase, 
		onData: function(buffer) {
			ui.log(buffer.toString());
		}
	}	
	// F:\GDrive\Other\Translator++\ruby\bin\ruby.exe F:\GDrive\Other\Translator++\3rdParty\TES-Patcher\TES_Patcher.rb -p "location/of/the/scripts"
	await common.aSpawn(nwPath.join(__dirname, nw.App.manifest.localConfig.ruby), [binPath, "-p", dumpDir], spawnOpt);

	//await common.mkDir(destinationDir);
	await ui.log("TES file saved to:"+nwPath.join(destinationDir, "Data"));
	await common.copyFile(nwPath.join(tmpDirBase, "main."+await this.getDataExtension()), nwPath.join(destinationDir, "Data"))
	ui.log("Done processing TES!");
	return this;

}

RMUtil.prototype.tesCopyRequiredFiles = async function() {
	if (!await this.tesHasTes()) return;
	if (!this.tesExtractTo) return console.warn("this.tesExtractTo is required in tesCopyRequiredFiles");
	var gameData = nwPath.join(this.targetDir, "gameRoot/Data");
	await common.mkDir(gameData);

	var fileToCopy 		= ["main", "Scripts"];
	var dataExtension 	= await this.getDataExtension();
	for (var i=0; i<fileToCopy.length; i++) {
		var source = nwPath.join(this.dirname, "Data", fileToCopy[i]+"."+dataExtension);
		ui.log("Copying :"+source+" to "+gameData);
		await common.copyFile(source, gameData);
	}
}

RMUtil.prototype.tesParse = async function(options) {
	options = options || this.options || {}
	if (!await this.tesHasTes()) return this;
	ui.log("Parsing TES data");
	var folderName = "main."+await this.getDataExtension();
	if (!this.tesExtractPath) {
		// extract if not yet extracted
		await this.tesExtractTo(nwPath.join(this.targetDir, folderName));
	}
	this.contents.tesFiles 	= await common.readDir(this.tesExtractPath);
	this.parsed.tesData 	= {};
	var RmTransFile 		= require("www/addons/rmrgss/RmTransFile.js");

	for (var i=0; i<this.contents.tesFiles.length; i++) {
		var scriptPath = this.contents.tesFiles[i];
		if (nwPath.extname(scriptPath) !== ".txt") continue;

		var fileInfo = {};
		var relativePath 		= common.getRelativePathFromNode(scriptPath, folderName, true);
		fileInfo.extension 		= nwPath.extname(scriptPath).toLowerCase().substring(1);
		fileInfo.dataType 		= "text";
		fileInfo.filename 		= nwPath.basename(scriptPath, nwPath.extname(scriptPath));
		fileInfo.basename 		= nwPath.basename(scriptPath);
		fileInfo.path 			= relativePath;
		fileInfo.relPath		= relativePath;
		fileInfo.dirname 		= "/"+nwPath.dirname(relativePath);

		this.parsed.tesData[scriptPath] = new RmTransFile(await common.fileGetContents(scriptPath, "utf8"), options)
		var tesParser 			= this.parsed.tesData[scriptPath];
		tesParser.fileInfo		= fileInfo;
		tesParser.assignTranslationPair(relativePath);

		ui.log(`Parsing : ${relativePath}`);
		/*
		if (!empty(options.translationDatas)) {
			var translationData = RMData.selectTranslationData(options.translationDatas, relativePath);
			console.log("current file:", relativePath);
			console.log("Translation Data:", translationData);
			translationData 			= translationData || {};
			tesParser.translationPair 	= translationData.translationPair || {};
			tesParser.translationInfo 	= translationData.info || {};
		}
		*/

		tesParser.parse();
	}
	this.tesIsParsed = true;
	return this;

}

thisAddon.RMUtil = RMUtil;








xSpawn = async function(command, args, options) {
	args = args || [];
	if (Array.isArray(args) == false) args = [args];
	options = options||{};
	options.args = options.args||{};
	options.onData = options.onData||function(result, e) {};
	options.onDone = options.onDone||function(result, e) {};
	options.onError = options.onError||function(result, e) {};
	//options.onReceive = options.onReceive||function(result, e) {};
	var resolver;
	var rejecter;
	var thisPromise = new Promise((resolve, reject)=>{
		resolver = resolve;
		rejecter = reject;
	});	
	
	
	var outputBuffer = "";
	var child = spawn(command, args, options);
	
	child.stdout.on('data', function (data) {
		//console.log('stdout: ' + data);
		outputBuffer += data;
		//console.log("Received buffer : "+data);
		options.onData.call(this, data);
		//options.onReceive.call(this, data);
	});

	child.stderr.on('data', function (data) {
		console.log('stderr: ' + data);
		options.onError.call(this, data);
		
	});

	child.on('close', function (code) {
		console.log('child process exited with code ' + code);
		//console.log("data is : "+outputBuffer);
		var result = php.evalResult(outputBuffer)
		options.onDone.call(this, result);
		resolver(result);
	});	
	
	return thisPromise;
}




var RMRGSS = function(exeFile) {
	this.file 	= exeFile;
	this.dir 	= nwPath.dirname(this.file);
}

RMRGSS.prototype.init = async function() {
	
}

RMRGSS.prototype.type = async function() {
	return await Engines.detect(this.file);
}

RMRGSS.prototype.extractTo = async function(to) {
	// to is dirname
	console.log("Extracting to ", to);

	console.log("copying");
	await bCopy(this.dir, to, {overwrite:true});

	console.log("done copying");
	
	var dirContent = await afs.readdir(this.dir);
	var monitor = [".rgss3a", ".rgss2a", ".rgssad"]
	for (var i in dirContent) {
		var ext = nwPath.extname(dirContent[i]);
		if (monitor.includes(ext.toLowerCase()) == false) continue;
		var result = await xSpawn("start", [nwPath.join(decrypterPath, "RgssDecrypter.exe"), dirContent[i]], {
			cwd : to,
			shell: true,
			windowsHide: false		
		});
		
		fs.unlinkSync(nwPath.join(to, dirContent[i]));
		console.log("Unlink done");
	}
	
	console.log("Extraction done");
	
}

RMRGSS.prototype.isPacked = async function() {
	var dirContent = await afs.readdir(this.dir);
	for (var i in dirContent) {
		var ext = nwPath.extname(dirContent[i]);
		//vxace archive
		if (ext.toLowerCase() == ".rgss3a") return true;
		//vx archive
		if (ext.toLowerCase() == ".rgss2a") return true;
		//xp archive
		if (ext.toLowerCase() == ".rgssad") return true;
	}
	return false;
}

window.RMRGSS = RMRGSS;


thisAddon.createProject = async function(exeFile, options) {
	options = options || {};
	await ui.log("Creating project");
	try {
		var rmUtil = new RMUtil(exeFile, options)	
		rmUtil.writeMode = false;
		await rmUtil.toTrans();
		await rmUtil.tesCopyRequiredFiles()
		trans.openFromTransObj({project:rmUtil.trans}, {isNew:true});
		console.log("rmUtil:", rmUtil);
		return rmUtil;
	} catch (e) {
		console.error(e);
		ui.logError("Error occured! Please see console window(F12) for more information", e.toString());
	}
}

thisAddon.exportToFolder = async function(destinationDir, transData, options) {
	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.engineType	= options.engineType || transData.project.gameEngine || trans.project.gameEngine;
	options.translationDatas = options.translationDatas || trans.getTranslationData();
	//var currentGamePath = transData.project.loc;

	try {
		if (! await common.isDirectory(transData.project.cache.cachePath)) {
			ui.log("Error: Unable to find directory:"+transData.project.cache.cachePath);
			return;
		}
	
		if (empty(transData)) {
			ui.log("Error: Trans data is blank!");
			return console.warn("trans data is blank");
		}
	
		var stagingData		= nwPath.join(transData.project.cache.cachePath, "data");
	
		await ui.log("Export to folder"+destinationDir);
		var rmUtil = new RMUtil(destinationDir, options);
		rmUtil.writeMode = true;
		await rmUtil.setUnpackedDir(stagingData);
		console.log("RMUtil is:", rmUtil);
		var tmpDir = nwPath.join(nw.process.env.TEMP, "tpp_"+common.generateId());
		await ui.log("Translate raw data into: "+tmpDir);
		await common.mkDir(tmpDir);
		await rmUtil.toYaml(tmpDir);
	
		await ui.log("Repack to: "+destinationDir);
		await rmUtil.repackTo(destinationDir, tmpDir);
	
		await rmUtil.tesBuildTo(destinationDir, options);
	
		await ui.log("Writing ini file to: "+destinationDir);
		await rmUtil.dumpIniFile(destinationDir);
	
		return rmUtil;
	} catch (e) {
		console.error(e);
		ui.logError("Error occured! Please see console window(F12) for more information", e.toString());
	}

}

thisAddon.exportToFolderThread = async function(destinationDir, transData, options) {
	console.log("exportToFolderThread with option sys.config.threadNum:", sys.config.threadNum);
	if (!parseInt(sys.config.threadNum)) {
		return await this.exportToFolder(destinationDir, transData, options);
	}

	transData = transData || trans.getSaveData();
	await Thread.saveSession('lastTransData', transData);
	await Thread.saveSession('lastTranslationData', trans.getTranslationData());
	
	await threadServer.startThread(sys.config.threadNum, {addons:["rmrgss"]});
	var selectedFiles = options.files;
	if (empty(selectedFiles)) selectedFiles = trans.getAllFiles();
	// grouping files
	var fileGroup = {
		data:[],
		scripts:[],
		tes:[]
	};
	for (var i=0; i<selectedFiles.length; i++) {
		if (nwPath.dirname(selectedFiles[i]) == "Scripts") {
			fileGroup.scripts.push(selectedFiles[i]);
		} else if (nwPath.dirname(selectedFiles[i]) == "main.rvdata2") {
			fileGroup.tes.push(selectedFiles[i]);
		} else {
			fileGroup.data.push(selectedFiles[i]);
		}
	}
	console.log("fileGroup is", fileGroup);
	var queue = [];

	var processThread = (files=[])=> {
		if (typeof files == "string") files = [files];
		var fn = `async ()=> {
			var options = ${JSON.stringify(options)};
			options.translationDatas = await Thread.loadSession('lastTranslationData');
			options.files = ${JSON.stringify(files)};
			var transData = await Thread.loadSession('lastTransData');
			return await addonLoader.addons.rmrgss.exportToFolder(${JSON.stringify(destinationDir)}, transData, options)
		}`
		queue.push(fn);
	}

	// distribute the process of data files into threads
	for (var i=0; i<fileGroup.data.length; i++) {
		processThread([fileGroup.data[i]]);
	}
	// send SCRIPT data into a thread
	if (!empty(fileGroup.scripts)) processThread(fileGroup.scripts[i]); 

	// send TES data into a thread
	if (!empty(fileGroup.tes)) processThread(fileGroup.tes[i]); 

	console.log("queue is", queue);
	var result = await threadServer.processQueue(queue);
	await threadServer.closeThreads();
	await Thread.removeSession('lastTransData');
	await Thread.removeSession('lastTranslationData');
	return result;
}

thisAddon.exportAsZip = async function(targetPath, transData, options) {
	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.engineType	= options.engineType || transData.project.gameEngine || trans.project.gameEngine;
	options.translationDatas = options.translationDatas || trans.getTranslationData();

	// todo
	var tmpDir = nwPath.join(nw.process.env.TEMP, "tpp_"+common.generateId());
	try {
		await fse.remove(tmpDir); 
		await common.mkDir(tmpDir, {recursive:true});
	} catch(e) {
		console.warn("Unable to create directory ", tmpDir);
		console.error(e);
		return;
	}

	await this.exportToFolderThread(tmpDir, transData, options);
	await ui.log("Zipping temporary data");
	var _7z = require('7zip-min');

	return new Promise((resolve, reject) => {
		_7z.cmd(['a', '-tzip', targetPath, tmpDir+"\\*"], err => {
			// done
			console.log("process done");
			resolve(targetPath);
		});	
	})

}

thisAddon.injectTranslation = async function(targetDir, sourceMaterial, options) {
	console.log("Running on inject handler", arguments);

	var sourceDir = sourceMaterial;
	if (await common.isFileAsync(sourceMaterial)) {
		sourceDir = path.dirname(sourceMaterial);
	}

	if (["copyNothing"].includes(options.copyOptions) == false) {
		await ui.log(`Copy ${sourceDir} to ${targetDir}`);
		var overWrite = true;
		if (options.copyOptions == "copyIfNotExist") overWrite = false;
		await ui.log("Overwrite option: "+overWrite.toString());
		await bCopy(sourceDir, targetDir, {
			onBeforeCopy: async (from, to) => {
				await ui.log(`Start copying ${from}`);
			},
			onAfterCopy: async (from, to) => {
				await ui.log(`Successfully copied into ${to}`);
			},
			overwrite: overWrite
		});
	}


	await ui.log("--Handling RM Data");
	var originPath 	= nwPath.join(trans.project.cache.cachePath, "data");
	await ui.log("Generating translation from cache data "+originPath);
	await thisAddon.exportToFolderThread(targetDir, undefined, options);
}

/*
thisAddon.yamlFileToTrans = async function(targetDir, file) {
	var rmUtil = new RMUtil(targetDir)
	await rmUtil.setUnpackedDir(targetDir);
	await rmUtil.addFiles([file]);
	await rmUtil.parse();
	var files = {};
	for (var i in rmUtil.parsed.rmdata) {
		var thisData = rmUtil.parsed.rmdata[i];
		var thisRelPath = thisData.fileInfo.relPath
		files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	return files	
}
*/


thisAddon.yamlToTrans = async function(targetDir, file, mode) {
	mode = mode || RMUtil.detectMode(file);
	var result = {
		attachments		: {},
		files			: {}
	}
	var rmUtil = new RMUtil(targetDir)
	await rmUtil.setUnpackedDir(targetDir);
	await rmUtil.addFiles([file]);
	await rmUtil.parse([file], mode);
	for (var i in rmUtil.parsed.rmdata) {
		var thisData = rmUtil.parsed.rmdata[i];
		var thisRelPath = thisData.fileInfo.relPath
		result.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	result.attachments 	= RMUtil.attachments;
	if (rmUtil.gameTitle) result.gameTitle = rmUtil.gameTitle;
	return result;
}

thisAddon.createProjectThread = async function(exeFile, options) {
	console.log("Creating project with thread");
	if (!parseInt(sys.config.threadNum)) {
		return await this.createProject(exeFile, options);
	}

	options 		= options || {};
	var cacheInfo 	= await RMUtil.createCacheFolder();

	// Get parsable files from the project
	var rmUtil = new RMUtil(exeFile, options)	
	rmUtil.writeMode 	= false;
	rmUtil.targetDir 	= nwPath.join(cacheInfo.cachePath, "data/");
	if (!rmUtil.contents) await rmUtil.toObj();

	console.log(rmUtil);

	await threadServer.startThread(sys.config.threadNum, {addons:["rmrgss"]});
	await ui.log("Generating trans data from RMData");
	var queue = [];
	for (var i in rmUtil.contents.yaml) {
		var thisFile = rmUtil.contents.yaml[i];
		var fn = `async ()=> {
			return await addonLoader.addons.rmrgss.yamlToTrans(${JSON.stringify(cacheInfo.cachePath)}, ${JSON.stringify(thisFile)})
		}`
		queue.push(fn);
	}


	var result = await threadServer.processQueue(queue);
	await threadServer.closeThreads();

	var newTrans = {
		projectId		: cacheInfo.cacheID,
		cache			: cacheInfo,
		gameEngine		: RMUtil.translateEngineType(rmUtil.engineCode),
		gameTitle		: "",
		loc				: rmUtil.dirname,
		parser			: 'rmrgss',
		parserVersion	: thisAddon.package.version,
		attachments		: {},
		files			: {}
	}
	if (Array.isArray(result) == false) return;
	if (empty(result)) return;
	for (var i=0; i<result.length; i++) {
		if (!result[i]) continue;
		if (result[i].gameTitle) newTrans.gameTitle 	= result[i].gameTitle;
		if (!empty(result[i].attachments)) newTrans.attachments = Object.assign({}, newTrans.attachments, result[i].attachments);
		if (!empty(result[i].files)) newTrans.files = Object.assign({}, newTrans.files, result[i].files);
	}

	await ui.log("Generating trans data from Game.ini");
	if (rmUtil.contents.gameIni) {
		await rmUtil.parse([rmUtil.contents.gameIni], "ini");
		var gameIni 	= rmUtil.parsed.gameIni;
		var thisRelPath = rmUtil.parsed.gameIni.fileInfo.relPath;
		newTrans.files[thisRelPath] = Object.assign({}, gameIni.transData, gameIni.fileInfo);
	}

	
	await ui.log("Generating trans data from Script");
	await rmUtil.parse(undefined, "script");
	for (var i in rmUtil.parsed.scripts) {
		var thisData = rmUtil.parsed.scripts[i];
		var thisRelPath = thisData.fileInfo.relPath
		newTrans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
	}
	rmUtil.parsed.scripts = {};

	await rmUtil.parse(undefined, "tes");
	if (rmUtil.parsed.tesData) {
		await ui.log("Generating trans data from TES data");
		for (var i in rmUtil.parsed.tesData) {
			var thisData = rmUtil.parsed.tesData[i];
			var thisRelPath = thisData.fileInfo.relPath
			newTrans.files[thisRelPath] = Object.assign({}, thisData.transData, thisData.fileInfo);
		}
		rmUtil.parsed.tesData = undefined;
	}

	await ui.log("Sorting object data");
	newTrans.files = common.sortObj(newTrans.files);

	await rmUtil.tesCopyRequiredFiles()
	trans.openFromTransObj({project:newTrans}, {isNew:true});
	console.log("rmUtil:", rmUtil);
	return rmUtil;

	//return trans;
}



var drawProjectCreator = function() {
	var $slide = $(`<h1><i class="icon-plus-circled"></i><span data-tran="">RPG Maker XP, VX, Ace, MV & MZ Parser Ver. ${thisAddon.package.version}</span></h1>
	<div class="fieldgroup">
		<div class="dialogSectionBlock fieldgroup">
			<h2 data-tran="">${('Select the game')}</h2>
			<div class="info" data-tran="">${('Select the executable file from your original game.')}</div>
			<label><input type="dvSelectPath" class="rpgMakerLocation" accept=".exe,.html,.htm" /></label>
		</div>		
		<div class="dialogSectionBlock fieldgroup detectedTypeWrapper hidden">
			<h2 data-tran="">${('Detected engine / type')}</h2>
			<div class="info" data-tran=""></div>
			<label><input type="text" class="detectedType" readonly="readonly" /></label>
		</div>	
		<div class="dialogSectionBlock fieldgroup createCopyWrapper hidden">
			<label class="flex fullWidth">
				<div class="flexMain">
					<div class="label">${('Create a development copy ')}<span class="copyIsRequired">${('(required)')}</span></div>
					<div class="info" data-tran="">${('Will create an editable copy of your game (required for some project)')}</div>
				</div>
				<div>
					<input type="checkbox" class="createCopy flipSwitch"> 
				</div>
			</label>
		</div>			
		<div class="fieldgroup devLocationWrapper">
			<h2 data-tran="">${('Set development directory')}</h2>
			<div class="info" data-tran="">${('Translator++ will generate an extracted, ready to translate copy of your game in this directory.')}</div>
			<label><input type="dvSelectPath" class="devLocation" nwdirectory /></label>
		</div>		
		<div class="fieldgroup devLocationTypeWrapper hidden">
			<h2 data-tran="">${(`Development directory's Engine Type`)}</h2>
			<div class="info" data-tran="">${('The detected engine type of the source materials in the development directory.')}</div>
			<label><input type="text" class="devLocationType fullWidth" /></label>
		</div>		
		<div class="fieldgroup devLocationExeWrapper hidden">
			<h2 data-tran="">${(`Development directory's Executable`)}</h2>
			<div class="info" data-tran="">${('Path of the Executable of the source materials in the development directory.')}</div>
			<label><input type="text" class="devLocationExe fullWidth" /></label>
		</div>		
		<div class="actionButtons">
		<!--
			<button class="selectRPGExe"><i class="icon-doc-inv"></i>${('Create project!')}</button>
		-->
			<button class="createProjectFromRPGM"><i class="icon-doc-inv"></i>${(`Create project!`)}</button>
		</div>
	</div>`);
	
	ui.newProjectDialog.addMenu({
		icon 			: thisAddon.getWebLocation()+"/icon-v2.png",
		descriptionBar 	: `<h2>${t('RPG Maker XP, VX, Ace, MV & MZ Parser V.2')}</h2>
						   <p>${t('Start translation from RPG Maker game using the latest parser.')}</p>`,
		actionBar		: "",
		goToSlide		: "rmrgss",
		at				: 1,
		slides 			: {"rmrgss": $slide}
	})

	var initializeSlide = ($slide)=> {
		var resetSlide = ()=> {
			console.log("initializing slide");
			$slide.find(".rpgMakerLocation").val("");
			$slide.find(".devLocation").val("");
			$slide.find(".devLocationWrapper").addClass("hidden");
			$slide.find(".detectedTypeWrapper").addClass("hidden");
			$slide.find(".devLocationTypeWrapper").addClass("hidden");
			$slide.find(".devLocationExeWrapper").addClass("hidden");
			// initializing create a copy
			$slide.find(".createCopyWrapper").addClass("hidden");
			$slide.find(".createCopy").prop("checked", false);
			$slide.find(".createCopy").prop("disabled", false);
			$slide.find(".copyIsRequired").addClass("hidden");
			
			$slide.find(".detectedType").val("");
			$slide.find(".devLocationType").val("");
			$slide.find(".devLocationExe").val("");
			$slide.find(".devLocationWrapper").removeClass("mandatory");
			$slide.find(".createProjectFromRPGM").prop("disabled", true);
		};
		resetSlide();

		if ($slide.hasClass("isInitialized")) return;

		$slide.find(".rpgMakerLocation").on("change", async function(e) {
			var loc = $(this).val();
			console.log("analyzing path : ", loc);
			var projectType = await Engines.detect(loc);
	
			$slide.find(".detectedTypeWrapper").removeClass("hidden");
			
			// create a copy
			$slide.find(".createCopyWrapper").removeClass("hidden");
			$slide.find(".detectedType").val(projectType);
			$slide.find(".devLocation").val("");
			
			if (!Boolean(projectType)) return alert(t("Error!\r\nTranslator++ is unable to detect the type of ")+loc);
			
			if (projectType == "enigma") {
				console.log("Is Enigma");
				// create a copy is mandatory
				$slide.find(".createCopy").prop("checked", true);
				$slide.find(".createCopy").prop("disabled", true);
				$slide.find(".copyIsRequired").removeClass("hidden");
	
				$slide.find(".devLocationWrapper").addClass("mandatory");
				
				$slide.find(".createCopy").trigger("change");
				
				return;
			} else if (["rmvxace", "rmvx", "rmxp"].includes(projectType)) {
	
				console.log("RPG Maker - RSS Variant");
				ui._thisGame = new RMRGSS(loc);
				if (await ui._thisGame.isPacked()) {
					// create a copy is mandatory
					$slide.find(".createCopy").prop("checked", true);
					$slide.find(".createCopy").prop("disabled", true);
					$slide.find(".copyIsRequired").removeClass("hidden");
	
					$slide.find(".devLocationWrapper").addClass("mandatory");
					
					$slide.find(".createCopy").trigger("change");
					return;
				}
			}
			
			// not enigma
			$slide.find(".createProjectFromRPGM").prop("disabled", false);
		});
		$slide.find(".createCopy").on("change", async function(e) {

			
			if ($(this).prop("checked")) {
				$slide.find(".devLocationWrapper").removeClass("hidden");
			} else {
				$slide.find(".devLocationWrapper").addClass("hidden");
			}
			
		})
		
		
		$slide.find(".devLocation").on("change", async function(e) {
			var to 		= $(this).val();
			var from 	= $slide.find(".rpgMakerLocation").val();
			var detectedType = $slide.find(".detectedType").val().toLowerCase()
	
			if (common.isRelated(nwPath.dirname(from)+"/", to+"/")) {
				alert(`${nwPath.dirname(from)}\r\nis related to\r\n${to}\r\n`+t("You should change the path!\r\nThe Dev directory should not inside the original game's directory, as this will cause problem if you inject the game latter."));
				$(this).val("");
				return;
			}

			if (detectedType == "enigma") {
				var conf = confirm(t("The game is packed with Enigma.\r\nDo you want to extract the package?\r\nThis will take minutes, depend on the size of your game."))
				if (!conf) {
					$(this).val("");
					return 
				}
				
				ui.showBusyOverlay();
				await php.extractEnigma(from, to);
				var thisEngine = await Engines.detect(to);
				if (thisEngine == "rmmz") {
					var executable = await RMMZ.getExe(nwPath.join(to));
				} else { // rmmv
					var executable = await RMMV.getExe(nwPath.join(to));
				}
				$slide.find(".devLocationTypeWrapper").removeClass("hidden");
				$slide.find(".devLocationType").val(thisEngine);
				$slide.find(".devLocationExeWrapper").removeClass("hidden");
				$slide.find(".devLocationExe").val(nwPath.join(to, executable));
				
				ui.hideBusyOverlay();
			} else if (["rmvxace", "rmvx", "rmxp"].includes(detectedType)) {
	
				var conf = confirm(t("Copy & extract data into ")+to+" ?")
				if (!conf) {
					$(this).val("");
					return 
				}
				ui.showBusyOverlay();
				
				ui._thisGame 		= ui._thisGame || new RMRGSS(from);
				var thisEngine 		= $slide.find(".detectedType").val();
				var devExecutable 	= nwPath.join(to, nwPath.basename(from));
				
				await ui._thisGame.extractTo(to);
				
				$slide.find(".devLocationTypeWrapper").removeClass("hidden");
				$slide.find(".devLocationType").val(thisEngine);
				$slide.find(".devLocationExeWrapper").removeClass("hidden");
				$slide.find(".devLocationExe").val(devExecutable);
				ui.hideBusyOverlay();
				
			}
			
			$slide.find(".createProjectFromRPGM").prop("disabled", false)
			
		});
		
		$slide.find(".createProjectFromRPGM").on("click", async function(e) {
			if ($(this).prop("disabled")) return;

			console.log("Creating a new project from RMRGSS addon");
			var master 	= $slide.find(".rpgMakerLocation").val();
			var devExe 	= $slide.find(".devLocationExe").val();
			
			var targetPath = devExe || master;
			var engineType = $slide.find(".devLocationType").val() ||  $slide.find(".detectedType").val(); // determined type

			ui.showLoading();
			ui.loadingProgress("Processing", "Creating a new project", {consoleOnly:false, mode:'consoleOutput'});
			await ui.log(`This window will look like it hangs. Open console log(F12) if you're using the dev version to see what's happening in the background.`);
			await ui.log("Target path:", targetPath);
			await ui.log("Engine type:", engineType);
			await ui.newProjectDialog.close();


			await common.benchmark(async ()=>{
				await engines.getEngine(engineType).triggerHandler("rmCreateProject", thisAddon, [targetPath]);
			})
			ui.loadingProgress("Finished", "Done!", {consoleOnly:false, mode:'consoleOutput'});
			ui.loadingEnd("Done!");
			return common.halt();
						
		});

		$slide.addClass("isInitialized");
	}
	
	$(document).on("newProjectSlideChange", async (e, slideInfo) => {
		if (slideInfo.id !== "rmrgss") return;
		initializeSlide(slideInfo.elm);
	});

}


function init() {
	var supportedEngines = ["rmxp", "rmvx", "rmvxace"];
	engines.addHandler(supportedEngines, "onLoadTrans", 
	() => {
		console.log("Executing onloadtrans");
		ui.translationByContext.dataLocation = "contextTranslation";
	});

	drawProjectCreator();

	engines.addHandler(supportedEngines, 'rmCreateProject', async function(targetPath) {
		await ui.log("Handling RGSS Based RPG Maker");
		await thisAddon.createProjectThread(targetPath);
	});

	engines.addHandler(supportedEngines, 'exportHandler', async function(targetPath, options) {
		if (trans.project.parser != "rmrgss") return;
	
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		console.log("Export handler", arguments);

		ui.showLoading();
		ui.loadingProgress("Processing", "Export into : "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		await ui.log("Target directory:", targetPath);
		await ui.log("Options : ", options);
		await ui.log("Origin path is cache path");
		var originPath = nwPath.join(trans.project.cache.cachePath, "data");

		if (await await common.isDirectory(targetPath)) {
			await thisAddon.exportToFolderThread(targetPath, undefined, options);
		} else {
			await thisAddon.exportAsZip(targetPath, undefined, options);
		}
		ui.loadingProgress("Finished", "Done!", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingEnd();
		return common.halt();
	});
	
	engines.addHandler(supportedEngines, 'onOpenInjectDialog', async function(ui, $dialog, options) {
		var $copyOption = $(".copyOptionsBlock");
		$copyOption.removeClass("hidden");
	});

	engines.addHandler(supportedEngines, 'injectHandler', async function(targetDir, sourceMaterial, options) {
		if (trans.project.parser != "rmrgss") return;
	
		ui.showLoading();
		ui.loadingProgress("Processing", "Injecting translation", {consoleOnly:false, mode:'consoleOutput'});

		await thisAddon.injectTranslation(targetDir, sourceMaterial, options);

		ui.loadingProgress("Finished", "Finished!", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingEnd();
		ui.showCloseButton();

		return common.halt();
	});

	engines.addHandler(supportedEngines, 'onLoadSnippet', async function(selectedCell) {

		var obj = trans.getSelectedObject();
		this.commonHandleFile(selectedCell, "ruby");

	});	
}


$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});