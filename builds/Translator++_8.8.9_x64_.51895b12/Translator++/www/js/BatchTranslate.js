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
/**
 * @typedef {Object} TranslationInfo
 * @property {string} path - Path to the object.
 * @property {number} row - Row number.
 * @property {string} original - Original text, should not be changed.
 * @property {string} toTranslate - Text to be translated.
 * @property {string} [translation=""] - Translated text.
 * @property {Object} [info] - Additional information.
 */
const pLimit = require('p-limit');
const hardLimitConcurrentRequest = 30;
const common = require("www/js/common");

const batchDisplay = function(batch)  {
    if (!batch?.info) return "";
    const color = common.generateRandomHexColor(batch.info.index);
    return `<span style="color:${color}">[${batch.info.index + 1}/${batch.info.total}]</span>`;
}


class BatchItems extends Array {
    constructor(...args) {
        super(...args);
        Object.defineProperty(this, 'info', {
            value: {},
            writable: true,
            configurable: true,
            enumerable: false
        });
    }
}

/**
 * BatchTranslate class for handling batch translation.
 * @class
 * @example
 * 
```js
var BatchTranslate = require("www/js/BatchTranslate");
var batchTranslate = new BatchTranslate(trans.google, {
    ignoreTranslated: true,
});
await batchTranslate.batchTranslate();
```
 */
class BatchTranslate {
    constructor(translator, options) {
        this.translator = translator;
        this.options = options || {};
        this.info = {
            startAt: undefined
        };
        this.saveQueue = Promise.resolve();
        this.saveThrottleMs = 10000;
        this.lastSaveAt = 0;
        this.pendingSave = null;
        this.defaultFlow = [
            "translateWithReference",
            "beforeTranslateCommonRoutine",
            "translate",
            "afterTranslateCommonRoutine",
            "applyToGrid",
            "saveProject",
            "displayResult",
            "batchDelay"
        ];

        this.debugLevel = 0;
    }
}

BatchTranslate.beforeTranslateCommonRoutines = {
    /**
     * Collect context from the previous row
     * @param {BatchItems} batch 
     */
    contextCollector: async function (batch) {
        console.log("%cCollecting context...", "color:orange", arguments, this);
        // take the very first entry of the batch
        if (!batch?.length) return batch;

        // if context is disabled, skip
        if (!this.translator.getOptions('enableContext')) return batch;
        console.log("%cContext enabled", "color:orange");

        const contextCharLimit = this.translator.getOptions('contextCharacterLimit') || 2048;
        const firstItem = batch[0];
        const contexts = [];
        let charCount = 0;
        const transData = trans.getData(firstItem.path);
        for (let row = firstItem.row - 1; row >= 0; row--) {
            let cells = transData[row];
            if (!cells) continue;
            // calculate the char count
            const translation = trans.getTranslationFromRow(cells, trans.keyColumn) || "";
            charCount += cells[trans.keyColumn].length;
            charCount += translation.length;
            //console.log("---charCount: ", charCount, ", contextCharLimit: ", contextCharLimit);
            if (charCount > contextCharLimit) break;
            if (translation) {
                contexts.push({
                    original: cells[trans.keyColumn],
                    translation: translation
                })
            } else {
                contexts.push({
                    original: cells[trans.keyColumn]
                })
            }

        }
        // invert the context
        contexts.reverse();
        
        console.log("%cContexts:", "color:orange", contexts);
        // store the context into the batch.info.contexts
        batch.info.contexts = contexts;
        batch.info.contextsToString = function(format="json") {
            if (format == "original") {
                // return the list of original text
                return contexts.map((item) => item.original).join("\n");
            } else {
                return "```json\n"+JSON.stringify(this.contexts, null, 2)+"\n```";
            }

        }

        return batch;
    }
};

BatchTranslate.afterTranslateCommonRoutines = {};

BatchTranslate.addBeforeTranslateCommonRoutine = function (id, routine) {
    BatchTranslate.beforeTranslateCommonRoutines[id] = routine;
}

BatchTranslate.addAfterTranslateCommonRoutine = function (id, routine) {
    BatchTranslate.afterTranslateCommonRoutines[id] = routine;
}

BatchTranslate.removeBeforeTranslateCommonRoutine = function (id) {
    delete BatchTranslate.beforeTranslateCommonRoutines[id];
}

BatchTranslate.removeAfterTranslateCommonRoutine = function (id) {
    delete BatchTranslate.afterTranslateCommonRoutines[id];
}


