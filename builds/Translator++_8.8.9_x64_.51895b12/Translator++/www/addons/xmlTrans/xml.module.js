var path 		= require('path');
//var iconv 		= require('iconv-lite');
var jEncoding 	= require('encoding-japanese');
var common 		= require("www/js/common.js");
const { StringDecoder } = require('string_decoder');

class XmlTrans extends require("www/js/ParserBase.js").ParserFile {
	constructor(file, options, callback) {
		super(file, options, callback);
		this.file 						= file
		this.options 					= options || {};
		this.stringEncoding 			= options.stringEncoding || 'Windows-31j'	// translate from Japanese
		// string encoding to write used in createTextBuffer
		this.writeEncoding 				= options.writeEncoding || '';
		this.writeUseBom				= options.writeUseBom || false;
		this.originalEncoding			= ''; 
		
		this.config 					= this.options.config || []
		this.translationPair 			= this.options.translationPair || {}
		this.translationInfo 			= this.options.translationInfo || {};
		this.options.onParseStart 		= this.options.onParseStart || function(){}
		this.options.onParseEnd 		= this.options.onParseEnd || function(){}
		this.onBeforeRender				= this.options.onBeforeRender || function() {};
		this.onAfterRender				= this.options.onAfterRender || function() {};
		this.getTranslatableElement 	= this.options.getTranslatableElement || function(elm) {return elm}
		this.translateElement 			= this.options.translateElement || this.translateElement;
		this.onBeforeWrite				= this.options.onBeforeWrite || this.onBeforeWrite;
		this.parser 					= this.options.parser || "xml"; // xml | html
		this.currentContext 			= [];
		this.translatableTexts 			= [];
		this.xml						= "";
		this.buffer;
		this.rendered 					= "";
		this.parsed 					= false;
		this.rendered 					= "";
		this.fileName 					= path.basename(file);
	}
}

/**
 * Retrieves an array of all text nodes under a given element.
 *
 * @param { Node } el - The element under which to search for text nodes.
 * @returns { Node[] } An array of text nodes found under the given element.
 */
XmlTrans.prototype.textNodesUnder = function(el, thisConfig) {
	// todo
	console.log("%c textNodesUnder", "color:aqua", el);
	const children = [] // Type: Node[]
	console.log("Creating tree walker of the element", el);
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	var contextIndex = {}
	while(walker.nextNode()) {
		let node = walker.currentNode
		let text = node?.nodeValue?.trim()
		//ignore blank text (there are a lot, since script's indentation are counted as a blank node)
		if (!text) continue;

		let context = XmlTrans.listParentElms($(node.parentNode)) || [];
		context.push(node.parentNode.localName);
		let parentIndex = $(node.parentNode).parent().children().index(node.parentNode)
		if (parentIndex > -1) context.push(parentIndex);
		context.push(node.nodeName);
		
		let contextString = context.join("/")
		contextIndex[contextString] ||= 0;
		context.push(contextIndex[contextString]);
		contextIndex[contextString]++;
		console.log("%c textNodesUnder - context", "color:aqua", context);

		const currentElement = thisConfig.getTranslatableElement(node);
		var options = {
			tags:undefined,
			parameters: undefined,
			cellInfo: undefined,
		}
		const processedText = thisConfig.onBeforeRegisterString.call(this, text, context, currentElement, thisConfig, options);
		if (processedText && typeof processedText == "string") {
			this.registerStringElm.call(this, processedText, context, currentElement, thisConfig, options)
		}
		thisConfig.onAfterRegisterString.call(this, text, context, currentElement, thisConfig, options)
		
		children.push(node);
		// to get / set the value: node.nodeValue
		// console.log("node.nodeValue", node.nodeValue);
		// console.log("after mutation");
		// node.nodeValue = "lorem ipsum";
		// console.log("node.nodeValue", node.nodeValue);

	}
	console.log("%c textNodesUnder- result", "color:aqua", children);
	contextIndex = {};
	return children
}

