/*
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this software except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

“Commons Clause” License Condition v1.0:
The Software is provided by the Licensor under the License with the condition
that you do not Sell the Software without written permission from the Licensor.

Software: rmrgss addon for Translator++
License: Apache 2.0
Licensor: Dreamsavior
*/

const RGSSParser = require("www/addons/rmrgss/RGSSParser.module.js");
const { TextDecoder } = require("util");
class JsonDBData {
    constructor(data, options) {
        options ||= {};
        this.data = data;
        this.options = options;
    }
    
    getIn(location = []) {
        return location.reduce((acc, key) => {
            if (acc === null || acc === undefined) return undefined;
    
            if (acc[`__symbol__@${key}`]) return acc[`__symbol__@${key}`];
            if (acc[key]) return acc[key];

            // Otherwise, check for the key in the object
            return acc[key];
        }, this.data);
    }
    isNumeric(n) {
        if (typeof n === 'number') return true;
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    // doesn't work
    setIn(location = [], value) {
        if (location.length === 0) {
            // If location is empty, do nothing
            return;
        }

        location.reduce((acc, key, index) => {
            if (acc === null || acc === undefined) return undefined;

            // Check if we are at the final key in the location path
            if (index === location.length - 1) {
                // if type of key is number, then it is an array
                if (this.isNumeric(key)) {
                    acc[key] = value;
                } else {
                    // assign as a symbol
                    acc[`__symbol__@${key}`] = value;
                }
            } else {
                // Ensure the intermediate keys are objects (or arrays) to prevent overwriting them
                if (!acc[key] && typeof acc[key] !== 'object') {
                    acc[key] = isNaN(location[index + 1]) ? {} : [];
                }
            }
            return acc[key];
        }, this.data);
    }
}



class JsonDB extends require('www/js/ScriptParser.js') {
	constructor(script, options, callback) {
		super(script, options, callback)
		options ||= {};
        this.attachments = {};
    }
}

JsonDB.RPGM_EVENT_CODE = {
	"0": "Empty",
	"101": "Show Text Attributes",
	"102": "Show Choices",
	"103": "Input Number",
	"104": "Select Key Item",
	"105": "Show Scrolling Text Attributes",
	"108": "Comment",
	"111": "Conditional Branch",
	"112": "Loop",
	"113": "Break Loop",
	"115": "Exit Event Processing",
	"117": "Call Common Event",
	"118": "Label",
	"119": "Jump to Label",
	"121": "Control Switches",
	"122": "Control Variables",
	"123": "Control Self Switch",
	"124": "Control Timer",
	"125": "Change Gold",
	"126": "Change Items",
	"127": "Change Weapons",
	"128": "Change Armor",
	"129": "Change Party Member",
	"132": "Change Battle BGM",
	"133": "Change Battle End ME",
	"134": "Change Save Access",
	"135": "Change Menu Access",
	"136": "Change Encounter",
	"137": "Change Formation Access",
	"138": "Change Window Color",
	"201": "Transfer Player",
	"202": "Set Vehicle Location",
	"203": "Set Event Location",
	"204": "Scroll Map",
	"205": "Set Move Route",
	"206": "Get on/off Vehicle",
	"211": "Change Transparency",
	"212": "Show Animation",
	"213": "Shot Balloon Icon",
	"214": "Erase Event",
	"216": "Change Player Followers",
	"217": "Gather Followers",
	"221": "Fadeout Screen",
	"222": "Fadein Screen",
	"223": "Tint Screen",
	"224": "Flash Screen",
	"225": "Shake Screen",
	"230": "Wait",
	"231": "Show Picture",
	"232": "Move Picture",
	"233": "Rotate Picture",
	"234": "Tint Picture",
	"235": "Erase Picture",
	"236": "Set Weather Effects",
	"241": "Play BGM",
	"242": "Fadeout BGM",
	"243": "Save BGM",
	"244": "Replay BGM",
	"245": "Play BGS",
	"246": "Fadeout BGS",
	"249": "Play ME",
	"250": "Play SE",
	"251": "Stop SE",
	"261": "Play Movie",
	"281": "Change Map Display",
	"282": "Change Tileset",
	"283": "Change Battle Back",
	"284": "Change Parallax Back",
	"285": "Get Location Info",
	"301": "Battle Processing",
	"302": "Shop Processing",
	"303": "Name Input Processing",
	"311": "Change HP",
	"312": "Change MP",
	"313": "Change State",
	"314": "Recover All",
	"315": "Change EXP",
	"316": "Change Level",
	"317": "Change Parameters",
	"318": "Change Skills",
	"319": "Change Equipment",
	"320": "Change Actor Name",
	"321": "Change Actor Class",
	"322": "Change Actor Graphic",
	"323": "Change Vehicle Graphic",
	"324": "Change Actor Nickname",
	"325": "Change Actor Profile",
	"331": "Change Enemy HP",
	"332": "Change Enemy MP",
	"333": "Change Enemy State",
	"334": "Enemy Recover All",
	"335": "Enemy Appear",
	"336": "Enemy Transform",
	"337": "Show Battle Animation",
	"339": "Force Action",
	"340": "Abort Battle",
	"351": "Open Menu Screen",
	"352": "Open Save Screen",
	"353": "Game Over",
	"354": "Return to Title Screen",
	"355": "Script Header",
	"356": "Plugin Command",
	"401": "Show Text",
	"402": "Choice",
	"403": "Choice Cancel",
	"404": "Choices End",
	"405": "Show Scrolling Text",
	"408": "Comment More",
	"411": "Else",
	"412": "Branch End",
	"413": "Repeat Above",
	"601": "If Win",
	"602": "If Escape",
	"603": "If Lose",
	"604": "Battle Processing End",
	"605": "Shop Item",
	"655": "Script"
};


JsonDB.getEventName = function(code) {
    return JsonDB.RPGM_EVENT_CODE[code] || "Unknown";
}


JsonDB.decodeString = function(input) {
    if (!input) return input; // Return as-is if input is falsy
    if (typeof input === "string") {
        return input; // Return as-is if input is already a string
    }

    if (input && typeof input === "object" && input?.__type === "bytes" && Array.isArray(input?.data)) {
        // Convert the byte array into a Uint8Array
        const byteArray = new Uint8Array(input.data);

        // Decode the byte array into a string using TextDecoder
        const decoder = new TextDecoder("utf-8"); // Specify UTF-8 encoding
        return decoder.decode(byteArray);
    }

    throw new Error("Invalid input: Expected a string or an object with '__type' set to 'bytes' and a 'data' array.");
}

const _registerString = JsonDB.prototype.registerString;
JsonDB.prototype.registerString = function (input, context = [], parameters = {}, options = {}) {
    // Decode the input if it is a byte array
    const decodedInput = JsonDB.decodeString(input);

    // IMPORTANT:
    // JsonDB applies translations by writing the returned value back into JSON objects
    // (see registerStringObject). ParserBase.registerString() only calls `unfilterText()`
    // when writing to `writableData`, but JsonDB export doesn't use writableData.
    //
    // So if we need engine-specific newline normalization (ex: VX Ace requiring CRLF),
    // we must also apply unfilterText() to the returned translation here.
    const translated = _registerString.call(this, decodedInput, context, parameters, options);
    return this.unfilterText(translated, context, parameters);
}

JsonDB.generateEventCommandData = function(indent=0, code=0, parameters=[]) {
	return {
        "__class": "__symbol__RPG::EventCommand",
        "__type": "object",
        "__symbol__@indent": indent,
        "__symbol__@code": code,
        "__symbol__@parameters": parameters
    }
}

/**
 * Check if the event list is empty
 * Empty event list is defined as an event list with only one command, which is a 0 code command
 * @param {object[]} eventList - The event list to check
 * @returns {boolean} - Whether the event list is empty
 * @static
 */
JsonDB.isEmptyEventList = function(eventList) {
    if (!eventList?.length) return true;
    if (eventList.length === 1 && eventList[0]['__symbol__@code'] === 0) return true;
    return false;
}

/**
 * Mutable registerString function
 * @param {object} parentObj - Parent object
 * @param {string} key - The key of the string
 * @param {string[]} localContext - The context of the string
 * @param {object} parameters - The parameters of the string
 * @param {object} options - The options of the string
 * @returns {string} - The translated string
 */
JsonDB.prototype.registerStringObject = function (parentObj, key, localContext, parameters, options) {
	let translation = this.registerString(parentObj[key], localContext, parameters, options);
	// apply translation
	parentObj[key] = translation;
	return translation;
}


JsonDB.prototype.fetchCommandList = async function (commandList, parentContext = []) {
    if (!Array.isArray(commandList) || commandList.length === 0) return [];
    if (JsonDB.isEmptyEventList(commandList)) return commandList;
    if (this.debugLevel >= 1) console.log("Processing command list:", commandList);

    // handle single command list for efficiency
    if (commandList.length === 1 && commandList[0]['__symbol__@code'] === 0) {
        return commandList; // return as is
    }

    const translatedList = [];
    let textStack = [];
    let scrollingTextStack = [];
    let commentStack = [];
    let scriptStack = [];
    let currentTextParam = {};
    let currentScrollingTextParam = {};
    let currentScriptParam = {};
    let currentCommentParam = {};
    let last101 = null;
    let last105 = null;
    let last355 = null;
    const messagePosition = ["top", "middle", "bottom"];

    const removeRawParameter = (command) => {
        // if raw parameter exists, dumper will write the raw parameter instead of the translated one
        if (command["__raw__@parameters"]) delete command["__raw__@parameters"];
    }

    for (let i = 0; i < commandList.length; i++) {
        const command = commandList[i];

        // Handle text stacks
        if (textStack.length > 0 && command['__symbol__@code'] !== 401) {
            const pictureStatus = currentTextParam.headerParam?.[0] ? "hasPicture" : "noPicture";
            const context = [...parentContext, currentTextParam.headerIndex, "message", pictureStatus, messagePosition[currentTextParam.headerParam?.[3] || 0]];
            const translation = this.registerString(textStack.join("\n"), context, last101);
            this.buildTextList(translation, last101, translatedList);
            textStack = [];
        }

        if (scrollingTextStack.length > 0 && command['__symbol__@code'] !== 405) {
            const context = [...parentContext, currentScrollingTextParam.headerIndex, "scrollingMessage"];
            const translation = this.registerString(scrollingTextStack.join("\n"), context, last105);
            this.buildScrollTextList(translation, last105, translatedList);
            scrollingTextStack = [];
        }

        if (commentStack.length > 0 && command['__symbol__@code'] !== 408) {
            const context = [...parentContext, currentCommentParam.headerIndex, "comment"];
            const translation = this.registerString(commentStack.join("\n"), context, last108, {tags:["blue"]});
            this.buildCommentList(translation, last108, translatedList);
            commentStack = [];
        }

        if (scriptStack.length > 0 && command['__symbol__@code'] !== 655) {
            // end of text stack
            console.log("executing scriptstack");

            let context = [...parentContext, currentScriptParam.headerIndex, "script"];

            // this is raw script
            let script = scriptStack.join("\n");

            // for raw viewer store raw script as Attachment, because we won't save the code into files.
            let attachmentName = "scriptCommand/"+common.generateId()+".rb";


            //console.log("registering string within event's RGSS code.");
            let copyOptions 				= common.clone(this.options);
                copyOptions.baseContext 	= context;
                copyOptions.baseParameter 	= {attachment:attachmentName}
                copyOptions.baseTags		= ["red"];
                copyOptions.translationInfo = this.translationInfo;
                copyOptions.translationPair = this.translationPair;

            let scriptObj = new RGSSParser(script, copyOptions);
            //scriptObj.debugLevel = 9;
            await scriptObj.parse();
            // produce translated script from scriptObj
            script = scriptObj.toString();
            // import transData from scriptObj into rmData
            this.importTransData(scriptObj);

            // assign attachment only if has atleast one translatable string / data length > 0
            if (scriptObj.transData.data.length > 0) {
                this.attachments[attachmentName] = {
                    type:"text/ruby",
                    data:script
                }
            }

            //var translation = this.registerString(script, context, last355);
            if (this.debugLevel > 2)console.log(">>Generated combined text:", script);

            this.buildScriptList(script, last355, translatedList);

            scriptStack = [];
        }

        switch (command['__symbol__@code']) {
            case 101: // Text header
                removeRawParameter(command);
                textStack = [];
                currentTextParam = { headerIndex: i, headerParam: command['__symbol__@parameters'] };
                if (this.engineType == "rmxp") textStack.push(JsonDB.decodeString(command['__symbol__@parameters']?.[0] || ""));
                last101 = command;
                break;
            case 105: // Start scrolling text
                removeRawParameter(command);
                scrollingTextStack = [];
                currentScrollingTextParam = { headerIndex: i, headerParam: command['__symbol__@parameters'] };
                last105 = command;
                break;
            case 108: // Comment
                removeRawParameter(command);
                commentStack = [];
                commentStack.push(JsonDB.decodeString(command['__symbol__@parameters']?.[0] || ""));
                currentCommentParam = { headerIndex: i, headerParam: command['__symbol__@parameters'] };
                last108 = command;
                break;
            case 401: // Text continuation
                removeRawParameter(command);
                textStack.push(JsonDB.decodeString(command['__symbol__@parameters']?.[0] || ""));
                break;
            case 405: // Scrolling text continuation
                removeRawParameter(command);
                scrollingTextStack.push(JsonDB.decodeString(command['__symbol__@parameters']?.[0] || ""));
                break;
            case 408: // Comment continuation
                removeRawParameter(command);
                commentStack.push(JsonDB.decodeString(command['__symbol__@parameters']?.[0] || ""));
                break;
            case 355: // Script header
                removeRawParameter(command);
                scriptStack = [];
                currentScriptParam = { headerIndex: i, headerParam: command['__symbol__@parameters'] };
                scriptStack.push(JsonDB.decodeString(command['__symbol__@parameters']?.[0] || ""));
                last355 = command;
                break;
            case 655: // Script continuation
                removeRawParameter(command);
                scriptStack.push(JsonDB.decodeString(command['__symbol__@parameters']?.[0] || ""));
                break;
            case 102: // Choices
                // Task intensive, disabled for now
                // const context = [...parentContext, "list", i, "choices"];
                // const translatedChoices = this.fetchChoices(commandList, i, context);
                // translatedList.push(translatedChoices);

                // first parameters are array of choices
                // capture the choices
                removeRawParameter(command);
                const choices = command['__symbol__@parameters']?.[0] || [];
                choices.forEach((choiceText, idx) => {
                    const choiceContext = [...parentContext, "list", i, `Choices ${idx + 1}/${choices.length}`];
                    this.registerStringObject(command['__symbol__@parameters'][0], idx, choiceContext);
                });
                translatedList.push(command);
                break;
            case 402: // Choice options
                removeRawParameter(command);
                const choiceOptionText = command['__symbol__@parameters']?.[1];
                const choiceContext = [...parentContext, "list", i, "Choice Options"];
                this.registerStringObject(command['__symbol__@parameters'], 1, choiceContext);
                translatedList.push(command);
                break;
            case 122: // Set variable
                //console.log(">>Set variable command:", command);
                removeRawParameter(command);
                let attachmentName = "scriptCommand/"+common.generateId()+".rb";
                 // script is at the 4th index, and it can be sting or integer depending on the type of the variable
                let script = command['__symbol__@parameters']?.[4];
                if (!JsonDB.isTranslatableProperties(script)) {
                    translatedList.push(command); // not a translatable string. leave as is
                } else {
                    let context = [...parentContext, i, "Control Variable", `var:${command['__symbol__@parameters']?.[0]}-${command['__symbol__@parameters']?.[1]}`];
                    let copyOptions 			= common.clone(this.options);
                    copyOptions.baseContext 	= context;
                    copyOptions.baseParameter 	= {attachment:attachmentName}
                    copyOptions.baseTags		= ["red"];
                    copyOptions.translationInfo = this.translationInfo;
                    copyOptions.translationPair = this.translationPair;

                    let scriptObj = new RGSSParser(script, copyOptions);
                    //scriptObj.debugLevel = 9;
                    await scriptObj.parse();
                    this.importTransData(scriptObj);
                    let translatedScript = scriptObj.toString();
                    //console.log("ScriptObj:", scriptObj);
                    let translatedCommands = common.clone(command);
                    translatedCommands['__symbol__@parameters'][4] = translatedScript;
                    translatedList.push(translatedCommands);
                }
                break;
            case 320: // Change name
            case 324: // Change nickname
            case 325: // Change profile

                removeRawParameter(command);
                const text = command['__symbol__@parameters']?.[1];
                if (JsonDB.isTranslatableProperties(text)) {
                    const context = [...parentContext, i, JsonDB.getEventName(command['__symbol__@code'])];
                    const translation = this.registerString(text, context, command);
                    command['__symbol__@parameters'][1] = translation;
                }
                translatedList.push(command);
                break;
            default:
                // Preserve non-translatable commands as is
                translatedList.push(command);
        }
    }

    if (this.debugLevel > 1) console.log("Translated list:", translatedList);
    return translatedList;
};

JsonDB.prototype.fetchChoices = function (commandList, index, context) {
    if (!commandList[index] || commandList[index]['__symbol__@code'] !== 102) {
        throw new Error("Invalid choice header at the given index.");
    }

    const choiceHeader = commandList[index];
    const choices = choiceHeader?.['__symbol__@parameters']?.[0] || [];
    const headerIndent = choiceHeader['__symbol__@indent'];
    const translatedChoices = [];

    // Translate choice header options
    choices.forEach((choiceText, idx) => {
        const choiceContext = [...context, `Choice ${idx + 1}/${choices.length}`];
        const translatedText = this.registerString(choiceText, choiceContext);
        translatedChoices.push(translatedText);
        // Modify choice header parameters
        choiceHeader['__symbol__@parameters'][0][idx] = translatedText;
    });

    let processed = 0;

    // Traverse subsequent commands
    for (let i = index + 1; i < commandList.length; i++) {
        const currentCommand = commandList[i];
        const currentIndent = currentCommand['__symbol__@indent'];

        // Stop at terminator or lower indent
        if (currentCommand['__symbol__@code'] === 0 && currentIndent === headerIndent) break;

        // Skip commands not in the specified indent
        if (currentIndent !== headerIndent + 1) continue;

        // Translate choice options (code 402)
        if (currentCommand['__symbol__@code'] === 402) {
            const choiceOptionText = currentCommand['__symbol__@parameters'][1];
            const choiceContext = [...context, `Choice Option ${processed + 1}`];
            const translatedText = this.registerString(choiceOptionText, choiceContext);
            currentCommand['__symbol__@parameters'][1] = translatedText;

            processed++;
            if (processed >= choices.length) break;
        }
    }

    return choiceHeader;
};

JsonDB.prototype.buildTextList = function(text, headerParam, translatedList) {
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	const textArray = text.split("\n");

	for (let i=0; i<textArray.length; i++) {
		if ((i+1)%4 == 1) {
			if (this.engineType == "rmxp") {
				// in XP, header 101 contains the first line of the text
				translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], headerParam['__symbol__@code'], [textArray[i]]));
				continue; // <-- only in XP! this is important
			} else {
				translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], headerParam['__symbol__@code'], headerParam['__symbol__@parameters']));
			}
		}
		translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], 401, [textArray[i]]));
	}
	return translatedList;
}

