require("regexp-match-indices/auto");

var ui = window.ui || {
    log: async function() { console.log(...arguments) },
    logError: async function() { console.error(...arguments) }
};

/**
* CustomParser class for parsing scripts.
* @extends ParserBase
*/
class CustomParser extends require('www/js/ParserBase.js').ParserBase {
    /**
    * Creates an instance of CustomParser.
    * @param {string} script - The script to parse.
    * @param {object} options - Options for parsing.
    * @param {object} options.modelStr - Model string.
    * @param {object} options.model - Model object.
    * @param {function} callback - Callback function.
    */
    constructor(script, options, callback) {
        super(script, options, callback)

        this.modelStr   = options.modelStr || {};

        /**
         * The model data.
         * @type {object}
         */ 
        this.model      = options.model || {};
        //this.debugLevel = this.options.debugLevel || common.debugLevel();
        this.debugLevel = 0
        this.parsedData = [];

        /**
         * The transData object.
         * @type {object}
         * @property {Array} data - The data array.
         * @property {Array} context - The context array.
         * @property {Array} tags - The tags array.
         * @property {Array} parameters - The parameters array.
         * @property {object} indexIds - The indexIds object.
        */
        this.transData  = {
            data:[],
            context:[],
            tags:[],
            parameters:[],
            indexIds:{}
        };
        this.$elm = $("<div></div>");
    }
}
/**
* Event subscription method.
* @param {string} evt - Event name.
* @param {function} fn - Event handler function.
*/
CustomParser.prototype.on = function(evt, fn) {
    this.$elm.on(evt, fn)
}

/**
* Event unsubscription method.
* @param {string} evt - Event name.
* @param {function} fn - Event handler function.
*/
CustomParser.prototype.off = function(evt, fn) {
    this.$elm.off(evt, fn)
}

/**
* Event subscription method for a single occurrence.
* @param {string} evt - Event name.
* @param {function} fn - Event handler function.
*/
CustomParser.prototype.one = function(evt, fn) {
    this.$elm.one(evt, fn)
}

/**
* Triggers an event.
* @param {string} evt - Event name.
* @param {*} param - Event parameter.
*/
CustomParser.prototype.trigger = function(evt, param) {
    this.$elm.trigger(evt, param)
}

/**
* Sets the model.
* @param {object} model - Model object.
* @returns {object} The set model.
*/
CustomParser.prototype.setModel = function(model) {
    this.model = model || {};
    return this.model;
}

/**
* Gets the model.
* @returns {object} The model.
*/
CustomParser.prototype.getModel = function() {
    return this.model;
}

/**
* Parses a capture group.
* @param {string|Array} str - The string or array to parse.
* @returns {Array} The parsed capture group.
*/
CustomParser.prototype.parseCaptureGroup = function(str) {
    if (Array.isArray(str)) return str;
    if (typeof str !== "string") return [0];
    var result = [];
    
    str = str.replace(/\s+/g, '').split(",");
    for (var i in str) {
        result.push(parseInt(str[i]));
    }
    return result;
}

