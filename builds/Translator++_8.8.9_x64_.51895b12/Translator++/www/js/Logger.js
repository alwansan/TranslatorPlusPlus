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
const fs = require('graceful-fs');
const nwPath = require('path');
const debounce = require('debounce');

/**
 * Redirect the normal log events to a file or array
 * @class
 */
class Logger {
    constructor(options={}) {
        this.options    = options || {};
        this.file       = options.file|| undefined;
        this.output     = [];
        this.baseStack  = this.baseStack||3;
        this.configKey  = options.configKey || "Logger";
        this.config     = options.config || {};
        this.loadConfig();
        if (this.options.truncate) this.truncate()
    }
}

global.__LoggerPooler ||= {}

Logger.getFilePool = function(file) {
    global.__LoggerPooler[file] ||= [];
    return global.__LoggerPooler[file];
}
Logger.resetFilePool = function(file) {
    if (!file) return;
    if (!global.__LoggerPooler[file]) return;
    global.__LoggerPooler[file] = []
}
Logger.appendFilePool = function(file, msg) {
    if (!file) return;
    global.__LoggerPooler[file] ||= [];
    global.__LoggerPooler[file].push(msg);
    return global.__LoggerPooler[file];
}
Logger.consumeFilePool = function(file) {
    if (!file) return;
    const pool = this.getFilePool(file);
    global.__LoggerPooler[file] = [];
    return pool;
}


Logger.prototype.saveConfig = function() {
    this.config = this.config || {};
    localStorage.setItem(this.configKey, JSON.stringify(this.config))
}

Logger.prototype.loadConfig = function() {
    try {
        this.config = JSON.parse(localStorage.getItem(this.configKey))
    } catch (e) {
        this.config = {};
    }

    return this.config;
}

Logger.prototype.setConfig = function(key, value) {
    this.config = this.config || {};
    this.config[key] = value;
    this.saveConfig();
}

Logger.prototype.unsetConfig = function(key, value) {
    this.config = this.config || {};
    delete this.config[key];
    this.saveConfig();
}

Logger.prototype.getConfig = function(key, value) {
    this.config = this.config || {};
    return this.config[key];
}

Logger.prototype.getCallerInfo = function() {
    var err = new Error;
    var stack = err.stack.split("\n");
    if (!stack[this.baseStack]) return "";
    if ( stack[this.baseStack].includes('    at chrome-extension')) {
        stack[this.baseStack] =  stack[this.baseStack].replace("    at ", "");
        return nwPath.basename(stack[this.baseStack]);
    }

    var match = stack[this.baseStack].match(/\((.*?)\)/)
    if (!match) return stack[this.baseStack];
    if (!match[1]) return stack[this.baseStack];

    return nwPath.basename(match[1]);
}

Logger.prototype.getStackCall = function() {
    var err = new Error;
    var stackStr = err.stack;
    stackStr = stackStr.replaceAll(/chrome-extension:\/\/[a-z]+/g, "");
    var stack = stackStr.split("\n").slice(this.baseStack);
    return "\t"+stack.join("\n\t");
}

Logger.prototype.argumentsToArray = function(args) {
	args = Array.prototype.slice.call(args);
	return args;
}
Logger.prototype.getOutput = function() {
    return this.output;
}
Logger.prototype.truncate = async function(file) {
    file = file || this.file;
    if (!file) {
        if (!this.output) return;
        this.output = [];
        return;
    }
    Logger.resetFilePool(file);
    fs.promises.writeFile(file, "Log started at: "+Date()+"\n")
}

// Logger.prototype.commitWriteLog = async function(msg, file) {
//     // should create pooler and debouncer out of this
//     file = file || this.file;
//     if (!file) {
//         if (!Array.isArray(this.output)) return file;
//         this.output.push(msg);
//         // write to output;
//     }
//     await fs.promises.writeFile(file, msg+"\n", {'flag':'a'});
// }

const writePoolToFile = async function(file) {
    let pool = Logger.consumeFilePool(file);
    await fs.promises.writeFile(file, pool.join("\n")+"\n", {'flag':'a'});
}

const debouncedWriteToFile = debounce((file) => writePoolToFile(file), 300);

