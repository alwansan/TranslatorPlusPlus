
class JSTemplateCloaking extends CodeEscape {
	constructor(texts, options)  {
		super(texts, options);
		options = options || {}
		this.texts = texts;
		this.placeholders = options.placeholders||{};
		this.unescapePattern = /\${dat\[(\d+)\]}/g;
		this.currentPlaceholderId = 0;
	}
}

JSTemplateCloaking.prototype.generatePlaceholder = function(match) {
	//console.log("generating placeholder", match)
	this.currentPlaceholderId++;
	this.placeholders[this.currentPlaceholderId] = match;
	return this.currentPlaceholderId;
}

JSTemplateCloaking.prototype.getPlaceholder = function(match, index) {
	console.log("Get placeholder of", match)
    var result =  this.placeholders[index]
    delete this.placeholders[index];
    return result;
}

JSTemplateCloaking.prototype.processMatchRule = function(match) {
	var thisPlaceHolder = this.generatePlaceholder(match);
	return "${dat["+thisPlaceHolder+"]}";
}

JSTemplateCloaking.prototype.restore = function(text) {
	try {
		var that = this;
		var result = function() {
			// trying to fix the problem
			text = text.trim();
			if (text.substr(0, text.length-1) == "`" || text.substr(0, text.length-2) == "`,") {
				text = text+"]";
			}

			var dat = that.placeholders;
			console.log("Eval the text:\n"+ text);
			translation = eval(text);

			if (!translation) return "";
			return translation.join($DV.config.lineSeparator);
		}();
		return result;
	} catch (e) {
		console.warn("Unable to restore text with error:", e)
		ui.logError("Incorrect translation result. A JavaScript array was expected, but the translator generated the wrong format.\nLowering the Max Request Length in the options may fix the problem.", e.toString());
		ui.logError("Received translation: ", text)

		return "";
	}
}

JSTemplateCloaking.prototype.afterTranslation = function(translations) {
	var result = {
        'sourceText'        : "", 
        'translationText'   :this.restore(translations),
        'source'            :this.sourceText, 
        'translation'       : []
    };

	result.translation 		= result.translationText.split(this.lineSeparator);
	result.translation		= result.translation.map((line) => {
		return line.replaceAll(this.translatorEngine.lineSubstitute, this.lineSeparator);
	})

	return result;
}

JSTemplateCloaking.prototype.escapeTexts = function(texts=[], options={}) {
	console.log("PreProcessText with arguments", arguments);
	if (typeof texts == "string") texts = [texts];
		
	var lineSubstituteEscape = String.fromCharCode(0xE000, 190, 0xE001);
	var stringText = ""
	if (Array.isArray(texts)) {
		var newText = [];
		for (var i=0; i<texts.length; i++) {
			texts[i] ||= ""
			console.log("--handling ", texts[i]);
			newText.push(texts[i].replaceAll(this.lineSeparator, lineSubstituteEscape));
		}
		console.log("--newtext ", newText);
		texts = newText;
		stringText = texts.join(this.lineSeparator);
	}
	var pText = (this.escape(stringText)).replaceAll(lineSubstituteEscape, this.translatorEngine.lineSubstitute);
	var nText = JSON.stringify(pText.split(this.lineSeparator), undefined, 2);
	nText = nText.replaceAll("`", "\\`");
	nText = nText.replace(`[\n  "`, "[\n  `");
	nText = nText.replace(`"\n]`, "`\n]");
	nText = nText.replaceAll(`",\n  "`, "`,\n  `");

	this.text = nText;

	return this;
}

TranslatorEngine.addEscapeAlgorithm("JSTemplateCloaking", JSTemplateCloaking);


class JSONCloaking extends CodeEscape {
	constructor(texts, options)  {
		super(texts, options);
		options = options || {}
		this.texts = texts;
		this.placeholders = options.placeholders||{};
		this.unescapePattern = /\${dat\[(\d+)\]}/g;
		this.currentPlaceholderId = 0;
	}
}

JSONCloaking.prototype.generatePlaceholder = function(match) {
	//console.log("generating placeholder", match)
	this.currentPlaceholderId++;
	this.placeholders[this.currentPlaceholderId] = match;
	return this.currentPlaceholderId;
}

JSONCloaking.prototype.getPlaceholder = function(match, index) {
	console.log("Get placeholder of", match)
    var result =  this.placeholders[index]
    delete this.placeholders[index];
    return result;
}

JSONCloaking.prototype.processMatchRule = function(match) {
	var thisPlaceHolder = this.generatePlaceholder(match);
	return "${dat["+thisPlaceHolder+"]}";
}

