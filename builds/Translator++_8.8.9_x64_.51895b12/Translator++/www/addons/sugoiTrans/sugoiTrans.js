var thisAddon = this;
var packageName = thisAddon.package.name;

var thisEngine = new TranslatorEngine({
	id:packageName,
	name:thisAddon.package.title,
	author:"Dreamsavior",
	version:thisAddon.package.version,
	description:thisAddon.package.description,
	batchDelay:1,
	skipReferencePair:true,
	lineDelimiter: "<br>",
	mode: "rowByRow",
	targetUrl:"http://localhost:14366/",
	languages:{
		"en": "English",
		"ja": "Japanese"
	},
	optionsForm:{
		"schema": {
			"lineDelimiter": {
				"type": "string",
				"title": t("Line delimiter"),
				"description": t("Fill in with the characters or phrases that will be escaped by the translator (the original phrase and the translation will always be the same). This will guarantee that the number of lines of the translated text is the same as the number of lines of the original text. \nThere are currently no phrases/characters that Sugoi will escape with a 100% success rate.\nYou can try using &#x3C;br&#x3E; with decent amount of success rate.\nLeave blank if you want to concatenate the lines into a single line."),
				"default":"<br>"
			},
			"targetUrl": {
				"type": "string",
				"title": t("Target URL(s)"),
				"description": t("Translator target URL. You can enter one ore more Sugoi Translator back-end URL. Translator++ will load balance the request across all instance of the services. Separate each entry with a new line."),
				"default":"http://localhost:14366/",
				"required":true,
				"formType":"ace"
			},
			"maxParallelJob": {
				"type": "number",
				"title": t("Max Parallel job"),
				"description": t("Maximum parallel job that run simultaneously."),
				"default":5,
				"required":true
			},
			"sendInBatch": {
				"type": "boolean",
				"title": t("Send requests in batch"),
				"description": t("Send several texts (by Max Parallel job) in array.\nFaster and can cut the execution overhead significantly. You must run the server from server manager to enable this option."),
				"default":true
			},
			"firstLineCommonReference": {
				"type": "boolean",
				"title": t("Check First Line in Common Reference"),
				"description": t("Do not include first line in the payload if the first line is found at Common Reference.\nThis is very useful if the character name is at the first line."),
				"default":false
			},
			"lastLineCommonReference": {
				"type": "boolean",
				"title": t("Check Last Line in Common Reference"),
				"description": t("Do not include last line in the payload if the last line is found at Common Reference.\nThis is very useful if the character name is at the last line."),
				"default":false
			},
			"splitLineMatchOriginal": {
				"type": "boolean",
				"title": t("Automatic splitting"),
				"description": t("Automatically split the translation into the number of lines matching the original. The length of each line will be of a similar size."),
				"default":false
			},
			"escapeAlgorithm": {
				"type": "string",
				"title": t("Code Escaping Algorithm"),
				"description": t("Escaping algorithm for inline code inside dialogues (not yet implemented, please wait for the future updates)"),
				"default":"",
				"required":false,
				"enum": [
					"",
					"hexPlaceholder",
					"agressiveSplitting"
				]
			}
		},
		"form": [
			
			{
				"key": "lineDelimiter",
				"onChange": function (evt) {
					var value = $(evt.target).val();
					thisEngine.update('lineDelimiter', value);
				}
			},
			{
				"key": "targetUrl",
				"type": "textarea",
				"onChange": function (evt) {
					var value = $(evt.target).val();
					var urls = value.replaceAll("\r", "").split("\n");
					var validUrls = [];
					thisEngine.targetUrls = [];
					for (var i in urls) {
						if (!isValidHttpUrl(urls[i])) continue;
						validUrls.push(urls[i]);
						thisEngine.targetUrls.push(urls[i]);
					}
					thisEngine.update("targetUrl", validUrls.join("\n"));
					$(evt.target).val(validUrls.join("\n"));
					thisEngine.servers.init();
					
				},
				"formType":"ace"
			},
			{
				"type": "actions",
				"title" : "Local Server Manager",
				"fieldHtmlClass": "actionButtonSet",
				"items": [
					{
						"type": "button",
						"title": "Open server manager",
						"onClick" : async function() {
							thisEngine.openServerManager();
						}
					}
					
				]
			},
			{
				"key": "maxParallelJob",
				"onChange": function (evt) {
					var value = $(evt.target).val();
					thisEngine.update("maxParallelJob", parseInt(value));
				}
			},
			{
				"key": "sendInBatch",
				"inlinetitle": "Send request in batch",
				"onChange": function (evt) {
					var value = $(evt.target).prop("checked");
					thisEngine.update("sendInBatch", value);
				}
			},
			{
				"key": "firstLineCommonReference",
				"inlinetitle": "Look-up the first line of text in Common Reference",
				"onChange": function (evt) {
					var value = $(evt.target).prop("checked");
					thisEngine.update("firstLineCommonReference", value);
				}
			},
			{
				"key": "lastLineCommonReference",
				"inlinetitle": "Look-up the last line of text in Common Reference",
				"onChange": function (evt) {
					var value = $(evt.target).prop("checked");
					thisEngine.update("lastLineCommonReference", value);
				}
			},
			{
				"key": "splitLineMatchOriginal",
				"inlinetitle": "Split the translation into lines that matched the original's number of line",
				"onChange": function (evt) {
					var value = $(evt.target).prop("checked");
					thisEngine.update("splitLineMatchOriginal", value);
				}
			},
			{
				"key": "escapeAlgorithm",
				"titleMap": {
					"": "Default",
					"hexPlaceholder": "Hex Placeholder",
					"none": "No escaping"
				},
				"onChange": function (evt) {
					var value = $(evt.target).val();
					thisEngine.update("escapeAlgorithm", value);
					
				}
			}		
		]
	}
});

