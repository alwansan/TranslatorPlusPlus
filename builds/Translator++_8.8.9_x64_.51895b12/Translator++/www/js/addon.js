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
/**
 * @file Manages the addons
 * @author Dreamsavior 
 * 
 */

//"use strict"
window.fs = window.fs||require('graceful-fs');
/**
 * @class
 * @param  {string} path
 * @param  {} options
 * @classdesc Add-on for Translator++
 * Addon is an additional script that is modular, can be added and removed as needed.
 * Every folder in `www/addons` will automatically be loaded as a Translator++ addon.
 * The `this` keyword in the top-level scope of javascript that is loaded as an addon will refer to the instance of this class.
 */
class Addon extends require("www/js/BasicEventHandler.js") {
	constructor(path, options) {
		super()
		this.path 	= path;
		this.id 	= nwPath.basename(this.path);
		var pluginPath = nw.App.manifest.localConfig.addons;
		pluginPath = pluginPath.replace(/\\/g, "/");
		
		this.fullPath = pluginPath+"/"+this.path	
		this.options = options || {};
		this.options.onload = this.options.onload || (() => {});
		this.files = {};
		this.package = {};
		this.param = {};
		this.config = {
			isDisabled : false,
			isMandatory : false
		};
		this.isReady = false;
		this.html;
	
	}
}

Addon.extractProtocol = function(url) {
    // Use a regular expression to match the protocol
    const match = url.match(/^(\w+:\/\/)/);

    // If a match is found, return the matched protocol, otherwise return an empty string
    return match ? match[1] : '';
}

Addon.parseQueryString = function(url) {
    // Use URLSearchParams to parse the query string
    const queryParams = new URLSearchParams(url.split('?')[1]);

    // Convert URLSearchParams to an object
    const paramsObject = {};
    for (const [key, value] of queryParams) {
        paramsObject[key] = value;
    }

    return paramsObject;
}

/**
 * Detect whether pathName contains "ao://"
 * @param  {} pathName
 */
Addon.isExternalScript = function(pathName) {
	if (["ao://"].includes(this.extractProtocol(pathName))) return true;
	return false;
}

Addon.isNetworkScript = function(pathName) {
	if (["https://", "http://"].includes(this.extractProtocol(pathName))) return true;
	return false;
}

Addon.getHomepageBase = function() {
	var homepage = (nw && nw.App && nw.App.manifest && nw.App.manifest.homepage) ? nw.App.manifest.homepage : "";
	if (typeof homepage !== "string" || !homepage.trim()) homepage = "https://dreamsavior.net";
	return homepage.replace(/\/+$/, "");
}

Addon.isRestApiPath = function(pathName) {
	if (typeof pathName !== "string") return false;
	return pathName.startsWith("/rest/");
}

Addon.getLocalLocationExtScript = function(pathName) {
	if (!pathName) return "";
	// Use a regular expression to match the path part of the input
	const match = pathName.match(/:\/\/(.+)/);

	// If a match is found, return the matched path, otherwise return an empty string
	return match ? match[1] : pathName;
}

Addon.prototype.setConfig = function(key, value) {
	if (typeof key == "string") {
		this.config[key] = value;
	} else if (typeof key == "object" && arguments.length == 1) {
		for (var i in key) {
			this.config[i] = key[i];
		}
	}
	sys.saveConfig()
	return this.config;
}

Addon.prototype.getConfig = function(key) {
	if (typeof this.config[key] !== "undefined") return this.config[key];
	
	// otherwise get from the default JSONForm options
	if (typeof this.optionsForm?.schema?.[key]?.default !== "undefined") return this.optionsForm.schema[key].default;
	
	// get from the default value of modified JSONForm
	if (typeof this.optionsForm?.[key]?.HOOK !== "undefined") {
		try {
			return eval(this.optionsForm[key].HOOK);
		} catch (e) {
			return undefined;
		}
	}
	
	if (typeof this.optionsForm?.[key]?.default !== "undefined") return this.optionsForm[key].default;

	return undefined;
}

// Addon.prototype.setOption = Addon.prototype.setConfig;
// Addon.prototype.getOption = Addon.prototype.getConfig;
// Addon.prototype.setOptions = function(options={}) {
// 	for (var key in options) {
// 		this.setConfig(key, options[key]);
// 	}
// 	return this.config;
// }

/**
 * Resolve the relative path from the root of a local path relative to addon
 * Translates the trailing slash to the root path of the addon
 * @param {String} path 
 * @returns {String} - Path to the addon
 */
