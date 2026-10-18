const thisAddon = this;
const bCopy = require("better-copy");
const RMTransText = require("www/addons/rmrgss/RMTransParser.rgss.module.js")
const CommonWorker = require("www/js/CommonWorker.js");
const AddonUtils = require("www/js/AddonUtils.js");
this.legacyHandler = new AddonUtils()
const legacyHandler = this.legacyHandler;
const rpgMakerTransVer = "4.6 CLI Gateway";
const expectedRMTransVer = "4.6.4";
const ini = require("ini");
const rmTransPackage = "https://github.com/dreamsavior/rpgmakertrans/archive/refs/heads/master.zip";



legacyHandler.supportedEngines = ["rmXP", "rmVX", "rmVXACE"];
legacyHandler.gameEngine = "rmtrans";
legacyHandler.parserName = "rmtrans";
legacyHandler.parserVersion = "24.3.18"
legacyHandler.useThread = true;
legacyHandler.alwaysExportFromStage = true;

legacyHandler.isBinInstalled = async function() {
    const versionInfo = "3rdParty/rpgmakertrans-master/version.json";
    if (await common.isFileAsync(versionInfo)) return true;
    return false;
}

legacyHandler.isBinVersionSuffice = async function() {
    const versionInfo = "3rdParty/rpgmakertrans-master/version.json";
    if (!await common.isFileAsync(versionInfo)) return false;
    try {
        const verInfo = JSON.parse(await common.fileGetContents(versionInfo));
        if (!verInfo?.version) return false;
        if (common.compareVersion(verInfo.version, expectedRMTransVer) < 0) return false;
        return true;
    
    } catch (e) {
        console.error("error parsing version", e);
        return false;
    }
}

legacyHandler.installBin = async function() {
    if (await common.isDir("3rdParty/rpgmakertrans-master")) {
        await common.rmdir("3rdParty/rpgmakertrans-master");
    }
    ui.log("Downloading package from ", rmTransPackage);
    await common.downloadUnpackTo(rmTransPackage, "./3rdParty", {
        onUnpack: function() {
            ui.log("Unpacking package");
        }
    });
    ui.log("Installation completed.");
}

legacyHandler.ensureBinInstallation = async function(prompt=false) {
    try {
        await ui.log("Ensures RMTrans installation...");
        if (!await this.isBinInstalled()) {
            if (prompt) {
                let conf = confirm(t("RPGMakertrans CLI Gateway is needed to run this action.\nRPGMakertrans CLI Gateway is licensed under GPL-3 and cannot be distributed along with the program.\nBut Translator++ can set it up on your behalf.\n\nDo you wan't Translator++ to install RPGMakertrans CLI Gateway for you?"))
                if (!conf) throw new Error("RMTrans is not installed. User denies the installation prompt.");
                await this.installBin();
            }
        } else if (!await this.isBinVersionSuffice()) {
            if (prompt) {
                let conf = confirm(t("RPGMakertrans CLI Gateway is need to be updated.\nDo you wan't Translator++ to update the RPGMakertrans CLI Gateway for you?"))
                if (!conf) throw new Error("RMTrans is not installed. User denies the installation prompt.");
                await this.installBin();
            }
        }
    } catch (e) {
        await ui.logError("Failed to ensure RMTrans installation: "+e);
        // ui.loadingEnd();
        // throw new Error("Failed to ensure RMTrans installation: "+e);
        console.warn(e)
        return false;
    }
}

legacyHandler.getTransDataThread = async function(file, basePath, options={}) {
    const targetFile = nwPath.join(basePath, file);
    if (!await common.isFileAsync(targetFile)) {
        ui.logError('Cannot find file: '+ targetFile);
        return;
    }
    const script = await common.fileGetContents(targetFile, "utf8");
    const workerData= {
        command :"getTransData",
        script : script,
        options: {
            logTarget: "ui"
        }
    }
    const handler = new CommonWorker.Handler("./www/addons/rmrgss/RMTransParser.thread.js", workerData);
    const result = await handler.getResult();
    console.log("Result", result);
    return result.result;
}

