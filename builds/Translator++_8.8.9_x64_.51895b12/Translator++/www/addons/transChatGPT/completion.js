const thisAddon = this;
const thisPath = thisAddon.getPathRelativeToRoot();

moduleAlias.addAliases({
    '@chatGPT': thisPath + "/node_modules"
  })
moduleAlias.addPath(thisPath+'/node_modules');
moduleAlias(thisPath+'/package.json');


var openAI = require('@chatGPT/openai');
thisAddon.openAI = openAI;

//https://platform.openai.com/examples/default-qa


var defaultConfig = {
    model:"gpt-3.5-turbo-instruct",
    maxTokens:512,
    temperature:0.7,
    top_p:1,
    frequencyPenalty:0,
    presencePenalty:0,
    bodyMsgTemplate: "Translate the following sentence from ${LANG_FROM} to ${LANG_TO} with preserving the number of line. Preserve ${NEWLINE_STRING}. ${ESCAPE_ALGORITHM_PROMPT}.\nSource:\n${SOURCE_TEXT}\n\nTranslation:",
    maxConcurrentRequest:5,
    rowLimitPerBatch:1,
    baseUrl:"",
    preserveInvalidReturnedRows:false
}
var thisEngine = new TranslatorEngine({
	id          :"openAITextComplete",
	name        :"OpenAI Text Complete",	
	description :"Automatic translation with OpenAI Text Complete API",
	author      :"Dreamsavior",
	version     :thisAddon.package.version,
	delimiter   :"\n\n",
    mode        : "rowByRow",
    showInterceptWindow:false,
	batchTimeOut:60000,
    batchDelay:5000,
    maxRequestLength : 2000,
    lineSubstitute : '<br>',
    escapeAlgorithm:"HTMLCloaking",
    enableOptionManager:true,
    languages: langTools.getLanguageList(["auto"]),
	optionsForm: {
        "schema": {
            "baseUrl": {
                "type": "string",
                "title": "Target URL",
                "description": "Translator target URL. Leave blank to use the default OpenAI's URL",
                "default": defaultConfig.baseUrl,
                "required": true
            },
            "apiKey": {
                "type": "string",
                "title": "Your OpenAI API Key",
                "description": "You can get OpenAI API Key after registering to the service. https://platform.openai.com/account/api-keys",
                "default": "",
                "required": true
            },
            "model": {
                "type": "string",
                "title": "Model",
                "description": "The pre trained model",
                "default": defaultConfig.model,
                "required": true
            },
            "bodyMsgTemplate": {
                "type": "string",
                "title": "Body Message Template",
                "description": "Template of the body of your message." +
                    "You can include the following variables with JavaScript's Template Literal style <span class='inlineCode'><b>${</b>VARIABLE<b>}</b></span><br>" +
                    "Variables:<br>" +
                    "<ul>" +
                    "<li>LANG_FROM : Source language</li>" +
                    "<li>LANG_TO : Target language</li>" +
                    "<li>SOURCE_TEXT : Source text</li>" +
                    "<li>ESCAPE_ALGORITHM_PROMPT : Pre-defined message of escape algorithm.</li>" +
                    "<li>NEWLINE_STRING : String represents new line (Line substitute).</li>" +
                    "<ul>",
                "default": defaultConfig.bodyMsgTemplate,
                "required": true
            },
            "maxTokens": {
                "type": "number",
                "title": "Maximum Tokens",
                "description": "The maximum number of tokens to generate in the completion.<br>The token count of your prompt plus max_tokens cannot exceed the model's context length. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).",
                "default": defaultConfig.maxTokens,
                "minimum": 1,
                "maximum": 4096,
                "required": true
            },
            "temperature": {
                "type": "number",
                "title": "Temperature",
                "description": "What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. <br>OpenAI generally recommend altering this or top_p but not both.",
                "default": defaultConfig.temperature,
                "minimum": 0,
                "maximum": 2,
                "required": true
            },
            "top_p": {
                "type": "number",
                "title": "Nucleus sampling (top_p)",
                "description": "An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. <br>OpenAI generally recommend altering this or temperature but not both.",
                "default": defaultConfig.top_p,
                "minimum": 0,
                "maximum": 1,
                "required": true
            },
            "frequencyPenalty": {
                "type": "number",
                "title": "Frequency Penalty",
                "description": "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. <br>https://platform.openai.com/docs/api-reference/parameter-details",
                "default": defaultConfig.frequencyPenalty,
                "minimum": -2,
                "maximum": 2,
                "required": true
            },
            "presencePenalty": {
                "type": "number",
                "title": "Presence Penalty",
                "description": "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. <br>https://platform.openai.com/docs/api-reference/parameter-details",
                "default": defaultConfig.presencePenalty,
                "minimum": -2,
                "maximum": 2,
                "required": true
            },
            "batchTimeOut": {
                "type": "number",
                "title": "Batch Timeout",
                "description": "Timeout for each batch in milisecond",
                "default": 60000
            },
            "maxRequestLength": {
                "type": "number",
                "title": "Max Request Length",
                "description": "The maximum length of characters for each translation batch.\nEach translator has a different specs.\nI recommend less than 2000 for WEB front-end translator that uses GET parameter.",
                "default": 2000,
                "attr": {
                    "max": 5000,
                    "min": 20
                }
            },
            "maxConcurrentRequest": {
                "type": "number",
                "title": "Max concurrent requests",
                "description": "How many concurrent requests are allowed to be connected simultaneously. Set it to <b>0</b> to disable this feature.<br />Combine this option with <b>Max row per concurrent request</b> to boost the translation speed.",
                "default": defaultConfig.maxConcurrentRequest,
                "attr": {
                    "max": 50,
                    "min": 0
                }
            },
            "rowLimitPerBatch": {
                "type": "number",
                "title": "Max row per concurrent requests",
                "description": "How many rows are allowed for each concurrent requests. Set it to <b>0</b> to disable this feature.<br />If this option is disabled then no matter how many <b>Max concurrent requests</b> you set, Translator++ will process the request as a single chunk.",
                "default": defaultConfig.rowLimitPerBatch,
                "attr": {
                    "max": 1000,
                    "min": 0
                }
            },
            "preserveInvalidReturnedRows": {
                "type": "boolean",
                "title": "Preserve translations from invalid returned number of rows",
                "description": "Preserve translations from responses that has invalid row counts.<br />If checked, Translator++ will attempt to correct the row count and insert translations into the grid.<br />If unchecked, cells will remain blank.<br />It is recommended to leave this option unchecked for retranslation purposes.",
                "default": defaultConfig.preserveInvalidReturnedRows
            },
            "batchDelay": {
                "type": "integer",
                "title": "Batch delay",
                "description": "Delay between batch (in miliseconds)",
                "default": 5000,
                "required": false
            },
            "escapeAlgorithm": {
                "type": "string",
                "title": "Code Escaping Algorithm",
                "description": "Escaping algorithm for inline code inside dialogues. You may need to change the <b>System Message Template</b> and <b>Body Message Template</b> according to the escape algorighm of your choice.",
                "default": "",
                "required": false,
                "enum": [
                    "",
                    "JSTemplateCloaking",
                    "HTMLCloaking",
                    "HTMLCloakingWrapped",
                    "XMLCloaking",
                    "JSONCloaking",
                    "none"
                ]
            }
        },
    
    
        "form": [
            {
                "type": "warn",
                "value": `<h2>Deprecated</h2>
                The completions API endpoint received its final update in July 2023. We recommend using ChatGPT API instead.
                <br>Completion API has a different interface than the new chat completions endpoint. Instead of the input being a list of messages, the input is a freeform text string called a prompt.
                <br>For more information, please refer to the <a href="https://platform.openai.com/docs/guides/text-generation/completions-api" external>OpenAI's Completions API documentation</a>.`,
            },
            {
                "type": "fieldset",
                "title": "Open-AI Text Completion Setting",
                "items": [{
                        "type": "tabs",
                        "id": "openAICompletionTab",
                        "items": [{
                                "title": "General",
                                "type": "tab",
                                "items": [
                                    {
                                        "key": "baseUrl",
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("baseUrl", value);
                            
                                        }
                                    },
                                    {
                                        "key": "apiKey",
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("apiKey", value);
                            
                                        }
                                    },
                                    {
                                        "key": "model",
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("model", value);
                                        }
                                    },
                                ]
                            },
                            {
                                "title": "Templates",
                                "type": "tab",
                                "items": [
                                    {
                                        "key": "bodyMsgTemplate",
                                        "type": "ace",
                                        "aceMode": "text",
                                        "aceTheme": "twilight",
                                        "width": "100%",
                                        "height": "120px",
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("bodyMsgTemplate", value);
                            
                                        }
                                    },
                                ]
                            },
                            {
                                "title": "Advanced",
                                "type": "tab",
                                "items": [
                                    
                                    {
                                        "key": "maxTokens",
                                        "type": "range",
                                        "step": 1,
                                        "indicator": true,
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("maxTokens", parseInt(value));
                                        }
                                    },
                                    {
                                        "key": "temperature",
                                        "type": "range",
                                        "step": 0.1,
                                        "indicator": true,
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("temperature", parseFloat(value));
                                        }
                                    },
                                    {
                                        "key": "top_p",
                                        "type": "range",
                                        "step": 0.1,
                                        "indicator": true,
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("top_p", parseFloat(value));
                                        }
                                    },
                                    {
                                        "key": "frequencyPenalty",
                                        "type": "range",
                                        "step": 0.1,
                                        "indicator": true,
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("frequencyPenalty", parseFloat(value));
                                        }
                                    },
                                    {
                                        "key": "presencePenalty",
                                        "type": "range",
                                        "step": 0.1,
                                        "indicator": true,
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("presencePenalty", parseFloat(value));
                                        }
                                    },
                                    
                                ]
                            }
                        ]
                    },
                    {
                        "type": "actions",
                        "items": [{
                            "type": "button",
                            "title": "Open chatGPT tester",
                            "onClick": async function() {
                                thisAddon.openTesterWindow();
                            }
                        }]
                    }
    
    
                ]
            },
            {
                "type": "fieldset",
                "title": "Batch Translation Setting",
                "items": [
                    {
                        "key": "batchTimeOut",
                        "onChange": function(evt) {
                            var value = $(evt.target).val();
                            thisEngine.update('batchTimeOut', parseInt(value));
                        }
                    },
                    {
                        "key": "batchDelay",
                        "onChange": function(evt) {
                            if (updater.getUser().level < 100) {
                                ui.alert("Sorry, this addon is only available for active patrons only.\nYou can unlock this feature by becoming a $1 patron.", "options")
                                $(evt.target).val(5000);
                                thisEngine.update('batchDelay', 5000);
                                return;
                            }
                            var value = $(evt.target).val();
                            thisEngine.update('batchDelay', parseInt(value));
                        }
                    },
                    {
                        "key": "maxRequestLength",
                        "onChange": function(evt) {
                            var value = $(evt.target).val();
                            thisEngine.update('maxRequestLength', parseInt(value));
                        }
                    },
                    {
                        "key": "maxConcurrentRequest",
                        "onChange": function(evt) {
                            var value = $(evt.target).val();
                            thisEngine.update('maxConcurrentRequest', parseInt(value));
                        }
                    },
                    {
                        "key": "rowLimitPerBatch",
                        "onChange": function(evt) {
                            var value = $(evt.target).val();
                            thisEngine.update('rowLimitPerBatch', parseInt(value));
                        }
                    },
                    {
                        "key": "preserveInvalidReturnedRows",
                        "inlinetitle": "Preserve invalid returned rows",
                        "onChange": function (evt) {
                            var value = $(evt.target).prop("checked");
                            thisEngine.update('preserveInvalidReturnedRows', value);
                        }
                    },

                ]
            },
            
            {
                "key": "escapeAlgorithm",
                "titleMap": {
                    "JSTemplateCloaking": "JavaScript template cloaking",
                    "none": "None (no escaping)"
                },
                "onChange": function(evt) {
                    var value = $(evt.target).val();
                    thisEngine.update("escapeAlgorithm", value);
    
                }
            }
    
        ]
    }
}, 
    defaultConfig
);

