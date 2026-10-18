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
var fs = fs||require('fs');
var Info = function() {
	this.lastHistory = [];
	this.previewVersion = false;
	
	this.init();
}

Info.prototype.init = async function() {
	nw.appSuffix = "";
	var suffixes = [];
	this.debugVersion = false;
	if (nw.process.versions["nw-flavor"] == "sdk") suffixes.push("DEV");
	if (this.isDebugVersion()) {
		suffixes.push("DEBUG");
		this.debugVersion = true;
	}
	nw.appSuffix = suffixes.join("-");
	ui.setWindowTitle();
	$(window).trigger("previewVersion");
}

Info.prototype.isDebugVersion = function() {
	// if "README.md" exists, it is a debug version
	return fs.existsSync(__dirname+"/README.md");
}

Info.prototype.isUpToDate = function() {
	//if (this.nextVersions.length < 1) return true;
	sys.config.info = sys.config.info||{};
	if (typeof sys.config.info.numberOfNewVer == 'undefined') return false;
	if (sys.config.info.numberOfNewVer === 0) return true;
	return false;
}

Info.prototype.getLastCheckedUpdate = function() {
	var time = localStorage.getItem('updateLastCheck');
	return parseInt(time);
}

Info.prototype.getNextVersions = function(mode, upToDateMsg) {
	mode = mode||"";
	upToDateMsg = upToDateMsg||"";
	this.nextVersions = [];
	
	// first compare whether the current version is actually greater than public version
	const thisVerFloat = common.versionToFloat(nw.App.manifest.version);
	console.log("compare version : ", thisVerFloat, common.versionToFloat(this.lastHistory[0].version));

	if (thisVerFloat > common.versionToFloat(this.lastHistory[0].version)) {
		this.previewVersion = true;
	} else {
		for (let i=0; i<this.lastHistory.length; i++) {
			if (thisVerFloat >= common.versionToFloat(this.lastHistory[i].version)) break;
			this.nextVersions.push(this.lastHistory[i]);
		}
	}
	
	if (mode!=='html') return this.nextVersions;
	
	// HTML mode
	if (this.nextVersions.length < 1) return upToDateMsg;
	
	var $obj = $(`<div><h2 class='missedHeader'><i class='icon-attention red'></i>${t("You have ")+this.nextVersions.length+t(" missed update(s)!")}</h2>
			<div class='blockBox infoBlock withIcon' >
				${t("Translator++ will update itself if auto-update is enabled.")}<br />${t("You can download the latest core version of Translator++ at")} <a href='http://dreamsavior.net/' external>dreamsavior.net</a>.
			</div>
			<ul class='nextVersions'></ul>
			</div>`);
			
	for (var i=0; i<this.nextVersions.length; i++) {
		var $line = "<li class='releases'>";
		$line+="<h2 class='releaseHeader flex'><div class='releaseVer'>Ver. "+this.nextVersions[i].version+"</div><div class='releaseCategory'></div></h2>";
		$line+="<div class='versionInfo'></div>";
		$line+="<ul class='changelog'>";
		if (Array.isArray(this.nextVersions[i].changeLog)) {
			for (var x=0; x<this.nextVersions[i].changeLog.length; x++) {
				var thisUpdate = this.nextVersions[i].changeLog[x];
				var updatePart = this.nextVersions[i].changeLog[x].split(":");
				var updateMsg = thisUpdate;
				var updateType = "info";
				if (updatePart.length > 1)  {
					updateType = updatePart.shift().toLowerCase();
					updateMsg = updatePart.join(":");
				}
				$line+="<li><span class='updateType updateType-"+updateType+"'>"+updateType+"</span><span class='updateTypeBody'>"+updateMsg+"</span></li>";
			}
		}
		$line+="</ul>";
		$line+="</li>";
		$line = $($line);
		$line.find('.releaseCategory').html(this.nextVersions[i].category);
		$line.find('.releaseCategory').addClass("releasesCategory-"+this.nextVersions[i].category);
		if (parseInt(this.nextVersions[i].level) == 1) {
			$line.find('.versionInfo').html(t("This update is available for all patrons."));
		} else if (parseInt(this.nextVersions[i].level) > 1) {
			$line.find('.versionInfo').html(t("This update is available for tier $"+this.nextVersions[i].level+" patrons or greater."));
		}
		$line.addClass("releases-"+this.nextVersions[i].category);
		$obj.find(".nextVersions").append($line);
	}
	return $obj;
}


