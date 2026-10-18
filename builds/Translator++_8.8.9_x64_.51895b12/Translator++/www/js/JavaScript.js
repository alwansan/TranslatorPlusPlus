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
//const BasicModule = require("www/addons/basicUtils/basicModule.js");

function getHomepageBaseJavaScript() {
	var homepage = (nw && nw.App && nw.App.manifest && nw.App.manifest.homepage) ? nw.App.manifest.homepage : "";
	if (typeof homepage !== "string" || !homepage.trim()) homepage = "https://dreamsavior.net";
	return homepage.replace(/\/+$/, "");
}

var JavaScript = function(options) {
	options = options || {};
	this.options = options;
	this.key = this.options.key || "js";
	this.defaultRemote = getHomepageBaseJavaScript() + "/rest/remotescript/";
	console.log("JavaScript module initialized");
}

JavaScript.prototype.load = function() {
	var js = window.localStorage.getItem(this.key) || "{}";
	try {
		if (!js) return {}; 
		return JSON.parse(js);
	} catch (e) {
		return {};
	}
}

JavaScript.prototype.remote = async function(path, options) {
	var js = this.load();
    if (!this.scriptExist()) {
		var script = await common.fetch(getHomepageBaseJavaScript() + "/" + String(path || "").replace(/^\/+/, ""));
        this.set(path, script);
    } 
    this.run(path);
}

JavaScript.prototype.scriptExist = async function() {
	var js = this.load();
    if (js[id]) return true;
    return false;
}

JavaScript.prototype.fetch = async function(url, options) {
	options = options || {};
	return new Promise((resolve, reject) => {
		options.url = url || options.url;
		$.ajax(options)
		.done(function(msg) {
			resolve(msg);
		})
		.fail(function() {
			resolve();
		})
	})
}

JavaScript.prototype.execute = async function(script) {
	if (!await common.isFileAsync("www/addons/basicUtils/basicModule.js")) {
		console.warn("Basic module not found, running script in unsafe mode");
		try {
			eval(script);
		} catch (e) {
			throw new Error("Error when executing runtime script "+e.toString());
		}		
	}

	const BasicModule = require("www/addons/basicUtils/basicModule.js");

	try {
		let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
		let thisFunc = new AsyncFunction(await BasicModule.unpack(script));
		await thisFunc();
	} catch (e) {
		throw new Error("Error when executing runtime script "+e.toString());
	}
}

JavaScript.prototype.run = async function(id, options) {
	var js = this.load();
	var script = "";
	options = options || {};
	options.noRerun = false; // prevents calling back this function (to prevent invinite loop)

	if (typeof js[id] == 'undefined') {
		var scriptObj = await this.fetch(this.defaultRemote+"?version="+nw.App.manifest.version+"&id="+id);
		if (typeof scriptObj !== "object") return;
		if (scriptObj.error) return console.warn(scriptObj.error);
		if (!scriptObj.hasScript) return;
		if (typeof scriptObj.script !== "string") return;
		if (Boolean(scriptObj.store) == false) {
			// a non caching script
			try {
				this.execute(scriptObj.script);
				// let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
				// let thisFunc = new AsyncFunction(await BasicModule.unpack(scriptObj.script));
				// await thisFunc();
	
			} catch (e) {
				console.warn("Error when executing runtime script", e);
			}

			return;
		}

		var setOption = {
			group : scriptObj.group || ""
		}
		await this.set(id, scriptObj.script, setOption);

		if (options.noRerun) return;
		await this.run(id, {noRerun:true});
		return;
	}

	js[id] = js[id] || {};
	if (js[id].type == "external") {
		script = await common.fetch(js[id].script);
	} else {
		script = js[id].script;
	}

	try {
		if (script) {
			await this.execute(script);
			// let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
			// let thisFunc = new AsyncFunction(await BasicModule.unpack(script));
			// await thisFunc();
		}
	} catch (e) {
		console.warn("Error when executing runtime script", e);
	}
}

JavaScript.prototype.set = async function(id, script, options) {
	var js = this.load();
	script	= script || "";
	options = options || {};

	if (options.group) {
		// remove previous item on group
		this.removeGroup(options.group);
		var js = this.load();
	}

	js[id]=options;
	js[id].script = script;
	
	window.localStorage.setItem(this.key, JSON.stringify(js));
}

JavaScript.prototype.remove = async function(id) {
	var js = this.load();
	if (!id) return;

	delete js[id];
	
	window.localStorage.setItem(this.key, JSON.stringify(js));
}

JavaScript.prototype.removeGroup = function(group) {
	var js = this.load();
	for (var i in js) {
		if (!js[i]) continue;
		if (!js[i].group) continue;
		if (js[i].group !== group) continue;
		delete js[i];
	}
	
	window.localStorage.setItem(this.key, JSON.stringify(js));
}

JavaScript.prototype.reset = async function() {
	window.localStorage.setItem(this.key, "{}");
}

module.exports.JavaScript = JavaScript;