thisEngine.getDummyResponse = async function(texts, sl, tl) {
    // for testing
    return {
        "data" : {
            "id": "cmpl-7RLzwOhnY6QjK62aTrwOhRVrSxpaQ",
            "object": "text_completion",
            "created": 1686753772,
            "model": "gpt-3.5-turbo-instruct",
            "choices": [
              {
                //"text": `<p>Thanks for your hard work, producer! Luminous' solo performance\nthe other day was great. They seems to be in top form...</p>`,
                //text: "\n\n[\n  `Along the way`\n]",
                //"text" : "[\n  `${dat[1]}みなさんと仲良くなりたいです！<br>でも、スッゴく仲良くなりたい人がふたりいます！`,\n  `一番おいしく食べられるってことですよねー！<br>それじゃあ、レアにします。${dat[2]}ふふっ、楽しみ♪`\n]",
                //"text" : '[\n  "${dat[1]}みなさんと仲良くなりたいです！<br>でも、スッゴく仲良くなりたい人がふたりいます！",\n  "一番おいしく食べられるってことですよねー！<br>それじゃあ、レアにします。${dat[2]}ふふっ、楽しみ♪"\n]',
                //"text": "\n\n[\"I want to get along well with everyone!  ¾But there are two people I want to be really close with!\",\"It means I can eat it in the most delicious way, right?  ¾Then let's make it rare. ${dat[2]}Hehe, I'm looking forward to it♪\"]",
                "text": 'What!? Everyone?<hr id="1">Everyone...',
                "index": 0,
                "logprobs": null,
                "finish_reason": "stop"
              }
            ],
            "usage": {
              "prompt_tokens": 112,
              "completion_tokens": 30,
              "total_tokens": 142
            }
          }
    }
}

