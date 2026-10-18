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
window.fs = window.fs||require('fs');


// class Autoload extends (require('www/js/BasicEventHandler.js')) {
// 	constructor() {
// 		super();
// 		this.init.apply(this, arguments);

// 	}
// }
// // var Autoload = function() {
// // 	this.init.apply(this, arguments);
// // }

// Autoload.prototype.init = function() {
// 	this.isInitialized = false;
	
// 	this.isInitialized = true;
// 	this.onReady.apply(this, arguments);
	
// }

// Autoload.prototype.onScriptsLoaded = function(act) {
// 	if (typeof act !== 'function') return console.log("parameter must be a function");
// 	this.__onScriptsLoadedPool = this.__onScriptsLoadedPool||[];
	
// 	if (Boolean(this.scriptsLoaded) == false) {
// 		this.__onScriptsLoadedPool.push(act)
// 	} else {
// 		for (var i=0; i<this.__onScriptsLoadedPool.length; i++) {
// 			this.__onScriptsLoadedPool[i].apply(this, arguments);
// 		}
		
// 		act.apply(this, arguments);
// 	}	
// }

// Autoload.prototype.onReady = Autoload.prototype.onScriptsLoaded;


// Autoload.prototype.load = async function(options) {
// 	const nwPath = require("path");
// 	const self = this;
// 	options = options||{}
// 	options.onScriptsLoaded = options.onScriptsLoaded||function(){};
	
// 	var pluginPath = __dirname+"\\"+consts.rootPath+consts.pathToPlugins;
// 	var pathToPlugins= consts.pathToPlugins.replace("\\", "/");
	
// 	//var dirContent = getDirectoryContent(pluginPath);
// 	var items = await common.readDir(pluginPath);
// 	//console.log("Plugin path content : ", dirContent);
// 	//var items = dirContent.files;
	
// 	this.__loaded = {};
// 	this.__scriptCount = 0;
// 	this.__loadedCount = 0;
// 	for (var i=0; i<items.length; i++) {
// 		items[i] = items[i].substring(pluginPath.length);
// 		items[i] = items[i].replace(/\\/g,"/");
// 		let ext = getFileExtension(items[i]);
// 		if (ext.toLowerCase() != "js") continue;
		
// 		this.__loaded[items[i]] = true;
// 		this.__scriptCount++;
		
// 		var thisAutoload = this;
// 		var script = document.createElement('script');
// 		script.setAttribute("type", "text/javascript");
// 		script.setAttribute("id", "autoload_"+items[i]);
// 		script.onload = function(e) {
// 			var thisId =$(e.currentTarget).data("id");
// 			thisAutoload.__loaded[thisId] = true;
// 			thisAutoload.__loadedCount += 1;
// 			if (thisAutoload.__loadedCount >= thisAutoload.__scriptCount && thisAutoload.__allFileIsAdded == true) {

// 				thisAutoload.scriptsLoaded = true;
// 				thisAutoload.onScriptsLoaded.call(thisAutoload, options.onScriptsLoaded);
// 			}
// 			this.resolveState("")
// 		}
// 		script.setAttribute("src", pathToPlugins+items[i]);
// 		$(script).data("id", items[i])
// 		var head = document.querySelector("head"); 
// 		head.appendChild(script);
// 		//var htmlScript = $('<script type="text/javascript" id="autoload_'+items[i]+'" src="'+pathToPlugins+items[i]+'"></script>');
// 		//$("head").append(htmlScript);

// 		console.log(items[i]+" loaded!");
// 	}	
	
// 	this.__allFileIsAdded = true;

// 	this.isComplete = true;	
// 	//this.onScriptsLoaded.apply(this, arguments);
	
// }

class Autoload extends (require('www/js/BasicEventHandler.js')) {
    constructor(consts) {
		super();
        this.consts = consts;
        this.pluginPath = `${this.consts.rootPath}${this.consts.pathToPlugins}`;
        this.scriptsToLoad = [];
    }

    async loadScripts() {
        try {
            const files = await common.readDir(this.pluginPath);
            const scriptPromises = files
                .filter(file => file.endsWith('.js'))
                .map(file => this.loadScript(file));
            this.scriptsToLoad = scriptPromises;

            await Promise.all(scriptPromises);
            this.onScriptsLoaded();
        } catch (error) {
            console.error('Error loading scripts:', error);
        }
    }

    async loadScript(file) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const filePath = "/"+file.replaceAll('\\', '/');
			const relativePath = common.getRelativePath(filePath, this.consts.pathToPlugins);
            script.src = filePath;
            script.setAttribute('data-id', `autoload_${relativePath}`);
            script.onload = () => {
                this.onScriptLoaded(file);
                resolve(file);
            };
            script.onerror = () => {
                console.error(`Failed to load script: ${filePath}`);
                reject(new Error(`Failed to load script: ${filePath}`));
            };
            document.head.appendChild(script);
        });
    }

    onScriptLoaded(scriptName) {
        // To be filled by user
    }

    onScriptsLoaded() {
        // To be filled by user
		this.resolveState("completed");
    }
}

// Example usage:
// const consts = { rootPath: '/path/to/root/', pathToPlugins: 'plugins/' };
// const autoload = new Autoload(consts);
// autoload.loadScripts();



var autoload = new Autoload(consts);

$(document).ready(function() {
	autoload.loadScripts();
});