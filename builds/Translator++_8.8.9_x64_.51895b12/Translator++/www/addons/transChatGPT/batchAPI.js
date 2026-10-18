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

const thisAddon = this;
const batchApi = {};
const tiktoken = require("js-tiktoken");
const csv = require("jquery-csv");

batchApi.openAiAPI = require(this.getRelativePath()+"/openAiAPI.js");


const getDefaultAPIKey = function() {
    if (!TranslatorEngine.getEngine("chatGPT")) return "";
    return TranslatorEngine.getEngine("chatGPT").getOptions("apiKey")
}

const getDefaultModel = function() {
    if (!TranslatorEngine.getEngine("chatGPT")) return "";
    return TranslatorEngine.getEngine("chatGPT").getOptions("model")
}

batchApi.openDialog = async function(def={}) {
    const self = this;
    const options = {
        "title": t("Translate with ChatGPT Batch API"),
    }
    const result = await ui.form({
        "id": "openai-batch-api-form",
        schema: {
            // Translator++ Settings
            // "apiKey": {
            //     "type": "string",
            //     "title": "Your OpenAI API Key",
            //     "description": "You can get OpenAI API Key after registering to the service. https://platform.openai.com/account/api-keys",
            //     "default": getDefaultAPIKey(),
            // },
            
            "model": {
                "type": "string",
                "title": t("Model"),
                "description": t(`The pre-trained model.`)+"<br />"
                    +t(`It seems that the OpenAI Batch API uses a slightly different model naming convention than the generally used API. Models used in the Batch API have a “-batch” prefix. For example, if you use <code>gpt-4.1-mini</code>, the model automatically becomes <code>gpt-4.1-mini-batch</code>.<br />
However, as of the time this add-on was created, batch models are not listed in OpenAI's model usage limits, which makes it impossible for users to use the Batch API if they've set the Model Usage filter to “Allow” (whitelist).<br />
This is likely a bug in the OpenAI UI that may be fixed in the future.<br />
So, make sure to set the usage limits in OpenAI to “Block” (blacklist) mode in order to use the Batch API.<br />
Click here to change the model's usage limits: https://platform.openai.com/settings/proj_xxx/limits
`),
                "default": getDefaultModel(),

            },
            "sourceColumn": {
                "type": "string",
                "title": t("Source Column"),
                "description": t("The column of the original texts you want to translate."),
            },
            "addActorName": {
                "type": "boolean",
                "title": t("Add actor name"),
                "description": t("Append actor name from row info to the translatable text. This will help the translators to keep track of the dialogue and pronouns. Translator++ will then removes the actor name from the translation result. This obviously will increase the cost of the translation."),
                "default": false,
            },

            "ignoreTranslated": {
                "type": "boolean",
                "title": t("Ignore if already translated"),
                "description": t("If this option is checked then Translator++ will ignore any row that already has translations on its column."),
                "default": false,
            },

            "filterTag": {
                "type": "json",
                "title": "Filter Tag",
            },

            // glossary
            "useActorReference": {
                "type": "boolean",
                "title": t("Load Actor Reference as Glossary"),
                "description": t("If checked, Translator++ will load the actor reference as glossary. This will help the translator to understand the context of the conversation. The actor reference is the name of the actor in the dialogue. This will be loaded as a glossary to the translator. This will increase the cost of the translation.")+
                        t("Only the characters that are exists in the conversation will be loaded as glossary for each batch item. Use the template command to load the actor reference in the prompt message."),
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

            // template
            "systemMsgTemplate": {
                "type": "string",
                "title": t("System Message Template"),
                "description": t("System message is the header of the message that will tell what is the role of your chatGPT assistant. This message will be sent as the very first message of every batch you send to chatGPT.") +
                    t("You can include the following variables with JavaScript's Template Literal style <span class='inlineCode'><b>${</b>VARIABLE<b>}</b></span><br>") +
                    t("Variables:<br>") +
                    "<ul>" +
                    t("<li>LANG_FROM : Source language</li>") +
                    t("<li>LANG_TO : Target language</li>") +
                    t("<li>LANG_FROM_FULL : Full source language name</li>") +
                    t("<li>LANG_TO_FULL : Full target language name</li>") +
                    t("<li>SOURCE_TEXT : Source text</li>") +
                    t("<li>ESCAPE_ALGORITHM_PROMPT : Pre-defined message of escape algorithm.</li>") +
                    t("<li>NEWLINE_STRING : String represents new line (Line substitute).</li>") +
                    t("<li>MESSAGE_COUNT : Number of messages in the batch.</li>") +
                    t("<li>ACTOR_INFO : Add information of the actors.</li>") +
                    t("<li>TITLE : Title of the game</li>") +
                    t("<li>ENGINE : Engine of the game</li>") +
                    t("<li>REFERENCE[object name] : Generate reference from Translator++ object. <br />Example : <code>REFERENCE[Common Reference]</code></li>") +
                    t("<li>CONTEXT : Include some previous lines as a context</li>") +

                    "<ul>",
                "required": true
            },
            "bodyMsgTemplate": {
                "type": "string",
                "title": t("Body Message Template"),
                "description": t("Template of the body of your chat."),
                "required": true
            },
            "sampleDialog": {
                "type": "array",
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
            }
          
            
        },
        form: [
            {
                "type": "info",
                "value": t(`The ChatGPT Batch API allows you to translate your project asynchronously at 50% lower costs, meaning you will receive the results of your translation <b style="color:red">within 24 hours</b> at <b style="color:red">half the normal cost</b>. This is particularly useful for large projects that do not require immediate translation results.`) + "<br />" +
                           t(` <br />Read more about the ChatGPT Batch API: https://platform.openai.com/docs/guides/batch .`),
            },
            {
                "type": "fieldset",
                "title": t("General Settings"),
                "items": [
                    {
                        "type": "info",
                        "value": t(`This form is using your existing ChatGPT configuration.<br>`) +
                                t(`You can change the configuration by going to the ChatGPT Translator settings in the options window.<br>`)+
                                t(`There you can set the API key, model, and other settings.<br />`)+
                                t(`<input type="button" href="#" onclick='ui.openOptionsWindow({focus: {menu: "chatGPT",find: "Your OpenAI API Key"}});' value="Open ChatGPT settings" />`),
                    },
                    // {
                    //     "key": "apiKey",
                    // },
                    {
                        "key": "model",
                        "type": "combobox",
                        "options": [
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
                        ]
                    },
        
                    {
                        "key": "sourceColumn",
                        "type": "selectcolumn",
                        
                    },

                    {
                        "key": "addActorName",
                        "inlinetitle": t("Append actor name to the translatable text"),
                    },
                    {
                        "key": "ignoreTranslated",
                        "inlinetitle": t("Ignore translated rows"),
                    },
                    {
                        "key": "filterTag",
                        "type": "colortag",
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
                    {
                        "key": "enableContext",
                        "inlinetitle": "Enable context",
                    },
                    {
                        "key": "contextCharacterLimit",
                    },                    
                ]
            },

            {
                "type": "fieldset",
                "title": t("Prompt Template"),
                "items": [
                    {
                        "type": "html",
                        "value": t("<h2>1. System Message</h2>")+
                                t("<p>Here you can explain to the assistant, what is their role.</p>")
                    },                                     
                    {
                        "key": "systemMsgTemplate",
                        "type": "ace",
                    },
                    {
                        "type": "html",
                        "value": t("<h2>2. Sample dialogue</h2>")+
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
                        }
                    },
                    {
                        "type": "html",
                        "value": t("<h2>3. Your actual prompt</h2>")+
                                t("<p>This is the actual prompt to the assistant.</p>")
                    },
                    {
                        "key": "bodyMsgTemplate",
                        "type": "ace",
                    },
                 

                ]
            },
            {
                "type": "warn",
                "value": t(`<h3>Overhead cost</h3>
                        Overhead cost is the cost of the prompt message that you send to the assistant without the actual translation texts. The cost is calculated based on the number of tokens in the prompt message. The more tokens you have, the higher the cost will be.<br>
                        <b>Current overhead cost:</b> <span class="overheadCost">0</span> tokens / request.`),
            },

            {
                "type" : "formcontrol",
                "presets": [
                    {
                        "name": "Test Data",
                        "file": "data/form/chatGPTBatchAPI/presets/default/sample.jsv"
                    }
                ]
            }

        ],
        onChange: function(elm, key, value) {
            console.log("%cChanged through outside onchange", "color: yellow", elm, key, value);
            console.log("%cthis", "color: yellow", this);
            const formvalue = this.ownerTree.root.getValue();
            const overheadCost = batchApi.estimateOverheadCost(formvalue);
            const $formRoot = $(this.ownerTree.root.el);
            $formRoot.find(".overheadCost").text(overheadCost.token);
        },
        onBeforeReset: async function(formTree) {
            console.log("onBeforeReset", formTree);
            const conf = confirm(t("Are you sure you want to reset the form?"));
            if (!conf) return false;
            await common.localStorage.delete("chatgpt-batch-form");
            formTree.formDesc.value = await self.getFormDefaultValue();
        },
        value : await this.getFormDefaultValue()
        
    }, options);

    console.log("result", result);
    return result;

}

batchApi.uploadBatch = async function(selectedFiles, options={}) {
    this.openAiAPI.apiKey = TranslatorEngine.getEngine("chatGPT").apiKey;
    
}


batchApi.dumpTranslatable = async function(selectedFiles, targetFile, parameters={}, options={}) {
    console.log("dumpTranslatable", arguments);
    options ||= {};
    if (parameters?.filterTag) {
        if (typeof parameters.filterTag.filterTag == "string") parameters.filterTag.filterTag = [parameters.filterTag.filterTag];
        parameters.filterTag.filterTagMode 	||= ""; 
    }

    const chatGPTEngine = trans.getTranslatorEngine("chatGPT");
    // get the configuration from translator engine if not provided
    options.maxRequestLength = options.maxRequestLength || chatGPTEngine.getOptions("maxRequestLength") || 10000;
    options.rowLimitPerBatch = options.rowLimitPerBatch || chatGPTEngine.getOptions("rowLimitPerBatch") || 10;
    
    selectedFiles ||= trans.getCheckedFiles();
    if (selectedFiles.length == 0) {
        selectedFiles = trans.getAllFiles();
    }
    
    console.log("selectedFiles", selectedFiles);

    //const batchLines = [];

    const writeLineToFile = async function(line, file = targetFile) {
        if (typeof line != "string") line = JSON.stringify(line);
        const result = await fs.promises.appendFile(file, line+"\n");
        return result;
    }

    var batchID = 0;
    const metadata = {};

    // cache of the actor glossary information
    const actorGlossaryData = undefined;
    const actorReferencePath = "Actor Reference";
    const getActorGlossaryData = function(actorName) {
        if (!parameters.useActorReference) return;
        if (actorGlossaryData) return actorGlossaryData;
        // load the actor glossary data
        const reference = trans.getObjectById(actorReferencePath);
        if (!reference) return;

        const result = {
            actors: {}
        }

        if (!reference.data) return;

        for (let i=0; i<reference.data.length; i++) {
            let thisRow = reference.data[i];
            let actorName = thisRow[trans.keyColumn];
            result.actors[actorName] = {};
            result.actors[actorName].name           = actorName;
            result.actors[actorName].translation    = thisRow?.[parameters.actorReferenceTranslationColumn];
            result.actors[actorName].info         = thisRow?.[parameters.actorReferenceInfoColumn];
        }

        if (Object.keys(result.actors).length == 0) return;

        if (actorName) {
            return result.actors[actorName];
        }

        return result;
    }

    const isActorMentioned = function(text) {
        const glossaryData = getActorGlossaryData();
        if (!glossaryData) return false;
        
        // compare the text with the actor list
        for (let actorName in glossaryData.actors) {
            if (text.includes(actorName)) return true;
        }
    }

    const getMentionedActor = function(messages=[], linesInfo=[]) {
        console.log("%cgetMentionedActor", "color:green", messages, linesInfo);
        const resultLines = [];
        if (!parameters.useActorReference) {
            console.log("actor reference is not used");
            return "";
        }

        const mentionedActors = {};
        // register from linesInfo
        for (let i of linesInfo) {
            if (i.aOriginal) mentionedActors[i.aOriginal] = getActorGlossaryData(i.aOriginal);
        }


        // register from messages
        const actorGlossaryData = getActorGlossaryData();
        let joinedMessages = messages.join("\n");
        for (let actorName in actorGlossaryData.actors) {
            if (joinedMessages.includes(actorName)) mentionedActors[actorName] = actorGlossaryData.actors[actorName];
        }

        console.log("mentionedActors", mentionedActors);
        // compile into record of line with format: actorName (translation) - Info
        for (let actorName in mentionedActors) {
            let thisActor = mentionedActors[actorName];
            if (!thisActor) continue;
            console.log("thisActor", thisActor);
            let translationBlock = thisActor?.translation ? ` (${thisActor.translation})` : "";
            let infoBlock = thisActor?.info ? ` - ${thisActor.info}` : "";
            let actorInfo = `${actorName}${translationBlock}${infoBlock}`;
            resultLines.push(actorInfo);
        }

        return resultLines.join("\n");
    }

    const getContext = function(filePath, upToRow) {
        // Returns a CSV table of previous lines up to upToRow (exclusive), limited by contextCharacterLimit
        if (!parameters.enableContext) return "";

        const contextCharLimit = parameters.contextCharacterLimit || 2048;
        const obj = trans.getObjectById(filePath);
        if (!obj || !obj.data) return "";

        let contextRows = [];
        let totalChars = 0;

        // Collect previous lines in reverse, starting from upToRow-1 down to 0
        for (let i = upToRow - 1; i >= 0; i--) {
            const row = obj.data[i];
            if (!row) continue;
            const actor = parameters.addActorName ? trans.getRowInfoText(i, false, filePath) : "";
            const original = row[trans.keyColumn] || "";
            // Prepare CSV row
            const csvRow = [i, actor, original];
            const csvLine = csvRow.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",");
            // Check if adding this line exceeds the char limit
            if (totalChars + csvLine.length > contextCharLimit) break;
            contextRows.unshift(csvLine); // Add to the beginning to keep order ascending
            totalChars += csvLine.length + 1; // +1 for newline
        }

        if (contextRows.length === 0) return "";

        // Header
        const header = `"row","actor","original"`;
        const csvTable = [header, ...contextRows].join("\n");
        return "```csv\n" + csvTable + "\n```";
    }

    const generateBatch = (messages=[], filePath, linesInfo=[], extraParam= {})=> {
        // Find the minimum row index in linesInfo to determine upToRow for context
        let upToRow = 0;
        if (Array.isArray(linesInfo) && linesInfo.length > 0) {
            upToRow = Math.min(...linesInfo.map(info => typeof info.r === "number" ? info.r : 0));
        }
        console.log("%cupToRow", "color:green", upToRow, linesInfo);

        // compiling template
        const chatGPTEngine = TranslatorEngine.getEngine("chatGPT");
        var param = {...thisAddon.templateParameters, ...{
            SOURCE_TEXT             : JSON.stringify(messages, undefined, 2),
            ESCAPE_ALGORITHM_PROMPT : thisAddon.getEscapeAlgorithmTemplateString(chatGPTEngine.getOptions("escapeAlgorithm")),
            NEWLINE_STRING          : chatGPTEngine.getOptions("lineSubstitute"),
            MESSAGE_COUNT           : messages.length.toString(),
            ACTOR_INFO              : getMentionedActor(messages, linesInfo) || "N/A",
            CONTEXT                 : getContext(filePath, upToRow) || "N/A", // now uses getContext
        }, ...extraParam};

        const batchLine = {
            "custom_id": "tpp-"+batchID++,
            "method": "POST",
            "url": "/v1/chat/completions",
            "body": {
                "model": parameters.model || chatGPTEngine.getOptions('model') || "gpt-3.5-turbo",
                "max_tokens": chatGPTEngine.getOptions('maxTokens') || 1000,
                "messages": [
                ],
                "response_format": {
                    "type": "json_object"
                }
                
            }
        };

        if (parameters.systemMsgTemplate) {
            batchLine.body.messages.push({
                "role": "system",
                "content": thisAddon.compileTemplate(parameters.systemMsgTemplate, param)
            });
        }

        if (parameters.sampleDialog?.length) {
            for (let i of parameters.sampleDialog) {
                batchLine.body.messages.push({
                    "role": "user",
                    "content": thisAddon.compileTemplate(i.user, param)
                });
                batchLine.body.messages.push({
                    "role": "assistant",
                    "content": thisAddon.compileTemplate(i.assistant, param)
                });
            }
        }

        batchLine.body.messages.push({
            "role": "user",
            "content": thisAddon.compileTemplate(parameters.bodyMsgTemplate, param)
        });

        metadata[batchLine.custom_id] = {
            path: filePath,
            info: linesInfo
        };
        console.log("batchLine", batchLine);
        return batchLine;
    }


    for (let filePath of selectedFiles) {
        let thisObj = trans.getObjectById(filePath);
        if (!thisObj) continue;
        if (!thisObj.data) continue;
        
        var currentLines = [];
        var linesInfo = [];
        var linesLength = 0;
        var lineCount = 0;

        for (let i=0; i<thisObj.data.length; i++) {
            let row = thisObj.data[i];
            let textToTranslate = thisObj.data[i][trans.keyColumn];
            if (!textToTranslate) continue;
            if (parameters.ignoreTranslated) {
                if (trans.isTranslatedRow(i, thisObj.data)) continue;
            }
            if (parameters?.filterTag?.filterTag?.length > 0 ) {
                let hasTag = trans.hasTags(parameters.filterTag.filterTag, i, filePath);
                if (parameters.filterTag?.filterTagMode == "whitelist") {
                    if (!hasTag) continue;
                } else { // other than whitelist always assume blacklist
                    if (hasTag) continue;
                }
            }


            let thisLine = textToTranslate;
            let thisLineInfo = {
                r: i,
            }

            // append actor name to actor info if addActorName is checked
            if (parameters.addActorName) {
                let actorName = trans.getRowInfoText(i, false, filePath);
                console.log(`%cAdd actor name: ${actorName}, row: ${i}, file: ${filePath}`, "color: yellow");

                if (actorName) {
                    thisLine = actorName + ": " + textToTranslate;
                    thisLineInfo.a = actorName;
                    thisLineInfo.aOriginal = trans.getRowInfoText(i, false, filePath, true);
                }
            }



            currentLines.push(thisLine);
            linesInfo.push(thisLineInfo);
            linesLength += thisLine.length;

            //if (lineCount >= 10 || linesLength >= 10000) {
            if (lineCount >= options.rowLimitPerBatch || linesLength >= options.maxRequestLength) {
                // let thisBatchLine = generateBatch(currentLines, linesInfo);
                await writeLineToFile(generateBatch(currentLines, filePath, linesInfo));
                currentLines = [];
                linesInfo = [];
                linesLength = 0;
                lineCount = 0;
            }
            lineCount++;

        }
        // collect the rest
        if (currentLines.length > 0) {
            await writeLineToFile(generateBatch(currentLines, filePath, linesInfo));
        }

    }

    // recalculate translation process
    //trans.evalTranslationProgress();

    return {
        metadata: metadata,
        targetFile: targetFile
    }
}