/**
* Parses the script.
*/
CustomParser.prototype.parse = async function() {
    console.log("Parsing with model", this.model);
    if (empty(this.model)) return console.warn("Model is not defined");
    if (empty(this.model.rules)) return console.warn("model.rules is not defined");
    var theString       = this.script;
    
    var mask = (string, start, end, maskChar = " ") => {
        var prev = string.substring(0, start);
        var after = string.substring(end, string.length);
        var mask = maskChar.repeat(string.substring(start, end).length);
        return prev+mask+after;
    }
    
    var evalRegex = (string) => {
        if (string.constructor.name == "RegExp") return string;
        return common.evalRegExpStr(string);
    }
    
    var evalAsyncFunction = (string) => {
        if (typeof string == "function") return string;
        try {
            let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
            return new AsyncFunction("text", "thisModel", string);
            //return new Function("text", "thisModel", string);
        } catch (e) {
            console.warn(e);
            return function() {};
        }
    }
    
    var isValidOffsetPair = (obj) => {
        try {
            if ("start" in obj && "end" in obj) return true;
        } catch (e) {
            return false;
        }
        return false;
    }
    
    var processHooks = async () => {
        if (!this.model) return;
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        if (!empty(this.model.toGrid)) {
            if (typeof this.model.toGrid == "function") this.filterText = this.model.toGrid;
            try {
                var filterText = new Function('text', 'context', 'parameters', this.model.toGrid);
                this.filterText = filterText;
            } catch (e) {
                // do nothing
            }
        }
        if (!empty(this.model.fromGrid)) {
            if (typeof this.model.fromGrid == "function") this.unfilterText = this.model.fromGrid;
            try {
                var unfilterText = new Function('text', 'context', 'parameters', 'info', this.model.fromGrid);
                this.unfilterText = unfilterText;
            } catch (e) {
                // do nothing
            }
        }
        // beforeWrite
        if (!empty(this.model.beforeWrite)) {
            if (typeof this.model.beforeWrite == "function") this.beforeWrite = this.model.beforeWrite;
            try {
                const beforeWrite = new AsyncFunction('text', this.model.beforeWrite);
                this.beforeWrite = beforeWrite;
            } catch (e) {
                // do nothing
            }
        }
    }

    /**
     * Compile contextTemplate string with parameters.
     * Replaces ${key} with the corresponding value from parameters.
     * @param {string} templateString - The template string to compile.
     * @param {object} parameters - The parameters to use in the template.
     * @param {object} info - Additional information for the template.
     * @returns {string} The compiled template string.
     * @description
     * Available parameters:
     * ${GROUP[n]} - The nth group of the regex match.
     * ${RULE_ID} - The ID of the rule.
     */
    const compileTemplate = (templateString, parameters={}, info={}) => {
        // Replace ${GROUP[n]} with parameters.GROUP[n] or parameters[n]
        let result = templateString;
        result = result.replace(/\$\{GROUP\[(\d+)\]\}/g, (m, idx) => {
            if (parameters.GROUP && parameters.GROUP[idx] !== undefined) return parameters.GROUP[idx];
            if (parameters[idx] !== undefined) return parameters[idx];
            return "";
        });
        // Replace ${RULE_ID} with parameters.RULE_ID
        //result = result.replace(/\$\{RULE_ID\}/g, parameters.RULE_ID !== undefined ? parameters.RULE_ID : "");
        // Add more replacements as needed
        console.log("%c Additional context", "color:salmon", result);
        return result;
    }
    
    /**
    * Process the rule
    * @param  {} thisRule
    * @param  {} initialOffset
    */
    var processRule = async (thisRule, initialOffset, rowInfoText="") => {
        try {
            initialOffset = initialOffset || 0;
            // var maxIteration = 999;
            console.log("fetchingRules", thisRule);
            if (thisRule.type == "regex") {
                if (!thisRule.pattern) return;
                var thisPattern = evalRegex(thisRule.pattern);
                await ui.log("Evaluating pattern : ", thisPattern.toString());
                var captureGroups = this.parseCaptureGroup(thisRule.captureGroups) || [0];
                if (Array.isArray(captureGroups) == false) captureGroups = [captureGroups];
                if (this.debugLevel) console.log("Capture groups:", captureGroups);
                // var iteration=0;
                var lastOffsetPair = "";
                let matchAllResult;
                console.log("%cthisRule.rowInfoGroup", "color:aqua", thisRule.captureRowInfo);



                const processMatch = async (matches) => {
                    if (
                        thisRule.captureRowInfo !== undefined &&
                        thisRule.captureRowInfo !== null &&
                        thisRule.captureRowInfo !== "" &&
                        !isNaN(parseInt(thisRule.captureRowInfo))
                    ) {
                        let groupIdx = parseInt(thisRule.captureRowInfo);
                        console.log("%c rowInfoText", "color:aqua", matches[groupIdx]);
                        if (matches[groupIdx] !== undefined) {
                            rowInfoText = matches[groupIdx];
                        }
                    }

                    for (let x=0; x<captureGroups.length; x++) {
                        //console.log("Handling capture index", captureGroups[x]);
                        var captureIndex    = parseInt(captureGroups[x] || 0); // default is index 0
                        if (!matches.indices[captureIndex]) return;
                        var offsetStart     = initialOffset + matches.indices[captureIndex][0]
                        var offsetEnd       = initialOffset + matches.indices[captureIndex][1]
                        if (this.debugLevel) console.log("offsetStart", offsetStart, "offsetEnd", offsetEnd);
                        // Build info object for registerString, preserving original info and adding rowInfoText if needed
                        let infoObj = {start: offsetStart, end: offsetEnd};
                        if (rowInfoText) {
                            infoObj.rowInfoText = rowInfoText;
                        }

                        console.log("%cMatches", "color:green", matches);

                        // Build context array for registerString
                        let contextArr = ["start", offsetStart, "end", offsetEnd];
                        if (thisRule.contextTemplate) {
                            // Prepare parameters for template: GROUP[n] = matches[n], RULE_ID = thisRule.id (if available)
                            let params = { GROUP: matches };
                            contextArr.push(compileTemplate(thisRule.contextTemplate, params, {
                                matches: matches,
                                initialOffset: initialOffset,
                            }));
                        }

                        if (!empty(thisRule.innerRule)) {
                            // instead of pushing the result, process inner pattern
                            await processRule(thisRule.innerRule, offsetStart, rowInfoText);
                        } else if (thisRule.action == "mask") {
                            theString = mask(theString, offsetStart, offsetEnd);
                        } else if (thisRule.action == "captureMask") {
                            // add rowInfoText: 'char name' in 3rd parameter of registerString to add char name
                            this.parsedData.push({
                                translation     : this.registerString(matches[captureIndex], contextArr, infoObj),
                                start           : offsetStart,
                                end             : offsetEnd
                            });
                            theString = mask(theString, offsetStart, offsetEnd);
                        } else {
                            this.parsedData.push({
                                translation     : this.registerString(matches[captureIndex], contextArr, infoObj),
                                start           : offsetStart,
                                end             : offsetEnd
                            });
                        }
                        
                        var currentOffsetPair = offsetStart+","+offsetEnd
                        if (lastOffsetPair == currentOffsetPair) {
                            // circular reference
                            console.warn(`Last offset ${lastOffsetPair} is same with the current offset ${currentOffsetPair}. To prevent circular refference the parser will mask the ofset character`);
                            
                            theString = mask(theString, offsetStart-1, offsetEnd+1);
                        }
                        lastOffsetPair = currentOffsetPair;
                        
                    }
                }

                // check if the pattern is global
                if (thisPattern.global) {
                    matchAllResult = theString.matchAll(thisPattern);
                    if (this.debugLevel) console.log("Match all result", matchAllResult);
                    if (!matchAllResult) return;
                    // javascript exec can lock us in infinite loop when encouter a blank match
                    //while((matches=thisPattern.exec(theString)) != null) {
                    for (let matches of matchAllResult) {    
                        if (this.debugLevel) console.log("Matches", matches);
                        // iterate through all selected groups
                        await processMatch(matches);
                    }
                } else {
                    matchAllResult = theString.match(thisPattern);
                    if (this.debugLevel) console.log("Match all result", matchAllResult);
                    if (!matchAllResult) return;
                    await processMatch(matchAllResult);
                }

            } else if (thisRule.type == "function") {
                if (!thisRule.function) return;
                var thisFunction = evalAsyncFunction(thisRule.function);
                console.log("calling function");
                var result = await thisFunction.call(this, theString, thisRule);
                console.log("result of the execution:", result);
                if (empty(result)) return;
                if (Array.isArray(result) == false) result = [result];
                for (let r in result) {
                    const offsetPair = result[r];
                    if (!isValidOffsetPair(offsetPair)) return;
                    const thisContext = [...["start", offsetPair.start, "end", offsetPair.end], ...(offsetPair.context || [])];
                    this.parsedData.push({
                        translation     : this.registerString(theString.substring(offsetPair.start, offsetPair.end), thisContext, common.clone(offsetPair)),
                        start           : offsetPair.start,
                        end             : offsetPair.end
                    });
                }
            }
        } catch (e) {
            console.error(e);
            await ui.logError("Error processing rule :", e.toString());
        }
    }
    
    await processHooks();
    for (let i in this.model.rules) {
        await processRule(this.model.rules[i], 0);
    }
    
    if (this.debugLevel) console.log("String after parsed:");
    if (this.debugLevel) console.log(theString);
}