Info.prototype.updateNotification = async function(options) {
	options = options || {};
	options.force = options.force || false;
	options.alwaysShowPopup = options.alwaysShowPopup || false;

	console.log("updateNotification handler", options);
	if (!options.force) {
		if (nw.App.manifest.localConfig.checkVersion !== "always") {
			// skip check in interval 1 day
			if (this.getLastCheckedUpdate()+86400 > Date.now()) return;
		}
	}
	
	console.log("process updateNotification");
	const that = this;
	const fs = require('graceful-fs');
	sys.config.info = sys.config.info||{};
	sys.config.info.numberOfNewVer = sys.config.info.numberOfNewVer||0;
	
	let verHistory = nw.App.manifest.localConfig.versionHistory;
	if (options.force) verHistory = verHistory+"?req="+common.generateId();
	
	try {
		const response = await fetch(verHistory, {
			method: "POST",
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({})
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		console.log("version history data : ", data);
		that.lastHistory = data;
		fs.writeFile("./data/verHistory.json", JSON.stringify(data, undefined, 2), function(err) {
			if(err) {
				return console.warn(err);
			}
			console.log("The file was saved!");
		});

		const $popupWrapper = $("<div class='updaterWrapper'></div>");
		
		var $popupContent = that.getNextVersions("html");
		if ($popupContent || options.alwaysShowPopup) {
			if (!$popupContent) {
				$popupContent = $(`<div>
					<h1>🎉 ${t("You're up-to-date!")} 🎉</h1>
					<p>
						${t("Thanks for staying up to date with Translator++! You're on the newest version, and we appreciate your support. Enjoy translating!")}
					</p>
					<p>
						🔍 ${t("Some update information may be shown from cache. You can click <b>'Check for update'</b> to load the latest version details.")}
					</p>
				</div>`);
			}

			$popupWrapper.append($popupContent);
			
			if (options.showSettings) {
				const $fld = new CustomFields($("<div></div>"), {jsonForm: {
					schema: {
						allowReinstall: {
							"type": "boolean",
							"title": t("When the same version is available"),
							"description": t("Allow Translator++ to reinstall the same version of Translator++."),
							"default": Boolean(sys.config.autoUpdateReinstall)
						}
					},
					form: [
						{
							"key": "allowReinstall",
							"inlinetitle": t("Allow reinstall the same version"),
							onChange: function(evt) {
								sys.config.autoUpdateReinstall = evt.target.checked;
								sys.saveConfig();
							}
						}
					]
				}});
				$popupWrapper.append(`<h1>${t("Update Settings")}</h1>`);
				$popupWrapper.append($fld.$elm);
			}


			let isUnpreventable = false;
			let optionForce = false;
			if (that.nextVersions.length > sys.config.info.numberOfNewVer) optionForce = true;
			if (options.alwaysShowPopup) {
				optionForce = true;
				isUnpreventable = true;
			}
			const popupOption = {
				isUnpreventable: isUnpreventable,
				force : optionForce,
				title : "Update information",
				buttons : 	[
								{
									text: t("Update Now"),
									click: async function() {
										console.log("updating");
										if (typeof updater == 'undefined') {
											alert(t("Updater is not available, please update Translator++ manually."));
											return;
										}
										$(this).dialog( "close" );
										ui.log.show();
										await ui.log.progress("updating", t("Updating Translator++"));
										await ui.log(t("Please don't close Translator++ until the update process is finished."));
										let isFail = false;
										await updater.update({
											onFail:function(code, reason) {
												ui.log.error(t("Cannot update, reason :\n")+reason);
												ui.log.warning(t("You may need to reconnect Translator++ with your Patreon account (logout and login again)."));
												ui.log.warning(t("Also, it has been reported that some countries such as mainland China are blocking dropbox repository."));
												ui.log.warning(t("If for some reason you cannot access our repository, please manually download the update package (tpch file) using a proxy or VPN here:"));
												ui.log.warning("https://dreamsavior.net/translator-plusplus/translator-update-package/");
												ui.log.warning(t(`After that, please use the "Update from package" feature to update your Translator++.`));
												ui.log.warning(t("If you still have problems, please contact us at our Discord server : ")+"https://discord.gg/6Dv97C87xt");
												isFail = true;
											},
											downloadOptions: {
												onProgress : (state) =>  {
													ui.log.progress(parseInt(state.percent));
												}
											}
										});
										ui.log.progress(100, "Done");
										if (!isFail) {
											ui.log.addButton(t("Restart"), ()=>{
												const conf = confirm(t("Do you want to restart Translator++ now?\nIf you have unsaved work, cancel this dialog and save your work first."));
												if (!conf) return;
												Sys.restartApplication();
											});
										}
										ui.log.end();
										$(this).dialog( "close" );
									}
								},
								{
									text: t("Check for Update"),
									click: function() {
										$(this).dialog( "close" );
										that.updateNotification({force:true, alwaysShowPopup: true});
									}
								},
								{
									text: t("Close"),
									icon: "ui-icon-close",
									click: function() {
										$(this).dialog( "close" );
									}
								}
							]
			}
			ui.showPopup("updateInfo", $popupWrapper, popupOption);
		}
		localStorage.setItem('updateLastCheck', Date.now());
		sys.config.info.numberOfNewVer = that.nextVersions.length;
		sys.saveConfig();
	} catch (error) {
		console.error('Error:', error);
	} finally {
		return Promise.resolve();
	}
}


window.info = new Info();

$(document).ready(function() {
	sys.onReady(function() {
		if (typeof ui == 'undefined') return;
		ui.onReady(async function() {
			await addonLoader.until("loaded");
			info.updateNotification();
		});
	});
});