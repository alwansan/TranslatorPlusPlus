(async () => {
const fs = require("fs");
const pLimit = require("p-limit");
const nwPath = require("path");
const glob = require("glob");
const { Worker } = require("worker_threads");

const parseCommonEventsSegment = async (file) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {
            workerData: {
                command: "parseCommonEventsSegment",
                baseContext: ["CommonEvents", 1],
                file: file,
            },
        });

        worker.on("message", (msg) => {
            console.log(`Worker message received: `, msg);
            resolve(msg);
        });

        worker.on("error", (err) => {
            console.error(`Worker error:`, err);
            reject(err);
        });

        worker.on("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`Worker exited with code ${code}`));
            }
        });
    });
};

const parseCommonEventsSegments = async (commonEventsFile) => {
    const baseDir = nwPath.dirname(commonEventsFile);
    if (!fs.existsSync(baseDir)) {
        throw new Error(`Directory not found: ${baseDir}`);
    }

    // Use glob to find all files with pattern: baseDir/CommonEvents-*.yaml
    const files = await common.searchFile("CommonEvents-*.yaml", baseDir);
    console.log(`Found ${files.length} CommonEvents segment files in directory: ${baseDir}`);

    if (files.length === 0) {
        console.log(`No CommonEvents segment files found in directory: ${baseDir}`);
        return;
    }

    // Limit concurrency to 7 using pLimit
    const limit = pLimit(7);

    // Capture the segment ID from the filename and parse the CommonEvents segment file
    const parseTasks = files.map((file) => {
        const capture = nwPath.basename(file).match(/CommonEvents-(\d{4})\.yaml/);
        if (!capture) {
            return;
        }
        const segmentId = capture[1];
        if (!segmentId) {
            return;
        }
        console.log(`Processing segment ID: ${segmentId}`);

        return limit(() => parseCommonEventsSegment(file));
    });

    // Wait for all tasks to complete
    try {
        const results = await Promise.all(parseTasks);
        console.log(`All segments processed successfully.`);
        return results;
    } catch (error) {
        console.error(`Error processing CommonEvents segments:`, error);
    }
};

await common.benchmark(async () => {
    await parseCommonEventsSegments("www/addons/rmrgss/sample/ce/CommonEvents.yaml");
});

})();