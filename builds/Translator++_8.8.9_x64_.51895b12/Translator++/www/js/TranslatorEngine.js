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
window.langTools = new (require("www/js/LangTools.js"))(require("www/js/langDB.js"))
window.debounce ||= require("debounce");
window.TextReplacer = require("www/js/TextReplacer.js");

const TranslationPairs = function(obj) {
	this.pairs = {};
	var listOrder = undefined;

	const init = (obj) => {
		if (obj.constructor.name == "TranslationPairs") {
			return obj;
		} else if (Array.isArray(obj)) {
			// Object is array
			listOrder = obj;
			for (let i in obj) {
				this.pairs[obj[i]] = "";
			}
		} else if (typeof obj == "string") {
			this.pairs[obj] = "";

		} else if (typeof obj == "object") {
			// input is TranslationResult
			if (Array.isArray(obj?.source) && Array.isArray(obj?.translation)) {
				listOrder = obj.source;
				for (let i in obj.source) {
					this.pairs[obj.source[i]] = obj.translation[i];
				}
			} else {
				this.pairs = obj;
			}
			
		} else if (!obj) {
			this.pairs = {};
		} else {
			throw new Error("Unsupported format for type "+typeof obj)
		}
		return this;
	}

	this.getTranslationResult = (originalTexts) => {
		const thisOrder = originalTexts || listOrder;
		const result = {
			source: [],
			translation:[],
			sourceText:"",
			translationText:""
		}
		if (thisOrder?.length) {
			// list order preserved
			const registered = {}
			for (let i in thisOrder) {
				result.source[i] = thisOrder[i] || "";
				result.translation[i] = this.pairs[thisOrder[i]] || "";

				registered[thisOrder[i]] = true;
			}
			if (Object.keys(registered) < this.pairs.length) {
				for (let origText in this.pairs) {
					if (registered[origText]) continue;
					result.source.push(origText || "");
					result.translation.push(this.pairs[origText] || "");
				}
			}
		} else {
			// generate by order or the index
		}
		result.sourceText = result.source.join("\n")
		result.translationText = result.translation.join("\n")

		return result;
	}
	return init(obj);
}

TranslationPairs.from = function(obj) {
	if (obj.constructor.name == "TranslationPairs") {
		return obj;
	} else {
		return new TranslationPairs(obj)
	}
}


TranslationPairs.prototype.getPairs = function() {
	return this.pairs
}

TranslationPairs.prototype.getUntranslated = function() {
	const result = [];
	const thisPairs = this.getPairs();
	for (let i in thisPairs) {
		if (thisPairs[i]) continue;
		result.push(i);
	}
	return result;
}

TranslationPairs.prototype.getTranslated = function() {
	const result = [];
	const thisPairs = this.getPairs();
	for (let i in thisPairs) {
		if (!thisPairs[i]) continue;
		result.push(i);
	}
	return result;
}

TranslationPairs.prototype.setTranslation = function(originalText, translation, options={append:false}) {
	if (typeof originalText == "string" && typeof translation == "string") {
		if (options.append) {
			// append translation if originalText not exist previously
			this.pairs[originalText] = translation;
		} else {
			if (typeof this.pairs[originalText] !== "undefined") {
				this.pairs[originalText] = translation;
			}
		}
	} else if (Array.isArray(originalText) && Array.isArray(translation)) {
		if (originalText.length != translation.length) console.warn("Warning: Original & Translation length is not same");
		if (options.append) {
			// append translation if originalText not exist previously
			for (let i in originalText) {
				this.pairs[originalText[i]] = translation[i];
			}
		} else {
			for (let i in originalText) {
				if (typeof this.pairs[originalText[i]] !== "undefined") {
					this.pairs[originalText[i]] = translation[i];
				}
			}

		}
	}

	return this;
}


/**
 * Handles how a text or an array of texts is translated from one language to another.
 * Each translation app has its own protocol, api and method. This class takes care of that and at the same time hopes to make that diversity more uniform.
 * @class
 * @param {Object} [defaultVal] - Default value. Please provide an object with the TranslatorEngine like structure. 
 * @param {Object} [defaultConfig] - Default user configuration. Please provide an object with the TranslatorEngine like structure. 
 */  
var TranslatorEngine = function(defaultVal, defaultConfig) {
	if (!new.target) {
		throw new Error("TranslatorEngine() is a constructor and must be called with new");
	}
	this.constructor.apply(this, arguments);
	this.$elm = $("<div></div>");
	this.defaultConfig = defaultConfig || this.defaultConfig || {};

	// legacy
	window.trans ||= {}
	trans[this.id] = this; // legacy

}
require("www/js/BasicEventHandler.js").applyTo(TranslatorEngine);

/**
 * Get the engine by their ID
 * @param {string} engineID - Engine ID
 * @static
 */
TranslatorEngine.getEngine = function(engineID) {
	return this?.translators?.[engineID];
}

TranslatorEngine.getSorted = function(){
    const translators = this.translators;
    // Convert object to array of [key, value] pairs, sort by value.name, then reconstruct object
    return Object.fromEntries(
        Object.entries(translators).sort((a, b) => {
            const nameA = a[1].name || "";
            const nameB = b[1].name || "";
            return nameA.localeCompare(nameB);
        })
    );
}

TranslatorEngine.getEnginesBySupportedLanguage = function(sl, tl) {
	const result = [];
	for (let i in this.translators) {
		if (this.translators[i].isSupported(sl, tl)) {
			result.push(this.translators[i]);
		}
	}
	return result;
}

TranslatorEngine.mockupMode = false;

TranslatorEngine.prototype.on = function(evt, fn) {
    this.$elm.on(evt, fn)
}

TranslatorEngine.prototype.off = function(evt, fn) {
    this.$elm.off(evt, fn)
}

TranslatorEngine.prototype.one = function(evt, fn) {
    this.$elm.one(evt, fn)
}

TranslatorEngine.prototype.trigger = function(evt, param) {
    this.$elm.trigger(evt, param)
}

TranslatorEngine.prototype.isSupported = function(sl, tl) {
	if (this.sourceLanguages && this.targetLanguages) {
		return Boolean(this.sourceLanguages[sl] && this.targetLanguages[tl]);
	}
	return Boolean(this.languages[sl] && this.languages[tl]);
}

