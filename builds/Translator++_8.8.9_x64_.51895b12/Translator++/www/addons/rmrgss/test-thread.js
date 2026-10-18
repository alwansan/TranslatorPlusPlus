var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
var common = require("www/js/common.js");
if (!isMainThread) {
    var data = workerData;
    parentPort.postMessage({
        processedCommand : data,
    });
}

/*
Sample call:

var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
var worker = new Worker("./www/addons/rmrgss/test-thread.js", {workerData: "hello"});
worker.on("message", msg => console.log(`Worker message received: `, msg));
worker.on("error", err => console.error(error));
worker.on("exit", code => console.log(`Worker exited with code .`, code));
*/