legacyHandler.getTransData = async function(file, basePath, options={}) {
    // Example usage:
    if (this.useThread) return this.getTransDataThread(file, basePath, options);
    const targetFile = nwPath.join(basePath, file);
    if (!await common.isFileAsync(targetFile)) {
        ui.logError('Cannot find file: '+ targetFile);
        return;
    }
    const inputText = await common.fileGetContents(targetFile, "utf8");
    const parsedObj = RMTransText.parseRPGMakerTrans(inputText);
    console.log("%cparsedObj", "color:green", parsedObj);
    return RMTransText.parsedObjToTransRMRGSS(parsedObj);
}

legacyHandler.getType = async function(path) {
    var dir = path;
    if (await common.isFileAsync(path)) {
        dir = nwPath.dirname(path)
    }
	if (await common.isFileAsync(nwPath.join(dir, "Game.rgss3a"))) return "rmVXACE";
	if (await common.isFileAsync(nwPath.join(dir, "Data/System.rvdata2"))) return "rmVXACE";
	if (await common.isFileAsync(nwPath.join(dir, "Game.rgss2a"))) return "rmVX";
	if (await common.isFileAsync(nwPath.join(dir, "Data/System.rvdata"))) return "rmVX";
	if (await common.isFileAsync(nwPath.join(dir, "Game.rgssad"))) return "rmXP";
	if (await common.isFileAsync(nwPath.join(dir, "Data/System.rxdata"))) return "rmXP";
	if (await common.isFileAsync(nwPath.join(dir, "Game.rvproj2"))) return "rmVXACE";

}

legacyHandler.getProjectTitle = async function(path) {
    const iniFile = nwPath.join(nwPath.dirname(path), "Game.ini");
    if (!await common.isFileAsync(iniFile)) throw new Error("Ini file not found in path", nwPath.dirname(path))
    const fileContent = await common.fileGetContents(iniFile);
    
    // Parse the INI content
    const parsedIni = ini.parse(fileContent);
    console.log("parsedINI", parsedIni);
    // Access the Title within the Game section
    return parsedIni.Game.Title;

}

legacyHandler.setEngineName = async function(transData, basePath, options) {
    console.log("setEngineName", basePath, await this.getType(basePath, options));
    return await this.getType(nwPath.dirname(options.init.entryPoint));
}

legacyHandler.autoTagging = async function(transData) {
    if (!transData?.project?.files) return transData;
    for (let path in transData.project.files) {
        let thisFile = transData.project.files[path];
        thisFile.tags ||= [];

        for (let contextIndex=0; contextIndex<thisFile.context.length; contextIndex++) {
            let thisContext = thisFile.context[contextIndex];
            if (!thisContext) continue;
            let contextString = (thisContext.join("/\n")+"/");
            if (contextString.includes("/note/") || contextString.includes("/Comment/")) {
                thisFile.tags[contextIndex] ||=[];
                thisFile.tags[contextIndex].push("blue");
            }
        }
    }
    return transData;
}

legacyHandler.patch = async function(gameDir, patchLocation="", outputGame="", rewrite=false, options = {}) {
    await this.ensureBinInstallation(true);

    options = options || {};
    if (!await common.isDir(gameDir)) throw new Error("Invalid gameDir "+gameDir);

    const temp = nw.process.env.TMP || nw.process.env.TEMP
    await ui.log("Preparing TEMP directory");
    if (!rewrite) {
        if (await common.isDir(nwPath.join(temp, "legacyPatcher"))) {
            await common.rmdir(nwPath.join(temp, "legacyPatcher"));
        }
    }
    
    if (!patchLocation) {
        patchLocation = await common.mkDir(nwPath.join(temp, "legacyPatcher/patch"));
    }
    if (!outputGame) {
        outputGame = await common.mkDir(nwPath.join(temp, "legacyPatcher/output"));
    }
    ui.log("Patch location: "+patchLocation);
    ui.log("Temporary output location: "+outputGame);

    var arg = ["..\\rpgmakertrans\\rpgmt.py", `"${gameDir}"`, "-p", patchLocation, "-o", outputGame];
    if (typeof options.maxDialogLine !== "undefined") {
        arg.push("-n");
        arg.push(options.maxDialogLine);
    }

    await common.aSpawn(".\\python.exe", arg, {
        detached:true,
        shell   :true,
        cwd: nwPath.resolve("3rdParty/rpgmakertrans-master/python3.4/")
    })

    return {
        gameDir,patchLocation,outputGame
    }
}