TranslatorEngine.prototype.constructor = function(defaultVal) {
	this.debugLevel = 0;
	/**
	 * ID of the engine. Must be unique.
	 */
	this.id=""
	/**
	 * Display name of the engine
	 */
	this.name=""
	/**
	 * Description of the engine.
	 */
	this.description=""
	/**
	 * Author of this engine
	 * @default Anonymous
	 */
	this.author="Anonymous"
	/**
	 * Engine version
	 */
	this.version="1.0"
	this.isInitialized= false
	this.isDisabled=false
	this.columnIndex=2
	this.columnHeader= ""
	/**
	 * Maximum request length for each batch in characters.
	 * @default 5000
	 */
	this.maxRequestLength = 5000
	this.fileListLoaded= false
	this.indexIsBuilt= false
	this.skipTranslated=false
	this.rowLimitPerBatch=Infinity
	/**
	 * Batch delay.
	 * The waiting time between batch. Some server will ban user if you send intense attack like requests.
	 * @default 5000
	 */
	this.batchDelay=5000
	this.skipTranslatedOnBatch =true // skip lines that already translated when doing TRANSLATE ALL

	/**
	 * In rowByRow mode newlines (`\n`) will be substituted by this character before sending to translator.
	 * Glue between lines
	 * @default §
	 */
	this.lineSubstitute = '§', //¶, 
	this.lineSubstituteStripExtraSpace = true; // some translators (like google) will add extra space after lineSubstitute, this option will strip that space when restoring line break. Only enable this when your translator add extra space after lineSubstitute, otherwise it may remove intentional space after lineSubstitute in original text.
	
	/**
	 * Escape algorithm to escape subset of string.
	 */
	this.escapeAlgorithm = '',

	/**
	 * delimiter for each line. Pick character that will be obeyed by translator engine.
	 * The possition of the delimiter for the resulted translation should be intact and unchanged.
	 * if the number of lines of original text doesn't match with translation result...dissaster will be occured!
	 * 
	 * Glue between rows
	 * 
	 * Example:
	 * Google treat line break as line separator. You should use \n (or \r\n) for google.
	 * 
	 * @default \n
	 */
	this.delimiter = $DV.config.lineSeparator,

	this.hookAfterGeneratingBatchJobs = async function(batchJobs, translatorOptions) {
	}

	this.hookBeforeBatch = async function(translatorOptions) {
	}

	this.hookAfterBatch = async function(translatorOptions) {
	}
	

	/**
	 * Supported languages of the translator
	 * default is whatever google supports
	*/
	this.languages = {
		"af" : "Afrikaans",
		"sq" : "Albanian",
		"am" : "Amharic",
		"ar" : "Arabic",
		"hy" : "Armenian",
		"az" : "Azerbaijani",
		"eu" : "Basque",
		"be" : "Belarusian",
		"bn" : "Bengali",
		"bs" : "Bosnian",
		"bg" : "Bulgarian",
		"ca" : "Catalan",
		"ceb" : "Cebuano",
		"zh-CN" : "Chinese (Simplified)",
		"zh-TW" : "Chinese (Traditional)",
		"co" : "Corsican",
		"hr" : "Croatian",
		"cs" : "Czech",
		"da" : "Danish",
		"nl" : "Dutch",
		"en" : "English",
		"eo" : "Esperanto",
		"et" : "Estonian",
		"fi" : "Finnish",
		"fr" : "French",
		"fy" : "Frisian",
		"gl" : "Galician",
		"ka" : "Georgian",
		"de" : "German",
		"el" : "Greek",
		"gu" : "Gujarati",
		"ht" : "Haitian Creole",
		"ha" : "Hausa",
		"haw" : "Hawaiian",
		"he" : "Hebrew",
		"hi" : "Hindi",
		"hmn" : "Hmong",
		"hu" : "Hungarian",
		"is" : "Icelandic",
		"ig" : "Igbo",
		"id" : "Indonesian",
		"ga" : "Irish",
		"it" : "Italian",
		"ja" : "Japanese",
		"jw" : "Javanese",
		"kn" : "Kannada",
		"kk" : "Kazakh",
		"km" : "Khmer",
		"ko" : "Korean",
		"ku" : "Kurdish",
		"ky" : "Kyrgyz",
		"lo" : "Lao",
		"la" : "Latin",
		"lv" : "Latvian",
		"lt" : "Lithuanian",
		"lb" : "Luxembourgish",
		"mk" : "Macedonian",
		"mg" : "Malagasy",
		"ms" : "Malay",
		"ml" : "Malayalam",
		"mt" : "Maltese",
		"mi" : "Maori",
		"mr" : "Marathi",
		"mn" : "Mongolian",
		"my" : "Myanmar (Burmese)",
		"ne" : "Nepali",
		"no" : "Norwegian",
		"ny" : "Nyanja (Chichewa)",
		"ps" : "Pashto",
		"fa" : "Persian",
		"pl" : "Polish",
		"pt" : "Portuguese (Portugal, Brazil)",
		"pa" : "Punjabi",
		"ro" : "Romanian",
		"ru" : "Russian",
		"sm" : "Samoan",
		"gd" : "Scots Gaelic",
		"sr" : "Serbian",
		"st" : "Sesotho",
		"sn" : "Shona",
		"sd" : "Sindhi",
		"si" : "Sinhala (Sinhalese)",
		"sk" : "Slovak",
		"sl" : "Slovenian",
		"so" : "Somali",
		"es" : "Spanish",
		"su" : "Sundanese",
		"sw" : "Swahili",
		"sv" : "Swedish",
		"tl" : "Tagalog (Filipino)",
		"tg" : "Tajik",
		"ta" : "Tamil",
		"te" : "Telugu",
		"th" : "Thai",
		"tr" : "Turkish",
		"uk" : "Ukrainian",
		"ur" : "Urdu",
		"uz" : "Uzbek",
		"vi" : "Vietnamese",
		"cy" : "Welsh",
		"xh" : "Xhosa",
		"yi" : "Yiddish",
		"yo" : "Yoruba",
		"zu" : "Zulu"
	}
	
	/**
	 * A `JSON Form` object to generate a form for options.
	 * More about JSON Form:
	 * [https://github.com/jsonform/jsonform/wiki](https://github.com/jsonform/jsonform/wiki)
	 * [Sample and playground](https://jsonform.github.io/jsonform/playground/index.html)
	 * @type {Object}
	 */
	this.optionsForm = {
		schema: {
			disableCustomEscape: {
				"type": "boolean",
				"title": "Disable custom escape",
				"description": "When enabled, current translator will bypass the custom escape pattern, sending the text exactly as written.\nThis option is ideal for AI-based translation when translators are familiar with in-game tags and can interpret them based on their trained knowledge.",
				"default": this.getOptions("disableCustomEscape") || false,
			},
			lineSubstitute: {
				"type": "string",
				"title": "New line character substitute",
				"description": "Newline character replacer before sending the text to translator service.\nGlue between lines.",
				"default": this.lineSubstitute
			}
		},
		form: [
			{
				"type": "checkbox",
				"key": "disableCustomEscape",
				"onChange": (evt) => {
					var value = $(evt.target).is(":checked");
					this.update("disableCustomEscape", value);
				}
			},
			{
				"key": "lineSubstitute",
				"onChange": (evt) => {
					var value = $(evt.target).val();
					this.update("lineSubstitute", value);
				}
			}
		]
	};
	
	if (typeof defaultVal == 'object') {
		for (var key in defaultVal) {
			if (key == "optionsForm") {
				this.mergeOptionsForm(defaultVal[key]);
				continue;
			}
			this[key] = defaultVal[key];
		}
	}
	
	this.$elm = $("<div></div>");
}


/**
 * Convert language code from the unified language code to this engine's language code.
 * @param {String} standardCode - Standard language code
 * @param {String} [langTable] - Language table. sl||tl
 * @returns {String} - This engine's language code
 * @since 4.10.1
 * @example
 * trans.getTranslatorEngine("lingvaNex").getLanguageCode("ja")
 * // ja_JP
 */
TranslatorEngine.prototype.getLanguageCode = function(standardCode, langTable) {
	if (!langTable) {
		if (!this.languages[standardCode]) return standardCode;
		return this.languages[standardCode];
	}

	if (typeof langTable !== "string") return console.error("Expected second parameter to be string", typeof langTable, "given!", langTable);
	var targetKey = "languages";
	if (["sl", "source", "sourcelanguage", "sourcelanguages"].includes(langTable.toLowerCase())) {
		targetKey = "sourceLanguages";
	} else if (["tl", "target", "targetlanguage", "targetlanguages"].includes(langTable.toLowerCase())) {
		targetKey = "targetLanguages";
	}

	console.log("%cgetLanguageCode: %o, %o, %o", "color:green", standardCode, langTable, targetKey);

	try {
		return this[targetKey][standardCode] || standardCode;
	} catch (e) {
		console.warn(e);
		return standardCode
	}
}

TranslatorEngine.prototype.mergeOptionsForm = function(optionsForm) {
	if (!optionsForm) return;
	optionsForm ||= {}
	optionsForm.schema 	||= {};
	optionsForm.form	||= [];

	this.optionsForm 			||= {};
	this.optionsForm.schema 	||= {};
	this.optionsForm.form 		||= [];

	var exists = [];
	
	for (var schKey in optionsForm.schema) {
		var thisSchema = optionsForm.schema[schKey];
		if (this.optionsForm.schema[schKey]) exists.push(schKey);
		this.optionsForm.schema[schKey] = thisSchema;
	}

	for (var fldId=0; fldId<this.optionsForm.form.length; fldId++) {
		var fldKey = this.optionsForm.form[fldId].key;
		if (!fldKey) continue;
		if (exists.includes(fldKey) == false) continue;

		// remove the key from template
		this.optionsForm.form.splice(fldId, 1);
	}

	this.optionsForm.form = optionsForm.form.concat(this.optionsForm.form);

	for (let i in optionsForm) {
		if (["schema", "form"].includes(i)) continue;
		this.optionsForm[i] = optionsForm[i];
	}
}

TranslatorEngine.prototype.getOptionsFormValue = function() {
	var result = {};
	for (var key in this.optionsForm.schema) {
		result[key] = this.getOptions(key);
	}
	return result;
}


TranslatorEngine.num2Str = function(num) {
	//static method
	var n=["o", "i", "u", "e", "a", "x", "y", "z", "v", "l"];
	var ls = num+"".split("");
	var result = "";
	for (var i=0; i<ls.length; i++) {
		result += n[ls[i]];
	}
	return result;
}

TranslatorEngine.prototype.str2Num = function(num) {
	var n={
	"o":0,
	"i":1,
	"u":2,
	"e":3,
	"a":4,
	"x":5,
	"y":6,
	"z":7,
	"v":8,
	"l":9,
	}
	var ls = num+"".split("");
	var result = "";
	for (var i=0; i<ls.length; i++) {
		//if (typeof n[ls[i]] == 'undefined') return false;
		result += n[ls[i]];
	}
	return result;
}

TranslatorEngine.prototype.restorer = function() {
	// var filler = "exy";
	// var separator = "q";
	/*
	if (str2Num(arguments[4]) == false) {
		return arguments[0];
	}
	*/
	var incomingBuffer = arguments[0].split('Q');
	if (incomingBuffer.length > 2) {
		var result = "";
		for (var i=1; i<incomingBuffer.length; i++) {
			result += this.unescapeCharacter("Q"+incomingBuffer[i]);
		}
		return result;
	}
	return "\\"+arguments[2]+"["+this.str2Num(arguments[4])+"]";
	//return arguments[1]+filler+separator+num2Str(arguments[2])+separator;
}

TranslatorEngine.prototype.replacer = function(match, p1, p2, p3, offset, string) {
	var filler = "exy";
	//var separator = "q";
	return "Q"+arguments[1]+filler+"d"+TranslatorEngine.num2Str(arguments[2])+"f";
}

TranslatorEngine.prototype.restorerS = function() {
	// var filler = "exz";
	// var separator = "q";
	//console.log(arguments);
	var incomingBuffer = arguments[0].split('Q');
	if (incomingBuffer.length > 2) {
		var result = "";
		for (var i=1; i<incomingBuffer.length; i++) {
			result += this.unescapeCharacter("Q"+incomingBuffer[i]);
		}
		return result;
	}		
	return "\\"+arguments[2]+"<"+arguments[4]+">";
	//return arguments[1]+filler+separator+num2Str(arguments[2])+separator;
}

