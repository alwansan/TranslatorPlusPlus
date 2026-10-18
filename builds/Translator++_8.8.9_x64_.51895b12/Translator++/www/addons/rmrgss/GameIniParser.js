const ini 		= require('ini');

class GameIniParser extends require('www/js/ParserBase.js').ParserBase {
	constructor(script, options, callback) {
		super(script, options, callback)
		this.debugLevel = options.debugLevel;
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};

	}
}

GameIniParser.prototype.registerStringObject = function(obj, key, parameters, options) {
	if (typeof obj[key] !== "string") return obj[key];
	const translation = this.registerString(obj[key], parameters, options);
	// apply translation
	obj[key] = translation;
	return translation;
}

GameIniParser.prototype.filterText = function(text, context, parameters) {
	return ini.unsafe(text);
}

GameIniParser.prototype.unfilterText = function(text, context, parameters) {
    return ini.safe(text);
}

GameIniParser.prototype.toString = function() {
	return ini.stringify(this.ini);
}

GameIniParser.prototype.parse = async function() {
	this.ini = ini.parse(this.script);

	if (empty(this.ini)) return this;
	for (var category in this.ini) {
		if (typeof this.ini[category] !== "object") continue;
		for (var varName in this.ini[category]) {
			var tags=["red"];
			if (category.toLowerCase()=="game" && varName.toLowerCase()=="title") {
				tags=[];
				this.gameTitle = this.ini[category][varName];
				console.log("Game title:", this.gameTitle);
			}
			this.registerStringObject(this.ini[category], varName, ["Game.ini", category, varName], {}, {tags:tags})
		}
	}
	return this;
}

module.exports = GameIniParser;