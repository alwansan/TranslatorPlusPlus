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
class ScriptParser extends require("www/js/ParserBase.js").ParserBase {
	constructor(script, options, callback) {
		super(script, options, callback);
        options = options || {};
		this.debugLevel         = options.debugLevel;
		this.currentEntryPoint  = {};
        this.language           = options.language;
        this.currentOffset      = 0;
        this.hook               = {};
        this.captureTypes       = options.captureTypes||["string", "string-literal"]
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};
	}
}

ScriptParser.stringEnclosure = {
    ruby:[
        {
            start:'"',
            end:'"'
        },
        {
            start:"'",
            end:"'"
        },
        {
            start:"%/",
            end:"/"
        }
    ]
}

ScriptParser.prototype.on = function(label, fn) {
    if (typeof fn !== "function") return this;
    this.hook[label] = fn;
    return this;
}

ScriptParser.prototype.off = function(label) {
    if (!label) return;
    delete this.hook[label];
    return this;
}

ScriptParser.prototype.trigger = function(label) {
    if (typeof this.hook[label] !== "function") return this;
    var args = [];
    for (var i=1; i<arguments.length; i++) {
        args.push(arguments[i]);
    }
    
    return this.hook[label].apply(this, args);
}

ScriptParser.prototype.getCurrentOffset = function() {
	return this.writableData.join("").length;
}

ScriptParser.prototype.parseToken = function(token, parentType = "", options = {}) {
    if (typeof token == "string") {
        if (this.captureTypes.includes(parentType)) {
            var result = this.trigger("beforeRegisterString", arguments);
            if (common.isHalt(result)) return this;
            if (!common.isThru(result)) this.registerString(token, [this.currentOffset], {start:this.currentOffset, end:this.currentOffset+token.length});
            result = this.trigger("afterRegisterString", arguments);
            if (!common.isThru(result)) this.currentOffset += token.length;
        } else {
            this.register(token);
            this.currentOffset += token.length;
        }
        return this;
    }

    if (Array.isArray(token.content)) {
        for (var i=0; i < token.content.length; i++) {
            this.parseToken(token.content[i], token.type, {
                index:i,
                siblingNumber:token.content.length,
                members:token.content,
                parent:token
            });
        }
    } else {
        this.parseToken(token.content, token.type, {siblingNumber:0, parent:token, members:[]});
    }
    return this;
}

ScriptParser.prototype.parse = function(data, language) {
    data        = data || this.script;
    language    = language || this.language;
    this.currentOffset = 0;
    
    if (Boolean(Prism.languages[language]) == false) return console.warn("Unknown language:", language);

    this.tokens = Prism.tokenize(data, Prism.languages[language])

    for (var i=0; i<this.tokens.length; i++) {
        this.parseToken(this.tokens[i]);
    }
    return this;
}

module.exports = ScriptParser;