XmlTrans.prototype.generateTranslation = function() {
	// generate translation and write it into this.translatableTexts
	for (var i=0; i<this.translatableTexts.length; i++) {
		this.addTransData(this.translatableTexts[i]);

		this.translatableTexts[i].translated = this.translate(this.translatableTexts[i].text, this.translatableTexts[i].context);
	}
}
XmlTrans.prototype.onBeforeWrite = function(string) {
	return string;
}

XmlTrans.prototype.write = async function(file, encoding) {

	var data = this.render();
	data = this.onBeforeWrite(data);

	console.log("XmlTrans.write()", file, this);
	await common.filePutContents(file, data, encoding||this.writeEncoding, this.writeUseBom||false);
	return file;

}

XmlTrans.prototype.xmlToString = function(xmlData) { 
    var xmlString;

	xmlString = (new XMLSerializer()).serializeToString(xmlData);

    return xmlString;
}   

XmlTrans.prototype.render = function() {
	if (this.rendered !== "") return this.rendered;
	this.onBeforeRender.call(this);
	
	// translate before render
	for (var i=0; i<this.translatableTexts.length; i++) {
		if (this.translatableTexts[i].text == this.translatableTexts[i].translated) continue;
		this.translatableTexts[i].config.translateElement = this.translatableTexts[i].config.translateElement || this.translateElement;
		this.translatableTexts[i].config.translateElement.call(this, this.translatableTexts[i].elm, this.translatableTexts[i].translated, this.translatableTexts[i].config)
	}
	
	//var content = $("<div></div>").append($(xmlTrans.xml));
	this.onAfterRender.call(this);
	this.rendered = this.xmlToString(this.xml);
	return this.rendered;
}

XmlTrans.prototype.setConfig = function(config) {
	this.config = config;
}

XmlTrans.prototype.contextEnter = function(strings) {
	if (typeof strings == 'string') strings=[strings]
	for (var i=0; i<strings.length; i++) {
		this.currentContext.push(strings[i])
	}
}

XmlTrans.prototype.contextEnd = function() {
	this.currentContext.pop()
}

XmlTrans.prototype.filterText = function(text) {
	return text;
}

XmlTrans.prototype.translateElement = function(elm, text, thisConfig) {
	if (thisConfig?.targetTranslation == "attributes" && thisConfig?.attribute) {
		$(elm).attr(thisConfig.attribute, text);
	} else if (thisConfig?.targetTranslation == "allTextNodes" && elm.length>0) {
		for (let node of elm) {
			if (!node?.constructor?.name == "Text") continue;
			console.log("%c Translating text node", "color:green", node, text);
			node.nodeValue = text;
		}
		return elm
	} else {
		$(elm).text(text)[0];
	}
	return $(elm)[0]
}

XmlTrans.prototype.getText = function(elm, thisConfig) {
	if (thisConfig?.targetTranslation == "attributes" && thisConfig?.attribute) {
		return $(elm).attr(thisConfig.attribute);
	} else if (thisConfig?.targetTranslation == "allTextNodes" || elm?.constructor?.name == "Text") {
		return elm?.nodeValue?.trim()
	} else {
		return $(elm).text();
	}
}

// XmlTrans.prototype.translate = function(text, contexts) {
// 	if (typeof text !== 'string') return text;
// 	if (text.trim() == '') return text;
	
// 	// compare with exact context match
// 	// contexts is two dimensional array
// 	for (var i in contexts) {
// 		var context = contexts[i];
// 		var prefix = context.join("/")
// 		prefix = prefix+"\n";
// 		if (this.translationPair[prefix+text]) return this.translationPair[prefix+text];


// 		// compare with group
// 		var sliceLevel = this.translationInfo.groupLevel || 0;
// 		if (sliceLevel > 0) {
// 			prefix = context.slice(0, sliceLevel).join("/")
// 			prefix = prefix+"\n";
// 			//if (window.monitoringMode) console.log("%cTranslate by group",  'background: #00F; color: #fff', prefix);
// 			if (this.translationPair[prefix+text]) return this.translationPair[prefix+text];
// 		}
// 	}
// 	if (typeof this.translationPair[text] == 'undefined') return text;
	
// 	return this.translationPair[text];
// }

