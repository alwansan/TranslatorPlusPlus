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
var fs 		= fs || require('fs');
var _7z 	= _7z||require('7zip-min');
var nwPath 	= nwPath||require('path');

/**
 * Manages third-party application configuration, detection, and installation prompts.
 *
 * The class loads a registry of external tools, checks whether they are already
 * installed, and helps the user download or install them when needed.
 *
 * @constructor
 * @param {Object} [config] Initial configuration object.
 */
var ThirdParty = function(config) {
	this.config 			= config;
	this.defaultConfigPath 	= '3rdParty\\config.json'
	this.configPaths 		= [this.defaultConfigPath]
	this.configUrl 			= "https://dreamsavior.net/mirror/config/config.json"
	this.acceptedArchive	= ["7z", "7zip", "zip", "lzma", "cab", "gzip"]
	this.config				= {};
	this.isInitialized		= false;
	this.init.apply(this, arguments);
}
/**
 * Add config file to be loaded at initialization
 * @param {String} configPath Path to a configuration file.
 * @returns {Promise<void>}
 */
ThirdParty.prototype.addConfigFile = async function(configPath) {
	if (!await common.isFileAsync(configPath)) return console.warn("Invalid config file:", configPath);
	this.configPaths.push(configPath);
}

/**
 * Add configuration from object
 * @param {Object} config Parsed configuration object.
 */
ThirdParty.prototype.addConfig = function(config) {
	this.config = {...this.config, ...config.products };
	console.log(this.config);
}

/**
 * Append configuration from file
 * @param {String} configFile Path to a configuration file.
 * @returns {Promise<void>}
 */
ThirdParty.prototype.loadConfigFile = async function(configFile) {
	try {
		var content = await common.fileGetContents(configFile);		
		var contentVar = JSON.parse(content);
		this.addConfig(contentVar);
	} catch (e) {
		console.warn("Error when trying to add file to config:", configFile);
	}
	console.log(this.config);
}

/**
 * Load the primary configuration file and any additional config files.
 *
 * @param {String|String[]} [configPaths] One or more config file paths.
 * @returns {Promise<void>}
 */
ThirdParty.prototype.initConfig = async function(configPaths) {
	console.log("Third party load config");
	configPaths = configPaths || this.configPaths;
	if (Array.isArray(configPaths) == false) configPaths = [configPaths]
	try{
		// handling main config
		// main config is configPaths[0]
		var content = await common.fileGetContents(configPaths[0]);
		var contentVar = JSON.parse(content);
		this.addConfig(contentVar);
		this.configDate = contentVar.info.date;

		// load additional config
		for (var i=1; i<configPaths.length; i++) {
			this.loadConfigFile(configPaths[i]);
		}
	} catch (e) {
		console.warn("Error on loading 3rdParty configuration : ", e)
	}
}



/**
 * Initialize the third-party registry once per instance.
 *
 * @param {Object} [config] Optional configuration object.
 */
ThirdParty.prototype.init = function(config) {
	if (!this.isInitialized) {
		this.initConfig();
		this.isInitialized = true;
	}
}

/**
 * Download and replace the default third-party configuration file.
 *
 * @param {String} [url] Configuration URL.
 * @param {Object} [options] Download callbacks.
 * @returns {void}
 */
ThirdParty.prototype.update = function(url, options) {
	url = url||this.configUrl;
	options = options||{};
	options.onDone = options.onDone || function() {};
	var request = require('request');
	var progress = require('request-progress');
	request(url, function (error, response, body) {
		options.onDone.call(this, body);
	})
	.pipe(fs.createWriteStream(this.defaultConfigPath))
	
}


/**
 * Return the first URL that responds as working.
 *
 * @param {String|String[]} urls Candidate URLs.
 * @returns {Promise<String>} The first working URL, or an empty string.
 */
ThirdParty.prototype.getWorkingLink = async function(urls) {
	if (typeof urls == "string") urls = [urls];

	for (var i in urls) {
		if (await common.isUrlWorking(urls[i])) return urls[i];
	}
	
	return "";
}


/**
 * Test a list of URLs until one responds successfully.
 *
 * @param {String[]} urls Candidate URLs.
 * @param {Function} callback Invoked with the first working URL.
 * @param {Object} [options] Additional options.
 */
