/**
 * Worker process
 */

const nwPath = require("path")
const thisPath = nwPath.dirname(__filename);
const RGSSParser = require("www/addons/rmrgss/RGSSParser.module.js")
const {
    //Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
//const common = require("www/js/common.js");

const Logger    = require('www/js/Logger.js');
const logger      = new Logger();
//const nwPath = require("path")
logger.loadState(true);
const errors = [];
var result = {}

const process = async function() {
    const rbScript = workerData?.rbScript || "";
    const options =  workerData?.parserOptions || {}
    var scriptObj = new RGSSParser(rbScript, options);
    //scriptObj.debugLevel = 9;
    await scriptObj.parse();
    return scriptObj.transData;
    //return "hello world"
}

void async function() {
    // sending message to parent
    try {
        result = await process();
    } catch (e) {
        errors.push(e.stack)
    }

    if (!isMainThread) {
        //var data = workerData;
        parentPort.postMessage({
            processedCommand        : workerData,
            //randomId    : common.generateId(),
            logs        : logger.getOutput(),
            filePath    : __filename,
            errors      : errors,
            result      : result,
            //x: common.clone(workerData?.options)
        });
    }
}();
