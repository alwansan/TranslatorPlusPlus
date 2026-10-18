/**=====LICENSE STATEMENT START=====
    Translator++ 
    CAT (Computer-Assisted Translation) tools and framework to create quality
    translations and localizations efficiently.
        
    Copyright (C) 2018  Dreamsavior<dreamsavior@gmail.com>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
=====LICENSE STATEMENT END=====*/
const {
    Worker,
    isMainThread,
    parentPort,
    workerData,
} = require("worker_threads");


const CommonWorker = function() {
    this.errors =  [];
    this.result;
}

CommonWorker.prototype.sendLog = function(type, ...message) {
    parentPort.postMessage({
        // processedCommand: workerData,
        // filePath        : __filename,
        type            : type,
        message         : Array.from(message||[])
    })
}

CommonWorker.prototype.initLogger = async function(options = {}) {
    const self = this;

    if (options.logTarget == "file") {
        const Logger    = require('www/js/Logger.js');
        this.logger      = new Logger();
        //const nwPath = require("path")
        this.logger.loadState(true);
    } else  {
        this.console = console;
        console.log = function() {
            self.sendLog("log", Array.from(arguments))
        };
        console.warn = function() {
            self.sendLog("warn", Array.from(arguments))
        };
        console.error = function() {
            self.sendLog("error", Array.from(arguments))
        };
        console.debug = function() {
            self.sendLog("debug", Array.from(arguments))
        };
        console.trace = function() {
            self.sendLog("trace", Array.from(arguments))
        };
    }
}

CommonWorker.prototype.process = async function(workerData = {}) {
    return "Please replace the process() function with your own logic"
}

CommonWorker.prototype.init = async function() {
    // sending message to parent
    try {
        await this.initLogger(workerData.options);
        this.result = await this.process(workerData);
    } catch (e) {
        this.errors.push(e.stack)
    }

    if (!isMainThread) {
        var logOutput = []
        if (typeof this.logger !== "undefined") {
            logOutput = this.logger.getOutput()
        }
        parentPort.postMessage({
            processedCommand        : workerData,
            logs        : logOutput,
            filePath    : __filename,
            errors      : this.errors,
            result      : this.result,
            type        : "done"
        });
    }
};

class Handler extends require("www/js/BasicEventHandler.js") {
	constructor(workerScript="", workerData={}, options={}) {
		super();
        this.options = options || {};
        this.result = undefined;
        this.sent = false;



        this.getResult = async () => {
            if (!this.sent) this.send();
            await this.until("done");
            return this.result;
        }

        this.send = async ()=> {
            this.sent = true;
            this.worker = new Worker(workerScript, {
                workerData: workerData
            });
            this.worker.on("message", (msg) => {
                this.trigger("message", msg);
                if (msg?.type == "done") {
                    this.result = msg;
                } else if (["log", "trace", "debug"].includes(msg?.type)) {
                    console.log("%c Log from worker "+workerScript, "color:aqua",  msg)
                } else if (msg?.type == "warn") {
                    console.warn("Warn from ", workerScript, msg)
                } else if (msg?.type == "error") {
                    console.warn("Errof from", workerScript, msg)
                }
            });
            this.worker.on("error", (err) => {
                this.trigger("error", err);
            });
            this.worker.on("exit", (code) => {
                this.trigger("exit", code);
                this.resolveState("done");
            });
        }
    }
}

module.exports = {
    Worker:CommonWorker,
    Handler:Handler
};