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



var RGSSParser = require("www/addons/rmrgss/RGSSParser.module.js");

class JsonDB extends require('www/js/ScriptParser.js') {
	constructor(script, options, callback) {
		super(script, options, callback)
		options ||= {};
        this.attachments = {};
    }
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

    const translatedList = [];
    let textStack = [];
    let scrollingTextStack = [];
    let commentStack = [];
    let scriptStack = [];
    let currentTextParam = {};
    let currentScrollingTextParam = {};
    let currentScriptParam = {};
    let last101 = null;
    let last105 = null;
    let last355 = null;
    const messagePosition = ["top", "middle", "bottom"];

    for (let i = 0; i < commandList.length; i++) {
        const command = commandList[i];

        // Handle text stacks
        if (textStack.length > 0 && command['__symbol__@code'] !== 401) {
            const pictureStatus = currentTextParam.headerParam?.[0] ? "hasPicture" : "noPicture";
            const context = [...parentContext, "list", currentTextParam.headerIndex, "message", pictureStatus, messagePosition[currentTextParam.headerParam?.[3] || 0]];
            const translation = this.registerString(textStack.join("\n"), context, command);
            this.buildTextList(translation, last101, translatedList);
            textStack = [];
        }

        if (scrollingTextStack.length > 0 && command['__symbol__@code'] !== 405) {
            const context = [...parentContext, "list", currentScrollingTextParam.headerIndex, "scrollingMessage"];
            const translation = this.registerString(scrollingTextStack.join("\n"), context, command);
            this.buildScrollTextList(translation, last105, translatedList);
            scrollingTextStack = [];
        }

        if (commentStack.length > 0 && command['__symbol__@code'] !== 408) {
            const context = [...parentContext, "list", i, "comment"];
            const translation = this.registerString(commentStack.join("\n"), context, command);
            this.buildCommentList(translation, last108, translatedList);
            commentStack = [];
        }

        if (scriptStack.length > 0 && command['__symbol__@code'] !== 655) {
            // end of text stack
            console.log("executing scriptstack");

            let context = common.clone(parentContext);
            context.push("list", currentScriptParam.headerIndex, "script");

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
                textStack = [];
                currentTextParam = { headerIndex: i, headerParam: command['__symbol__@parameters'] };
                if (this.engineCode == "xp") textStack.push(command['__symbol__@parameters']?.[0] || "");
                last101 = command;
                break;
            case 105: // Start scrolling text
                scrollingTextStack = [];
                currentScrollingTextParam = { headerIndex: i, headerParam: command['__symbol__@parameters'] };
                last105 = command;
                break;
            case 108: // Comment
                commentStack = [];
                commentStack.push(command['__symbol__@parameters']?.[0] || "");
                last108 = command;
                break;
            case 401: // Text continuation
                textStack.push(command['__symbol__@parameters']?.[0] || "");
                break;
            case 405: // Scrolling text continuation
                scrollingTextStack.push(command['__symbol__@parameters']?.[0] || "");
                break;
            case 408: // Comment continuation
                commentStack.push(command['__symbol__@parameters']?.[0] || "");
                break;
            case 355: // Script header
                scriptStack = [];
                currentScriptParam = { headerIndex: i, headerParam: command['__symbol__@parameters'] };
                scriptStack.push(command['__symbol__@parameters']?.[0] || "");
                last355 = command;
                break;
            case 655: // Script continuation
                scriptStack.push(command['__symbol__@parameters']?.[0] || "");
                break;
            case 102: // Choices
                // Task intensive, disabled for now
                // const context = [...parentContext, "list", i, "choices"];
                // const translatedChoices = this.fetchChoices(commandList, i, context);
                // translatedList.push(translatedChoices);

                // first parameters are array of choices
                // capture the choices
                const choices = command['__symbol__@parameters']?.[0] || [];
                choices.forEach((choiceText, idx) => {
                    const choiceContext = [...parentContext, "list", i, `Choices ${idx + 1}/${choices.length}`];
                    this.registerStringObject(command['__symbol__@parameters'][0], idx, choiceContext);
                });
                translatedList.push(command);
                break;
            case 402: // Choice options
                const choiceOptionText = command['__symbol__@parameters']?.[1];
                const choiceContext = [...parentContext, "list", i, "Choice Options"];
                this.registerStringObject(command['__symbol__@parameters'], 1, choiceContext);
                translatedList.push(command);
                break;
            case 122: // Set variable
                //console.log(">>Set variable command:", command);
                let attachmentName = "scriptCommand/"+common.generateId()+".rb";
                let script = command['__symbol__@parameters']?.[4] || ""; // script is at the 4th index
                if (typeof script !== "string") {
                    translatedList.push(command);
                } else {
                    let context = [...parentContext, "list", i, "event", `var:${command['__symbol__@parameters']?.[0]}-${command['__symbol__@parameters']?.[1]}`];
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
                const text = command['__symbol__@parameters']?.[1];
                if (typeof text === "string") {
                    const context = [...parentContext, "list", i, "event", `command_${command['__symbol__@code']}`];
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
			if (this.engineCode == "xp") {
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


var parseCommonEvents = async function (path) {

}

module.exports = JsonDB;