batchApi.calculateToken = function(text, options={}) {
    options ||= {};
    //const selectedModel = TranslatorEngine.getEngine("chatGPT").model || "gpt-3.5-turbo";
    const selectedModel = "gpt-3.5-turbo"; // let's make it simple for now
    const encoder = tiktoken.encodingForModel(selectedModel);
    if (!encoder) throw new Error("Model not supported:"+selectedModel);
    const tokens = encoder.encode(text);
    return tokens.length;
}

batchApi.estimateOverheadCost = function(formValue={}, options={}) {
    const result = {
        token: 0,
        cost: 0,
    }
    
    const sampleMsgs = [];
    if (formValue?.sampleDialog?.length == 0) {
        for (let i of formValue.sampleDialog) {
            sampleMsgs.push(i.user);
            sampleMsgs.push(i.assistant);
        }
    }

    const msgs = [];
    msgs.push(formValue.systemMsgTemplate);
    msgs.push(formValue.bodyMsgTemplate);
    msgs.push(...sampleMsgs);
    try {
        result.token = this.calculateToken(msgs.join("\n"));
    } catch (e) {
        console.warn("Error calculating token", e);
    }
    return result;
}
    

// batchApi.storeMetadata = async function(batchID, metadata, options={}) {
//     const basePath = "data/batch/metadata";
//     await common.mkDir(basePath);
//     await common.filePutContents(`${basePath}/${batchID}.json`, JSON.stringify(metadata, undefined, 2));
// }

