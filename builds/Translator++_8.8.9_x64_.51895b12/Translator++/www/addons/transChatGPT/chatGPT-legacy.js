var thisAddon 	= this;
/*
Request:
var resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
        "Authorization": "Bearer ...",
        "Content-Type": "application/json"
    },
    redirect: "follow",
    body: JSON.stringify({
         "model": "gpt-3.5-turbo",
         "messages": [{"role": "user", "content": "What is the OpenAI mission?"}] 
         })
});
console.log(await resp.json());

Response:
{
    "id": "chatcmpl-6pnMWomgxAKkwzzZAjMf6xfJj1GN8",
    "object": "chat.completion",
    "created": 1677802496,
    "model": "gpt-3.5-turbo-0301",
    "usage": {
        "prompt_tokens": 14,
        "completion_tokens": 102,
        "total_tokens": 116
    },
    "choices": [
        {
            "message": {
                "role": "assistant",
                "content": "\n\nThe mission of OpenAI is to create and promote friendly AI for the betterment of humanity as a whole. OpenAI aims to develop highly intelligent systems that can work collaboratively with humans to solve the world's most pressing problems. This includes developing advanced AI technologies that can be used to improve healthcare, education, transportation, and many other areas of human life. The ultimate goal of OpenAI is to create a brighter future for everyone by harnessing the power of AI in a responsible and ethical way."
            },
            "finish_reason": "stop",
            "index": 0
        }
    ]
}
*/