thisEngine.fetchTranslation = async function(texts, sl, tl) {
    sl = sl || trans.getSl()
    tl = tl || trans.getTl()

    if (!Array.isArray(texts)) texts = [texts];
    this.openAIConfig ||= new openAI.Configuration({
        apiKey: this.getOptions("apiKey"),
        basePath: this.getOptions("baseUrl"),
    });
    this.openAIapi ||= new openAI.OpenAIApi(this.openAIConfig);
    var param = {...thisAddon.templateParameters, ...{
        SOURCE_TEXT:texts.join("\n"),
        ESCAPE_ALGORITHM_PROMPT:thisAddon.getEscapeAlgorithmTemplateString(this.getOptions("escapeAlgorithm")),
        NEWLINE_STRING:this.getOptions("lineSubstitute")
    }}

    console.log("Parameters:", param);

    var bodyTemplate = this.getOptions("bodyMsgTemplate")
    var prompt = thisAddon.compileTemplate(bodyTemplate, param);


    
    const requestBody = {
        model               : this.getOptions("model")||"text-davinci-003",
        prompt              : prompt,
        temperature         : this.getOptions("temperature"),
        max_tokens          : this.getOptions("maxTokens"),
        top_p               : this.getOptions("top_p"),
        frequency_penalty   : this.getOptions("frequencyPenalty"),
        presence_penalty    : this.getOptions("presencePenalty"),
        //stop: ["\n"],
    }
    // if (this.getOptions("escapeAlgorithm") == "JSONCloaking") {
    //     requestBody.response_format = { type: "json_object" }
    // }
    var response = await this.openAIapi.createCompletion(requestBody);
    console.log("chatGPT result:", response)

    var result = response?.data?.choices[0]?.text || "";
    console.log("result text:", result);
    result = common.copyStartingWhiteSpaces(param.SOURCE_TEXT, result);
    console.log("result after copying whitespaces formatting:", result);
    if (result.substring(0, 2) == "\n\n") return result.substring(2);

    //return result;
    return common.copyStartingWhiteSpaces(param.SOURCE_TEXT, result);

}




