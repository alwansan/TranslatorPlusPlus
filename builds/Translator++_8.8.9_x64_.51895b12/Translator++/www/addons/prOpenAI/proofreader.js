const thisAddon = this;
await thisAddon.until("optionIsLoaded");
const libGPT = require("www/js/LibGpt.js");
const thisEngine = thisAddon.engine;

thisEngine.useJqueryFetch = false;

/**
 * Filter and convert the request body to string
 * @param {object} requestBody
 * @returns {string}
 */
thisEngine.requestBodyToString = function(requestBody) {
    return JSON.stringify(requestBody);
}

/**
 * Send the chat completion request. Ported from www/addons/transChatGPT/chatGPT.js's `fetch()` --
 * this half of the logic (HTTP call + provider-quirk retry ladder for unsupported/renamed
 * parameters) is provider-shape-specific, not translation-specific, so it transfers unchanged.
 * @param {*} messages
 * @param {Object} [options]
 */
thisEngine.fetch = async function(messages, options = {}) {
    console.log("%c calling fetch", "color:orange", messages, options);
    var apiKey = this.getOptions("apiKey");
    var baseUrl = this.getOptions("baseUrl") || this.baseUrl;
    var model = this.getOptions("model") || this.model;

    let requestBody = {
        model: model,
        messages: messages,
        temperature: this.getOptions("temperature"),
        max_tokens: this.getOptions("maxTokens"),
        top_p: this.getOptions("top_p"),
        frequency_penalty: this.getOptions("frequencyPenalty"),
        presence_penalty: this.getOptions("presencePenalty"),
    }

    // Optional Chat Completions reasoning control. Omit Auto so providers
    // without reasoning support continue to receive the normal request.
    const reasoningEffort = this.getOptions("reasoningEffort");
    if (["none", "minimal", "low", "medium", "high", "xhigh", "max"].includes(reasoningEffort)) {
        requestBody.reasoning_effort = reasoningEffort;
    }

    const escapeAlgorithm = this.getOptions("escapeAlgorithm") || "JSONCloaking";
    if (["JSONCloaking", "JSONObjectCloaking"].includes(escapeAlgorithm)) {
        requestBody.response_format = { type: "json_object" }
    }

    requestBody = libGPT.renderCustomParameters(this.getOptions("customParameters"), requestBody);

    const dropParameters = this.getOptions("dropParameters");
    requestBody = libGPT.dropParameters(requestBody, dropParameters);

    requestBody = await thisEngine.adaptParameters(requestBody);

    let reqHeader = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "follow",
        body: this.requestBodyToString(requestBody)
    }

    if (apiKey) {
        reqHeader.headers["Authorization"] = "Bearer " + this.getOptions("apiKey")
    }

    if (options?.batchInfo?.info) {
        options.batchInfo.info.request = { ...reqHeader, ...{ body: requestBody } };
    }

    if (typeof options.onBeforeFetch == "function") options.onBeforeFetch(reqHeader);
    if (typeof this.checkOnlineStatus == "function") await this.checkOnlineStatus();

    let retryCount = 0;
    const fetchData = async () => {
        let result;
        const resp = await fetch(baseUrl, reqHeader);
        if (options?.batchInfo?.info) {
            options.batchInfo.info.response = { status: resp.status, body: await resp.json() };
            result = options.batchInfo.info.response.body;
        } else {
            result = await resp.json();
        }

        if (result?.[0]?.error) result.error = result[0].error; // for gemini
        if (result?.error) {
            let errorMessage = result.error.message || result.error;
            if (typeof errorMessage !== "string") errorMessage = JSON.stringify(errorMessage);
            if (retryCount > 10) {
                console.warn("Retry count exceeded", retryCount);
                alert("Error: " + errorMessage + "\n\nThe system has retried 10 times but still cannot resolve the error.\nSometimes the problem resolves after retrying. Please try again later.");
                return result;
            }
            console.log("%cError detected", "color:red", result.error);
            if (result.error.code == "unsupported_parameter" && result.error.param) {
                const dropParameters = this.getOptions("dropParameters") || [];
                dropParameters.push(result.error.param);
                this.setOption("dropParameters", dropParameters);
                requestBody = libGPT.dropParameters(requestBody, dropParameters);
                reqHeader.body = this.requestBodyToString(requestBody);
                retryCount++;
                result = await fetchData();
            } else if (errorMessage.includes("Unrecognized request argument supplied: ")) {
                const param = errorMessage.split(":")[1].trim();
                const dropParameters = this.getOptions("dropParameters") || [];
                dropParameters.push(param);
                this.setOption("dropParameters", dropParameters);
                requestBody = libGPT.dropParameters(requestBody, dropParameters);
                reqHeader.body = this.requestBodyToString(requestBody);
                retryCount++;
                result = await fetchData();
            } else if (errorMessage.includes("json_schema")) {
                this.setOption("useJsonSchema", true);
                requestBody = await thisEngine.adaptParameters(requestBody);
                reqHeader.body = this.requestBodyToString(requestBody);
                retryCount++;
                result = await fetchData();
            } else if (errorMessage.includes("response_format type is unavailable")) {
                this.setOption("useJsonSchema", false);
                requestBody = await thisEngine.adaptParameters(requestBody);
                const dropParameters = this.getOptions("dropParameters") || [];
                if (!dropParameters.includes("response_format")) {
                    dropParameters.push("response_format");
                    this.setOption("dropParameters", dropParameters);
                }
                requestBody = libGPT.dropParameters(requestBody, dropParameters);
                reqHeader.body = this.requestBodyToString(requestBody);
                retryCount++;
                result = await fetchData();
            } else if (errorMessage.includes("Argument not supported")) {
                let param = errorMessage.split(":")[1]?.trim();
                param = param ? common.camelToUnderlined(param) : param;
                if (param) {
                    const dropParameters = this.getOptions("dropParameters") || [];
                    if (!dropParameters.includes(param)) {
                        dropParameters.push(param);
                        this.setOption("dropParameters", dropParameters);
                        requestBody = libGPT.dropParameters(requestBody, dropParameters);
                        reqHeader.body = this.requestBodyToString(requestBody);
                        retryCount++;
                        result = await fetchData();
                    }
                }
            } else if (result.error.status == "INVALID_ARGUMENT") {
                const matches = [...errorMessage.matchAll(/"([^"]*)"/g)].map(m => m[1]);
                if (matches.length > 0) {
                    let hasChanged = false;
                    const dropParameters = this.getOptions("dropParameters") || [];
                    for (let i = 0; i < matches.length; i++) {
                        if (!dropParameters.includes(matches[i])) {
                            dropParameters.push(matches[i]);
                            hasChanged = true;
                        }
                    }
                    if (hasChanged) {
                        this.setOption("dropParameters", dropParameters);
                        requestBody = libGPT.dropParameters(requestBody, dropParameters);
                        reqHeader.body = this.requestBodyToString(requestBody);
                        retryCount++;
                        result = await fetchData();
                    }
                } else {
                    console.error(result.error);
                    alert("Error: " + errorMessage);
                }
            } else {
                console.error(result.error);
                alert("Error: " + errorMessage);
            }
        }

        return result;
    }

    let result = await fetchData();
    if (typeof options.onAfterFetch == "function") options.onAfterFetch(result);
    return result;
}