TranslatorEngine.prototype.replacerS = function(match, p1, p2, p3, offset, string) {
	var filler = "exz";
	// var separator = "q";

	//console.log(arguments);
	return "Q"+arguments[1]+filler+"d"+arguments[2]+"f";
}


TranslatorEngine.prototype.unescapeCharacter = function(sentence) {
	var current = this;
	if (!sentence) return "";
		//sentence = sentence.replace(/(.)(ely)\s*(\d+)\s*(\*)/g, "\\$1[$3]");
		//sentence = sentence.replace(/(Q)(\w+)(exyd)(\w+)(f)/g, this.restorer);
		sentence = sentence.replace(/(Q)(\w+)(exyd)(\w+)(f)/g, function() {
			return current.restorer.apply(current, arguments)
		});
		// yanfly
		//sentence = sentence.replace(/(Q)(\w+)(exzd)(\w+)(f)/g, this.restorerS);
		sentence = sentence.replace(/(Q)(\w+)(exzd)(\w+)(f)/g, function() {
			return current.restorerS.apply(current, arguments)
		});
	
	return sentence;
}

TranslatorEngine.prototype.escapeCharacter = function(sentence) {
	if (!sentence) return "";
		//sentence = sentence.replace(/\\(.)\[(\d+)\]/g, "$1ely$2*");
		sentence = sentence.replace(/\\(\w+)\[(\d+)\]/g, this.replacer);
		//yanfly's \xyz<text> format
		sentence = sentence.replace(/\\(\w+)\<(\w+)\>/g, this.replacerS);// eslint-disable-line
	return sentence;
}

TranslatorEngine.prototype.fixTranslationFormatting = function(string) {
	//string = string.replace(/\s+(?=[^\\\]]*\])/g, "");
	//string = string.replace(/\\\s*(\w+)\s*\[\s*(\w+)\s*\]/g, "\\$1[$2]");
	//string = string.replace(/\\\s*(\w+)\s*\<\s*(\w+)\s*\>/g, "\\$1[$2]");
	string = string.replace(/\\\s*(\w+)\s*\[\s*(.*?)\s*\]/g, "\\$1[$2]");
	string = string.replace(/\\\s*(\w+)\s*\<\s*(.*?)\s*\>/g, "\\$1[$2]");// eslint-disable-line
   
	string = string.replace(/\\\s*(\w+)/, "\\$1");
	string = string.replace(/\\\s*([\{\}\\\$\.\|\!\>\<\^])/, "\\$1")   // eslint-disable-line
   
	// replacing pattern % 1
	string = string.replace(/\%\s*(\d+)/g, "%$1");// eslint-disable-line

	//string = str_ireplace("\\\\ ", "\\\\`", string);
	//string = str_ireplace("\\ ", "\\", string);
	//string = str_ireplace("\\\\`", "\\\\ ", string);

	return string;
}


/**
 * @typedef TranslationResult
 * @type {Object} 
 * @property {String[]} source - Source texts 
 * @property {String[]} translation - Translation results
 * @property {String} sourceText - Translation result in plain text format
 * @property {String} translationText - Translation result in plain text format
 */

/**
 * Method to translate text(s)
 * This function is to be replaced with a handler for each translator end point/apps.
 * @param {String|String[]} text - Text(s) to translate
 * @param {Object} [options={}] - Options
 * @param {String} [options.sl=trans.getSl()] - Source language.
 * @param {String} [options.tl=trans.getTl()] - Target language.
 * @param {Function} [options.onAfterLoading] - Callback after process is success.
 * @param {Function} [options.onError] - Callback when process is error.
 * @param {Function} [options.always] - Callback after process is completed.
 * @param {Object} [options] - Options
 * @returns {Promise<TranslationResult>} 
 * @example <caption>Translation with `await` call</caption>
 * var result = await trans.getTranslatorEngine("deepl").translate(["こんにちは"])
 * console.log(result.translation);
 * // prints an array: ["Hello. - Hello."]
 * 
 * @example <caption>Use array to perform batch translation</caption>
 * var result = await trans.getTranslatorEngine("sugoitrans").translate(["こんにちは", "こんばんは。"], {sl:"ja", tl:"en"})
 */
TranslatorEngine.prototype.translate = async function(text=[], options={}) {
	if (TranslatorEngine.mockupMode) ui.log("Running translation in mockup mode. You shouldn't see this message in the production build!");
	console.warn("Translating with engine ", this.id, arguments);
	const thisTranslator = this;
	thisTranslator.escapeAlgorithm = thisTranslator.escapeAlgorithm || "hexPlaceholder";
	console.log("%cEscape Algorithm: ", "color:yellow", thisTranslator.escapeAlgorithm);
	
	if (this.isDisabled == true) return false;
	if (typeof text=='undefined') return text;

	// try to load saved configuration 
	var savedSL; 
	var savedTL;
	try {
		if (this.sourceLanguages) {
			savedSL = this.getLanguageCode(trans.getSl(), "sourceLanguages");
		} else {
			savedSL = this.getLanguageCode(trans.getSl());
		}
		if (this.targetLanguages) {
			savedTL = this.getLanguageCode(trans.getTl(), "targetLanguages");
		} else {
			savedTL = this.getLanguageCode(trans.getTl());
		}
	} catch(e) {
		savedSL = undefined;
		savedTL = undefined;
	}
	options ||= {}
	options.sl = options.sl||savedSL||'ja';
	options.tl = options.tl||savedTL||'en';
	options.onAfterLoading 	= options.onAfterLoading||function() {};
	options.onError 		= options.onError||function() {};
	options.always 			= options.always||function() {};
	
	console.log("Translating with options", options);
	
	const createHtmlTable = function(origTexts, translations) {
		const maxLength = Math.max(origTexts.length, translations.length);
		
		let rows = '';
		for (let i = 0; i < maxLength; i++) {
			const orig = origTexts[i] || '';
			const trans = translations[i] || '';
			rows += `
				<tr>
					<td>${orig}</td>
					<td>${trans}</td>
				</tr>
			`;
		}
		
		const table = `
			<table border="1">
				<thead>
					<tr>
						<th>Original Text</th>
						<th>Translation</th>
					</tr>
				</thead>
				<tbody>
					${rows}
				</tbody>
			</table>
		`;
		
		return table;
	}

	var ensureArrayElement = (resultTexts, origTexts)=> {
		if (thisTranslator.debugLevel) console.log("%c-ensureArrayElement", "color:aqua;",  resultTexts, origTexts);
		// origTexts = ["debug", "debug2", "debug3", "if you see this in production, please contact Dreamsavior"];
		const numberOfElm = origTexts.length;
		if (!Array.isArray(resultTexts)) ui.logError(`Invalid type. Expected an array, ${typeof resultTexts} generated!`)
		if (resultTexts.length != numberOfElm) {
			ui.logError(`Invalid number of translation returned. Expected ${numberOfElm}, but ${resultTexts.length} were generated!`);
			ui.logHtml($(createHtmlTable(origTexts, resultTexts)));
			if (thisTranslator.getOptions("preserveInvalidReturnedRows")) {
				ui.log("Return as is");
				return resultTexts;
			} else {
				ui.log("Fill the result with empty strings for re-translation.");
				return Array(numberOfElm).fill("");
			}
		}

		return resultTexts;
		// const result = []
		// for (let i=0; i<numberOfElm; i++ ) {
		// 	result.push(resultTexts[i] || "")
		// }
		// return result;
	}

     // set default value of the result
    var result = {
        'sourceText':text, 
        'translationText':"",
        'source':[], 
        'translation':[]
    };
    var translatedData = ""

    try {
        if (thisTranslator.debugLevel) console.log("incoming text  : ");
        if (thisTranslator.debugLevel) console.log(text);

		var maxConcurrentRequest = this.getOptions("maxConcurrentRequest")
		var rowLimitPerBatch = this.getOptions("rowLimitPerBatch")
		if (typeof maxConcurrentRequest == "undefined" || !rowLimitPerBatch || !Array.isArray(text) ||rowLimitPerBatch >= text.length) {
			console.log("%c -Processing in single mode!", "color:aqua;");
			var textObj         = thisTranslator.preProcessText(text, options);
			var filteredText    = textObj.toTranslate || textObj.text;
			
			if (thisTranslator.debugLevel) console.log("%c --textObj", "color:aqua;", textObj);
			if (thisTranslator.debugLevel) console.log("%c --Filtered text:\n", "color:aqua;", filteredText);
	
			translatedData = await this.fetchTranslation(filteredText, options.sl, options.tl, textObj, options);
			if (thisTranslator.debugLevel) console.log("%c --Restoring filtered textObj", "color:aqua;", textObj, "of text:", translatedData)
			result = textObj.afterTranslation(translatedData || "");

			if (textObj.originalTexts) {
				result.translation = ensureArrayElement(result.translation, textObj.originalTexts);
				result.translationText = result.translation.join("\n");
			}
			if (thisTranslator.debugLevel) console.log("%c --result", "color:aqua;", result);
		} else {
			// sample
			console.log("%c -Processing in concurrent mode!", "color:aqua;");
			var doTranslate = async (text)=> {
				var result = {
					'sourceText':text, 
					'translationText':"",
					'source':[], 
					'translation':[]
				};
				try {
					var textObj         = thisTranslator.preProcessText(text, options);
					var filteredText    = textObj.toTranslate || textObj.text;
					translatedData = await this.fetchTranslation(filteredText, options.sl, options.tl, textObj, options);
					result = textObj.afterTranslation(translatedData || "");
					if (thisTranslator.debugLevel) console.log("%ctextObj on doTranslate():", "color:yellow", textObj);
					return result;
				} catch (e) {
					ui.logError("Can not fetch translation with error", e.toString());
					console.error("Cannot fetch translation with error", e);
				}
				return result;
			}

			result = await (async ()=> {
				// test
				if (TranslatorEngine.mockupMode) {
					doTranslate = async (subtext)=> {
						if (!Array.isArray(subtext)) return [];
						var result = []
						var lipsum = new window.LoremIpsum()
						for (var i=0; i<subtext.length; i++) {
							result.push(lipsum.generate(common.rand(4, 12)));
						}
						await common.wait(common.rand(100, 500));
						return {
							translation:result
							};
					}
					// var generateLipsumArray = (num)=> {
					// 	var result = []
					// 	var lipsum = new LoremIpsum()
					// 	for (var i=0; i<num; i++) {
					// 		result.push(lipsum.generate(common.rand(4, 12)));
					// 	}
					// 	return result;
					// }
					//var maxConcurrentRequest = 3;
					//var rowLimitPerBatch = 5;
					//var text = generateLipsumArray(200)
					//var result = {}
				}
				
				// end of test ====================================
				
				
				if (thisTranslator.debugLevel) console.log("Procesing in concurrent mode!");
				const plimit = require("p-limit");
				const limit = plimit(maxConcurrentRequest);
				const queue = [];
				const subBatch = common.arrayChunk(text, rowLimitPerBatch);
				const subBatchResult = common.arrayChunk((new Array(text.length)).fill(""), rowLimitPerBatch);

				for (let i=0; i<subBatch.length; i++) {
					queue.push(limit(async ()=> {
						const index = i;
						await ui.log("Translating subbatch "+(index+1)+" of "+subBatch.length);
						const job = subBatch[index]
						let result = await doTranslate(job);
						subBatchResult[i] = ensureArrayElement(result.translation, job);
						//subBatchResult[i] = result.translation;
					}))
				}

				await Promise.all(queue);

				var result = {
					'sourceText':"", 
					'translationText':"",
					'source':text, 
					'translation':subBatchResult.flat()
				};
				return result;
			})()

		}


    } catch (e) {
        if (typeof e?.toString == 'function') {
			ui.log.error(e.toString());
		} else {
			ui.log.error("An error occurred during translation.");
		}
        console.error(e);
    }
	try {
		result.translationText = await this.applyCorrectionTable(result.translationText);
		result.translation = await this.applyCorrectionTable(result.translation);
	
	} catch (e) {
		console.error(e);
	}
	if (typeof this.finalizeTranslation == 'function') {
		result = this.finalizeTranslation(result, text, options);
	}
    if (typeof options.onAfterLoading == 'function') {
        options.onAfterLoading.call(this, result, translatedData);
    }

    return result;
}

