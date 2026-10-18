var YAML = require("www/addons/rmrgss/rmrgss.module.js").YAML
var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");

var worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {
            workerData: {
                command: "parseArbitraryFile",
                baseContext: [],
                file: "www/addons/rmrgss/sample/arbitrary/imRecipes.yaml",
                rmDataProperties: {
                    translationPair: {
                        "丸パン": "translated"
                    },
                },
            },
        });

worker.on("message", msg => console.log(`Worker message received: `, msg));
worker.on("error", err => console.error(error));
worker.on("exit", code => console.log(`Worker exited with code .`, code));