const responseFormatJsonSchema = {
    "type": "json_schema",
    "json_schema": {
        "name": "proofread_output",
        "schema": {
            "type": "object",
            "properties": {
                "proofread": { "type": "array", "items": { "type": "string" } }
            },
            "required": ["proofread"],
            "additionalProperties": false
        },
        "strict": true
    }
};

thisEngine.adaptParameters = async function(requestBody) {
    if (requestBody?.model?.includes("gpt-")) {
        if (requestBody?.model?.startsWith("gpt-5")) {
            if (requestBody?.max_tokens) {
                requestBody.max_completion_tokens = requestBody.max_tokens;
                delete requestBody.max_tokens;
            }
            if (requestBody?.temperature) delete requestBody.temperature;
        }
    } else if (requestBody?.model?.startsWith("grok-")) {
        delete requestBody.presence_penalty;
        delete requestBody.frequency_penalty;
    } else {
        if (requestBody?.max_tokens) {
            requestBody.max_completion_tokens = requestBody.max_tokens;
            delete requestBody.max_tokens;
        }
        if (requestBody?.temperature) delete requestBody.temperature;
        if (requestBody?.model?.startsWith("o1")) {
            if (requestBody?.messages?.length) {
                for (let i = 0; i < requestBody.messages.length; i++) {
                    if (requestBody.messages[i].role == "system") requestBody.messages[i].role = "user";
                }
            }
            if (requestBody?.response_format) requestBody.response_format = responseFormatJsonSchema;
        }
    }
    if (this.getOptions("useJsonSchema")) {
        requestBody.response_format = responseFormatJsonSchema;
    }
    if (requestBody?.response_format && requestBody?.model == "deepseek-chat") {
        requestBody.response_format = { type: "json_object" }
    }
    return requestBody;
}

