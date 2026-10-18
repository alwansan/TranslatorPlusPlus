
const RMTransText = require("www/addons/rmrgss/RMTransParser.module.js");
const RGSSParser = require("www/addons/rmrgss/RGSSParser.module.js");


RMTransText.exportLineBreakType = "\r\n";
RMTransText.parsedObjToTransRMRGSS = function(parsedObj = {header:"", segments:[]}) {
    const options = {};
    options.segmentProcessor = function(segment, i, transObj) {
        if (!segment.structure.text) return;
        if (!segment.structure?.commands?.length) return this.handleStructureWithContext(segment, i, transObj)
        
        // get command block
        const contextStr = parsedObj.text.substring(segment.structure.commands[0].start, segment.structure.commands[segment.structure.commands.length-1].end)
        if (!contextStr.includes("/EventScript") && !contextStr.includes("Scripts/") && !contextStr.includes("/VariableScript")) {
            return this.handleStructureWithContext(segment, i, transObj)
        }
        
        var parserOptions;
        if (contextStr.includes("Scripts/")) {
            parserOptions = {
                baseContext: [i, "rubyScript", "Scripts"],
                baseTags: ["red"],
                baseParameter: {
                    transIndex: i,
                    type: "rgss",
                    scriptType: "Scripts",
                }
            }
            if (segment?.structure?.commands[0]?.value) {
                let contextPart = segment.structure.commands[0].value.split("/")
                parserOptions.baseContext.push(contextPart[1]);
                parserOptions.baseParameter.scriptName = contextPart[1];
            }
        } else if (contextStr.includes("/VariableScript")) {
            parserOptions = {
                baseContext: [i, "rubyScript", "VariableScript"],
                baseTags: ["red"],
                baseParameter: {
                    transIndex: i,
                    type: "rgss",
                    scriptType: "VariableScript"
                }
            }
        } else {
            parserOptions = {
                baseContext: [i, "rubyScript", "InlineScript"],
                baseTags: ["red"],
                baseParameter: {
                    transIndex: i,
                    type: "rgss",
                    scriptType: "InlineScript"
                }
            }
        }

        const scriptObj = new RGSSParser(segment.structure.text, parserOptions);
        scriptObj.parse();
        RGSSParser.mergeTransObj(transObj, scriptObj.transData);

    }
    const resultObj = this.parsedObjToTrans(parsedObj, options);
    return resultObj;
}


RMTransText.translateParsedObjRMRGSS = function(parsedObj = {header:"", segments:[]}, translationPair, translationInfo) {
    // this assume that the parsedObj is devoid of pre existing translation
    if (!parsedObj.segments?.length) return parsedObj;
    
    for (let i=0; i<parsedObj.segments.length; i++) {
        const segment = parsedObj.segments[i];
        RMTransText.translateSegment(segment, translationPair, translationInfo)

        if (!segment.structure.text) continue;
        if (!segment.structure?.commands?.length) {
            RMTransText.translateSegment(segment, translationPair, translationInfo)
            continue;
        }
        // get command block
        const contextStr = parsedObj.text.substring(segment.structure.commands[0].start, segment.structure.commands[segment.structure.commands.length-1].end)
        if (!contextStr.includes("/EventScript") && !contextStr.includes("Scripts/") && !contextStr.includes("/VariableScript")) {
            RMTransText.translateSegment(segment, translationPair, translationInfo)
            continue;
        }

        var parserOptions;
        if (contextStr.includes("Scripts/")) {
            parserOptions = {
                baseContext: [i, "rubyScript", "Scripts"],
                baseTags: ["red"]
            }
            if (segment?.structure?.commands[0]?.value) {
                let contextPart = segment.structure.commands[0].value.split("/")
                parserOptions.baseContext.push(contextPart[1]);
            }
        } else if (contextStr.includes("/VariableScript")) {
            parserOptions = {
                baseContext: [i, "rubyScript", "VariableScript"],
                baseTags: ["red"]
            }
        } else {
            parserOptions = {
                baseContext: [i, "rubyScript", "InlineScript"],
                baseTags: ["red"]
            }
        }

        const scriptObj = new RGSSParser(segment.structure.text, parserOptions);
        scriptObj.parse();
        const translation = scriptObj.getText();
        if (translation == segment.structure.text) {
            // no translation
            continue;
        }

        segment.structure.commands[segment.structure.translationIndex?.[segment.structure.translationIndex.length-1]||0].text = this.escapeString(translation);
    }
    return parsedObj
}

module.exports = RMTransText