Addon.prototype.resolvePath = function(path="") {
	path = path.replaceAll("\\", "/");
	if (path[0] == "/") return (nwPath.join(this.getPathRelativeToRoot(), path)).replaceAll("\\", "/");
	return path; 
}

Addon.prototype.getLocation = function() {
	// get location of the engine
	return nwPath.normalize(nwPath.join(__dirname, this.fullPath));
}

Addon.prototype.getWebLocation = function() {
	// get location of the engine
	return this.fullPath.substring(nwPath.dirname(location.pathname).length);
}

Addon.prototype.createElement = function() {
	if (Boolean(document.getElementById('addons')) == false) {
		//console.log("Creating addon element!");
		var wraper = document.createElement("div");
		wraper.setAttribute("id", "addons")
		wraper.setAttribute("class", "addon hidden")
		wraper.setAttribute("style", "display:none")
		document.body.appendChild(wraper);
	}
	
	var addOnId = "_addon_"+this.path;
	
	// remove existing element;
	var existing = document.getElementById(addOnId)
	if (existing) existing.remove();
	
	this.html = document.createElement('div');
	this.html.setAttribute("class", "addon "+this.path);
	this.html.setAttribute("name", this.path);
	this.html.setAttribute("id", addOnId);
	document.getElementById('addons').appendChild(this.html);
		
	return this.html;
}

Addon.prototype.loadPackage = async function() {
	//var json = fs.readFileSync(this.fullPath+"/package.json");
	var json = await common.fileGetContents(this.fullPath+"/package.json");
	try {
		this.package = JSON.parse(json);
	} catch (e) {
		console.warn("Error when loading package.json", this.fullPath+"/package.json", json);
	}
	this.package.config = this.package.config || {};
	Object.assign(this.config, this.package.config);
	return this.package;
}

Addon.prototype.attachScript = function(scriptPath) {
	// attach script directly to the head section of html
	console.log("attaching script : ", scriptPath);
	var relPath = scriptPath.split("/");
	relPath.shift();
	relPath = relPath.join("/");	
	console.log("relPath", relPath);	
	
	var script = document.createElement('script');
	script.setAttribute("type", "text/javascript");
	script.setAttribute("id", "_addon_script_"+this.path);
	script.onload = function(e) {

	}
	script.setAttribute("src", relPath);

	this.html.appendChild(script);

}

Addon.prototype.loadJS = async function(path, parentObj) {
	if (this.package.name == "translationProxy") console.log("%ctranslationProxy load JS", "color:yellow;", path);
	Addon.userscripts = Addon.userscripts||require('userscript-meta');

	return new Promise(async (resolve, reject) => {
		if (Addon.isExternalScript(path)) {
			console.log("loading external script", path);
			if (Boolean(localStorage[path]) == false) {
				var localPath = Addon.getLocalLocationExtScript(path);
				if (await common.isFileAsync(nwPath.join(__dirname,localPath))) {
					var data = await common.fileGetContents(nwPath.join(__dirname,localPath));
					console.log("%cAttaching", "color:orange;", localPath);
					try {
						eval(data.toString());
					} catch(e) {
						console.warn(e);
					}
				} else {
					if (common.debugLevel() > 1) console.warn("File not found:", path);
				}

			} else {
				try {
					let thisScript = localStorage.getItem(path);
					let thisMeta = common.extractString(thisScript, "==UserScript==", "==/UserScript==");
					//console.log("meta: ",thisMeta);
					this.identity = Addon.userscripts.parse(thisMeta);
					
					eval(thisScript);
				} catch(e) {
					console.warn(e);
				}
			}
			
			resolve(this);
			return;
		}

		var thisScript = "";
		if (Addon.isNetworkScript(path)) {
			try {
				if (common.debugLevel()) console.log("%cNetwork script detected", "color:red", path);
				console.log("Network script requires autoloader to be completed");
				await autoload.until("completed");
				let queryStr = Addon.parseQueryString(path);
				if (queryStr?.l) {
					let thisFilepath = this.resolvePath(queryStr?.l);
					if (await common.isFileAsync(thisFilepath)) {
						if (common.debugLevel()) console.log("%cNetwork script-load local", "color:red", thisFilepath);
						thisScript = await common.fileGetContents(thisFilepath);
					}
				}

				if (!thisScript) {
					const basicUtils = addonLoader.getAddon("basicUtils");
					if (basicUtils?.safeLoad) {
						thisScript = await basicUtils.safeLoad(path);
					}

					if (!thisScript) {
						var res = await fetch(path, {
							method:"POST", headers:{"Content-Type": "application/json"}, body:JSON.stringify(updater.getUser())
						});
						thisScript = await res.text();
						// if status code is 200, store to localStorage
						if (res.status == 200) {
							await basicUtils.safeStore(path, thisScript);
						}
						if (common.debugLevel()) console.log("%cresult of network script", "color:red", thisScript);
					}
				}

			} catch (e) {
				if (common.debugLevel()) console.error("Failed to fecth script", path)
			}

		} else {
			thisScript = await common.fileGetContents(path);
			thisScript = thisScript.toString();
		}
		var thisMeta = common.extractString(thisScript, "==UserScript==", "==/UserScript==");
		this.identity = Addon.userscripts.parse(thisMeta);

		try {
			let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
			var thisExecution = new AsyncFunction(thisScript);
			//var thisExecution = new Function(thisScript);
			thisExecution.call(this, this.param);
			if (this.package.name == "unityTrans") console.log("unityTrans loaded JS", path);

			resolve(this);
		} catch (e) {
			console.warn("Error when executing script : "+this.path, e)
			this.attachScript(path);
			reject("Error when executing script : "+this.path);
		}

	});
}

