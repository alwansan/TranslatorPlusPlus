var LT = function(options) {
	if (!(this instanceof LT)) return console.warn("Can not call LT directly. Use a 'new' token to create an instance.")
	options 				= options || {}
	this.options 			= options;
	this.recordMode 		= options.recordMode || false;
	this.attrGetter			= options.attrGetter	 	|| "data-tranattr";
	this.innerHTMLGetter	= options.innerHTMLGetter 	|| "data-tran";
	this.defaultListener	= options.defaultListener 	|| options.listener || "_t"
	this.translationPair	= options.translationPair 	|| {};
	this.reg				= {};
	this.transData 			= {};
	this.transRowKey 		= 0;
	this.sourcePath			= "";
	this.config 			= {};
	
	// apply options to this
	for (i in options) {
		this[i] = options[i];
	}
	// no automatic initialization
	if (Boolean(options.noInit) == false) {
		this.init();
	}
}

LT.prototype.set = function(key, value) {
	if (typeof key !== 'string') return console.warn('Key must be a string')
	this[key] = value;
	return this;
}

LT.prototype.get = function(key){
	if (typeof key !== 'string') return console.warn('Key must be a string')
	return this[key];
}

LT.prototype.getConfig = function(key){
	if (typeof key !== 'string') return console.warn('Key must be a string')
	return this.config[key];
}

LT.prototype.save = function(key, value) {
	key = key || "";
	if (typeof key !== 'string') return console.warn("can not set config with non string key");
	if (key !== '')  this.config[key] = value;
	window.localStorage.setItem("ltConfig", JSON.stringify(this.config))
}

LT.prototype.createListener = function(name) {
	this.listeners = this.listeners||{};

	if (typeof name !== 'string') return console.warn("Parameter[0] be a string");
	if (name.length == 0) return console.warn("Invalid listener name");
	if (typeof window[name] == 'function') return console.warn("can not create listener. name ", name, "is already been used!");
	
	var that = this;
	if (typeof arguments[1] == 'function') {
		var thisArg = arguments[1];
		window[name] = function(string){
			return thisArg.apply(that, arguments);
		}		
	
		this.listeners[name] = window[name];
		return;
	}
	
	window[name] = function(...string) {
		if (string.length > 1) {
			return that.translate(string.join(""))
		}
		return that.translate(string[0]);
	}
	this.listeners[name] = window[name];
}

LT.prototype.isJson = function(string) {
		try
		{
		   json = JSON.parse(string);
		}
		catch(e)
		{
		   return false;
		}	
		return true;
}

LT.prototype.fromUrl = function(url, callback) {
	callback = callback || function(data){};
	var that = this;
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			if (that.isJson(this.responseText) == false) return console.warn("Not a JSON :", url);
			that.transData = JSON.parse(this.responseText);
			that.sourcePath = url;
			that.config.from = url;
			that.save();
			callback.call(that, that.transData)
		}
	};
	xhttp.open("GET", url, true);
	xhttp.send();
}

LT.prototype.buildTranslationPair = function(source) {
	// source is two dimensional array [[key, translation]]
	if (Array.isArray(source) == false) return this.translationPair;
	
	function fromRow(rowData) {
		if (Array.isArray(rowData) == false) return;
		if (rowData.length <= 1) return;
		for (var i=rowData.length-1; i>=0; i--) { 
			if (i == this.transRowKey) continue;
			if (rowData[i]) return rowData[i]
		}
	}
	
	for (var i=0; i<source.length; i++) {
		var thisRow = source[i]
		if (!thisRow[this.transRowKey]) continue; // skip if key is blank
		var translation = fromRow(thisRow)
		if (!translation) continue; 
		if (translation == thisRow[this.transRowKey]) continue; // skip if translation is same with key
		this.translationPair[thisRow[this.transRowKey]] = translation;
	}
	
	return this.translationPair;
}

LT.prototype.default = function() {
	this.config 			= {};
	this.translationPair 	= {};
	this.sourcePath 		= "";
	this.transData 			= {};
	this.save();
	return this;
}

LT.prototype.from = function(source) {
	if (Boolean(source) == false) return this.default();
	if (typeof source == "string") return this.fromUrl(source, (data)=>{this.from(data)});
	if (Array.isArray(source)) return this.buildTranslationPair(source);
	if (source.data) this.buildTranslationPair(source.data);
	
	if (source.project) {
		source.project.files = source.project.files || {}
		for (var i in source.project.files) {
			this.buildTranslationPair(source.project.files[i].data);
		}
	}
	return this;
}

LT.prototype.onReady = function(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

LT.prototype.dump = function() {
	var content = JSON.stringify(this.getTrans(), undefined, 2);
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
	element.setAttribute('download', "dump.trans");
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);

}

LT.prototype.getTrans = function() {
	var data = [];
	// merge with existing translation pair

	this.reg = Object.assign(this.reg, this.translationPair);
	
	for (var index in this.reg) {
		var translation = this.translate(index);
		if (translation == index) translation = "";
		data.push([index, translation])
	}
	var result = {
		project : {
			files : {
				main: {
					data:data
				}
			}
		}
	}	
	return result;
}

LT.prototype.translate = function(string) {
	if (this.recordMode) this.reg[string] = "";
	if (this.translationPair[string]) return this.translationPair[string];
	return string;
}

LT.prototype.translateHTML = function() {
	this.onReady(()=> {
		var allElm = document.querySelectorAll('['+this.innerHTMLGetter+']');
		for (var i=0; i<allElm.length; i++) {
			var thisElm = allElm[i];
			var translation = this.translate(thisElm.innerHTML);
			if (translation !== thisElm) thisElm.innerHTML = translation;
			//console.log("LT reading inner html : ", thisElm.innerHTML);
		}		
		
		var allElm = document.querySelectorAll('['+this.attrGetter+']');
		for (var i=0; i<allElm.length; i++) {
			var thisElm = allElm[i];
			var attrs = thisElm.getAttribute(this.attrGetter	);
			attrs = attrs.split(" ");
			for (var idx=0; idx<attrs.length; idx++) {
				var thisAttr = attrs[idx].trim();
				//console.log("thisAttr : ", thisAttr);
				if (!thisAttr) continue;
				var translatable = thisElm.getAttribute(thisAttr)
				var translation = this.translate(translatable);
				if (translation !== translatable) thisElm.setAttribute(thisAttr, translation);
			}
		
		}		
	})
}



LT.prototype.init = function() {
	var config = {};
	try {
		config = JSON.parse(window.localStorage.getItem("ltConfig"));
	} catch (e) {
	
	}
	this.config = config||{};
	
	if (this.config.from)  this.from(this.config.from)
	this.createListener(this.defaultListener);
	this.translateHTML();	
}

module.exports = LT;