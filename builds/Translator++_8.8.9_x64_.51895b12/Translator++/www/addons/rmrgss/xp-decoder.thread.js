const {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
const common = require("www/js/common.js");

if (!global.window) {
    global.window = global;
}

const {
    YAML,
    attachments,
    GameIniParser,
    RGSSParser,
    RMData,
    isYamlVer2,
	customTags,
    decodeBinaryInYAML,
    YAMLUtil,
    b64DecodeUnicode,

} = require("www/addons/rmrgss/rmrgss.module.js");

const nwPath    = require('path');
const fs 		    = require('graceful-fs');
const iconv 		= require('iconv-lite');	
const Logger    = require('www/js/Logger.js');
//var logger      = new Logger({file:"data/logs/rmrgss.thread2.log"});
const logger      = new Logger();
logger.loadState(true);
const errors = [];

const decodeXPData = async function(filePath){
    var yamlContent = await fs.promises.readFile(filePath, "utf8");
    if (!yamlContent.includes("!binary")) {
        return yamlContent;
    }
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
    return yamlString;
}

const decodeXPDataFile = async function(filePath, targetFile){
    targetFile = targetFile || filePath; // if targetFile is not provided, use the same file
    const yamlContent = await decodeXPData(filePath);
    // write to target file
    await fs.promises.writeFile(targetFile, yamlContent, "utf8");
    return targetFile;
}

void async function() {
    var result = {}
    try {

        if (workerData?.command == "decodeXPData") {
            result = await decodeXPData(workerData.file);
        } else if (workerData?.command == "decodeXPDataFile") {
            result = await decodeXPDataFile(workerData.file, workerData.saveTo);
        } else {
            result = {error: `Unknown command ${workerData.command}`}
        }
    
    } catch (e) {
        errors.push(e.stack);
        result = {error: e.stack, workerData: workerData}
    }


    // sending message to parent
    if (!isMainThread) {
        //var data = workerData;
        parentPort.postMessage({
            //processedCommand        : data,
            randomId    : common.generateId(),
            logs        : logger.getOutput(),
            filePath    : __filename,
            errors      : errors,
            result      : result
        });
    }
}();