JsonDB.prototype.buildScrollTextList = function(text, headerParam, translatedList) {
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	const textArray = text.split("\n");

	translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], headerParam['__symbol__@code'], headerParam['__symbol__@parameters']));
	for (let i=0; i<textArray.length; i++) {
		translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], 405, [textArray[i]]));
	}	
	return translatedList;
}

JsonDB.prototype.buildCommentList = function(text, headerParam, translatedList) {
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	const textArray = text.split("\n");

    // first line has a content
	translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], 108, [textArray[0]]));
    for (let i=1; i<textArray.length; i++) {
		translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], 408, [textArray[i]]));
	}	
	return translatedList;
}

JsonDB.prototype.buildScriptList = function(text, headerParam, translatedList) {
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	const textArray = text.split("\n");

	// first line is on header
	translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], 355, [textArray[0]]));
	for (let i=1; i<textArray.length; i++) {
		translatedList.push(JsonDB.generateEventCommandData(headerParam['__symbol__@indent'], 655, [textArray[i]]));
	}
	//console.log("script list", translatedList);
	return translatedList;
}

JsonDB.prototype.unfilterText = function(text, context, parameters) {
    // RPG Maker MV uses "\r\n" for new lines, but in the editor we use "\n" for better compatibility with other engines, so we need to convert it back to "\r\n" when exporting.
    return text.replaceAll("\r", "").replaceAll("\n", "\r\n");
}


