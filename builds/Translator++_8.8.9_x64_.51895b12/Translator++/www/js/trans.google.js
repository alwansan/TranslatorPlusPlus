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
var trans = trans || {};
trans.google = new TranslatorEngine({
	id:"google",
	name:"Google",
	description:"Translate using Google Translate's public service.",
	author:"Dreamsavior",
	version:"1.0",
	isInitialized: false,
	isDisabled:false,
	columnIndex:2,
	columnHeader: "Google",
	maxRequestLength : 5000,
	fileListLoaded: false,
	indexIsBuilt: false,
	skipTranslated:false,
	batchDelay:5000,
	targetUrl:"https://translate.google.com/translate_a/single",
	skipTranslatedOnBatch :true, // skip lines that already translated when doing TRANSLATE ALL
	lineSubstitute : '§', //¶
	languages : {
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
})

/*
"https://translate.googleapis.com/translate_a/single?client=gtx&sl=" 
+ sourceLang + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(sourceText);
*/
trans.google.onResponse = function(e) {
	console.log(e);
}



trans.google.translate = function(text, options) {
	var thisTranslator = this;
	thisTranslator.escapeAlgorithm = thisTranslator.escapeAlgorithm || "hexPlaceholder";
	
	if (trans.google.isDisabled == true) return false;
	if (typeof text=='undefined') return text;
	
	var lineSubstitute = trans.google.lineSubstitute;
	if (typeof text == "string") {
		text = str_ireplace($DV.config.lineSeparator, lineSubstitute, text);
	}
	
	if (Array.isArray(text)) {
		var newText = [];
		for (var i=0; i<text.length; i++) {
			newText.push(str_ireplace($DV.config.lineSeparator, lineSubstitute, text[i]));
		}
		text = newText;
		text = text.join($DV.config.lineSeparator);
	}
	
	options = options||{};
	// try to load saved configuration 
	try {
		var savedSL = this.getLanguageCode(trans.getSl());
		var savedTL = this.getLanguageCode(trans.getTl());
	} catch(e) {
		var savedSL = undefined;
		var savedTL = undefined;
	}
	options.sl = options.sl||savedSL||'ja';
	options.tl = options.tl||savedTL||'en';
	options.onAfterLoading = options.onAfterLoading||function() {};
	options.onError = options.onError||function() {};
	options.always = options.always||function() {};
	
	
	
	console.log("incoming text  : ");
	console.log(text);

	var textObj = thisTranslator.preProcessText(text, options);
	var filteredText = textObj.text;

	
	trans.google.isTranslating = true;
	$.ajax({
		method: "POST",
		url: "https://translate.google.com/translate_a/single",
		data: {
			client:'gtx',
			sl:options.sl,
			tl:options.tl,
			dt:'t',
			q:filteredText
		}
	})
	.done(function(data) {
		console.log("translation done : ");
		console.log(data);
		/*
		console.log(data[0][0][0]);
		console.log(fixTranslationFormatting(data[0][0][0]));
		console.log(unescapeCharacter(data[0][0][0]));
		*/
		
		var result = {
			'sourceText':"", 
			'translationText':"",
			'source':[], 
			'translation':[]
		};
		for (var i=0; i<data[0].length; i++) {
			result.sourceText += data[0][i][1];
			result.translationText += data[0][i][0];
		}
		
		if (thisTranslator.escapeAlgorithm == "hexPlaceholder") {
			result.translationText 	= textObj.hexPlaceholder.restore(result.translationText);
			result.source 			= result.sourceText.split($DV.config.lineSeparator);
			result.translation 		= result.translationText.split($DV.config.lineSeparator);
			
		} else if (thisTranslator.escapeAlgorithm == "meaninglessWord") {
			result.translationText = trans.google.fixTranslationFormatting(result.translationText);
			result.translationText = trans.google.unescapeCharacter(result.translationText);
			result.source = result.sourceText.split($DV.config.lineSeparator);
			result.translation = result.translationText.split($DV.config.lineSeparator);
			// restore escaped line from original text
			
			var tempArray = [];
			for (var i=0; i<result.source.length; i++) {
				tempArray.push(str_ireplace(lineSubstitute, $DV.config.lineSeparator, result.source[i]))
			}
			result.source = tempArray;
			
			var tempArray = [];
			for (var i=0; i<result.translation.length; i++) {
				tempArray.push(str_ireplace(lineSubstitute, $DV.config.lineSeparator, result.translation[i]))
			}
			result.translation = tempArray;
		}
		
		console.log(result);
		if (typeof options.onAfterLoading == 'function') {
			options.onAfterLoading.call(trans.google, result, data);
		}
		
		trans.google.isTranslating = false;
	})
	.always(function() {
		trans.google.isTranslating = false;
	})
	.error(function(evt, type, errorType) {
		console.log(arguments);
		trans.google.isTranslating = false;
		console.log("error translating text");
		if (typeof options.onError == 'function') {
			options.onError.call(trans.google, evt, type, errorType);
		}
	})	
	
}

trans.google.test = function(text, options) {
	if (trans.google.isDisabled == true) return false;
	if (typeof text=='undefined') return text;
	
	var lineSubstitute = "<br />";
	if (typeof text == "string") {
		text = str_ireplace($DV.config.lineSeparator, lineSubstitute, text);
	}
	
	if (Array.isArray(text)) {
		var newText = [];
		for (var i=0; i<text.length; i++) {
			newText.push(str_ireplace($DV.config.lineSeparator, lineSubstitute, text[i]));
		}
		text = newText;
		text = text.join($DV.config.lineSeparator);
	}
	
	options = options||{};
	options.sl = options.sl||'ja';
	options.tl = options.tl||'en';
	options.onAfterLoading = options.onAfterLoading||function() {};
	


	// ============================================================
	/*REGEX FOR escape and unescape 
	Name :
	"\\N[900]".replace(/\\(.)\[(\d+)\]/, "Nely$2*");
	"Nely900*".replace(/(Nely)\s*(\d+)\s*(\*)/, "\\N[$2]");

	===============================================================
	*/
	var num2Str = function(num) {
		var n=["o", "i", "u", "e", "a", "x", "y", "z", "v", "l"];
		var ls = num+"".split("");
		var result = "";
		for (var i=0; i<ls.length; i++) {
			result += n[ls[i]];
		}
		return result;
	}
	var str2Num = function(num) {
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

	var restorer = function() {
		var filler = "exy";
		var separator = "q";
		//console.log(arguments);
		/*
		if (str2Num(arguments[4]) == false) {
			return arguments[0];
		}
		*/
		return "\\"+arguments[2]+"["+str2Num(arguments[4])+"]";
		//return arguments[1]+filler+separator+num2Str(arguments[2])+separator;
	}

	var replacer = function(match, p1, p2, p3, offset, string) {
		var filler = "exy";
		var separator = "q";
		return "Q"+arguments[1]+filler+separator+num2Str(arguments[2])+separator;
	}

	var restorerS = function() {
		var filler = "exz";
		var separator = "q";
		//console.log(arguments);
		return "\\"+arguments[2]+"<"+arguments[4]+">";
		//return arguments[1]+filler+separator+num2Str(arguments[2])+separator;
	}

	var replacerS = function(match, p1, p2, p3, offset, string) {
		var filler = "exz";
		var separator = "q";

		//console.log(arguments);
		return "Q"+arguments[1]+filler+separator+arguments[2]+separator;
	}
	
	/*
	var unescapeCharacter = function(sentence) {
		//str_ireplace(" \\"+"[n]", "\n", sentence);
		//console.log("\n\nunescaping character : \nSource: "+sentence);
		//sentence = str_ireplace( $DV.config.lineBreakSubstitute, "\n", sentence);
		
		if ($DV.config.substituteMarkup == true) {
			//sentence = sentence.replace(/(.)(ely)\s*(\d+)\s*(\*)/g, "\\$1[$3]");
			sentence = sentence.replace(/(Q)(\w+)(exyq)(\w+)(q)/g, restorer);
			// yanfly
			sentence = sentence.replace(/(Q)(\w+)(exzq)(\w+)(q)/g, restorerS);
		}
		
		if ($DV.config.keepContext == false) {
			sentence = sentence.substring(1, sentence.length-1);
		}
		
		return sentence;
	}
	*/
	var unescapeCharacter = function(sentence) {
		sentence = sentence||"";
		sentence.replace(/<hr\s*sub\=\'(.*?)\'\s*id\=\'(.*?)\'\s*\/>/g, "\\$1[$2]");
		
		return sentence;
	}	
	/*
	var escapeCharacter = function(sentence) {
		//sentence = sentence.replace(/\r?\n/g, " \\"+"[n] ");
		//sentence = sentence.replace(/\r?\n/g, $DV.config.lineBreakSubstitute);
		//sentence = sentence.replace(/'/g, "\\'");
		if ($DV.config.substituteMarkup == true) {
			//sentence = sentence.replace(/\\(.)\[(\d+)\]/g, "$1ely$2*");
			sentence = sentence.replace(/\\(\w+)\[(\d+)\]/g, replacer);
			//yanfly's \xyz<text> format
			sentence = sentence.replace(/\\(\w+)\<(\w+)\>/g, replacerS);
		}
		
		if ($DV.config.keepContext == false) {
			sentence = "'"+sentence+"'";
		}
		return sentence;
	}
	*/
	var escapeCharacter = function(sentence) {
		sentence = sentence||"";
		sentence.replace(/\\\s*(\w+)\s*\[\s*(.*?)\s*\]/g, "<hr sub='$1' id='$2' />");
		
		return sentence;
	}
	var fixTranslationFormatting = function(string) {
		//string = string.replace(/\s+(?=[^\\\]]*\])/g, "");
		//string = string.replace(/\\\s*(\w+)\s*\[\s*(\w+)\s*\]/g, "\\$1[$2]");
		//string = string.replace(/\\\s*(\w+)\s*\<\s*(\w+)\s*\>/g, "\\$1[$2]");
		string = string.replace(/\\\s*(\w+)\s*\[\s*(.*?)\s*\]/g, "\\$1[$2]");
		string = string.replace(/\\\s*(\w+)\s*\<\s*(.*?)\s*\>/g, "\\$1[$2]");
		
		string = string.replace(/\\\s*(\w+)/, "\\$1");
		string = string.replace(/\\\s*([\{\}\\\$\.\|\!\>\<\^])/, "\\$1")	
		
		// replacing pattern % 1
		string = string.replace(/\%\s*(\d+)/g, "%$1");

		//string = str_ireplace("\\\\ ", "\\\\`", string);
		//string = str_ireplace("\\ ", "\\", string);
		//string = str_ireplace("\\\\`", "\\\\ ", string);

		return string;
	}	

	
	console.log("Translating : ");
	console.log(escapeCharacter(text));
	trans.google.isTranslating = true;
	$.ajax({
		method: "POST",
		url: "http://dreamsavior.net/testGoogle.php",
		data: {
			client:'gtx',
			sl:options.sl,
			tl:options.tl,
			dt:'t',
			q:escapeCharacter(text)
		}
	})
	.done(function(data) {
		console.log("translating done : ");
		console.log(data);
		/*
		console.log(data[0][0][0]);
		console.log(fixTranslationFormatting(data[0][0][0]));
		console.log(unescapeCharacter(data[0][0][0]));
		*/
		
		var result = {
			'sourceText':"", 
			'translationText':"",
			'source':[], 
			'translation':[]
		};
		for (var i=0; i<data[0].length; i++) {
			result.sourceText += data[0][i][1];
			result.translationText += data[0][i][0];
		}
		result.translationText = fixTranslationFormatting(result.translationText);
		result.translationText = unescapeCharacter(result.translationText);
		result.source = result.sourceText.split($DV.config.lineSeparator);
		result.translation = result.translationText.split($DV.config.lineSeparator);
		// restore escaped line from original text
		var tempArray = [];
		for (var i=0; i<result.source.length; i++) {
			tempArray.push(str_ireplace(lineSubstitute, $DV.config.lineSeparator, result.source[i]))
		}
		result.source = tempArray;
		
		var tempArray = [];
		for (var i=0; i<result.translation.length; i++) {
			tempArray.push(str_ireplace(lineSubstitute, $DV.config.lineSeparator, result.translation[i]))
		}
		result.translation = tempArray;
		
		console.log(result);
		if (typeof options.onAfterLoading == 'function') {
			options.onAfterLoading.call(trans.google, result, data);
		}
		
		trans.google.isTranslating = true;
	})
	.always(function() {
		trans.google.isTranslating = false;
	})
	.error(function() {
		trans.google.isTranslating = false;
		console.log("error translating text");
		if (typeof options.onError == 'function') options.onError.call(trans);
		
	})	
	
}


/*
trans.google.init = function(e) {
	if (trans.google.isInitialized) return true;
	
	trans.translator = trans.translator||[];
	trans.translator.push("google");
	//var $template = $('<iframe src="translator/google/miniProxy.php?https://translate.google.com/#ja/en/" class="translator google"></iframe>');
	//$("body").append($template);
	trans.google.isInitialized = true;
}
*/

$(document).ready(function() {
	trans.google.init();
});