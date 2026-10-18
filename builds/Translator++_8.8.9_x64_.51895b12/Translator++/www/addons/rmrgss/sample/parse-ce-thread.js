var YAML = require("www/addons/rmrgss/rmrgss.module.js").YAML
var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");

var yamlScript = await common.fileGetContents("www/addons/rmrgss/sample/ce/CommonEvents-0001.yaml");
var yamlData = YAML.parseDocument(yamlScript);

var worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {workerData: {
    command: "parseEventList",
    baseContext: ["CommonEvents", 1],
    yamlList: yamlData.newDocumentIn([0, "list"]).toString()
}});

worker.on("message", msg => console.log(`Worker message received: `, msg));
worker.on("error", err => console.error(error));
worker.on("exit", code => console.log(`Worker exited with code .`, code));
