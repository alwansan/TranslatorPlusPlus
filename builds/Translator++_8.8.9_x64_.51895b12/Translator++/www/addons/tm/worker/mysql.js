var { isMainThread, workerData, parentPort } = require('worker_threads')
console.log("Data", workerData);
var X = require('www/js/BasicEventHandler.js')
parentPort.postMessage({ welcomeHome: workerData })