/**
 * Get relative path of the addon 
 * @returns {string} - back slashes based add-on's path relative to Translator++ installation. No trailing slash.
 */
Addon.prototype.getPathRelativeToRoot = function(file="") {
	return nwPath.join(nw.App.manifest.localConfig.addons, this.path, file);
}

/**
 * Get relative path of the addon 
 * @returns {string} - forward slashes based add-on's path relative to Translator++ installation. No trailing slash.
 */
Addon.prototype.getRelativePath = function(file="") {
	return (nwPath.join(nw.App.manifest.localConfig.addons, this.path, file)).replaceAll("\\", "/")
}

Addon.prototype.getRootDocPath = function(path) {
	path = path || "";
	path = path.replaceAll("\\", "/");
	var thisPath = path.split("/");
	thisPath.shift();
	return thisPath.join("/");
}

Addon.prototype.loadCss = async function(path, parentObj) {
	//console.log("addon init arguments : ", arguments);
	//if (this.package.name == "unityTrans") console.log("unityTrans load CSS", path, this.getRootDocPath(path));

	parentObj = parentObj || {}
	return new Promise ((resolve, reject) => {
		var script = document.createElement('link');
		script.setAttribute("rel", "stylesheet");
		script.setAttribute("type", "text/css");
		script.setAttribute("data-path", path);
		script.onload = (e) => {
			//if (this.package.name == "unityTrans") console.log("unityTrans load CSS completed");
			parentObj.elm = script;
			resolve(script)
		}
		script.setAttribute("href",this.getRootDocPath(path));
		this.html.appendChild(script);
	});

}

Addon.prototype.loadHTML = async function(path, parentObj) {
	//if (this.package.name == "unityTrans") console.log("unityTrans load HTML");
	parentObj = parentObj ||{};
	return new Promise ((resolve, reject) => {
		var htmlString =  fs.readFileSync(path).toString();
		var div = document.createElement('div');
		div.setAttribute("data-path", path);
		div.innerHTML = htmlString.trim();
		this.html.appendChild(div);
		parentObj.elm = div
		//if (this.package.name == "unityTrans") console.log("unityTrans load HTML completed");
		resolve(div); 	
	});
}

Addon.prototype.loadBin = async function(path, parentObj) {
	// adapt path based on the version of nwjs
	const dirName = nwPath.dirname(path);
	const fileName = nwPath.basename(path);
	const src1 = common.changeExtension(path, "js");
	if (await common.isFileAsync(src1)) {
		// load from source instead
		console.log("Loading from source", src1);
		this.loadJS(src1, parentObj);
		return;
	}

	// load the same file from parent's directory src
	const src2 = nwPath.join(nwPath.dirname(dirName), "src", common.changeExtension(fileName, "js"));
	if (await common.isFileAsync(src2)) {
		console.log("Loading from source", src2);
		this.loadJS(src2, parentObj);
		return;
	}

	const pattern1 = nwPath.join(dirName, `[${nw.process.versions.nw}-win-${nw.process.arch}]fileName`);
	const pattern2 = nwPath.join(dirName, `${nw.process.versions.nw}-win-${nw.process.arch}`, fileName);

	try {
		if (await common.isFileAsync(pattern1)) {
			await nw.Window.get().evalNWBin(null, pattern1);
		} else if (await common.isFileAsync(pattern2)) {
			await nw.Window.get().evalNWBin(null, pattern2);
		} else {
			// run as is. Would crash if the file is not matching the version of nwjs
			console.log("Loading bin as is", path);
			await nw.Window.get().evalNWBin(null, path);
		}
	} catch (e) {
		console.error("Error when loading bin file", path, e);
	}
}

