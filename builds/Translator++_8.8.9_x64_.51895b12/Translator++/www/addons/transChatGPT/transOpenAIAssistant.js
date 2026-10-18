const thisAddon = this;
const libGPT = require("www/js/LibGpt.js");
const { OpenAI } = addonLoader.getAddon("basicUtils").require("openai"); // loading library from basicUtils
thisAddon.templateParameters               = libGPT.templateParameters;
thisAddon.getEscapeAlgorithmTemplateString = libGPT.getEscapeAlgorithmTemplateString;
thisAddon.compileTemplate                  = libGPT.compileTemplate;


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
                    "## Game Characters\n${ACTOR_INFO}\n\n"+
                    "We have ${MESSAGE_COUNT} messages to translate. You must return the same number of translation."+
                    "\n\n"+
                    "## Context\n"+
                    "${CONTEXT}",
    sampleDialog: [
        {user: `["それはいいですね", "情報\\nありがとうございます。"]`, assistant: `{"translation": ["That's great", "Information", "Thank you"]}`},
        {user: `No good! \nI sent you array of 2, but you returned array of 3 texts.\nYou must translate with the EXACT same number of array member. Try again.`, assistant: `{"translation": ["That's great", "Thank you for the\\ninformation"]}`}
    ],
    bodyMsgTemplate: "Great! Now translate this:\n${SOURCE_TEXT}",
    maxConcurrentRequest:1,
    rowLimitPerBatch:10,
    preserveInvalidReturnedRows:false
}
var thisEngine = new TranslatorEngine({
    translatorType: "v2",
    id          :"chatGPT2",
    name        :"OpenAI Chat2",
    description :thisAddon.package.description,
    author:"Dreamsavior",
    version:thisAddon.package.version,
    delimiter:"\n\n",
    mode: "rowByRow",
    showInterceptWindow:false,
    batchTimeOut:60000,
    batchDelay:5000,
    maxRequestLength : 2000,
    model:"gpt-4o",
    lineSubstitute : '\\r\\n',
    escapeAlgorithm:"JSONCloaking",
    enableOptionManager:false,
    languages: langTools.getLanguageList(["auto"]),
    debugLevel: 9,
    optionsForm: {
        "id": "tlEngine-chatGPT2",
        "schema": {
            "baseUrl": {
                "type": "string",
                "title": "Target URL",
                "description": `Target end point. You can use any service that supports OpenAI API. <br>`
                    +`For example:<br>`
                    +`OpenAI: <code>https://api.openai.com/v1/chat/completions</code><br>`
                    +`Deepseek: <code>https://api.deepseek.com/v1/chat/completions</code><br>`,
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
                "description": "The pre-trained model"
                    +`In ChatGPT, you may need to set the allowed model to be used (https://platform.openai.com/settings/proj_xxx/limits).`,
                "default": "gpt-4o",
                "enum": [
                    "gpt-3.5-turbo",
                    "o1-mini",
                    "o1-preview",
                    "o1-preview-2024-09-12",
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
                    "deepseek-chat",
                ],
                "required": true
            },
            "enableContext": {
                "type": "boolean",
                "title": "Enable Context",
                "description": "Enable context for the translation. The previously translated material above the current batch will be included as a context. <b>You also need to explicitly includes the CONTEXT into the template</b>",
                "default": false
            },
            "contextCharacterLimit": {
                "type": "number",
                "title": "Context Character Limit",
                "description": "Character limit for the context.",
                "default": 2048,
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
                        t("<li>ACTOR_INFO : Glossary of actor information.(Only if actor information option is enabled in batch mode)</li>") +
                        t("<li>REFERENCE[object name] : Generate reference from Translator++ object. <br />Example : <code>REFERENCE[Common Reference]</code></li>") +
                        t("<li>CONTEXT : Context of the previous translation (if context is enabled)</li>") +
                    "<ul>",
                "default": defaultConfig.systemMsgTemplate,
                "required": true
            },
            "sampleDialog": {
                "type": "array",
                "default": defaultConfig.sampleDialog,
                "items": {
                    "type": "object",
                    "title": t("Sample conversation"),
                    "properties": {
                        "user": {
                            "type": "string",
                            "title": "User message"
                        },
                        "assistant": {
                            "type": "string",
                            "title": "Assistant's response"
                        },
                    }
                }
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
            "useJsonSchema": {
                "type": "boolean",
                "title": "Use JSON Schema",
                "description": "Use <code>json_schema</code> for the <code>response_format.type</code> field instead of the old <code>json_object</code>. The <code>json_schema</code> is required by some of the latest models and some servers like <b>LM Studio</b>, but some old models are still using <code>json_object</code>.",
                "default": false,
                "required": false
            },
            "maxRequestLength": {
                "type": "number",
                "title": "Max Characters per Batch",
                "description": "Maximum character limit per translation batch.\nThis options will count the original text's character length only, and not the prompt message's character length.",
                "default": 2000,
                "attr": {
                    "max": 1024*1024,
                    "min": 20
                }
            },
            "maxConcurrentRequest": {
                "type": "number",
                "title": "Max concurrent requests",
                "description": "How many concurrent requests are allowed to be connected simultaneously? Each additional concurrent connection will multiply your translation speed, but will also quickly exhaust your token limit set by your provider.<br />Set it to <b>0</b> to disable this feature.<br />Combine this option with <b>Max row per concurrent request</b> to boost the translation speed further.<br />Setting this option to more than 1 will affect the <b>Context</b> because there will be a request processed before the previous one is finished. Thus, the context will be sent without the translation result of the prior request.",
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
            },

            // custom parameters
            "customParameters": {
                type: "array",
                items: {
                    type: "object",
                    title: "Custom Parameter",
                    properties: {
                        key: {
                            type: "string",
                            title: "Key",
                        },
                        value: {
                            type: "string",
                            title: "Value",
                        },
                        type:  {
                            type: "string",
                            title: "Type",
                            enum: ["string", "number", "boolean", "javascript"],
                            description: "Type of the value."
                            +"For <b>javascript</b> type, the value will be evaluated as JavaScript code."
                            +"The scope of the javascript code is <code>window</code>. So you can pretty much grab any value."
                            +"<br />Example: <code>trans.project.title</code>",
                        },
                    }
                }
            },
            "dropParameters": {
                "type": "json", // force jsonform to parse the string result
                "description": "Drop parameters that will not be sent to the API.<br />"
                    +"OpenAI API is keep changing, some new models may not support the old parameters and will return HTTP error for unrecognized request parameter."
                    +"You can drop the parameters that are not supported by the model here.",
                "default": []
            },
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
                type: "info",
                content: "This addon enables translation through any service that supports the OpenAI Chat API, such as Deepseek, LlamaCPP, etc, and, of course, OpenAI ChatGPT."
            },
            {
                "type": "fieldset",
                "title": "OpenAI API settings",
                "items": [{
                        "type": "tabs",
                        "id": "chatGPTTab",
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
                                "items": [
                                    {
                                        "key": "enableContext",
                                        "inlinetitle": "Enable context",
                                        "onChange": function(evt) {
                                            var value = $(evt.target).prop("checked");
                                            thisEngine.update("enableContext", value);
                                        }
                                    },
                                    {
                                        "key": "contextCharacterLimit",
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            thisEngine.update("contextCharacterLimit", parseInt(value));
                                        }
                                    },
                                    {
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
                                        "type": "html",
                                        "value": t("<h2>Sample dialogue</h2>")+
                                                t("<p>Sample existing dialog. You can write a sample of good or bad responses to help the translator understand your aim and the context of the conversation.</p>")
                                    },
                                    {
                                        "type": "tabarray",
                                        "draggable": false,
                                        "items": {
                                          "type": "section",
                                          "items": [
                                            {
                                                "key": "sampleDialog[].user",
                                                "type": "ace",
                                                "height": "120px",
                                            },
                                            {
                                                "key": "sampleDialog[].assistant",
                                                "type": "ace",
                                                "height": "120px",
                
                                            },
                                          ]
                                        },
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            console.log("sampleDialog", value);
                                            console.log("this", this, this.node.getValue());
                                            thisEngine.update("sampleDialog", this.node.getValue());
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
                                    {
                                        "key": "useJsonSchema",
                                        "inlinetitle": "Use JSON Schema",
                                        "onChange": function(evt) {
                                            var value = $(evt.target).prop("checked");
                                            thisEngine.update("useJsonSchema", value);
                                        }
                                    }

                                ]
                            },
                            {
                                "title": "Custom Parameters",
                                "type": "tab",
                                "items": [
                                    {
                                        type: "info",
                                        content: "You can add custom parameters to the OpenAI Chat API request body. This is useful if you want to add additional parameters that are not available in the form."
                                    },
                                    {
                                        type: "warn",
                                        content: "<h2>Warning</h2>"
                                            +"<ul>"
                                            +"<li>Incorrectly setting custom parameters may cause the API request to fail. Make sure you know what you are doing before adding custom parameters. Some services like OpenAI are strict about what parameters you're sending, and they will return HTTP error for unrecognized request parameter.</li>"
                                            +"<li>If the same key is used multiple times, only the last value will be used.</li>"
                                            +"<li>If the same key in the existing configuration is used, then existing configuration parameter will be overwritten by the custom parameter.</li>"
                                            +"</ul>"
                                    },
                                    {
                                        "type": "tabarray",
                                        "items": {
                                            "type": "section",
                                            "legend": "{{idx}}. {{value}}",
                                            "items": [
                                                {
                                                    "key": "customParameters[].key",
                                                    "valueInLegend": true
                                                },
                                                {
                                                    "key": "customParameters[].value",
                                                },
                                                {
                                                    "key": "customParameters[].type",
                                                    "type": "select",
                                                    "titleMap": {
                                                        "string": "String",
                                                        "number": "Number",
                                                        "boolean": "Boolean",
                                                        "javascript": "JavaScript"
                                                    },
                                                },
                                            ]
                                        },
                                        "onChange": function(evt) {
                                            var value = $(evt.target).val();
                                            console.warn("customParameters", value);
                                            console.log("this", this, this.node.getValue());
                                            thisEngine.update("customParameters", this.node.getValue());
                                        }
                                    },
                                    {
                                        "key": "dropParameters",
                                        "title": "Drop Parameters",
                                        "type":"tag",
                                        "onChange": function(evt) {
                                            console.log("this value", this);
                                            console.log("Current value", $(evt.target).val());
                                            console.log("Value with this.getValue()", this.getValue());
                                            thisEngine.update("dropParameters", this.getValue() || []);
                        
                                        }
                                    },
                                ]
                            },

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
                            if (!updater || updater.getUser().level < 100) {
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

// thisEngine.optionsForm.value = {};

// Object.defineProperty(thisEngine.optionsForm.value, 'sampleDialog', {
//     get: function() {
//         return thisEngine.getOptions('sampleDialog');
//     }
// });

thisEngine.translationFlow = [
    "translateWithReference",
    "beforeTranslateCommonRoutine",
    "appendActorName",
    "translate",
    "stripActorName",
    "afterTranslateCommonRoutine",
    "applyToGrid",
    "displayResult",
    "logAsBatchManager",
    "batchDelay"
]

thisEngine.batchTranslationOptions = function() {
    return {
        schema: {
            // general
            "alwaysSparateFile": {
                "type": "boolean",
                "title": t("Always separate file"),
                "description": t("Always separate the file for each batch. This may keep the contexts of each files unpoluted with another files."),
                "default": false,
            },
            "addActorName": {
                "type": "boolean",
                "title": t("Add actor name"),
                "description": t("Append actor name from row info to the translatable text. This will help the translators to keep track of the dialogue and pronouns. Translator++ will then removes the actor name from the translation result. This obviously will increase the cost of the translation."),
                "default": false,
            },
            // glossary
            "useActorReference": {
                "type": "boolean",
                "title": t("Load Actor Reference as Glossary"),
                "description": t("If checked, Translator++ will load the actor reference as glossary. This will help the translator to understand the context of the conversation. The actor reference is the name of the actor in the dialogue. This will be loaded as a glossary to the translator. This will increase the cost of the translation.")+
                        t("Only the characters that are exists in the conversation will be loaded as glossary for each batch item. Use the template command to load the actor reference in the prompt message.")+
                        t("<br />⚠️If you enable this option, you also need to include the <code>ACTOR_INFO</code> variable in the prompt template to place the character information data."),
                "default": false,
            },
            "actorReferenceTranslationColumn": {
                "type": "string",
                "title": t("Actor Reference Translation Column"),
                "description": t("The column of the translation of the actor name. This column will be used as the translation of the actor reference. This will improve the consistency of actor name's translation in the conversation."),
            },
            "actorReferenceInfoColumn": {
                "type": "string",
                "title": t("Actor's Information Column"),
                "description": t("The column that contains the actor's additional information. You can put more information such as gender, age, etc. This will improve the translation of the pronouns in the conversation."),
            },
            // extra prompt
            "extraPrompt": {
                "type": "string",
                "title": t("Extra Prompt"),
                "description": t("Extra prompt that will be added to the prompt message. This will be added after the system message and before the actual prompt message.")+
                    "<br />"+
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
                        t("<li>ACTOR_INFO : Glossary of actor information.(Only if actor information option is enabled in batch mode)</li>") +
                        t("<li>REFERENCE[object name] : Generate reference from Translator++ object. <br />Example : <code>REFERENCE[Common Reference]</code></li>") +
                        t("<li>CONTEXT : Context of the previous translation (if context is enabled)</li>") +
                    "<ul>",
            },
        },
        form: [
            {
                "type": "fieldset",
                "title": t("General Settings"),
                "items": [
                    {
                        "key": "alwaysSparateFile",
                        "inlinetitle": t("Always separate file for each batch"),
                    },
                    {
                        "key": "addActorName",
                        "inlinetitle": t("Append actor name to the translatable text"),
                    },

                ]
            },
            {
                "type": "fieldset",
                "title": t("Glossary"),
                "items": [
                    {
                        "type": "html",
                        "value": t("<h2>Glossary</h2>")+
                                t("<p>This feature will help you automatically add a glossary into the prompt. The glossary will be loaded for each batch of items to improve the quality of the translation. The feature will try to load only the relevant terms to avoid bloating your prompt.</p>")
                    },
                    {
                        "key": "useActorReference",
                        "inlinetitle": t("Load Actor Reference as Glossary"),
                    },
                    {
                        "key": "actorReferenceTranslationColumn",
                        "type": "selectcolumn",
                        "title": t("Actor Reference Translation Column"),
                    },
                    {
                        "key": "actorReferenceInfoColumn",
                        "type": "selectcolumn",
                        "title": t("The Column of Actor's Additional Information"),
                    },
                ]
            },
            {
                "type": "fieldset",
                "title": t("Prompt"),
                "items": [
                    {
                        "key": "extraPrompt",
                        "type": "ace",
                        "aceMode": "text",
                        "aceTheme": "twilight",
                        "width": "100%",
                        "height": "120px",
                        "wrap": true,
                    },
                ]
            },
        ]
    }
}



/**
 * Filter and convert the request body to string
 * @param {object} requestBody - The HTTP fetch request body
 * @returns {string} - The stringified request body
 */
thisEngine.requestBodyToString = function(requestBody) {
    return JSON.stringify(requestBody);
}

/**
 * 
 * @param {*} messages 
 * @returns 
 * @example
 * [{"role": "user", "content": "What is the OpenAI mission?"}] 
 */
thisEngine.fetch = async function(messages, options={}) {
    console.log("%c calling fetch", "color:orange", messages, options);
    var apiKey  = this.getOptions("apiKey");
    var baseUrl = this.getOptions("baseUrl")||this.baseUrl;
    var model = this.getOptions("model")||this.model;

    let requestBody = {
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

    // generate custom parameters
    requestBody = libGPT.renderCustomParameters(this.getOptions("customParameters"), requestBody);

    // drop parameters
    const dropParameters = this.getOptions("dropParameters");
    requestBody = libGPT.dropParameters(requestBody, dropParameters);

    // modify parameters based on the translator engine preference
    requestBody = await thisEngine.adaptParameters(requestBody);

    console.log("apiKey is", apiKey);
    console.log("BaseURL is", baseUrl);
    let reqHeader = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        redirect: "follow",
        body: this.requestBodyToString(requestBody)
    }

    if (apiKey) {
        reqHeader.headers["Authorization"] = "Bearer "+this.getOptions("apiKey")
    }

    if (options?.batchInfo?.info) {
        options.batchInfo.info.request = {...reqHeader, ...{
            body: requestBody
        }};
    }


    if (typeof options.onBeforeFetch == "function") {
        options.onBeforeFetch(reqHeader);
    }
    if (typeof this.checkOnlineStatus == "function") {
        await this.checkOnlineStatus();
    }

    let retryCount = 0;
    const fetchData = async ()=> {
        const resp = await fetch(baseUrl, reqHeader);
        let result;
        if (options?.batchInfo?.info) {
            options.batchInfo.info.response = {
                status:resp.status,
                body:await resp.json(),
            };
            result = options.batchInfo.info.response.body;
        } else {
            result =  await resp.json();
        }

        // mitigate errors
        if (result?.error) {
            console.log("%cError detected", "color:red", result);
            let errorMessage = result.error.message || result.error;
            if (typeof errorMessage !== "string") {
                errorMessage = JSON.stringify(errorMessage);
            }
            if (retryCount > 10) {
                console.log("Retry count exceeded", retryCount);
                return result;
            }
            console.log("%cError detected", "color:red", result.error);
            if (result.error.code == "unsupported_parameter" && result.error.param) {
                // remove the parameter
                console.log("Retrying without the parameter", result.error.param);
                const dropParameters = this.getOptions("dropParameters") || [];
                dropParameters.push(result.error.param);
                this.setOption("dropParameters", dropParameters);
                requestBody = libGPT.dropParameters(requestBody, dropParameters);
                reqHeader.body = this.requestBodyToString(requestBody);
                // retry
                retryCount++;
                result = await fetchData();
            } else if (errorMessage.includes("Unrecognized request argument supplied: ")) {
                // remove the parameter
                console.log("Retrying without the parameter", errorMessage);
                const param = errorMessage.split(":")[1].trim();
                const dropParameters = this.getOptions("dropParameters") || [];
                dropParameters.push(param);
                this.setOption("dropParameters", dropParameters);
                requestBody = libGPT.dropParameters(requestBody, dropParameters);
                reqHeader.body = this.requestBodyToString(requestBody);
                // retry
                retryCount++;
                result = await fetchData();

            } else if (errorMessage.includes("json_schema")) {
                // retry with json_schema
                console.log("Retrying with json_schema", errorMessage);
                this.setOption("useJsonSchema", true);
                requestBody = await thisEngine.adaptParameters(requestBody);
                reqHeader.body = this.requestBodyToString(requestBody);
                retryCount++;
                result = await fetchData();
            } else {
                // unknown error
                if (ui.log.isShown()) {
                    await ui.log.error(result.error.message);
                } else {
                    console.error(result.error);
                    alert("Error: "+errorMessage);
                }
            }
        }

        return result;
    }

    let result = await fetchData();

    if (typeof options.onAfterFetch == "function") {
        options.onAfterFetch(result);
    }
    console.log("%c Fetch result", "color:orange", result);
    return result;
}

// dummy fetch function for testing
// thisEngine.fetch = async function(messages, options={}) {
//     console.log("%cMockup fetch", "color:orange", messages, options);
//     console.log("%cBatchInfo", "color:orange", JSON.stringify(options.batchInfo));
//     // get last element of messages as JSON
//     const msg = JSON.parse(messages[messages.length-1].content);

//     // generate dummy translation content based on the length of the message
//     let dummyContent = {translation:[]};
//     for (let i=0; i<messages.length; i++) {
//         dummyContent.translation.push("Dummy translation "+i);
//     }

//     options.batchInfo.info.request = {
//         url: this.getOptions("baseUrl"),
//         body: {
//             "model": "gpt-4o",
//             "messages": messages,
//             "temperature": 0.7,
//             "max_tokens": 4096,
//             "top_p": 1,
//             "frequency_penalty": 0,
//             "presence_penalty": 0,
//             "response_format": {
//                 "type": "json_object"
//             }
//         }
//     };
//     options.batchInfo.info.response = {
//         status: 200,
//         body:{
//             "id": "chatcmpl-DUMMY"+common.generateId(),
//             "object": "chat.completion",
//             "created": 1726405205,
//             "model": "gpt-dummy",
//             "choices": [
//                 {
//                     "index": 0,
//                     "message": {
//                         "role": "assistant",
//                         "content": JSON.stringify(dummyContent),
//                         "refusal": null
//                     },
//                     "logprobs": null,
//                     "finish_reason": "stop"
//                 }
//             ],
//             "usage": {
//                 "prompt_tokens": 431,
//                 "completion_tokens": 162,
//                 "total_tokens": 593,
//                 "completion_tokens_details": {
//                     "reasoning_tokens": 0
//                 }
//             },
//             "system_fingerprint": "fp_992d1ea92d"
//         }
//     };
    
//     return options.batchInfo.info.response.body;
      
// }

const responseFormatJsonSchema = {
    "type": "json_schema",
    "json_schema": {
        "name": "translation_output",
        "schema": {
            "type": "object",
            "properties": {
                "translation": {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }
            },
            "required": ["translation"],
            "additionalProperties": false
        },
        "strict": true
    }
}; 

thisEngine.adaptParameters = await function(requestBody) {
    console.log("Adapting parameters", requestBody);
    // check model
    if (requestBody?.model?.includes("gpt-")) {
        // legacy model
        
    } else {
        // new model does not include "gpt-"
        // drop temperature
        if (requestBody?.max_tokens) {
            const maxTokens = requestBody.max_tokens;
            requestBody.max_completion_tokens = maxTokens;
            delete requestBody.max_tokens;
        }
        if (requestBody?.temperature) {
            // drop temperature
            delete requestBody.temperature
        }
        if (requestBody?.model?.startsWith("o1")) {
            // change role system to developer
            if (requestBody?.messages?.length) {
                for (let i=0; i<requestBody.messages.length; i++) {
                    if (requestBody.messages[i].role == "system") {
                        requestBody.messages[i].role = "user";
                    }
                }
            }

            if (requestBody?.response_format) {
                requestBody.response_format = responseFormatJsonSchema;
            }
        }

    }
    if (this.getOptions("useJsonSchema")) {
        // drop response_format and change to response_schema

        requestBody.response_format = responseFormatJsonSchema;
        console.log("$c Using JSON schema", "color:orange", requestBody.response_format);
    }
    return requestBody;
}

thisEngine.fetchTranslation = async function(texts, sl, tl, textObj, options) {
    sl = sl || trans.getSl()
    tl = tl || trans.getTl()

    if (!Array.isArray(texts)) texts = [texts];
    
    var systemTemplate = this.getOptions("systemMsgTemplate") || "";
    var bodyTemplate = this.getOptions("bodyMsgTemplate")
    var context = "";
    if (typeof options.batchInfo?.info?.contextsToString == "function") {
        context = options.batchInfo.info.contextsToString();
    }

    var param = {...thisAddon.templateParameters, ...{
        SOURCE_TEXT             :texts.join("\n"),
        ESCAPE_ALGORITHM_PROMPT :thisAddon.getEscapeAlgorithmTemplateString(this.getOptions("escapeAlgorithm")),
        NEWLINE_STRING          :this.getOptions("lineSubstitute"),
        MESSAGE_COUNT           :texts.length,
        ACTOR_INFO              :BatchTranslate.getMentionedActor(textObj.originalTexts, options) || "N/A",
        CONTEXT                 :context || "N/A",
    }}

    const conversation = [];
    // add extra prompt into the system message
    if (options?.translatorOptions?.extraPrompt) {
        if (systemTemplate) systemTemplate += "\n";
        systemTemplate += options.translatorOptions.extraPrompt;
    }
    
    if (systemTemplate) {
        conversation.push({
            "role":"system", 
            "content": thisAddon.compileTemplate(systemTemplate, param)
        });
    }

    if (thisEngine.getOptions("sampleDialog")?.length) {
        for (let i=0; i<thisEngine.getOptions("sampleDialog").length; i++) {
            let sample = thisEngine.getOptions("sampleDialog")[i];
            conversation.push({
                "role": "user",
                "content": thisAddon.compileTemplate(sample.user, param)
            });
            conversation.push({
                "role": "assistant",
                "content": thisAddon.compileTemplate(sample.assistant, param)
            });
        }
    }

    conversation.push({
        "role": "user", 
        "content": thisAddon.compileTemplate(bodyTemplate, param)
    });

    //var gptResult = await thisEngine.getDummyResponse(texts) 
    const gptResult = await thisEngine.fetch(conversation, options);

    if (!gptResult) throw new Error('Can not fetch data');
    if (gptResult.error) {
        if (typeof options.onRequestError == "function") {
            options.onRequestError(gptResult.error);
        }
        throw new Error("Error fetching ChatGPT response: "+gptResult.error.message);
    }

    if (typeof options.getRawResponse == "function") {
        options.getRawResponse(gptResult?.choices[0]?.message?.content);
    }
    const result = common.copyStartingWhiteSpaces(param.SOURCE_TEXT, gptResult?.choices[0]?.message?.content);
    return result;
}

thisEngine.onEmptyBatch = async function(batchInfo) {
    console.log("%cEmpty batch", "color:red", batchInfo);
    batchInfo.info ||= {};
    batchInfo.info.response = {
        status: 304, 
        body: {
            "created": 0,
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0
            },
            "choices": [
                {
                    "finish_reason": "Zero job/Loaded from cache",
                }
            ]
        }
    };
}



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