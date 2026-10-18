module.exports = function(thisAddon) {
var defaultLiteralTags = ["ruby", "l", "r"];

var encoding 	= require('encoding-japanese');
var iconv 		= require('iconv-lite');
var path 		= require('path');
var fs 			= require('graceful-fs');
var bCopy 		= require('better-copy');
// var fse 		= require('fs-extra')

var kstg 		= require("kstg");
var {TyranoParser} = require("www/addons/kagParser/TyranoParser.js")

const ESScript = window.ESScript;
// =================================================================
//  					kag main file parser
// =================================================================
class KAGFile extends require("www/js/ParserBase.js").ParserFile {
    constructor(file, options, callback) {
        super(file, options, callback)
    }
}

KAGFile.prototype.filterText = function(text, context, parameters = {}) {
    // filter text for trans
    if (parameters?.type == "attributevalue") {
        if (parameters?.enclosure == "'") {
            return eval("'"+text+"'");
        } else if (parameters?.enclosure == '"') {
            return JSON.parse('"'+text+'"');
        } else {
            return text;
        }
    } else if (parameters?.type == "actorName") {
        return text;
    } else {
        // This is handle how the normal text will be displayed in Translator++.
        // The text in Translator++ will try to copy the behavior of the ingame linebreak.
        // Linebreak in ks script doesn't rendered as linebreak.
        // Leading whitespace also doesn't rendered ingame.
        text = text.replaceAll("\r", ""); // remove \r to prevent confusion with \n
        let texts = text.split("\n");
        // left trim each line
        texts = texts.map(t => t.trimStart());
        text = texts.join(" "); // join with a single space to prevent words from being merged together. We will restore the line break in unfilterText function.
        // text = text.replace(/^[\t]+(?=.*\n?)/gm, ''); // remove tab
        // text = text.replace(/[\n\r]+/g,'') // remove new line
        
        // replace [r] with \n for translator++ display, but keep [r] in the raw text for unfiltering.
        // Also replace trailing whitespaces (tab and space) after [r]
        text = text.replace(/\[r\][ \t]*/g, "\n");
        return text;
    }

}

KAGFile.prototype.unfilterText = function(text, context, parameters = {}) {
    // generate text from trans to raw ks
    if (parameters?.type == "attributevalue") {
        if (parameters?.enclosure == "'") {
            // enforce the correct double quote
            let txt = JSON.stringify(text);
            return txt.substring(1, txt.length-1);
        } else if (parameters?.enclosure == '"') {
            let txt = JSON.stringify(text);
            return txt.substring(1, txt.length-1);
        } else {
            // always return quoted text for safety
            return JSON.stringify(text);
        }
    } else if (parameters?.type == "actorName") {
        return text;
    } else {
        console.log("unfilter text", arguments);

        text = text.replace(/([\r]+)/g, '');
        //text = text.replace(/([\n]+)/g, "[r]\n"); <-- remove multiple with single?
        text = text.replace(/([\n])/g, "[r]\n");
        //text = "\n"+text+"\n";
        
        return text;
    }
}



// =================================================================
//  					.tjs file parser
// =================================================================
class TjsFile extends KAGFile {
    constructor(file, options, callback) {
        super(file, options, callback);
        this.options = this.options || {};
        this.type = "tjs";
        
        this.filterText = function(text) {
            return text;
        }

        this.unfilterText = function(text) {
            return text;
        }
        
    }
}

TjsFile.fetch = function(theString, parentObject) {
    var that = parentObject||this;
    var chunkOffset = [0];
    var commentsOffset = [];
    var lastLine = 0; // eslint-disable-line

    var getStartingLine = function(string, offset) {
        for (var i=offset; i>=0; i--) {
            if (string[i] == "\n") return i+1;	
        }
        return i;
    }
    var getEndLine = function(string, offset) {
        for (var i=offset; i<string.length; i++) {
            if (string[i] == "\n") return i;	
        }
        return i;
    }

    var getWholeLine = function(string, offsetStart, offsetEnd) { // eslint-disable-line
        return string.substring(getStartingLine(string, offsetStart), getEndLine(string, offsetEnd));
    }

    var isInsideCommand = function(offset) {
        for (var i=0; i<commentsOffset.length; i++) {
            var thisCommentOffset = commentsOffset[i]
            if (thisCommentOffset.start<offset && thisCommentOffset.end>offset) return true
        }
        return false;
    }

    var isComment = function(string, offset) {
        var startingLine = getStartingLine(string, offset);
        if (string.substring(startingLine, offset).includes('//')) return true
        return false;
    }
        

    theString.replace(/\/\*(.+?)\*\//gs, function() {
        //console.log("Comments : ", arguments);
        commentsOffset.push({
            start:arguments[2],
            end:arguments[2]+arguments[0].length,
        });
        return arguments[0]
    })

    // this version doesn't capture non uniode
    //theString.replace(/(?<=(["']\b))(?:(?=(\\?))\2.)*?(?=\1)/gms, function() {
    theString.replace(/(?<=((?<=[\s,.:;"']|^)["']))(?:(?=(\\?))\2.)*?(?=\1)/gmu, function() {
        //console.log(arguments);
        var offset = arguments[3];
        var text = arguments[4];
        var endOffset = offset+arguments[0].length;
        var lineStartAt = getStartingLine(arguments[4], arguments[3]);
        /*
        console.log("this line started at ", lineStartAt, arguments[4][lineStartAt]);
        console.log("offset end : ", arguments[3]+arguments[0].length);
        */
        
        var lastOffset = chunkOffset[chunkOffset.length-1]||0;

        
        // calculating line count
        //var lineCount = lastLine+text.substring(lastOffset, offset).split("\n").length;
        
        var lines = text.substring(0, offset).split("\n");
        var lineCount = lines.length;
        var cols = lines[lines.length-1].length;
        //console.log("Translatable text at line :", lineCount);

        that.register(text.substring(lastOffset, offset));
        if (!isInsideCommand(offset) && !isComment(text, offset)) {
            var previoustext = text.substring(lineStartAt, offset);
            var context = ["line", lineCount, "col", cols];
            //console.log("previous text", previoustext);
            if (/System\.title\s*=\s*/.test(previoustext)) context.push("title")
            that.registerString(text.substring(offset, endOffset), context);
        }

        lastLine = lineCount;
        chunkOffset.push(endOffset);
        // registering string
            for (var cOffset in commentsOffset) { // eslint-disable-line
                //if (commentOffset[cOffset])
            }
        // end of registering string
        return arguments[0];
    })	


    var lastOffset = chunkOffset[chunkOffset.length-1]||0;
    // register the final part of the data
    that.register(theString.substring(lastOffset));
    
}

TjsFile.fetch = async function(theString, parentObject) {
    var esScript = new ESScript(theString, this.options);
    await esScript.parse();
    this.writableData = esScript.writableData;
    this.translatableTexts  = esScript.translatableTexts;
    this.esScript = esScript;
}

/*
TjsFile.prototype.readFile = async function(filePath) {
    filePath = filePath || this.file;
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            if (err) return reject();
            
            resolve(data);
        })			
    })

}
*/

TjsFile.prototype.parse = async function() {
    this.contextEnter(path.basename(this.file));
    this.promise = new Promise(async (resolve, reject) => {
        /*
        var data = await this.readFile(this.file);
        this.buffer = data;
        this.encoding = encoding.detect(data);
        this.string = iconv.decode(this.buffer, this.encoding);
        */
        this.string 	= await this.readTextFromFile();
        TjsFile.fetch.call(this, this.string)
        
        this.contextEnd();
        resolve(this.string);
    })
    return this.promise;	
}

/*
var tjsFile = new TjsFile('F:/test/KAG3/test.tjs');
console.log("test parsing js");
tjsFile.parse()
.then(() => {
    console.warn("TJS File", tjsFile);
});
*/


// =================================================================
//  					.ks file parser
// =================================================================

class KsFile extends KAGFile {
    constructor(file, options, callback) {
        super(file, options, callback);
        this.options = this.options || {};
        this.options.literalTags = this.options.literalTags || ["ruby", "l", "r"]
        if (!this.options.literalTags.includes("r")) this.options.literalTags.push("r");
        
        this.type = "ks";

    }
}

KsFile.tagFlags = {
    'macro' : {
        closureType:'start'
    }
    ,'endmacro' : {
        closureType:'end'
    }
    
}

KsFile.parser = function(data) {
    
}


KsFile.prototype.storeScript = function(data) {
    // store script so that they will never changed
    this.__scriptStorage = this.__scriptStorage || [];
    this.__scriptStorage.push(data);
    return this.__scriptStorage.length - 1;
}

KsFile.prototype.getScript = function(id) {
    // get text from <isscript> tag
    this.__scriptStorage = this.__scriptStorage || [];
    
    return this.__scriptStorage[id];
}


KsFile.prototype.htmlIfy = function(string) {
    string = string || this.string;
    if (string.trim().length < 1) return $(document.createTextNode(''));
    
    var that = this;
    // var ignored = {};
    // var iscript = {};
    // substitute escape character [[
    var escaper = "-------"+Date.now()+":"+Math.random()+"-------"
    string = string.replace(/\[\[/g, escaper)
    
    //string = string.replace(/\[ignore[^]]*\](.+?)\[endignore\]/g, '')
    
    // replace @ command with proper [] command
    // string = string.replace(/^([\t]*)[\@](.*(?=\n?))/gm, '[$2]');
    
    
    
    // remove anything between [ignore] [endignore]
    //string = string.replace(/\[ignore\](.+?)\[endignore\]/gs, '')
    string = string.replace(/\[ignore\](.+?)\[endignore\]/gs, function() {
        //var escaper = "-------ignored"+ignored.length+Date.now()+":"+Math.random()+"-------"
        //ignored[escaper] = arguments[0] // including the outer tag
        return "<ignore>"+that.storeScript(arguments[1])+"</ignore>";
    })
    // @ command ignore
    string = string.replace(/^[\t]*@ignore\s*?(.*?)^[\t]*@endignore\n?/gsm, function() {
        //var escaper = "-------ignored"+ignored.length+Date.now()+":"+Math.random()+"-------"
        //ignored[escaper] = arguments[0] // including the outer tag
        return "<ignore>"+that.storeScript(arguments[1])+"</ignore>";
    })
    
    
    // remove anything between [iscript] [endscript]
    // script is being handled with different method
    string = string.replace(/\[iscript\](.+?)\[endscript\]/gs, function() {
        //var escaper = "-------iscript"+iscript.length+Date.now()+":"+Math.random()+"-------"
        //iscript[escaper] = arguments[1] // excluding the outer tag
        return "<iscript>"+that.storeScript(arguments[1])+"</iscript>";
    })
    // @ command iscript
    string = string.replace(/^[\t]*@iscript\s*?(.*?)^[\t]*@endscript\n?/gsm, function() {
        //var escaper = "-------iscript"+iscript.length+Date.now()+":"+Math.random()+"-------"
        //iscript[escaper] = arguments[0] // including the outer tag
        return "<at-iscript>"+that.storeScript(arguments[1])+"</at-iscript>";
    })

    
    // parsing macro
    //string = string.replace(/\[macro\s(.+?)\](.+?)\[endmacro\]/gs, '<macro $1>$2</macro>');
    
    // remove any line starting with ; * @
    // string = string.replace(/^[\;\*\@].*\n?/gm, function() {
    // match tab only with positive look ahead ^[\t]*(?=[\;\*\@].*\n?)
    
    
    //string = string.replace(/^([\t]*)[\;\*\@].*\n?/gm, function() {
    string = string.replace(/^([\t]*)[;*].*\n?/gm, function() {
        return "<skip>"+arguments[0]+"</skip>"
    });
    //string = string.replace(/\[/g, "<tag command=");
    //string = string.replace(/\]/g, " />");
    
    // ========================================================
    // parsing tags
    // ========================================================
    var attributes = {};
    // replace attributes inside tags to escape nested []
    string = string.replace(/(\S+)\s*=\s*([']|["])([\W\w]*?)\2/g, function() {
        //console.log(arguments);
        var escaper = "---attr"+arguments[4]+":"+Date.now()+":"+Math.random()+"---"
        attributes[escaper] = arguments[0];
        return escaper;
    })


    //string = string.replace(/\[(.+?)\]/g, '<tag $1 />')
    string = string.replace(/\[(.+?)\]/g, function() {
        var command = arguments[1].split(" ")[0];
        if (that.options.literalTags.includes(command)) return arguments[0];
        return '<tag command="'+command+'" '+arguments[1]+'>'+arguments[0]+'</tag>'
    })
    
    // restore attributes inside tags
    for (var attr in attributes) {
        string = string.split(attr).join(attributes[attr])
    }	
    

    
    // parsing @ command
    string = string.replace(/^([\t]*)[@](.*(?=\n?))/gm, function() {
        var command = arguments[2].split(" ")[0];
        //console.log(arguments);
        return '<tag command="'+command+'" '+arguments[2]+'>'+arguments[0]+'</tag>'
    });
    
    // bring back escape character [[
    string = string.split(escaper).join("[[")
    /*
    for (var boundary in ignored) {
        string = string.split(boundary).join(ignored[boundary])
    }
    
    for (var boundary in iscript) {
        string = string.split(boundary).join(iscript[boundary])
    }
    */
    
    //console.log(string);
    //return string;
    fs.writeFileSync(this.file+".html", string)
    return $.parseHTML(string);
}

KsFile.prototype.unHtmlIfy = function(htmlElement) {
    var htmlString = htmlElement.outerHTML;
    return htmlString;
}


KsFile.prototype.parse = async function() {
    this.options.onParseStart.call(this, this.file)
    this.contextEnter(path.basename(this.file));

    
    this.promise = new Promise((resolve, reject) => {
        fs.readFile(this.file, (err, data) => {
            if (err) return reject();
            this.buffer = data;
        
            this.encoding = encoding.detect(data);
            // if encoding is not detected, read with default writeEncoding
            if (!this.encoding) this.encoding = this.writeEncoding;
            
            try {
                this.string = iconv.decode(this.buffer, this.encoding);
            } catch (e) {
                console.warn("Unable to decode string try 'Shift_JIS'", e);
                this.string = iconv.decode(this.buffer, 'Shift_JIS');
            }
    
            var htmlElm = this.htmlIfy();
            //console.log("HTML structure of : ", this.file);
            //console.log(htmlElm);
            
            for (var i=0; i<htmlElm.length; i++) {
                var thisElm = htmlElm[i];
                if (thisElm.nodeName !== "#text") {
                    // handle non text node
                    var commandName;
                    try {
                        commandName = thisElm.getAttribute("command");
                    } catch (e) {
                        commandName = "";
                        console.warn(e)
                    }
                    
                    if (thisElm.nodeName == 'SKIP') {
                        this.register(thisElm.innerText);
                        continue;
                    } else if (thisElm.nodeName == 'ISCRIPT') {
                        //this.register('[iscript]'+thisElm.innerText+'[endscript]');
                        this.register('[iscript]'+this.getScript(thisElm.innerText)+'[endscript]');
                        continue;
                    } else if (thisElm.nodeName == 'IGNORE') {
                        //this.register('[iscript]'+thisElm.innerText+'[endscript]');
                        this.register('[ignore]'+this.getScript(thisElm.innerText)+'[endignore]');
                        continue;
                    } else if (thisElm.nodeName == 'AT-IGNORE') {
                        //this.register('[iscript]'+thisElm.innerText+'[endscript]');
                        this.register('@ignore'+this.getScript(thisElm.innerText)+'@endignore');
                        continue;
                    } else if (thisElm.nodeName == 'AT-ISCRIPT') {
                        //this.register('[iscript]'+thisElm.innerText+'[endscript]');
                        this.register('@iscript'+this.getScript(thisElm.innerText)+'@endscript');
                        continue;
                    }
    
                    
                    if (KsFile.tagFlags[commandName]) {
                        if (KsFile.tagFlags[commandName].closureType == 'start') this.contextEnter(commandName)
                        if (KsFile.tagFlags[commandName].closureType == 'end') this.contextEnd(commandName)
                        
                    }
    
                    this.register(thisElm.innerText);
                    continue;
                }
                
                // handle text node
                this.registerString(thisElm.textContent, ["text", i]);
            }
            
            this.contextEnd();
            this.options.onParseEnd.call(this, this.file)			
            resolve(this);
        })
        
    })
    
    return this.promise;
    
}


/*
KsFile.prototype.readFile = async function() {
    return new Promise((resolve, reject) => {
        fs.readFile(this.file, (err, data) => {
            if (err) return reject();
            
            resolve(data);
        })
    })
            
}
*/

/**
 * Create grouped translatable Text and raw data from structure
 * @param  {} structure
 */
KsFile.prototype.groupStructure = function(structure) {

    structure.contents = structure.contents || [];
    var previousState = null;
    var lastPointer = 0; // begining of file
    var lastLine = {};

    var result = []
    var groupId = 0;
    var lastGroupId = 0;

    var scriptTagLevel = 0;
    var ignoreTagLevel = 0;
    var specialHandler = false;
    
    for (var i=0; i<structure.contents.length; i++) {
        var thisLine = structure.contents[i];
        var lastLine = structure.contents[i-1] || {};
        var nextLine = structure.contents[i+1] || {};
        thisLine.name = thisLine.name || {};
        nextLine.name = nextLine.name || {};
        thisLine.loc = thisLine.loc || {};

        var createNewGroup = false;

        //if (lastGroupId !== groupId) console.log("Group ID : "+groupId);
        result[groupId] = result[groupId] || {
            list : [],
            start : thisLine.start,
            end : thisLine.end,
            loc : {
                start : thisLine.loc.start,
                end : thisLine.loc.end
            }
        }

        result[groupId].end = thisLine.end;
        result[groupId].loc.end = thisLine.loc.end;
        result[groupId].list.push(thisLine);

        //console.log("|-: ", i, thisLine.name.name || "", thisLine);
        //console.log("|-- isScript level ", scriptTagLevel);
        if (scriptTagLevel > 0) {
            result[groupId].type = "script";

            //console.log("|-- next line", nextLine);
            if (nextLine.name.name == "endscript") {
                //console.log("|---- next is endscript");
                //console.log("|======================================");
                lastGroupId = groupId;

                result[groupId].raw = this.string.substring(result[groupId].start, result[groupId].end);
                groupId++;
                scriptTagLevel--;
                specialHandler = false;
            }
            lastGroupId = groupId;
            continue;
        }
        //console.log("|-- ignore level ", ignoreTagLevel);
        if (ignoreTagLevel > 0) {
            result[groupId].type = "ignorable";

            //console.log("|--endignore", i, thisLine);
            //console.log("|--Next line", nextLine);
            if (nextLine.name.name == "endignore") {
                //console.log("|---- next is endignore");
                //console.log("|======================================");
                lastGroupId = groupId;

                result[groupId].raw = this.string.substring(result[groupId].start, result[groupId].end);
                groupId++;
                ignoreTagLevel--;
                specialHandler = false;
            }
            lastGroupId = groupId;
            continue;
        }


        if (specialHandler == false) {
            //console.log("|--SPECIAL HANDLER == false");
            if (thisLine.name.name == "iscript" && nextLine.name.name !== "endscript") {
                //console.log("|--marking as isScript");
                scriptTagLevel++;
                specialHandler = true;
            } else if (thisLine.name.name == "ignore" && nextLine.name.name !== "endignore") {
                //console.log("|--marking as ignore");
                ignoreTagLevel++;
                specialHandler = true;
            }
        }

        if (thisLine.type == "Text" || this.options.literalTags.includes(thisLine.name.name)) {
            result[groupId].type = "translatable";
            //console.log("|--is Text", thisLine);
            //console.log("|--Next", nextLine);
            if (nextLine.type !== "Text" && this.options.literalTags.includes(nextLine.name.name)==false) {
                //console.log("|---- next is non text...");
                //console.log("|---- Checking whether next is literal tags", this.options.literalTags, nextLine.name.name, this.options.literalTags.includes(nextLine.name.name));
                createNewGroup = true;
            }
        } else {
            // non text
            result[groupId].type = "command";

            //console.log("|--Non Text", thisLine);
            //console.log("|--Next line", nextLine);
            if (nextLine.type == "Text" || this.options.literalTags.includes(nextLine.name.name)) {
                //console.log("|---- next is text...");
                //console.log("|======================================");

                createNewGroup = true;
                
            }
    
        }

        result[groupId].raw = this.string.substring(result[groupId].start, result[groupId].end);
        lastGroupId = groupId;
        if (createNewGroup) groupId++;
    }
    return result
}


/**
 * Alternative parser using KSTG library
 * but current KSTG library is hang up on certain file
 */
KsFile.prototype.parse2 = async function() {
    this.options.onParseStart.call(this, this.file)
    this.contextEnter(path.basename(this.file));
    
    /*
    var data = await this.readFile();

    this.buffer = data;
        
    this.encoding = encoding.detect(data);
    // if encoding is not detected, read with default writeEncoding
    if (!this.encoding) this.encoding = this.writeEncoding;
    
    try {
        this.string = iconv.decode(this.buffer, this.encoding);
    } catch (e) {
        console.warn("Unable to decode string try 'Shift_JIS'", e);
        this.string = iconv.decode(this.buffer, 'Shift_JIS');
    }
    */
    this.string 	= await this.readTextFromFile();
    var structure 	= kstg.parse(this.string);
    //console.log(structure);

    var structureGroup = this.groupStructure(structure);
    //console.log(structureGroup);
    
    for (var i=0; i<structureGroup.length; i++) {
        if (structureGroup[i].type !== "translatable") {
            this.register(structureGroup[i].raw);
        } else if (structureGroup[i].type == "translatable") {
            this.registerString(structureGroup[i].raw, ["text", i]);
        }
    }


    this.contextEnd();
    this.options.onParseEnd.call(this, this.file)
    
    
    return new Promise((resolve, reject) => {
        resolve(this)
    });
    
}



/**
 * Parser with TyranoParser.js
 */
KsFile.prototype.parse3 = async function() {
    this.options.onParseStart.call(this, this.file)
    this.contextEnter(path.basename(this.file));
    
    /*
    var data = await this.readFile();

    this.buffer = data;
        
    this.encoding = encoding.detect(data);
    // if encoding is not detected, read with default writeEncoding
    if (!this.encoding) this.encoding = this.writeEncoding;
    
    try {
        this.string = iconv.decode(this.buffer, this.encoding);
    } catch (e) {
        console.warn("Unable to decode string try 'Shift_JIS'", e);
        this.string = iconv.decode(this.buffer, 'Shift_JIS');
    }
    */
    this.string 	= await this.readTextFromFile();

    var structure = TyranoParser.parseScenario(this.string)
    console.warn("Scenario structure", structure);

    var structureGroup = TyranoParser.getWritable(structure, this.options.literalTags, {
        captureTags: this.options.captureTags,
        actorTags: this.options.actorTags,
    });
    console.warn("Structure group:", structureGroup);
    console.log("%cKSFile", "color:salmon", this);
    
    for (var i=0; i<structureGroup.length; i++) {
        if (structureGroup[i].group == "translatable") {
            const param = {
                start:structureGroup[i].start,
                end:structureGroup[i].end
            }
            let context = ["index", i];
            if (structureGroup[i].type)  param.type = structureGroup[i].type;
            if (structureGroup[i].rowInfoText)  param.rowInfoText = structureGroup[i].rowInfoText;
            if (structureGroup[i].enclosure)  param.enclosure = structureGroup[i].enclosure;

            if (structureGroup[i].type == "attributevalue") {
                context = [...context, "tag", structureGroup[i].tag, "attribute", structureGroup[i].attribute];
            } else if (structureGroup[i].type) {
                context = [...context, structureGroup[i].type];
            } else {
                context = [...context, "text"];
            }

            this.registerString(structureGroup[i].raw, context, param);
        } else if (structureGroup[i].group == "script") {
            console.log("Parsing embeded script");
            // should parse with ES parser here
            var esScript = new ESScript(structureGroup[i].raw, {
                ...this.options,
                ... {baseContext: [path.basename(this.file), "index", i, "tag", "iscript"], baseTags: ["red"]}
            });
            await esScript.parse();
            console.log("esScript data", esScript);

            esScript.writableData = esScript.writableData ||[];
            esScript.translatableTexts = esScript.translatableTexts ||[]
            console.log("esScript writable data", esScript.writableData);
            this.writableData = this.writableData.concat(esScript.writableData);


            for (var j=0; j<esScript.translatableTexts.length; j++) {
                var newTranslatable = esScript.translatableTexts[j]
                newTranslatable.parameters = newTranslatable.parameters || {}
                // add offset
                newTranslatable.parameters.start += structureGroup[i].start; 
                newTranslatable.parameters.end += structureGroup[i].start; 
                newTranslatable.parameters.type = "script"; 
                this.translatableTexts.push(newTranslatable);
            }

        } else {
            this.register(structureGroup[i].raw);			
        }
    }


    this.contextEnd();
    this.options.onParseEnd.call(this, this.file)
    
    
    return new Promise((resolve, reject) => {
        resolve(this)
    });
    
}



// =================================================================
//  							KAGJs
// =================================================================

var KAGJs = function(dir, options, callback) {
    this.dir 				= path.normalize(dir);
    this.options 			= options || {};
    this.translationData 	= this.options.translationData||{};

    this.contextSeparator 	= this.options.contextSeparator || "/"
    this.showBlank 			= this.options.showBlank || false;
    this.callback 			= callback || function() {}
    this.promise;
    this.isInitialized 		= false;
    this.translatable 		= {};
    this.options.filterOptions = this.options.filterOptions || {};
    this.options.filterOptions.files = this.options.filterOptions.files || [];
    
    if (Array.isArray(this.options.files) && this.options.files.length) {
        if (this.options.filterOptions.files.length == 0) {
            this.options.filterOptions.files = this.options.files
        }
    }

}

KAGJs.prototype.getRelativePath = function(stringPath) {
    stringPath = path.normalize(stringPath);
    
    return stringPath.substring(this.dir.length, stringPath.length);
}

KAGJs.prototype.readDir = async function(dir) {
    return new Promise((resolve, reject) => {
    fs.readdir(dir, (error, files) => {
        if (error) {
        return reject(error);
        }
        Promise.all(files.map((file) => {
        return new Promise((resolve, reject) => {
            const filepath = path.join(dir, file);
            fs.stat(filepath, (error, stats) => {
            if (error) {
                return reject(error);
            }
            if (stats.isDirectory()) {
                this.readDir(filepath).then(resolve);
            } else if (stats.isFile()) {
                resolve(filepath);
            }
            });
        });
        }))
        .then((foldersContents) => {
        resolve(foldersContents.reduce((all, folderContents) => all.concat(folderContents), []));
        });
    });
    });
    
}


KAGJs.prototype.writeToFolder = async function(targetFolder) {
    //if (this.writeMode == false) return console.warn("Unable to write. Reason : not in write mode!");
    ui.log("Start exporting into "+targetFolder);
    
    for (let relPath in this.translatable) {
        let thisFile = this.translatable[relPath]
       
        let targetPath = path.join(targetFolder, relPath);
        //console.log("creating directory : ", path.dirname(targetPath));
        try {
            fs.mkdirSync(path.dirname(targetPath), {recursive:true});
        } catch(e) {
            console.warn("Unable to create directory ", path.dirname(targetPath));
            throw(e);
        }
        
		let encoding = this.options.writeEncoding || thisFile.encoding || thisAddon.config.importEncoding || thisAddon.config.writeEncoding || 'utf16le';
                    // set by dialog              ||  setting from inject dialog     ||  setting from options          || file's original encoding || 'utf16le';
        if (encoding == "ascii") encoding = "utf8";
        ui.log("Append job file write into: "+targetPath);
        await thisFile.write(targetPath, encoding);
    }
    ui.log("All files successfully written");

}


KAGJs.prototype.generateData = function(fileObject) {
    var result = {
        data:[],
        context:[],
        tags:[],
        parameters:[],
        indexIds:{}
    }
    if (!fileObject.translatableTexts) return result;
    
    for (var i=0; i<fileObject.translatableTexts.length; i++) {
        var thisObj = fileObject.translatableTexts[i];

        //result.indexIds[thisObj.text] = result.indexIds[thisObj.text] || result.data.length;
        if (typeof result.indexIds[thisObj.text] == "undefined") result.indexIds[thisObj.text] = result.data.length;
        //result.indexIds[thisObj.text] = result.indexIds[thisObj.text] || result.data.length;
        
        var row = result.indexIds[thisObj.text];
        result.data[row] 	= result.data[row] || [thisObj.text, ""];
        result.context[row] = result.context[row]||[];
        result.context[row].push(thisObj.context.join(this.contextSeparator))
        result.parameters[row] = result.parameters[row]||[];
        result.parameters[row].push(thisObj.parameters)

        if (!thisObj?.parameters?.leftHand) continue;
        if (thisObj.parameters.leftHand.type == "assignment") {
            //console.warn("Title found, assigning game title", thisObj);
            if (thisObj.parameters.leftHand.context.join(".") == "System.title") this.gameTitle = thisObj.text;
        }
        
        //if (thisObj.context.includes('title')) result.title = thisObj.text;
    }
    
    return result;
    
}

KAGJs.prototype.toTrans = function() {
    if (this.isInitialized == false) return console.error('Not initialized, Run init() first!');
    var transData = {
        project:{
            gameEngine: this.options.engineName || "kag",
            files:{}
        }
    }
    
    for (var relpath in this.translatable) {
        // change \ to /
        
        var thisTranslatable = this.translatable[relpath]
        
        relpath = relpath.replace(/\\/g, "/")
        
        if (thisTranslatable.type == 'ks') {
            let thisData = {};
            
            
            let thisGenData = this.generateData(thisTranslatable);
            if (!this.showBlank) if (thisGenData.data.length < 1) continue;
            thisData = {};
            thisData.data 		= thisGenData.data
            thisData.context 	= thisGenData.context
            thisData.tags 		= thisGenData.tags
            thisData.parameters = thisGenData.parameters
            thisData.encoding	= thisTranslatable.encoding;
            thisData.detectedEncoding = thisTranslatable.detectedEncoding;
            thisData.filename 	= path.basename(relpath);
            thisData.basename 	= path.basename(relpath);
            thisData.indexIds 	= thisGenData.indexIds
            //thisData.groupLevel 	= thisGenData.groupLevel;	
            thisData.extension 	= path.extname(relpath);
            thisData.lineBreak 	= "\n";
            thisData.path 		= relpath // path is relative path from cache dir
            thisData.relPath 		= relpath // relpath is real filename address on context	
            thisData.type 		= null; // no special type
            thisData.originalFormat = "KAG's .ks File";			
            thisData.dirname 		= path.dirname(relpath);	
            
            transData.project.files[relpath] = thisData;
        } else if (thisTranslatable.type == 'tjs') {
            let thisData = {};
            
            
            let thisGenData = this.generateData(thisTranslatable);
            if (!this.showBlank) if (thisGenData.data.length < 1) continue;
            thisData = {};
            thisData.data 		= thisGenData.data
            thisData.context 	= thisGenData.context
            thisData.tags 		= thisGenData.tags
            thisData.parameters	= thisGenData.parameters
            thisData.encoding	= thisTranslatable.encoding;
            thisData.detectedEncoding = thisTranslatable.detectedEncoding;
            thisData.filename 	= path.basename(relpath);
            thisData.basename 	= path.basename(relpath);
            thisData.indexIds 	= thisGenData.indexIds
            //thisData.groupLevel 	= thisGenData.groupLevel;	
            thisData.extension 	= path.extname(relpath);
            thisData.lineBreak 	= "\n";
            thisData.path 		= relpath // path is relative path from cache dir
            thisData.relPath 	= relpath // relpath is real filename address on context	
            thisData.type 		= null; // no special type
            thisData.originalFormat = "KAG's .tjs File";			
            thisData.dirname 		= path.dirname(relpath);	
            
            transData.project.files[relpath] = thisData;
            
            //if (thisGenData.title) transData.project.gameTitle = thisGenData.title;
            
        }
        
    }

    transData.project.gameTitle         = this.gameTitle;
    transData.project.parser            = thisAddon.package.name;
    transData.project.parserVersion     = thisAddon.package.version;

    return transData;
}

KAGJs.prototype.isMatchFilter = function(filePath) {
    // accept all for blank array
    console.log("Filtering ", filePath, this.options.filterOptions.files, this.options);
    if (this.options.filterOptions.files.length == 0) return true;
    if (typeof this.options.filterOptions.files == 'string') {
        if (this.options.filterOptions.files == filePath) return true;
    }
    if (this.options.filterOptions.files.includes(filePath)) {
        console.log("Match filter : ", filePath);
        return true;
    }

    return false;
}

KAGJs.prototype.init = async function() {
 
    return new Promise(async(resolve, reject) =>{
        var files = await this.readDir(this.dir)
            //console.log(files);
        for (var i=0; i<files.length; i++) {
            var thisFile = files[i];
            
            var relativePath = this.getRelativePath(thisFile);
            var relativePathInv = relativePath.replace(/\\/g, "/");

            if (!this.isMatchFilter(relativePathInv)) continue;

            var translationPair = this.translationData[relativePathInv] || {};
            var thisOptions = Object.assign({}, this.options, translationPair)
            
            if (path.extname(thisFile).toLowerCase() == ".ks") {
                await ui.log("Parsing ks file : "+thisFile);
                var thisKS = new KsFile(thisFile, thisOptions);
                this.translatable[relativePath] = thisKS;
                if (this.options.writeMode) {
                    if (!this.options.readEncoding) {
                        thisKS.readEncoding = this.options.encodingMaps?.[relativePathInv]
                        ui.log("Read encoding is left to default which is : "+thisKS.readEncoding);
                    } else {
                        ui.log("Read encoding is set by user to : "+ thisKS.readEncoding);
                    }
                    if (!this.options.writeEncoding) {
                        thisKS.writeEncoding = this.options.encodingMaps?.[relativePathInv]
                        ui.log("Write encoding is left to default which is : "+thisKS.writeEncoding);
                    } else {
                        ui.log("Write encoding is set by user to : "+ thisKS.writeEncoding);
                    }
                }

                if (thisAddon.config.useLegacyParser) {
                    //promises.push(thisKS.parse())
                    await thisKS.parse();
                } else {
                    //promises.push(thisKS.parse2())
                    await thisKS.parse3();
                }
            } else if (path.extname(thisFile).toLowerCase() == ".tjs") {
                await ui.log("Parsing tjs file : "+thisFile);
                var thisTJS = new TjsFile(thisFile, thisOptions);
                if (this.options.writeMode) {
                    if (!this.options.readEncoding) {
                        thisTJS.readEncoding = this.options.encodingMaps?.[relativePathInv]
                        ui.log("Read encoding is left to default which is : "+thisTJS.readEncoding);
                    } else {
                        ui.log("Read encoding is set by user to : "+ thisTJS.readEncoding);
                    }
                    if (!this.options.writeEncoding) {
                        thisTJS.writeEncoding = this.options.encodingMaps?.[relativePathInv]
                        ui.log("Write encoding is left to default which is : "+thisTJS.writeEncoding);
                    } else {
                        ui.log("Write encoding is set by user to : "+ thisTJS.writeEncoding);
                    }
                }
                this.translatable[relativePath] = thisTJS;
                //promises.push(thisTJS.parse())
                await thisTJS.parse();
            }
        }
        
        this.isInitialized = true;
        resolve();
        return;

    })

}





//console.log(ksFile);
const utils = {};

var renamePath = async function(oldpath, newpath) {
    return new Promise((resolve, reject)=>{
        fs.rename(oldpath, newpath, ()=>{
            resolve(newpath);
        });
    })
}
utils.renamePath = renamePath;

// var normalizeStructure = async function(sourceDir) {
//     //copy ./KrkrExtract_Output/data to ./data
//     var KrkrExtract = path.join(sourceDir, "KrkrExtract_Output")

    
//     if (common.isDir(KrkrExtract) == false && common.isDir(path.join(sourceDir, "data"))) {
//         return Promise.resolve();
//     }
//     if (common.isDir(KrkrExtract) == false && common.isDir(path.join(sourceDir, "data")) == false) {
//         var msg = "Expected Data folder is not found. Please extract all the xp3 archives first before working with Translator++.";
//         alert(msg);
//         return Promise.reject(msg);
//     }
    
//     var stats = fs.statSync(KrkrExtract);
//     var filesToMove = [];
//     return new Promise(async (resolve, reject) => {
//         if (stats.isDirectory() == false) return resolve()
            
//         filesToMove = fs.readdirSync(KrkrExtract);		
        
        
//         var promises = [];
//         for (var i=0; i<filesToMove.length; i++) {
//             var newPath = path.join(sourceDir, filesToMove[i])
//             console.log("Moving", path.join(KrkrExtract, filesToMove[i]), newPath);
//             promises.push(fse.move(path.join(KrkrExtract, filesToMove[i]), newPath, {overwrite:true}))
//         }

//         Promise.all(promises)
//         .then(() => {
//             fs.rmdir(KrkrExtract, {recursive : true}, () => {
//                 resolve();
//             });
//         })
//         /*
//         .then(async () => {
//             console.log("filesToMove", filesToMove);
//             for (var i in filesToMove) {
//                 if (common.isFile(path.join(sourceDir, filesToMove[i]+".xp3")) == false) continue;
//                 await renamePath(path.join(sourceDir, filesToMove[i]+".xp3"), path.join(sourceDir, filesToMove[i]+".xp3.bak"));
//             }

//         })
//         */
        
//     })
// }
// utils.normalizeStructure = normalizeStructure;


var decryptScenarioFile = async function(dir) {
    var binPath = nwPath.join(thisAddon.getLocation(), "bin/KirikiriTools/KirikiriDescrambler.exe")
	await common.aSpawn(binPath, [dir], {
        onData : async (data)=>{
            await ui.log(data.toString());
        }
    });
}
utils.decryptScenarioFile = decryptScenarioFile;

utils.isXP3 = async function(exeFile) {
    const aec = addonLoader.getAddon("aec");
    let result = await aec.detectFileType(exeFile);
    ui.log("IS XP3?", exeFile, "result:", result);
    if (!result) return;
    if (result.trim().toLowerCase() == "xp3") return true;
}

/**
 * Get the ordered XP3 list by priority in a directory (not recursive)
 * XP3 that packed with exe file is not detected
 * @param {String} gameDir - Game directory
 */
utils.getAllXP3 = async function(gameDir) {
    let dirContent = await fs.promises.readdir(gameDir);
    let data = [];
    let resources = [];
    let patches = [];

    for (let i in dirContent) {
        let thisFile = dirContent[i];

        if (nwPath.extname(thisFile).toLowerCase() !== ".xp3") continue;
        if (nwPath.basename(thisFile).toLowerCase() == "data.xp3") {
            data.push(thisFile);
        } else if (nwPath.basename(thisFile).toLowerCase().substring(0, 5) == "patch") {
            patches.push(thisFile)
        } else {
            resources.push(thisFile)
        }
    }

    // natural sort
    var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
    patches.sort(collator.compare);

    return data.concat(resources, patches)
}

utils.extractAllXP3 = async function(gameExe, targetDir) {
    var aec = addonLoader.getAddon("aec");
    if (await utils.isXP3(gameExe)) {
        ui.log("Found XP3 archive in exe file, extracting!");
        let dataFolder = nwPath.join(targetDir, "data");
        await aec.extractFile(gameExe, dataFolder);
    } else {
        ui.log("Exe file not XP3");
    }

    const sourceDir = nwPath.dirname(gameExe);
    const xp3s = await utils.getAllXP3(nwPath.dirname(gameExe)); 
    ui.log("Found XP3 files. ORDER DOES MATTER!", xp3s);
    for (let i in xp3s) {
        let fname = common.getFilename(xp3s[i])
        await aec.extractFile(nwPath.join(sourceDir, xp3s[i]), nwPath.join(targetDir, fname));
    }
}

utils.extractXP3Files = async function(xp3Files=[], targetDir="") {
    const aec = addonLoader.getAddon("aec");
    if (!xp3Files?.length) return;
    if (typeof xp3Files == "string") {
        if (xp3Files.includes(";")) {
            xp3Files = xp3Files.split(";");
        } else {
            xp3Files = [xp3Files];
        }
    }
    if (!aec) await ui.log.error("AEC addon not found! Pleae install AEC addon first.");
    for (let i in xp3Files) {
        let fname = common.getFilename(xp3Files[i]);
        // handle exe file
        if (nwPath.extname(xp3Files[i]).toLowerCase() == ".exe") {
            if (!await utils.isXP3(xp3Files[i])) {
                await ui.log.error(`${xp3Files[i]} is not XP3 file`);
                continue;
            }
        }

        let destPath;
        if (!targetDir) {
            destPath = nwPath.join(nwPath.dirname(xp3Files[i]), fname);
        } else {
            destPath = nwPath.join(targetDir, fname);
        }
        await ui.log(`Extracting ${xp3Files[i]} to ${destPath}`);
        await aec.extractFile(xp3Files[i], destPath);
    }
}

utils.extractEssential = async function(gameExe, transData) {
    transData ||= trans;
    var aec = addonLoader.getAddon("aec");
    const targetDir = nwPath.join(nwPath.dirname(gameExe), "data");
    if (await utils.isXP3(gameExe)) {
        ui.log("Found XP3 archive in exe file, extracting!");
        let dataFolder = nwPath.join(targetDir, "data");
        await aec.extractFile(gameExe, dataFolder);
    } else {
        ui.log("Exe file not XP3");
    }

    let cacheDataPath = trans.getStagingDataPath();
    if (!await common.isDir(cacheDataPath)) return;

    let dirList = await fs.promises.readdir(cacheDataPath);

    for (let i in dirList) {
        let targetFile = nwPath.join(targetDir, dirList[i]+".xp3");
        if (!await common.isFileAsync(targetFile)) continue;

        ui.log("Extracting:", targetFile);
    }
}


utils.extractAllXP3Playable = async function(gameExe) {
    var aec = addonLoader.getAddon("aec");
    const targetDir = nwPath.join(nwPath.dirname(gameExe), "data");
    if (await utils.isXP3(gameExe)) {
        ui.log("Found XP3 archive in exe file, extracting!");
        await aec.extractFile(gameExe, targetDir);
    } else {
        ui.log("Exe file not XP3");
    }

    const sourceDir = nwPath.dirname(gameExe);
    const xp3s = await utils.getAllXP3(sourceDir); 
    ui.log("Found XP3 files. ORDER DOES MATTER!", xp3s);
    for (let i in xp3s) {
        let fname = common.getFilename(xp3s[i])
        await aec.extractFile(nwPath.join(sourceDir, xp3s[i]), nwPath.join(targetDir, fname));

        let targetBak = nwPath.join(sourceDir, xp3s[i]+".bak");
        if (await common.isFileAsync(targetBak)) await common.unlink(targetBak)
        await fs.promises.rename(nwPath.join(sourceDir, xp3s[i]), targetBak);
    }
}


utils.renameKrkrExtractFolder = async function(entryPoint) {
    const sourceDir = nwPath.dirname(entryPoint);
    let KrkrExtractPath = path.join(sourceDir, "KrkrExtract_Output");
    if (!await common.isDirectory(KrkrExtractPath)) return;

    try {
        // rename a folder with the same name with exe file to data
        let exeXP3 = nwPath.join(KrkrExtractPath, common.getFilename(entryPoint))
        if (await common.isDirectory(exeXP3)) {
            await fs.promises.rename(exeXP3, nwPath.join(KrkrExtractPath, "data"))
        }

        await fs.promises.rename(KrkrExtractPath, nwPath.join(sourceDir, "_extracted_xp3"))
    } catch (e) {
        console.error(e)
    }
}

utils.extractExeFile = async function(exeFile, targetDir) {
    if (!await common.isFileAsync(exeFile)) return;

    const aec = addonLoader.getAddon("aec");
    await common.mkDir(targetDir);
    await aec.extractFile(exeFile, targetDir);


}

/**
 * Normalizes an array of tag objects into an object.
 * 
 * @param {Array} tagArray - Array of objects containing tagName and attr.
 * @param {boolean} [attrIsArray=false] - Determines if attributes should be merged into an array.
 * @returns {Object} - The normalized object.
 * 
 * @example
 * const input = [
 *   { "tagName": "charaName", "attr": ["name", "info"] },
 *   { "tagName": "charaName", "attr": ["age", "info"] }
 * ];
 * console.log(normalizeTagSelector(input, true));
 * // Output: { charaName: [{ attr: ["name", "info", "age"] }] }
 */
utils.normalizeTagSelector = function(tagArray, attrIsArray = false) {
    const result = {};
    if (!Array.isArray(tagArray)) return result;

    tagArray.forEach(({ tagName, attr }) => {
        if (attrIsArray) {
            if (!result[tagName]) {
                result[tagName] = [{ attr: [...new Set(attr)] }];
            } else {
                const existingAttrs = new Set(result[tagName][0].attr);
                attr.forEach(a => existingAttrs.add(a));
                result[tagName][0].attr = [...existingAttrs];
            }
        } else {
            result[tagName] = {
                attr: attr
            };
        }
    });

    return result;
}

utils.createProject = async function(entryPoint, options) {
    options = options || {}
    options.engineName = options.engineName || "kag"
    var projectId 		= common.makeid(10);
    //var targetDir 	= path.join(nw.process.env.TMP, projectId);
    var stagePath 		= path.join(common.getStagePath(),projectId);
    var ksFiles 		= [];	
    var kagjs;
    
    const sourceDir = options.sourceDir || nwPath.dirname(entryPoint)
    const extractedXP3Dir = nwPath.join(sourceDir, "_extracted_xp3");
    // trying to extract xp3
    if (options.extractXP3) {
        ui.log("Checking dependency");
        if (common.versionToFloat(addonLoader.getAddon("aec")?.package?.version) < 200000) {
            await ui.logError("AEC ver 0.2+ is needed. Please install from add-on manager!");
            return 
        }

        ui.log("Parser will use extracted XP3 folder");
        // firstly, remove the existing folder
        await common.rmdir(extractedXP3Dir);

        // rename krkrextract output directory into extractedXP3Dir
        await utils.renameKrkrExtractFolder(entryPoint);

        await common.mkDir(extractedXP3Dir);
        // copy any existing data folder
        let expectedDataPath = nwPath.join(sourceDir, "data");
        if (await common.isDirectory(expectedDataPath)) {
            ui.log("Copy any *.tjs and *.ks files from existing ./data/ folder to ", extractedXP3Dir);
            await bCopy(sourceDir, extractedXP3Dir, {
                filter: function(src, dest) {
                    if (path.extname(dest).toLowerCase() == '.ks' || path.extname(dest).toLowerCase() == '.tjs') {
                        ui.log("copying "+src);
                        return true;
                    }
                    return false;
                },
                overwrite:true
            })
        }


        await ui.log("Trying to extract all XP3 files with AEC");
        var aec = addonLoader.getAddon("aec");
        if (!aec) {
            await ui.log("Unfortunately no AEC addon detected!");
            await ui.log("Process terminated");
            return;
        }

        // let xp3Files = await common.searchFile("*.xp3", extractedXP3Dir);
        // if (xp3Files?.length) {
        //     await aec.extractAll(sourceDir, "**/*.xp3", extractedXP3Dir);
        // }
        // if (!await utils.isXP3(entryPoint)) {
        //     let dataFolder = nwPath.join(extractedXP3Dir, "data");

        //     await common.mkDir(dataFolder);
        //     await aec.extractFile(entryPoint, dataFolder);
        // }
        await utils.extractAllXP3(entryPoint, extractedXP3Dir);

    }

    try {
        //await normalizeStructure(sourceDir, options);
        var stageDir = path.join(stagePath, "game");
        fs.mkdirSync(stageDir, {recursive:true});
        

        let copyLoc = sourceDir;
        if (options.extractXP3) copyLoc = extractedXP3Dir;
        await bCopy(copyLoc, stageDir, {
            filter: function(src, dest) {
                if (path.extname(dest).toLowerCase() == '.ks' || path.extname(dest).toLowerCase() == '.tjs') {
                    console.log("copying ",src, dest);
                    ui.loadingProgress("Preparing", "Copying : "+src, {consoleOnly:true, mode:'consoleOutput'});
                    ksFiles.push(dest)
                    return true;
                }
                return false;
            },
            overwrite:true
        })
        
        if (options.decryptFiles) {
            ui.log("Decrypt option is ON... decrypting files.");
            await decryptScenarioFile(stageDir);
        }
        kagjs = new KAGJs(stageDir, {
            engineName      : options.engineName,
            onParseStart    : function(currentFile) {
                                    ui.loadingProgress("Processing", "Processing "+currentFile, {consoleOnly:true, mode:'consoleOutput'});
                                },
            literalTags     : options.literalTags || defaultLiteralTags,
            readEncoding    : options.readEncoding,
            captureTags     : utils.normalizeTagSelector(options.captureTags, true),
            actorTags       : utils.normalizeTagSelector(options.actorTags),
        });	
        ui.loadingProgress("Processing", "Converting data", {consoleOnly:true, mode:'consoleOutput'});
        await kagjs.init();
    
    
        var transData = kagjs.toTrans();
        transData.project.projectId = projectId;
        transData.project.cache 	= transData.project.cache||{};
        transData.project.cache.cachePath = stagePath;
        transData.project.loc 		= sourceDir;
        transData.project.options 	= transData.project.options || {}
        transData.project.options.literalTags 	= options.literalTags || []
        transData.project.entryPoint = entryPoint;

        transData.project.options.init ||= {}
        transData.project.options.init.entryPoint = entryPoint;
        transData.project.options.init.sourceDir = sourceDir;
        transData.project.options.init.literalTags = options.literalTags || [];
        transData.project.options.init.extractXP3   = options.extractXP3;
        transData.project.options.init.decryptFiles = options.decryptFiles;
        transData.project.options.init.readEncoding = options.readEncoding;
        transData.project.options.init.captureTags  = options.captureTags;
        transData.project.options.init.actorTags    = options.actorTags;
        
        var gameInfo = {
            title : transData.project.gameTitle
        }
        
        fs.writeFileSync(path.join(stagePath, "gameInfo.json"), JSON.stringify(gameInfo, undefined, 2))
    
    
        
        ui.loadingProgress("Processing", "Parsing done!", {consoleOnly:true, mode:'consoleOutput'});
        ui.loadingProgress("Processing", "Creating new Project.", {consoleOnly:true, mode:'consoleOutput'});
        console.warn("trans data : ", transData);
        
        trans.openFromTransObj(transData, {isNew:true});

        if (options.extractXP3) {
            ui.log("Removing ", extractedXP3Dir);
            await common.rmdir(extractedXP3Dir);
        }

        ui.loadingProgress("Done", "All done", {consoleOnly:true, mode:'consoleOutput'});
        await trans.autoSave();
        ui.loadingEnd("Done", "Done");
        
    } catch (e) {
        ui.logError(e.toString())
        ui.loadingEnd("Error", "Error")
    }
}

var parseList = function(string="", separator=",") {
    string.replaceAll(" ", "");
    return string.split(separator);
}

var mapDefaultCharacterEncoding = function(transData) {
    transData ||= trans;
    if (!transData?.project?.files) return {};

    let result = {}
    for (let path in transData.project.files) {
        result[path] = transData.project.files[path].encoding;
    }
    return result;
}

var exportToFolder = async function(sourceDir, targetDir, transData, options) {
    options = options||{};
    trans.project.options 	= trans.project.options || {};
    options.literalTags 	= options.literalTags || trans.project.options.literalTags || defaultLiteralTags;
	options.writeEncoding 	= options.writeEncoding || trans.project.writeEncoding;
    transData = transData || trans.getSaveData();
    
    // if sourceDir is undefined, assign cache path
    sourceDir ||= nwPath.join(trans.getStagingPath(transData), "game")

    //options.groupIndex = options.groupIndex||"relPath";
    await ui.log("Exporting to folder", sourceDir, targetDir);

    console.log("Export options", options);
    
    return new Promise((resolve, reject) => {
        var translationData = trans.getTranslationData(transData, options);
        console.log("translation Data : ", translationData);
        console.log(JSON.stringify(options, undefined, 2));


        var kagjs = new KAGJs(sourceDir, {
            writeMode           : true,
            translationData     : translationData.translationData,
            readEncoding        : options.custom?.readEncoding? parseList(options.custom?.readEncoding) : thisAddon.config.readEncoding,
			writeEncoding       : options.custom?.writeEncoding || options.writeEncoding,
            literalTags         : options.literalTags,
            onParseStart        : function(currentFile) {
                                    ui.loadingProgress("Processing", "Processing "+currentFile, {consoleOnly:true, mode:'consoleOutput'});
                                  },
            filterOptions       : options.options,
            files               : options.files,
            encodingMaps        : mapDefaultCharacterEncoding(transData),
            captureTags         : utils.normalizeTagSelector(trans.project.options?.init?.captureTags, true),
            actorTags           : utils.normalizeTagSelector(trans.project.options?.init?.actorTags),
        });	
        window.kagjs = kagjs;
        
        kagjs.init()
        .then(()=> {
            console.log("%c kagjs Obj >", 'background: #F00; color: #f1f1f1', kagjs);
            return kagjs.writeToFolder(targetDir)
        })
        .then(()=> {
            resolve();
        })
    })
    
}
//thisAddon.exportToFolder = exportToFolder;
utils.exportToFolder = exportToFolder;

var determineGameFile = function(exePaths) {
    console.log("determine game exe from ", exePaths);
    if (typeof exePaths == 'string') exePaths = [exePaths];
    exePaths = exePaths || [];
    
    var unknown = [];
    
    for (var i=0; i<exePaths.length; i++) {
        if (path.basename(exePaths[i]).toLowerCase() == "game.exe") return exePaths[i];
        if (path.basename(exePaths[i]).toLowerCase() == "config.exe") continue;
        if (path.basename(exePaths[i]).toLowerCase() == "krkrextract.exe") continue;
        if (path.basename(exePaths[i]).toLowerCase().substring(0,6) == "editor") continue;
        unknown.push(exePaths[i]);
    }
    
    if (unknown.length == 1) return unknown[0];
}
utils.determineGameFile = determineGameFile;



// var myVar = "insideLib";

var test = function() {
    console.log("Myvar is :", thisAddon);
}




// exporting module
var results = {}
results.KAGFile = KAGFile;
results.TjsFile = TjsFile;
results.KsFile = KsFile;
results.KAGJs = KAGJs;
results.utils = utils;
results.test = test;

return results


} // Module exports