ThirdParty.prototype.checkWorkingLinks = function(urls, callback, options) {
	urls = urls||[];
	urls = JSON.parse(JSON.stringify(urls))
	callback = callback||function(){};
	options = options||{};
	console.log("URLS are : ", urls);
	var urlStack = urls;
	var that = this;
	var request = request||require('request');
	this.__urlTestCache = this.__urlTestCache||{};
	
	var urlCheckRecursive = function(url) {
		if (typeof that.__urlTestCache[url] !== 'undefined') {
			if (that.__urlTestCache[url]) {
				callback.call(that, url); 
				
			} else {
				var newUrl = urlStack.pop();
				urlCheckRecursive(newUrl);				
				
			}
			return;
		}
		
		request.get(url, function(err, httpResponse, body) {
			console.log(arguments);
		}).on('data', function(data) {
			this.abort();
			console.log("Status Code : ", this.response.statusCode);
			
			if (this.response.statusCode == 200) {
				that.__urlTestCache[url] = true;
				callback.call(that, url, this.response);

			} else {
				that.__urlTestCache[url] = false;
				var newUrl = urlStack.pop();
				urlCheckRecursive(newUrl);				
			}
			//console.log("received data length", data.length);
		});		
	}
	
	/**
	 * Update the popup state based on whether any required items are missing.
	 */
	var newUrl = urlStack.pop();
	urlCheckRecursive(newUrl);
}


ThirdParty.prototype.evalProblem = function() {

	if (this.popup.find(".segments").length > 0) {
		this.popup.find(".isProblem").removeClass("hidden");
		this.popup.find(".noProblem").addClass("hidden");
	} else {
		this.popup.find(".isProblem").addClass("hidden");
		this.popup.find(".noProblem").removeClass("hidden");
	}
}

/**
 * Render the third-party installer popup.
 *
 * @param {jQuery} $content Popup content container.
 * @param {Object} [options] Popup options.
 */
ThirdParty.prototype.showPopup = function($content, options={}) {
	var that = this;
	options.title = options.title||"Third party application installer"
	options.width = options.width||Math.round($(window).width()/100*80)
	options.height = options.height||Math.round($(window).height()/100*80)
	options.classes =   {
		"ui-dialog": "topMost"
	}
	/*
	var $popupContents = $("<h1>One or more required application(s) are not found</h1>\
	<p>But don't worry, Translator++ will guide you trhoughout the installation process.</p>\
	<div class='wrapper'></div>\
	");
	$popupContents.append($content);
	*/
	
	var $popupContents = [$("\
	<div class='thirdPartyUpdater'><span class='configDateWrapper'>This list is generated by configuration dated : <span class='configDate'></span></span><span class='menuBar'><a href='#' class='updateConfig icon-download-cloud'>Update configuration file</a><a href='#' class='toggleInstalled icon-eye'>Show installed</a></span></div>\
	<div class='headerBox'>\
		<div class='blockBox attentionBlock withIcon hidden isProblem'><h1>You might need to install the following applications!</h1>\
		<p>Translator++ can be used normally even without these applications. But Translator++ can help you avoid a lot of manual work by installing these applications.</p>\
		<p>These applications are developed by 3rd parties and Translator++ is not affiliated with it. All licenses are owned by their respective owners.</p>\
		</div>\
		<div class='blockBox infoBlock withIcon hidden noProblem'><h1>You are good to go!</h1>\
		<p>You've installed all 3rd party applications Translator++ can work with.</p>\
		</div>\
	</div>\
	<div class='wrapper'></div>\
	"),
	$("<div class='wrapper'></div>").append($content)];
	var nDate = new Date(this.configDate);
	$popupContents[0].find(".configDate").html(nDate.toGMTString());
	$popupContents[0].find(".updateConfig").on("click", function() {
		var $that = $(this);
		$(this).removeClass("icon-download-cloud");
		$(this).addClass("icon-spin6");
		$(this).addClass("spin-icon");
		that.update(undefined, {
			onDone : function() {
				$that.addClass("icon-download-cloud");
				$that.removeClass("icon-spin6");
				$that.removeClass("spin-icon");
				var conf = confirm("Configuration updated.\nRestart the application?");
				if (conf) chrome.runtime.reload()
			}
		});
	})
	$popupContents[0].find(".toggleInstalled").on("click", function(e) {
		e.preventDefault();
		var $installed = $content.find(".segments.installed");
		if ($installed.first().hasClass("hidden")) {
			$installed.removeClass("hidden");
			$(this).text("Hide installed").removeClass("icon-eye").addClass("icon-eye-off");
		} else {
			$installed.addClass("hidden");
			$(this).text("Show installed").removeClass("icon-eye-off").addClass("icon-eye");
		}
	})
	if (options.showInstalled) {
		$popupContents[0].find(".toggleInstalled").text("Hide installed").removeClass("icon-eye").addClass("icon-eye-off");
	}
	
	
	ui.showPopup("thirdParty", $popupContents, options);
	this.popup = $("[data-popupid=thirdParty]");
	this.popup.closest(".ui-dialog").css("z-index", "2000");
	this.evalProblem();
	
}