Addon.prototype.loadBackgroundPage = async function(path, parentObj) {
	if ($(this.html).find(`[data-bgpage="${path}"]`).length) return $(this.html).find(`[data-bgpage="${path}"]`)[0];
	return new Promise ((resolve, reject) => {
		var script = document.createElement('iframe');
		script.onload = (e) => {
			resolve(script)
		}
		script.setAttribute("src", path);
		script.setAttribute("data-bgpage", path);
		this.html.appendChild(script);
	});
}

Addon.prototype.unloadBackgroundPage = async function(path, parentObj) {
	$(this.html).find(`[data-bgpage="${path}"]`).remove();
}

Addon.prototype.onReady = function(fn) {
	if (typeof fn !== 'function') fn = function() {};
	this.__onScriptsLoadedPool = this.__onScriptsLoadedPool||[];
	
	if (Boolean(this.isReady) == false) {
		this.__onScriptsLoadedPool.push(fn)
	} else {
		for (var i=0; i<this.__onScriptsLoadedPool.length; i++) {
			this.__onScriptsLoadedPool[i].apply(this, arguments);
		}
		
		fn.apply(this, arguments);
	}		
}

Addon.prototype.getFile = function(file) {
	if (!file) return console.warn("No file specified");
	file = file.replace("/", "\\");
	if (file[0]!=="\\") file = "\\"+file;
	return this.files[file];
}

/**
 * Register addon's node modules to the global scope global
 * @since 5.8.13
 */
Addon.prototype.globalizeNodeModules = function() {
	const thisPath = this.getPathRelativeToRoot();
	moduleAlias.addPath(thisPath+'/node_modules');
	moduleAlias(thisPath+'/package.json');
}

/**
 * Load node modules that installed locally
 * @param {string} moduleName - Name of the installed module
 * @since 5.8.13
 */
Addon.prototype.require = function(moduleName) {
	if (!moduleName) return;
	const thisPath = this.getPathRelativeToRoot();
	let newPath = {}
	const localPath = '@'+this.id;
	newPath[localPath] = thisPath + "/node_modules"
	moduleAlias.addAliases(newPath)
	
	return require(`${localPath}/${moduleName}`);
}