/**
 * 
 * @param {*} string 
 * @param {Text[]|undefined} localContext - If local context is undefined then the context will be skipped
 * @param {*} $elm 
 * @param {*} index 
 */
XmlTrans.prototype.appendString = function(string, localContext, $elm, index) {
	// append data into the already existing string
	index = index || this.translatableTexts.length - 1; // last string
	
	var copyContext = [];
	// skip context if localContext is undefined. This would make it possible to skip registering context altogether.
	if (typeof localContext !== "undefined") {
		copyContext = JSON.parse(JSON.stringify(this.currentContext))
		localContext = localContext||[];
		if (Array.isArray(localContext) == false) localContext = [localContext];
		copyContext = copyContext.concat(localContext);
	}

	var filteredText = this.filterText(string)	
	if (string.trim().length > 0) {
		this.translatableTexts[index] = this.translatableTexts[index] || {
			text:"",
			elm:[],
			context:[]
		};
		this.translatableTexts[index].text += filteredText
		this.translatableTexts[index].elm.push($elm)
		if (copyContext?.length) this.translatableTexts[index].context.push(copyContext)
	}	
}

XmlTrans.prototype.registerStringElm = function(string, localContext, $elm, config, options={}) {
	var copyContext = JSON.parse(JSON.stringify(this.currentContext))
	localContext = localContext||[];
	if (Array.isArray(localContext) == false) localContext = [localContext];
	copyContext = copyContext.concat(localContext);

	var filteredText = this.filterText(string)	
	if (string.trim().length > 0) {
		let obj = {
			text	:filteredText,
			elm		:[$elm], // array, because it is possible to concatenate multiple elements
			context	:copyContext,  // contexts is two dimensional array
			config	:config,
			tags	:options?.tags,
		}
		this.translatableTexts.push(obj);
	}
}