/**
 * Translate a translation pairs.
 * Will skip the element that already has translation
 * @param {TranslationPairs} obj - Translation pairs object
 * @returns {TranslationPairs}
 */
TranslatorEngine.prototype.translatePairs = async function(obj={}, options={}) {
	//if (typeof obj !== "object") throw new Error(`Expected object ${typeof obj} given`);
	console.log("%cTranslate from translatiionPairs", "color:green", JSON.stringify(obj, undefined, 2))
	const translationPairs = TranslationPairs.from(obj);
	console.log("TranslationPairs", translationPairs);
	const untranslated = translationPairs.getUntranslated();
	console.log("untranslated", untranslated);
	if (untranslated.length < 1) return translationPairs;

	const translationResult = await this.translate(untranslated, options);

	translationPairs.setTranslation(untranslated, translationResult.translation);
	return translationPairs;
}

/**
 * Translate array of strings by using the current engine.
 * This function should be overrided with the real handler
 * @param {String|String[]} filteredTexts - A string or Array of string the text to be translated by using the current engine. Ideally the input is text filtered by CodeEscape
 * @param {String} [sl] - Source language
 * @param {String} [tl] - Target language
 * @param {CodeEscape} [codeEscape] - Code escape object
 * @param {Object} [options] - Options
 * @returns {String[]} - Translated texts. Must match the index of array of input texts (filteredTexts)
 * @since 5.6.16
 */
TranslatorEngine.prototype.fetchTranslation = async function(filteredTexts=[], sl, tl, codeEscape) {
	return filteredTexts;
}

TranslatorEngine.prototype.save = function() {
	// save options
	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}
	
	thisSys.saveConfig();
}

/**
 * Update a configuration and store it to the system.
 * The value will be saved and remembered when the system is saved.
 * @param {String} key - Key of the key-value pair
 * @param {*} value - Value of the key-value pair 
 */
TranslatorEngine.prototype.update = function(key, value) {
	if (typeof key == 'undefined') return false;
	if (key == '') return false;
	this[key] = value;

	console.log("Update "+key+" with value: "+value);
	
	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}
	
	thisSys.config.translatorEngineOptions = thisSys.config.translatorEngineOptions||{};
	thisSys.config.translatorEngineOptions[this.id] = thisSys.config.translatorEngineOptions[this.id]||{};
	thisSys.config.translatorEngineOptions[this.id][key] = value;
	this.trigger("update", {
		key		:key,
		value	:value
	});

	this.saveDebounced();

}

// Add a debounced version of the save method
TranslatorEngine.prototype.saveDebounced = debounce(function() {
    this.save();
}, 100);

TranslatorEngine.prototype.setOption = TranslatorEngine.prototype.update;

/**
 * Get option from this translator engine.
 * @param {*} key - Key of the object
 * @returns {*} Value of the retreived data
 */
TranslatorEngine.prototype.getOptions = function(key) {
	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}
	
	thisSys.config.translatorEngineOptions = thisSys.config.translatorEngineOptions||{};
	thisSys.config.translatorEngineOptions[this.id] = thisSys.config.translatorEngineOptions[this.id]||this.defaultConfig||{};
	
	if (!key) return thisSys.config.translatorEngineOptions[this.id] ?? this.defaultConfig;
	
	return thisSys.config.translatorEngineOptions[this.id][key] ?? this.defaultConfig?.[key]  ?? this[key] ?? this.optionsForm?.schema?.[key]?.default;
}

/**
 * Get the default value of an option
 * @param {string} key - The key of the option
 * @returns {any} - the default value of the option
 */
TranslatorEngine.prototype.getDefaultOptions = function(key) {
	if (!key)  {
		if (!empty(this.defaultConfig)) {
			console.log("Set via defaultConfig");
			return this.defaultConfig;
		}
		
		const obj = {};
		if (!empty(this.defaultSchema)) {
			console.log("%cGet default from schema", "color:green", JSON.stringify(this.defaultSchema, undefined, 2));

			for (let key in this.defaultSchema) {
				let thisSchema =this.defaultSchema[key]
				obj[key] = thisSchema.default;
			}
			return obj;
		}
		return {}
	}

	return this.defaultConfig?.[key]  ?? this.defaultSchema?.[key]?.default ?? this[key];
}

/**
 * Reset the option to their default values
 * This only affect options set through option form
 * will not re-render option field
 */
TranslatorEngine.prototype.resetOptions = function() {
	var thisSys;
	if (typeof sys !== 'undefined') {
		thisSys = sys;
	} else if (typeof window.opener.sys !== 'undefined') {
		thisSys = window.opener.sys;
	} else {
		thisSys = window.top.sys;
	}

	thisSys.config.translatorEngineOptions[this.id] ||= {}
	const defaultConfig = this.getDefaultOptions() || {};
	console.log("resetOptions() Default options is", JSON.stringify(this.getDefaultOptions(), undefined, 2));
	console.log("resetOptions() Set value is options is", JSON.stringify(thisSys.config.translatorEngineOptions[this.id], undefined, 2));
	thisSys.config.translatorEngineOptions[this.id] = {...thisSys.config.translatorEngineOptions[this.id], ...defaultConfig}
	console.log("resetOptions() merged option is", JSON.stringify(thisSys.config.translatorEngineOptions[this.id], undefined, 2));
	
	this.saveDebounced();
	return thisSys.config.translatorEngineOptions[this.id];
}

TranslatorEngine.prototype.loadOptions = async function() {
	var thisTranslator = this;

	return new Promise((resolve, reject) => {
		try {
			var thisSys;
			if (typeof sys !== 'undefined') {
				thisSys = sys;
			} else if (typeof window.opener.sys !== 'undefined') {
				thisSys = window.opener.sys;
			} else {
				thisSys = window.top.sys;
			}
		} catch (e) {
			return false;
		}
	
	
		thisSys.onReady(function() {
			thisSys.config.translatorEngineOptions = thisSys.config.translatorEngineOptions||{};
			thisSys.config.translatorEngineOptions[thisTranslator.id] = thisSys.config.translatorEngineOptions[thisTranslator.id]||{};
	
			for (var key in thisSys.config.translatorEngineOptions[thisTranslator.id]) {
				thisTranslator[key] = thisSys.config.translatorEngineOptions[thisTranslator.id][key];
			}
			resolve();	
		});
	})
}

/**
 * Set all options at once
 */
TranslatorEngine.prototype.setOptions = function(options) {
	for (let key in options) {
		this.setOption(key, options[key]);
	}
}