thisEngine.fetchTranslationCustom = async function(texts, sl, tl) {
    sl = sl || trans.getSl()
    tl = tl || trans.getTl()

    if (!Array.isArray(texts)) texts = [texts];
    this.openAIConfig ||= new openAI.Configuration({
        apiKey: this.getOptions("apiKey"),
        basePath: "http://localhost:4891/v1"
    });
    this.openAIapi ||= new openAI.OpenAIApi(this.openAIConfig);
    var param = {...thisAddon.templateParameters, ...{
        SOURCE_TEXT:texts.join("\n"),
        ESCAPE_ALGORITHM_PROMPT:thisAddon.getEscapeAlgorithmTemplateString(this.getOptions("escapeAlgorithm")),
        NEWLINE_STRING:this.getOptions("lineSubstitute")
    }}

    console.log("Parameters:", param);

    var bodyTemplate = this.getOptions("bodyMsgTemplate")
    var prompt = thisAddon.compileTemplate(bodyTemplate, param);


    
    //var response = await thisEngine.getDummyResponse(texts);

    var response = await this.openAIapi.createCompletion({
        model               : this.getOptions("model")||"text-davinci-003",
        prompt              : prompt,
        temperature         : this.getOptions("temperature"),
        max_tokens          : this.getOptions("maxTokens"),
        top_p               : this.getOptions("top_p"),
        frequency_penalty   : this.getOptions("frequencyPenalty"),
        presence_penalty    : this.getOptions("presencePenalty"),
        stream:false,
        echo:true
        //stop: ["\n"],
    });
    console.log("chatGPT result:", response)

    var result = response?.data?.choices[0]?.text || "";
    console.log("result text:", result);
    result = common.copyStartingWhiteSpaces(param.SOURCE_TEXT, result);
    console.log("result after copying whitespaces formatting:", result);
    if (result.substring(0, 2) == "\n\n") return result.substring(2);

    //return result;
    return common.copyStartingWhiteSpaces(param.SOURCE_TEXT, result);

}