Addon.prototype.init = async function() {
	return new Promise(async (resolve, reject)=> {
		this.createElement();
		await this.loadPackage();

		var finish = () => {
			this.isReady = true;
			this.options.onload.apply(this);
			this.onReady();
			//$(document).trigger("addonLoaded", this);
			AddonLoader.loadState[this.package.name] = true;
			AddonLoader.countLoaded++;
			//console.log("%cLoading package - done: ","color:blue",AddonLoader.countLoaded, this.package.name);
			resolve(this);

			/**
			 * Addon is loaded and ready
			 * @event Addon#onLoaded 
			 * @type {BasicEventHandler#Event}
			 * @deprecated Deprecated since 4.12.1. Use `loaded` instead
			 */
			this.trigger("onLoaded", this);			
			/**
			 * Addon is loaded and ready
			 * @event Addon#loaded 
			 * @type {BasicEventHandler#Event|BasicEventHandler#State}
			 */

			this.trigger("loaded", this);
			this.resolveState("loaded", this);
			return this;
		}
		
		sys.config.addons 			= sys.config.addons || {};
		sys.config.addons.package 	= sys.config.addons.package || {};
		sys.config.addons.package[this.package.name] = sys.config.addons.package[this.package.name] || this.config || {}
		this.config = sys.config.addons.package[this.package.name];
		if (this.config.isDisabled == true) {
			return finish();
		}
		if (this.package.disabled == true) {
			return finish();
		}
		
		//Addon.userscripts = Addon.userscripts||require('userscript-meta');
		AddonLoader.loadState[this.package.name] = false;
		AddonLoader.countLoad++;
		//console.log("%cLoading package : ","color:blue", AddonLoader.countLoad, this.package.name);
		var dirContent = [];
		if (this.package.autoload) {
			//console.log("Autoloading content");
			// todo : async this
			dirContent = await common.readDir(this.fullPath);
		}
		
		if (Array.isArray(this.package.load)) {
			// convert to the path relative to root
			var loaded = [];
			for (var i=0; i<this.package.load.length; i++) {
				if (Addon.isRestApiPath(this.package.load[i])) {
					loaded.push(Addon.getHomepageBase() + this.package.load[i]);
					continue;
				}
				// detect if resource is not local
				if (Addon.isExternalScript(this.package.load[i]) || Addon.isNetworkScript(this.package.load[i])) {
					//console.log("adding external resource:", this.package.load[i]);
					loaded.push(this.package.load[i]);
					continue;
				} 
				loaded.push(nwPath.join(this.getPathRelativeToRoot(), this.package.load[i]));
			}
			// merge with package.load
			dirContent = dirContent.concat(loaded);
		}
		
		var promises = [];
		for (let i=0; i<dirContent.length; i++) {
			var thisPath = dirContent[i];
			var thisData = {}
			var relPath = thisPath.substr(this.fullPath.length)
			thisData.path 	= thisPath
			thisData.ext 	= common.getFileExtension(thisPath).toLowerCase();
			
			if (nwPath.basename(thisPath)[0] == "!") {
				// skip including if the first character of filename is "!"
				this.files[relPath] = thisData;
				continue;
			}

			if (thisData.ext == "js") {
				promises.push(this.loadJS(thisPath, thisData))
			} else if (thisData.ext == "htm" || thisData.ext == "html") {
				promises.push(this.loadHTML(thisPath, thisData))
			} else if (thisData.ext == "css") {
				promises.push(this.loadCss(thisPath, thisData))
			} else if (thisData.ext.endsWith("bin")) {
				promises.push(this.loadBin(thisPath, thisData))
			}
			
			this.files[relPath] = thisData;
		}

		await Promise.all(promises)
		return finish();
	})
}


/**
 * Handle addons
 * @class
 */
class AddonLoader extends require("www/js/BasicEventHandler.js") {
	constructor($elm) {
		super($elm)
		this.init.apply(this, arguments);
		this.completePromise = new Promise((resolve, reject) => {
			this.completeResolver = resolve;
		}) 
	}
}

AddonLoader.countLoad = 0;
AddonLoader.countLoaded = 0;
AddonLoader.loadState = {};

AddonLoader.prototype.init = function() {
	this.isInitialized = false;
	this.isInitialized = true;
	this.onReady.apply(this, arguments);
	this.addons = {};
	this.scriptsLoaded = false;
	this._promiseFor = {}
}


/**
 * Wait until certain addon is loaded
 * @async
 * @param {String} path - Folder name of the addon
 * @returns {Promise<Addon>}
 */
AddonLoader.prototype.waitFor = async function(path) {
	var holdUp = async ()=> {
		if (this._promiseFor[path]) return this._promiseFor[path];
		this._promiseFor[path] = this._promiseFor[path]||{}
		return new Promise((resolve, reject) => {
			this._promiseFor[path].resolve = resolve;
			this._promiseFor[path].reject = reject;
		})
	}

	try {
		if (this.addons[path].isReady) {
			return this.addons[path];
		} else {
			return holdUp();
		}
	} catch (e) {
		return holdUp();
	}
}

AddonLoader.prototype.untilCompleted = async function() {
	return this.completePromise;
}

AddonLoader.prototype.onScriptsLoaded = function(act) {
	if (typeof act !== 'function') return console.log("parameter must be a function", act);
	this.__onScriptsLoadedPool = this.__onScriptsLoadedPool||[];
	
	if (Boolean(this.scriptsLoaded) == false) {
		this.__onScriptsLoadedPool.push(act)
	} else {
		for (var i=0; i<this.__onScriptsLoadedPool.length; i++) {
			this.__onScriptsLoadedPool[i].apply(this, arguments);
		}
		
		act.apply(this, arguments);
	}
}

/**
 * Get instance of addon by directory name
 * @param {String|Addon} dirName - Directory of the addon
 * @returns {Addon|undefined}
 */
AddonLoader.prototype.getAddon = function(dirName) {
	if (!dirName) return console.warn("addon is not specified")
	if (typeof dirName == "string") {
		if (this.addons[dirName]) return this.addons[dirName];
	} else {
		if (dirName?.constructor?.name == "Addon") return dirName
	}
}

