const thisAddon = this;
const libGPT = require("www/js/LibGpt.js");
const promptTemplates = require("www/addons/prOpenAI/promptTemplates.js");
thisAddon.templateParameters               = libGPT.templateParameters;
thisAddon.compileTemplate                  = libGPT.compileTemplate;

var defaultConfig = {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    maxTokens: 4096,
    // Empty means do not send reasoning_effort. Support and accepted values
    // depend on the selected model and provider.
    reasoningEffort: "",
    temperature: 0.3,
    top_p: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    templateLanguage: "english",
    systemMsgTemplate: promptTemplates.english.systemMsgTemplate,
    sampleDialog: promptTemplates.english.sampleDialog,
    bodyMsgTemplate: promptTemplates.english.bodyMsgTemplate,
    maxConcurrentRequest: 1,
    rowLimitPerBatch: 10,
    preserveInvalidReturnedRows: false,

    // retries
    maxRetries: 0,
    retryIfRowCountMismatch: false,
    retryIfLineCountMismatch: false,
    promptRetryRowCountMismatch: promptTemplates.english.promptRetryRowCountMismatch,
    promptRetryLineCountMismatch: promptTemplates.english.promptRetryLineCountMismatch,
    promptError: promptTemplates.english.promptError,
}

var thisEngine = new ProofreaderEngine({
    id          : "prOpenAI",
    name        : t("OpenAI Proofreader"),
    description : thisAddon.package.description,
    author      : "Dreamsavior",
    version     : thisAddon.package.version,
    mode        : "rowByRow",
    batchTimeOut: 60000,
    batchDelay  : 5000,
    maxRequestLength: 2000,
    model       : "gpt-4o",
    lineSubstitute: '\\r\\n',
    escapeAlgorithm: "JSONCloaking",
    debugLevel  : 0,
    optionsForm: {
        "id": "prEngine-" + thisAddon.package.name,
        "schema": {
            "baseUrl": {
                "type": "string",
                "title": t("Target URL"),
                "description": t("Target end point. You can use any service that supports the OpenAI Chat Completion API."),
                "default": defaultConfig.baseUrl,
                "required": false
            },
            "apiKey": {
                "type": "string",
                "title": t("API Key"),
                "description": t("Enter your API Key here.<br>Leave it blank if the service doesn't require an API key."),
                "default": "",
                "required": true
            },
            "model": {
                "type": "string",
                "title": t("Model"),
                "description": t("The pre-trained model used for proofreading. Cheaper/faster models are usually fine for proofreading -- it is a lighter task than full translation."),
                "default": "gpt-4o",
                "required": true
            },
            "templateLanguage": {
                "type": "string",
                "title": t("Prompt Template Language"),
                "description": t("Language of the built-in System Message / Sample dialogue / Body message / Retry prompt templates below. Changing this offers to load that language's built-in templates -- it does not translate whatever you've already customized."),
                "default": "english",
                "enum": ["english", "spanish"],
                "required": false
            },
            "systemMsgTemplate": {
                "type": "string",
                "title": t("System Message Template"),
                "description": t("Sent as the very first message of every batch. You can include the following variables with JavaScript's Template Literal style <span class='inlineCode'><b>${</b>VARIABLE<b>}</b></span><br>") +
                    t("Variables:<br>") +
                    "<ul>" +
                        t("<li>LANG_TO : Target/translation language</li>") +
                        t("<li>SOURCE_TEXT : Original/source text</li>") +
                        t("<li>CURRENT_TRANSLATION : The existing translation to be corrected</li>") +
                        t("<li>ESCAPE_ALGORITHM_PROMPT : Pre-defined message of escape algorithm.</li>") +
                        t("<li>NEWLINE_STRING : String represents new line (Line substitute).</li>") +
                        t("<li>MESSAGE_COUNT : Number of lines in the batch.</li>") +
                        t("<li>ACTOR_INFO : Speaker/character info for the selected row(s) (if available)</li>") +
                        t("<li>CONTEXT : Row context path (if available)</li>") +
                    "</ul>",
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
                        "user": { "type": "string", "title": t("User message") },
                        "assistant": { "type": "string", "title": t("Assistant's response") },
                    }
                }
            },
            "bodyMsgTemplate": {
                "type": "string",
                "title": t("Body Message Template"),
                "description": t("Template of the body of each proofreading request."),
                "default": defaultConfig.bodyMsgTemplate,
                "required": true
            },
            "maxTokens": {
                "type": "number",
                "title": t("Maximum Tokens"),
                "description": t("The maximum number of tokens to generate in the completion."),
                "default": defaultConfig.maxTokens,
                "minimum": 1,
                "maximum": 102400,
                "required": false
            },
            "reasoningEffort": {
                "type": "string",
                "title": t("Reasoning Effort"),
                "description": t("Controls how much reasoning a supported model performs. Available values are model/provider-dependent. Auto/Not specified omits the OpenAI-compatible <code>reasoning_effort</code> parameter. If a provider rejects it, the proofreader retries without the unsupported parameter."),
                "default": defaultConfig.reasoningEffort,
                "enum": ["", "none", "minimal", "low", "medium", "high", "xhigh", "max"],
                "required": false
            },
            "temperature": {
                "type": "number",
                "title": t("Temperature"),
                "description": t("Lower values (e.g. 0.2-0.4) are recommended for proofreading, since the goal is a faithful correction, not a creative rewrite."),
                "default": defaultConfig.temperature,
                "minimum": 0,
                "maximum": 2,
                "required": false
            },
            "top_p": {
                "type": "number",
                "title": t("Nucleus sampling (top_p)"),
                "default": defaultConfig.top_p,
                "minimum": 0,
                "maximum": 1,
                "required": false
            },
            "frequencyPenalty": {
                "type": "number",
                "title": t("Frequency Penalty"),
                "default": defaultConfig.frequencyPenalty,
                "minimum": -2,
                "maximum": 2,
                "required": false
            },
            "presencePenalty": {
                "type": "number",
                "title": t("Presence Penalty"),
                "default": defaultConfig.presencePenalty,
                "minimum": -2,
                "maximum": 2,
                "required": false
            },
            "useJsonSchema": {
                "type": "boolean",
                "title": t("Use JSON Schema"),
                "description": t("Use <code>json_schema</code> for the <code>response_format.type</code> field instead of <code>json_object</code>. Required by some newer models / local servers."),
                "default": false,
                "required": false
            },
            "maxRequestLength": {
                "type": "number",
                "title": t("Max Characters per Batch"),
                "description": t("Maximum character limit per proofreading batch, counting the current-translation text only."),
                "default": 2000,
                "attr": { "max": 1024 * 1024, "min": 20 }
            },
            "maxConcurrentRequest": {
                "type": "number",
                "title": t("Max concurrent requests"),
                "description": t("How many concurrent requests are allowed. Set to <b>0</b> to disable (single request)."),
                "default": defaultConfig.maxConcurrentRequest,
                "attr": { "max": 50, "min": 0 }
            },
            "rowLimitPerBatch": {
                "type": "number",
                "title": t("Max row per concurrent requests"),
                "description": t("How many rows are allowed per concurrent request. Set to <b>0</b> to disable chunking."),
                "default": defaultConfig.rowLimitPerBatch,
                "attr": { "max": 1000, "min": 0 }
            },
            "preserveInvalidReturnedRows": {
                "type": "boolean",
                "title": t("Preserve translations from invalid returned number of rows"),
                "description": t("If checked, Translator++ keeps the (possibly misaligned) rows returned. If unchecked, the original translation is kept unchanged when the row count doesn't match."),
                "default": defaultConfig.preserveInvalidReturnedRows
            },
            "batchDelay": {
                "type": "integer",
                "title": t("Batch delay"),
                "description": t("Delay between batches (in milliseconds)."),
                "default": 5000,
                "required": false
            },
            "batchTimeOut": {
                "type": "number",
                "title": t("Batch Timeout"),
                "description": t("Timeout for each batch in milliseconds"),
                "default": 60000
            },
            "escapeAlgorithm": {
                "type": "string",
                "title": t("Code Escaping Algorithm"),
                "description": t("Escaping algorithm for inline code/tags inside the current translation. You may need to adjust the System Message / Body Message templates to match."),
                "default": "JSONCloaking",
                "required": false,
                "enum": [
                    "",
                    "JSTemplateCloaking",
                    "HTMLCloaking",
                    "HTMLCloakingWrapped",
                    "XMLCloaking",
                    "JSONCloaking",
                    "JSONObjectCloaking",
                    "none"
                ]
            },
            "maxRetries": {
                "type": "number",
                "title": t("Number of retry"),
                "description": t("How many times the engine should retry when the output fails validation. If nullish (empty), then no retry."),
                "default": defaultConfig.maxRetries,
                "minimum": 0,
                "required": false
            },
            "retryIfRowCountMismatch": {
                "type": "boolean",
                "title": t("Retry when the number of proofread rows doesn't match the input"),
                "default": defaultConfig.retryIfRowCountMismatch,
                "required": false
            },
            "retryIfLineCountMismatch": {
                "type": "boolean",
                "title": t("Retry when the number of lines for each proofread row doesn't match the current translation"),
                "default": defaultConfig.retryIfLineCountMismatch,
                "required": false
            },
            "promptRetryRowCountMismatch": {
                "type": "string",
                "title": t("Prompt: Row count mismatch"),
                "default": defaultConfig.promptRetryRowCountMismatch,
                "required": false
            },
            "promptRetryLineCountMismatch": {
                "type": "string",
                "title": t("Prompt: Line count mismatch"),
                "default": defaultConfig.promptRetryLineCountMismatch,
                "required": false
            },
            "promptError": {
                "type": "string",
                "title": t("Prompt: Error / Retry instruction"),
                "default": defaultConfig.promptError,
                "required": false
            },
            "customParameters": {
                type: "array",
                items: {
                    type: "object",
                    title: t("Custom Parameter"),
                    properties: {
                        key: { type: "string", title: t("Key") },
                        value: { type: "string", title: t("Value") },
                        type: {
                            type: "string",
                            title: t("Type"),
                            enum: ["string", "number", "boolean", "javascript"],
                            description: t("Type of the value. For <b>javascript</b>, the value is evaluated as JavaScript code (scope: <code>window</code>).")
                        },
                    }
                }
            },
            "dropParameters": {
                "type": "json",
                "description": t("Drop parameters that will not be sent to the API. Some providers reject unknown/unsupported request parameters."),
                "default": []
            },
        },
        "form": [
            {
                type: "info",
                content: t("This add-on proofreads existing translations (grammar, formatting, line breaks, inline tags) through any service that supports the OpenAI Chat Completion API.")
            },
            {
                "type": "fieldset",
                "title": t("OpenAI API settings"),
                "items": [{
                    "type": "tabs",
                    "id": "prOpenAITab",
                    "items": [
                        {
                            "title": t("General"),
                            "type": "tab",
                            "items": [
                                {
                                    "key": "baseUrl",
                                    "onChange": function(evt) {
                                        thisEngine.update("baseUrl", $(evt.target).val());
                                    }
                                },
                                {
                                    "key": "apiKey",
                                    "type": "password",
                                    "onChange": function(evt) {
                                        thisEngine.update("apiKey", $(evt.target).val());
                                    }
                                },
                                {
                                    "key": "model",
                                    "type": "combobox",
                                    "onChange": function(evt) {
                                        thisEngine.update("model", $(evt.target).val());
                                    }
                                },
                                {
                                    "type": "button",
                                    "title": t("Explore more models"),
                                    "onClick": async function(evt) {
                                        const $elm = $(evt.target);
                                        const MM = require("www/addons/basicUtils/ai/ModelManager.js");
                                        const selectedModel = await MM.openModelSelector();
                                        if (!selectedModel) return;
                                        if (thisEngine.getOptions("baseUrl")?.includes("api.openai.com")) {
                                            selectedModel.id = selectedModel.id.replace("openai/", "");
                                        }
                                        $elm.closest("fieldset").find("input[name=model]").val(selectedModel.id);
                                        thisEngine.update("model", selectedModel.id);
                                    }
                                }
                            ]
                        },
                        {
                            "title": t("Templates"),
                            "type": "tab",
                            "items": [
                                {
                                    "key": "templateLanguage",
                                    "titleMap": {
                                        "english": t("English (default)"),
                                        "spanish": t("Español")
                                    },
                                    "onChange": function(evt, node) {
                                        var value = $(evt.target).val();
                                        thisEngine.update("templateLanguage", value);

                                        var languageTemplates = promptTemplates[value];
                                        if (!languageTemplates) return;

                                        var win = evt.target[0].ownerDocument.defaultView;
                                        var conf = win.confirm(t("Do you want to load the built-in prompt templates for this language? This will overwrite your current System Message, Sample dialogue, Body message, and Retry prompt fields."));
                                        if (!conf) return;

                                        var templateKeys = ["systemMsgTemplate", "sampleDialog", "bodyMsgTemplate", "promptRetryRowCountMismatch", "promptRetryLineCountMismatch", "promptError"];
                                        templateKeys.forEach(function(key) {
                                            thisEngine.update(key, languageTemplates[key]);
                                            var fieldNode = node.getNodeByKey(key);
                                            if (fieldNode) fieldNode.setValue(languageTemplates[key]);
                                        });
                                    }
                                },
                                {
                                    "key": "systemMsgTemplate",
                                    "type": "ace",
                                    "aceMode": "text",
                                    "aceTheme": "twilight",
                                    "width": "100%",
                                    "height": "160px",
                                    "wrap": true,
                                    "onChange": function(evt) {
                                        thisEngine.update("systemMsgTemplate", $(evt.target).val());
                                    }
                                },
                                {
                                    "type": "html",
                                    "value": t("<h2>Sample dialogue</h2><p>Write a sample of a good proofreading exchange to help the model understand the expected input/output shape.</p>")
                                },
                                {
                                    "type": "tabarray",
                                    "draggable": false,
                                    "items": {
                                        "type": "section",
                                        "items": [
                                            { "key": "sampleDialog[].user", "type": "ace", "height": "120px" },
                                            { "key": "sampleDialog[].assistant", "type": "ace", "height": "120px" },
                                        ]
                                    },
                                    "onChange": function() {
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
                                        thisEngine.update("bodyMsgTemplate", $(evt.target).val());
                                    }
                                },
                                {
                                    "type": "fieldset",
                                    "title": t("Retry prompts"),
                                    "items": [
                                        {
                                            "key": "promptRetryRowCountMismatch",
                                            "type": "ace", "aceMode": "text", "aceTheme": "twilight",
                                            "width": "100%", "height": "90px", "wrap": true,
                                            "onChange": function(evt) { thisEngine.update("promptRetryRowCountMismatch", $(evt.target).val()); }
                                        },
                                        {
                                            "key": "promptRetryLineCountMismatch",
                                            "type": "ace", "aceMode": "text", "aceTheme": "twilight",
                                            "width": "100%", "height": "90px", "wrap": true,
                                            "onChange": function(evt) { thisEngine.update("promptRetryLineCountMismatch", $(evt.target).val()); }
                                        },
                                        {
                                            "key": "promptError",
                                            "type": "ace", "aceMode": "text", "aceTheme": "twilight",
                                            "width": "100%", "height": "110px", "wrap": true,
                                            "onChange": function(evt) { thisEngine.update("promptError", $(evt.target).val()); }
                                        },
                                    ]
                                },
                            ]
                        },
                        {
                            "title": t("Advanced"),
                            "type": "tab",
                            "items": [
                                {
                                    "key": "maxTokens", "type": "range", "step": 1, "indicator": true,
                                    "onChange": function(evt) { thisEngine.update("maxTokens", parseInt($(evt.target).val())); }
                                },
                                {
                                    "key": "reasoningEffort", "type": "select",
                                    "titleMap": {
                                        "": t("Auto / service default"),
                                        "none": t("None (disable reasoning)"),
                                        "minimal": t("Minimal"),
                                        "low": t("Low"),
                                        "medium": t("Medium"),
                                        "high": t("High"),
                                        "xhigh": t("Extra high"),
                                        "max": t("Maximum")
                                    },
                                    "onChange": function(evt) { thisEngine.update("reasoningEffort", $(evt.target).val()); }
                                },
                                {
                                    "key": "temperature", "type": "range", "step": 0.1, "indicator": true,
                                    "onChange": function(evt) { thisEngine.update("temperature", parseFloat($(evt.target).val())); }
                                },
                                {
                                    "key": "top_p", "type": "range", "step": 0.1, "indicator": true,
                                    "onChange": function(evt) { thisEngine.update("top_p", parseFloat($(evt.target).val())); }
                                },
                                {
                                    "key": "frequencyPenalty", "type": "range", "step": 0.1, "indicator": true,
                                    "onChange": function(evt) { thisEngine.update("frequencyPenalty", parseFloat($(evt.target).val())); }
                                },
                                {
                                    "key": "presencePenalty", "type": "range", "step": 0.1, "indicator": true,
                                    "onChange": function(evt) { thisEngine.update("presencePenalty", parseFloat($(evt.target).val())); }
                                },
                                {
                                    "key": "useJsonSchema", "inlinetitle": t("Use JSON Schema"),
                                    "onChange": function(evt) { thisEngine.update("useJsonSchema", $(evt.target).prop("checked")); }
                                }
                            ]
                        },
                        {
                            "title": t("Custom Parameters"),
                            "type": "tab",
                            "items": [
                                {
                                    "type": "tabarray",
                                    "items": {
                                        "type": "section",
                                        "legend": "{{idx}}. {{value}}",
                                        "items": [
                                            { "key": "customParameters[].key", "valueInLegend": true },
                                            { "key": "customParameters[].value" },
                                            {
                                                "key": "customParameters[].type",
                                                "type": "select",
                                                "titleMap": { "string": "String", "number": "Number", "boolean": "Boolean", "javascript": "JavaScript" },
                                            },
                                        ]
                                    },
                                    "onChange": function() {
                                        thisEngine.update("customParameters", this.node.getValue());
                                    }
                                },
                                {
                                    "key": "dropParameters",
                                    "title": t("Drop Parameters"),
                                    "type": "tag",
                                    "onChange": function() {
                                        thisEngine.update("dropParameters", this.getValue() || []);
                                    }
                                },
                            ]
                        },
                    ]
                }]
            },
            {
                "type": "fieldset",
                "title": t("Batch Proofreading Setting"),
                "items": [
                    {
                        "key": "batchTimeOut",
                        "onChange": function(evt) { thisEngine.update('batchTimeOut', parseInt($(evt.target).val())); }
                    },
                    {
                        "key": "batchDelay",
                        "onChange": function(evt) { thisEngine.update('batchDelay', parseInt($(evt.target).val())); }
                    },
                    {
                        "key": "maxRequestLength",
                        "onChange": function(evt) { thisEngine.update('maxRequestLength', parseInt($(evt.target).val())); }
                    },
                    {
                        "key": "maxConcurrentRequest",
                        "onChange": function(evt) { thisEngine.update('maxConcurrentRequest', parseInt($(evt.target).val())); }
                    },
                    {
                        "key": "rowLimitPerBatch",
                        "onChange": function(evt) { thisEngine.update('rowLimitPerBatch', parseInt($(evt.target).val())); }
                    },
                    {
                        "key": "preserveInvalidReturnedRows",
                        "inlinetitle": t("Preserve invalid returned rows"),
                        "onChange": function(evt) { thisEngine.update('preserveInvalidReturnedRows', $(evt.target).prop("checked")); }
                    }
                ]
            },
            {
                "type": "fieldset",
                "title": t("Retries and Refinement"),
                "items": [
                    {
                        "key": "maxRetries",
                        "onChange": function(evt) {
                            var raw = $(evt.target).val();
                            if (raw === "" || raw === null || typeof raw === "undefined") return thisEngine.update('maxRetries', null);
                            var value = parseInt(raw);
                            thisEngine.update('maxRetries', Number.isNaN(value) ? null : value);
                        }
                    },
                    {
                        "key": "retryIfRowCountMismatch",
                        "inlinetitle": t("Retry when the number of proofread rows doesn't match the input"),
                        "onChange": function(evt) { thisEngine.update('retryIfRowCountMismatch', $(evt.target).prop("checked")); }
                    },
                    {
                        "key": "retryIfLineCountMismatch",
                        "inlinetitle": t("Retry when the number of lines for each row doesn't match"),
                        "onChange": function(evt) { thisEngine.update('retryIfLineCountMismatch', $(evt.target).prop("checked")); }
                    },
                ]
            },
            {
                "key": "escapeAlgorithm",
                "titleMap": {
                    "": t("Default"),
                    "JSTemplateCloaking": t("JavaScript template cloaking"),
                    "HTMLCloaking": t("HTML cloaking"),
                    "HTMLCloakingWrapped": t("HTML cloaking (wrapped)"),
                    "XMLCloaking": t("XML cloaking"),
                    "JSONCloaking": t("JSON cloaking"),
                    "JSONObjectCloaking": t("JSON object cloaking"),
                    "none": t("None (no escaping)")
                },
                "onChange": function(evt, node) {
                    var value = $(evt.target).val();
                    thisEngine.update("escapeAlgorithm", value);

                    // The escape algorithm changes the wire format of ORIGINAL/CURRENT TRANSLATION
                    // (e.g. JSON array vs JSON object vs <p>/<hr id="n"> wrapped HTML), so the
                    // sampleDialog few-shot example needs to be swapped to match -- otherwise the
                    // example shown to the model contradicts the actual request format.
                    const samplePromptPreset = {
                        "JSONCloaking": defaultConfig.sampleDialog,
                        "JSONObjectCloaking": [
                            {
                                "user": `Proofread these \${LANG_TO} translations:\nORIGINAL:\n{"0":"それはいいですね","1":"情報\\nありがとうございます。"}\nCURRENT TRANSLATION:\n{"0":"That's great isnt it","1":"Information\\nThank you  you."}`,
                                "assistant": `{"proofread": ["That's great, isn't it?", "Information\\nThank you."]}`
                            },
                            {
                                "user": "No good! \nI sent you an object with 2 members, but you returned an array of 3 texts.\nYou must return the EXACT same number of proofread lines. Try again.",
                                "assistant": `{"proofread": ["That's great, isn't it?", "Information\\nThank you."]}`
                            }
                        ],
                        "HTMLCloakingWrapped": [
                            {
                                "user": `Proofread these \${LANG_TO} translations:\nORIGINAL:\n<p>Hello <hr id="1">World<hr id="2">!</p>\n<p>Gold: <hr id="3"></p>\nCURRENT TRANSLATION:\n<p>Helo <hr id="1">World<hr id="2"></p>\n<p>Golld: <hr id="3"></p>`,
                                "assistant": `{"proofread": ["Hello <hr id=\\"1\\">World<hr id=\\"2\\">!", "Gold: <hr id=\\"3\\">"]}`
                            },
                            {
                                "user": "No good! \nI sent you 2 paragraphs, but you returned 3 texts.\nYou must return the EXACT same number of proofread lines, one per paragraph. Try again.",
                                "assistant": `{"proofread": ["Hello <hr id=\\"1\\">World<hr id=\\"2\\">!", "Gold: <hr id=\\"3\\">"]}`
                            }
                        ],
                    }

                    if (!value || !samplePromptPreset[value]) return;
                    const win = evt.target[0].ownerDocument.defaultView;
                    const conf = win.confirm(t("Do you want to load the sample dialogue preset for the selected escape algorithm? This will overwrite your existing sample dialogue."));
                    if (!conf) return;

                    const sampleDialogNode = node.getNodeByKey("sampleDialog");
                    if (!sampleDialogNode) {
                        console.warn("sampleDialog node not found");
                        return;
                    }
                    thisEngine.update("sampleDialog", samplePromptPreset[value]);

                    sampleDialogNode.setValue(samplePromptPreset[value]);
                }
            },
        ]
    }
},
    defaultConfig
);