/**
 * Check if the required field is set
 * @returns {String[]} - Array of unset required options
 */
TranslatorEngine.prototype.getUnsetRequiredOptions = function() {
	this.optionsForm ||= {};
	this.optionsForm.schema ||= {};
	var result = [];

	const getTitleFromForm = (form, key)=> {
		for (let i in form) {
			if (form[i].key == key) return form[i].title;
			if (form[i].items) {
				const title = getTitleFromForm(form[i].items, key);
				if (title) return title;
			}
		}
	}


	
	for (var key in this.optionsForm.schema) {
		if (!this.optionsForm.schema[key].required) continue;
		const thisSchema = this.optionsForm.schema[key];
		console.log("value set: ", this.getOptions(key));

		if (thisSchema.type == "string") {
			if (typeof this.getOptions(key) !== "undefined" && this.getOptions(key) !== "") continue;
		} else {
			if (typeof this.getOptions(key) !== "undefined") continue;
		}


		console.log("Processing required field: "+key);
		if (this.optionsForm.schema[key].title) {
			result.push({
				key:key,
				title:this.optionsForm.schema[key].title
			});
		} else if (this.optionsForm.form?.length) {
			// get title from the form structure recursively
			result.push({
				key:key,
				title:getTitleFromForm(this.optionsForm.form, key)
			});

		} else {
			result.push({
				key:key,
					title:key
			});
		}
		
	}


	return result;
}

TranslatorEngine.prototype.escapeLineBreak = function(text) {
	// two level linebreak escaping before translation
	if (typeof text == "string") {
		text = str_ireplace($DV.config.lineSeparator, this.lineSubstitute, text);
	} else if (Array.isArray(text)) {
		var newText = [];
		for (var i=0; i<text.length; i++) {
			newText.push(str_ireplace($DV.config.lineSeparator, this.lineSubstitute, text[i]));
		}
		text = newText;
		//text = text.join($DV.config.lineSeparator);
	}
	return text;
}

TranslatorEngine.prototype.restoreLineBreak = function(text) {
	// restore line break to it's original place after translation
	if (typeof text == "string") {
		if (this.lineSubstituteStripExtraSpace) text = str_ireplace(this.lineSubstitute + " ", $DV.config.lineSeparator, text);
		text = str_ireplace(this.lineSubstitute, $DV.config.lineSeparator, text);
	} else if (Array.isArray(text)) {
		var newText = [];
		for (var i=0; i<text.length; i++) {
			if (this.lineSubstituteStripExtraSpace) text[i] = str_ireplace(this.lineSubstitute + " ", $DV.config.lineSeparator, text[i]);
			newText.push(str_ireplace(this.lineSubstitute, $DV.config.lineSeparator, text[i]));
		}
		text = newText;
		//text = text.join($DV.config.lineSeparator);
	}
	return text;	
}

/**
 * Pre process text(s) before sending to translator
 * @param {String|String[]} text - Text or array of text
 * @param {Object} [options] 
 * @returns {Object} Text ready to be sent to tranlator engine
 */
TranslatorEngine.prototype.preProcessText = function(text, options) {

	if (TranslatorEngine.escapeAlgorithms[this.escapeAlgorithm]) {
		console.log("%cGenerating text object:", "color:pink", text, TranslatorEngine.escapeAlgorithms[this.escapeAlgorithm]);

		const tEng = new TranslatorEngine.escapeAlgorithms[this.escapeAlgorithm](text, {...{translatorEngine:this}, ...options});
		tEng.escapeTexts(text);
		return tEng;
	}


	console.warn(`Processing with legacy processor, because we can't find ${this.escapeAlgorithm} translator engine that loaded with the new method.`);

	// before sending to translator
	var thisTranslator = this;

    options = options||{};
	thisTranslator.escapeAlgorithm = thisTranslator.escapeAlgorithm || "agressiveSplitting";
	console.log("%cpreProcessText: ", "color:pink", text);
    // try to load saved configuration
	var savedSL;
	var savedTL;
    try {
        savedSL = trans.getSl();
        savedTL = trans.getTl();
    } catch(e) {
        savedSL = undefined;
        savedTL = undefined;
    }
    options.sl = options.sl||savedSL||'ja';
    options.tl = options.tl||savedTL||'en';
   
	
	var lineSubstitute = thisTranslator.getOptions("lineSubstitute");

	var result = {
		originalText:text
	}
	
	console.log("Escape algorithm : "+thisTranslator.escapeAlgorithm);
	console.log("source language : "+options.sl);


    if (thisTranslator.escapeAlgorithm == 'agressiveSplitting' && options.sl == "ja") {
		result.mode = "agressiveSplitting";
		console.log("processing with escape algorithm : "+result.mode);
		
		let tStrings = [];
		let dict = new TranslationDictionary();
		
        if (typeof text == "string") {
            text = [text]
        } else if (!Array.isArray(text)) {
            console.warn("Invalid text translation requested.", text);
            return text;
        }
       
       
        for (let i = 0; i < text.length; i++) {
            let tString = new TranslationString(text[i]);
            tStrings.push(tString);
            tString.addTranslatables(dict);
        }
       
        let newText = [];
        text = dict.symbols;
        for (let i=0; i<text.length; i++) {
            newText.push(str_ireplace(thisTranslator.delimiter, lineSubstitute, text[i]));
        }
        text = newText;
        text = text.join(thisTranslator.delimiter);
		result.dict = dict;
		result.stringCollection = tStrings;
		
		
		
    } else if (thisTranslator.escapeAlgorithm == 'hexPlaceholder') {
		if (typeof text == "string") {
			text = str_ireplace($DV.config.lineSeparator, lineSubstitute, text);
		}
		
		if (Array.isArray(text)) {
			let newText = [];
			for (let i=0; i<text.length; i++) {
				newText.push(str_ireplace($DV.config.lineSeparator, lineSubstitute, text[i]));
			}
			text = newText;
			text = text.join($DV.config.lineSeparator);
		}		
		
		console.log("processing hexPlaceholder");
		result.sourceText 		= text;
		result.hexPlaceholder 	= new window.HexPlaceholder(text);
		result.text = text 		= result.hexPlaceholder.escape();
		result.textArray 		= result.text.split($DV.config.lineSeparator);
    


    } else if (thisTranslator.escapeAlgorithm == 'meaninglessWord') {
		result.mode = "meaninglessWord";
		console.log("processing with escape algorithm : "+result.mode);
		console.log("original text : ", text);
        if (typeof text == "string") {
            text = str_ireplace(thisTranslator.delimiter, lineSubstitute, text);
        }
       
        if (Array.isArray(text)) {
            var newText = [];
            for (var i=0; i<text.length; i++) {
                newText.push(str_ireplace(thisTranslator.delimiter, lineSubstitute, text[i]));
            }
            text = newText;
            text = text.join(thisTranslator.delimiter);
        }
		text = thisTranslator.escapeCharacter(text);
		console.log("result of escaping codes");
		console.log(text);
		result.textArray = text.split(thisTranslator.delimiter);
		
    } else {
		//do nothing
	}

	// not done yet
	result.text = text||result.originalText||"";
	return result;
}

function generateSampleData(rows, columns) {
    const data = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < columns; j++) {
        row.push(`Row${i + 1}-Col${j + 1}`); // Sample data like "Row1-Col1", "Row1-Col2", etc.
      }
      data.push(row);
    }
    return data;
}


TranslatorEngine.prototype.getCorrectionTable = async function() {
	// get the correction table from the file
	if (this.correctionTableRules && this.correctionTableLastLoaded == this.correctionTableLastGenerated) {
		console.log("%cloading correction table from cache", "color:yellow");
		return this.correctionTableRules || [];
	}
	const correctionTableFile = nwPath.join("data/TLEngine", this.id, "correctionTable.json");
	if (!await common.isFile(correctionTableFile)) return [];
	let jsonContent = await common.fileGetContents(correctionTableFile);
	if (!common.isJSON(jsonContent)) return [];
	jsonContent = JSON.parse(jsonContent);
	if (!Array.isArray(jsonContent)) return [];
	this.correctionTableRules = jsonContent;
	this.correctionTableLastGenerated = this.correctionTableLastLoaded = Date.now();
	return jsonContent;
}

TranslatorEngine.prototype.setCorrectionTable = async function(data) {
	// get the correction table from the file
	if (!Array.isArray(data)) return false;
	if (!data.length) return false;
	const correctionTableFile = nwPath.join("data/TLEngine", this.id, "correctionTable.json");
	await common.mkDir(nwPath.dirname(correctionTableFile));
	await common.filePutContents(correctionTableFile, JSON.stringify(data, undefined, 2));
	this.correctionTableLastLoaded = Date.now();
	return true;
}

TranslatorEngine.prototype.applyCorrectionTable = async function(text) {
	console.log("applyCorrectionTable", text);
	if (!text) return text;
	const correctionTable = await this.getCorrectionTable();
	if (!correctionTable?.length) return text;
	console.log("correctionTable", correctionTable);
	if (typeof text == "string")  {
		const replacer = new TextReplacer(correctionTable);
		return replacer.apply(text);
	}
	if (Array.isArray(text)) {
		const replacer = new TextReplacer(correctionTable);
		return text.map((t)=>replacer.apply(t));
	}
	return text;
}