// end of eventList helper functions
JsonDB.prototype.parseCommonEvents = async function (ceObject = this.script) {
    ceObject = ceObject || this.script;
    // iterate through the common events
    for (let i=0; i<ceObject.length; i++) {
        let ce = ceObject[i];
        if (!ce) continue;
        console.log("Processing common event:", i);
        await common.wait(20);
        // register name of the common event
        this.registerStringObject(ce, "__symbol__@name", ["commonEvents", i, "name"]);
        if (!ce['__symbol__@list']) continue;
        // fetch command list
        
        let translatedList = await this.fetchCommandList(ce['__symbol__@list'], ["commonEvents", i]);

        // assign the translated list back to the common event
        ce['__symbol__@list'] = translatedList;
    }
}

JsonDB.prototype.compileTo = async function(path, data = this.script) {
    const buffer = Buffer.from(marshal.dump(this.script));
    await fs.promises.writeFile(path, buffer);
    return path;
}



JsonDB.getCommonDataKeys = function (dataType) {
	dataType = dataType || "";
	dataType = dataType.toLowerCase();
    // remove extension
    dataType = dataType.replace(/\.[^/.]+$/, "");
    const commonKeys = {
        actors: ["name", "description", "nickname", "note"],
        items: ["name", "description", "note"],
        armors: ["name", "description", "note"],
        weapons: ["name", "description", "note"],
        skills: ["name", "description", "message1", "message2", "note"],
        states: ["name", "message1", "message2", "message3", "message4", "note"],
        classes: ["name", "note"],
        enemies: ["name", "note"],
        tilesets: ["name", "note"],
        animations: ["name"],
        mapinfos: ["name"]
    };
    return commonKeys[dataType] || [];
};

