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
trans.googleTest = {
	id:"googleTest",
	name:"Google Test",
	isInitialized: false,
	isDisabled:false,
	columnIndex:2,
	columnHeader: "Google Test",
	maxRequestLength : 5000,
	fileListLoaded: false,
	indexIsBuilt: false,
	skipTranslated:false,
	batchDelay:5000,
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
	
}

/*
"https://translate.googleapis.com/translate_a/single?client=gtx&sl=" 
+ sourceLang + "&tl=" + targetLang + "&dt=t&q=" + encodeURI(sourceText);
*/
trans.googleTest.onResponse = function(e) {
	console.log(e);
}

/*
trans.googleTest.unescapeCharacter = function(sentence) {
	sentence = sentence||"";
	sentence = sentence.replace(/<hr\s*sub\s*\=\s*\'(.*?)\'\s*id\s*\=\s*\'(.*?)\'\s*\/>/gi, "\\$1[$2]");
	
	return sentence;
}	
trans.googleTest.escapeCharacter = function(sentence) {
	sentence = sentence||"";
	sentence = sentence.replace(/\\\s*(\w+)\s*\[\s*(.*?)\s*\]/gi, "<hr sub='$1' id='$2' />");
	
	return sentence;
}


trans.googleTest.unescapeCharacter = function(sentence) {
	sentence = sentence||"";
	sentence = sentence.replace(/<\s*(.*?)\s*id\s*=\s*'(.*?)'\s*\/\s*>/gi, "\\$1[$2]");
	
	return sentence;
}	
trans.googleTest.escapeCharacter = function(sentence) {
	sentence = sentence||"";
	sentence = sentence.replace(/\\\s*(\w+)\s*\[\s*(.*?)\s*\]/gi, "<$1 id='$2' />");
	
	return sentence;
}
*/

trans.googleTest.num2Str = function(num) {
	var n=["o", "i", "u", "e", "a", "x", "y", "z", "v", "l"];
	var ls = num+"".split("");
	var result = "";
	for (var i=0; i<ls.length; i++) {
		result += n[ls[i]];
	}
	return result;
}
trans.googleTest.str2Num = function(num) {
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

trans.googleTest.restorer = function() {
	var filler = "exy";
	var separator = "q";
	//console.log(arguments);
	/*
	if (str2Num(arguments[4]) == false) {
		return arguments[0];
	}
	*/
	var incomingBuffer = arguments[0].split('Q');
	if (incomingBuffer.length > 2) {
		var result = "";
		for (var i=1; i<incomingBuffer.length; i++) {
			result += trans.googleTest.unescapeCharacter("Q"+incomingBuffer[i]);
		}
		return result;
	}
	return "\\"+arguments[2]+"["+trans.googleTest.str2Num(arguments[4])+"]";
	//return arguments[1]+filler+separator+num2Str(arguments[2])+separator;
}

trans.googleTest.replacer = function(match, p1, p2, p3, offset, string) {
	var filler = "exy";
	var separator = "q";
	return "Q"+arguments[1]+filler+"d"+trans.googleTest.num2Str(arguments[2])+"f";
}

trans.googleTest.restorerS = function() {
	var filler = "exz";
	var separator = "q";
	//console.log(arguments);
	var incomingBuffer = arguments[0].split('Q');
	if (incomingBuffer.length > 2) {
		var result = "";
		for (var i=1; i<incomingBuffer.length; i++) {
			result += trans.googleTest.unescapeCharacter("Q"+incomingBuffer[i]);
		}
		return result;
	}		
	return "\\"+arguments[2]+"<"+arguments[4]+">";
	//return arguments[1]+filler+separator+num2Str(arguments[2])+separator;
}

trans.googleTest.replacerS = function(match, p1, p2, p3, offset, string) {
	var filler = "exz";
	var separator = "q";

	//console.log(arguments);
	return "Q"+arguments[1]+filler+"d"+arguments[2]+"f";
}


trans.googleTest.unescapeCharacter = function(sentence) {
	if (!sentence) return "";
		//sentence = sentence.replace(/(.)(ely)\s*(\d+)\s*(\*)/g, "\\$1[$3]");
		sentence = sentence.replace(/(Q)(\w+)(exyd)(\w+)(f)/g, trans.googleTest.restorer);
		// yanfly
		sentence = sentence.replace(/(Q)(\w+)(exzd)(\w+)(f)/g, trans.googleTest.restorerS);
	
	return sentence;
}

trans.googleTest.escapeCharacter = function(sentence) {
	if (!sentence) return "";
		//sentence = sentence.replace(/\\(.)\[(\d+)\]/g, "$1ely$2*");
		sentence = sentence.replace(/\\(\w+)\[(\d+)\]/g, trans.googleTest.replacer);
		//yanfly's \xyz<text> format
		sentence = sentence.replace(/\\(\w+)\<(\w+)\>/g, trans.googleTest.replacerS);
	return sentence;
}



trans.googleTest.translate = function(text, options) {
	if (trans.googleTest.isDisabled == true) return false;
	if (typeof text=='undefined') return text;
	
	var lineSubstitute = trans.googleTest.lineSubstitute;
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
		var savedSL = trans.project.options.sl;
		var savedTL = trans.project.options.tl;
	} catch(e) {
		var savedSL = undefined;
		var savedTL = undefined;
	}
	options.sl = options.sl||savedSL||'ja';
	options.tl = options.tl||savedTL||'en';
	options.onAfterLoading = options.onAfterLoading||function() {};
	options.onError = options.onError||function() {};
	options.always = options.always||function() {};


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


	
	
	
	console.log("incoming text  : ");
	console.log(text);
	
	
	trans.googleTest.isTranslating = true;
	$.ajax({
		method: "POST",
		url: "http://dreamsavior.net/echo.php",
		data: {
			client:'gtx',
			sl:options.sl,
			tl:options.tl,
			dt:'t',
			q:trans.googleTest.escapeCharacter(text)
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
		result.translationText = trans.googleTest.unescapeCharacter(result.translationText);
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
			options.onAfterLoading.call(trans.googleTest, result, data);
		}
		
		trans.googleTest.isTranslating = false;
	})
	.always(function() {
		trans.googleTest.isTranslating = false;
	})
	.error(function(evt, type, errorType) {
		console.log(arguments);
		trans.googleTest.isTranslating = false;
		console.log("error translating text");
		if (typeof options.onError == 'function') {
			options.onError.call(trans.googleTest, evt, type, errorType);
		}
	})	
	
}

trans.googleTest.init = function(e) {
	if (trans.googleTest.isInitialized) return true;
	
	trans.translator = trans.translator||[];
	trans.translator.push(trans.googleTest.id);
	//var $template = $('<iframe src="translator/google/miniProxy.php?https://translate.google.com/#ja/en/" class="translator google"></iframe>');
	//$("body").append($template);
	trans.googleTest.isInitialized = true;
}

$(document).ready(function() {
	trans.googleTest.init();
});