legacyHandler.prepareNewProject = async function(info = {}) {
    ui.showLoading();
    ui.loadingProgress("Processing", `Creating a new ${info.gameType} translation project.`, {consoleOnly:false, mode:'consoleOutput'});

    const basePath = nwPath.dirname(info.entryPoint);

    this.setProjectLocation = () => {
        return basePath;
    }

    const pathResult = await this.patch(basePath);

    const files = await common.glob("**/*.txt", {cwd:pathResult.patchLocation});

    this.finalizeTransData = async (transData, basePath, options) => {
        const cacheData = nwPath.join(transData.project.cache.cachePath, "data/patch");
        const gameData = nwPath.join(transData.project.cache.cachePath, "data/gameData");

        ui.log("Copying patch data");
        await bCopy(nwPath.join(pathResult.patchLocation, "patch"), cacheData);
        ui.log("Copying game data");
        await bCopy(nwPath.join(pathResult.outputGame, "Data"), nwPath.join(gameData, "Data"));
        ui.log("Copying Game.ini");
        await bCopy(nwPath.join(pathResult.outputGame, "Game.ini"), gameData);
        ui.log("Running automatic tagging");
        this.autoTagging(transData);
        return transData;
    }

    await this.createProject(files, pathResult.patchLocation, {
        init:info,
        noCache:true
    });
    
    ui.loadingEnd();
}



legacyHandler.beforeExportToFolder = async function(destinationDir, transData, options) {
    console.log("Before export to folder", arguments);
    const temp = nw.process.env.TMP || nw.process.env.TEMP
    if (await common.isDir(nwPath.join(temp, "legacyPatcher"))) {
        await common.rmdir(nwPath.join(temp, "legacyPatcher"));
    }
    const patchLocation = await common.mkDir(nwPath.join(temp, "legacyPatcher/patch"));
    const inputGame = await common.mkDir(nwPath.join(temp, "legacyPatcher/input"));
    const outputGame = await common.mkDir(nwPath.join(temp, "legacyPatcher/output"));
    await common.filePutContents(nwPath.join(patchLocation, "RPGMKTRANSPATCH"), "> RPGMAKER TRANS PATCH V3", "utf8", false)
    await common.mkDir(nwPath.join(patchLocation, "patch"));
    await common.mkDir(nwPath.join(inputGame, "Data"));

    const cachePath = transData?.project?.cache?.cachePath;
    if (!await common.isDir(cachePath)) {
        ui.logError(`Cannot find staging path ${cachePath}\nPlease rebuild your project.`);
        ui.loadingEnd();
        throw new Error(`Cannot find staging path ${cachePath}\nPlease rebuild your project.`);
    }

    this.writeFile = async function(file, basePath, targetDir, options={}) {
        console.log("Writing file", arguments);
        console.log("Shared var", patchLocation);
        const stageFile = nwPath.join(basePath, file);
        const translationData = this.selectTranslationData(options.translationDatas, file);
        console.log("TranslationData", translationData)
        ui.log("Parsing "+ stageFile);
        const inputText = await common.fileGetContents(stageFile, "utf8");
        const parsedObj = RMTransText.parseRPGMakerTrans(inputText);
        console.log("%cparsedObj", "color:green", parsedObj);
        const translatedObj = RMTransText.translateParsedObjRMRGSS(parsedObj, translationData.translationPair, translationData.info);
        console.log("%ctranslated parsedObj", "color:aqua", translatedObj);
        const buildObj = RMTransText.buildRPGMakerTrans(translatedObj);
        ui.log("Writing file", nwPath.join(patchLocation, file));

        return await common.filePutContents(nwPath.join(patchLocation, file), buildObj, "utf8");
    }

    this.afterExportToFolder = async function(result, destinationDir, transData, options) {
        console.log("After export to folder", arguments);
        console.log("Shared var", patchLocation);
        ui.log("Copy material to temp dir");
        const inputDataDir = nwPath.join(inputGame, "Data");
        var extName = "rvdata2";
        if (transData.project.gameEngine == "rmVX") {
            extName = "rvdata";
        } else if (transData.project.gameEngine == "rmXP") {
            extName = "rxdata";
        }

        const fileToProcess = []
        for (let file of options.files) {
            let thisFile = common.changeExtension(file.substring("/patch/".length), extName);
            let thisFileName = common.getFilename(thisFile);
            if (thisFileName == "GameINI") {
                await common.copyFile(nwPath.join(cachePath, "data/gameData/Game.ini"), inputGame);
                fileToProcess.push("GameINI.ini");
                continue;
            }
            fileToProcess.push("Data/"+thisFileName+"."+extName);
            let stagingFile = nwPath.join(cachePath, "data/gameData/Data", thisFile)
            await ui.log("Copying file "+thisFile);
            await common.copyFile(stagingFile, inputDataDir);
        }

        ui.log("Running RMTrans patch")
        await this.patch(inputGame, undefined, undefined, true, options.custom);
        ui.log("Patch completed!");
        ui.log("Copying your data to ", destinationDir);
        await bCopy(outputGame, destinationDir, {
            overwrite:true,
            onBeforeCopy: function(from, to) {
                ui.log("Writing "+to);
            }
        });
    }
}


