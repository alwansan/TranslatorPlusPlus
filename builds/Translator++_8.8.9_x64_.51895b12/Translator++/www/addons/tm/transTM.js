var thisAddon = this;
var packageName = "transTM";

var thisEngine = new TranslatorEngine({
	id:packageName,
	name:"Translation Memory",
	author:"Dreamsavior",
	version:thisAddon.package.version,
	description:"Translate using Translation Memory.",
	delimiter:"0xEE0FF",
    batchDelay:1,
	skipReferencePair:true,
	ignoreLangCheck:true,
    lineDelimiter: "<br>",
	mode: "rowByRow",
	languages: {
			"bg": "bg",
			"cs": "cs",
			"da": "da",
			"de": "de",
			"el": "el",
			"en-gb": "en-gb",
			"en": "en-us",
			"es": "es",
			"et": "et",
			"fi": "fi",
			"fr": "fr",
			"hu": "hu",
			"it": "it",
			"id": "id",
			"ja": "ja",
			"lt": "lt",
			"lv": "lv",
			"nl": "nl",
			"pl": "pl",
			"pt-br": "pt-br",
			"pt-pt": "pt-pt",
			"ro": "ro",
			"ru": "ru",
			"sk": "sk",
			"sl": "sl",
			"sv": "sv",
			"tr": "tr",
			"uk": "uk",
			"zh": "zh"
	},
	optionsForm:{
		"schema": {
			"showInterceptWindow": {
				"type": "boolean",
				"title": "Interceptor window",
				"description": "Show intercept window.\nYou may need to let the window open to enter the CAPTCHA.",
				"default": false
			},
			"batchDelay": {
				"type": "integer",
				"title": "Batch delay",
				"description": "Delay between batch (in miliseconds)",
				"default": "1",
				"required": false
			}
		},
		"form": [{
				"key": "batchDelay",
				"onChange": function(evt) {
					var value = $(evt.target).val();
					var intValue = parseInt(value);
					if (isNaN(intValue)) {
						alert("Ilegal value " + value);
						intValue = 5000;
						$(evt.target).val(intValue)
					}
					if (intValue < 1) {
						intValue = 1;
						$(evt.target).val(intValue)
					}
	
					thisEngine.update("batchDelay", intValue);
	
				}
			},
			{
				"key": "showInterceptWindow",
				"inlinetitle": "Show interceptor window (default is hidden)",
				"onChange": function(evt) {
					var value = $(evt.target).prop("checked");
					thisEngine.update('showInterceptWindow', value);
				}
			},
		]
	}
});


thisEngine.translate = async function(text, options) {
    if (thisEngine.isDisabled == true) return false;
    if (typeof text=='undefined') return text;

    options = options||{};
    // try to load saved configuration
	var savedSL;
	var savedTL;
    try {
        savedSL = this.getLanguageCode(trans.getSl());
        savedTL = this.getLanguageCode(trans.getTl());
    } catch(e) {
        savedSL = undefined;
        savedTL = undefined;
    }
    options.sl = options.sl||savedSL||'ja';
    options.tl = options.tl||savedTL||'en';
    options.onAfterLoading = options.onAfterLoading||function() {};
    options.onError = options.onError||function() {};
    options.always = options.always||function() {};
 

    var data = await thisAddon.handler.remindMe(text);   
    
    var result = {
        'sourceText':"",
        'translationText':"",
        'source':[],
        'translation':data
    };

    console.log(result);
    if (typeof options.onAfterLoading == 'function') {
        options.onAfterLoading.call(thisEngine, result, data);
    }

	return result;
}

thisEngine.onOptionSelected = function($optionElm, $menu) {
	console.log("onOptionSelected", arguments);
}


window.trans[packageName] = thisEngine;
thisAddon.translatorEngine = thisEngine;
$(document).ready(function() {
	thisEngine.init();
});