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
const pLimit	= require("p-limit");
/**
 * Represents a utility class for addons.
 * @constructor
 * @param {Object} objectToApply - The object to apply the utility methods and properties to.
 * @param {boolean} [override=false] - Indicates whether to override existing properties in the object.
 */
const AddonUtils = function(objectToApply={}, override = false) {
    if(new.target === undefined) {
        // if called directly
        return new AddonUtils(objectToApply, override)
    }

    this.alwaysExportFromStage = false;
    this.workerNum  = 4;
    this.defaultInjectCopyOption = "copyIfNotExist"

    if (objectToApply) {
        for (let i in this) {
            if (!override) {
                if (typeof objectToApply[i] !== "undefined") continue;
            } else {
                if (typeof objectToApply[i] !== "undefined") console.log("%cOverriding", "color:yellow", i)
            }
            if (typeof this[i] == "function") {
                objectToApply[i] = this[i].bind(objectToApply);
            } else {
                objectToApply[i] = this[i];
            }
        }
    }
}
/**
 * Object representing translation data.
 * @typedef {Object} TransData
 * @property {string[][]} data - An array of arrays of strings representing translation data.
 * @property {string[][]} context - An array of arrays of strings representing context data.
 * @property {string[][]} tags - An array of arrays of strings representing tags data.
 * @property {Object[]} parameters - An array of objects representing parameters data.
 * @property {Object} indexIds - An object representing index IDs.
 */

/**
 * Retrieves translation data for a given file.
 * @async
 * @function getTransData
 * @memberof AddonUtils
 * @param {string} file - The name of the file.
 * @param {string} basePath - The base path for the file.
 * @param {Object} [options={}] - Additional options.
 * @returns {Promise<TransData|Boolean>} A promise resolving to the file data object containing data, context, tags, parameters, and indexIds.
 */
AddonUtils.prototype.getTransData = async function(file, basePath, options={}) {
    // replace with your logic
    // should return fileData object
    const transData = {
        "data": [[]],
        "context": [[]],
        "tags": [],
        "parameters": [],
        "indexIds": {}
    }
    return transData;
}

/**
 * Writes a file with given translation.
 * @async
 * @function writeFile
 * @memberof AddonUtils
 * @param {string} file - The name of the file.
 * @param {string} basePath - The base path for the file.
 * @param {string} targetDir - The target directory.
 * @param {Object} [options={}] - Additional options.
 * @returns {Promise<string>} A promise resolving to the path of the written file.
 */
AddonUtils.prototype.writeFile = async function(file, basePath, targetDir, options={}) {
    // replace with your logic
    return nwPath.join(basePath, file)
}

/**
 * Creates translation data for multiple files.
 * @async
 * @function createTransData
 * @memberof AddonUtils
 * @param {string[]} files - An array of file names.
 * @param {string} basePath - The base path for the files.
 * @param {Object} [options={}] - Additional options.
 * @returns {Promise<TransData>} A promise resolving to the translation data object.
 */
AddonUtils.prototype.createTransData = async function(files, basePath, options={}) {
    await this.beforeCreateTransData(files, basePath, options);
    const transFiles = {}
    const queue = []
    const limit = pLimit(this.workerNum || 4);
    ui.log(`Processing with ${this.workerNum || 4} concurrent worker(s).`);
    for (let file of files) {
        queue.push(limit(async ()=>{
            let thisFileData = await this.getTransData(file, basePath, options) || {};
            console.log(`%c getTransData result ${file}:`, "color:green", thisFileData);
            // skip if no value is presents
            if (!thisFileData) return;
            let thisFileObj = trans.createFileData(file, {
                    originalFormat: await this.setFileFormatName(file, basePath, options) || "Translator++ Original Format"
                }, 
                {
                    leadSlash:true
                }
            );
            transFiles[thisFileObj.path] = {...thisFileObj, ...thisFileData};
        }));
    }

    await Promise.all(queue);


    const transData = trans.initTransData()
    console.log("%c initializing trans data", "color:aqua");
    transData.project.gameEngine    = await this.setEngineName(transData, basePath, options) || this.gameEngine,
    transData.project.files         = common.sortObjectByKey(transFiles);
    transData.project.parser        = this.parserName || this.package?.name,
    transData.project.parserVersion = this.parserVersion || this.package?.version,
    transData.project.options.init  = options.init;

    transData.project.gameTitle = await this.setProjectTitle(transData, basePath, options);

    await this.afterCreateTransData(transData, files, basePath, options);
    return transData
}

AddonUtils.prototype.setFileFormatName = async function(file, basePath, options={}) {
    const ext = nwPath.extname(file);
    if (ext) {
        return  ext.substr(1).toUpperCase()+" file"
    }
    return;
}