/**
 * Get the currently loaded third-party configuration map.
 *
 * @returns {Object}
 */
ThirdParty.prototype.getConfig = function() {
	return this.config;
}

/**
 * Resolve the installed location for a configuration entry.
 *
 * @param {String} conf Configuration key.
 * @returns {String|false}
 */
ThirdParty.prototype.getLocation = function(conf) {
	if (Boolean(this.config[conf]) == false) return false;
	var thisConfig = this.config[conf]
	return nwPath.join(__dirname, thisConfig['location']||"");
		
}
/**
 * Get the base directory that stores third-party applications.
 *
 * @returns {String}
 */
ThirdParty.prototype.getBasePath = function() {
	return nwPath.join(__dirname, "3rdParty");
		
}
/**
 * Check whether a configured third-party application is installed.
 *
 * @param {String} conf Configuration key.
 * @returns {Boolean}
 */
ThirdParty.prototype.isInstalled = function(conf) {
	// check if the module is ready and already installed
	if (Boolean(this.config[conf]) == false) return false;
	
	var thisConfig = this.config[conf]
	console.log("thisConfig : ", thisConfig);
	if (typeof thisConfig.expectedFiles == "string") thisConfig.expectedFiles = [thisConfig.expectedFiles]
	
	for (var i=0; i<thisConfig.expectedFiles.length; i++) {
		var path = __dirname+"/"+thisConfig['location']+"/"+thisConfig.expectedFiles[i];
		var expLocation = __dirname+"/"+thisConfig['location'];
		expLocation = expLocation.split("/").join("\\");
		try {
			console.log("checking : + ", path);
			if (fs.existsSync(path)) {
				//console.log('file exists');
			} else {
				return false;
			}
		} catch (e) {
			return false;
		}
		
	}
	return true;
}

/**
 * Download, extract, or copy a third-party package into the local install directory.
 *
 * @param {Object} [config] Config entry describing the package.
 * @param {jQuery} [$segments] Related UI segment.
 * @returns {Promise<void>}
 */
ThirdParty.prototype.install = async function(config, $segments) {
	config = config || {};
	
	var $statusInfo = $segments.find(".statusInfo");
	var $info 		= $statusInfo.find(".info");
	var $progress 	= $statusInfo.find(".progressValue");

	$statusInfo.removeClass("hidden");
	$info.text("Checking available mirror");

	var url = await this.getWorkingLink(config.repo);
	console.log("url", url);
	if (!url) return alert("Failed to download file. Repository not exist. Please see console log for more info.");
	
	$info.text("A working mirror found : "+url);
	
	var filename 	= nwPath.basename(url);
	//var tmp 		= nwPath.join(nw.process.env.TMP, nwPath.basename(url));

	
	$statusInfo.removeClass("hidden");

/**
 * Build the UI for missing or installed third-party applications.
 *
 * @param {Object} [options] Check behavior options.
 * @returns {jQuery}
 */
	var options = {}
	options.onEnd 		= function(){
		$progress.css("width", "100%")
		$progress.html("100%")
		$info.html("Download done!")
	};
	options.onProgress	= function(state){
		var percent 		= state.percent
		var speed 			= state.speed;
		var total 			= state.total;
		var transfered 		= state.transfered;
		var timeRemaining 	= Math.round(state.time.remaining);
		$progress.css("width", percent+"%")
		$progress.html(percent+"%")
		
		$info.html("<span class='progress'>"+transfered+"kb/"+total+"kb</span> <span class='speed'>("+speed+" kb/s)</span> <span class='time'>"+timeRemaining+"s left</span>")
	};
	options.onSuccess	= function(){};

	// ==============DOWNLOADING=================
	console.log("downloading ", url);
	const tmp = await common.downloadFile(url, nw.process.env.TMP, options);
	console.log("Request done", tmp);

	await common.wait(1000);
	
	var ext 		= common.getFileExtension(tmp)
	var targetDir 	= nwPath.join(__dirname, "3rdParty", config["extractDir"]||"");
	if (this.acceptedArchive.includes(ext)) {
		// unpack
		$info.html("Unpacking")
		
		await common.extract(tmp, targetDir);
		console.log("unpacking from", tmp);
		console.log("to", targetDir);
		$info.html("Done!");
		$statusInfo.addClass("hidden");
		
		if (typeof config.licenseFile !== 'undefined') {
			var conf = confirm("Instalation done!\nDo you want to read the License?");
			if (conf) nw.Shell.openItem(__dirname+"/"+config['location']+"/"+config.licenseFile);
			
		}
		$segments.remove();
		this.evalProblem();									

	} else {
		// destination.txt will be created or overwritten by default.
		$info.html("Copying file.")
		await common.copyFile(tmp, nwPath.join(__dirname, "3rdParty", filename));
		$info.html("Done!");
		$statusInfo.addClass("hidden");
		$segments.remove();
		this.evalProblem();
	}				
}