/*
thisEngine.translate = async function(text, options) {
	var thisTranslator = this;
	thisTranslator.escapeAlgorithm = thisTranslator.escapeAlgorithm || "hexPlaceholder";
	
	if (this.isDisabled == true) return false;
	if (typeof text=='undefined') return text;
	var lineSubstitute = this.lineSubstitute;

	
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
	
    var result = {
        'sourceText'        :text, 
        'translationText'   :"",
        'source'            :[], 
        'translation'       :[]
    };
    var data = ""
	
    try {
        console.log("incoming text  : ");
        console.log(text);

        var textObj         = thisTranslator.preProcessText(text, options);
        var filteredText    = textObj.text;
        
        console.warn("textObj", textObj);
        console.log("Filtered text:\n", filteredText);

        data = await this.fetchTranslation(filteredText, options.sl, options.tl);
        result = textObj.afterTranslation(data || "");
        console.log("result", result);


        // data = data || "";
        // console.log("translation done : ");
        // console.log(data);

    
        // // set default value of the result

        // console.log("--restoring text:", data);
        // result.translationText 	= textObj.hexPlaceholder.restore(data);
        // console.log("--restored text:", result.translationText);

        // result.source 			= text;
        // result.translation 		= result.translationText.split($DV.config.lineSeparator);
        // result.translation		= result.translation.map((line) => {
        //     return line.replaceAll(thisTranslator.lineSubstitute, $DV.config.lineSeparator);
        // })


    } catch (e) {
        ui.logError(e.toString())
        console.error(e);
    }
	
    if (typeof options.onAfterLoading == 'function') {
        options.onAfterLoading.call(this, result, data);
    }
    return result;
}
*/




$(document).ready(function() {
	trans.getTranslatorEngine(thisEngine.id).init();
});