AddonUtils.prototype.setEngineName = async function(transData, basePath, options={}) {
    return;
}

AddonUtils.prototype.setProjectTitle = async function(transData, basePath, options={}) {
    return options?.init?.projectTitle || "untitled project";
}

AddonUtils.prototype.setProjectLocation = async function(transData, basePath, options={}) {
    // add with your logic
    return;
}
AddonUtils.prototype.finalizeTransData = async function(transData, basePath, options={}) {
    // add with your logic
    return transData;
}


/**
 * Creates a project based on provided files and options.
 * @async
 * @function createProject
 * @memberof AddonUtils
 * @param {string[]} files - An array of file names.
 * @param {string} basePath - The base path for the files.
 * @param {Object} [options={}] - Additional options.
 * @returns {Promise<Object>} A promise resolving to the created project data.
 */
AddonUtils.prototype.createProject = async function(files, basePath, options={}) {
    console.log("Creating project with args", arguments);

    var transData = await this.createTransData.call(this, files, basePath, options);

    ui.log("Create staging data")
    var stagingInfo;
    if (options.noCache) {
        stagingInfo = await common.initStaging(transData.project.projectId, options?.init?.projectTitle, {noCache:true});
    } else {
        stagingInfo = await common.initStaging(transData.project.projectId, options?.init?.projectTitle, {...options.init, ...{basePath:basePath, files:files}});
    }
    console.log("stagging Info :", stagingInfo);
    transData.project.cache = stagingInfo;
    transData.project.loc ||= (await this.setProjectLocation(transData, basePath, options)) || basePath;
    console.log("transData:", transData);

    transData = (await this.finalizeTransData(transData, basePath, options)) || transData;

    trans.openFromTransObj(transData, {isNew: true});
    return transData;
}

AddonUtils.prototype.selectTranslationData = function(translationDatas, path) {
    const blankResult = {
        info:{},
        translationPair:{}
    }
    if (!translationDatas?.translationData?.[path]) return blankResult;
    return translationDatas.translationData[path];
}

AddonUtils.prototype.beforeCreateTransData = async function(files, basePath, options) {
    // replace with your logic
}

AddonUtils.prototype.afterCreateTransData = async function(transData, files, basePath, options) {
    // replace with your logic
}

AddonUtils.prototype.beforeExportToFolder = async function(destinationDir, transData, options) {
    // replace with your logic
}
AddonUtils.prototype.afterExportToFolder = async function(exportResult, destinationDir, transData, options) {
    // replace with your logic
}

/**
 * Exports translation data to a folder.
 * @async
 * @function exportToFolder
 * @memberof AddonUtils
 * @param {string} destinationDir - The directory to export to.
 * @param {Object} [transData] - The translation data object. If not provided, fetched from the current context.
 * @param {Object} [options={}] - Additional options.
 * @returns {Promise<string[]>} A promise resolving to an array of exported file paths.
 */
AddonUtils.prototype.exportToFolder = async function(destinationDir, transData, options) {
    console.log("Export to folder with arguments", arguments);

	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.translationDatas = options.translationDatas || trans.getTranslationData(transData, options);
    options.resourcePath ||= trans.getStagingDataPath(transData);

    if (this.originalResourceIsReadOnly) {
        if (options.mode == "dir" && nwPath.resolve(destinationDir) == nwPath.resolve(transData?.project?.loc || "")) {
            ui.log.error("Trying to export into the original material location "+transData?.project?.loc);
            throw new Error("Cannot export to the same directory as the resource material!");
        }
    }

    // if none is selected then select all except references
    if (!options.files?.length) options.files = trans.getAllFiles(transData, true);
    await this.beforeExportToFolder(destinationDir, transData, options);

    const queue = []
    const limit = pLimit(this.workerNum || 4);
    const result = []
    for (let file of options.files) {
        if (!file.includes("::")) {
            // skip file check if it's a reference
            if (!await common.isFileAsync(nwPath.join(options.resourcePath, file))) {
                ui.logError("File not found: "+nwPath.join(options.resourcePath, file));
                continue;
            }
        }

        queue.push(limit(async ()=>{
            let thisOptions = {
                translationDatas: options.translationDatas,
                parserOptions: {
                    writeMode: true,
                },
                projectInfo: {
                    init: transData?.project?.options?.init
                },
                exportOptions: options.exportOptions,
                // options of the inject / export
                taskOptions: options,
            }
            let thisResult = await this.writeFile(file, options.resourcePath, destinationDir, thisOptions);
            result.push(thisResult)
        }));
    }
    
    await Promise.all(queue);
    await this.afterExportToFolder(result, destinationDir, transData, options);
    return result;
}

