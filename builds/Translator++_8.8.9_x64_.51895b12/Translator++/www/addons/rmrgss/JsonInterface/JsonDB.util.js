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
const { Worker } = require("worker_threads");
const util = {};

/**
 * Splits an array of event objects into chunks of a specified size, ensuring grouped codes
 * (`401`, `405`, `408`, `655`) do not span multiple chunks.
 *
 * @param {Object[]} eventList - The list of event objects to split.
 * @param {number} [numofElms=2000] - The maximum number of elements per chunk.
 * @returns {Object[][]} - An array of chunks, where each chunk is an array of event objects.
 *
 * @example
 * const eventList = [
 *   { "__symbol__@code": 101, ... },
 *   { "__symbol__@code": 401, ... },
 *   { "__symbol__@code": 401, ... },
 *   { "__symbol__@code": 102, ... },
 *   ...
 * ];
 * const chunks = splitEventList(eventList, 5);
 * console.log(chunks);
 */
util.splitEventList = function(eventList, numofElms = 2000) {
    const groupedCodes = new Set([401, 405, 408, 655]);
    const chunks = [];
    let currentChunk = [];

    for (let i = 0; i < eventList.length; i++) {
        currentChunk.push(eventList[i]);

        // Check if the chunk has reached the specified number of elements
        if (currentChunk.length >= numofElms || i === eventList.length - 1) {
            // Ensure the last element of the current chunk and the next element (if any) don't have the same `__symbol__@code`
            while (
                i + 1 < eventList.length &&
                groupedCodes.has(eventList[i]["__symbol__@code"]) &&
                groupedCodes.has(eventList[i + 1]["__symbol__@code"])
            ) {
                currentChunk.push(eventList[++i]);
            }

            chunks.push(currentChunk);
            currentChunk = [];
        }
    }

    return chunks;
}


util.fetchFromWorker = async function(parameter = {}) {
    return new Promise((resolve, reject) => {
        const worker = new Worker("./www/addons/rmrgss/JsonInterface/JsonDB.worker.js", { workerData: parameter });

        worker.on("message", msg => {
            console.log(`--Worker message received:`, msg);
            resolve(msg);
        });

        worker.on("error", err => {
            console.error(`--Worker error:`, err);
            reject(err);
        });

        worker.on("exit", code => {
            if (code !== 0) {
                console.error(`--Worker exited with non-zero code:`, code);
                reject(new Error(`Worker exited with code ${code}`));
            } else {
                console.log(`--Worker exited with code:`, code);
            }
        });
    });
}

util.detectEngineTypeFromTrans = function(transData) {
    if (!transData?.project?.files) throw new Error("Invalid trans project data");
    for (let file in transData.project.files) {
        if (!file) continue;
        if (nwPath.basename(nwPath.dirname(file)).toLowerCase() !== "data") continue;
        const ext = nwPath.extname(file).toLowerCase();
        if (ext === ".rvdata2") {
            return "ace";
        } else if (ext === ".rvdata") {
            return "vx";
        } else if (ext === ".rxdata") {
            return "xp";
        }
    }
}

util.detectExtensionTypeFromTrans = function(transData) {
    if (!transData?.project?.files) throw new Error("Invalid trans project data");
    for (let file in transData.project.files) {
        if (!file) continue;
        if (nwPath.basename(nwPath.dirname(file)).toLowerCase() !== "data") continue;
        const ext = nwPath.extname(file).toLowerCase();
        if ([ ".rvdata2", ".rvdata", ".rxdata" ].includes(ext)) {
            return ext;
        }
    }
}

util.extractScripts = async function(gameDir, targetDir) {
    gameDir = nwPath.resolve(gameDir);
    targetDir = targetDir || nwPath.resolve(gameDir);
    console.log(`Extracting scripts from ${gameDir} to ${targetDir}...`);
    const scriptData = await common.searchFile("data/Scripts.{rxdata,rvdata,rvdata2}", gameDir);
    if (!scriptData?.length) {
        throw new Error("Script file not found");
    }

    const ext = nwPath.extname(scriptData[0]);
    let engineType = "ace";
    if (ext === ".rxdata") {
        engineType = "xp";
    } else if (ext === ".rvdata") {
        engineType = "vx";
    } else if (ext === ".rvdata2") {
        engineType = "ace";
    } else {
        throw new Error("Invalid script file");
    }

    await common.mkDir(targetDir);
    await common.aSpawn(nw.App.manifest.localConfig.ruby, [
        nwPath.resolve("www/addons/rmrgss/bin/rvpacker/rvpacker.rb"),
        "-a", "unpack",
        "-d", gameDir,
        "-t", engineType,
        "-V", "-f",
        "-T", targetDir,
        "-D", "scripts"
    ], {});    
}

util.packScripts = async function(targetDir, engineType) {
    targetDir = nwPath.resolve(targetDir);
    engineType = engineType || this.detectEngineTypeFromTrans(trans);
    if (["ace", "vx", "xp"].indexOf(engineType) === -1) {
        throw new Error("Invalid engine type");
    }

    await common.mkDir(targetDir);
    await common.aSpawn(nw.App.manifest.localConfig.ruby, [
        nwPath.resolve("www/addons/rmrgss/bin/rvpacker/rvpacker.rb"),
        "-a", "pack",
        "-d", targetDir,
        "-t", engineType,
        "-V", "-f",
        "-T", targetDir,
        "-D", "scripts"
    ], {});
}

module.exports = util;