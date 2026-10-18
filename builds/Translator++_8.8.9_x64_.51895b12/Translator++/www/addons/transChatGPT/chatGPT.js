const thisAddon 	= this;
await thisAddon.until("optionIsLoaded");
const libGPT = require("www/js/LibGpt.js");
const thisEngine = thisAddon.engine;

thisEngine.useJqueryFetch = false; 

thisEngine.getDummyResponse = async function(texts, sl, tl) {
    var escapeAlgorithm = this.getOptions("escapeAlgorithm")
    if (!escapeAlgorithm) escapeAlgorithm = "JSONObjectCloaking";
    if (escapeAlgorithm == "JSONCloaking" || escapeAlgorithm == "JSONObjectCloaking") {
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

        if (escapeAlgorithm == "JSONObjectCloaking") {
            const obj = { translation: {} };
            for (let i = 0; i < result.length; i++) {
                obj.translation[i] = result[i];
            }
            return JSON.stringify(obj);
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

    // reasoning_effort is an optional Chat Completions parameter. Do not send
    // it when Auto is selected because support and accepted values are
    // model/provider-dependent. Unsupported providers are handled by the
    // existing retry path below, which removes rejected parameters.
    const reasoningEffort = this.getOptions("reasoningEffort");
    if (["none", "minimal", "low", "medium", "high", "xhigh", "max"].includes(reasoningEffort)) {
        requestBody.reasoning_effort = reasoningEffort;
    }

    // special behavior for JSON output cloaking
    const escapeAlgorithm = this.getOptions("escapeAlgorithm") || "JSONObjectCloaking";
    if (escapeAlgorithm == "JSONCloaking" || escapeAlgorithm == "JSONObjectCloaking") {
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
        let result;

        if (thisEngine.useJqueryFetch) {
            // in newest NWJS. mixed context cannot be debugged using fetch. But reported to be unstable.
            const ajaxPromise = $.ajax({
                url: baseUrl,
                method: reqHeader.method,
                headers: reqHeader.headers,
                data: reqHeader.body,
                dataType: 'json'
            });

            try {
                const responseData = await ajaxPromise;
                if (options?.batchInfo?.info) {
                    options.batchInfo.info.response = {
                        status: 200, // jQuery AJAX success implies 200 status
                        body: responseData,
                    };
                    result = options.batchInfo.info.response.body;
                } else {
                    result = responseData;
                }
            } catch (jqXHR) {
                // Handle error case - extract response data if available
                const errorData = jqXHR.responseJSON || {};
                if (options?.batchInfo?.info) {
                    options.batchInfo.info.response = {
                        status: jqXHR.status || 500,
                        body: errorData,
                    };
                    result = options.batchInfo.info.response.body;
                } else {
                    result = errorData;
                }
            }
        } else {
            const resp = await fetch(baseUrl, reqHeader);
            if (options?.batchInfo?.info) {
                options.batchInfo.info.response = {
                    status:resp.status,
                    body:await resp.json(),
                };
                result = options.batchInfo.info.response.body;
            } else {
                result =  await resp.json();
            }
        }

        

        // mitigate errors
        if (result?.[0]?.error) result.error = result[0].error; // for gemini
        if (result?.error) {
            console.log("%cError detected", "color:red", result);
            let errorMessage = result.error.message || result.error;
            if (typeof errorMessage !== "string") {
                errorMessage = JSON.stringify(errorMessage);
            }
            if (retryCount > 10) {
                console.warn("Retry count exceeded", retryCount);
                alert ("Error: "+errorMessage+"\n\nThe system has retried 10 times but still cannot resolve the error.\nSometime the problem will be resolved after retrying. Please try again later.");
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
            } else if (errorMessage.includes("response_format type is unavailable")) {
                // deepseek
                console.log("Deepseek-style error detected", result);

                this.setOption("useJsonSchema", false);
                requestBody = await thisEngine.adaptParameters(requestBody);

                const dropParameters = this.getOptions("dropParameters") || [];
                if (!dropParameters.includes("response_format")) {
                    dropParameters.push("response_format");
                    console.log("Dropping parameter response_format", result);
                    this.setOption("dropParameters", dropParameters);
                }
                requestBody = libGPT.dropParameters(requestBody, dropParameters);                        
                reqHeader.body = this.requestBodyToString(requestBody);

                console.log("Retrying without response_format", JSON.stringify(requestBody, null, 2));
                retryCount++;
                result = await fetchData();
            } else if (errorMessage.includes("Argument not supported")) {
                // GROK
                console.log("GROK-style error detected", errorMessage);
                // get parameter after ":"
                let param = errorMessage.split(":")[1].trim();
                param = common.camelToUnderlined(param);
                if (param) {
                    const dropParameters = this.getOptions("dropParameters") || [];
                    if (!dropParameters.includes(param)) {
                        dropParameters.push(param);
                        console.log("Dropping parameter", param);
                        this.setOption("dropParameters", dropParameters);
                        requestBody = libGPT.dropParameters(requestBody, dropParameters);
                        reqHeader.body = this.requestBodyToString(requestBody);
                        retryCount++;
                        result = await fetchData();
                    }
                }
            } else if (result.error.status == "INVALID_ARGUMENT") {
                // Gemini-style error: INVALID_ARGUMENT
                console.log("Gemini-style error detected", errorMessage);
                const matches = [...errorMessage.matchAll(/"([^"]*)"/g)].map(m => m[1]);
                console.log("Matched param:", matches);
                if (matches.length > 0) {
                    let hasChanged = false;
                    for (let i=0; i<matches.length; i++) {
                        const param = matches[i];
                        const dropParameters = this.getOptions("dropParameters") || [];
                        if (!dropParameters.includes(param)) {
                            dropParameters.push(param);
                            console.log("Dropping parameter", param);
                            hasChanged = true;
                        }
                    }
                    if (hasChanged) {
                        console.log("Retrying without the parameter", matches);
                        this.setOption("dropParameters", dropParameters);
                        requestBody = libGPT.dropParameters(requestBody, dropParameters);                        
                        reqHeader.body = this.requestBodyToString(requestBody);
                        retryCount++;
                        result = await fetchData();
                    }
                } else {
                    // unknown error
                    if (ui.log.isShown()) {
                        await ui.log.error(result.error.message);
                    } else {
                        console.error(result.error);
                        alert("Error: "+errorMessage);
                    }
                }
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


// thisEngine.fetch = async function(messages, options={}) {
//     console.log("%cMockup fetch", "color:orange", messages, options);
//     console.log("%cBatchInfo", "color:orange", JSON.stringify(options.batchInfo));
//     // get last element of messages as JSON

//     // generate dummy translation content based on the length of the message
//     let messageCount = options.batchInfo?.length;

//     // simulateing message length error
//     //messageCount = messageCount - 1;

//     let dummyContent = {translation:[]};
//     for (let i=0; i<messageCount; i++) {
//         dummyContent.translation.push("Dummy translation ${dat[23]}"+i);
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
//                         "refusal": null,
//                         "annotations": []
//                     },
//                     "logprobs": null,
//                     "finish_reason": "stop"
//                 }
//             ],
//             "usage": {
//                 "prompt_tokens": 471,
//                 "completion_tokens": 81,
//                 "total_tokens": 552,
//                 "prompt_tokens_details": {
//                 "cached_tokens": 0,
//                 "audio_tokens": 0
//                 },
//                 "completion_tokens_details": {
//                 "reasoning_tokens": 0,
//                 "audio_tokens": 0,
//                 "accepted_prediction_tokens": 0,
//                 "rejected_prediction_tokens": 0
//                 }
//             },
//             "service_tier": "default",
//             "system_fingerprint": "fp_34a54ae93c"
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

const responseFormatJsonSchemaObject = {
    "type": "json_schema",
    "json_schema": {
        "name": "translation_output_object",
        "schema": {
            "type": "object",
            "properties": {
                "translation": {
                    "type": "object",
                    "additionalProperties": {
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
        if (requestBody?.model?.startsWith("gpt-5")) {
            if (requestBody?.max_tokens) {
                const maxTokens = requestBody.max_tokens;
                requestBody.max_completion_tokens = maxTokens;
                delete requestBody.max_tokens;
            }
            if (requestBody?.temperature) {
                // drop temperature
                delete requestBody.temperature;
            }
        }
    } else if (requestBody?.model?.startsWith("grok-")) {
        // grok model, remove presence_penalty and frequency_penalty
        if (typeof requestBody?.presence_penalty !== "undefined") {
            delete requestBody.presence_penalty;
        }
        if (typeof requestBody?.frequency_penalty !== "undefined") {
            delete requestBody.frequency_penalty;
        }            
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
        // Force structured JSON output. Use schema based on selected escape algorithm.
        const escapeAlgorithm = this.getOptions("escapeAlgorithm");
        if (escapeAlgorithm == "JSONObjectCloaking") {
            requestBody.response_format = responseFormatJsonSchemaObject;
        } else {
            requestBody.response_format = responseFormatJsonSchema;
        }
        console.log("$c Using JSON schema", "color:orange", requestBody.response_format);
    }

    if (requestBody?.response_format && requestBody?.model == "deepseek-chat") {
        // deepseek does not support response_format JSON schema
        // https://api-docs.deepseek.com/guides/json_mode
        requestBody.response_format = { type: "json_object" }
    }

    return requestBody;
}

thisEngine.fetchTranslation = async function(texts, sl, tl, textObj, options) {
    console.log("%cChatGPT translation request", "color:green", texts, sl, tl, textObj, options);
    sl = sl || trans.getSl()
    tl = tl || trans.getTl()

    if (!Array.isArray(texts)) texts = [texts];
    
    const systemTemplateBase = this.getOptions("systemMsgTemplate") || "";
    const bodyTemplate = this.getOptions("bodyMsgTemplate");

    const context = (typeof options.batchInfo?.info?.contextsToString == "function")
        ? (options.batchInfo.info.contextsToString() || "")
        : "";

    const expectedMessageCount = textObj?.originalTexts?.length ?? (Array.isArray(texts) ? texts.length : 1);

    const baseParam = {...thisAddon.templateParameters, ...{
        SOURCE_TEXT             : texts.join("\n"),
        ESCAPE_ALGORITHM_PROMPT : thisAddon.getEscapeAlgorithmTemplateString(this.getOptions("escapeAlgorithm")),
        NEWLINE_STRING          : this.getOptions("lineSubstitute"),
        MESSAGE_COUNT           : expectedMessageCount,
        ACTOR_INFO              : BatchTranslate.getMentionedActor(textObj.originalTexts, options) || "N/A",
        CONTEXT                 : context || "N/A",
    }};

    const renderTemplate = (template, param) => {
        if (!template) return "";
        return thisAddon.compileTemplate(template, param);
    };

    const parseJsonSafe = (input) => {
        if (typeof input !== "string") return input;
        let s = input.trim();

        // strip fenced code blocks if the model returns them
        if (s.startsWith("```")) {
            s = s.replace(/^```[a-zA-Z0-9_-]*\s*/m, "");
            s = s.replace(/```\s*$/m, "");
            s = s.trim();
        }

        try {
            return JSON.parse(s);
        } catch (e) {
            // try extracting the outer-most JSON object/array
            const objStart = s.indexOf("{");
            const objEnd = s.lastIndexOf("}");
            const arrStart = s.indexOf("[");
            const arrEnd = s.lastIndexOf("]");

            const candidates = [];
            if (objStart >= 0 && objEnd > objStart) candidates.push(s.slice(objStart, objEnd + 1));
            if (arrStart >= 0 && arrEnd > arrStart) candidates.push(s.slice(arrStart, arrEnd + 1));

            for (const c of candidates) {
                try {
                    return JSON.parse(c);
                } catch (e2) {
                    // continue
                }
            }
            throw e;
        }
    };

    const extractTranslationRowsForValidation = (rawContent, escapeAlgorithm, expectedLen) => {
        const content = common.getFirstMdScriptContent(rawContent) || rawContent || "";

        // JSON based cloaking
        if (["JSONCloaking", "JSONObjectCloaking"].includes(escapeAlgorithm)) {
            const payload = parseJsonSafe(content);
            const translationMap = (payload && typeof payload === "object" && payload.translation)
                ? payload.translation
                : payload;

            if (Array.isArray(translationMap)) {
                return {
                    type: "array",
                    rows: translationMap,
                    returnedCount: translationMap.length,
                };
            }

            if (translationMap && typeof translationMap === "object") {
                const keys = Object.keys(translationMap)
                    .filter(k => /^\d+$/.test(String(k)))
                    .sort((a, b) => Number(a) - Number(b));

                const rows = keys.map(k => translationMap[k]);

                // If it looks like an indexed mapping, ensure it is contiguous when expectedLen is provided.
                if (typeof expectedLen === "number" && keys.length === expectedLen) {
                    for (let i = 0; i < expectedLen; i++) {
                        const has = Object.prototype.hasOwnProperty.call(translationMap, i)
                            || Object.prototype.hasOwnProperty.call(translationMap, String(i));
                        if (!has) {
                            return {
                                type: "object",
                                rows,
                                returnedCount: keys.length,
                                hasIndexGap: true,
                            };
                        }
                    }
                }

                return {
                    type: "object",
                    rows,
                    returnedCount: keys.length,
                };
            }

            return {
                type: "unknown",
                rows: [],
                returnedCount: 0,
            };
        }

        // HTMLCloakingWrapped (best effort)
        if (escapeAlgorithm === "HTMLCloakingWrapped") {
            const rows = [];
            const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
            let m;
            while ((m = re.exec(content)) !== null) {
                rows.push(m[1] ?? "");
            }
            return {
                type: "html",
                rows,
                returnedCount: rows.length,
            };
        }

        // Fallback: treat each line as a row
        const rows = String(content).split(/\r\n|\r|\n/);
        return {
            type: "text",
            rows,
            returnedCount: rows.length,
        };
    };

    const countLines = (s, lineSubstitute) => {
        // We accept both actual newlines and the configured substitute.
        const str = String(s ?? "");

        // at least 1 line even for empty string
        let maxLines = 1;

        // by actual newline
        maxLines = Math.max(maxLines, str.split(/\r\n|\r|\n/).length);

        if (lineSubstitute) {
            // If the model preserved NEWLINE_STRING, this will count correctly even without restoring.
            try {
                maxLines = Math.max(maxLines, str.split(String(lineSubstitute)).length);
            } catch (e) {
                // ignore
            }
        }
        return maxLines;
    };

    const validateTranslationOutput = (rawContent) => {
        const escapeAlgorithm = thisEngine.getOptions("escapeAlgorithm") || "JSONObjectCloaking";
        const lineSubstitute = thisEngine.getOptions("lineSubstitute");

        const extracted = extractTranslationRowsForValidation(rawContent, escapeAlgorithm, expectedMessageCount);

        const errors = [];

        // Row count mismatch validation
        const rowMismatchEnabled = Boolean(thisEngine.getOptions("retryIfRowCountMismatch"));
        if (rowMismatchEnabled) {
            if (extracted?.hasIndexGap) {
                errors.push(`Row index gap detected. Expected indexes 0..${expectedMessageCount - 1}, but got keys: ${extracted.rows.length}.`);
            }
            if ((extracted.returnedCount ?? 0) !== expectedMessageCount) {
                errors.push(`Row count mismatch. Expected ${expectedMessageCount}, but got ${extracted.returnedCount ?? 0}.`);
            }
        }

        // Line count mismatch validation (only meaningful when we have the correct number of rows)
        const lineMismatchEnabled = Boolean(thisEngine.getOptions("retryIfLineCountMismatch"));
        const canCheckLineMismatch = lineMismatchEnabled
            && (extracted.returnedCount === expectedMessageCount)
            && Array.isArray(textObj?.originalTexts)
            && Array.isArray(extracted.rows);

        if (canCheckLineMismatch) {
            const lineErrors = [];
            for (let i = 0; i < expectedMessageCount; i++) {
                const orig = textObj.originalTexts[i] ?? "";
                const translated = extracted.rows[i] ?? "";

                const origLines = countLines(orig, null);
                const translatedLines = countLines(translated, lineSubstitute);

                if (origLines !== translatedLines) {
                    lineErrors.push(`- Element ${i + 1}: original has ${origLines} line(s), the translated has ${translatedLines}.`);
                }
            }
            if (lineErrors.length) {
                errors.push({
                    type: "lineCountMismatch",
                    lineErrors,
                });
            }
        }

        const normalized = {
            hasError: false,
            returnedMessageCount: extracted.returnedCount ?? 0,
            lineErrors: [],
            errorMessages: [],
        };

        for (const e of errors) {
            if (typeof e === "string") normalized.errorMessages.push(e);
            if (typeof e === "object" && e?.type === "lineCountMismatch") {
                normalized.lineErrors.push(...(e.lineErrors || []));
                normalized.errorMessages.push("Line count mismatch detected.");
            }
        }

        normalized.hasError = normalized.errorMessages.length > 0;
        return normalized;
    };

    const buildConversation = ({ additionalMessages = [] } = {}) => {
        let systemTemplate = systemTemplateBase;

        // add extra prompt into the system message
        if (options?.translatorOptions?.extraPrompt) {
            if (systemTemplate) systemTemplate += "\n";
            systemTemplate += options.translatorOptions.extraPrompt;
        }

        const conversation = [];

        if (systemTemplate) {
            conversation.push({
                role: "system",
                content: renderTemplate(systemTemplate, baseParam),
            });
        }

        if (thisEngine.getOptions("sampleDialog")?.length) {
            for (let i = 0; i < thisEngine.getOptions("sampleDialog").length; i++) {
                const sample = thisEngine.getOptions("sampleDialog")[i];
                conversation.push({
                    role: "user",
                    content: renderTemplate(sample.user, baseParam),
                });
                conversation.push({
                    role: "assistant",
                    content: renderTemplate(sample.assistant, baseParam),
                });
            }
        }

        conversation.push({
            role: "user",
            content: renderTemplate(bodyTemplate, baseParam),
        });

        // Additional messages are appended after the base user translation request.
        // This is used for retries: we include the previously returned assistant output
        // followed by the retry prompt(s) that refer to it, repeated for each attempt.
        for (const msg of additionalMessages) {
            if (!msg) continue;
            if (typeof msg === "string") {
                conversation.push({ role: "user", content: msg });
                continue;
            }

            if (typeof msg === "object" && msg.role && typeof msg.content !== "undefined") {
                conversation.push({
                    role: String(msg.role),
                    content: String(msg.content),
                });
            }
        }

        // jailbreak must ALWAYS be last
        if (thisEngine.getOptions("enableJailbreak") && thisEngine.getOptions("jailbreakTemplate")) {
            conversation.push({
                role: "system",
                content: thisEngine.getOptions("jailbreakTemplate"),
            });
        }
        return conversation;
    };

    const maxRetriesOption = thisEngine.getOptions("maxRetries");
    const maxRetries = (maxRetriesOption === null || typeof maxRetriesOption === "undefined")
        ? 0
        : Math.max(0, parseInt(maxRetriesOption) || 0);

    let lastRawContent = "";
    const retryMessages = [];
    let gptResult;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const conversation = buildConversation({ additionalMessages: retryMessages });

        //var gptResult = await thisEngine.getDummyResponse(texts)
        gptResult = await thisEngine.fetch(conversation, options);

        if (!gptResult) throw new Error('Cannot fetch data');
        if (gptResult.error) {
            if (typeof options.onRequestError == "function") {
                options.onRequestError(gptResult.error);
            }
            throw new Error("Error fetching ChatGPT response: "+gptResult.error.message);
        }

        // get MD code content
        let result = gptResult?.choices[0]?.message?.content;
        result = common.getFirstMdScriptContent(result) || result;
        lastRawContent = result;

        // retry validation
        const shouldValidate = Boolean(thisEngine.getOptions("retryIfRowCountMismatch"))
            || Boolean(thisEngine.getOptions("retryIfLineCountMismatch"));

        if (!shouldValidate) break;

        let validation;
        try {
            validation = validateTranslationOutput(result);
        } catch (e) {
            // parsing errors - treat as non-retryable via this feature; allow normal downstream error handling
            console.warn("Validation failed (parse error), skipping retry validation.", e);
            break;
        }

        if (!validation?.hasError) break;

        if (attempt >= maxRetries) {
            console.warn("Translation validation failed but maxRetries reached.", validation);
            break;
        }

        // On next attempt, include what the model previously returned, followed by
        // the prompts that explain what was wrong with that output.
        retryMessages.push({ role: "assistant", content: lastRawContent });

        const retryParam = {
            ...baseParam,
            RETURNED_MESSAGE_COUNT: validation.returnedMessageCount,
            LINE_ERRORS: (validation.lineErrors || []).join("\n"),
            ERROR_MESSAGE: (validation.errorMessages || []).join("\n"),
            LANG_TO: tl,
        };

        if (Boolean(thisEngine.getOptions("retryIfRowCountMismatch"))
            && validation.returnedMessageCount !== expectedMessageCount) {
            retryMessages.push({
                role: "user",
                content: renderTemplate(thisEngine.getOptions("promptRetryRowCountMismatch"), retryParam),
            });
        }
        if (Boolean(thisEngine.getOptions("retryIfLineCountMismatch")) && validation.lineErrors?.length) {
            retryMessages.push({
                role: "user",
                content: renderTemplate(thisEngine.getOptions("promptRetryLineCountMismatch"), retryParam),
            });
        }
        retryMessages.push({
            role: "user",
            content: renderTemplate(thisEngine.getOptions("promptError"), retryParam),
        });
    }

    if (typeof options.getRawResponse == "function") {
        options.getRawResponse(lastRawContent);
    }    

    //const result = common.copyStartingWhiteSpaces(param.SOURCE_TEXT, gptResult?.choices[0]?.message?.content);
    return lastRawContent;
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
