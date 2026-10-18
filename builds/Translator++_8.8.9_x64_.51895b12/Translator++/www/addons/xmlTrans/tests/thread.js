var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");

const moduleAlias = require('module-alias');
const thisPath = "www/addons/xmlTrans/";
moduleAlias.addAliases({
    '@xmlTrans': thisPath + "/node_modules"
})
moduleAlias.addPath(thisPath+'/node_modules');
moduleAlias(thisPath+'/package.json');
// const jsdom = require("@xmlTrans/jsdom");

var common      = require("www/js/common.js");
const XmlTrans  = require("www/addons/xmlTrans/xml.module.js");
const Logger    = require('www/js/Logger.js');
var logger      = new Logger();
logger.loadState(true);
var errors = [];
var result = {}

const main = async function() {
    // var xmlTrans = new XmlTrans('D:\\Test\\rm2k3\\TestProject\\extract\\Map0001.emu',
    // {
    //     config: [
    //         {
    //             queryString : "name, description, terms>Terms>*, states message_actor, states message_enemy, states message_already, states message_affected, states message_recovery, skills using_message1,  skills using_message2, actors title",
    //         }
    //     ],
        
    //     translationPair : {
    //         "Hello world\nline 2\nline 3" : "Translated1\nTranslated2\nTranslated3",
    //         "Message group2\nMessage group2-line2" : "Translation\nTranslation\nTranslation",
    //         "Message on common events" : "Translation on ce",
    //         "EV0001" : "nama event"
            
    //     }
    // });
    // await xmlTrans.parse();
    const serializer = new XMLSerializer()
}

void async function() {
    // sending message to parent
    try {
        await main();
    } catch (e) {
        errors.push(e.stack)
    }

    if (!isMainThread) {
        //var data = workerData;
        parentPort.postMessage({
            processedCommand        : workerData,
            randomId    : common.generateId(),
            logs        : logger.getOutput(),
            filePath    : __filename,
            errors      : errors,
            result      : result
        });
    }
}();