thisEngine.maxParallelJob = thisEngine.maxParallelJob || 5;

class TextFilter extends HexPlaceholder {
	constructor(text) {
		super(text)
		
	}
}

TextFilter.prototype.generatePlaceholderId = function(number) {
	return "<br>";
}

TextFilter.prototype.getPlaceholder = function(stringKey) {
	if (!this.placeHoldersCopy) this.placeHoldersCopy = common.clone(this.placeHolders);
	// get replacement by the order of appearance
	if (Array.isArray(this.placeHoldersCopy) == false) return "";
	if (this.placeHoldersCopy.length == 0) return "";
	return this.placeHoldersCopy.shift();
}

function isValidHttpUrl(string) {
	let url;
	try {
		url = new URL(string);
	} catch (_) {
		return false;  
	}
	
	return url.protocol === "http:" || url.protocol === "https:";
}


thisEngine.localServers = {};
var Servers = function() {
	this.isInitialized = false;
	this.$elm = $('<div></div>');
	this.urls = {}
}
Servers.prototype.on = function(evt, fn) {
	this.$elm.on(evt, fn)
}

Servers.prototype.off = function(evt, fn) {
	this.$elm.off(evt, fn)
}

Servers.prototype.one = function(evt, fn) {
	this.$elm.one(evt, fn)
}

Servers.prototype.trigger = function(evt, param) {
	this.$elm.trigger(evt, param)
}
Servers.prototype.reset = function() {
	this.urls = {}
}
Servers.prototype.init = function() {
	console.log("initializing server list");
	this.reset();
	// building thisEngine.targetUrls
	
	thisEngine.targetUrl = thisEngine.targetUrl || "";
	var urls = thisEngine.targetUrl.replaceAll("\r", "").split("\n");
	thisEngine.targetUrls = [];
	for (var i in urls) {
		if (!isValidHttpUrl(urls[i])) continue;
		thisEngine.targetUrls.push(urls[i]);
		this.urls[thisEngine.targetUrls[i]] = {}
	}
	
	this.isInitialized = true;
	return this.isInitialized;
}

Servers.prototype.getIddle = function() {
	if (empty(this.urls)) return [];
	var result = [];
	console.log("checking any iddle server(s) from the list:", this.urls);
	for (var url in this.urls) {
		if (!this.isIddle(url)) continue;
		result.push(url);
	}
	return result;
}

Servers.prototype.isIddle = function(url) {
	this.urls[url] = this.urls[url] || {};
	if (this.urls[url].isBusy) return false;
	if (this.urls[url].isClosed) return false;
	return true;
}

Servers.prototype.isBusy = function(url) {
	this.urls[url] = this.urls[url] || {};
	if (this.urls[url].isBusy) return true;
	return false;
}

Servers.prototype.setBusy = function(url) {
	this.urls[url] = this.urls[url] || {};
	this.urls[url].isBusy = true;
	this.trigger("busy", url);
}

Servers.prototype.setIddle = function(url) {
	this.urls[url] = this.urls[url] || {};
	this.urls[url].isBusy = false;
	this.trigger("iddle", url);
}


