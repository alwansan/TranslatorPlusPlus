var YAML = require("www/addons/rmrgss/rmrgss.module.js").YAML
var {
    Worker,
    isMainThread,
    parentPort,
    workerData
} = require("worker_threads");

var worker = new Worker("./www/addons/rmrgss/rmrgss.thread.js", {
            workerData: {
                command: "parseMapFile",
                baseContext: [],
                file: "www/addons/rmrgss/sample/map/Map001.yaml",
                rmDataProperties: {
                    translationPair: {
                        "Common event 1":"Translated ce title",
                        "のびた人陰を舗道に並べ\n夕闇のなかをキミと歩いてる\n手を繋いでいつまでもずっと\nそばにいれたなら泣けちゃうくらい" : "translated1\ntranslated2\ntranslated3\ntranslated4",
                        "風が冷たくなって\n冬の匂いがした\nそろそろこの街に\nキミと近付ける季節がくる" : "translated5\ntranslated6"
                    },
                },
            },
        });

worker.on("message", msg => console.log(`Worker message received: `, msg));
worker.on("error", err => console.error(error));
worker.on("exit", code => console.log(`Worker exited with code .`, code));