/**
 * Check for missing third-party applications and prompt the user to install them if needed.
 *
 * @param {Object} [options] Check behavior options.
 * @param {boolean} [options.force=false] Force popup display.
 * @param {boolean} [options.popup=false] Force popup display.
 * @param {string|string[]} [options.filter] Only check for specific configuration keys.
 * @param {boolean} [options.showInstalled=false] Show already installed applications.
 */
ThirdParty.prototype.check = function(options) {
	// check if the requirement files and modules are presents
	options 		= options||{};
	options.options = options.force||false; // force popup
	options.popup 	= options.popup||false; // force popup
	options.filter 	= options.filter || undefined;
	options.showInstalled = options.showInstalled || false; // show already installed apps
	if (Boolean(options.filter) == true) {
		if (Array.isArray(options.filter) == false) options.filter = [options.filter]
	}	
	console.log("running thirdParty.check");
	console.log("Current config:", this.config);
	var $content = $("<div class='initReqs_contents'></div>");
	var that = this;
	
	for (var conf in this.config) {
		if (Boolean(options.filter) == true) {
			if (options.filter.includes(conf) == false) continue;
		}
		var thisConfig = this.config[conf]
		console.log("thisConfig : ", thisConfig);
		if (typeof thisConfig.expectedFiles == "string") thisConfig.expectedFiles = [thisConfig.expectedFiles]
		
		var allInstalled = true;
		for (var i=0; i<thisConfig.expectedFiles.length; i++) {
			
			var path = __dirname+"/"+thisConfig['location']+"/"+thisConfig.expectedFiles[i];
			var expLocation = __dirname+"/"+thisConfig['location'];
			expLocation = expLocation.split("/").join("\\");
			try {
				console.log("checking : + ", path);
				if (fs.existsSync(path)) {
					console.log('file exists');
				} else {
					allInstalled = false;
					console.log("file not found : ", path)
					var $segments = $("<div class='segments' data-confid='"+conf+"'>\
						<div class='initReqs_title'><span>"+thisConfig['name']+"</span></div>\
						<div class='initReqs_description'><span>"+thisConfig['description']+"</span></div>\
						<div class='initReqs_url'>\
							<span><a href='"+thisConfig['url']+"' class='icon-home' external>"+thisConfig['url']+"</a></span>\
							<span class='initReqs_sourceCode icon-file-code hidden'><a href='"+thisConfig['sourceCode']+"' external>Get the source code</a></span>\
						</div>\
						<div class='initReqs_info'><span>"+thisConfig['info']+"</span></div>\
						<div class='initReqs_expectedPath gridView'><span class='label'>Expected Location</span><a href='#' class='icon-folder-1 browseFolder' title='Browse folder'>"+expLocation+"</a></div>\
						<div class='initReqs_fileSize gridView'><span class='label'>File Size</span><a href='#' class='icon-box browseFolder' title='Browse folder'>"+thisConfig['fileSize']+"</a></div>\
						<div class='initReqs_action'>\
							<button class='downloadFile icon-cloud'>Download the file</button>\
							<button class='installFromFile icon-folder-open'>Install from my computer</button>\
							<button class='automaticInstall icon-download-cloud highlight'>Download and install automatically</button>\
						</div>\
						<div class='statusInfo hidden'>\
							<span class='progressBar'><span class='progressValue'></span></span>\
							<span class='info'></span>\
						</div>\
					</div>");
					$segments.data("id", conf);
					
					$content.append($segments);	
					if (thisConfig['sourceCode']) {
						$segments.find(".initReqs_sourceCode").removeClass("hidden")
					}
					$segments.find(".browseFolder").off("click")
					$segments.find(".browseFolder").on("click", function() {
						console.log("Opening : ", $(this).text());
						common.openExplorer($(this).text(), $(this).text());
					})
					$segments.find("a.externalLink, a[external]").off("click")
					$segments.find("a.externalLink, a[external]").on("click", function(e) {
						e.preventDefault();
						console.log("opening", $(this).attr("href"));
						nw.Shell.openExternal($(this).attr("href"));
					})
					$segments.find(".installFromFile").off("click")
					$segments.find(".installFromFile").on("click", function(e) {
						var $segments = $(this).closest(".segments");
						
						ui.openFileDialog({
							accept:".7z,.7zip,.zip,.exe",
							onSelect:function(path) {
								var fileExt = common.getFileExtension(path)
								var filename = common.getFileName(path);
								
								console.log("Install manualy from : ", path);
								if (that.acceptedArchive.includes(fileExt)) {
									console.log("selected ",path);
									// unpack
									_7z.unpack(path, __dirname+"\\3rdParty", err => {
										console.log("done unpacking to", path);
										// done
										$segments.remove();
										that.evalProblem();
										
									});	
								} else {
									fs.copyFile(path, __dirname+"\\3rdParty\\"+filename, (err) => {
										if (err) throw err;
										console.log("copying file")
										$segments.remove();
										that.evalProblem();
									});

								}									
									
							}
						});
					});
					$segments.find(".downloadFile").on("click", function(e) {
						e.preventDefault();
						var thisId = $(this).closest(".segments").data("id");
						var thisConfig = thirdParty.getConfig()[thisId];
						var $segments = $(this).closest(".segments");
						var conf = confirm("Is it ok for Translator++ to open a browser and download a file for you?");
						if (conf) {
							$segments.find(".statusInfo").removeClass("hidden");
							$segments.find(".statusInfo .progressBar").addClass("hidden");
							$segments.find(".statusInfo .info").text("Checking available mirror");
							
							that.checkWorkingLinks(thisConfig.repo, function(workingUrl) {
								$segments.find(".statusInfo").addClass("hidden");
								$segments.find(".statusInfo .progressBar").removeClass("hidden");
								$segments.find(".statusInfo .info").text("");
								
								nw.Shell.openExternal(workingUrl);
							})
							
						}
					});
					$segments.find(".automaticInstall").on("click", async function(e) {
						
						var $this = $(this);
						var $segments = $this.closest(".segments");
						var thisId = $segments.data("id");
						var thisConfig = thirdParty.getConfig()[thisId];
						
						var conf = confirm("You are about to download and install "+thisConfig.name+"!\nYou do this action of your own volition.\nDo you wish to continue?");
						if (!conf) return;
						
						await that.install(thisConfig, $segments);
						
					});
					
					break;					
				}
			} catch(err) {
				console.warn(err)
			}
		}
		if (allInstalled) {
			var installedHiddenClass = options.showInstalled ? '' : ' hidden';
			var expLocation = (__dirname+"/"+thisConfig['location']).split("/").join("\\");
			var $installedSegment = $("<div class='segments installed"+installedHiddenClass+"' data-confid='"+conf+"'>\
				<div class='initReqs_title'><span>"+thisConfig['name']+"</span></div>\
				<div class='initReqs_description'><span>"+thisConfig['description']+"</span></div>\
				<div class='initReqs_url'>\
					<span><a href='"+thisConfig['url']+"' class='icon-home' external>"+thisConfig['url']+"</a></span>\
				</div>\
				<div class='initReqs_expectedPath gridView'><span class='label'>Installed Location</span><a href='#' class='icon-folder-1 browseFolder' title='Browse folder'>"+expLocation+"</a></div>\
				<div class='initReqs_action'>\
					<span class='icon-ok installedBadge'>Installed</span>\
				</div>\
			</div>");
			$installedSegment.data("id", conf);
			$content.append($installedSegment);
			$installedSegment.find(".browseFolder").off("click").on("click", function() {
				console.log("Opening : ", $(this).text());
				common.openExplorer($(this).text(), $(this).text());
			});
			$installedSegment.find("a.externalLink, a[external]").off("click").on("click", function(e) {
				e.preventDefault();
				console.log("opening", $(this).attr("href"));
				nw.Shell.openExternal($(this).attr("href"));
			});
		}
	}
	
	//console.log($content.find(".segments"));
	if (options.popup) {
		if (options.force) {
			this.showPopup($content,options);
		} else {
			if ($content.find(".segments:not(.hidden)").length > 0) this.showPopup($content,options);
		}
	}
	return $content;
	//this.showPopup($content);	

}



var thirdParty = new ThirdParty();

$(document).ready(function() {
	sys.onReady(function() {
		ui.onReady(async function() {
			await addonLoader.until("loaded");
			thirdParty.check({popup:true});
		})
	})
})