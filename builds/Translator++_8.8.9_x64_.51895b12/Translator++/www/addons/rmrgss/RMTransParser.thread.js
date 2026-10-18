const RMTransParser = require("www/addons/rmrgss/RMTransParser.rgss.module.js")
const thisWorker = new (require("www/js/CommonWorker.js").Worker)();

thisWorker.process = async function(workerData) {
    console.log("Processing options", workerData.options)
    if (workerData.command == "getTransData") {
        const parsedObj = RMTransParser.parseRPGMakerTrans(workerData.script);
        return RMTransParser.parsedObjToTransRMRGSS(parsedObj);
    }    
}
thisWorker.init();