/**
 * Escape a string array with the configured escape algorithm, reusing the shared static
 * registry `TranslatorEngine.escapeAlgorithms` via `ProofreaderEngine.prototype.preProcessText`.
 * Falls back to a plain JSON-stringified array (no-op unescape) when no algorithm is selected.
 * @param {String[]} texts
 * @returns {{text:String, unescape:(function(String):String)}}
 */
function escapeArray(texts) {
    const escapeAlgorithm = thisEngine.getOptions("escapeAlgorithm");
    if (escapeAlgorithm && TranslatorEngine.escapeAlgorithms[escapeAlgorithm]) {
        const codeEscape = thisEngine.preProcessText(texts);
        return {
            text: codeEscape.text ?? codeEscape.toTranslate,
            unescape: (s) => codeEscape.unescape(s)
        };
    }
    return { text: JSON.stringify(texts), unescape: (s) => s };
}

function parseJsonSafe(input) {
    if (typeof input !== "string") return input;
    let s = input.trim();
    if (s.startsWith("```")) {
        s = s.replace(/^```[a-zA-Z0-9_-]*\s*/m, "");
        s = s.replace(/```\s*$/m, "");
        s = s.trim();
    }
    try {
        return JSON.parse(s);
    } catch (e) {
        const objStart = s.indexOf("{");
        const objEnd = s.lastIndexOf("}");
        if (objStart >= 0 && objEnd > objStart) {
            try {
                return JSON.parse(s.slice(objStart, objEnd + 1));
            } catch (e2) { /* fallthrough */ }
        }
        throw e;
    }
}

/**
 * Extract the `proofread` array from the model's raw response content.
 * @returns {{rows:String[], returnedCount:Number}}
 */
function extractProofreadRows(rawContent) {
    const content = common.getFirstMdScriptContent(rawContent) || rawContent || "";
    const payload = parseJsonSafe(content);
    const rows = Array.isArray(payload?.proofread) ? payload.proofread : (Array.isArray(payload) ? payload : []);
    return { rows, returnedCount: rows.length };
}

function countLines(s, lineSubstitute) {
    const str = String(s ?? "");
    let maxLines = 1;
    maxLines = Math.max(maxLines, str.split(/\r\n|\r|\n/).length);
    if (lineSubstitute) {
        try { maxLines = Math.max(maxLines, str.split(String(lineSubstitute)).length); } catch (e) { /* ignore */ }
    }
    return maxLines;
}

function getActorGlossary(rowContext, batchOptions) {
    if (!batchOptions?.useActorReference || typeof trans === "undefined") return "N/A";
    const reference = trans.project?.files?.["Actor Reference"];
    if (!reference?.data) return "N/A";

    const names = new Set((rowContext || []).map((item) => item?.speaker).filter(Boolean));
    const lines = [];
    for (const row of reference.data) {
        const name = row?.[trans.keyColumn];
        if (!name || (names.size && !names.has(name))) continue;
        const translated = batchOptions.actorReferenceTranslationColumn;
        const info = batchOptions.actorReferenceInfoColumn;
        const translation = translated !== "" && translated != null ? row?.[translated] : "";
        const description = info !== "" && info != null ? row?.[info] : "";
        lines.push(name + (translation ? ` (${translation})` : "") + (description ? ` - ${description}` : ""));
    }
    return lines.join("\n") || "N/A";
}

/**
 * `LibGPT.getEscapeAlgorithmTemplateString` (www/js/LibGpt.js) hardcodes a `{"translation":[...]}`
 * reply-shape hint, since it's shared with translator engines. Proofreading replies use a
 * `{"proofread":[...]}` shape instead, so we keep our own small hint table rather than mutating
 * the shared `LibGPT.algorithmMsg` map (that map is also used by translator add-ons).
 * @param {String} algorithm
 * @returns {String}
 */
