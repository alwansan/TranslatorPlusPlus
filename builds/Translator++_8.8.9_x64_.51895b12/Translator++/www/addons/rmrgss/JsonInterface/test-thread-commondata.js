var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\Armors.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var param = {
    command: "parseCommonData",
    // baseContext: baseContext,
    rmDataProperties: {
        // options: {
        //     options: rmData.options?.options,
        //     engineType:rmData.options?.engineType,
        // },
        translationPair:{
            "Casual Clothes":"Translated - Casual Clothes",
        },
        translationInfo:{},
    },
    filename: "armors",
    dbData : jsonObj,
}
console.log("Generated parameter", param);
await common.benchmark(async ()=> {
    var workerResult = await jsonDBUtil.fetchFromWorker(param);
    console.log("Worker result", workerResult);
});






// common data
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\Armors.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
await thisDB.fetchCommonData(jsonObj, JsonDB.getCommonDataKeys("armors"));


var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\Armors.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var param = {
    command: "parseCommonData",
    baseContext: ["data/Armors.rvdata2"],
    rmDataProperties: {
        // options: {
        //     options: rmData.options?.options,
        //     engineType:rmData.options?.engineType,
        // },
        translationPair:{
            "Casual Clothes":"Translated - Casual Clothes",
        },
        translationInfo:{},
    },
    filename: "armors",
    dbData : jsonObj,
}
console.log("Generated parameter", param);
await common.benchmark(async ()=> {
    var workerResult = await jsonDBUtil.fetchFromWorker(param);
    console.log("Worker result", workerResult);
});



// map data
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\Map001.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
await thisDB.fetchMapData(jsonObj);

// troop data
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project6-threadwork\\Data\\Troops.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
await thisDB.fetchTroopsData(jsonObj);
console.log(thisDB)

// system
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project6-threadwork\\Data\\System.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
await thisDB.fetchSystemData(jsonObj);
console.log(thisDB)


// common data
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\MapInfos.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
await thisDB.fetchCommonData(jsonObj, JsonDB.getCommonDataKeys("mapinfos"));

var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\Armors.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
await thisDB.fetchCommonData(jsonObj, JsonDB.getCommonDataKeys("armors"));


// single ce
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project6-threadwork\\Data\\CommonEvents.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
var translated = await thisDB.fetchSingleCommonEvent(jsonObj[1]);
console.log(translated);
console.log(thisDB);



// big commonevents
// 15664.839999983087
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\Commonevents.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var plimit = require("p-limit");
var limit = plimit(10); // Limit concurrent tasks to 10

await common.benchmark(async () => {
    // Create an array of tasks, each wrapped in the `limit` function
    const translatedCE = [];
    const tasks = jsonObj.map((event, i) => {
        if (!event) {
            translatedCE[i] = null;
            return null; // Skip null events
        }

        return limit(async () => {
            const param = {
                command: "parseEventList",
                rmDataProperties: {
                    translationPair: {
                        "Casual Clothes": "Translated - Casual Clothes",
                    },
                    translationInfo: {},
                },
                eventList: event["__symbol__@list"],
                baseContext: ["commonevents", i],
            };

            const workerResult = await jsonDBUtil.fetchFromWorker(param);
            translatedCE[i] = workerResult?.result?.translatedObject;
            console.log(`Worker result of ${i}`, workerResult);
        });
    });

    // Wait for all tasks to complete
    await Promise.all(tasks.filter(Boolean));
    console.log("Translated CE", translatedCE);
});





// map infos
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\MapInfos.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var param = {
    command: "parseCommonData",
    baseContext: ["data/Armors.rvdata2"],
    rmDataProperties: {
        // options: {
        //     options: rmData.options?.options,
        //     engineType:rmData.options?.engineType,
        // },
        translationPair:{
            "Casual Clothes":"Translated - Casual Clothes",
        },
        translationInfo:{},
    },
    filename: "armors",
    dbData : jsonObj,
}
console.log("Generated parameter", param);
await common.benchmark(async ()=> {
    var workerResult = await jsonDBUtil.fetchFromWorker(param);
    console.log("Worker result", workerResult);
});


// single ce

// map infos
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\CommonEvents.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var param = {
    command: "parseSingleCommonEvent",
    baseContext: ["data/CommonEvents.rvdata2", 1],
    rmDataProperties: {
        // options: {
        //     options: rmData.options?.options,
        //     engineType:rmData.options?.engineType,
        // },
        translationPair:{
            "Casual Clothes":"Translated - Casual Clothes",
        },
        translationInfo:{},
    },
    dbData : jsonObj[1],
}
console.log("Generated parameter", param);
await common.benchmark(async ()=> {
    var workerResult = await jsonDBUtil.fetchFromWorker(param);
    console.log("Worker result", workerResult);
});


//rb script
var jsonObj = await common.fileGetContents("test\\ruby\\test.rb", "utf8");
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var param = {
    command: "parseRuby",
    baseContext: ["script","test.rb"],
    rmDataProperties: {
        // options: {
        //     options: rmData.options?.options,
        //     engineType:rmData.options?.engineType,
        // },
        translationPair:{
            "Casual Clothes":"Translated - Casual Clothes",
        },
        translationInfo:{},
    },
    dbData : jsonObj,
}
console.log("Generated parameter", param);
await common.benchmark(async ()=> {
    var workerResult = await jsonDBUtil.fetchFromWorker(param);
    console.log("Worker result", workerResult);
});


//system
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\System.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var param = {
    command: "parseSystemData",
    baseContext: ["system"],
    rmDataProperties: {
        // options: {
        //     options: rmData.options?.options,
        //     engineType:rmData.options?.engineType,
        // },
        translationPair:{
            "Casual Clothes":"Translated - Casual Clothes",
        },
        translationInfo:{},
    },
    dbData : jsonObj,
}
console.log("Generated parameter", param);
await common.benchmark(async ()=> {
    var workerResult = await jsonDBUtil.fetchFromWorker(param);
    console.log("Worker result", workerResult);
});



var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project6-threadwork\\Data\\System.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
var translated = await thisDB.fetchSystemData(jsonObj);
console.log(translated);
console.log(thisDB);



var GameIniParser = require("www/addons/rmrgss/GameIniParser.js");
var gameIni = new GameIniParser(await common.fileGetContents("D:\\Test\\RMVXAce\\Project6-threadwork\\Game.ini"), {});
gameIni.parse();
console.log(gameIni);



// arbitrary
var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project6-threadwork\\Data\\Armors.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
var thisDB = new JsonDB();
await thisDB.fetchArbitraryData(jsonObj);