/**
* Converts CustomParser instance to string.
* @returns {string} The string representation of the instance.
*/
CustomParser.prototype.toString = function(force) {
    // cache the result that ensures the script is only translated once
    // if this function is called multiple times, it will reverse the order.
    if (!force) {
        if (this.translatedScript) return this.translatedScript;
    }
    if (empty(this.parsedData)) return this.script;
    
    var replaceOffset = function(string, start, end, replacement) {
        replacement = replacement || ""
        var before = string.substring(0, start);
        var after  = string.substring(end, string.length);
        return before+replacement+after;
    }
    
    var thisScript = this.script;
    this.writableData = this.writableData || [];
    
    for (var i=0; i<this.parsedData.length; i++) {
        if (!this.writableData[i]) continue;
        this.parsedData[i].translation = this.writableData[i];
    }
    
    // IMPORTANT! sort by start offset DESC
    this.parsedData.sort((a,b) => {return b.start - a.start});
    
    for (let i=0; i<this.parsedData.length; i++) {
        thisScript = replaceOffset(thisScript, this.parsedData[i].start, this.parsedData[i].end, this.parsedData[i].translation);
    }

    this.translatedScript = thisScript;
    
    return this.translatedScript;
}

/**
* Checks if the provided model is valid.
* @param {object|string} model - The model object or JSON string.
* @returns {boolean} True if the model is valid, otherwise false.
*/
CustomParser.isValidModel = function(model) {
    if (typeof model == "string") {
        if (!common.isJSON(model)) return false;
        model = JSON.parse(model);
    }
    if (!model) return false;
    if (!model.files) return false;
    if (Array.isArray(model.files) == false ) return false;
    return true;
}



module.exports = CustomParser