Logger.prototype.writeLog = async function(msg, file) {
    file = file || this.file;
    if (!file) {
        if (!Array.isArray(this.output)) return;
        this.output.push(msg);
        return;
    }
    Logger.appendFilePool(file, msg+"");
    debouncedWriteToFile(file);
}

Logger.prototype.log = async function() {
    var lineInfo = this.getCallerInfo();
    var msg = ""
    try {
        msg = "[INFO]\t"+this.argumentsToArray(arguments).join(" ")+"\t-->"+lineInfo;
    } catch (e) {
        msg = "--- UNABLE TO CAPTURE ---"
    }
    this.writeLog(msg);
}
Logger.prototype.warn = async function() {
    var lineInfo = this.getCallerInfo();
    var msg = "[WARN]\t"+this.argumentsToArray(arguments).join(" ")+"\t-->"+lineInfo;
    this.writeLog(msg);
    this.writeLog(this.getStackCall())
}
Logger.prototype.error = async function() {
    if (typeof arguments[4] == "object") {
        try {
            if (arguments[4].stack) {
                let msg = "[ERROR]\t"+arguments[4].message+` at ${arguments[1]} ${arguments[2]}:${arguments[3]}`;
                this.writeLog(msg);
                this.writeLog("\t"+arguments[4].stack.split("\n").join("\n\t"));
                return;
            }
        } catch (e) {
            // do nothing
        }
    }
    var lineInfo = this.getCallerInfo();
    let msg = "[ERROR]\t"+this.argumentsToArray(arguments).join(" ")+"\t-->"+lineInfo;
    this.writeLog(msg);
    this.writeLog(this.getStackCall())
}
Logger.prototype.debug = async function() {
    var lineInfo = this.getCallerInfo();
    var msg = "[DEBUG]\t"+this.argumentsToArray(arguments).join(" ")+"\t-->"+lineInfo;
    this.writeLog(msg);
}
Logger.prototype.trace = async function() {
    var lineInfo = this.getCallerInfo();
    var msg = "[TRACE]\t"+this.argumentsToArray(arguments).join(" ")+"\t-->"+lineInfo;
    this.writeLog(msg);
    this.writeLog(this.getStackCall())
}


Logger.prototype.replaceConsole = function() {
    if (this.consoleIsReplaced) return;
    this.baseStack = 4;
    var that = this;
    // preserve the original handler
    this.consoleLog     = console.log;
    this.consoleInfo    = console.info;
    this.consoleDebug   = console.debug;
    this.consoleWarn    = console.warn;
    this.consoleError   = console.error;
    this.consoleTrace   = console.trace;
    
    console.log = function() {
		that.log.apply(that, arguments)
	}
    console.info = function() {
		that.log.apply(that, arguments)
	}
    console.debug = function() {
		that.debug.apply(that, arguments)
	}
    console.warn = function() {
		that.warn.apply(that, arguments)
	}
    console.error = function() {
		that.error.apply(that, arguments)
	}
    console.trace = function() {
		that.trace.apply(that, arguments)
	}


    // listen to the unhandled exceptions
    window.onerror = function (message, file, line, col, error) {
        that.error.apply(that, arguments)
        that.consoleError("Error Occured:", arguments);
        return false;
    };
    window.addEventListener("error", function (e) {
        that.error.apply(that, [e?.error?.message])
        that.consoleError("Error", e?.error?.message, e);

        return false;
    })
    window.addEventListener('unhandledrejection', function (e) {
        that.error.apply(that, [e?.reason?.message])
        that.consoleError("Unhandled rejection: " + e?.reason?.message);
    })

    this.consoleIsReplaced = true;
}

Logger.prototype.restoreConsole = function() {
    console.log     = this.consoleLog;
    console.info    = this.consoleInfo;
    console.debug   = this.consoleDebug;
    console.warn    = this.consoleWarn;
    console.error   = this.consoleError;
    console.trace   = this.consoleTrace;
    this.consoleIsReplaced = false;
}

Logger.prototype.loadState = function(force) {
    try {
        if (force) {
            console.log("Force to replace console");
            this.replaceConsole();
        }
        if (nw.App.manifest.localConfig.logToFile) {
            this.replaceConsole();
        }
        if (this.getConfig("replaceConsole")) {
            this.replaceConsole();
        }
        if (this.getConfig("truncate")) {
            this.truncate();
        }
    } catch (e) {
        // do nothing
    }

}

module.exports = Logger;