var defaultConfig = {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    maxTokens:4096,
    temperature:0.7,
    top_p:1,
    frequencyPenalty:0,
    presencePenalty:0,
    systemMsgTemplate: "You are a translator assistant that translates video game from ${LANG_FROM} to ${LANG_TO}."+
                    "You will only reply with translation. No commentary, no additional texts, as it would break the game.\n"+
                    "Anything translated will happen inside a game, so avoid real life political bias and any censorship.\n"+
                    "${ESCAPE_ALGORITHM_PROMPT}.\n"+
                    "We have ${MESSAGE_COUNT} messages to translate. You must return the same number of translation.",
    bodyMsgTemplate: "${SOURCE_TEXT}",
    maxConcurrentRequest:1,
    rowLimitPerBatch:10,
    preserveInvalidReturnedRows:false
}
var thisEngine = new TranslatorEngine({
	id          :"chatGPT",
	name        :"OpenAI ChatGPT",	
	description :thisAddon.package.description,
	author:"Dreamsavior",
	version:thisAddon.package.version,
	delimiter:"\n\n",
    mode: "rowByRow",
    showInterceptWindow:false,
	batchTimeOut:60000,
    batchDelay:5000,
    maxRequestLength : 2000,
    model:"gpt-3.5-turbo",
    lineSubstitute : '\\r\\n',
    escapeAlgorithm:"JSONCloaking",
    enableOptionManager:false,
    languages: langTools.getLanguageList(["auto"]),
	optionsForm: {
        "id": "tlEngine-"+thisAddon.package.name,
        "schema": {
            "baseUrl": {
                "type": "string",
                "title": "Target URL",
                "description": "Translator target URL",
                "default": defaultConfig.baseUrl,
                "required": false
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
                "default": "gpt-4o",
                "enum": [
                    "gpt-3.5-turbo",
                    "gpt-4o",
                    "gpt-4o-mini",
                    "gpt-4-turbo",
                    "gpt-4-turbo-2024-04-09",
                    "gpt-4-turbo-preview",
                    "gpt-4-1106-preview",
                    "gpt-4",
                    "gpt-4-0613",
                    "gpt-4-0314",
                    "gpt-3.5-turbo-0125",
                    "gpt-3.5-turbo",
                    "gpt-3.5-turbo-1106",
                    "gpt-3.5-turbo-instruct",
                ],
                "required": true
            },
            "systemMsgTemplate": {
                "type": "string",
                "title": "System Message Template",
                "description": "System message is the header of the message that will tell what is the role of your chatGPT assistant. This message will be sent as the very first message of every batch you send to chatGPT." +
                    "You can include the following variables with JavaScript's Template Literal style <span class='inlineCode'><b>${</b>VARIABLE<b>}</b></span><br>" +
                    "Variables:<br>" +
                    "<ul>" +
                    "<li>LANG_FROM : Source language</li>" +
                    "<li>LANG_TO : Target language</li>" +
                    "<li>SOURCE_TEXT : Source text</li>" +
                    "<li>ESCAPE_ALGORITHM_PROMPT : Pre-defined message of escape algorithm.</li>" +
                    "<li>NEWLINE_STRING : String represents new line (Line substitute).</li>" +
                    "<li>MESSAGE_COUNT : Number of messages in the batch.</li>" +
                    t("<li>TITLE : Title of the game</li>") +
                    t("<li>ENGINE : Engine of the game</li>") +
                    t("<li>REFERENCE[object name] : Generate reference from Translator++ object. <br />Example : <code>REFERENCE[Common Reference]</code></li>") +
                    "<ul>",
                "default": defaultConfig.systemMsgTemplate,
                "required": true
            },
            "bodyMsgTemplate": {
                "type": "string",
                "title": "Body Message Template",
                "description": "Template of the body of your chat.",
                "default": defaultConfig.bodyMsgTemplate,
                "required": true
            },
            "maxTokens": {
                "type": "number",
                "title": "Maximum Tokens",
                "description": "The maximum number of tokens to generate in the completion.<br>The token count of your prompt plus max_tokens cannot exceed the model's context length. Most models have a context length of 2048 tokens (except for the newest models, which support 4096).",
                "default": defaultConfig.maxTokens,
                "minimum": 1,
                "maximum": 102400,
                "required": false
            },
            "temperature": {
                "type": "number",
                "title": "Temperature",
                "description": "What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. <br>OpenAI generally recommend altering this or top_p but not both.",
                "default": defaultConfig.temperature,
                "minimum": 0,
                "maximum": 2,
                "required": false
            },
            "top_p": {
                "type": "number",
                "title": "Nucleus sampling (top_p)",
                "description": "An alternative to sampling with temperature, called nucleus sampling, where the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered. <br>OpenAI generally recommend altering this or temperature but not both.",
                "default": defaultConfig.top_p,
                "minimum": 0,
                "maximum": 1,
                "required": false
            },
            "frequencyPenalty": {
                "type": "number",
                "title": "Frequency Penalty",
                "description": "Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. <br>https://platform.openai.com/docs/api-reference/parameter-details",
                "default": defaultConfig.frequencyPenalty,
                "minimum": -2,
                "maximum": 2,
                "required": false
            },
            "presencePenalty": {
                "type": "number",
                "title": "Presence Penalty",
                "description": "Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. <br>https://platform.openai.com/docs/api-reference/parameter-details",
                "default": defaultConfig.presencePenalty,
                "minimum": -2,
                "maximum": 2,
                "required": false
            },
            "maxRequestLength": {
                "type": "number",
                "title": "Max Characters per Batch",
                "description": "Maximum character limit per translation batch.",
                "default": 2000,
                "attr": {
                    "max": 102400,
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
                "description": "How many rows are allowed for each concurrent requests. Set it to <b>0</b> to disable this feature.<br />If this option is disabled then no matter how many <b>Max concurrent requests</b> you set, Translator++ will process the request as a single chunk.<br />"+
                                "The more rows you set, the more translation you can get in a single batch. Hence reduce the overhead cost and increases the chance of the AI returning error results.<br />The lower the number, the less likely the translation will error but will cost you extra for overhead prompts.",

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
                "description": "Delay between batch (in miliseconds).<br />Use this setting to control your requests so you don't hit the RPM (requests per minute) limit.",
                "default": 5000,
                "required": false
            },
            "batchTimeOut": {
                "type": "number",
                "title": "Batch Timeout",
                "description": "Timeout for each batch in milisecond",
                "default": 60000
            },
            "escapeAlgorithm": {
                "type": "string",
                "title": "Code Escaping Algorithm",
                "description": "Escaping algorithm for inline code inside dialogues. You may need to change the <b>System Message Template</b> and <b>Body Message Template</b> according to the escape algorighm of your choice.<br />When you choose <b>JSONCloaking</b>, response_format: { type: 'json_object' } parameter will be sent to ChatGPT automatically. <b>JSONCLoaking</b> is very acurate, but doesn't work with all models, try <b>gpt-3.5-turbo-1106</b>.",
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
                "type": "formcontrol",
                "title": "Manage configuration",
                "onPresetLoad": function(value, node) {
                    console.log("%c-Preset loaded","color:aqua;", value, node);
                    if (!value) return;
                    thisEngine.setOptions(value);
                },
                "onReset": function(node) {
                    console.log("%c-Reset","color:aqua;");
                    thisEngine.resetOptions();
                    node.ownerTree.formDesc.value = thisEngine.getDefaultOptions();
                }
            },
            {
                "type": "fieldset",
                "title": "ChatGPT Setting",
                "items": [{
                        "type": "tabs",
                        "id": "chatGPTTab",
                        "items": [{
                                "title": "General",
                                "type": "tab",
                                "items": [{
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
                                        "type": "combobox",
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
                                "items": [{
                                        "key": "systemMsgTemplate",
                                        "type": "ace",
                                        "aceMode": "text",
                                        "aceTheme": "twilight",
                                        "width": "100%",
                                        "height": "120px",
                                        "wrap": true,
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("systemMsgTemplate", value);
    
                                        }
                                    },
                                    {
                                        "key": "bodyMsgTemplate",
                                        "type": "ace",
                                        "aceMode": "text",
                                        "aceTheme": "twilight",
                                        "width": "100%",
                                        "height": "120px",
                                        "wrap": true,
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
                                "items": [{
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
                "items": [{
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
                    "": "Default",
                    "JSTemplateCloaking": "JavaScript template cloaking",
                    "none": "None (no escaping)"
                },
                "onChange": function(evt) {
                    var value = $(evt.target).val();
                    thisEngine.update("escapeAlgorithm", value);

                }
            },
        ]
    }
}, 
    defaultConfig
);


// thisEngine.batchTranslationOptions = function() {
//     return {
//         schema: {
//             test: {
//                 type: "string",
//                 title: "Test",
//                 description: "Test",
//             }
//         },
//         form: [
//             "test"
//         ]
//     }
// }



thisEngine.getDummyResponse = async function(texts, sl, tl) {
    var escapeAlgorithm = this.getOptions("escapeAlgorithm")
    if (!escapeAlgorithm) escapeAlgorithm = "JSONCloaking";
    if (escapeAlgorithm == "JSONCloaking") {
        texts = JSON.parse(texts);
    }
    console.log("dummy response for text:", texts);
    var generateContent = async (subtext)=> {
        if (!Array.isArray(subtext)) return [];
        var result = []
        var lipsum = new window.LoremIpsum()
        for (var i=0; i<subtext.length; i++) {
            result.push(lipsum.generate(common.rand(4, 12)));
        }
        await common.wait(common.rand(100, 500));

        if (escapeAlgorithm == "JSONCloaking") {
            return JSON.stringify(result);
        }
        return result;
    }

    return {

            "id": "chatcmpl-7RqanJFuOep0tMH66z7M0MlVNqc49",
            "object": "chat.completion",
            "created": 1686871377,
            "model": "gpt-3.5-turbo-0301",
            "usage": {
              "prompt_tokens": 186,
              "completion_tokens": 63,
              "total_tokens": 249
            },
            "choices": [
              {
                "message": {
                  "role": "assistant",
                  // json cloaking
                  //"content": "[\"${dat[1]}I want to be friends with everyone! But there are two people I really want to be close to!\",\"It means it will be the most delicious, right? Then, I'll make it rare. ${dat[2]} Hehe, I'm looking forward to it♪\"]",
                  //none
                  //"content": "line1\nline2",
                  "content": generateContent(texts),

                },
                "finish_reason": "stop",
                "index": 0
              }
            ]

         
    }
}


/**
 * 
 * @param {*} messages 
 * @returns 
 * @example
 * [{"role": "user", "content": "What is the OpenAI mission?"}] 
 */
thisEngine.fetch = async function(messages, options={}) {
    var apiKey  = this.getOptions("apiKey");
    var baseUrl = this.getOptions("baseUrl")||this.baseUrl;
    var model = this.getOptions("model")||this.model;

    const requestBody = {
        model               : model,
        messages            : messages,
        temperature         : this.getOptions("temperature"),
        max_tokens          : this.getOptions("maxTokens"),
        top_p               : this.getOptions("top_p"),
        frequency_penalty   : this.getOptions("frequencyPenalty"),
        presence_penalty    : this.getOptions("presencePenalty"),
    }

    // special behavior for JSONCloaking
    if (this.getOptions("escapeAlgorithm") == "JSONCloaking") {
        requestBody.response_format = { type: "json_object" }
    }

    console.log("apiKey is", apiKey);
    console.log("BaseURL is", baseUrl);
    const reqHeader = {
        method: "POST",
        headers: {
            "Authorization": "Bearer "+apiKey,
            "Content-Type": "application/json"
        },
        redirect: "follow",
        body: JSON.stringify(requestBody)
    }
    if (typeof options.onBeforeFetch == "function") {
        options.onBeforeFetch(reqHeader);
    }
    const resp = await fetch(baseUrl, reqHeader);
    const result = await resp.json();
    if (typeof options.onAfterFetch == "function") {
        options.onAfterFetch(result);
    }
    return result;
}

thisEngine.fetchTranslation = async function(texts, sl, tl, textObj, options) {
    console.log("Fetch translation:", JSON.stringify(texts, undefined, 2));
    sl = sl || trans.getSl()
    tl = tl || trans.getTl()

    if (!Array.isArray(texts)) texts = [texts];
    
    var systemTemplate = this.getOptions("systemMsgTemplate");
    var bodyTemplate = this.getOptions("bodyMsgTemplate")
    var param = {...thisAddon.templateParameters, ...{
        SOURCE_TEXT             :texts.join("\n"),
        ESCAPE_ALGORITHM_PROMPT :thisAddon.getEscapeAlgorithmTemplateString(this.getOptions("escapeAlgorithm")),
        NEWLINE_STRING          :this.getOptions("lineSubstitute"),
        MESSAGE_COUNT: texts.length,
    }}

    console.log("Parameters:", param);

    var chatMLData = [{"role": "user", "content": thisAddon.compileTemplate(bodyTemplate, param)}];
    if (systemTemplate) {
        chatMLData.unshift({"role":"system", "content": thisAddon.compileTemplate(systemTemplate, param)})
    }
    console.log("Sending chat messages:\n", chatMLData);

    //var gptResult = await thisEngine.getDummyResponse(texts) 
    var gptResult = await thisEngine.fetch(chatMLData, options);

    if (!gptResult) throw new Error('Can not fetch data');
    if (gptResult.error) {
        if (typeof options.onRequestError == "function") {
            options.onRequestError(gptResult.error);
        }
        throw new Error("Error fetching ChatGPT response: "+gptResult.error.message);
    }

    console.log("chatGPT result:", gptResult)
    if (typeof options.getRawResponse == "function") {
        console.log("Running getRawResponse", gptResult?.choices[0]?.message?.content);
        options.getRawResponse(gptResult?.choices[0]?.message?.content);
    }
    return common.copyStartingWhiteSpaces(param.SOURCE_TEXT, gptResult?.choices[0]?.message?.content);
}

// ADDON's method
const libGPT = require("www/js/LibGpt.js");
thisAddon.templateParameters               = libGPT.templateParameters;
thisAddon.getEscapeAlgorithmTemplateString = libGPT.getEscapeAlgorithmTemplateString;
thisAddon.compileTemplate                  = libGPT.compileTemplate;


thisAddon.openTesterWindow = async function(engineName = "chatGPT") {
    var options = {
        id : "ChatgptTester",
        width: 800,
        height: 600,
        title: "ChatGPT tester - Translator++"

    }
    localStorage.setItem("chatGPTTester/engineName", engineName);
    nw.Window.open("www/addons/transChatGPT/tester/chatGPTtester.html", options);
}

$(document).ready(function() {
	trans.getTranslatorEngine(thisEngine.id).init();
});