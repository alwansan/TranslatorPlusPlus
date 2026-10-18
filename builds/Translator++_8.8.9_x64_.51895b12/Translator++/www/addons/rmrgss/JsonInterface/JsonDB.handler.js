var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
var JsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js");