TranslatorEngine.prototype.editCorrectionTable = async function(options={}) {
    var {showModalDialog} = require("www/js/modalDialog.js");
    const BLS = require("better-localstorage");
    const storage = new BLS("TableEditor");
	let jsonData = await this.getCorrectionTable();
	console.log("jsonData", jsonData);
	//if (!jsonData.length) jsonData = [["", ""]];
    let data = await storage.set("data", {
		grid: {
			colHeaders: ["Search Text", "Replace Text"],
        	data:  jsonData
		},
    });
    await showModalDialog("www/tableEditor.html", undefined, {id:"tableEditor", width:480, height:520});
    console.log("script editor closed");
    data = await storage.get("data");
	console.log("saving data", data);
	if (!data) return false;
	await this.setCorrectionTable(data.grid.data);
    return data;
}

/**
 * List of the Code Escape Algorithms
 */
TranslatorEngine.escapeAlgorithms = {}
/**
 * Register an escape algorithm into the system
 * @param {String} name - The name of the escape algorithm
 * @param {CodeEscape} algorithm - CodeEscape class
 */
TranslatorEngine.addEscapeAlgorithm = function(name, algorithm) {
	TranslatorEngine.escapeAlgorithms[name] = algorithm;
}

/**
 * List of the translator engines
 */
TranslatorEngine.translators = {};

/**
 * Initializing the translator engine
 * @param {Event} e - Event
 * @returns {Boolean} - True on success
 */
TranslatorEngine.prototype.init = async function(e) {
	console.log("initializing translator engine : "+this.id);
	if (this.isInitialized) return true;
	trans.translator = trans.translator||[];
	trans.translator.push(this.id);
	TranslatorEngine.translators[this.id] =  this;
	if (this.optionsForm?.schema) {
		this.defaultSchema = common.clone(this.optionsForm.schema)
	}
	await this.loadOptions();
	console.log("after translator engine initialized");
	this.isInitialized = true;
	this.trigger("init", this);
	TranslatorEngine.resolveState(this.id);
}





// Additional classes
// Contributed by Vellithe

// A part of a sentence, either a line or an important part, a Symbol
class TranslationSymbol {
    constructor (string, translatable) {
        this.originalString = string.trim();
        this.translatable = translatable !== false;
    }
}
 
// A full sentence
class TranslationString {
    constructor (string) {
	
        this.originalString = string;
        this.symbols = [];
		let trimmed = string.trim();
		this.possibleScript = ['"', "'"].includes(trimmed.charAt(0)) && trimmed.charAt(trimmed.length - 1) == trimmed.charAt(0);
       
        // Skip anything that's not japanese
        // Split anything betweeen ()[]""
        // Split on .
        // Maybe keep Full-width as is? They look cool and might carry some special meaning
        let japRegex = new RegExp(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/);
                                  //-------------_____________-------------_____________-------------_____________
                                  // Punctuation   Hiragana     Katakana    Full-width       CJK      CJK Ext. A
         
        let separators = ".!?！？。\\…〚〘〖【《〈｛［〔（『[{(「〛〙〗】》〉｝］〕）』]})」'\"".split("");
        let includables = "!?！？。…".split("");
       
        this.currentSymbol = "";
       
        this.translatable = false;
        for (let i = 0; i < string.length; i++) {
            let cChar = string.charAt(i);
            let isJap = japRegex.test(cChar);
            if (separators.indexOf(cChar) != -1) {
                if (includables.indexOf(cChar) != -1) {
                    this.currentSymbol += cChar;
                    this.createSymbol();
                } else {
                    this.createSymbol();
                    this.currentSymbol = cChar;
                    this.translatable = isJap;
                    this.createSymbol();
                }
                continue;
            }
            if (isJap != this.translatable) {
                this.createSymbol();
                this.translatable = isJap;
            }
            this.currentSymbol += cChar;
        }
        this.createSymbol();
    }
   
    createSymbol () {
        let trimmed = this.currentSymbol.trim();
        this.symbols.push(new TranslationSymbol(this.currentSymbol, this.translatable && trimmed.length > 0));
        this.currentSymbol = "";
        this.translatable = false;
    }
   
    getSymbols () {
        return this.symbols;
    }
   
    getTranslatedString (dict) {
        let text = [];
        for (let i = 0; i < this.symbols.length; i++) {
            let symbol = this.symbols[i];
            if (symbol.translatable) {
				text.push(" ");
                text.push(dict.getTranslation(symbol.originalString));
            } else {
                text.push(symbol.originalString);
            }
        }
        text = text.join("").replace(/\s\s+/g, ' ').trim();
		/*
		if (this.possibleScript) {
					// make sure interior quotes don't break the script
					text = JSON.stringify(text.substr(1, text.length - 2));
		}
		// This is bad. Or rather, it makes sure the string will work later, but if the string had something like "\n" in it, then it'll show up as "\n" later, and we don't want that
		*/
		if (this.possibleScript) {
					// make sure interior quotes don't break the script
					let quoteType = text.charAt(0);
					text = text.substr(1, text.length - 2).trim();
					text = quoteType + text.split(quoteType).join("\\" + quoteType) + quoteType;
		}
		/**! This is good! The inner text is kept as-is, but we still act careful around the quotes **/		
		
		return text;
    }
   
    addTranslatables (dict) {
        for (let i = 0; i < this.symbols.length; i++) {
            dict.addSymbol(this.symbols[i]);
        }
    }
}
 
// A dictionary to hold translation symbols and translate them without translating twice
class TranslationDictionary {
    constructor () {
        this.symbols = [];
        this.translation = [];
    }
   
    addSymbol (symbol) {
        if (symbol.translatable && this.symbols.indexOf(symbol.originalString) == -1) {
            this.symbols.push(symbol.originalString);
            this.translation.push(symbol.originalString);
        }
    }
   
    getTranslatableArray () {
        return this.symbols;
    }
   
    addTranslation (originalString, translation) {
        this.translation[this.symbols.indexOf(originalString)] = translation;
    }
   
    addIndexedTranslation (index, translation) {
        this.translation[index] = translation;
    }
   
    getTranslation (string) {
        let trans = this.translation[this.symbols.indexOf(string)];
        if (trans == undefined || trans == null || trans.length == 0) {
            return string.replace(/(\r\n|\n|\r)/gm, "");
        }
        return trans;
    }
}



/**
 * Handles masking of the portion of text that will be sent to the translation machine.
 * @class
 */
class CodeEscape {
	constructor(texts, options)  {
		this.options = options || {};
		this.translatorEngine = this.options.translatorEngine || {}
		this.lineSeparator = $DV.config.lineSeparator || "\n"

		if (!Array.isArray(texts)) texts = [texts]
		/**
		 * Original texts
		 * @type {String[]}
		 */
		this.originalTexts = texts;

		/**
		 * The current state of the text accross escaping steps
		 * @type {String}
		 */
		this.text = texts.join(this.lineSeparator);

		/**
		 * A string or array of string ready to translate
		 * Undefined by default
		 * @type {String|String[]|undefined}
		 */
		this.toTranslate;

		/**
		 * The initial state of the text
		 * @type {String}
		 */
		this.sourceText = this.text;
		this.placeholders = [];
		this.hexPadding = "0xF";
		this.escaped;
		this.formulas = CodeEscape.getActiveFormulas();
		this.unescapePattern = /0[xX][fF][\dA-Fa-f]{4}/g
		this.onRestore = function(texts) {
			return texts
		};
	}
}

CodeEscape.defaultFormulas = [
//	/\\(\S+)\[.*\]/gi, // standard tag (accept unicode)
//	/\\(\S+)\<.*\>/gi, // Yanfly's Message core tag (accept unicode)
// eslint-disable-next-line
	/(if|en)\([\w \=\[\]\&<\>\|\.\$\_\+\-\*\/\@\!]+\)/g, //MPP_ChoiceEX
	/(\\[a-zA-Z0-9]+\[.*?\])+/gi, // standard tag (alphabet only)
	// eslint-disable-next-line
	/(\\[a-zA-Z0-9]+<.*?\>)+/gi, // Yanfly's Message core tag (alphabet only)
//	/\\([a-zA-Z\{\}\\\$\.\|\!\>\<\^])/g
// eslint-disable-next-line
	/(\\[a-zA-Z\{\}\\\$\.\|\!\><\^])+/g, // standard rpg maker tags
	/(@[0-9]+)+/g, 	//@ command for wolfRpg	
	/%[1-9]+/g,
	function(currentText) { 
		return ["string to escape", "string to escape 2"] 
	},
	JSON.stringify("literal string")
]

CodeEscape.renderedFormulas = [];

CodeEscape.parseStringTemplate = function(value) {
	value = value || sys.config.escaperString;
	if (value.substr(0,1) !== "") value = `[${value}]`;
	try {
		return eval(value)
	} catch (e) {
		console.warn(e);
		throw e.toString();
	}
}

CodeEscape.renderedFormulaToStrings = function(rendered) {
	rendered = rendered || [];
	var result = [];
	for (var i in rendered) {
		if (rendered[i] instanceof RegExp) {
			result.push(rendered[i].toString())
		} else if (typeof rendered[i] == 'function') {
			result.push(rendered[i].toString())
		} else if (typeof rendered[i] == 'string') {
			result.push(JSON.stringify(rendered[i]));
		}
	}

	return result;
}

CodeEscape.joinRenderedFormula = function(rendered) {
	var results = CodeEscape.renderedFormulaToStrings(rendered);
	return results.join(",\n");
}