/**
 * Processes an array of data objects to fetch and register translatable strings for specified keys.
 * 
 * @function JsonDB.prototype.fetchCommonData
 * @param {Array<Object>} [data=[]] - The array of data objects to process.
 * @param {Array<string>} [whatToFetch=[]] - The list of keys to fetch and register as translatable strings.
 * @param {Array<string>} [parentContext=[]] - The hierarchical context indicating the position of the current data.
 * @param {Object} [options={}] - Additional options for string registration.
 * @returns {Array<Object>} The processed data array with translations registered.
 * 
 * @description
 * This function iterates through an array of data objects and registers translatable strings for specified keys.
 * Each key is prefixed with `__symbol__@` before lookup. The function combines the parent context with the
 * current index to create a complete context path and uses `this.registerStringObject` to register and apply
 * translations. Null entries and keys not present in an object are skipped.
 * 
 * @example
 * const data = [
 *   {
 *     "__symbol__@display_name": "Common Event 1",
 *     "__symbol__@note": "Note for Common Event 1"
 *   },
 *   {
 *     "__symbol__@display_name": "Common Event 2",
 *     "__symbol__@note": "Note for Common Event 2"
 *   }
 * ];
 * 
 * const jsonDB = new JsonDB();
 * const processedData = jsonDB.fetchCommonData(data, ['display_name', 'note'], ['common_events']);
 * console.log(processedData);
 * 
 * @see JsonDB.prototype.registerStringObject
 */
