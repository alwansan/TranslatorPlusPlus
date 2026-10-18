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
const commentParser = require("comment-parser");
const jsonata = require("jsonata");

const CommentParser = function(script, workspace="info") {
    this.script = script;
    this.workspace = workspace;

    this.comments = commentParser.parse(script, {spacing: "preserve"});

    var parsedScript;

    console.log(this.comments);
    this.getAll = () => {
        return this.comments;
    }
    
    const normalizeNextLines = (texts) => {
        let lines = texts.split("\n");
        const result = []
        result.push(lines[0])
        for (let i=1; i<lines.length; i++) {
            result.push(" * "+lines[i]);
        }
        return result.join("\n")
    }
    this.normalizeNextLines = normalizeNextLines;

    const getWorkspaceString = ()=> {
        if (!this.workspace) return "";
        return ":"+this.workspace;
    }
    const stringifyComment = (commentPart)=> {
        if (typeof commentPart !== "object") return "";
        if (!commentPart?.description && !commentPart?.tags?.length) return "";
        console.log("Generating string from", commentPart);
        let lines = [];
        commentPart.description ||= "";
        lines.push(`/**`+normalizeNextLines(getWorkspaceString()+"\n"+commentPart.description));

        if (commentPart.tags?.length) {
            for (let i in commentPart.tags) {
                let thisTag = commentPart.tags[i];
                if (!thisTag) continue;
                
                let name = thisTag.name;
                if (thisTag.default) name = `${thisTag.name}=${thisTag.default}`;
                if (thisTag.optional) name = `[${name}]`;
                lines.push(` * @${thisTag.tag} ${name} ${normalizeNextLines(thisTag.description)}`)
            }
        }
        lines.push(` */`)
        return lines.join("\n")
    }

    const normalizeCommentObj = (commentObj) => {
        if (!commentObj) return commentObj;
        if (!commentObj.description) return commentObj;
       
        let descLine = commentObj.description.split("\n");
        let currentWorkspace = descLine.shift();
        commentObj.description = descLine.join("\n");
        commentObj.workspace = currentWorkspace.trim();
        return commentObj;
    }

    this.hasComment = () => {
        if (this.comments?.length) return true;
        return false;
    }

    this.appendComment = (infoObj) => {
        if (typeof infoObj !== "object") return console.warn("Invalid type infoObj", infoObj);
        if (!infoObj?.description && !infoObj?.tags?.length) return console.warn("InfoObj must at least has description property or at least one tags property", infoObj);
        let script = stringifyComment(infoObj);
        console.log("Info string:", script);
        return this.appendCommentString(script);
    }

    /**
     * Append comment string to the begining of the script
     * @param {String} script 
     * @returns {Object[]} - Array of the appended comment object
     */
    this.appendCommentString = (script) => {
        const parsedObj = commentParser.parse(script, {spacing: "preserve"});
        if (!parsedObj?.length) return;
        this.comments ||= [];

        let pool = []
        var result = []
        for (let i=0; i<parsedObj.length; i++) {
            parsedObj[i] = normalizeCommentObj(parsedObj[i]);
            let newLen = this.comments.push(parsedObj[i]);
            let currentID = newLen - 1;
            let placeholderStr = `/*-commentPlaceholder_${currentID}-*/`;
            this.placeholders[currentID] = placeholderStr;
            pool.push(placeholderStr);
            result.push(parsedObj[i])
        }

        parsedScript = pool.join("\n")+"\n"+parsedScript;
        return result;
    }

    this.editOrCreateOneTag = (tagInformation) => {
        console.log("editOrCreateOneTag", tagInformation);
        if (typeof tagInformation !== "object") return console.warn("Invalid commentObj", tagInformation);
        if (!tagInformation?.tag) return console.warn("Required tag properties don't exist", tagInformation);
        if (!this.hasComment()) {
            this.appendComment({
                tags: [tagInformation]
            });
            return;
        } 

        // edit existing tag
        var thisComments = this.getAll();
        for (let i in thisComments) {
            if (!thisComments[i]?.tags) continue;
            for (let tagId in thisComments[i].tags) {
                if (thisComments[i].tags[tagId]?.tag == tagInformation.tag) {
                    thisComments[i].tags[tagId] = tagInformation;
                    return;
                }
            }
        }

        // find no existing tag. Append one;
        thisComments[0].tags.push(tagInformation);
    }

    this.getDescriptionByTag = (tag) => {
        if (!this.comments?.length) return [];
        var result = [];
        for (let i=0; i<this.comments.length; i++) {
            if (!this.comments[i]?.tags?.length) continue;
            for (let y=0; y<this.comments[i].tags.length; y++) {
                if (this.comments[i].tags[y].tag == tag) result.push(this.comments[i].tags[y].description);
            }
        }
        return result;
    }

    this.getTags = (tag) => {
        if (!this.comments?.length) return [];
        var result = [];
        for (let i=0; i<this.comments.length; i++) {
            if (!this.comments[i]?.tags?.length) continue;
            for (let y=0; y<this.comments[i].tags.length; y++) {
                if (this.comments[i].tags[y].tag == tag) result.push(this.comments[i].tags[y]);
            }
        }
        return result;
    }

    // this.stringify = ()=> {
    //     if (!this.comments?.length) return this.script;
    //     var thisParsedScript = parsedScript;
    //     for (let i=0; i<this.comments.length; i++) {
    //         if (!this.comments[i]) continue;
    //         thisParsedScript = thisParsedScript.replace(`/*-commentPlaceholder_${i}-*/`, stringifyComment(this.comments[i]))
    //     }
    //     return thisParsedScript;
    // }
    this.stringify = ()=> {
        if (!this.comments?.length) return this.script;
        var thisParsedScript = parsedScript;
        for (let i in this.placeholders) {
            if (!this.comments[i]) continue;
            thisParsedScript = thisParsedScript.replace(this.placeholders[i], stringifyComment(this.comments[i]))
        }
        return thisParsedScript;
    }

    this.query = async (query)=> {
        const expr = jsonata(query);
        return await expr.evaluate(this.comments);
    }
    
    this.placeholders = {};


    this.parse = () => {
        parsedScript = this.script;
        let infos = this.comments;
        console.log("infos", infos);
        this.parsed = []
        let currentID = 0;
        for (let i=0; i<infos.length; i++) {
            if (!infos[i]) continue;
            if (!infos[i].description) continue;
            if (infos[i].description.substring(0, getWorkspaceString().length) !== getWorkspaceString()) continue;
            
            infos[i] = normalizeCommentObj(infos[i])

            let thisComment = infos[i];
            let stringify = commentParser.stringify(thisComment);
            this.placeholders[currentID] = `/*-commentPlaceholder_${currentID}-*/`;
            parsedScript = parsedScript.replace(stringify, this.placeholders[currentID]);
            currentID++;
        }
    }

    const init = ()=> {
        this.parse();
    }
    init();
}

module.exports = CommentParser;