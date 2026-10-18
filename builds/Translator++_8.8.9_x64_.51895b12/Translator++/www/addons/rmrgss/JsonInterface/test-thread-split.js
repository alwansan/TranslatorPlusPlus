var marshal = require("www/addons/rmrgss/lib/legacy/marshal.js")
// var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\Project7\\Data\\CommonEvents.rvdata2"));
var jsonObj = marshal.load(fs.readFileSync("D:\\Test\\RMVXAce\\p&c\\Data\\CommonEvents.rvdata2"));
var jsonDBUtil = require("www/addons/rmrgss/JsonInterface/JsonDB.util.js");
var pLimit = require("p-limit");
var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");


/**
 * Fetches data from a worker thread.
 *
 * @param {Object} parameter - The parameters to pass to the worker.
 * @returns {Promise<any>} - Resolves with the worker's response.
 */
async function fetchFromWorker(parameter = {}) {
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

async function processEventsConcurrently() {
    const events = jsonDBUtil.splitEventList(jsonObj[239]["__symbol__@list"]); // 80k lines
    const limit = pLimit(10); // Limit concurrency to 10

    // Create an array of tasks to process with limited concurrency
    const tasks = events.map((eventChunk, index) =>
        limit(async () => {
            const param = {
                command: "parseEventList",
                eventList: eventChunk,
            };
            console.log(`Processing chunk ${index + 1}/${events.length} with parameter:`, param);

            try {
                const workerResult = await fetchFromWorker(param);
                console.log(`Worker result for chunk ${index + 1}:`, workerResult);
                return workerResult;
            } catch (error) {
                console.error(`Error processing chunk ${index + 1}:`, error);
                throw error;
            }
        })
    );

    // Execute all tasks
    try {
        const results = await Promise.allSettled(tasks);
        console.log("All tasks completed. Results:", results);
    } catch (error) {
        console.error("Error in processing events:", error);
    }
}

// Run the concurrent event processing
// 1415.6150000058115 ms!!!
await common.benchmark(async ()=> {
    await processEventsConcurrently().catch(err => {
        console.error("Unexpected error:", err);
    });
});