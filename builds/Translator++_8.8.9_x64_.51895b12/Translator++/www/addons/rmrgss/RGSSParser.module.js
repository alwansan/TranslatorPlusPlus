const nwPath = require("path")
const thisPath = nwPath.dirname(__filename);
const moduleAlias = require('module-alias');
const common = require("www/js/common.js");

moduleAlias.addAliases({
    '@rmrgss': thisPath + "/node_modules"
  })
moduleAlias.addPath(thisPath+'/node_modules');
moduleAlias(thisPath+'/package.json');
//global.Prism = require('@rmrgss/prismjs');
if (!global.Prism) {
	global.Prism =  require('prismjs');
}
require('prismjs/components/prism-ruby');


class RGSSParser extends require('www/js/ScriptParser.js') {
	constructor(script, options, callback) {
		super(script, options, callback)
		options ||= {}
		this.language = "rgss";
		this.debugLevel = options.debugLevel;
		this.currentEntryPoint = {};
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};

		this.init();
	}
}

RGSSParser.extendPrism = function () {
	if (Prism.languages.rgss) return;
	Prism.languages.rgss = Prism.languages.extend('ruby')
	var interpolation = {
		pattern: /#\{[^}]+\}/,
		inside: {
			'delimiter': {
				pattern: /^#\{|\}$/,
				alias: 'tag'
			},
			rest: Prism.languages.ruby
		}
	};

	var thisTokenRule;
	if (Prism.languages.rgss["string-literal"]) {
		thisTokenRule = Prism.languages.rgss["string-literal"];
	} else {
		thisTokenRule = Prism.languages.rgss.string;
	}

	thisTokenRule.push(
		{
			pattern: /<<[-~]?([a-z_]\w*)(.*)[\r\n](?:.*[\r\n])*?[\t ]*\1/i,
			alias: 'heredoc-string',
			greedy: true,
			inside: {
				'delimiter': {
					pattern: /^<<[-~]?[a-z_]\w*(.*)[\r\n]|[a-z_]\w*$/i,
					alias: 'symbol',
					inside: {
						'punctuation': /^<<[-~]?/
					}
				},
				'interpolation': interpolation
			}
		}	
	)
	
	thisTokenRule[0].alias = 'string-misc';
	thisTokenRule[0].pattern = /%[qQiIwWxs]?(?:([^a-zA-Z0-9\s{(\=[<])(?:(?!\1)[^\\]|\\[\s\S])*\1|\((?:[^()\\]|\\[\s\S])*\)|\{(?:[^#{}\\]|#(?:\{[^}]+\})?|\\[\s\S])*\}|\[(?:[^\[\]\\]|\\[\s\S])*\]|<(?:[^<>\\]|\\[\s\S])*>)/;
	thisTokenRule[1].alias = 'string-quote';
	thisTokenRule[1].pattern = /("|')(?:#\{[^}]+\}|#(?!\{)|\\(?:\r\n|[\s\S])|(?!\1)[^\\#])*\1/
	thisTokenRule[2].inside.delimiter.pattern = /^<<[-~]?[a-z_]\w*[\r\n]|[a-z_]\w*$/i
	thisTokenRule[3].inside.delimiter.pattern = /^<<[-~]?'[a-z_]\w*'[\r\n]|[a-z_]\w*$/i
	//Prism.languages.rgss.string[2].inside.punctuation = /[\r\n]/
	//Prism.languages.rgss.string[3].inside.punctuation = /[\r\n]/
}

RGSSParser.prototype.filterText = function(text, context, parameters) {
	if (parameters.parentAlias == "string-quote") {
		// strip slashes from quote
		text = common.stripSlashes(text);
	} else if (parameters.parentAlias == "string-misc") {
		var bkEscaper = '[----backslashEscape:'+common.rand(10000000,99999999)+":----]"
		text = text.replaceAll('\\\\', bkEscaper)
		.replaceAll('\\}', '}')
		.replaceAll('\\)', ')')
		.replaceAll('\\/', '/')
		.replaceAll('\\]', ']')
		.replaceAll('\\>', '>')
		.replaceAll('\\n', "\n")
		.replaceAll('\\r', "\r")
		.replaceAll(bkEscaper, '\\')
	}
	
	return text;
}

RGSSParser.prototype.unfilterText = function(text, context, parameters) {
	if (parameters.parentAlias == "string-quote") {
		// add slashes to quote
		text = common.addSlashes(text);
	} else if (parameters.parentAlias == "string-misc") {
		text = text.replace(/[\\/})\]>]/g, function(match) {
			return "\\"+match;
		})
	}
    return text;
}

RGSSParser.prototype.init = function() {
	RGSSParser.extendPrism();
	this.on('beforeRegisterString', (args)=>{
		var token 		= args[0];
		var parentType 	= args[1]
		var options 	= args[2]

		var parentAlias = ""
		try {
			parentAlias = options.parent.alias;
		} catch (e) {
			console.warn(e);
		}

		if (parentAlias == "string-quote") {
			//console.log("handling string quote", args);
			var quote = ['"', "'"]
			if (options.index == 0) {
				// first index
				if (quote.includes(token.charAt(0))) {
					this.register(token.charAt(0));
					token = token.substring(1);
					this.currentOffset += 1;
				}
			}

			if (options.index == (options.siblingNumber -1)) {
				// last index
				var closingQuote = token.substring(token.length-1);
				if (quote.includes(closingQuote)) {
					token = token.substring(0, token.length -1);
					//this.registerString(token, this.currentOffset, {parentType:"string-quote", start:this.currentOffset, end:this.currentOffset+token.length});
					this.registerString(token, ["offset",this.currentOffset], {parentType:"string-quote", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					
					// register closing quote
					this.register(closingQuote);
					this.currentOffset += closingQuote.length;
					return common.thru(); // skip default behavior
				}
			} else {
				this.registerString(token, ["offset",this.currentOffset], {parentType:"string-quote", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
				this.currentOffset += token.length;
				return common.thru(); // skip default behavior
			}
		} else if (parentAlias == "heredoc-string") {
			//console.log("handling heredoc string", args);
			if (options.index == 1) { // first after delimiter
				var firstChar = token.charAt(0);

				try {
					var delimiter = options.members[0].content[1]
					if (delimiter.substring(0, delimiter.length - 1) == "\n") return;
				} catch (e) {
					console.warn(e);
					return;
				}

				if (token.substring(0,2) == "\r\n" || token.substring(0,2) == "\n\r") {
					this.register("\r\n");
					this.currentOffset += 2;

					token = token.substring(2);
					this.registerString(token, ["offset",this.currentOffset], {parentType:"heredoc-string", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					return common.thru(); // skip default behavior

				} else if (firstChar == "\n") {
					this.register(firstChar);
					this.currentOffset += 1;

					token = token.substring(1);
					this.registerString(token, ["offset",this.currentOffset], {parentType:"heredoc-string", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					return common.thru(); // skip default behavior

				}

			}
		} else if (parentAlias == "string-misc") {
			//console.log("handling string-misc", args);
			if (options.index == 0) {
				var match = token.match(/%[qQiIwWxs]?[/{(\[<]?/);
				if (match) {
					if (match.index == 0) {
						this.register(match[0]);
						token = token.substring(match[0].length);
						this.currentOffset += match[0].length;
					}
				}
			}
			
			if (options.index == (options.siblingNumber -1)) {
				let quote = ["/", "}", ")", ">", "]"];
				let closingQuote = token.substring(token.length-1);
				if (quote.includes(closingQuote)) {
					token = token.substring(0, token.length -1);
					this.registerString(token, ["offset",this.currentOffset], {parentType:"string-misc", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
					this.currentOffset += token.length;
					
					// register closing quote
					this.register(closingQuote);
					this.currentOffset += closingQuote.length;
					return common.thru(); // skip default behavior
				}
			} else {
				this.registerString(token, ["offset",this.currentOffset], {parentType:"string-misc", start:this.getCurrentOffset(), end:this.getCurrentOffset()+token.length});
				this.currentOffset += token.length;
				return common.thru(); // skip default behavior
			}
		}
		

	});

	this.on('afterRegisterString', (args)=>{
		
	})	
}


RGSSParser.containStringLiteral = function(rubyScript) {
    // detects if script contains any string literal
    // Regular expression to match comments
    const commentRegex = /#[^\n]*/g;

    // Remove comments from the Ruby script
    const scriptWithoutComments = rubyScript.replace(commentRegex, '');

    // Regular expression to match any string literal
    const stringLiteralRegex = /'[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|<<-?(\w+)\s*(?:.*\s*)*\s*\1/g;

    // Check if any string literal is found in the Ruby script without comments
    return stringLiteralRegex.test(scriptWithoutComments);
}


module.exports = RGSSParser;