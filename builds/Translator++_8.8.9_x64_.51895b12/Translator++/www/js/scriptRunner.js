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
const ScriptRunner = function() {
	this.domain 		= "sr://";
	this.scripts 		= {};
	this.load();
}

ScriptRunner.prototype.compileFunction = function(str) {
    //find parameters
    var pstart = str.indexOf('('), pend = str.indexOf(')');
    var params = str.substring(pstart+1, pend);
    params = params.trim();

    //find function body
    var bstart = str.indexOf('{'), bend = str.lastIndexOf('}');
    var str = str.substring(bstart+1, bend);

    return Function(params, str);
}

ScriptRunner.prototype.load = function(pathname) {
	pathname = pathname || window.location.pathname
	var currentObjStr = localStorage.getItem(this.domain+pathname)
	if (Boolean(currentObjStr) == false) return;
	this.scripts = this.scripts || {};
	try {
		//this.scripts = eval('(' +currentObjStr+ ')');
		this.scripts[this.domain+pathname] = JSON.parse(currentObjStr, (k,v) => {
			// there is probably a better way to determ if a value is a function string
			if(typeof v === "string" && v.indexOf("function") !== -1)
				return this.compileFunction(v);
			return v;
		});
	} catch (e) {
		console.log(e);
	}
}

ScriptRunner.prototype.save = function() {
	try {
		for (var pathname in this.scripts) {
			if (Boolean(this.scripts[pathname]) == false) continue;
			var thisObj = this.scripts[pathname];
			var serialized = JSON.stringify(thisObj, function(k,v){
				//special treatment for function types
				if(typeof v === "function")
					return v.toString();//we save the function as string
				return v;
			});	
			localStorage.setItem(pathname, serialized);
		}
	} catch(e) {
		console.log(e);
	}
}


ScriptRunner.prototype.applyScript = function(pathname, eventName, id, obj ) {
	pathname = pathname || window.location.pathname;
	
	if (Array.isArray(pathname) == false) pathname = [pathname]
	
	for (var i in pathname) {
		var thisPathname = pathname[i];
		if (Boolean(eventName) == false) return console.warn("second argument (eventName) can not be empty");
		if (Boolean(id) == false) return console.warn("Third argument (id) can not be empty");
		// make sure the current script is the most updated one
		this.load(thisPathname);
		
		thisPathname = this.domain+thisPathname;
		
		this.scripts = this.scripts || {};
		this.scripts[thisPathname] = this.scripts[thisPathname] || {};
		this.scripts[thisPathname][eventName] = this.scripts[thisPathname][eventName] || {};
		this.scripts[thisPathname][eventName][id] = obj;
		
		if (Boolean(obj) == false) delete this.scripts[thisPathname][eventName][id];

	}
	this.save();
	
}

ScriptRunner.prototype.deleteScript = function(pathname, eventName, id) {
	this.applyScript(pathname, eventName, id, undefined);
}

ScriptRunner.prototype.getScript = function(pathname) {
	pathname = pathname || window.location.pathname;
	pathname = this.domain+pathname;
	this.scripts = this.scripts || {};
	return this.scripts[pathname];
}

ScriptRunner.prototype.triggerEvent = function(eventName) {
	if (Boolean(eventName)==false) return console.warn("eventName must be defined");
	var thisScript = this.getScript();
	thisScript = thisScript || {};
	var thisEvents = thisScript[eventName] || {};
	
	for (var id in thisEvents) {
		if (typeof thisEvents[id] !== 'function') continue;
		thisEvents[id].call(this);
	}
}


window.scriptRunner = new ScriptRunner();
scriptRunner.triggerEvent("onStart");

var sys = sys || window.opener?.sys || window.top?.sys;
$(document).ready(function() {

	sys.onReady(()=> {
		scriptRunner.triggerEvent("onSysReady");
	});
	scriptRunner.triggerEvent("onReady");
});