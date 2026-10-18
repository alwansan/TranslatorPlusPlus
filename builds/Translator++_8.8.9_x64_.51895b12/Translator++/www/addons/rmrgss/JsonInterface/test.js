var marshal = require("www/addons/rmrgss/lib/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));
var jsonData = new JsonDBData(jsonObj);
jsonData.setIn([1, "name"], "howdy")
console.log(jsonData.getIn([1, "name"]));



var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
common.benchmark(async () => {
    var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
    var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));
    // var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\vq\\vq2nd-DEV\\Data\\CommonEvents.rvdata2"));
    var jsonDB = new JsonDB(jsonObj);
    jsonDB.writeMode = true;
    jsonDB.translationPair = {
        "Text Line 1\nText Line 2": "Translated Text Line 1\nTranslated Text Line 2",
        "Yes": "Oui",
        "No": "Non",
        "Text when choice is Yes": "Translated text when choice is Yes",
        "Scrolling text line 1\nScrolling text line 2\nScrolling text line 3": "Translated Scrolling text line 1\nTranslated Scrolling text line 2\nTranslated Scrolling text line 3",
        "John": "Jean",
        "Andy": "André",
        '"Script line 1"': '"Translated Script line 1"',
        '"Script line 2"': '"Translated Script line 2"',
        '"Script line 3"': '"Translated Script line 3"',
        "Some comment when coices is No\nComment line 2\nComment line 3": "Translated Some comment when coices is No\nTranslated Comment line 2\nTranslated Comment line 3",
        "Choice's cancel option": "Translated Choice's cancel option",
        '"variable script"': '"Translated variable script"'
    }
    await jsonDB.parseCommonEvents();
    console.log("%c jsonDB", "color:green", jsonDB);
    console.log("Writing to file...");
    jsonDB.compileTo("D:\\Test\\RMVXAce\\Project7-dump\\Data\\CommonEvents.rvdata2", jsonObj);
    // jsonDB.compileTo("D:\\Test\\RMVXAce\\vq\\vq2nd-DEV-dump\\Data\\CommonEvents.rvdata2", jsonObj);
});
    
    
    var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
    var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));
    var jsonDB = new JsonDB(jsonObj);
    var translatedList = await jsonDB.fetchCommandList(jsonObj[1]["__symbol__@list"]);
    console.log("%c jsonDB", "color:green", jsonDB);
    jsonObj[1]["__symbol__@list"] = translatedList;
    console.log("Writing to file...");
    jsonDB.compileTo("D:\\Test\\RMVXAce\\Project7-dump\\Data\\CommonEvents.rvdata2", jsonObj);
    
    
    var marshal = require("www/addons/rmrgss/lib/marshal.js")
    var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));
    marshal.dump(jsonObj);



// worker

var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));
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
    eventList : jsonObj[1]["__symbol__@list"],
}
console.log("Generated parameter", param)

var workerResult = await fetchFromWorker(param);




var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));

var worker = new Worker("./www/addons/rmrgss/JsonInterface/JsonDB.worker.js", {workerData: {
    command: "parseEventList",
    eventList: jsonObj[1]["__symbol__@list"]

}});
worker.on("message", msg => console.log(`Worker message received: `, msg));
worker.on("error", err => console.error(error));
worker.on("exit", code => console.log(`Worker exited with code .`, code));