JsonDB.prototype.fetchCommonData = function (data = [], whatToFetch = [], parentContext = [], options = {}) {
    if (!whatToFetch?.length) return data; // No keys to fetch
    if (!data) return data; // No data to process
    if (Array.isArray(data)) {
        if (data.length === 0) return data; // No data to process
    } else if (typeof data === "object") {
        if (Object.keys(data).length === 0) return data; // No data to process
    }

    // Iterate through the data array
    // in some cases, data is an object, not an array
    // data.forEach((entry, index) => {
    for (let index in data) {
        const entry = data[index];
        const printableKey = index.replace(/__integer__/, "");
        if (!entry) continue; // Skip null entries
        // Combine the parent context with the current index for a complete path
        const localContext = [...parentContext, `${printableKey}`];

        // Iterate through the list of keys to fetch
        whatToFetch.forEach(key => {
            const symbolKey = `__symbol__@${key}`; // Add prefix to key
            
            if (entry.hasOwnProperty(symbolKey)) {
                // Register and apply translation
                this.registerStringObject(entry, symbolKey, [...localContext, key], {}, options);
            }
        });
    }
    // });

    // Return the updated data
    return data;
};


JsonDB.prototype.fetchSingleCommonEvent = async function(data, parentContext = []) {
    if (!data) return data; // Return early for falsy data
    console.log("Processing common event:", data);
    this.registerStringObject(data, '__symbol__@name', [...parentContext, "name"], undefined, {tags: ["blue"]});
    if (data['__symbol__@list']) {
        console.log("Processing command list:", data['__symbol__@list']);
        data['__symbol__@list'] = await this.fetchCommandList(data['__symbol__@list'], [...parentContext, "list"]);
    }
    return data;
}

