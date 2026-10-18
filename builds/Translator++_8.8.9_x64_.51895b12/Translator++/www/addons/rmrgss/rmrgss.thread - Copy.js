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


var prismJs = require('@rmrgss/prismjs');
require('@rmrgss/prismjs/components/prism-ruby');


var processMapData = async function(yamlList, rmDataProperties, baseContext) {
    var rmData = new RMData();
    for (var i in rmDataProperties) {
        rmData[i] = rmDataProperties[i];
    }
    //console.log("rmData", rmData);
    var commands = YAML.parseDocument(yamlList);
    //console.log("past here");
    
    var newCommands = await rmData.fetchCommandList(commands.contents, baseContext);

    //console.log("newCcommands is", newCommands);
    //console.log("procecssed RMDATA", rmData);

    // replace original contents with new one
    // if translation table is empty, do not send back the translatedCommands, because commands.toString() is a resource expensive task
    var translatedCommands = ""
    if (!empty(rmData.translationPair)) {
        commands.contents = newCommands;
        translatedCommands = commands.toString()
    }

    return {
        translatedCommands  : translatedCommands,
        translatableTexts   : rmData.translatableTexts,
        transData           : rmData.transData,
    }
}



void async function() {
    //var script = (await fs.promises.readFile('test/ruby/test.rb')).toString()
    //new ScriptParser(await common.fileGetContents('test/ruby/test.rb'));
    var result = {}
    try {
        /*
        var rgss = new RGSSParser(await common.fileGetContents('test/ruby/test.rb'))
        rgss.parse();

        var sampleData = YAML.parseDocument(await common.fileGetContents("D:/Test/RMVXAce/sample.yaml"))
        var commandList = sampleData.getIn(["events", 1, "pages", 0, "list"])
        var rmData = new RMData(sampleData);
        await rmData.fetchCommandList(commandList, [])
        */

        if (workerData?.command == "parseEventList") {
            result = await processMapData(workerData.yamlList, workerData.rmDataProperties, workerData.baseContext)
        }
    
    } catch (e) {
        errors.push(e.stack)
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