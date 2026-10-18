/**
 * Script utility to parse RPGMaker Trans format
 */
const RMTransText = {}
RMTransText.exportLineBreakType = "\n"

/**
* Escapes special characters in the input string.
* Special characters are >, #, and \.
* 
* @param {string} input - The input string to be escaped.
* @returns {string} The escaped string.
*/
RMTransText.escapeString = function(input) {
    if (!input) return "";
    return input.replace(/[>#\\]/g, '\\$&');
}

/**
* Unescapes special characters in the input string.
* Special characters are \>, \#, and \\.
* 
* @param {string} input - The input string to be unescaped.
* @returns {string} The unescaped string.
*/
RMTransText.unescapeString = function(input) {
    if (!input) return "";
    return input.replace(/\\([>#\\])/g, '$1');
}

RMTransText.isCommand = function(line) {
    return line.trimLeft().startsWith(">");
}

/**
* Parse a single line string into a JSON object.
* @param {string} line - The input string to parse.
* @returns {{ parameter: string, value: string, flag: string }} The parsed JSON object containing parameter, value, and flag.
*/
RMTransText.parseLineCommand = function(line) {
    // Check if input is a string
    if (typeof line !== 'string') {
        console.error('Input must be a string.');
        return null;
    }
    
    // Trim the input string
    line = line.trim();
    
    // Clear unescaped comments
    line = this.stripComments(line);
    
    // Strip out the leading '>'
    if (line.startsWith('>')) {
        line = line.substring(1).trimStart();
    }
    
    // Extract parameter name and optional value
    let parameter = null;
    let value = null;
    let flag = null;
    
    let valueStartIndex = line.lastIndexOf('<');
    if (valueStartIndex !== -1) {
        flag = line.substring(valueStartIndex + 1).trim();
        if (line.includes(':')) {
            parameter = line.substring(0, line.indexOf(':')).trim();
            value = line.substring(line.indexOf(':') + 1, valueStartIndex).trim();
        } else {
            value = line.substring(0, valueStartIndex).trim();
        }
    } else {
        if (line.includes(':')) {
            parameter = line.substring(0, line.indexOf(':')).trim();
            value = line.substring(line.indexOf(':') + 1).trim();
        } else {
            value = line.trim();
        }
    }
    
    // Return the parsed JSON object
    return {
        parameter,
        value,
        flag
    };
}

/**
* Convert a parsed JSON object into a single line string.
* @param {{ parameter: string | null, value: string | null, flag: string | null }} parsedObject - The parsed JSON object.
* @returns {string} The single line string representation of the parsed object.
*/
RMTransText.buildLineCommand = function(parsedObject) {
    // Check if parsedObject is valid
    if (!parsedObject || typeof parsedObject !== 'object') {
        console.error('Invalid input.');
        return '';
    }
    
    let line = '';
    
    // Add parameter and value if available
    if (parsedObject.parameter) {
        line += parsedObject.parameter + ':';
        if (parsedObject.value !== null) {
            line += parsedObject.value;
        }
    } else if (parsedObject.value !== null) {
        line += parsedObject.value;
    }
    
    // Add flag if available
    if (parsedObject.flag) {
        if (line !== '') {
            line += ' ';
        }
        line += '< ' + parsedObject.flag;
    }
    
    // Add '>' at the beginning
    if (line !== '') {
        line = '> ' + line;
    }
    
    return line;
}

/**
* Strips comments from the input string.
* Comments start with '#' and are trimmed.
* Escape character '\' can be used to escape '#' characters.
* 
* @param {string} input - The input string from which comments are to be stripped.
* @returns {string} The string with comments stripped.
*/
RMTransText.stripComments = function(input) {
    // Split the input string into lines
    const lines = input.split('\n');
    
    // Iterate through each line
    for (let i = 0; i < lines.length; i++) {
        // Find the index of the first unescaped '#' character
        const index = lines[i].search(/(?<!\\)#/);
        
        // If found, trim the string from the index
        if (index !== -1) {
            lines[i] = lines[i].substring(0, index).trim();
        }
    }
    
    // Join the lines back into a single string
    return lines.join('\n');
}

RMTransText.parseRPGMakerTrans = function(text = "") {
    if (!text) return;
    text = text.replaceAll("\r", "");
    const lines = text.split("\n");
    
    const getHeader = ()=> {
        // finding header
        for (let i=0; i<lines.length; i++) {
            let line = lines[i];
            if (!line.trim()) continue;
            
            if (line.startsWith(">")) {
                return line.substring(1).trim();
            }
            return line.trim();
        }
    }
    
    const segments = [];
    
    const newSegment = ()=> {
        return {
            lineStart: 0,
            lineEnd: 0,
            start:0,
            end:0,
            structure: {
                text: "",
                commands:[],
                translationIndex:[],
                hasContext: false,
            },
        }
    }
    var currentSegment;
    var currentTexts = [];
    var lineOffset = 0;
    var lineEndOffset = 0;
    
    for (let i=0; i<lines.length; i++) {
        let line = lines[i];
        lineOffset = lineEndOffset;
        lineEndOffset = lineOffset+line.length+1; // assume line break only one character
        if (line.trim().toUpperCase() == "> BEGIN STRING") {
            currentSegment = newSegment();
            currentSegment.lineStart = i;
            currentSegment.start = lineOffset;
            currentTexts = [] // initialize currentTexts
            
        } else if (currentSegment && this.isCommand(line)) {
            // handling command
            if (currentTexts?.length) {
                // process currentTexts
                if (!currentSegment.structure.commands.length) {
                    // original text is the first non command text block
                    currentSegment.structure.text = currentTexts.join("\n");
                } else {
                    // the next non command text block is translation
                    let translationIndex = currentSegment.structure.commands.length -1;
                    currentSegment.structure.translationIndex.push(translationIndex);
                    currentSegment.structure.commands[translationIndex].text = currentTexts.join("\n")
                }
                // resets currentTexts
                currentTexts = [];
            }
            
            if (line.trim().toUpperCase() == "> END STRING") {
                currentSegment.lineEnd = i;
                currentSegment.end = lineEndOffset;
                segments.push(currentSegment);
                currentSegment = undefined;
            } else {
                // register command.
                let command = this.parseLineCommand(line);
                command.start = lineOffset;
                command.end = lineEndOffset;
                currentSegment.structure.commands.push(command);
                if (command.parameter == "CONTEXT") currentSegment.structure.hasContext = true;
            }
            
        } else if (currentSegment) {
            // not command
            currentTexts.push(this.unescapeString(this.stripComments(line)));
        }
    }

    return {
        header:getHeader(),
        segments:segments,
        text: text
    };
}

RMTransText.buildRPGMakerTrans = function(parsedObj = {header:"", segments:[]}) {
    const lines = [];
    lines.push("> "+parsedObj.header);
    
    for (let i=0; i<parsedObj.segments.length; i++) {
        let thisSegment = parsedObj.segments[i];
        if (!thisSegment?.structure) continue;
        lines.push("> BEGIN STRING");
        //do something
        lines.push(this.escapeString(thisSegment.structure.text));
        for (let command of thisSegment.structure.commands) {
            lines.push(this.buildLineCommand(command));
            if (command.text) {
                lines.push(this.escapeString(command.text))
            }
        }
        // ensure blank line before end string if no global translation exist
        if (!thisSegment.structure.commands[thisSegment.structure.commands.length -1]?.text) {
            lines.push("")
        }
        
        lines.push("> END STRING");
        lines.push("");
    }
    
    return lines.join(this.exportLineBreakType || "\n");
}


RMTransText.parsedObjToTrans = function(parsedObj = {header:"", segments:[]}, options = {}) {
    options ||= {}
    const transObj = {
        originalFormat: parsedObj.header,
        data:[],
        tags:[],
        context:[],
        parameters:[],
        indexIds:{},
        contextTranslation:[]
    }
    
    // handle structure RMTrans patcher output like with working CONTEXT
    this.handleStructureWithContext = (segment, index, transObj)=> {
        if (!segment.structure.text) return;
        var rowIndex = transObj.indexIds[segment.structure.text];
        var defaultTranslation;
        if (typeof rowIndex == "undefined") {
            defaultTranslation = segment.structure.commands[segment.structure.translationIndex?.[segment.structure.translationIndex.length-1]||0]?.text || "";
            rowIndex = (transObj.data.push([segment.structure.text, defaultTranslation])) -1
            transObj.indexIds[segment.structure.text] = rowIndex;
        } else {
            defaultTranslation = transObj.data?.[rowIndex]?.[1] || ""
        }
        
        // handle pre existing translation
        if (segment.structure.translationIndex?.length > 1) {
            // handle context based translation
            var lastTranslation = defaultTranslation;
            for (let i=segment.structure.commands.length-1; i>=0; i--) {
                let command = segment.structure.commands[i];
                
                if (command.parameter == "CONTEXT" && command.value) {
                    transObj.context[rowIndex] ||= [];
                    transObj.context[rowIndex].push(command.value);
                    
                    transObj.contextTranslation[rowIndex] ||= [];
                    let translation = command.text || lastTranslation;
                    // set blank (to use global) if translation is same with default tranbslation
                    if (translation == defaultTranslation) translation = "";
                    transObj.contextTranslation[rowIndex].push({
                        contextStr:command.value,
                        translation:translation || ""
                    })
                    if (command.text) lastTranslation = command.text;
                }
            }
        } else {
            // handle global based translation only
            for (let i=segment.structure.commands.length-1; i>=0; i--) {
                let command = segment.structure.commands[i];
                if (command.parameter == "CONTEXT" && command.value) {
                    transObj.context[rowIndex] ||= [];
                    transObj.context[rowIndex].push(command.value);
                }
            }
        }
        
    }
    
    // handle arbitrary trans patch format without pre processed context
    this.handleStructureWithoutContext = (segment, index, transObj)=> {
        if (!segment?.structure?.text) return;
        var rowIndex = transObj.indexIds[segment.structure.text];
        var defaultTranslation;
        if (typeof rowIndex == "undefined") {
            defaultTranslation = segment.structure.commands[segment.structure.translationIndex?.[segment.structure.translationIndex.length-1]||0]?.text || "";
            rowIndex = (transObj.data.push([segment.structure.text, defaultTranslation])) -1
            transObj.indexIds[segment.structure.text] = rowIndex;
        } else {
            defaultTranslation = transObj.data?.[rowIndex]?.[1] || ""
        }
        
        const context = [];
        if (segment?.structure?.commands?.length) {
            for (let command of segment.structure.commands) {
                if (typeof command.parameter != 'undefined') context.push(command.parameter)
                if (typeof command.value != 'undefined') context.push(command.value)
            }
        }
        transObj.context[rowIndex] ||= [];
        transObj.context[rowIndex].push(context.join("/"));
        
    }
    
    for (let i=0; i<parsedObj.segments.length; i++) {
        let segment = parsedObj.segments[i];
        if (typeof options.segmentProcessor == "function") {
            // run custom function if any
            options.segmentProcessor.call(this, segment, i, transObj);
        } else if (segment.structure.hasContext) {
                // handle rmtrans
            this.handleStructureWithContext(segment, i, transObj)
        } else {
            // handle tes like structure
            this.handleStructureWithoutContext(segment, i, transObj)
        }
    }
    
    return transObj;
}


RMTransText.resetTranslation = function(segment) {
    var lastCommand
    for (var i of segment.structure.translationIndex) {
        lastCommand = segment.structure.commands[i];
        delete lastCommand.text
    }
    lastCommand.text = "";
    segment.structure.translationIndex = [i];
    return segment;
}

RMTransText.translateSegment = function(segment, translationPair, translationInfo) {
    
    let originalText = segment.structure.text;
    if (!originalText) return segment;
    let translation = translationPair[originalText];
    
    // skip if no translation
    if (!translation) {
        this.resetTranslation(segment);
        return segment;
    }
    
    if (!segment.structure.hasContext) {
        if (translation == originalText) return segment;
        // no context, simply put translation into the last line
        //segment.structure.commands[segment.structure.translationIndex?.[segment.structure.translationIndex.length-1]||0].text = this.escapeString(translation);
        segment.structure.commands[segment.structure.translationIndex?.[segment.structure.translationIndex.length-1]||0].text = translation;
    } else {
        // has context
        if (segment.structure.commands?.length <= 1) {
            //segment.structure.commands[segment.structure.translationIndex?.[segment.structure.translationIndex.length-1]||0].text = this.escapeString(translation);
            segment.structure.commands[segment.structure.translationIndex?.[segment.structure.translationIndex.length-1]||0].text = translation;
            return segment;
        }
        
        const nonContext = [];
        const translatedContexts = [];
        const notTranslatedContexts = [];
        
        // started from the second row
        for (let i=segment.structure.commands.length-1; i>=0; i--) {
            let command = segment.structure.commands[i]
            if (command.parameter !== "CONTEXT") {
                delete command.text;
                nonContext.push(command);
                return segment;
            }
            if (!command.value) {
                //blank context can't have context based translation
                delete command.text;
                notTranslatedContexts.push(command);
                return segment;
            }
            
            
            let contextKey = command.value+"\n"+originalText;
            if (translationPair[contextKey]) {
                delete command.flag;
                // command.text = this.escapeString(translationPair[contextKey]) || "";
                command.text = translationPair[contextKey] || "";
                translatedContexts.push(command)
            } else {
                delete command.text;
                delete command.flag;
                notTranslatedContexts.push(command);
            }
        }
        
        if (notTranslatedContexts?.length) {
            // assign global translation to the latest notTranslatedContexts
            //notTranslatedContexts[notTranslatedContexts.length - 1].text = this.escapeString(translationPair[originalText] || "")
            notTranslatedContexts[notTranslatedContexts.length - 1].text = translationPair[originalText] || ""
        }
        
        const sortedCommands = nonContext.concat(translatedContexts).concat(notTranslatedContexts);
        segment.structure.commands = sortedCommands;
    }
    return segment
}

RMTransText.translateParsedObj = function(parsedObj = {header:"", segments:[]}, translationPair, translationInfo) {
    // this assume that the parsedObj is devoid of pre existing translation
    if (!parsedObj.segments?.length) return parsedObj;

    
    for (let segment of parsedObj.segments) {
        RMTransText.translateSegment(segment, translationPair, translationInfo)
    }
    return parsedObj
}


module.exports = RMTransText