/**
 * Processes a map data object, registers translatable strings, and applies translations.
 * 
 * @async
 * @function JsonDB.prototype.fetchMapData
 * @param {Object} data - The map data object to process.
 * @param {Array<string>} [parentContext=[]] - The context array indicating the hierarchical position of the current data.
 * @returns {Promise<Object>} The translated map data object with applied translations.
 * 
 * @description
 * This function processes a map data object to capture translatable strings like `display_name` and `note` 
 * using `this.registerStringObject`. It also iterates over the events (`__symbol__@events`) in the map data, 
 * capturing their names (`__symbol__@name`) and processing each page's command list (`__symbol__@list`) 
 * using the `fetchCommandList` method. The translated command list is applied directly to the page.
 * 
 * @example
 * const mapData = {
 *   "__class": "__symbol__RPG::Map",
 *   "__symbol__@display_name": "Display name of the map",
 *   "__symbol__@note": "note of the map",
 *   "__symbol__@events": {
 *     "__integer__1": {
 *       "__class": "__symbol__RPG::Event",
 *       "__symbol__@name": "EV001",
 *       "__symbol__@pages": [
 *         {
 *           "__symbol__@list": [
 *             {
 *               "__symbol__@code": 101,
 *               "__symbol__@parameters": ["Hello World"]
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 * };
 * 
 * const jsonDB = new JsonDB();
 * const translatedMapData = await jsonDB.fetchMapData(mapData);
 * console.log(translatedMapData);
 * 
 * @see JsonDB.prototype.registerStringObject
 * @see JsonDB.prototype.fetchCommandList
 */