const escapeAlgorithmHint = {
    JSONCloaking: `The ORIGINAL and CURRENT TRANSLATION are JSON arrays. Reply in JSON of {"proofread":[...]} with the exact same number of elements, in the same order. \${dat[n]} placeholders mark inline tags -- copy them through unchanged, never translate or remove them.`,
    JSONObjectCloaking: `The ORIGINAL and CURRENT TRANSLATION are JSON. Reply in JSON of {"proofread":[...]}. \${dat[n]} placeholders mark inline tags -- copy them through unchanged.`,
    JSTemplateCloaking: "The text uses JavaScript template placeholders. Do not change variable names.",
    HTMLCloaking: "Preserve the HTML tags exactly.",
    HTMLCloakingWrapped: "Preserve the HTML tags and line breaks exactly.",
    XMLCloaking: "Preserve the XML tags exactly.",
};
function getEscapeAlgorithmHint(algorithm) {
    return escapeAlgorithmHint[algorithm] || "Preserve any inline code/tags exactly as they appear.";
}

/**
 * `fetchProofread` -- the override point required by `ProofreaderEngine.prototype.proofread`
 * (see www/js/ProofreaderEngine.js). Builds the prompt from `systemMsgTemplate`/`bodyMsgTemplate`,
 * sends it, validates/retries on row-count or line-count mismatch (mirrors
 * www/addons/transChatGPT/chatGPT.js's `fetchTranslation` retry loop), and returns the corrected
 * texts index-aligned with `payload.currentTranslations`.
 * @param {Object} payload - `{sourceTexts, currentTranslations, rowContext, tl}`
 * @param {Object} [options]
 * @returns {Promise<String[]>}
 */