JSONCloaking.prototype.restore = function(text) {
	try {
		var result = () => {
			// trying to fix the problem
			let textArray
			if (Array.isArray(text)) {
				console.log("result is already an array")
				textArray = text;
			} else {
				text = text.trim();
				textArray = JSON.parse(text);
			}
			// let translations = [];
			// for (var i in textArray) {
			// 	translations.push(this.unescape(textArray[i]));
			// }
			console.log("%cParsed textarray: ", "color:green", textArray);

			let tempArr = [];
			for (let i in textArray) {
				tempArr.push(this.unescape(textArray[i]))
			}
			const translations = tempArr.flat();

			console.log("%cArray of text unescaped: ", "color:green", translations);
			return translations;
		};
		return result();
	} catch (e) {
		console.warn("Unable to restore text with error:", e)
		ui.logError("Bad translation result. A JSON is expected, but ChatGPT generated it wrongly. (Not too smart aren't you, ChatGPT?)\nTry lowering the Max Request Length in the options in the hope that ChatGPT will be able to handle that. :", e.toString());
		ui.logError("Received translation: ", text)
		return "";
	}
}

JSONCloaking.prototype.afterTranslation = function(translations) {
	const restored = this.restore(translations)
	var result = {
        'sourceText'        : "", 
        'translationText'   : restored.join($DV.config.lineSeparator),
        'source'            : this.sourceText,
        'translation'       : restored
    };
	// var lineSubstituteEscape = String.fromCharCode(0xE000, 190, 0xE001);
	//result.translation 		= result.translationText.split(this.lineSeparator);
	// result.translation		= result.translation.map((line) => {
	// 	return line.replaceAll(lineSubstituteEscape, this.lineSeparator);
	// })
	console.log("%cAfter translation: ", "color:green", result);

	return result;
}

/**
 * escapeTexts is entry point for all of the original texts to be escaped
 * @param {String[]} texts - Array of string of the original texts 
 * @param {*} options 
 * @returns 
 */
JSONCloaking.prototype.escapeTexts = function(texts=[], options={}) {
	console.log("PreProcessText with arguments", arguments);
	if (typeof texts == "string") texts = [texts];
		
	//var lineSubstituteEscape = String.fromCharCode(0xE000, 190, 0xE001);
	var stringText = ""
	var textArray = [];
	if (Array.isArray(texts)) {
		for (var i=0; i<texts.length; i++) {
			console.log("--handling ", texts[i]);
			//textArray.push(this.escape(texts[i].replaceAll(this.lineSeparator, lineSubstituteEscape)));
			textArray.push(this.escape(texts[i]));
		}
		console.log("--newtext ", textArray);
		//stringText = texts.join(this.lineSeparator);
	}


	this.toTranslate 	= JSON.stringify(textArray);
	this.text 			= this.toTranslate;
	return this;
}

TranslatorEngine.addEscapeAlgorithm("JSONCloaking", JSONCloaking);


class JSONObjectCloaking extends CodeEscape {
	constructor(texts, options)  {
		super(texts, options);
		options = options || {}
		this.texts = texts;
		this.placeholders = options.placeholders||{};
		this.unescapePattern = /\${dat\[(\d+)\]}/g;
		this.currentPlaceholderId = 0;
	}
}

JSONObjectCloaking.prototype.generatePlaceholder = function(match) {
	this.currentPlaceholderId++;
	this.placeholders[this.currentPlaceholderId] = match;
	return this.currentPlaceholderId;
}

JSONObjectCloaking.prototype.getPlaceholder = function(match, index) {
	console.log("Get placeholder of", match)
    var result =  this.placeholders[index]
    delete this.placeholders[index];
    return result;
}

JSONObjectCloaking.prototype.processMatchRule = function(match) {
	var thisPlaceHolder = this.generatePlaceholder(match);
	return "${dat["+thisPlaceHolder+"]}";
}

JSONObjectCloaking.prototype._parseJsonSafe = function(text) {
	if (typeof text !== "string") return text;
	let s = text.trim();

	// strip fenced code blocks if the model returns them
	if (s.startsWith("```")) {
		// remove first fence line
		s = s.replace(/^```[a-zA-Z0-9_-]*\s*/m, "");
		// remove last fence
		s = s.replace(/```\s*$/m, "");
		s = s.trim();
	}

	try {
		return JSON.parse(s);
	} catch (e) {
		// try extracting the outer-most JSON object
		const start = s.indexOf("{");
		const end = s.lastIndexOf("}");
		if (start >= 0 && end > start) {
			const candidate = s.slice(start, end + 1);
			return JSON.parse(candidate);
		}
		throw e;
	}
}