/**
 * Get addon by the name on package.json
 * This function is case insensitive
 * @param {String} name - Addon's name 
 * @returns {Addon|undefined} - Addon object
 * @since 5.8.17
 */
AddonLoader.prototype.getAddonByName = function(name="") {
	if (!name || typeof name !== "string") return;
	this._nameIndex ||= {};
	name = name.toLowerCase();
	if (this._nameIndex[name.toLowerCase()]) {
		return this.addons[this._nameIndex[name.toLowerCase()]];
	}
	for (let id in this.addons) {
		let nameLowercase = (this.addons?.package?.name||"").toLowerCase()
		if (!nameLowercase) continue;
		this._nameIndex[nameLowercase] = id;
		if (nameLowercase == name.toLowerCase()) return this.addons[id];
	}
}

/**
 * Check if an addon is active or not
 * @param {String|Addon} addon 
 * @returns {Boolean} - True if addon is exist and active
 * @since 5.8.17
 */
AddonLoader.prototype.isActive = function(addon) {
	if (!addon) return console.warn("ID not specified");
	addon = this.getAddon(addon);
	if (!addon.getConfig("isDisabled")) return true;
	return false;
}

AddonLoader.prototype.onReady = AddonLoader.prototype.onScriptsLoaded;



AddonLoader.prototype.openManagerWindow = function (param) {
	param = param||"";
	nw.Window.open('www/addons.html#'+param,{'frame':false, 'transparent':true}, 
		function(thisWin) {
			ui.windows['addonLoader'] = thisWin.window;
		}
	);
}

AddonLoader.prototype.load = async function(dir) {
	console.log("Loading addon ", dir);
	if (this.addons[dir]) return; // already loaded;

	var addonPath = nw.App.manifest.localConfig.addons;
	addonPath = addonPath.replace(/\\/g, "/");

	if (await common.isDirectory(addonPath+"/"+dir) == false) return;
	if (await common.isFileAsync(addonPath+"/"+dir+"/package.json") == false) return;
	
	console.log("Loading addon ", addonPath+"/"+dir);
	this.length++;
	this.addons[dir] = new Addon(dir);
	await this.addons[dir].init();
	this.addons[dir].trigger("load");
	this.resolveState("addonLoaded:"+dir);
	if (this._promiseFor[dir]) {
		if (typeof this._promiseFor[dir].resolve == "function") this._promiseFor[dir].resolve(this.addons[dir]);
		delete this._promiseFor[dir];
	}
}

AddonLoader.prototype.loadAll = async function(options) {
	console.log("Load all addons with arguments", options);
	options = options||{}
	options.onScriptsLoaded = options.onScriptsLoaded||function(){};
	options.select ||= []; // load only selected directory

	var addonPath = nw.App.manifest.localConfig.addons;
	addonPath = addonPath.replace(/\\/g, "/");
	

	this.length 	= 0;
	var promises 	= [];

	if (options.select.length > 0) {
		// load selected
		console.log("Load selected addon", options.select);
		for (let i=0; i<options.select.length; i++) {
			if (!await common.isDirectory(nwPath.join(addonPath, options.select[i]))) continue;
			promises.push(this.load(options.select[i]));
		}
	} else {
		// load all
		const dirContent = await fs.promises.readdir(addonPath);
		// load priority addons first
		const priorityStack = [];
		const nonPriorityStack = [];
		for (let i=0; i<dirContent.length; i++) {
			if (!await common.isDirectory(nwPath.join(addonPath, dirContent[i]))) continue;
			if (await common.isFileAsync(nwPath.join(addonPath, dirContent[i], ".priority"))) {
				priorityStack.push(this.load(dirContent[i]));
			} else {
				nonPriorityStack.push(dirContent[i]);
			}
		}
		
		await Promise.all(priorityStack);
		for (let i=0; i<nonPriorityStack.length; i++) {
			promises.push(this.load(nonPriorityStack[i]));
		}

		// for (let i=0; i<dirContent.length; i++) {
		// 	if (!await common.isDirectory(nwPath.join(addonPath, dirContent[i]))) continue;
		// 	promises.push(this.load(dirContent[i]));
		// }
	}


	await Promise.all(promises);
	console.log("%cRunning addonLoader.onReady", "color:aqua");
	this.scriptsLoaded = true;
	this.onReady(function(){});
	this.trigger("loaded");
	if (this.completeResolver) this.completeResolver();
	this.__allFileIsAdded = true;
	this.isComplete = true;
	if (this._promiseFor) {
		for (var i in this._promiseFor) {
			if (this._promiseFor[i]) this._promiseFor[i].reject(new Error(`Can not resolve addon ${i}. The addon loader is complete but this addon is still not resolved. Maybe the addon doesn't exist.`));
		}
	}
}

