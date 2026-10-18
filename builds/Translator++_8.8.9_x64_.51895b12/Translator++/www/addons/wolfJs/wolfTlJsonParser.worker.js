const { parentPort, workerData } = require("worker_threads");
const fs = require("graceful-fs");
const Module = require("module");

process.env.NODE_PATH = process.cwd();
Module._initPaths();

global.window = global.window || {};
global.common = global.common || {
    clone(value) {
        if (typeof value === "undefined") return undefined;
        return JSON.parse(JSON.stringify(value));
    },
};
global.empty = global.empty || function(mixedVar) {
    if (Array.isArray(mixedVar)) return mixedVar.length === 0;
    if (mixedVar == null) return true;
    if (typeof mixedVar === "object") return JSON.stringify(mixedVar) === "{}";
    return !mixedVar;
};

const { JSONTranslate } = require("www/addons/ESParser/ESParser.module.js");
const WolfTlMap = require("www/addons/wolfJs/wolfTlMap.js");
const WolfTlCommon = require("www/addons/wolfJs/wolfTlCommon.js");
const WolfTlDb = require("www/addons/wolfJs/wolfTlDb.js");

const getParser = (fileGroup, basename, jsonObj, parserOptions) => {
    if (fileGroup === "mps") return new WolfTlMap(jsonObj, parserOptions);
    if (fileGroup === "common") return new WolfTlCommon(jsonObj, parserOptions);
    if (fileGroup === "db") {
        if (basename === "SysDatabase.json") return null;
        return new WolfTlDb(jsonObj, parserOptions);
    }
    return new JSONTranslate(jsonObj, parserOptions);
};

const parse = async () => {
    const jsonText = await fs.promises.readFile(workerData.fullPath, "utf8");
    const jsonObj = JSON.parse(jsonText);
    const parser = getParser(workerData.fileGroup, workerData.basename, jsonObj, workerData.parserOptions || {});

    if (!parser) {
        return workerData.command === "writeFile"
            ? JSON.stringify(jsonObj, null, 4)
            : {
                data: [[]],
                context: [[]],
                tags: [],
                parameters: [],
                indexIds: {},
            };
    }

    if (workerData.command === "writeFile") {
        await parser.parse();
        return await parser.toString();
    }

    return await parser.toTrans();
};

parse()
    .then((result) => {
        parentPort.postMessage({ result });
        parentPort.close();
    })
    .catch((error) => {
        parentPort.postMessage({
            error: {
                message: error.message,
                stack: error.stack,
            },
        });
        parentPort.close();
    });
