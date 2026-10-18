var rmData = new addonLoader.addons.rmrgss.RMData();
var YAML = require("www/addons/rmrgss/rmrgss.module.js").YAML
var yamlData = YAML.parseDocument(await common.fileGetContents("www/addons/rmrgss/sample/ce/CommonEvents-0001.yaml"));
var list = yamlData.getIn([0, "list"]);

var copyList = yamlData.newDocumentIn([0, "list"]);

var translatedCommand = await rmData.fetchCommandList(copyList.contents);