AddonLoader.prototype.getByName = function(name) {
	try {
		for (var i in this.addons) {
			if (this.addons[i].package.name == name) return this.addons[i]
		}
	} catch (e) {
		// do nothing
	}
}

AddonLoader.prototype.install = function(targetPath, callback) {
	callback = callback || function(){};
	var _7z = _7z||require('7zip-min');
	if (Array.isArray(targetPath) == false) targetPath = [targetPath]
	
	var promises = [];
	for (var i=0; i<targetPath.length; i++) {
		promises.push(new Promise((resolve, reject) => {
			_7z.cmd(['x', '-tzip', targetPath[i], '-o'+nw.App.manifest.localConfig.addons], (err) => {
				if (err) console.warn(err);
				console.log("installation done : ", targetPath[i]);
				resolve();
			});
		}))		
	}
	
	return new Promise((resolve, reject) => {
		Promise.all(promises)
		.then(()=> {
				console.log("all addons are installed");
				callback()
				resolve()
		})
	})
	
}

AddonLoader.prototype.uninstall = async function(pkg) {
	console.log("uninstall", pkg);
	
	if (Boolean(pkg) == false) return;
	if (Boolean(pkg.path) == false) return;
	if (pkg.path == "." || pkg.path == "/" || pkg.path == "./" || pkg.path == "\\") return;

	try {
		await common.rmdir(nwPath.join(__dirname, "www/addons", pkg.path));
		delete this.addons[pkg.path];
	} catch (e) {
		// do nothing
	}
}


/**
 * AddonIstaller
 * Handle addon installation
 * @param  {} location
 * @param  {} type
 */
var AddonInstaller = function(location, type) {
	this.location 	= location;
	this.type 		= type || "";
	if (!(this.type)) {
		if (typeof this.location == "number") {
			this.type = "store";
		} else if (this.location.substr(0, 8) == "https://") {
			this.type = "remote";
		} else if (this.location.substr(0, 7) == "http://") {
			this.type = "remote";
		}
		this.type = this.type || "local";
	}

}	

AddonInstaller.localConfig = {};
if (common.isJSON(localStorage.getItem("AddonInstaller"))) {
	AddonInstaller.localConfig = JSON.parse(localStorage.getItem("AddonInstaller"));
}

AddonInstaller.setConfig = function(key, value) {
	this.localConfig = this.localConfig || {};
	this.localConfig[key] = value;
	localStorage.setItem("AddonInstaller", JSON.stringify(this.localConfig));
	return this.localConfig;
}

AddonInstaller.getConfig = function(key) {
	this.localConfig = this.localConfig || {};
	if (common.isJSON(localStorage.getItem("AddonInstaller"))) {
		this.localConfig = JSON.parse(localStorage.getItem("AddonInstaller"));
	}	
	this.localConfig = this.localConfig || {};
	return this.localConfig[key];
}


/**
 * Write newly installed addon to configuration
 * unused
 */
AddonInstaller.configInstall = async function(addonName, options) {
	if (!addonName) return console.warn("Addon's name can not be blank!");
	var installedList = this.getConfig("installed") || {};
	options = options || {};
	installedList[addonName] = options;
	installedList[addonName].date = Date();

	this.setConfig("installed", installedList);
}


/**
 * Uninstall addon from configuration
 * unused
 */
 AddonInstaller.configUninstall = async function(addonName) {
	if (!addonName) return console.warn("Addon's name can not be blank!");
	var installedList = this.getConfig("installed") || {};
	if (!installedList[addonName]) return; 
	delete installedList[addonName];
	this.setConfig("installed", installedList);
}

AddonInstaller.isInstalled = function(addonName) {
	if (!addonName) return console.warn("Addon's name can not be blank!");
	var installedList = this.getConfig("installed") || {};
	if (typeof addonName == "string" ) {
		return Boolean(addonLoader[addonName])
	}


	if (installedList[addonName]) return true;
	return false; 
}
/**
 * Get directory name relative to www/addons/
 * @param  {} addonName
 */