JsonDB.prototype.fetchMapData = async function (data = {}, parentContext = []) {
    // Capture display_name and note
    if (data["__symbol__@display_name"]) {
        this.registerStringObject(data, "__symbol__@display_name", [...parentContext, "display_name"]);
    }
    if (data["__symbol__@note"]) {
        this.registerStringObject(data, "__symbol__@note", [...parentContext, "note"], undefined, {tags: ["blue"]});
    }

    // Handle events
    const events = data["__symbol__@events"];
    if (events) {
        for (const eventId in events) {
            const event = events[eventId];
            if (!event) continue;
            const numericId = eventId.replace(/__integer__/, "");
            if (event && event["__symbol__@name"]) {
                // Capture the event's name
                this.registerStringObject(event, "__symbol__@name", [...parentContext, "events", numericId, "name"]);
            }

            // Handle event pages
            const pages = event["__symbol__@pages"];
            if (pages && Array.isArray(pages)) {
                for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                    const page = pages[pageIndex];
                    if (page && page["__symbol__@list"]) {
                        // Fetch and apply translated command list
                        const translatedList = await this.fetchCommandList(page["__symbol__@list"], [...parentContext, "events", numericId, "pages", pageIndex, "list"]);
                        page["__symbol__@list"] = translatedList;
                    }
                }
            }
        }
    }

    // Return the translated result
    return data;
};


/**
 * Processes troop data to capture translatable names and translate event command lists.
 *
 * @function JsonDB.prototype.fetchTroopsData
 * @param {Array<Object>} [data=[]] - The array of troop objects to process.
 * @param {Array<string>} [parentContext=[]] - The hierarchical context indicating the position of the current troop data.
 * @returns {Array<Object>} The processed troop data array with translations applied.
 *
 * @description
 * This function iterates through an array of troop data objects, captures the `name` field as a translatable string,
 * and translates each event page's command list using the `fetchCommandList` handler.
 * 
 * - For each troop object, it registers the `__symbol__@name` key for translation by removing the prefix.
 * - For each page in the troop's `__symbol__@pages`, the `__symbol__@list` (command list) is processed using `fetchCommandList`.
 * - Null entries in the data array are skipped.
 * 
 * @example
 * const jsonDB = new JsonDB();
 * const translatedData = jsonDB.fetchTroopsData(troopsData, ['troops']);
 * console.log(translatedData);
 * 
 * @see JsonDB.prototype.fetchCommandList
 * @see JsonDB.prototype.registerStringObject
 */
JsonDB.prototype.fetchTroopsData = async function (data = [], parentContext = []) {
    if (!data?.length) return []; // Return early for empty or invalid data arrays

    // Process each troop in the data array
    for (const [index, troop] of data.entries()) {
        if (!troop) continue; // Skip null entries

        // Create the local context for the current troop
        const localContext = [...parentContext, `${index}`];

        // Register the troop name as a translatable string
        const nameKey = "__symbol__@name";
        if (troop.hasOwnProperty(nameKey)) {
            this.registerStringObject(troop, nameKey, [...localContext, "name"]);
        }

        // Process the pages and their event command lists
        const pagesKey = "__symbol__@pages";
        if (Array.isArray(troop[pagesKey])) {
            for (const [pageIndex, page] of troop[pagesKey].entries()) {
                const pageContext = [...localContext, "pages", `${pageIndex}`];
                const listKey = "__symbol__@list";

                if (Array.isArray(page[listKey])) {
                    // Translate the command list for the page
                    const translatedList = await this.fetchCommandList(page[listKey], pageContext);
                    page[listKey] = translatedList; // Apply the translated list directly
                }
            }
        }
    }

    return data; // Return the processed troop data
};