XmlTrans.prototype.detectXMLEncoding = function(buffer) {
    const decoder = new StringDecoder('utf-8');

    // Extract a portion of the buffer to check the header
    const headerBytes = buffer.slice(0, 1000); // Adjust the size as needed

    // Decode the header buffer to a string
    const header = decoder.write(headerBytes);

    // Regular expression to match charset in Content-Type meta tag
    const charsetRegex = /<meta\s+.*?charset\s*=\s*['"]?([a-zA-Z0-9-]+)['"]?/i;

    // Match charset from Content-Type meta tag
    const charsetMatch = header.match(charsetRegex);

    if (charsetMatch && charsetMatch[1]) {
        return charsetMatch[1].toLowerCase();
    }

    // If no charset found in meta tag, attempt to extract from XML or HTML declaration
    const xmlHtmlDeclarationRegex = /<\?xml.*?encoding\s*=\s*['"]?([a-zA-Z0-9-]+)['"]?\?>/i;

    const xmlHtmlDeclarationMatch = header.match(xmlHtmlDeclarationRegex);

    if (xmlHtmlDeclarationMatch && xmlHtmlDeclarationMatch[1]) {
        return xmlHtmlDeclarationMatch[1].toLowerCase();
    }

    return '';
}

XmlTrans.listParentElms = function($elm) {
	const thisParents = $elm.parentsUntil();
	const context = [];

	for (var x=0; x<thisParents.length; x++) {
		var thisIndex = $(thisParents[x]).parent().children().index(thisParents[x])
		if (thisIndex > -1) context.unshift(thisIndex);
		context.unshift(thisParents[x].localName);
	}
	return context;
}

XmlTrans.parseHTML = function(htmlSring) {
	const parser = new DOMParser();
	return parser.parseFromString(htmlSring, 'text/html');
}

XmlTrans.prototype.parse = async function() {
	if (this.parsed) return this;

	const loadFile = async () => {
		return new Promise((resolve, reject) => {
			fs.readFile(this.file, (err, data) => {
				if (err) return reject(err);
				this.buffer = data;
				this.originalEncoding = this.detectXMLEncoding(this.buffer) || jEncoding.detect(this.buffer)
				this.writeEncoding = this.writeEncoding || this.originalEncoding;
				//var dataStr = data.toString();
				//var dataStr = iconv.decode(data, this.stringEncoding);

				//todo: check the header for the character encoding
				var utf8 = Buffer.from(jEncoding.convert(this.buffer, 'UTF8'));
				var dataStr = utf8.toString();
				//console.log(dataStr);
				console.log("%c XMLTrans", "color:aqua;", this);
				if (this.parser == "html") {
					try {
						console.log("parsing html");
						this.xml = XmlTrans.parseHTML(dataStr);
						this.origData = XmlTrans.parseHTML(dataStr);
					} catch (e) {
						console.log("Error parsing HTML", e);
						console.log(dataStr);
						return reject("Error parsing HTML. Please check if your file is a valid HTML file.");
					}
				} else {
					try {
						console.log("parsing xml");
						this.xml = $.parseXML(dataStr);
						this.origData = $.parseXML(dataStr);
					} catch (e) {
						console.log("Error parsing XML", e);
						console.log(dataStr);
						return reject("Error parsing XML. Please check if your file is a valid XML file. You can try to use the less strict HTML parser instead.");
					}

				}

				return resolve(this.xml);
			})

		});
	};
	try {
		this.xml = await loadFile();
	} catch (e) {
		throw e;
	}


	this.config = this.config || [];
	
	for (let index=0; index<this.config.length; index++) {
		var thisConfig = this.config[index];
		// assign default onBeforeRegisterString to return true by default
		thisConfig.onBeforeRegisterString 	= thisConfig.onBeforeRegisterString || function(text) {return text}
		thisConfig.onAfterRegisterString 	= thisConfig.onAfterRegisterString || function(text) {return text}
		thisConfig.getTranslatableElement 	= thisConfig.getTranslatableElement || this.getTranslatableElement;

		//console.log("%c handling config", "color:yellow", thisConfig);
		if (thisConfig.targetTranslation == "allTextNodes") {
			this.textNodesUnder(this.xml, thisConfig);
		} else {
			if (Boolean(thisConfig.queryString) == false) continue;
			if (typeof thisConfig.queryString == 'string') thisConfig.queryString = [thisConfig.queryString]
			
			var $target = $(this.xml);
			for (var i=0; i<thisConfig.queryString.length; i++) {
				$target 	= $target.find(thisConfig.queryString[i]);
			}
			//console.log($target);
			if ($target.length == 0) continue;
			
			//console.log($target);
			for (let i=0; i<$target.length; i++) {
				var $translatableElm = $($target[i])
				
				//var string = $thisString.find("string");
				//console.log($thisString.text())
				//var text = $thisString.text();
				var text = this.getText($translatableElm, thisConfig);
				let context = XmlTrans.listParentElms($translatableElm) || [];
				context.push($translatableElm[0].localName);
				//if (text == "") continue;
				// var thisParents = $thisString.parentsUntil();
				// var context = [];

				// for (var x=0; x<thisParents.length; x++) {
				// 	var thisIndex = $(thisParents[x]).parent().children().index(thisParents[x])
				// 	if (thisIndex > -1) context.unshift(thisIndex);
				// 	context.unshift(thisParents[x].localName);
				// }

				/**
				 * if thisConfig.onBeforeRegisterString returns non empty strings, register the strings;
				 */

				const currentElement = thisConfig.getTranslatableElement($target[i]);
				var options = {
					tags:undefined,
					parameters: undefined,
					cellInfo: undefined,
					// defaultObject: {
					// 	elm: currentElement,
					// 	config:thisConfig
					// }
				}
				const processedText = thisConfig.onBeforeRegisterString.call(this, text, context, currentElement, thisConfig, options);
				if (processedText && typeof processedText == "string") {
					this.registerStringElm.call(this, processedText, context, currentElement, thisConfig, options)
					//string, localContext, parameters, options
					//this.registerString.call(this, processedText, context, {} , options)
				}
				thisConfig.onAfterRegisterString.call(this, text, context, currentElement, thisConfig, options)
				
			}
		}
	}

	await this.generateTranslation();
	this.parsed = true;
	
	return this;


}


module.exports = XmlTrans;