AddonInstaller.getRootAddonDir = function(addonName) {
	if (!addonName) return console.warn("Addon's name can not be blank!");
	var thisConfig = this.getConfig("installed");
	if (!thisConfig[addonName]) return;
	if (!thisConfig[addonName].content) return;

	thisConfig[addonName].content.dirs = thisConfig[addonName].content.dirs || [];
	for (var i in thisConfig[addonName].content.dirs) {
		var thisPath = thisConfig[addonName].content.dirs[i];
		if (thisPath.substring(0, 11) !== 'www\\addons\\') continue;

		var thisRelPath = thisPath.substring(11);

		if (/\\/g.test(thisRelPath) == false) return thisRelPath;
	}
}

AddonInstaller.prototype.install = async function(target, options) {
	target = target || __dirname;
	options= options || {};
	options.onError = options.onError || async function(){};
	options.onSuccess = options.onSuccess || async function(){};
	var action = "";
	var url = "";
	var saveto = "";
	var packageLocation = "";
	var currentObj = "";

	if (this.type == "store") {
		// get url from addon id
		//await common.download(url, saveto, options);
		var homepage = (nw && nw.App && nw.App.manifest && nw.App.manifest.homepage) ? nw.App.manifest.homepage : "";
		if (typeof homepage !== "string" || !homepage.trim()) homepage = "https://dreamsavior.net";
		homepage = homepage.replace(/\/+$/, "");
		url = `${homepage}/rest/addons/get/?id=${this.location}&ver=${nw.App.manifest.version}`;
		var addonObj =  await common.fetch(url);
		console.log(addonObj);
		if (typeof addonObj !== 'object') {
			console.warn("invalid type addonObj");
			options.onError.call(this, t("invalid type addonObj"), addonObj);
			return;
		}
		if (Array.isArray(addonObj.addons) == false) {
			console.warn("invalid type addonObj.addons");
			options.onError.call(this, t("invalid type addonObj.addons"), addonObj);
			return;
		}
		if (addonObj.addons.length < 1) {
			console.warn("You are not eligible to get this addon");
			options.onError.call(this, t("You are not eligible to get this addon"), addonObj);
			return;
		}
		currentObj = addonObj.addons[0];
		
		url = currentObj.url;
		//console.log(url);
		if (Boolean(url) == false) return;
		
		// do remote processing now
		action = "remote";
	}

	// running on before install
	try {
		if (typeof currentObj == "object") {
			if (currentObj.onBeforeInstall) {
				//eval(currentObj.onBeforeInstall);
				let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
				let thisFunc = new AsyncFunction(currentObj.onBeforeInstall);
				await thisFunc();
			}
		}
	} catch (e) {
		console.warn("Error on trying to run onBeforeInstall script");
	}

	
	if (this.type == "remote" || action == "remote") {
		console.log("fetching remote location");
		url = url || this.location;
		saveto = nwPath.join(nw.process.env.TMP, "addon_"+common.rand(1, 1000000));
		packageLocation = await common.download(url, saveto);
		console.log("saved to", saveto);
		
		// do local processing now
		action = "local";		
	}
	
	if (this.type == "local" || action == "local") {
		packageLocation = packageLocation || this.location;
		console.log("extracting to : ", target);
		await common.extract(packageLocation, target);
	}
	
	// running on after install
	try {
		if (typeof currentObj == "object") {
			if (currentObj.onAfterInstall) {
				console.log("Running post installation script");
				//eval(currentObj.onAfterInstall);
				let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
				let thisFunc = new AsyncFunction(currentObj.onAfterInstall);
				await thisFunc();
			}
		}
	} catch (e) {
		console.warn("Error on trying to run onAfterInstall script");
	}
	console.log("All process done");
	AddonInstaller.configInstall(this.location, {
		content: await common.listArchiveContent(packageLocation)
	});

	await options.onSuccess.call(this);
	return true;
}



/**
 * @global
 */
var addonLoader = new AddonLoader();
window.AddonInstaller = AddonInstaller;

// a class can not be accessed from child page
window.classAddon = Addon

$(document).ready(function() {
	var getLoadedAddonFromURL = function() {
		// load list addon from URL if any
		// If URL has get parameters addons, then Translator++ will load only that addons.
		var searchparam = new URLSearchParams(window.location.search);
		var selectedAddon = searchparam.get("addons");
		if (!selectedAddon) return;
		
		return selectedAddon.split(",");
	}
	
	sys.onReady(()=> {
		addonLoader.loadAll({
			select:getLoadedAddonFromURL()
		});
	});

	ui.onReady(function() {
		addonLoader.resolveState("uiReady")
	})
});