/**
 * Get the actor glossary data.
 * @param {string} actorName - The actor name to get the glossary data.
 * @param {Object} options - The options for getting the actor glossary data.
 * @returns {Object} The actor glossary data.
 */
BatchTranslate.getActorGlossaryData = function(actorName, options={}) {
    console.log("%cgetActorGlossaryData", "color:cyan", actorName, options);
    if (!options.translatorOptions?.useActorReference) return;
    if (options.actorGlossaryData) {
        if (actorName) return options.actorGlossaryData?.actors[actorName];
        return options.actorGlossaryData; // use cached data
    }
    const actorReferencePath = options.translatorOptions?.actorReferencePath || "Actor Reference";
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
        result.actors[actorName].translation    = thisRow?.[options.translatorOptions.actorReferenceTranslationColumn];
        result.actors[actorName].info         = thisRow?.[options.translatorOptions.actorReferenceInfoColumn];
    }

    if (Object.keys(result.actors).length == 0) return;

    if (actorName) {
        return result.actors[actorName];
    }

    options.actorGlossaryData = result; // cache the data
    return result;
}

BatchTranslate.getMentionedActor = function(messages=[], options={}) {
    console.log("%cgetMentionedActor", "color:green", messages, options);
    const resultLines = [];
    if (!options.translatorOptions?.useActorReference) {
        console.log("actor reference is not used");
        return "";
    }

    const mentionedActors = {};
    // register from batchInfo
    console.log("Register from batchInfo");
    for (let i of options.batchInfo) {
        if (i.actorOriginal) mentionedActors[i.actorOriginal] = BatchTranslate.getActorGlossaryData(i.actorOriginal, options);
    }

    // register from messages
    const actorGlossaryData = BatchTranslate.getActorGlossaryData(undefined, options);
    console.log("actorGlossaryData", actorGlossaryData);
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


/**
 * Collection of the default procedures for batch translation.
 * Procedures are functions that handle the translation process in the translation flow.
 * A procedure is an async function that accept one parameter, the batch of translation data and returns batch translation info.
 */
BatchTranslate.procedures = {
    /**
     * Translate the given batch translation data with reference.
     * @param {BatchItems} batch - The batch of translation data.
     * @returns {Promise<BatchItems>} A promise that resolves to the translated batch.
     */
    translateWithReference: async function(batch) {
        if (!batch?.length) return batch;
        if (this.translator?.skipReferencePair) return batch;

        ui.log(`${batchDisplay(batch)} Translating with reference...`);
        let texts = batch.map((item) => item.toTranslate);
        let translations = await trans.translateByReference(texts);
        console.log("Translations:", translations);
        // assign back the translation to the batch
        for (let i = 0; i < batch.length; i++) {
            batch[i].toTranslate = translations?.[i] || batch[i].toTranslate;
        }

        return batch;
    },

    /**
     * Before translate common routine.
     * Contains a list of default routines to be executed before translation.
     * @param {BatchItems} batch - The batch of translation data.
     * @returns {Promise<BatchItems>} A promise that resolves to the translated batch.
     */
    beforeTranslateCommonRoutine: async function(batch) {
        for (let id in BatchTranslate.beforeTranslateCommonRoutines) {
            let routine = BatchTranslate.beforeTranslateCommonRoutines[id];
            if (typeof routine != "function") continue;
            await routine.call(this, batch);
        }
        return batch;
    },

    /**
     * After translate common routine.
     * Contains a list of default routines to be executed after translation.
     * @param {BatchItems} batch - The batch of translation data.
     * @returns {Promise<BatchItems>} A promise that resolves to the translated batch.
     */
    afterTranslateCommonRoutine: async function(batch) {
        for (let id in BatchTranslate.afterTranslateCommonRoutines) {
            let routine = BatchTranslate.afterTranslateCommonRoutines[id];
            if (typeof routine != "function") continue;
            await routine.call(this, batch);
        }
        return batch;
    },

    /**
     * Translate the given batch of translation data.
     * If translation is already available, skip the translation.
     * @param {BatchItems[]} batch - The batch of translation data.
     * @returns {Promise<BatchItems[]>} A promise that resolves to the translated batch.
     */
    // translate: async function(batch) {
    //     if (!batch?.length) return batch;
        
    //     let texts = batch.map((item) => item.toTranslate);
    //     let translations = await this.translator.translate(texts);
    //     console.log("Translations:", translations);
    //     // assign back the translation to the batch
    //     for (let i = 0; i < batch.length; i++) {
    //         batch[i].translation = translations?.translation?.[i];
    //     }
    
    //     console.log("Translated batch:", batch);
    //     return batch;
    // },
    translate: async function(batch) {
        if (!batch?.length) return batch;

        // Filter the items that need translation
        const itemsToTranslate = batch.filter(item => !item.translation);
        const texts = itemsToTranslate.map(item => item.toTranslate);
    
        // Perform translation only if there are texts to translate
        if (texts.length > 0) {
            console.log("%cTranslating texts:", "color:green;", texts);
            const percentage = ((batch.info.index + 1) / batch.info.total) * 100;
            await ui.log.progress(percentage, `Translating batch ${batch.info.index+1}/${batch.info.total}...`);
            const translations = await this.translator.translate(texts, {...this.options, ...{batchInfo: batch}});
            console.log("Translations:", translations);
    
            // Assign translations back to the appropriate items in the batch
            itemsToTranslate.forEach((item, index) => {
                item.translation = translations?.translation?.[index];
            });
        } else {
            console.log("No texts to translate in this batch, probably prefilled with cache");
            if (typeof this.translator.onEmptyBatch == "function") {
                await this.translator.onEmptyBatch(batch);
            }
        }

        console.log("Translated batch:", batch);
        return batch;
    },

    /**
     * Apply the translation to the grid.
     * @param {BatchItems[]} batch - The batch of translation data.
     * @returns {Promise<BatchItems[]>} A promise that resolves to the translated batch.
     */
    applyToGrid: async function(batch) {
        if (!batch?.length) return batch;
        await ui.log(`${batchDisplay(batch)} Applying translation into the grid...`);
        for (let item of batch) {
            const table = trans.getData(item.path);
            if (!table) continue;
            if (!table[item.row]) continue;

            if (this.options.overwrite == false) {
                if (table[item.row][this.options.targetColumn]) {
                    continue;
                }
            }

            table[item.row][this.options.targetColumn] = item.translation;
            item.info.isApplied = true;
        }
        return batch;
    },

    saveProject: async function(batch) {
        if (!batch?.length) return batch;
        if (!this.options.saveOnEachBatch) return batch;

        const now = Date.now();
        const elapsed = now - this.lastSaveAt;

        if (!this.pendingSave && elapsed >= this.saveThrottleMs) {
            const saveTask = (this.saveQueue || Promise.resolve())
                .catch(() => {})
                .then(async () => {
                    await ui.log(`${batchDisplay(batch)} Saving your project...`);
                    await trans.save();
                    this.lastSaveAt = Date.now();
                });

            this.saveQueue = saveTask;
            await saveTask;
            return batch;
        }

        if (!this.pendingSave) {
            const waitTime = Math.max(0, this.saveThrottleMs - elapsed);
            const pendingSave = (this.saveQueue || Promise.resolve())
                .catch(() => {})
                .then(async () => {
                    if (waitTime > 0) {
                        await common.wait(waitTime);
                    }
                    await ui.log(`${batchDisplay(batch)} Saving your project...`);
                    await trans.save();
                    this.lastSaveAt = Date.now();
                })
                .finally(() => {
                    if (this.pendingSave === pendingSave) {
                        this.pendingSave = null;
                    }
                });

            this.pendingSave = pendingSave;
            this.saveQueue = pendingSave;
        }

        await this.pendingSave;
        return batch;
    },

    displayResult: async function(batch) {
        console.log("Translated batch:", batch);
        return batch;
    },

    /**
     * Delay the execution for the next batch translation process, if any.
     * This procedure is useful for rate limiting the translation process.
     * Some endpoints may have rate limits, so this procedures will keeps you from being banned.
     * @param {BatchItems[]} batch - The batch of translation data.
     * @returns {Promise<BatchItems[]>} A promise that resolves to the translated batch.
     */
    batchDelay: async function(batch) {
        // delay the batch if it is not the last batch
        if (batch.info.index < batch.info.total - 1) {
            const batchDelay = this.translator.getOptions('batchDelay') || 1000;
            await ui.log(`${batchDisplay(batch)} Waiting for ${batchDelay} ms...`);
            await common.wait(batchDelay);
        }
        return batch;
    }

};

/**
 * Define a procedure for batch translation.
 * @param {string} procedureName - The name of the procedure.
 * @param {Function} procedure - The procedure function.
 */
BatchTranslate.defineProcedure = function (procedureName, procedure) {
    BatchTranslate.procedures[procedureName] = procedure;
}


/**
 * Run the procedure for the given batch.
 * @param {string} procedureName - The name of the procedure.
 * @param {TranslationInfo[]} batch - The batch of translation data.
 * @returns {Promise<TranslationInfo[]>} A promise that resolves to the translated batch.
 * @throws {Error} Throws an error if the procedure is not found.
 */
BatchTranslate.prototype.runProcedure = async function (procedureName, batch) {
    if (typeof BatchTranslate.procedures[procedureName] == "function") {
        // call the procedure function and ensure it returns the batch
        return (await BatchTranslate.procedures[procedureName].call(this, batch)) || batch;
    }

    throw new Error("Procedure " + procedureName + " not found.");
}

BatchTranslate.prototype.getFlow = async function () {
    return this.translator.getOptions('translationFlow') || this.defaultFlow;
}

/**
 * Generates translation batch data for the given translator and options.
 *
 * @async
 * @function
 * @param {Object} translator - The translator engine to be used for translation.
 * @param {Object} options - The options for generating the translation batch data.
 * @param {Function} [options.onFinished=function() {}] - Callback function to be executed when the process finishes.
 * @param {number} [options.keyColumn=0] - The column index containing the keys to be translated.
 * @param {boolean} [options.translateOther=false] - Flag indicating whether to translate other columns.
 * @param {boolean} [options.ignoreTranslated=false] - Flag indicating whether to ignore already translated rows.
 * @param {boolean} [options.overwrite=false] - Flag indicating whether to overwrite existing translations.
 * @param {boolean} [options.saveOnEachBatch=false] - Flag indicating whether to save after each batch.
 * @param {boolean} [options.alwaysSparateFile=false] - Flag indicating whether to always translate each file separately.
 * @param {string} [options.filterTagMode] - Mode for filtering tags ('blacklist' or 'whitelist').
 * @param {string[]} [options.filterTag] - Array of tags to filter rows.
 * @param {number} [options.targetColumn=options.keyColumn+1] - The column index where translations will be placed.
 * @param {number} [options.maxRequestLength=5000] - Maximum length of the request to the translator engine.
 * @param {string[]} [options.files] - Array of files to be processed. If not provided, defaults to checked or all files.
 * @param {object} [options.translatiorOptions] - Additional options for the translator engine.
 * @param {Object} trans - The current translation instance.
 * @returns {Promise<Array<Array<TranslationInfo>>>} A promise that resolves to a two-dimensional array containing the translation batch data.
 * @throws {Error} Throws an error if the translator engine is invalid.
 */
BatchTranslate.prototype.getTranslationBatchData = async function* (translator=this.translator, options=this.options) {
    translator = trans.getTranslatorEngine(translator);
    if (!translator) throw new Error("Invalid translator engine " + translator);
    options ||= {};
    options.onFinished ||= function () { };
    options.keyColumn = options.keyColumn || trans.keyColumn || 0;
    options.translatiorOptions ||= {};
    options.translateOther ||= false;
    options.ignoreTranslated ||= false;
    options.overwrite ||= false;
    options.saveOnEachBatch ||= false;
    options.alwaysSparateFile = options.alwaysSparateFile || options.translatiorOptions?.alwaysSparateFile || false;
    options.filterTagMode ||= undefined;
    options.filterTag ||= undefined;
    options.targetColumn ||= options.keyColumn + 1;
    options.maxRequestLength = options.maxRequestLength || translator.getOptions('maxRequestLength') || 5000;
    options.rowLimitPerBatch = options.rowLimitPerBatch || translator.getOptions('rowLimitPerBatch') || 1000;

    options.files ||= trans.getCheckedFiles();
    if (!options.files?.length) {
        options.files = trans.getAllFiles();
    }

    console.log("BatchTranslate options:", options);

    // Generator function to yield translation batches
    var currentBatches;
    var originalTexts;
    const resetBatches = () => {
        currentBatches = new BatchItems();
        originalTexts = [];
    }
    // initialize the batch
    resetBatches();

    for (let file of options.files) {
        if (options.alwaysSparateFile) {
            if (currentBatches.length) yield currentBatches;
            resetBatches();
        }

        console.log("Processing file", file);
        let currentData = trans.getData(file);
        if (!currentData?.length) continue;

        for (let i = 0; i < currentData.length; i++) {
            let thisRow = currentData[i];
            let currentSentence = thisRow[options.keyColumn];
            if (!thisRow?.[trans.keyColumn]) continue;
            if (currentSentence.trim().length == 0) continue;

            // skip according to tags
            if (options.filterTagMode == "blacklist") {
                if (trans.hasTags(options.filterTag, i, file)) continue;
            } else if (options.filterTagMode == "whitelist") {
                if (!trans.hasTags(options.filterTag, i, file)) continue;
            }

            // skip line that already translated
            if (options.ignoreTranslated) {
                if (trans.rowHasTranslation(currentData[i], options.keyColumn)) continue;
            }

            // skip line if cell is not empty & overwrite option is false
            if (options.overwrite == false) {
                if (thisRow[options.targetColumn]) {
                    continue;
                }
            }

            let translationInfo = {
                row: i,
                original: currentSentence,
                toTranslate: currentSentence,
                path: file,
                translation: "",
                info: {}
            }

            let escapedSentence = translator.escapeCharacter(currentSentence);
            originalTexts.push(escapedSentence);

            // calculate the current request length vs maxRequestLength
            if (originalTexts.join("").length >= options.maxRequestLength) {
                yield currentBatches;
                resetBatches();
            } else if (currentBatches.length >= options.rowLimitPerBatch) {
                yield currentBatches;
                resetBatches();
            }
            // store translationInfo into currentBatches
            currentBatches.push(translationInfo);
        }
    }
    if (currentBatches.length) yield currentBatches;
}

/**
 * Translate the given batch of translation data.
 * @param {TranslationInfo[]} batch 
 */
BatchTranslate.prototype.translate = async function(batch) {
    if (!batch?.length) return batch;
    
    let texts = batch.map((item) => item.original);
    let translations = await this.translator.translate(texts);
    console.log("Translations:", translations);
    // assign back the translation to the batch
    for (let i = 0; i < batch.length; i++) {
        batch[i].translation = translations?.translation?.[i];
    }

    console.log("Translated batch:", batch);
    return batch;
}

BatchTranslate.prototype.abort = async function() {
    if (!this.reject) return;
    this.aborted = true;
    this.reject("Aborted");
    await ui.log.progress(100, `Aborted`);
    trans.refreshGrid();
}

BatchTranslate.prototype.translateAll = async function(translator=this.translator, options=this.options) {
    console.log("%cCalling batchTranslate with translator", "color:aqua", translator, "and options", options);
    console.log("Calculating batch length...");

    let maxConcurrentRequest = options.maxConcurrentRequest || this.translator.getOptions('maxConcurrentRequest') || 1;
    // set hard limit of maxConcurrentRequest to hardLimitConcurrentRequest
    if (maxConcurrentRequest > hardLimitConcurrentRequest) {
        await ui.log(`Your concurrent request is capped at ${hardLimitConcurrentRequest}.`);
        maxConcurrentRequest = hardLimitConcurrentRequest;
    }
    const limit = pLimit(maxConcurrentRequest);

    this.info.startAt = Date.now();
    this.info.batchOptions = options;

    // generating resolver
    new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    });

    // call the generator function to get the batchLength
    let batchLength = 0;
    for await (const batch of this.getTranslationBatchData(translator, options)) {
        batchLength++;
    }

    await ui.log("Total batch length: " + batchLength);
    await ui.log("Number of concurrent request: " + maxConcurrentRequest);
    if (batchLength > 1) {
        await ui.log("Batch will be processed concurrently. The log of each batch will be displayed not in ordered manner... that's normal!");
    }
    this.info.totalBatch = batchLength;

    const flows = await this.getFlow();
    console.log("Current procedure:", flows);

    // Use the generator function

    const processOneBatch = async (batch) => {
        for (let procedure of flows) {
            if (this.aborted) return;
            await this.runProcedure(procedure, batch);
        }
        if (this.aborted) return;
    };

    // Process batches with p-limit
    const tasks = [];
    let batchIndex = 0;
    for await (const batch of this.getTranslationBatchData(translator, options)) {
        batch.info.total = batchLength;
        batch.info.index = batchIndex;
        console.log('Processing batch:', batch);
        tasks.push(limit(() => processOneBatch(batch)));
        batchIndex++;
    }
    
    // Wait for all tasks to complete
    await Promise.all(tasks);

    await ui.log(`Refreshing translation progress...`);
    trans.evalTranslationProgress();

    await ui.log.progress(100, `Completed`);
    console.log('All batches processed.');
    trans.refreshGrid();
    this.resolve();
};


module.exports = BatchTranslate;