JsonDB.prototype.fetchSystemData = function (data = {}, parentContext = []) {
    const type = [
        'elements',
        'skill_types',
        'weapon_types',
        'armor_types'
    ];

    if (this.options?.loadVariableName) type.push("variables", "switches");

    // Process main types
    type.forEach((key) => {
        const actualKey = `__symbol__@${key}`;
        if (!Array.isArray(data[actualKey]) || data[actualKey].length === 0) return;
        for (let i = 0; i < data[actualKey].length; i++) {
            this.registerStringObject(data[actualKey], i, parentContext.concat(key, i), []);
        }
    });

    // Process terms
    const terms = data['__symbol__@terms'];
    if (terms) {
        if (Array.isArray(terms['__symbol__@params'])) {
            for (let i = 0; i < terms['__symbol__@params'].length; i++) {
                this.registerStringObject(terms['__symbol__@params'], i, parentContext.concat('terms', 'params', i), []);
            }
        }
        if (Array.isArray(terms['__symbol__@etypes'])) {
            for (let i = 0; i < terms['__symbol__@etypes'].length; i++) {
                this.registerStringObject(terms['__symbol__@etypes'], i, parentContext.concat('terms', 'etypes', i), []);
            }
        }
        if (Array.isArray(terms['__symbol__@commands'])) {
            for (let i = 0; i < terms['__symbol__@commands'].length; i++) {
                this.registerStringObject(terms['__symbol__@commands'], i, parentContext.concat('terms', 'commands', i), []);
            }
        }
        if (Array.isArray(terms['__symbol__@basic'])) {
            for (let i = 0; i < terms['__symbol__@basic'].length; i++) {
                this.registerStringObject(terms['__symbol__@basic'], i, parentContext.concat('terms', 'basic', i), []);
            }
        } else {
            // register for VX
            for (let key in terms) {
                const printableKey = key.replace(/__symbol__@/g, "");
                this.registerStringObject(terms, key, parentContext.concat('terms', 'basic', printableKey), []);
            }
        }
    }

    // Process game title and currency unit
    if (data['__symbol__@game_title']) {
        this.registerStringObject(data, '__symbol__@game_title', parentContext.concat('game_title'), []);
    }
    if (data['__symbol__@currency_unit']) {
        this.registerStringObject(data, '__symbol__@currency_unit', parentContext.concat('currency_unit'), []);
    }

    // xp only
    const words = data['__symbol__@words'];
    if (words) {
        for (let key in words) {
            const printableKey = key.replace(/__symbol__@/g, "");
            this.registerStringObject(words, key, parentContext.concat('words', printableKey), []);
        }
    }

    return data;
};


JsonDB.isTranslatableProperties = function (data) {
    if (!data) return false;
    if (typeof data == "string") return true;
    if (typeof data == "object") {
        if (data?.['__type'] == "bytes" && data?.data?.length) return true;
    }
    return false;
}

JsonDB.prototype.fetchArbitraryData = function (data = {}, parentContext = []) {
    if (!data) return data; // Return early for falsy data

    const getPrintableKey = (key) => {
        if (!key) return key;
        if (key.startsWith("__symbol__@")) return key.substring("__symbol__@".length);
        if (key.startsWith("__integer__")) return key.substring("__integer__".length);
        return key;
    }

    // Helper function for recursive traversal
    const traverseAndRegister = (parentNode, key, currentPath = []) => {
        let node = parentNode;
        if (typeof key !== "undefined") {
            node = parentNode[key];
        }
        if (!node) return; // Skip null entries
        if (["__class", "__type"].includes(key)) return; // Skip class and type keys
        if (JsonDB.isTranslatableProperties(node)) {
            // Register the string with the appropriate context
            const context = [...parentContext, ...currentPath];
            this.registerStringObject(parentNode, key, context);

        } else if (typeof node === 'object') {
            // Recurse for objects and arrays
            for (const key in node) {
                if (node.hasOwnProperty(key)) {
                    traverseAndRegister(node, key, [...currentPath, getPrintableKey(key)]);
                }
            }
        } else if (Array.isArray(node)) {
            node.forEach((item, index) => {
                traverseAndRegister(node, index, [...currentPath, getPrintableKey(index)]);
            });
        }
    };

    traverseAndRegister(data, undefined, parentContext);
    return data;
};



module.exports = JsonDB;