// batchApi.loadMetadata = async function(batchID, options={}) {
//     const basePath = "data/batch/metadata";
//     const metadataFile = `${basePath}/${batchID}.json`;
//     if (!fs.existsSync(metadataFile)) return;
//     const metadata = await common.fileGetContents(metadataFile);
//     return JSON.parse(metadata);
// }

batchApi.getFormDefaultValue = async function() {
    var def = await common.localStorage.get("chatgpt-batch-form");
    if (!def) {
        def = {
            sourceColumn: 0,
            addActorName: false,
            ignoreTranslated: false,
            systemMsgTemplate: await common.fileGetContents(thisAddon.getRelativePath()+"/data/prompt-system.txt"),
            bodyMsgTemplate: await common.fileGetContents(thisAddon.getRelativePath()+"/data/prompt-body.txt"),
        }
    }

    return {
        sourceColumn: def.sourceColumn || 0,
        addActorName: def.addActorName,
        estimate: def.estimate,
        systemMsgTemplate: def.systemMsgTemplate,
        bodyMsgTemplate: def.bodyMsgTemplate,
        sampleDialog: def.sampleDialog || [
            {user: `["それはいいですね", "情報\\nありがとうございます。"]`, assistant: `{"translation": ["That's great", "Information", "Thank you"]}`},
            {user: `No good! \nI sent you array of 2, but you returned array of 3 texts.\nYou must translate with the EXACT same number of array member. Try again.`, assistant: `{"translation": ["That's great", "Thank you for the\\ninformation"]}`}
        ]
    }
}

