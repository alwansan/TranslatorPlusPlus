void async function() {
    var {
        Worker,
        isMainThread,
        parentPort,
        workerData
    } = require("worker_threads");
    var worker = new Worker("./www/addons/xmlTrans/tests/thread.js", {workerData: {data:"hello"}});
    worker.on("message", msg => console.log(`Worker message received: `, msg));
    worker.on("error", err => console.error(err));
    worker.on("exit", code => console.log(`Worker exited with code .`, code));
}()