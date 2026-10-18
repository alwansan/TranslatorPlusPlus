/*
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this software except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

“Commons Clause” License Condition v1.0:
The Software is provided by the Licensor under the License with the condition
that you do not Sell the Software without written permission from the Licensor.

Software: rmrgss addon for Translator++
License: Apache 2.0
Licensor: Dreamsavior
*/
const {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");

var common = require("www/js/common.js");
const nwPath    = require('path');
const fs 		= require('graceful-fs');
const iconv 	= require('iconv-lite');	
const Logger    = require('www/js/Logger.js');
const logger    = new Logger();
logger.loadState(true);
const errors = [];
const JsonDB = require("www/addons/rmrgss/JsonInterface/JsonDB.js");
const RGSSParser = require("www/addons/rmrgss/RGSSParser.module.js");

const getJsonDB = function(rmData) {
    if (!rmData) {
        rmData = new JsonDB();
    }
    const rmDataProperties = workerData.rmDataProperties || {};
    for (let i in rmDataProperties) {
        rmData[i] = rmDataProperties[i];
    }
    return rmData;
}


const processEventsList = async (eventList, baseContext) => {
    const db = getJsonDB();
    const translatedEvent = await db.fetchCommandList(eventList, baseContext);
    
    return {
        translatableTexts   : db.translatableTexts,
        transData           : db.transData,
        translatedObject    : translatedEvent,
    };
}

const parseCommonData = async (dbData, filename, baseContext) => {
    const db = getJsonDB();
    const whatToFetch = JsonDB.getCommonDataKeys(filename);
    const translatedObject = await db.fetchCommonData(dbData, whatToFetch, baseContext);
    
    return {
        translatableTexts   : db.translatableTexts,
        transData           : db.transData,
        translatedObject    : translatedObject,
    };
}

const parseMapData = async (dbData, baseContext) => {
    const db = getJsonDB();
    const translatedObject = await db.fetchMapData(dbData, baseContext);
    
    return {
        translatableTexts   : db.translatableTexts,
        transData           : db.transData,
        translatedObject    : translatedObject,
    };
}

const parseTroopsData = async (dbData, baseContext) => {
    const db = getJsonDB();
    const translatedObject = await db.fetchTroopsData(dbData, baseContext);
    
    return {
        translatableTexts   : db.translatableTexts,
        transData           : db.transData,
        translatedObject    : translatedObject,
    };
}

const parseSystemData = async (dbData, baseContext) => {
    const db = getJsonDB();
    const translatedObject = await db.fetchSystemData(dbData, baseContext);
    
    return {
        translatableTexts   : db.translatableTexts,
        transData           : db.transData,
        translatedObject    : translatedObject,
    };
}

const parseSingleCommonEvent = async (dbData, baseContext) => {
    const db = getJsonDB();
    const translatedObject = await db.fetchSingleCommonEvent(dbData, baseContext);
    return {
        translatableTexts   : db.translatableTexts,
        transData           : db.transData,
        translatedObject    : translatedObject,
    };
}

const parseArbitraryData = async (dbData, baseContext) => {
    const db = getJsonDB();
    const translatedObject = await db.fetchArbitraryData(dbData, baseContext);
    return {
        translatableTexts   : db.translatableTexts,
        transData           : db.transData,
        translatedObject    : translatedObject,
    };
}

const parseRuby = async (rbScript, baseContext) => {
    const parserOptions = {...workerData.rmDataProperties, ...{baseContext: baseContext}};
    const rb = new RGSSParser(rbScript, parserOptions);

    await rb.parse();

    return {
        translatableTexts   : rb.translatableTexts,
        transData           : rb.transData,
        translatedObject    : rb.toString(),
    };

}



void async function() {
    var result = {};
    try {

        if (workerData?.command == "parseEventList") {
            result = await processEventsList(workerData.eventList||workerData.dbData, workerData.baseContext);
        } else if (workerData?.command == "parseSingleCommonEvent") {
            result = await parseSingleCommonEvent(workerData.dbData, workerData.baseContext);
        } else if (workerData?.command == "parseCommonData") {
            result = await parseCommonData(workerData.dbData, workerData.filename, workerData.baseContext);
        } else if (workerData?.command == "parseMapData") {
            result = await parseMapData(workerData.dbData, workerData.baseContext);
        } else if (workerData?.command == "parseTroopsData") {
            result = await parseTroopsData(workerData.dbData, workerData.baseContext);
        } else if (workerData?.command == "parseSystemData") {
            result = await parseSystemData(workerData.dbData, workerData.baseContext);
        } else if (workerData?.command == "parseArbitraryData") {
            result = await parseArbitraryData(workerData.dbData, workerData.baseContext);
        } else if (workerData?.command == "parseRuby") {
            result = await parseRuby(workerData.dbData, workerData.baseContext);
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