thisEngine.fetchProofread = async function(payload, options = {}) {
    const sourceTexts = payload.sourceTexts || [];
    const currentTranslations = payload.currentTranslations || [];
    const rowContext = payload.rowContext || [];
    const tl = payload.tl || options.tl || (typeof trans !== "undefined" ? trans.getTl() : "en");
    const expectedCount = currentTranslations.length;
    const batchOptions = options.batchOptions || {};

    const sourceEscaped = escapeArray(sourceTexts);
    const translationEscaped = escapeArray(currentTranslations);

    const speakerInfo = rowContext.map((c, i) => {
        if (!c?.speaker || !batchOptions.addActorName) return null;
        return `Line ${i + 1}: ${c.speaker}`;
    }).filter(Boolean).join("\n") || "N/A";
    const contextInfo = rowContext.map((c, i) => c?.contextPath ? `Line ${i + 1}: ${Array.isArray(c.contextPath) ? c.contextPath.join(" > ") : c.contextPath}` : null).filter(Boolean).join("\n") || "N/A";

    const baseParam = {
        ...thisAddon.templateParameters,
        ...{
            LANG_TO: tl,
            SOURCE_TEXT: sourceEscaped.text,
            CURRENT_TRANSLATION: translationEscaped.text,
            ESCAPE_ALGORITHM_PROMPT: getEscapeAlgorithmHint(thisEngine.getOptions("escapeAlgorithm")),
            NEWLINE_STRING: thisEngine.getOptions("lineSubstitute"),
            MESSAGE_COUNT: expectedCount,
            ACTOR_INFO: speakerInfo,
            CONTEXT: contextInfo,
            ACTOR_GLOSSARY: getActorGlossary(rowContext, batchOptions),
            EXTRA_PROMPT: batchOptions.extraPrompt || "",
        }
    };

    const renderTemplate = (template, param) => template ? thisAddon.compileTemplate(template, param) : "";

    const buildConversation = ({ additionalMessages = [] } = {}) => {
        const conversation = [];
        const systemTemplate = thisEngine.getOptions("systemMsgTemplate") || "";
        if (systemTemplate) {
            let systemContent = renderTemplate(systemTemplate, baseParam);
            if (batchOptions.extraPrompt) systemContent += "\n\n" + batchOptions.extraPrompt;
            if (batchOptions.useActorReference) systemContent += "\n\nActor glossary:\n" + baseParam.ACTOR_GLOSSARY;
            conversation.push({ role: "system", content: systemContent });
        }

        const sampleDialog = thisEngine.getOptions("sampleDialog") || [];
        for (let i = 0; i < sampleDialog.length; i++) {
            conversation.push({ role: "user", content: renderTemplate(sampleDialog[i].user, baseParam) });
            conversation.push({ role: "assistant", content: renderTemplate(sampleDialog[i].assistant, baseParam) });
        }

        conversation.push({ role: "user", content: renderTemplate(thisEngine.getOptions("bodyMsgTemplate"), baseParam) });

        for (const msg of additionalMessages) {
            if (!msg) continue;
            if (typeof msg === "string") { conversation.push({ role: "user", content: msg }); continue; }
            conversation.push({ role: String(msg.role), content: String(msg.content) });
        }
        return conversation;
    };

    const maxRetriesOption = thisEngine.getOptions("maxRetries");
    const maxRetries = (maxRetriesOption === null || typeof maxRetriesOption === "undefined") ? 0 : Math.max(0, parseInt(maxRetriesOption) || 0);

    let lastRawContent = "";
    const retryMessages = [];
    let extracted = { rows: [], returnedCount: 0 };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const conversation = buildConversation({ additionalMessages: retryMessages });
        const gptResult = await thisEngine.fetch(conversation, options);

        if (!gptResult) throw new Error("Cannot fetch data");
        if (gptResult.error) {
            if (typeof options.onRequestError == "function") options.onRequestError(gptResult.error);
            throw new Error("Error fetching proofreading response: " + gptResult.error.message);
        }

        let result = gptResult?.choices?.[0]?.message?.content;
        result = common.getFirstMdScriptContent(result) || result;
        lastRawContent = result;

        const shouldValidate = Boolean(thisEngine.getOptions("retryIfRowCountMismatch")) || Boolean(thisEngine.getOptions("retryIfLineCountMismatch"));
        try {
            extracted = extractProofreadRows(result);
        } catch (e) {
            console.warn("Could not parse proofreading response, skipping retry validation.", e);
            break;
        }
        if (!shouldValidate) break;

        const errors = [];
        if (thisEngine.getOptions("retryIfRowCountMismatch") && extracted.returnedCount !== expectedCount) {
            errors.push(`Row count mismatch. Expected ${expectedCount}, but got ${extracted.returnedCount}.`);
        }

        const lineErrors = [];
        if (thisEngine.getOptions("retryIfLineCountMismatch") && extracted.returnedCount === expectedCount) {
            const lineSubstitute = thisEngine.getOptions("lineSubstitute");
            for (let i = 0; i < expectedCount; i++) {
                const origLines = countLines(currentTranslations[i], null);
                const correctedLines = countLines(extracted.rows[i], lineSubstitute);
                if (origLines !== correctedLines) {
                    lineErrors.push(`- Line ${i + 1}: current translation has ${origLines} line(s), the proofread result has ${correctedLines}.`);
                }
            }
            if (lineErrors.length) errors.push("Line count mismatch detected.");
        }

        if (!errors.length) break;
        if (attempt >= maxRetries) {
            console.warn("Proofreading validation failed but maxRetries reached.", errors);
            break;
        }

        retryMessages.push({ role: "assistant", content: lastRawContent });
        const retryParam = {
            ...baseParam,
            RETURNED_MESSAGE_COUNT: extracted.returnedCount,
            LINE_ERRORS: lineErrors.join("\n"),
            ERROR_MESSAGE: errors.join("\n"),
        };
        if (thisEngine.getOptions("retryIfRowCountMismatch") && extracted.returnedCount !== expectedCount) {
            retryMessages.push({ role: "user", content: renderTemplate(thisEngine.getOptions("promptRetryRowCountMismatch"), retryParam) });
        }
        if (lineErrors.length) {
            retryMessages.push({ role: "user", content: renderTemplate(thisEngine.getOptions("promptRetryLineCountMismatch"), retryParam) });
        }
        retryMessages.push({ role: "user", content: renderTemplate(thisEngine.getOptions("promptError"), retryParam) });
    }

    if (typeof options.getRawResponse == "function") options.getRawResponse(lastRawContent);

    if (extracted.returnedCount !== expectedCount && !thisEngine.getOptions("preserveInvalidReturnedRows")) {
        // let the base ProofreaderEngine.proofread()'s ensureArrayElement() fall back to the
        // original (uncorrected) translations rather than writing a misaligned result.
        return currentTranslations.slice();
    }

    return extracted.rows.map((row, i) => translationEscaped.unescape(typeof row === "string" ? row : (currentTranslations[i] ?? "")));
}

$(document).ready(function() {
    thisEngine.init();
});
