var rmData = new addonLoader.addons.rmrgss.RMData();
rmData.translationPair = {
    "丸パン": "translated"
};
var YAML = require("www/addons/rmrgss/rmrgss.module.js").YAML
var yamlData = YAML.parseDocument(await common.fileGetContents("www/addons/rmrgss/sample/arbitrary/imRecipes.yaml"));
await rmData.fetchArbitraryData(yamlData);