Servers.prototype.isOnline = async function(url) {
	try {
		await fetch(url, {
			method		: 'POST',
			body		: JSON.stringify({content: "", message: "status"}),
			headers		: { 'Content-Type': 'application/json' },
		});
		return true;
	} catch (e) {
		return false;
	}
}

Servers.prototype.getUrl = async function() {
	thisEngine.selectedUrl = thisEngine.selectedUrl || 0;
	if (!thisEngine.targetUrls) {
		thisEngine.targetUrl = thisEngine.targetUrl || "";
		var urls = thisEngine.targetUrl.replaceAll("\r", "").split("\n");
		thisEngine.targetUrls = [];
		for (var i in urls) {
			if (!isValidHttpUrl(urls[i])) continue;
			thisEngine.targetUrls.push(urls[i]);
		}
		thisEngine.selectedUrl = 0;
	}
	
	if (thisEngine.targetUrls.length == 1) return thisEngine.targetUrls[0];
	
	var result = thisEngine.targetUrls[thisEngine.selectedUrl];
	
	if (thisEngine.selectedUrl >= thisEngine.targetUrls.length-1) {
		thisEngine.selectedUrl = 0;
	} else {
		thisEngine.selectedUrl++;
	}
	return result;
}


thisEngine.servers = new Servers()
thisEngine.on("init", ()=>{
	thisEngine.servers.init();
});

thisEngine.getConfigServerManager = function(key) {
	if (empty(this.servManConfig)) this.loadConfig();
	if (typeof key == "undefined") return this.config;
	return this.config[key];
}


thisEngine.openServerManager = function() {
	var path = thisAddon.getPathRelativeToRoot().replaceAll("\\", "/") + "/serverManager.html";
	nw.Window.open(path, {width:440, height:640, id:"sugoiServerManager"}, function(new_win) {
		
	});
}

thisEngine.startServer = async function() {
	// start the server
	var path = thisAddon.getPathRelativeToRoot().replaceAll("\\", "/") + "/serverManager.html?startAll=true";
	nw.Window.open(path, {show:false, show_in_taskbar:false, id:"sugoiServerStarter"}, function(new_win) {
		
	});
}

thisEngine.fetchCommonTranslation = async function(text) {
	if (!text) return "";
	thisEngine.wordCache = thisEngine.wordCache || {};
	if (thisEngine.wordCache[text]) return thisEngine.wordCache[text];
	var result = await thisEngine.fetchTranslation([text]);
	if (empty(result)) return text;
	thisEngine.wordCache[text] = result[0];
	return result[0]
}


thisEngine.runBot = function(filepath, options) {
	
}
/**
 * Fetches translations for an array of texts.
 * @param {Array} texts - Array of string text to be translated.
 */