batchApi.process = async function() {
    const handleError = function(msg) {
        alert(msg);
        ui.hideBusyOverlay();
        throw new Error(msg);
    }

    // var def = await common.localStorage.get("chatgpt-batch-form");
    // console.log("default value is", def);
    // if (!def) {
    //     def = await this.getFormDefaultValue();
    // }

    const params = await batchApi.openDialog();
    console.log("params", params);

    if (!params) return;

    const conf1 = confirm(t("Are you sure you want to process the batch?\nCost will be incurred for this operation."));
    if (!conf1) return;

    ui.showBusyOverlay();
    await common.localStorage.set("chatgpt-batch-form", params);

    const tempFile = nwPath.resolve(`data/batch/tpp-${trans.projectId}-${Date.now()}.jsonl`);
    await common.mkDir(nwPath.dirname(tempFile));
    await common.unlink(tempFile);
    const dumpResult = await batchApi.dumpTranslatable(trans.getCheckedFiles(), tempFile, params, {});
    console.log("dumped result", dumpResult);
    if (await common.getFileSize(tempFile) == 0) {
        console.log("no data to process");
        return handleError("No data to process");
    }
    

    // return console.warn("DEBUG: skipped uploading to openAI"); // for debugging purpose

    batchApi.openAiAPI.apiKey = params.apiKey || TranslatorEngine.getEngine("chatGPT").apiKey;
    if (!batchApi.openAiAPI.apiKey) {
        return handleError("OpenAI API Key is not set. Please set it in the ChatGPT settings.");
    }
    console.log("uploading to openAI");

    const remoteFile = await batchApi.openAiAPI.files.create({file: tempFile, purpose: "batch"});
    console.log("uploaded to openAI");
    if (!remoteFile?.id) {
        return handleError("Failed to upload to openAI");
    }
    
    const newBatch = await batchApi.openAiAPI.batches.create({input_file_id: remoteFile.id, metadata: {
        header: {
            title:trans.gameTitle,
            projectId: trans.projectId,
            engine:trans.gameEngine,
        },
        // save batchInfo to the file instead
        // batchInfo:dumpResult.metadata
    }});
    if (!newBatch?.id) {
        return handleError("Failed to create batch");
    }
    console.log("newBatch", newBatch);
    await batchApi.openAiAPI.batches.storeMetadata(newBatch.id, dumpResult.metadata);

    const conf = confirm(t("The batch is successfully created. Do you want to open the batch manager?"));
    if (!conf) return ui.hideBusyOverlay();
    await batchApi.openBatchManager();
    ui.hideBusyOverlay();
}

batchApi.openBatchManager = async function(id, options) {
	id 			= id || "chatGPT_BatchManager";
	options 	= options || {};
	options.id 	= options.id || id;

	options.workspaceType = "automation";
    await common.localStorage.set("chatgpt-batch-manager", common.clone(TranslatorEngine.getEngine("chatGPT")));	const {showModalDialog} = require("www/js/modalDialog.js");
	await showModalDialog(thisAddon.getRelativePath()+"/chatgpt-batch-manager/index.html", options, {id:id, width:800, height:600});
	console.log("script editor closed");
}

const buildFileSelectorMenu = function() {
    const menu = trans.fileSelectorMenu.withSelected.items.sendTo.items;
    menu.sendToChatGPTBatch = {
        name: t("OpenAI Batch API Queue"),
        icon: "context-menu-icon icon-chatgpt",
        callback: (key, opt) => {
            batchApi.process();
        }
    }
    console.log("%cadding menu", "color:aqua", menu);
}


thisAddon.batchApi = batchApi;
(async ()=> {
    await addonLoader.until("uiReady");
    await TranslatorEngine.until("chatGPT");
    batchApi.openAiAPI.apiKey = TranslatorEngine.getEngine("chatGPT").apiKey;

    buildFileSelectorMenu();
})()