CodeEscape.resetConfig = async function() {
	sys.config.escaperPatterns = [];
	await sys.saveConfig()
}

CodeEscape.initDefaultPattern = function(force) {
	sys.config.escaperPatterns = [];
	if (!force) if (sys.config.escaperPatterns.length > 0) return;
	for (var i in CodeEscape.defaultFormulas) {
		sys.config.escaperPatterns.push({
			value:CodeEscape.defaultFormulas[i].toString()
		})
	}
	this.renderedFormulas = [];
	return this.getActiveFormulas();
}

CodeEscape.initPattern = function(force) {
	sys.config.escaperPatterns = sys.config.escaperPatterns || [];
	if (!force) if (sys.config.escaperPatterns.length > 0) return;
	for (var i in CodeEscape.defaultFormulas) {
		sys.config.escaperPatterns.push({
			value:CodeEscape.defaultFormulas[i].toString()
		})
	}
}

CodeEscape.renderFunction = function(string) {
	try {
		var func = eval("["+string+"]");
		return func[0];
	} catch (e) {
		console.log("Error rendering function", e);
		return false;
	}
}

CodeEscape.setActiveFormulas = function(formulas) {
	CodeEscape.renderedFormulas = formulas;
	return CodeEscape.renderedFormulas;
}

CodeEscape.getActiveFormulas = function() {
	if (CodeEscape.renderedFormulas.length == 0) {
		sys.config.escaperPatterns = sys.config.escaperPatterns || [];
		for (var i in sys.config.escaperPatterns) {
			//console.log(`handling ${i}`, sys.config.escaperPatterns[i]);
			if (typeof sys.config.escaperPatterns[i] !== "object") continue;
			if (!sys.config.escaperPatterns[i].value) continue;
			var newReg = "";
			try {
				//console.log(sys.config.escaperPatterns[i].value);
				if (common.isRegExp(sys.config.escaperPatterns[i].value)) {
					//console.log("is regex");
					newReg = common.evalRegExpStr(sys.config.escaperPatterns[i].value);
				} else if (common.isStringFunction(sys.config.escaperPatterns[i].value)) {
					//console.log("pattern ", i, "is function");
					newReg = CodeEscape.renderFunction(sys.config.escaperPatterns[i].value);
				} else {
					//console.log("Is string");
					newReg = JSON.parse(sys.config.escaperPatterns[i].value);
				}
			} catch (e){
				console.warn("Trying to render ", sys.config.escaperPatterns[i], e);
			}
			if (newReg) CodeEscape.renderedFormulas.push(newReg);
		}
	}
	return CodeEscape.renderedFormulas;
}

CodeEscape.prototype.generatePlaceholderId = function(number) {
  if (number < 0) {
    number = 0xFFFFFFFF + number + 1;
  }
  var placeholder = number.toString(16).toUpperCase();
 // console.log("generating PlaceholderID ", placeholder, this.hexPadding+placeholder.padStart(3, '0'));
  return this.hexPadding+placeholder.padStart(4, '0');
}

CodeEscape.prototype.getPlaceholder = function(stringKey) {
	var strippedKey = stringKey.substr(this.hexPadding.length);
	var index = parseInt(strippedKey, 16); // key is Hexadecimal
	//console.log("strippedKey is", strippedKey);
	//console.log("index is", index);
	//if (typeof this.placeholders[index] == 'undefined') return stringKey;
	if (typeof this.placeholders[index] == 'undefined') {
		if (/0xF[\dA-F]{4}/g.test(stringKey)) return "0x?" + stringKey.substring(3);
		return stringKey;
	}
	//console.log("Restoring from placeholder : ", stringKey);
	//console.log("placeholder is :", this.placeholders);
	//console.log("parsed index : ", index);
	//console.log("result:", this.placeholders[index]);
	return this.placeholders[index];
}

/**
 * Function to handle each of matched string
 * @param {String} string - Matched string
 * @returns {String} Replacement
 */
CodeEscape.prototype.processMatchRule = function(match) {
	var lastIndex = this.placeholders.push(match)-1;
	return this.generatePlaceholderId(lastIndex);
}

CodeEscape.prototype.escape = function(text) {
	text = text || this.text || "";
	if (this.translatorEngine.getOptions("disableCustomEscape")) {
		console.warn("Custom escape is disabled, skipping escaping");
		this.escaped = text;
		return text;
	}
	//console.log("Formulas : ", this.formulas);
	for (var i=0; i<this.formulas.length; i++) {
		if (!this.formulas[i]) continue;
		
		/**
		 * Function should return a string or Array of strings
		 */
		if (typeof this.formulas[i] == 'function') {
			//console.log(`formula ${i} is a function`);
			var arrayStrings = this.formulas[i].call(this, text);
			//console.log(`result`, arrayStrings);
			if (typeof arrayStrings == 'string') arrayStrings = [arrayStrings];
			if (Array.isArray(arrayStrings) == false) continue;

			for (var x in arrayStrings) {
				text = text.replaceAll(arrayStrings[x], (match) => {
					//var lastIndex = this.placeholders.push(match)-1;
					//return this.generatePlaceholderId(lastIndex);
					return this.processMatchRule(match);
				});				
			}
			continue;
		}
		
		//console.log("replacing....");
		// this sometimes generate error when translator memory is loaded. text become empty array
		text = text.replaceAll(this.formulas[i], (match) => {
			//var lastIndex = this.placeholders.push(match)-1;
			//return this.generatePlaceholderId(lastIndex);
			return this.processMatchRule(match);
		});
	}
	
	this.escaped = text;
	//console.log("%cEscaped text", 'background: #222; color: #bada55');
	//console.log(text);
	return text;
}

CodeEscape.prototype.unescape = function(text) {
	console.log("%cCodeEscape.prototype.unescape()", "color:yellow", text);
	text = text || this.text;
	if (this.translatorEngine.getOptions("disableCustomEscape")) {
		console.warn("Custom escape is disabled, skipping unescaping");
		if (typeof this.onRestore == "function") {
			return this.onRestore(text);
		} else {
			return text;
		}
	}

	var that = this;
	
	var processText = (text)=>{
		// console.log("%ctypeof text", "color:red",  typeof text);
		// text = text+"";
		console.log("%cReplacing text", "color:red",  text);
		console.log("%cUnscape pattern text:", "color:red",  that.unescapePattern);
		// console.log("%cText match", "color:red",  text.match(/0xF[\dA-F]{4}/g));

		text = text.replace(that.unescapePattern, function(match) {
			console.log("%cMatch found!", "color:green", match);
			var restored = that.getPlaceholder.apply(that, arguments) || ""
			// console.log("%cRestored text : ", 'background: #222; color: #bada55', restored);
			if (restored.match(that.unescapePattern)) {
				// recursive value
				return that.restore(restored);
			}
			return restored;
		});
		console.log("%cText after replacement", "color:red",  text);

		if (typeof this.onRestore == "function") {
			return this.onRestore(text);
		} else {
			return text;
		}
	}

	if (Array.isArray(text)) {
		var result = [];
		for (var i in text) {
			result.push(processText(text[i]))
		}
		return result;
	}

	return processText(text);

}

CodeEscape.prototype.escapeTexts = function(text=[], options={}) {
	console.log("%cCodeEscape.prototype.escapeTexts()", "color:yellow", text, options);
	console.log("%cCodeEscape obj : ", "color:yellow", this);
	let engineLineSubstitute = this.translatorEngine.lineSubstitute;
	let delimiter = this.translatorEngine.delimiter || this.lineSeparator;
	if (!this.translatorEngine.alwaysConcatWithDelimiter) delimiter = this.lineSeparator; // Support for old translator engine. to be removed in the future
	// if (typeof text == "string") {
	// 	text = str_ireplace(this.lineSeparator, engineLineSubstitute, text);
	// }
	
	// if (Array.isArray(text)) {
	// 	var newText = [];
	// 	for (var i=0; i<text.length; i++) {
	// 		newText.push(str_ireplace(this.lineSeparator, this.translatorEngine.lineSubstitute, text[i]));
	// 	}
	// 	text = newText;
	// 	// finally join the text with delimiter
	// 	text = text.join(delimiter);
	// } 
	text = this.translatorEngine.escapeLineBreak(text);
	if (Array.isArray(text)) text = text.join(delimiter);

	console.log("%cEscaping text", "color:yellow", text);
	
	this.sourceText 		= text;
	this.hexPlaceholder 	= this
	this.text 				= this.escape(text);
	this.textArray 			= this.text.split(this.lineSeparator);

	return this;
}

/**
 * Restore back the string and send as result
 * @param {String|String[]} translations - The masked translation result
 * @returns {TranslationResult} - Translation result
 */
CodeEscape.prototype.afterTranslation = function(translations) {
	console.log("%c afterTranslation process", "color: yellow", translations);
	let delimiter = this.translatorEngine.delimiter || this.lineSeparator;
	if (!this.translatorEngine.alwaysConcatWithDelimiter) delimiter = this.lineSeparator; // Support for old translator engine. to be removed in the future
	var result = {
        'sourceText'        :this.originalTexts, 
        'translationText'   :translations,
        'source'            :this.texts, 
        'translation'       : []
    };

	const restoredTranslation = this.restore(translations);

	console.log("%cRestored translation", "color: yellow", restoredTranslation);

	if (typeof restoredTranslation == "string") {
		result.translation = restoredTranslation.split(delimiter);
	} else {
		result.translation = restoredTranslation
	}

	if (Array.isArray(result.translation)) {
		// result.translation	= result.translation.map((line) => {
		// 	return line.replaceAll(this.translatorEngine.lineSubstitute, this.lineSeparator);
		// })
		result.translation	= this.translatorEngine.restoreLineBreak(result.translation);
	}
	result.translationText = result.translation.join(this.lineSeparator)

	return result;
}

