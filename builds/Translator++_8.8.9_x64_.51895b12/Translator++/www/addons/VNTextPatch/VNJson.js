const thisAddon = this;
thisAddon.actorNames = {};

class VNJSONFile extends require("www/js/ParserBase.js").ParserBase {
	constructor(obj, options, callback) {
		super(obj, options, callback)
		this.debugLevel = thisAddon.debugLevel;
		this.currentEntryPoint = {};
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};
	}
}

VNJSONFile.prototype.parse = async function() {
    if (this.isParsed) return;
    if (!this.script) throw new Error("Script is empty");
    if (!Array.isArray(this.script)) throw new Error("Script is not a valid array");

    for (let i=0; i<this.script.length; i++) {
        let localContext = ["index", i, "key", "message"];
        let parameter = undefined
        if (this.script[i].name) {
            localContext = ["index", i, "key", "message", "actorName", this.script[i].name]
            parameter = {
                rowInfoText: this.script[i].name
            }

            // registering actor name into the grid
            let nameContext = ["index", i, "key", "name"]
            let nameTranslation = this.registerString(this.script[i].name, nameContext, {}, {tags:["yellow"]});
            thisAddon.actorNames[this.script[i].name] = nameTranslation || "";
            this.script[i].name = nameTranslation || "";
    
        }

        // registering common texts
        let translation = this.registerString(this.script[i].message, localContext, parameter);
        this.script[i].message = translation;
    }
    this.isParsed = true;
}


VNJSONFile.prototype.toString = function() {
    if (!this.isParsed) throw new Error("Script not yet parsed. Run parse()")
    return JSON.stringify(this.script, undefined, 2);
}

thisAddon.VNJSONFile = VNJSONFile;
thisAddon.resolveState("VNJSONFileReady");
