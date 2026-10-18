var {RMData} = require("www/addons/rmrgss/rmrgss.module.js");

class RmTransFile extends require("www/js/ParserBase.js").ParserBase {
	constructor(script, options, callback) {
		super(script, options, callback);
	}
}

RmTransFile.prototype.addTransData = function(translatableObj) {
	var result = this.transData;
	if (typeof result.indexIds[translatableObj.text] == "undefined") result.indexIds[translatableObj.text] = result.data.length;
	//result.indexIds[thisObj.text] = result.indexIds[thisObj.text] || result.data.length;
	
	var row = result.indexIds[translatableObj.text];
	result.data[row] 		= result.data[row] || [translatableObj.text, ""];

    // TODO : if context is two dimensional array, iteratively append the context;
	result.context[row] 	= result.context[row]||[];
    if (Array.isArray(translatableObj.context[0])) {
        // two dimensional array of context
        for (var i=0; i<translatableObj.context.length; i++ ) {
            result.context[row].push(translatableObj.context[i].join(this.contextSeparator))
        }
    } else {
        // normal default context
        result.context[row].push(translatableObj.context.join(this.contextSeparator))
    }

	if (!empty(translatableObj.parameters)) {
		result.parameters[row] 	= result.parameters[row] || [];
		result.parameters[row].push(translatableObj.parameters);
	}

	if (translatableObj.tags.length > 0) {
		// always override with new value
		// todo: merge with another occurance?		
		if (Array.isArray(translatableObj.tags) == false) translatableObj.tags = [translatableObj.tags]
		result.tags[row] 	= translatableObj.tags;

		//result.tags[row].push(translatableObj.tags);
	}
	
	return this;	
}

RmTransFile.prototype.assignContext = function(currentData){
    currentData = currentData || {
        text        : "",
        parameter   : {
            extraFields     :[]
        }
    }

    if (this.transData.originalFormat=="> ANTI TES PATCH FILE VERSION 0.2") {
        currentData.parameter = currentData.parameter || {};
        currentData.parameter.extraFields = currentData.parameter.extraFields || [];
        
        var context = ["line", currentData.parameter.startLine];
        for (var i in currentData.parameter.extraFields) {
            var fieldPart = currentData.parameter.extraFields[i].split(":");
            if (fieldPart[0] == "> EVENT CODE") context[2] = RMData.RPGM_EVENT_CODE[parseInt(fieldPart[1])]
        }
        return context;
    }
}

RmTransFile.prototype.registerInnerBlock = function(currentData) {
    currentData = currentData || {
        text        : "",
        parameter   : {
            extraFields     :[]
        }
    }
    var thisContext = this.assignContext(currentData) || [];

    if (this.transData.originalFormat=="> ANTI TES PATCH FILE VERSION 0.2") {
        // register original text
        this.register(currentData.text);

        // register extra param
        for (var i in currentData.parameter.extraFields) {
            this.register(currentData.parameter.extraFields[i]);
        }

        // register translation
        var translation = this.registerString(currentData.text, thisContext, currentData.parameter);
        if (translation == currentData.text) {
            // no translation
            this.editLastWritableData("");
        }
    }
}

RmTransFile.prototype.parse = function(script) {
    script = script || this.script || "";
    script = script.trim();
    script = script.replaceAll("\r", "");
    var lines       = script.split("\n");

    this.transData.originalFormat = lines[0].trim();

    var lastCommand = this.register(this.transData.originalFormat);

    var textStack = [];
    var currentData = {
        text        : "",
        context     : [],        
        parameter   : {}
    };
    for (var i=1; i<lines.length; i++) {
        var line = lines[i];

        // command
        if (line[0] == ">") {
            // end of string
            if (lastCommand.substr(0, "> BEGIN STRING".length) == "> BEGIN STRING") {
                currentData.text = textStack.join("\n")
            }

            var trimmedLine = line.trim()
            if (trimmedLine == "> BEGIN STRING") {
                // reset currentData
                currentData = {
                    text        :"",
                    contextParam:[],
                    parameter   :{
                        extraFields     :[],
                        startSegment    :i,
                        startLine       :i+1,
                    }
                };
                this.register(line);
            } else if (trimmedLine == "> END STRING") {
                currentData.parameter.endSegment = i;
                this.registerInnerBlock(currentData);
                this.register(line);
            } else if (trimmedLine.includes("CONTEXT")) {
                currentData.contextParam.push(line);
                currentData.parameter.extraFields.push(line);
                // TODO ... handle context stuff
                /*
                > RPGMAKER TRANS PATCH FILE VERSION 3.2

                sample context:
                > CONTEXT: Map003/events/11/pages/1/81/Dialogue < UNTRANSLATED
                > CONTEXT: Map003/events/11/pages/3/114/Dialogue < UNTRANSLATED


                wolfTrans sample context:
                > CONTEXT COMMONEVENT:1/33/Picture < UNTRANSLATED

                */

            } else {
                currentData.parameter.extraFields.push(line);

            }

            lastCommand = trimmedLine;
            textStack   = [];
            continue;
        }

        // non command

        //if (lastCommand.substr(0, "> END STRING".length) == "> END STRING") continue;

        if (lastCommand.substr(0, "> BEGIN STRING".length) == "> BEGIN STRING") {
            if (line[0] == "#") continue;
            textStack.push(line);
        } else if (lastCommand.substr(0, "> END STRING".length) == "> END STRING") {
            // text after > END STRING ... probably whitespaces / blank line
            this.register(line);
        }
    }

    return this;
}

RmTransFile.prototype.fromTrans = function(transFileObject) {
    // TODO
}

RmTransFile.prototype.toString = function() {
    return this.writableData.join("\n");
}


module.exports = RmTransFile;