/**
 * Exports translation data as a zip file.
 * @async
 * @function exportAsZip
 * @memberof AddonUtils
 * @param {string} targetPath - The target path for the zip file.
 * @param {Object} [transData] - The translation data object. If not provided, fetched from the current context.
 * @param {Object} [options={}] - Additional options.
 * @returns {Promise<string>} A promise resolving to the path of the created zip file.
 */
AddonUtils.prototype.exportAsZip = async function(targetPath, transData, options) {
	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.translationDatas = options.translationDatas || trans.getTranslationData(transData, options);
    options.resourcePath ||= trans.getStagingDataPath(transData);

	var tmpPath 	= nwPath.join(nw.process.env.TMP, transData.project.projectId);
	await ui.log("Generating a temporary folder", tmpPath);

    const fse = require("fs-extra");
	try {
		await fse.remove(tmpPath); 
		await common.mkDir(tmpPath, {recursive:true});
	} catch(e) {
		console.warn("Unable to create directory ", tmpPath);
		console.error(e);
		return;
	}

	await ui.log("Exporting to a temporary folder", tmpPath);
    await this.exportToFolder(tmpPath, transData, options);
	await ui.log("Data exported to the temp dir");

	await ui.log("Zipping temporary data");
	var _7z = require('7zip-min');
	return new Promise((resolve, reject) => {
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+"\\*"], err => {
			resolve(targetPath);
		});	
	})
}


/**
 * Handles exporting translation data based on the specified mode.
 * @async
 * @function handleExport
 * @memberof AddonUtils
 * @param {string} targetPath - The target path for the exported data.
 * @param {Object} options - Export options.
 * @param {string} options.mode - The export mode ('zip' or 'directory').
 * @returns {Promise<void>} A promise resolving when export is completed.
 */
AddonUtils.prototype.handleExport = async function(targetPath, options) {
    ui.showLoading();
    try {
        if (options.mode == "zip") {
            ui.loadingProgress("Processing", "Exporting as a zip", {consoleOnly:false, mode:'consoleOutput'});
            ui.log("Target path: ", targetPath);
            ui.log("Exporting with options: ", options);

            await this.exportAsZip(targetPath, undefined, options);
        } else if (options.mode == "dir") {
            ui.loadingProgress("Processing", "Exporting to directory", {consoleOnly:false, mode:'consoleOutput'});
            ui.log("Target directory: ", targetPath);
            ui.log("Exporting with options: ", options);
        
            await this.exportToFolder(targetPath, undefined, options);
        } 
    } catch (e) {
        throw new Error(e);
    }
    ui.loadingProgress("Completed", "Completed!", {consoleOnly:false, mode:'consoleOutput'});
    await ui.log.showOpenDirButton(targetPath);
    ui.loadingEnd();

}

/**
 * Change this method if you want to change the targetDir;
 */
AddonUtils.prototype.injectGetTargetExportDir = async function(targetDir, sourceMaterial, options) {
    return targetDir;
}

AddonUtils.prototype.injectCopyMaterials = async function(sourceDir, targetDir, injectOption) {
    const bCopy = require("better-copy");

    injectOption.copyOptions ||= this.defaultInjectCopyOption;
    if (injectOption.copyOptions == "copyNothing") return;

    await ui.log(`Copy ${sourceDir} to ${targetDir}`);
    await ui.log("Copy option:"+injectOption.copyOptions);

    var overWrite = true;
    if (injectOption.copyOptions == "copyIfNotExist") overWrite = false;
    await ui.log("Overwrite?: "+overWrite.toString());
    await bCopy(sourceDir, targetDir, {
        onBeforeCopy: async (from, to) => {
            await ui.log(`Start copying ${from}`);
        },
        onAfterCopy: async (from, to) => {
            await ui.log(`Successfully copied into ${to}`);
        },
        overwrite: overWrite
    });

}

AddonUtils.prototype.injectDone = async function(targetDir, sourceMaterial, options) {
    // do something here
    if (typeof this.afterInject == "function") {
        await this.afterInject(targetDir, sourceMaterial, options);
    }
    ui.loadingProgress("Completed", "Completed!", {consoleOnly:false, mode:'consoleOutput'});
    await ui.log.showOpenDirButton(targetDir);
    ui.log.end();

    return common.halt();
}

AddonUtils.getEntryPoint = function(transData) {
    // get entry point from a valid trans data.
    return transData?.project?.options?.init?.entryPoint;
}

/**
 * Updates the project by re-running project creation from the same init options and
 * then importing all existing translation data back in.
 * Requires the addon to define a `prepareNewProject(info)` method.
 * @async
 */