thisEngine.fetchTranslation = async function(texts) {
	const that = this;
    // Ensure texts is an array
    if (!Array.isArray(texts)) texts = [texts];

    /**
     * Escapes line breaks in the text using the specified line delimiter.
     * @param {string} text - The text to escape.
     * @returns {string} - The escaped text.
     */
    const escape = (text) => {
        if (!thisEngine.lineDelimiter) return text;
        return text.replaceAll(/[\r\n]+/g, thisEngine.lineDelimiter);
    };

    /**
     * Unescapes the text by replacing the line delimiter with actual line breaks.
     * @param {string} text - The text to unescape.
     * @returns {string} - The unescaped text.
     */
    const unescape = (text) => {
        text = text.replaceAll("<unk>", "");
        if (!thisEngine.lineDelimiter) return text;
        text = text.replaceAll(thisEngine.lineDelimiter, "\n");
        if (thisEngine.lineDelimiter === "<br>") {
            text = text.replaceAll("<Br>", "\n");
            text = text.replaceAll("<bl>", "\n");
            text = text.replaceAll("「br>", "\n");
            text = text.replaceAll("<br<", "\n");
            text = text.replaceAll("<br】", "\n");
        }
        return text;
    };

    /**
     * Translates a batch of texts using the specified URL.
     * @param {Array} batchText - Array of texts to translate.
     * @param {string} defaultUrl - The URL to use for translation.
     * @returns {Array} - Array of translated texts.
     */
    const translateNow = async (batchText, defaultUrl) => {
        console.log("Translating", batchText);
		const url = defaultUrl || await thisEngine.servers.getUrl();

        try {
            thisEngine.servers.setBusy(url);

            // Escape algorithm
            const escapeAlg = [];
            const escaped = batchText.map((text, i) => {
                escapeAlg[i] = new SubstituteNumber(text, {translatorEngine: that});
				escapeAlg[i].translatorEngine = that;
				console.log("%c escapeAlg", "color:aqua", escapeAlg[i]);

                return escapeAlg[i].escape();
            });

			console.log("pass here1");
            const result = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({ content: escaped, message: "translate sentences" }),
                headers: { 'Content-Type': 'application/json' },
            });

            thisEngine.servers.setIddle(url);
            const translated = await result.json();

			console.log("pass here2");

            // Restore original text
            return translated.map((text, i) => escapeAlg[i].unescape(text));

        } catch (e) {
            ui.log("An error has occurred when translating with Sugoi Translator:", e.toString());
            ui.log(`Make sure Sugoi Translator server is active and accessible at: ${url}`);
            console.error(e);
            thisEngine.servers.setIddle(url);
            return "";
        }
    };

    /**
     * Checks if a value is numeric.
     * @param {*} num - The value to check.
     * @returns {boolean} - True if the value is numeric, false otherwise.
     */
    const isNumeric = (num) => !isNaN(num);

    /**
     * Finalizes the translated text by unescaping and formatting it.
     * @param {string} text - The translated text.
     * @param {string} original - The original text.
     * @returns {string} - The finalized text.
     */
    const finalizeResult = (text, original) => {
        console.log("finalizeResult", arguments);
        text = unescape(text);

        // Remove trailing dot if the original text doesn't contain one
        if (text.endsWith(".") && !["。", "."].includes(original.slice(-1))) {
            text = text.slice(0, -1);
        }

        // Capitalize first letter
        return common.capitalizeFirstLetter(text);
    };

    /**
     * Processes a batch of texts for translation.
     * @param {Array} texts - Array of texts to translate.
     * @param {string} url - The URL to use for translation.
     * @returns {Array} - Array of translated texts.
     */
    const processJobBatch = async (texts, url) => {
        console.log("Process job in batch", arguments);
        const translatedTexts = [];
        const currentBatch = [];
        const batchIndex = [];

        for (let i = 0; i < texts.length; i++) {
            const text = texts[i].trim();
            if (!text || isNumeric(text) || !common.containJapanese(text)) {
                translatedTexts[i] = finalizeResult(text, text);
            } else {
                const lines = text.replaceAll("\r", "").split("\n");
                let textBody = lines.join("\n");
                let translatedFirstLine = "";
                let translatedLastLine = "";

                if (thisEngine.firstLineCommonReference && lines.length > 1) {
                    const reference = trans.getReference(lines[0]);
                    if (trans.getIndexByKey("Common Reference", lines[0])) {
                        textBody = lines.slice(1).join("\n");
                        translatedFirstLine = (reference || await thisEngine.fetchCommonTranslation(lines[0])) + "\n";
                    }
                }

                if (thisEngine.lastLineCommonReference && lines.length > 1) {
                    const reference = trans.getReference(lines[lines.length - 1]);
                    if (trans.getIndexByKey("Common Reference", lines[lines.length - 1])) {
                        textBody = lines.slice(0, -1).join("\n");
                        translatedLastLine = "\n" + (reference || await thisEngine.fetchCommonTranslation(lines[lines.length - 1]));
                    }
                }

                textBody = trans.translateByReference(escape(textBody));
                currentBatch.push(textBody);
                batchIndex.push({
                    index: i,
                    translatedFirstLine,
                    translatedLastLine,
                });
            }
        }

        if (currentBatch.length > 0) {
            const translated = await translateNow(currentBatch, url);
            batchIndex.forEach((batch, i) => {
                translatedTexts[batch.index] = finalizeResult(
                    batch.translatedFirstLine + translated[i] + batch.translatedLastLine,
                    texts[batch.index]
                );
            });
        }

        return translatedTexts;
    };

    /**
     * Handles translation in batches.
     * @param {Array} parts - Array of text parts to translate.
     * @returns {Array} - Array of translated texts.
     */
    const batchHandler = async (parts = []) => {
        console.log("Number of parts is------", parts.length, parts);
        const result = [];

        thisEngine.servers.off("iddle");
        thisEngine.servers.on("iddle", (e, url) => {
            console.log(url, "is idle!");
        });

        const getUnhandledBatch = () => {
            for (let i = 0; i < parts.length; i++) {
                if (!result[i]) return i;
            }
            return false;
        };

        const urlThread = async (partId, url) => {
            result[partId] = Infinity;
            console.log("urlThread processor", partId, parts[partId], url);
            result[partId] = await processJobBatch(parts[partId], url);
            console.log("One process finished");
            const unhandledBatchId = getUnhandledBatch();
            console.log("Looking for another batch ID:", unhandledBatchId);
            if (typeof unhandledBatchId === "number") return urlThread(unhandledBatchId, url);
        };

        const batch = [];
        const idleServers = thisEngine.servers.getIddle();
        for (let i = 0; i < idleServers.length; i++) {
            if (i >= parts.length) break;
            batch.push(urlThread(i, idleServers[i]));
        }

        await Promise.all(batch);
        return result.flat();
    };

    if (!Array.isArray(texts)) texts = [texts];
    thisEngine.maxParallelJob = thisEngine.maxParallelJob || 5;
    const parts = common.arrayChunk(texts, thisEngine.maxParallelJob);
    let results = [];

    if (thisEngine.getOptions("sendInBatch")) {
        console.log("Sending in batch");
        results = await batchHandler(parts);
    } else {
        console.log("Sending one by one");
        for (let i = 0; i < parts.length; i++) {
            results = results.concat(await processJobBatch(parts[i]));
        }
    }

    return results;
};

