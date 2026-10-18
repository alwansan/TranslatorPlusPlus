void async function() {
    const {
        Worker,
        isMainThread,
        parentPort,
        workerData
    } = require("worker_threads");
    const script = await common.fileGetContents("test\\ruby\\test.rb");
    const worker = new Worker("./www/addons/rmrgss/rgssparser.thread.js", {
            workerData: {
                command:"getTransData",
                rbScript: script
            }
        });
    worker.on("message", msg => console.log(`Worker message received: `, msg));
    worker.on("error", err => console.error(err));
    worker.on("exit", code => console.log(`Worker exited with code .`, code));
}()


// for RMTransParser
void async function() {
    const {
        Worker,
        isMainThread,
        parentPort,
        workerData
    } = require("worker_threads");
    const script = await common.fileGetContents("www/addons/rmrgss/tests/Map001.txt");
    const worker = new Worker("./www/addons/rmrgss/RMTransParser.thread.js", {
            workerData: {
                command :"getTransData",
                script : script
            }
        });
    worker.on("message", msg => console.log(`Worker message received: `, msg));
    worker.on("error", err => console.error(err));
    worker.on("exit", code => console.log(`Worker exited with code .`, code));
}()