CodeEscape.prototype.restore = CodeEscape.prototype.unescape;
CodeEscape.prototype.getFilteredText = function() {
	return this.toTranslate || this.text;
}
CodeEscape.prototype.getFilteredTexts = function() {
	return this.textArray;
}

TranslatorEngine.addEscapeAlgorithm("hexPlaceholder", CodeEscape);

window.HexPlaceholder = CodeEscape;

class HexPlaceholderInsensitive extends CodeEscape {
	constructor(texts, options)  {
		super(texts, options);
		this.unescapePattern = /0x[Ff][\dA-F]{4}/g
	}
}
TranslatorEngine.addEscapeAlgorithm("hexPlaceholderInsensitive", HexPlaceholderInsensitive);

// New handler mode
class NoEscapeHandler extends CodeEscape {
	constructor(texts, options)  {
		super(texts, options);
		options = options || {}
		this.texts = texts;
		this.currentPlaceholderId = 0;

		this.escapeTexts = (texts=[], options={})=> {
			console.log("no code escape mode");
			this.inputIsArray = false;
			if (typeof texts == "string") {
				texts = str_ireplace(this.lineSeparator, this.translatorEngine.lineSubstitute, texts);
				this.inputIsArray = false;
				this.text 			= texts
				this.textArray 		= this.text.split(this.lineSeparator);

			} else if (Array.isArray(texts)) {
				let processedTexts = [];
				for (var i=0; i<texts.length; i++) {
					processedTexts.push(str_ireplace(this.lineSeparator, this.translatorEngine.lineSubstitute, texts[i]));
				}

				this.inputIsArray = true;
				this.text 			= processedTexts.join(this.lineSeparator);
				this.textArray 		= processedTexts;
	
			}

			return this;
		}
		this.afterTranslation = (translatedText="")=> {
			console.log("translation done : ");
			console.log(translatedText);

			var translatedArray = [];
			if (Array.isArray(translatedText)) {
				translatedArray = translatedText;
				translatedText = translatedArray.join(this.lineSeparator)
			} else if (typeof translatedText == "string") {
				translatedArray = translatedText.split(this.lineSeparator)
			} else {
				throw new Error("Translation result is not a string or array", translatedText);
			}

			let result = {}
			result.translationText 	= translatedText;
			result.source 			= this.sourceText;
			result.translation 		= translatedArray;
			result.translation		= result.translation.map((line) => {
				return line.replaceAll(this.translatorEngine.lineSubstitute, this.lineSeparator);
			})

			console.log("afterTranslation process", result);
			return result;
		}
		this.unescape = (translatedText)=> {
			return translatedText;
		}
		this.restore = this.unescape;
		
		//legacy
		this.hexPlaceholder = this;
	}
}
TranslatorEngine.addEscapeAlgorithm("none", NoEscapeHandler);




class HTMLCloaking extends CodeEscape {
	constructor(text, options)  {
		super(text, options);
		options = options || {}
		this.text = text;
		this.placeholders = options.placeholders||{};
		this.unescapePattern = /<hr id="([\d]+)">/g;
		this.currentPlaceholderId = 0;
	}
}

HTMLCloaking.prototype.generatePlaceholder = function(match) {
	console.log("generating placeholder", match)
	this.currentPlaceholderId++;
	this.placeholders[this.currentPlaceholderId] = match;
	return this.currentPlaceholderId;
}

HTMLCloaking.prototype.getPlaceholder = function(match, index) {
    var result =  this.placeholders[index]
    delete this.placeholders[index];
    return result;
}

HTMLCloaking.prototype.processMatchRule = function(match) {
	var thisPlaceHolder = this.generatePlaceholder(match);
	return `<hr id="${thisPlaceHolder}">`;
}


TranslatorEngine.addEscapeAlgorithm("HTMLCloaking", HTMLCloaking);
TranslatorEngine.addEscapeAlgorithm("htmlCloaking", HTMLCloaking);


class HTMLCloakingInsensitive extends HTMLCloaking {
	constructor(text, options)  {
		super(text, options);
		this.unescapePattern = /<s*[hH]r\s+id\s*=\s*"(\d+)"\s*>/g;
	}
}
TranslatorEngine.addEscapeAlgorithm("HTMLCloakingInsensitive", HTMLCloakingInsensitive);


class XMLCloaking extends CodeEscape {
	constructor(text, options)  {
		super(text, options);
		options = options || {}
		this.text = text;
		this.placeholders = options.placeholders||{};
		this.unescapePattern = /<hr id="([\d]+)" \/>/g;
		this.currentPlaceholderId = 0;
	}
}

XMLCloaking.prototype.generatePlaceholder = function(match) {
	//console.log("generating placeholder", match)
	this.currentPlaceholderId++;
	this.placeholders[this.currentPlaceholderId] = match;
	return this.currentPlaceholderId;
}

XMLCloaking.prototype.getPlaceholder = function(match, index) {
	console.log("Get placeholder of", match)
    var result =  this.placeholders[index]
    delete this.placeholders[index];
    return result;
}

XMLCloaking.prototype.processMatchRule = function(match) {
	var thisPlaceHolder = this.generatePlaceholder(match);
	return `<hr id="${thisPlaceHolder}" />`;
}

TranslatorEngine.addEscapeAlgorithm("XMLCloaking", XMLCloaking);
TranslatorEngine.addEscapeAlgorithm("xmlCloaking", XMLCloaking);




class SubstituteNumber extends CodeEscape {
	constructor(text, options)  {
		super(text, options);
		options = options || {}
		this.text = text;
		this.placeholders = options.placeholders||{};
		this.placeholderLength = options.placeholderLength || 5;
	}
}

SubstituteNumber.prototype.generatePlaceholder = function() {
	this.placeholderLength = this.placeholderLength || 5;
	var innerLen        = this.placeholderLength-2;
	var result          = '';
	const characters    = '012345678';
	const bounday		= '9';
	var charactersLength = characters.length;
	for ( var i = 0; i < innerLen; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return bounday+result+bounday;
}

SubstituteNumber.prototype.getPlaceholder = function(match) {
    var result =  this.placeholders[match]
    delete this.placeholders[match];
    return result;
}

SubstituteNumber.prototype.getFirstPlaceholder = function() {
    if (empty(this.placeholders)) return "";
    for (var i in this.placeholders) {
        console.log(JSON.stringify(this.placeholders, undefined, 2));
        var result = this.placeholders[i]
        delete this.placeholders[i]
        console.log(JSON.stringify(this.placeholders, undefined, 2));
        console.log("first placeholder:", result);
        return result
    }
    return ""
}

SubstituteNumber.prototype.processMatchRule = function(match) {
	var thisPlaceHolder = this.generatePlaceholder();
	this.placeholders[thisPlaceHolder] = match;
	return thisPlaceHolder;
}

SubstituteNumber.prototype.unescape = function(text) {
    console.log("unescaping", text);
	var processText = (text)=>{
	text = text.replace(/9[0-8]{5}9/g, (match) => {
			var restored = this.getPlaceholder(match)
			if (!restored) return "";
			if (restored.match(/9[0-8]{5}9/g)) {
				// recursive value
				return processText(restored);
			}
			return restored;
		});
		if (typeof this.onRestore == "function") {
			return this.onRestore(text);
		} else {
			return text;
		}
	}
	
	text = processText(text);
	// looking for the rest
	if (Object.keys(this.placeholders).length > 0) {
		console.log("correcting");
		text = text.replaceAll(/9[0-8 .,]+9/g, (match)=>{
			var placeHolder = this.getFirstPlaceholder();
			if (!placeHolder) return match;
			return placeHolder;
		})
	}

	// cleanup the missing parts
	text = text.replaceAll(/[0-9]+/g, (match)=>{
		if (!common.hasNumber(this.text)) return ""; // original text doesn't include any number
		if (match.length <= 2) return match;
		if (match.includes("000")) return match;
		if (match.includes("00")) return match;

		// the number is found on the original text
		if (this.text.indexOf(match) !== -1) return match;

		return ""; // remove
	})
	
	return text
}








$(document).ready(function() {
	sys.onReady(function() {
		window.HexPlaceholder.initPattern();
	});
})
/*
TEST

var hexPlaceholder = new HexPlaceholder(`Hello world\\{\\{
\\some[tag]\\more[tag]here\\d\\{
some text \\test[yoo]
`);
hexPlaceholder.escape()
hexPlaceholder.getPlaceholder('0xFF1');
console.log("Escaped : ")
console.log(hexPlaceholder.escaped);
console.log("restored : ");
console.log(hexPlaceholder.restore( hexPlaceholder.escaped ));


// Test 3
var text = `Hello world\\{\\{
\\some[tag]\\more[tag]here\\d\\{
some text \\test[yoo]
`;
var textObj = trans.chatGPT.preProcessText(text, {});
console.log("Escaped text:", textObj.text)
*/