legacyHandler.init = async function() {
    if (this.isInitialized) return;
	// const $slide = $(`<div>
	// 			<h1><i class="icon-plus-circled"></i>RPG Maker XP, VX & VXAce Legacy Parser</h1>
	// 			<div class="RMLegacyCustomField"></div>
	// 		</div>`);
	// var customField;
	// ui.newProjectDialog.addMenu({
	// 	icon 			: thisAddon.getWebLocation()+"/icon2.png",
	// 	descriptionBar 	: `<h2>RPG Maker XP, VX & VXAce Legacy Parser</h2>
	// 					<p>${t('Start a translation project from RPG Maker XP, VX, VX ace with RPGMakerTrans tool.')}<br />
    //                     ${t('RPGMakerTrans was used for the earlier RPG Maker parser, but it is now improved with version 4.6 CLI Gateway.')}<br />
    //                     </p>
    //                     `,
	// 	actionBar		: "",
	// 	goToSlide		: "RMLegacy",
	// 	at				: 2,
	// 	slides : {
	// 		RMLegacy: ui.newProjectDialog.newSlide("RMLegacy", $slide, {
	// 			buttons: [
	// 				{
	// 					text: t("Create project"),
	// 					icon: "ui-icon-close",
	// 					click: async function() {
	// 						if (!customField) return alert("Error: customField is not defined. This should not happen!");
	// 						const values = customField.getFormValues();
    //                         if (!values.entryPoint) {
    //                             alert(t("Please select a RGSS based RPG Maker game!"))
    //                             return;
    //                         }
	// 						console.log("Form value", values);
    //                         await legacyHandler.prepareNewProject(values);
    //                         $(this).dialog( "close" );
	// 					}
	// 				},
	// 			],
    //             onActive: ()=> {
	// 				customField = new CustomFields($("<form></form>"), {jsonForm: {
	// 					"schema": {
    //                         "entryPoint": {
    //                             "type": "string",
    //                             "title": "Game location",
    //                             "description" : "Path to the game executable file (.exe)."
    //                         },
    //                         "projectTitle": {
    //                             "type": "string",
    //                             "title": "Project Title",
    //                             "description": "Your project title",
    //                             "default": "Untitled RMTrans Project"
    //                         },
    //                         "gameType": {
    //                             "type": "string",
    //                             "title": "RPG Maker type",
    //                             "description" : "Type of the RPG Maker. Will be automatically detected when you selected the exe file.",
    //                             "enum": ["", "rmVXACE", "rmVX", "rmXP"]
    //                         },
    //                         "devLocation": {
    //                             "type": "string",
    //                             "title": "The default location ",
    //                             "description" : "Path to the game executable file (.exe)."
    //                         },

	// 					},
	// 					"form": [
    //                         {
    //                             type: "info",
    //                             value: t(`To start a translation project with legacy parser you need to install RPGMaker Trans ver. ${rpgMakerTransVer}. This wizard will help you to install RPGMaker Trans if needed.`)
    //                         },
    //                         {
    //                             "key": "entryPoint",
    //                             "type": "selectfile",
    //                             "accept": ".exe",
    //                             onChange: async function(evt) {
    //                                 console.log("this", this);
    //                                 const value =this.getValue();
    //                                 ui.showBusyOverlay();
    //                                 const type = await legacyHandler.getType(value);
    //                                 const $form = $(this.node.el).closest("form")
    //                                 const $gameType = $form.find("[name=gameType]");
    //                                 if (!type) {
    //                                     alert(t("Unable to detect RPG Maker type!\nAre you sure the game is RPG Maker XP, VX or VX Ace?"));
    //                                     ui.hideBusyOverlay();
    //                                     $(evt.target).val("");
    //                                     return;
    //                                 }
    //                                 $gameType.val(type);
                                    
    //                                 try {
    //                                     const $projectTitle = $form.find("[name=projectTitle]");
    //                                     $projectTitle.val(await legacyHandler.getProjectTitle(value));
    //                                 } catch (e) {
    //                                     console.error("Failed to detect the game title", e);
    //                                 }

    //                                 ui.hideBusyOverlay()
    //                                 console.log("new value is", value);
    //                             }
    //                         },
    //                         {
    //                             "key": "projectTitle",
    //                         },
    //                         {
    //                             "key": "gameType",
    //                             "type": "select",
    //                             "titleMap": {
    //                                 "rmVXACE": "RM VX Ace",
    //                                 "rmVX": "RM VX",
    //                                 "rmXP": "RM XP",
    //                             }
    //                         },
                            
    //                     ],
	// 				}});
	// 				$slide.find(`.RMLegacyCustomField`).empty();
	// 				$slide.find(`.RMLegacyCustomField`).append(customField.getElm());
    //             }
	// 		})
	// 	}
	// });

    AddonUtils.applyCommonHandlers(legacyHandler.supportedEngines, legacyHandler);
    this.isInitialized = true;

    engines.addHandler(legacyHandler.supportedEngines, 'onLoadSnippet', async function(selectedCell) {
		console.log("Legacy RGSS onLoadSnippet handler", "this", this);
		console.log("selected cell:", selectedCell);
        const selectedParams = trans.getSelectedParameters();
        if (!selectedParams?.length) return;
        const thisParam = selectedParams[0];
        if (thisParam.type !== "rgss") return;

        const thisObj = trans.getSelectedObject();
        var scriptName = thisParam.scriptName || common.getFilename(thisObj.path) + "_" + thisParam.transIndex;
        const filePath = nwPath.join(trans.getStagingDataPath(), "scripts", thisParam.scriptType||"unknown", scriptName+".rb")
        
        if (!await common.isFileAsync(filePath)) {
            await common.mkDir(nwPath.dirname(filePath));

            const stagingFile = nwPath.join(trans.getStagingDataPath(), thisObj.path)
            if (!await common.isFileAsync(stagingFile)) return;
            const content = await common.fileGetContents(stagingFile, "utf8")
            const parsedTrans = RMTransText.parseRPGMakerTrans(content);
            const originalText = parsedTrans?.segments?.[thisParam.transIndex]?.structure?.text || "";
            await common.filePutContents(filePath, originalText, "utf8", false);
        }

		this.commonHandleFile(selectedCell, "ruby", undefined, filePath);
	});

    const exportOptions = ()=> {
		return {
			jsonForm: {
				"schema": {
					"maxDialogLine": {
						"title": t("Maximum dialog line"),
						"description": t('Maximum line in the dialog box. Default is 4.'),
						"type": "integer",
                        "default": trans.getOption("maxDialogLine") || 4,
					},
				},
				"form": [
					{type: "msg", "msg": "<h2>Misc Options</h2>"},
					{
						key:"maxDialogLine",
                        type: "number",
					},
				], 
                "value" : trans.getOption("exportOptions") || {},
                "onChange": function(form, id) {
					trans.setOption(id, this.getValue());
				},
			}
		}
	}

    engines.addHandler(legacyHandler.supportedEngines, "exportOptionFields", exportOptions)
    engines.addHandler(legacyHandler.supportedEngines, "injectOptionFields", exportOptions)
}

;(async ()=> {
    await this.until("mainModuleLoaded");
    legacyHandler.init();
})()
