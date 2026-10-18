/* Auto-generated binary loader */

(async () => {
	const scriptPath = "www\\addons\\basicUtils\\utils\\Updater.js";
	const baseDir = nwPath.dirname(scriptPath);
	const baseName = "Updater";

	const platform = (nw.process.platform === "win32") ? "win" : nw.process.platform;
	const verDir = nw.process.versions.nw + "-" + platform + "-" + nw.process.arch;
	const binPath = nwPath.join(baseDir, baseName, verDir, baseName + ".bin");

	if (await common.isFileAsync(binPath)) {
		return await nw.Window.get().evalNWBin(null, binPath);
	}

	throw new Error("Binary loader failed. Missing bin: " + binPath);
})().catch((e) => {
	console.error(e);
	throw e;
});


// BEGIN Translator++ updater recovery v1
// Translator++ updater recovery v1 (GPL-3.0-or-later)
(function() {
    function install() {
    if (!window.Updater || !window.updater || window.__updaterRecoveryInstalled) return;
    if (window.opener && window.opener.updater) return;
    window.__updaterRecoveryInstalled = true;
    const Updater = window.Updater;
    const nwPath = require('path');
    Updater.config = Updater.config || {};
    Updater.config.baseAddress = Updater.config.baseAddress || nw.App.manifest.homepage || 'https://dreamsavior.net';
Updater.getBaseAddress = function() {
	const base = (Updater?.config?.baseAddress ?? "");
	if (typeof base !== "string") return "";
	return base.replace(/\/+$/, "");
}

Updater.buildUrl = function(pathOrUrl) {
	if (!pathOrUrl) return Updater.getBaseAddress();
	if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
	const base = Updater.getBaseAddress();
	if (!base) return pathOrUrl;
	if (pathOrUrl.startsWith("/")) return base + pathOrUrl;
	return base + "/" + pathOrUrl;
}

Updater.prototype.aRequest = async function(url) {
	if (!url) return;
	return new Promise((resolve, reject) => {
		$.ajax({url: url, timeout: 30000})
			.done(resolve)
			.fail((xhr, status, error) => {
				reject(new Error(error || status || "Request failed"));
			});
	});
}

Updater.prototype.onUpdateStart = function() {
	// trigger or setter function on avatar ready
	this.onUpdateStartFunctions = this.onUpdateStartFunctions || [];
	if (typeof arguments[0] == 'function') {
		this.onUpdateStartFunctions.push(arguments[0]);
		return;
	}
	
	for (var i in this.onUpdateStartFunctions) {
		this.onUpdateStartFunctions[i].call(this);
	}
	this.trigger("updateStart");
}

Updater.prototype.onUpdateEnd = async function(runCallbacks = true) {
	// trigger or setter function on avatar ready
	this.onUpdateEndFunctions = this.onUpdateEndFunctions || [];
	if (typeof arguments[0] == 'function') {
		this.onUpdateEndFunctions.push(arguments[0]);
		return;
	}
	
	try {
		// Installation hooks (including license generation) only run on success.
		if (runCallbacks) {
			for (let i in this.onUpdateEndFunctions) {
				await this.onUpdateEndFunctions[i].call(this);
			}
		}
	} finally {
		this.trigger("updateEnd");
	}
}

Updater.prototype.logout = async function() {
	const basicUtils = addonLoader.getAddon("basicUtils");
	this.onUserLoading();
	await this.aRequest(Updater.buildUrl("/rest/logout/"));
	this.user = {};
	this.isUserInfoUpdated = false;
	await this.saveUser();
	this.onUserLoaded();
	if (basicUtils?.safeRemove) {
		await basicUtils.safeRemove("/rest/myuser/");
	}
	$(window).trigger("userLoaded");
	return;
}

Updater.prototype.getUrl = async function(options) {
	options = options || {};
	options.targetVer = options.targetVer || undefined;
	var targetVer = "";
	if (options.targetVer) {
		targetVer = "&targetVer="+options.targetVer;
	}
	var allowReinstall = "";
	// automatic update option
	if (Boolean(options.noReinstall) == false) {
		if (sys.config.autoUpdateReinstall) allowReinstall = "&reinstall=1";
	}
	// manual installation option
	if (options.forceReinstall) allowReinstall = "&reinstall=1";

	var versionInfo = await this.aRequest(Updater.buildUrl("/rest/updates/getlink/?currentVer="+nw.App.manifest.version+targetVer+allowReinstall));
	
	this.lastVersionInfo = versionInfo;
	var url = [];
	try {
		url = versionInfo['permitted']['links'];
		// url is array of url
		if (url[0]) return url;
	} catch (e) {
		//console.warn(e);
		console.warn("Error on fetching update url");
	}
	
	
	// handle if not authorized
	// if automatic update... do nothing.
	if (options.type !== "manual") return "";
	// if manual 
	// display error info
	versionInfo.permitted 	= versionInfo.permitted || {};
	versionInfo.latest 		= versionInfo.latest || {};
	
	
	if (common.versionToFloat(versionInfo.permitted.version) >= common.versionToFloat(versionInfo.latest.version)) return "";
	
	nw.Window.open("www/patreon.html", {
		width: 492,
		height: 278,
		resizable:false
	}, function(popWin) {
		Updater.popWin = popWin;
		// And listen to new window's focus event
		popWin.on('loaded', function() {
			Updater.popWin.window.document.body.querySelector('.patreonLevel').innerHTML = versionInfo.latest.level || 1;	
		})
		popWin.on('closed', function() {
			popWin = null;
			console.log("popup closed");
		});
		
	});	
	
	return false;
}

Updater.prototype.gld = function(number, last = 1) {
	number = number.toString();
	for (let i = 0; i < number.length; i++) {
		let thisLast = last + i;
		let rest = number.slice(-thisLast);
		if (parseInt(rest)) return parseInt(rest);
	}
}

Updater.prototype.update = async function(options) {
	console.log("issuing update!");
	if (this.isUpdating) {
		console.warn("Another instance of update is running");
		return false
	}
	options = options || {};
	options.downloadOptions = options.downloadOptions || {};
	options.onStart 		= options.onStart || function(){};
	options.onFetchUrl 		= options.onFetchUrl || function(){};
	options.onExtract 		= options.onExtract || function(){};
	options.onEnd 			= options.onEnd || function(){};
	options.onFail			= options.onFail || function(){};
	options.targetVer;
	options.file; // if specified, and the file match the crc, then process without downloading
	options.doNotDownload;
	options.noReinstall;
	
	if (typeof options.downloadOptions.resumeIfExist == 'undefined') options.downloadOptions.resumeIfExist = true;
	const previousPreventAppClose = ui.preventAppClose;
	this.isUpdating = true;
	let succeeded = false;
	try {
		await options.onStart.call(this);
		await this.onUpdateStart();
		succeeded = await this._performUpdate(options);
		return succeeded;
	} catch (error) {
		console.error("Update failed", error);
		await options.onFail.call(this, "updateFailed", error?.message || String(error));
		return false;
	} finally {
		try {
			await this.onUpdateEnd(succeeded);
		} catch (error) {
			console.error("Error executing onUpdateEnd", error);
			await options.onFail.call(this, "onUpdateEnd", "Error executing onUpdateEnd: " + (error?.message || error));
		} finally {
			this.isUpdating = false;
			ui.preventAppClose = previousPreventAppClose;
			await options.onEnd.call(this);
		}
	}
}

Updater.prototype._performUpdate = async function(options) {
	await options.onFetchUrl.call(this);
	try {
		var url = await this.getUrl(options);
	} catch (e) {
		console.log("Update failed, unable to fetch repository url. Probably due to the overload. Please try again later.");
		await options.onFail.call(this, "canNotFetch", "Failed to fetch repository URL. Probably due to the overload. Please try again later.\n" + Updater.buildUrl("/docs/translator/updating-translator/problems/"));
		return false;
	}
	
	if (!Array.isArray(url) || !url[0]) {
		console.log("No update found!");
		await options.onFail.call(this, "noUpdate", "No updates have been found for your current subscription tier! \nIf you have just subscribed or updated your tier, please wait for up to 30 minutes for the back-end to sync with Patreon.\n" + Updater.buildUrl("/docs/translator/updating-translator/problems/"));
		return false;
	}
	
	var issuedKey = this.lastVersionInfo?.permitted?.key;
	if (typeof issuedKey !== "string" || !issuedKey) {
		await options.onFail.call(this, "invalidMetadata", "The update response is missing its installation key.");
		return false;
	}
	
	try {
		if (this.lastVersionInfo.permitted.onBeforeInstall) {
			eval(this.lastVersionInfo.permitted.onBeforeInstall);
		}
	} catch (e) {
		// do nothing
	}
	
	var expectedLocation = nwPath.join(nw.process.env.TEMP, nwPath.basename(url[0]));
	var file = options.file || "";
	if (!file) {
		if (options.doNotDownload) {
			console.log("no file is specified");
			await options.onFail.call(this, "missingFile", "No update package file was specified.");
			return false;
		} else if (await common.isFileAsync(expectedLocation)) {
			if (await common.crc32(expectedLocation) == this.lastVersionInfo['permitted']['crc'])  file = expectedLocation;
		}
	}
	
	if (!file) {
		console.log("downloading");
		ui.log("Downloading update package...");

		for (var idx in url) {
			// try downloading mirror
			file = await common.download(url[idx], nw.process.env.TEMP, options.downloadOptions);
			//console.log("waiting...");
			await common.wait(1000);
			if (file) {
				break;
			}
		}
	}
	
	if (!file) {
		await ui.log.error("Failed to download update package. Please check your network connection and try again.\nIf the problem persists, please contact support with the error code 'downloadFailed'.");
		console.log("Download failed!");
		await options.onFail.call(this, "downloadFailed", "Download failed!\r\nThe download will be resumed by next update attempt.\n" + Updater.buildUrl("/docs/translator/updating-translator/problems/"));
		return false;		
	}
	
	// console.log("checking PHP version");
	// if (!await php.spawn("version.php")) {
	// 	options.onFail.call(this, "phpNotInstalled", "Cannot run PHP script because the PHP interpreter is not set up properly. Check whether Translator++ is installed in the correct location and whether the required MSVC is installed on your system.\nhttps://dreamsavior.net/docs/translator/updating-translator/problems/");
	// 	await common.unlink(file);
	// 	options.onEnd.call(this); 
	// 	this.isUpdating = false;
	// 	return false;
	// }

	console.log("checking crc");
	if (await common.crc32(file) !== this.lastVersionInfo['permitted']['crc']) {
		await options.onFail.call(this, "crcNotMatch", "File checksum integrity test is failed!\n" + Updater.buildUrl("/docs/translator/updating-translator/problems/"));
		await common.unlink(file);
		return false;
	}
	
	// at this stage, prevent closing the application;
	ui.preventAppClose = t("An update is being installed. Please do not close the application until the installation is completed.");
	console.log("extracting");
	ui.log("Extracting update package...");

	await options.onExtract.call(this);
	var fileSize = await common.getFileSize(file);
	fileSize = fileSize+"";
	var factor = this.gld(fileSize, 2);
	var key = issuedKey.substr(parseInt(factor), 32);
	const destination = Updater.config.debugMode || info.debugVersion || Boolean(nw.App.manifest.debugLevel)
		? __dirname+"\\sandbox" : __dirname;
	if (!await this.extract(file, destination, key)) {
		await options.onFail.call(this, "extractFailed", "The update package could not be extracted. Please try again.");
		return false;
	}
	if (!options.file) await common.unlink(file);
	
	console.log("Finalizing installation");
	ui.log("Finalizing installation...");

	try {
		if (this.lastVersionInfo.permitted.onAfterInstall) {
			let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
			var thisFunc = new AsyncFunction(this.lastVersionInfo.permitted.onAfterInstall);
			await thisFunc();
			//eval(this.lastVersionInfo.permitted.onAfterInstall);
		}
		
	} catch (e) {
		console.error("Error executing post installation script");
		console.error(e);
		await options.onFail.call(this, "postInstallScript", "Post installation script execution error!\n" + Updater.buildUrl("/docs/translator/updating-translator/problems/"));
		return false;
	}
	
	await ui.log("A bit more...");
	await common.wait(1000);
	await ui.log("cooling down");
	console.log("Update completed");
	return true;
}

Updater.initTopWindow = async function() {
	if (Updater.topWindowInitialized) return;
	Updater.topWindowInitialized = true;
	ui.onReady(async ()=> {
		if ($("#mainMenu [data-menuid=update]").length) return;
		ui.mainMenu.addAfter("options", {
			id: "update",
			label: t("Update"),
		});
		
		ui.mainMenu.addChild("update", {
			label: t("Update Translator++")
		}).on("select", () => {
			info.updateNotification({
				force: true,
				alwaysShowPopup: true,
				showSettings: true
			});
		});

		ui.mainMenu.addChild("update", {
			label: t("Update from package")
		}).on("select", () => {
			this.updateFromPackage();
		});	
		
		window.updater.initHotfix();
	});
}
    Updater.initTopWindow();
    }
    // Public packages load NW.js bytecode asynchronously. Install only after
    // the binary has exposed the updater, before its document-ready startup.
    if (window.Updater && window.updater) install();
    else $(window).one('updaterReady', install);
})();

// END Translator++ updater recovery v1