AddonUtils.prototype.updateProject = async function() {
    if (typeof this.prepareNewProject !== 'function') {
        ui.alert(t("This add-on does not support automatic project update."));
        return;
    }

    const confirmed = confirm(t("Update project from source?\n\nThis will recreate the project from the original source files and re-import your existing translations.\nThe current project will be saved before updating."));
    if (!confirmed) return;

    // 1. Save current project first so data is not lost
    if (trans.currentFile) {
        await trans.save(trans.currentFile);
    }

    // 2. Capture translation data and creation options before project is replaced
    const oldTransData = trans.getSaveData();
    const initOptions = JSON.parse(JSON.stringify(trans.project?.options?.init || {}));

    // Log the refresh target so users can confirm which game is being processed
    ui.showLoading();
    await ui.log(t("Refreshing project"));
    if (trans.gameTitle) await ui.log(t("Game title:") + " " + trans.gameTitle);
    if (trans.gameEngine) await ui.log(t("Engine:") + " " + trans.gameEngine);
    if (initOptions.entryPoint) await ui.log(t("Game path:") + " " + initOptions.entryPoint);

    // 3. Recreate the project from the same source without showing a dialog
    await this.prepareNewProject(initOptions);

    // 4. Import all data from the old project into the freshly created one.
    // getAllFiles on the newly-loaded project gives us all file IDs without
    // depending on UI checkbox state (getCheckedFiles returns [] on a fresh open).
    const newFileIds = trans.getAllFiles(trans.getSaveData(), true);
    await trans.importCompleteRowData(oldTransData, {
        destination        : newFileIds,
        crossMatch         : false,
        importCells        : true,
        importTags         : true,
        importNotes        : true,
        importContextTrans : true,
        importCellInfo     : true,
        importOverwrite    : true,
    });

    // 5. Notify user to save as a new file
    ui.alert(t("Project updated successfully. Your translations have been transferred to the new project.\nIt is recommended to save this as a new file to keep the previous version."));
};

// Static
AddonUtils.applyCommonHandlers = function(supportedEngines, thisAddon) {
    const self = this;
    engines.addHandler(supportedEngines, 'exportHandler', async function(targetPath, options) {
        if (options.mode !== "dir" && options.mode !== "zip") return false;

        try   {
            await thisAddon.handleExport(targetPath, options);
        } catch (e) {
            ui.log.error(e.toString());
            ui.log.error("Export failed!");
            ui.log.end();
            return common.halt();
        }

        // show button
        // if (await common.isDir(targetPath)) {
        //     ui.log.addButton("Open Output Directory", function() {
        //         nw.Shell.openItem(targetPath);
        //     },
        //     {
        //         class: "icon-folder-open"
        //     });
        // } else if (await common.isFileAsync(targetPath)) {
        //     ui.log.addButton("Open Output File", function() {
        //         nw.Shell.showItemInFolder(targetPath);
        //     },
        //     {
        //         class: "icon-folder-open"
        //     });
        // }
        return common.halt();
    })

    engines.addHandler(supportedEngines, 'onOpenInjectDialog', async function($dialogInject, options) {
        $dialogInject.find(".copyOptionsBlock").removeClass("hidden")
    })

    engines.addHandler(supportedEngines, 'injectHandler', async function(targetDir, sourceMaterial, options) {
        ui.showLoading();
        ui.loadingProgress("Processing", "Injecting to directory", {consoleOnly:false, mode:'consoleOutput'});
        ui.log("Target directory: ", targetDir);
        ui.log("Source Material: ", sourceMaterial);
        if (sourceMaterial) ui.log("Warning: The app will try to apply translations to the files with the exact match relative location.");
        
        await thisAddon.injectCopyMaterials(sourceMaterial, targetDir, options);
        ui.log("Injecting with options: ", options);
        
        console.log("self.alwaysExportFromStage", thisAddon.alwaysExportFromStage);
        if (!thisAddon.alwaysExportFromStage) {
            options.resourcePath = sourceMaterial;
        }

        let adaptedTargetDir = targetDir;
        if (typeof thisAddon.injectGetTargetExportDir === "function") {
            adaptedTargetDir = (await thisAddon.injectGetTargetExportDir(targetDir, sourceMaterial, options)) || targetDir;
        }

        await thisAddon.exportToFolder(adaptedTargetDir, undefined, options);

        return await thisAddon.injectDone(targetDir, sourceMaterial, options)
	});

    engines.addHandler(supportedEngines, 'updateProjectHandler', async function() {
        await thisAddon.updateProject();
        return common.halt();
    });
}

module.exports = AddonUtils;