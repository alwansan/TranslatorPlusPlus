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
const MiniEditor = function(elm) {
    this.elm = $(elm);
    this.init();
}

MiniEditor.patterns = [
    //	/\\(\S+)\[.*\]/gi, // standard tag (accept unicode)
    //	/\\(\S+)\<.*\>/gi, // Yanfly's Message core tag (accept unicode)
        /(if|en)\([\w \=\[\]\&\<\>\|\.\$\_\+\-\*\/\@]+\)/g, //MPP_ChoiceEX
        /(\\[a-zA-Z0-9]+\[.*\])+/gi, // standard tag (alphabet only)
        /(\\[a-zA-Z0-9]+\<.*\>)+/gi, // Yanfly's Message core tag (alphabet only)
    //	/\\([a-zA-Z\{\}\\\$\.\|\!\>\<\^])/g
        /(\\[a-zA-Z\{\}\\\$\.\|\!\>\<\^])+/g, // standard rpg maker tags
        /(\@[0-9]+)+/g 	//@ command for wolfRpg	
    ]

MiniEditor.prototype.highlight = function(text) {
    if (!text) return text;
    this.formulas = MiniEditor.patterns;
    console.log("pattern", this.formulas);
    var escaper1 = "-----PLACEHOLDER2225821-----";
    var escaper2 = "-----PLACEHOLDER2225823-----";
	for (var i=0; i<this.formulas.length; i++) {
		if (!Boolean(this.formulas[i])) continue;
		
		if (typeof this.formulas[i] == 'function') {
			var arrayStrings = this.formulas[i].call(this, text);
			console.log(`result`, arrayStrings);
			if (typeof arrayStrings == 'string') arrayStrings = [arrayStrings];
			if (Array.isArray(arrayStrings) == false) continue;

			for (var x in arrayStrings) {
				text = text.replaceAll(arrayStrings[x], (match) => {
                    return escaper1+match+escaper2;
				});				
			}
			continue;            
		}
		
		text = text.replaceAll(this.formulas[i], (match) => {
            if (!Boolean(match)) return match;
			return escaper1+match+escaper2;
		});

	}

    //text.replace(new RegExp("&", "g"), "&amp;").replace(new RegExp("<", "g"), "&lt;");
    text = common.htmlEntities(text);
    text = text.replaceAll(escaper1, "<span class='highlight'>");
    text = text.replaceAll(escaper2, "</span>");
    return text;
}

MiniEditor.prototype.trigger = function(text) {
    text = text || this.elm.val();
    text = this.highlight(text);
    //text.replace(new RegExp("&", "g"), "&amp;").replace(new RegExp("<", "g"), "&lt;").
    this.bgContent.html(text.replace(/\n/g, "<br />"))   
}

MiniEditor.prototype.init = function() {
    this.elm.attr("data-role", "fgContent");
    this.wrapper = $("<div data-role='editorWrapper'></div>");
    this.elm.after( this.wrapper);
    this.wrapper.append(this.elm);
    this.bg = $("<pre data-role='bgWrapper'></pre>");
    this.bgContent = $("<code data-role='bgContent'></code>");
    this.wrapper.append(this.bg);
    this.bg.append(this.bgContent);
    this.bg.css("height", this.elm.height());
    this.wrapper.css("height", this.elm.height());

    var that = this;
    this.elm.on("input", function() {
        var text = $(this).val();
        text = that.highlight(text);
        //text.replace(new RegExp("&", "g"), "&amp;").replace(new RegExp("<", "g"), "&lt;").
        that.bgContent.html(text.replace(/\n/g, "<br />"))
    })

    this.elm.on("scroll", function() {

        that.bg.scrollTop($(this).scrollTop());
        that.bg.scrollLeft($(this).scrollLeft());
    })
}

$(document).ready(function() {
    
})