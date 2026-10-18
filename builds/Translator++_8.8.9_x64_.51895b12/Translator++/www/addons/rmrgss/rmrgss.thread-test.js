var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
var common = require("www/js/common.js");

var {
    YAML,
    GameIniParser,
    RGSSParser,
    RMData,
    attachments,
	YAMLUtil,
	isYamlVer2
} = require("www/addons/rmrgss/rmrgss.module.js");

var fs 		    = require('graceful-fs');
var iconv 		= require('iconv-lite');	
const Logger    = require('www/js/Logger.js');
//var logger      = new Logger({file:"data/logs/rmrgss.thread2.log"});
var logger      = new Logger();
logger.loadState(true);
var errors = [];


if (!isMainThread) {
    var data = workerData;
    parentPort.postMessage({
        processedCommand : data,
    });
}