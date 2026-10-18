const {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
const common = require("www/js/common.js");

const {
    YAML,
    attachments,
    GameIniParser,
    RGSSParser,
    RMData,
    isYamlVer2,
	customTags,
    decodeBinaryInYAML,

} = require("www/addons/rmrgss/rmrgss.module.js");

const nwPath    = require('path');
const fs 		= require('graceful-fs');
const iconv 	= require('iconv-lite');	
const Logger    = require('www/js/Logger.js');
//var logger    = new Logger({file:"data/logs/rmrgss.thread2.log"});
const logger    = new Logger();
logger.loadState(true);
const errors = [];


/*
var resolveSeq = require('www/addons/rmrgss/node_modules/yaml/dist/resolveSeq-d03cb037.js');

var moduleAlias = require('module-alias');
var thisPath = "www/addons/rmrgss/";
moduleAlias.addAliases({
    '@rmrgss': thisPath + "/node_modules"
})
moduleAlias.addPath(thisPath+'/node_modules');
moduleAlias(thisPath+'/package.json');
  
var yaml = require('@rmrgss/yaml');
*/


console.log("rmrgss.thread loaded");


if (!global.Prism) {
	global.Prism =  require('prismjs');
}
require('prismjs/components/prism-ruby');

const buildRMDataWithProperties = function(rmDataProperties, rmData) {
    if (!rmData) {
        rmData = new RMData();
    }
    for (var i in rmDataProperties) {
        rmData[i] = rmDataProperties[i];
    }
    return rmData;

}

const ProcessEventsList = async function(yamlList, rmData, baseContext) {
    rmData ||= new RMData();
    //console.log("rmData", rmData);
    var commands;
    var directMode = false;
    if (typeof yamlList == "string") {
        commands = YAML.parseDocument(yamlList, { customTags: customTags });
    } else if (typeof yamlList == "object") {
        directMode = true;
        commands = yamlList;
    } else {
        throw new Error("Invalid yamlList type");
    }
    console.log("commands", JSON.stringify(commands.toJSON(), null, 2));
    
    var translatedCommands = ""
    var translatedCommandsObj = null;
    if (commands.constructor.name == "YAMLSeq") {
        let newCommands = await rmData.fetchCommandList(commands, baseContext);

        // replace original contents with new one
        // if translation table is empty, do not send back the translatedCommands, because commands.toString() is a resource expensive task
        
        if (!empty(rmData.translationPair)) {
            translatedCommands = commands.toString()
            translatedCommandsObj = commands;
        }
    } else {
        let newCommands = await rmData.fetchCommandList(commands.contents, baseContext);

        // replace original contents with new one
        // if translation table is empty, do not send back the translatedCommands, because commands.toString() is a resource expensive task
        

        if (!empty(rmData.translationPair)) {
            if (directMode) {
                // new process
                commands.contents.items = newCommands; 
                translatedCommands = commands.toString()
                translatedCommandsObj = commands;
                console.log("translatedCommands", commands.toString());
            } else {
                // this is the original behavior from the old rmrgss.js processing where this function
                // is called with a string yamlList. It gives commands.contents = newCommands that should be wrong,
                // but somehow it works.
                // This need to be confirmed in the future.
                // probably we can remove this altogether and use the directMode instead.

                // is the following correct? It should be commands.contents.item = newCommands
                commands.contents = newCommands; 
                translatedCommands = commands.toString()
                translatedCommandsObj = commands;
                console.log("translatedCommands", commands.toString());
            }

        }
    }

    return {
        translatedCommands  : translatedCommands,
        translatedCommandsObj : translatedCommandsObj,
        translatableTexts   : rmData.translatableTexts,
        transData           : rmData.transData,
        rmData              : rmData
    }
}

/**
 * Extract number from filename
 * @param {string} filename - The filename to extract number from
 * @returns {number} - The number extracted from the filename
 */
function extractNumberFromFilename(filename) {
    const regex = /CommonEvents-(\d+)\.yaml$/;
    const match = filename.match(regex);
    
    if (match && match[1]) {
        return parseInt(match[1], 10);
    } else {
        return null; // or handle the case when the pattern is not matched
    }
}

const parseCommonEventsSegment = async function(file, rmData, baseContext, translatedFileDestination="") {
    // ensure file exists
    // const fs = require('fs');
    if (!fs.existsSync(file)) {
        throw new Error(`File not found: ${file}`);
    }
    if (!baseContext || baseContext?.length == 0) {
        baseContext = ["CommonEvents",extractNumberFromFilename(file)];
    }

    const yamlScript = await fs.promises.readFile(file, "utf8");
    const yamlData = YAML.parseDocument(yamlScript, { customTags: customTags });

    const currentPage = yamlData.getIn([0]);
    //if (empty(currentPage)) return;
    rmData.registerStringObject(currentPage, "name", [...baseContext, "name"], [], {currentAddress:[...baseContext, "name"]})


    //const eventList = yamlData.newDocumentIn([0, "list"]);
    const eventList = yamlData.newDocumentIn([0, "list"]);
    let processedData = await ProcessEventsList(eventList, rmData, baseContext);


    // merge result;
    if (processedData.translatedCommands) {
        //const listDoc = YAML.parseDocument(processedData.translatedCommands);
        const listDoc = processedData.translatedCommandsObj;
        const list = yamlData.getIn([0, "list"]);
        list.items = listDoc.contents.items;
    }

    var translatedYamlString = yamlData.toString();
    if (translatedFileDestination) {
        await common.mkDir(nwPath.dirname(translatedFileDestination));
        await await fs.promises.writeFile(translatedFileDestination, translatedYamlString, "utf8");
    }

    return {
        translatableTexts  : processedData.translatableTexts,
        transData          : processedData.transData,
        translatedYaml     : translatedYamlString,
    }
}

const parseMapFile = async function(file, rmData) {
    if (!fs.existsSync(file)) {
        throw new Error(`File not found: ${file}`);
    }
    const yamlScript = await fs.promises.readFile(file, "utf8");
    const thisObj = YAML.parseDocument(
		yamlScript,
		{ customTags: customTags }
	);
    //console.log(thisObj.toString());
    const fileInfo = {};
    fileInfo.filename = nwPath.basename(file, nwPath.extname(file));

    rmData.registerStringObject(thisObj, "display_name", [fileInfo.filename, "display_name"], [], { currentAddress: ["display_name"] });
    rmData.registerStringObject(thisObj, "note", [fileInfo.filename, "note"], [], { currentAddress: ["note"] });

    const docEvts = thisObj.getIn(["events"]);
    if (empty(docEvts?.items)) return;

    for (let index = 0; index < docEvts.items.length; index++) {
        const thisEvtData = YAML.getFromIndex(thisObj.getIn(["events"]), index);
        if (empty(thisEvtData)) continue;

        const evtId = thisEvtData.get("id");
        rmData.registerStringObject(thisEvtData, "name", [fileInfo.filename, "events", evtId, "name"], [], { currentAddress: ["events", evtId, "name"] });

        const pages = thisEvtData.getIn(["pages"]);
        if (empty(pages?.items)) continue;

		for (var pageId=0; pageId<pages.items.length; pageId++) {
			var oldCommands = pages.getIn([pageId, "list"]);
			if (!Boolean(oldCommands)) continue;
			var newCommand  = await rmData.fetchCommandList(oldCommands, [fileInfo.filename, "events", evtId, "pages", pageId, "list"]);	
			//var newCommand  = await RMUtil.fetchCommandListWorker(rmData, oldCommands, [fileInfo.filename, "events", evtId, "pages", pageId, "list"]);	
			oldCommands.items = newCommand;
			//console.log("oldCommands.items", oldCommands.items);
		}
    }
    return {
        translatableTexts   : rmData.translatableTexts,
        transData           : rmData.transData,
        translatedYaml      : thisObj.toString(),
    }
}

const parseCommonData = async function(file, rmData, whatToFetch) {
    if (!fs.existsSync(file)) {
        throw new Error(`File not found: ${file}`);
    }

    const yamlScript = await fs.promises.readFile(file, "utf8");
    const thisObj = YAML.parseDocument(
		yamlScript,
		{ customTags: customTags }
	);

    const fileName = nwPath.basename(file, nwPath.extname(file));
    if (!whatToFetch) {
        whatToFetch = RMData.getCommonDataKeys(fileName);
    }
    if (!whatToFetch?.length) {
        throw new Error(`Required whatToFetch parameter is empty`);
    }


    await rmData.fetchCommonData(
		thisObj,
		whatToFetch,
		[fileName]
	);

    return {
        translatableTexts   : rmData.translatableTexts,
        transData           : rmData.transData,
        translatedYaml      : thisObj.toString(),
        whatToFetch         : whatToFetch,
    }
}

/**
 * Parse arbitrary XML file
 * @param {string} file - The file to parse
 * @param {RMData} rmData - The RMData object to use
 * @returns {object} - The result of the parsing
 */
const parseArbitraryFile = async function(file, rmData) {
    if (!fs.existsSync(file)) {
        throw new Error(`File not found: ${file}`);
    }
    const yamlScript = await fs.promises.readFile(file, "utf8");
    const thisObj = YAML.parseDocument(
		yamlScript,
		{ customTags: customTags }
	);

    await rmData.fetchArbitraryData(thisObj, [nwPath.basename(file, nwPath.extname(file))]);

    return {
        translatableTexts   : rmData.translatableTexts,
        transData           : rmData.transData,
        translatedYaml      : thisObj.toString(),
    }
}


void async function() {
    var result = {}
    try {
        if (workerData?.command == "parseEventList") {
            const eventData = await ProcessEventsList(workerData.yamlList, buildRMDataWithProperties(workerData.rmDataProperties), workerData.baseContext);
            result = {
                translatedCommands  : eventData.translatedCommands,
                translatableTexts   : eventData.translatableTexts,
                transData           : eventData.transData,
            }
        } else if (workerData?.command == "parseCommonEventsSegment") {
            result = await parseCommonEventsSegment(workerData.file, buildRMDataWithProperties(workerData.rmDataProperties), workerData.baseContext);
        } else if (workerData?.command == "parseMapFile") {
            result = await parseMapFile(workerData.file, buildRMDataWithProperties(workerData.rmDataProperties));
        } else if (workerData?.command == "parseCommonData") {
            result = await parseCommonData(workerData.file, buildRMDataWithProperties(workerData.rmDataProperties), workerData.whatToFetch);
        } else if (workerData?.command == "parseArbitraryFile") {
            result = await parseArbitraryFile(workerData.file, buildRMDataWithProperties(workerData.rmDataProperties));
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



/*
Sample code:
var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
var worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {workerData: "hello"});
worker.on("message", msg => console.log(`Worker message received: `, msg));
worker.on("error", err => console.error(error));
worker.on("exit", code => console.log(`Worker exited with code .`, code));



// Process event list in the format of YAML string data.
var YAML = require("www/addons/rmrgss/rmrgss.module.js").YAML
var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");

var yamlData = YAML.parseDocument(await common.fileGetContents("D:/Test/RMVXAce/sample.yaml"))

var worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {workerData: {
    command: "parseEventList",
    eventList: yamlData.toJSON()
}});

worker.on("message", msg => console.log(`Worker message received: `, msg));
worker.on("error", err => console.error(error));
worker.on("exit", code => console.log(`Worker exited with code .`, code));
*/