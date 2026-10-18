var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
//var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));
var jsonObj = marshal.load(fs.readFileSync("J:\\Donovan\\Games\\misc\\Princess & Conquest\\Princess & Conquest v0.21.00\\Data\\CommonEvents.rvdata2"));

var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
async function fetchFromWorker(parameter ={}) {
    return new Promise((resolve, reject) => {
        var worker = new Worker("./www/addons/rmrgss/JsonInterface/JsonDB.worker.js", {workerData: parameter});
        worker.on("message", msg => {
            console.log(`--Worker message received: `, msg);
            resolve(msg)
        });
        worker.on("error", err => {
            console.error(err)
            reject()
        });
        worker.on("exit", code => {
            console.log(`--Worker exited with code :`, code)
            resolve()	
        });
    })
}
var param = {
    command: "parseEventList",
    // baseContext: baseContext,
    // rmDataProperties: {
    //     options: {
    //         options: rmData.options?.options,
    //         engineType:rmData.options?.engineType,
    //     },
    //     translationPair:rmData.translationPair,
    //     translationInfo:rmData.translationInfo
    // },
    eventList : jsonObj[239]["__symbol__@list"],
}
console.log("Generated parameter", param)
await common.benchmark(async ()=> {
    var workerResult = await fetchFromWorker(param);
    console.log("Worker result", workerResult);
});