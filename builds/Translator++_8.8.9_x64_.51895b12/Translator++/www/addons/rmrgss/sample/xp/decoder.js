RMUtil.decodeAllYAML = async function(directoryPath) {
	if (!await common.isDir(directoryPath)) return console.warn("Directory not found", directoryPath);
	const yamlFiles = await common.searchFile("*.yaml", directoryPath);
	for (let i=0; i<yamlFiles.length; i++) {
		let yamlFile = yamlFiles[i];
		//await decodeBinaryInYAML(yamlFile, yamlFile, "utf8");
		const yamlContent = await fs.promises.readFile(yamlFile, "utf8");
		if (!yamlContent.includes("!binary")) {
			continue;
		}
		ui.log(`Decoding binary in ${yamlFile}`);

		const yamlData = YAML.parseDocument(yamlContent, { customTags: customTags });
		const yamlString = yamlData.toString();
		await fs.promises.writeFile(yamlFile, yamlString, "utf8");
	}
}


var {
    YAML,
    GameIniParser,
    RGSSParser,
    RMData,
    attachments,
	customTags,
	decodeBinaryInYAML,
    b64DecodeUnicode,
    b64EncodeUnicode,
    YAMLUtil
} = require("www/addons/rmrgss/rmrgss.module.js");
var yamlContent = await fs.promises.readFile('E:\\dreamsavior\\tpp\\Translator++\\www\\php\\cache\\pJc5WUYncB\\data\\YAML\\Enemies.yaml', "utf8");
var yamlData = YAML.parseDocument(yamlContent, { 
    customTags: [{
		identify: value => value instanceof Uint8Array,
		// Buffer inherits from Uint8Array
		default: false,
		tag: '!binary',

		resolve: (doc, node) => {
			console.log("----Binary mode");
			const src = YAMLUtil.resolveString(doc, node);
			const result = b64DecodeUnicode(src);
			console.log("----Resolving", src, "result:", result);
	
			return result;
		},
		options: YAMLUtil.binaryOptions,
		stringify: function (data, ctx, onComment, onChompKeep) {
			// convert to plain
			console.log("encoding", arguments);
			data.value = data.value;
            data.type = "QUOTE_DOUBLE"
            // data.tag = "PLAIN";
			//type = "PLAIN"
			return YAMLUtil.stringifyString(data, ctx, onComment, onChompKeep);
		}
	}] 
});
var yamlString = yamlData.toString();
// Remove all  !binary with 
yamlString = yamlString.replace(/!binary /g, "");