JSONObjectCloaking.prototype.restore = function(text) {
	try {
		const result = () => {
			let payload;
			if (Array.isArray(text)) {
				console.log("result is already an array")
				payload = text;
			} else {
				payload = this._parseJsonSafe(text);
			}

			let translationMap = payload;
			// handle { translation: {...} } wrapper
			if (payload && typeof payload === "object" && !Array.isArray(payload) && payload.translation) {
				translationMap = payload.translation;
			}

			let ordered = [];
			const expectedLen = Array.isArray(this.texts) ? this.texts.length : undefined;

			if (Array.isArray(translationMap)) {
				// fallback: model returned array instead of object
				ordered = translationMap;
			} else if (translationMap && typeof translationMap === "object") {
				if (typeof expectedLen === "number") {
					for (let i = 0; i < expectedLen; i++) {
						ordered[i] = translationMap[i] ?? translationMap[String(i)] ?? "";
					}
				} else {
					const keys = Object.keys(translationMap)
						.map(k => ({ k, n: Number(k) }))
						.filter(x => Number.isFinite(x.n))
						.sort((a,b) => a.n - b.n);
					for (const {k, n} of keys) {
						ordered[n] = translationMap[k];
					}
				}
			}

			console.log("%cParsed translation map: ", "color:green", translationMap);
			console.log("%cOrdered translations: ", "color:green", ordered);

			let tempArr = [];
			for (let i = 0; i < ordered.length; i++) {
				tempArr.push(this.unescape(ordered[i] || ""))
			}
			return tempArr.flat();
		};
		return result();
	} catch (e) {
		console.warn("Unable to restore text with error:", e)
		ui.logError("Bad translation result. A JSON object is expected, but the translator generated the wrong format.\nTry lowering the Max Request Length in the options in the hope that the model will be able to handle that.", e.toString());
		ui.logError("Received translation: ", text)
		return "";
	}
}

JSONObjectCloaking.prototype.afterTranslation = function(translations) {
	const restored = this.restore(translations)
	var result = {
        'sourceText'        : "", 
        'translationText'   : restored.join($DV.config.lineSeparator),
        'source'            : this.sourceText,
        'translation'       : restored
    };
	console.log("%cAfter translation: ", "color:green", result);
	return result;
}

/**
 * escapeTexts is entry point for all of the original texts to be escaped
 * @param {String[]} texts - Array of string of the original texts 
 * @param {*} options 
 * @returns 
 */
JSONObjectCloaking.prototype.escapeTexts = function(texts=[], options={}) {
	console.log("PreProcessText with arguments", arguments);
	if (typeof texts == "string") texts = [texts];

	var textArray = [];
	if (Array.isArray(texts)) {
		for (var i=0; i<texts.length; i++) {
			console.log("--handling ", texts[i]);
			textArray.push(this.escape(texts[i]));
		}
		console.log("--newtext ", textArray);
	}

	// keep input the same as JSONCloaking: JSON array string
	this.toTranslate 	= JSON.stringify(textArray);
	this.text 			= this.toTranslate;
	return this;
}

TranslatorEngine.addEscapeAlgorithm("JSONObjectCloaking", JSONObjectCloaking);


class HTMLCloakingWrapped extends CodeEscape {
	constructor(texts, options)  {
		super(texts, options);
		options = options || {}
		this.texts = texts;
		this.placeholders = options.placeholders||{};
		this.unescapePattern = /<hr id="([\d]+)">/g;
		this.currentPlaceholderId = 0;
		this.hexPlaceholder = this;

		//this._restore = this.restore;
		this.restore = (text)=> {
			// splitting the p tags into array of texts
			console.log("%cRestoring:", "color:green", text);
			const html = $.parseHTML(text);
			console.log("%cParsed HTML: ", "color:green", html);
			let texts = []
			for (let i = 0; i < html.length; i++) {
				const htmlElement = html[i];
				// must be a <p> tag
				if (htmlElement.tagName != "P") continue;
				texts.push(this.unescape.call(this, htmlElement.innerHTML));
			}
			return texts;
		}
	}
}

HTMLCloakingWrapped.prototype.generatePlaceholder = function(match) {
	console.log("generating placeholder", match)
	this.currentPlaceholderId++;
	this.placeholders[this.currentPlaceholderId] = match;
	return this.currentPlaceholderId;
}

HTMLCloakingWrapped.prototype.getPlaceholder = function(match, index) {
	console.log("Get placeholder of", match)
    var result =  this.placeholders[index]
    delete this.placeholders[index];
    return result;
}

HTMLCloakingWrapped.prototype.processMatchRule = function(match) {
	var thisPlaceHolder = this.generatePlaceholder(match);
	return `<hr id="${thisPlaceHolder}">`;
}

HTMLCloakingWrapped.prototype.escapeTexts = function(texts=[], options={}) {
	console.log("PreProcessText with arguments", arguments);
	if (Array.isArray(texts) == false) texts = [texts]
	
	let wrappedTexts = [];
	for (let i in texts) {
		wrappedTexts.push(`<p>${this.escape(texts[i])}</p>`);
	}

	this.toTranslate 	= wrappedTexts.join("\n");
	this.text 			= this.toTranslate;

	return this;
}

HTMLCloakingWrapped.prototype.afterTranslation = function(translations) {
	var result = {
        'sourceText'        :this.texts, 
        'translationText'   :"",
        'source'            :this.texts, 
        'translation'       :this.restore(translations)
    };


	return result;
}

TranslatorEngine.addEscapeAlgorithm("HTMLCloakingWrapped", HTMLCloakingWrapped);