thisAddon.engine = thisEngine;

// Batch-only options. The normal proofreader configuration remains on the engine's
// settings page; this form follows ChatGPT's batchTranslationOptions layout and is
// rendered in the separate "Additional Options" section of the proofreader dialog.
thisEngine.batchProofreadingOptions = function() {
    return {
        schema: {
            // general
            alwaysSparateFile: {
                type: "boolean",
                title: t("Always separate file"),
                description: t("Always process each file in separate proofreading batches. This keeps one file's context from being mixed with another file."),
                default: false
            },
            addActorName: {
                type: "boolean",
                title: t("Add actor name"),
                description: t("Append the actor name to the proofreading context. This helps the proofreader keep consistent pronouns and dialogue tone."),
                default: false
            },
            // glossary
            useActorReference: {
                type: "boolean",
                title: t("Load Actor Reference as Glossary"),
                description: t("Load matching Actor Reference entries as a glossary for each proofreading batch. This can improve character-name and pronoun consistency.") +
                    t(" Only actors present in the current batch are included.") +
                    t("<br />⚠️The glossary is inserted into the system prompt automatically when this option is enabled."),
                default: false
            },
            actorReferenceTranslationColumn: {
                type: "string",
                title: t("Actor Reference Translation Column"),
                description: t("Column containing the translated actor name used in the glossary."),
                default: ""
            },
            actorReferenceInfoColumn: {
                type: "string",
                title: t("Actor's Information Column"),
                description: t("Column containing additional actor information such as gender, age, or role."),
                default: ""
            },
            // extra prompt
            extraPrompt: {
                type: "string",
                title: t("Extra Prompt"),
                description: t("Additional instructions appended after the system message and before the proofreading request.") +
                    t("<br />You can use the same template variables as the proofreader prompt, including ") +
                    "<code>${LANG_TO}</code>, <code>${SOURCE_TEXT}</code>, <code>${CURRENT_TRANSLATION}</code>, <code>${ACTOR_INFO}</code>, and <code>${CONTEXT}</code>.",
                default: ""
            }
        },
        form: [
            {
                type: "fieldset",
                title: t("General Settings"),
                items: [
                    {
                        key: "alwaysSparateFile",
                        inlinetitle: t("Always separate file for each batch")
                    },
                    {
                        key: "addActorName",
                        inlinetitle: t("Append actor name to the proofreading context")
                    }
                ]
            },
            {
                type: "fieldset",
                title: t("Glossary"),
                items: [
                    {
                        type: "html",
                        value: t("<h2>Glossary</h2>") +
                            t("<p>Load only the relevant actor entries into the proofreading prompt. This helps preserve character names, pronouns, and character-specific terminology.</p>")
                    },
                    {
                        key: "useActorReference",
                        inlinetitle: t("Load Actor Reference as Glossary")
                    },
                    {
                        key: "actorReferenceTranslationColumn",
                        type: "selectcolumn",
                        title: t("Actor Reference Translation Column")
                    },
                    {
                        key: "actorReferenceInfoColumn",
                        type: "selectcolumn",
                        title: t("The Column of Actor's Additional Information")
                    }
                ]
            },
            {
                type: "fieldset",
                title: t("Prompt"),
                items: [
                    {
                        key: "extraPrompt",
                        type: "ace",
                        aceMode: "text",
                        aceTheme: "twilight",
                        width: "100%",
                        height: "120px",
                        wrap: true
                    }
                ]
            }
        ]
    };
};

thisAddon.resolveState("optionIsLoaded");