/**
 * Splits translations into lines to match the original text.
 * @param {Array} translations - Array of translated texts.
 * @param {Array} originals - Array of original texts.
 * @returns {Array} - Array of translations with matching line breaks.
 */
thisEngine.splitIntoLine = function(translations, originals) {
    console.log("Split into line", arguments);
    if (!Array.isArray(translations) || !Array.isArray(originals)) return translations;
    console.log("Processing");
    return translations.map((translation, i) => {
        const numOfLine = (originals[i] || "").split("\n").length;
        return common.splitIntoLine(translation, numOfLine).join("\n");
    });
};

/**
 * Translates the given text.
 * @param {string} text - The text to translate.
 * @param {Object} options - Translation options.
 * @returns {Promise} - A promise that resolves to the translation result.
 */
thisEngine.translate = async function(text, options) {
    console.log("==================================================");
    console.log("thisEngine.translate: ", text);

    if (thisEngine.isDisabled) return false;
    if (typeof text === 'undefined') return text;

    const thisTranslator = this;
    thisTranslator.escapeAlgorithm = thisTranslator.escapeAlgorithm || "hexPlaceholder";

    options = options || {};
    try {
        options.sl = options.sl || trans.getSl() || 'ja';
        options.tl = options.tl || trans.getTl() || 'en';
    } catch (e) {
        options.sl = options.sl || 'ja';
        options.tl = options.tl || 'en';
    }

    options.onAfterLoading = options.onAfterLoading || function() {};
    options.onError = options.onError || function() {};
    options.always = options.always || function() {};

    let data;
    await common.benchmark(async () => {
        data = await this.fetchTranslation(text, options.sl, options.tl);
    });

    console.log("Translation process is done with the result: ");
    console.log(data);

    const result = {
        sourceText: "",
        translationText: "",
        source: [],
        translation: [],
    };

    result.source = text;
    result.translation = data.map(translation => 
        translation.split(thisTranslator.lineSubstitute).join($DV.config.lineSeparator)
    );

    if (thisEngine.getOptions("splitLineMatchOriginal")) {
        thisEngine.splitIntoLine(result.translation, result.source);
    }

	try {
		result.translationText = await this.applyCorrectionTable(result.translationText);
		result.translation = await this.applyCorrectionTable(result.translation);
	
	} catch (e) {
		console.error(e);
	}
    if (typeof options.onAfterLoading === 'function') {
        options.onAfterLoading.call(thisTranslator, result, data);
    }

    return Promise.resolve(result);
};

	
window.trans[packageName] = thisEngine;

$(document).ready(function() {
	thisEngine.init();
	ui.onReady(function() {
		ui.mainMenu.addChild("tools", {
			label	: "Sugoi Translator Server",
			id		: "sugoiTrans"
		});
		var $localServerManager = ui.mainMenu.addChild("sugoiTrans", {
			label	: "Local server manager",
			id		: "sugoiTrans_serverManager"
		});
		var $startServer = ui.mainMenu.addChild("sugoiTrans", {
			label	: "Start all server",
			id		: "sugoiTrans_startServer"
		});
		
		$localServerManager.on("select", function() {
			thisEngine.openServerManager();
		});
		
		$startServer.on("select", function() {
			thisEngine.startServer();
		});

		ui.mainMenu.addChild("sugoiTrans", {
			label	: "Edit correction table",
			id		: "sugoiTrans_editCorrectionTable"
		}).on("select", function() {
			thisEngine.editCorrectionTable();
		});
		
	});
});