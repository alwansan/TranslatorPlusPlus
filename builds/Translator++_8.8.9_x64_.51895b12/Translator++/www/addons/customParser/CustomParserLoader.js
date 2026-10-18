// const { ENOTEMPTY } = require('constants');
// const { emptyDir } = require('fs-extra');

var thisAddon 	= this;
var globToRegExp = require('glob-to-regexp');
var AddonUtils = require('www/js/AddonUtils.js');
var fs = require('fs');

AddonUtils(thisAddon);
thisAddon.gameEngine = "custom";
const supportedEngines = [thisAddon.gameEngine];

// const { shim } = require('regexp-match-indices');
var CustomParser = require('www/addons/customParser/CustomParser.js');
thisAddon.CustomParser = CustomParser;

thisAddon.normalizeInitOptions = async function(info = {}) {
    const normalized = {
        ...info,
        custom: {
            ...(info?.custom || {})
        }
    };

    normalized.dirpath ||= normalized.entryPoint;
    normalized.entryPoint ||= normalized.dirpath;

    if (!normalized.parserModel && normalized.tpmFile && await common.isFileAsync(normalized.tpmFile)) {
        normalized.parserModel = await common.fileGetContents(normalized.tpmFile);
    }

    normalized.projectTitle ||= nwPath.basename(normalized.dirpath || normalized.entryPoint || normalized.tpmFile || "untitled project");
    return normalized;
}

thisAddon.getCustomOptions = function(options = {}) {
    const customOptions = {
        ...(options?.projectInfo?.init?.custom || {}),
        ...(options?.taskOptions?.custom || {}),
        ...(options?.custom || {})
    };

    if (typeof options?.exportOptions?.readEncoding !== "undefined") {
        customOptions.readEncoding = options.exportOptions.readEncoding;
    }
    if (typeof options?.exportOptions?.writeEncoding !== "undefined") {
        customOptions.writeEncoding = options.exportOptions.writeEncoding;
    }

    return customOptions;
}

thisAddon.getParserModelObject = function(model) {
    if (!model) return;
    if (typeof model !== "string") return model;

    try {
        return JSON.parse(model);
    } catch (e) {
        console.warn("Invalid parser model", e);
    }
}

thisAddon.getParserModelString = async function(options = {}) {
    const parserModel = options?.init?.parserModel || options?.projectInfo?.init?.parserModel || options?.parserModel;
    if (parserModel) return parserModel;

    const tpmFile = options?.init?.tpmFile || options?.projectInfo?.init?.tpmFile;
    if (tpmFile && await common.isFileAsync(tpmFile)) {
        return await common.fileGetContents(tpmFile);
    }
}

thisAddon.findFileGroup = function(model = {}, relativePath = "") {
    const normalizedPath = relativePath.replace(/\\/g, "/");

    for (const fileGroup of model?.files || []) {
        const patterns = String(fileGroup?.pattern || "")
            .split(";")
            .map((pattern) => pattern.trim())
            .filter(Boolean);

        for (const pattern of patterns) {
            if (globToRegExp(pattern).test(normalizedPath)) {
                return fileGroup;
            }
        }
    }
}

thisAddon.resolveFileGroupOption = function(fileGroup = {}, key) {
    if (!fileGroup) return;
    fileGroup.options ||= {};
    if (!key) return fileGroup.options;

    return key.split(".").reduce((result, currentKey) => {
        if (typeof result === "undefined" || result === null) return;
        return result[currentKey];
    }, fileGroup.options);
}

thisAddon.parseFile = async function(file, basePath, options = {}) {
    const fullPath = nwPath.join(basePath, file);
    if (!await common.isFileAsync(fullPath)) {
        throw new Error("File not found " + fullPath);
    }

    const relativePath = common.getRelativePath(fullPath, basePath);
    const modelStr = await thisAddon.getParserModelString(options);
    const model = thisAddon.getParserModelObject(modelStr);
    const currentModel = thisAddon.findFileGroup(model, relativePath);
    if (!currentModel) return;

    const customOptions = thisAddon.getCustomOptions(options);
    const readEncodingObj = common.parseCharEncoding(customOptions.readEncoding || thisAddon.resolveFileGroupOption(currentModel, "readEncoding"));
    const readEncoding = readEncodingObj.name;
    const parserOptions = {
        ...options,
        custom: customOptions
    };
    const customParser = new CustomParser(await common.fileGetContents(fullPath, readEncoding, readEncodingObj.bom), parserOptions);

    customParser.charEncoding = common.getOpenedFileEncoding(fullPath);
    customParser.bom = common.getOpenedFileBom(fullPath);

    if (!customParser.processThispath(relativePath)) return;
    await ui.log("Parsing file : " + fullPath + " with encoding " + readEncoding + " and bom " + customParser.bom);

    customParser.generateFileInfo(relativePath);
    customParser.fileInfo.dataType = currentModel.type || currentModel.pattern;
    if (options.translationDatas) {
        customParser.assignTranslationPair(relativePath, options.translationDatas);
    }
    customParser.setModel(currentModel);
    await customParser.parse();
    return customParser;
}

thisAddon.resolveProjectFiles = async function(info = {}) {
    const normalized = await thisAddon.normalizeInitOptions(info);
    const loader = new thisAddon.CustomParserLoader(normalized.dirpath, normalized.parserModel, {custom: normalized.custom});
    if (!CustomParser.isValidModel(loader.model)) {
        throw new Error("Invalid parser model");
    }

    const fileSet = new Set();
    for (const fileGroup of loader.model.files) {
        await ui.log("Applying file pattern : " + fileGroup.pattern);
        const matchedFiles = await loader.getFilesByFilter(fileGroup.pattern);
        await ui.log(`${matchedFiles.length} file(s) found!`);
        for (const matchedFile of matchedFiles) {
            fileSet.add(common.getRelativePath(matchedFile, loader.dirname));
        }
    }

    return Array.from(fileSet).sort();
}

thisAddon.createProjectFromInfo = async function(info = {}) {
    const normalized = await thisAddon.normalizeInitOptions(info);
    if (!normalized.dirpath) {
        await ui.logError("No folder path specified.");
        return;
    }
    if (!normalized.parserModel) {
        await ui.logError("Parser model is not defined.");
        return;
    }

    ui.showLoading();
    ui.loadingProgress("Processing", "Creating project", {consoleOnly:false, mode:'consoleOutput'});
    await ui.log("Target directory : " + normalized.dirpath);
    if (normalized.tpmFile) {
        await ui.log("TPM file  : " + normalized.tpmFile);
    }

    const files = await thisAddon.resolveProjectFiles(normalized);
    if (!files.length) {
        await ui.logError("No files matched the parser model.");
        ui.loadingEnd();
        return;
    }

    await thisAddon.createProject(files, normalized.dirpath, {
        init: normalized,
        custom: normalized.custom
    });

    ui.log.progress("Done", "Done");
    ui.log.end();
    ui.loadingEnd();
}

thisAddon.getTransData = async function(file, basePath, options = {}) {
    const parsedFile = await thisAddon.parseFile(file, basePath, options);
    if (!parsedFile) return false;

    return {
        ...parsedFile.transData,
        dataType: parsedFile.fileInfo.dataType
    };
}

thisAddon.writeFile = async function(file, basePath, targetDir, options = {}) {
    const parsedFile = await thisAddon.parseFile(file, basePath, options);
    if (!parsedFile) return;

    const targetFile = nwPath.join(targetDir, file);
    const customOptions = thisAddon.getCustomOptions(options);
    const writeEncodingStr = customOptions.writeEncoding || parsedFile.model?.options?.writeEncoding || parsedFile.charEncoding;
    const writeEncodingObj = common.parseCharEncoding(writeEncodingStr);
    const writeEncoding = writeEncodingObj.name;

    await common.mkDir(nwPath.dirname(targetFile));
    await ui.log(`Writing ${targetFile} with char encoding ${writeEncoding}`);

    let parsedFileString = parsedFile.toString();
    if (typeof parsedFile.beforeWrite === "function") {
        const processedParsedFileString = await parsedFile.beforeWrite.call(this, parsedFileString);
        parsedFileString = processedParsedFileString || parsedFileString;
    }

    await common.filePutContents(targetFile, parsedFileString, writeEncoding, parsedFile.bom || writeEncodingObj.bom || false);
    return targetFile;
}

thisAddon.setProjectLocation = async function(transData, basePath, options = {}) {
    return options?.init?.dirpath || basePath;
}

thisAddon.afterCreateTransData = async function(transData, files, basePath, options = {}) {
    transData.project.options ||= {};
    transData.project.options.parserModel = options?.init?.parserModel;
}

thisAddon.prepareNewProject = async function(info = {}) {
    await thisAddon.createProjectFromInfo(info);
}

const CustomParserLoader = function(rootDir, modelStr, options) {
    if (common.isDir(rootDir)) {
        this.dirname = rootDir;
    } else {
        this.dirname = nwPath.dirname(rootDir);
    }
    this.modelStr   = modelStr;
    this.model      = {};
    this.options 	= options || {};
    this.writeMode 	= true;
    this.targetDir  = undefined;
    this.parsed     = {};
    this.loadModel(this.modelStr);
}

CustomParserLoader.prototype.loadModel = function(json) {
    try {
        if (typeof json == "string") json = JSON.parse(json);
    } catch {
        return;
    }
    this.model = json;
}

CustomParserLoader.prototype.getFilesByFilter = async function(filter) {
    if (!this.dirContent) this.dirContent = await common.readDir(this.dirname);
    
    filter = filter.replaceAll(" ", "");
    var filters = filter.split(";");
    var matchFilter = (path)=> {
        for (var i in filters) {
            var re = globToRegExp(filters[i]);
            if (re.test(path)) return true;
        }
    }

    var result = [];
    for (var i in this.dirContent) {
        if (!matchFilter(this.dirContent[i])) continue;
        result.push(this.dirContent[i]);
    }

    return result;
}

CustomParserLoader.prototype.getFileGroupOptions = function(filegroupObj = {}, key) {
    return thisAddon.resolveFileGroupOption(filegroupObj, key);
}

CustomParserLoader.prototype.parse = async function() {
    if (!CustomParser.isValidModel(this.model)) return console.warn("Invalid model");
    
    var handleFiles = async (files, currentModel)=> {
        for (var i in files) {
            var file = files[i];
            var charEncodingObj        = common.parseCharEncoding(this.options?.custom?.readEncoding || this.getFileGroupOptions(currentModel, "readEncoding"));
            var charEncoding        = charEncodingObj.name;
            var customParser        = new CustomParser(await common.fileGetContents(file, charEncoding, charEncodingObj.bom), this.options);
            var relativePath        = common.getRelativePath(file, this.dirname);
            customParser.charEncoding   = common.getOpenedFileEncoding(file);
            customParser.bom            = common.getOpenedFileBom(file);

            if (!customParser.processThispath(relativePath)) continue;
            await ui.log("Parsing file : "+files[i]+" with encoding "+charEncoding+" and bom "+customParser.bom);

            customParser.generateFileInfo(relativePath);
            customParser.fileInfo.dataType = currentModel.type || currentModel.pattern;
            customParser.assignTranslationPair(relativePath);
            customParser.setModel(currentModel);
            await customParser.parse();
            this.parsed[file] = customParser;
        }
    }
    
    for (var i=0; i < this.model.files.length; i++) {
        var thisFileModel   = this.model.files[i];
        await ui.log("Applying file pattern : "+thisFileModel.pattern);

        var thisFiles       = await this.getFilesByFilter(thisFileModel.pattern);
        await ui.log(`${thisFiles.length} file(s) found!`);

        if (thisFiles.length < 1) continue;
        console.log("handling files:", thisFiles);
        await handleFiles(thisFiles, thisFileModel);
    }

    this.isParsed = true;
}

thisAddon.CustomParserLoader = CustomParserLoader;

thisAddon.openModelEditor = function() {
    var options = {
        id : "pmc",
        width: 800,
        height: 600,
        title: "Parser Model Creator - Translator++"

    }
    nw.Window.open("www/addons/customParser/modelEditor/modelEditor.html", options);
}



var drawProjectCreator = function() {
	var $slide = $(`<div>
    <h1><i class="icon-plus-circled"></i><span data-tran="">Custom Parser Ver. ${thisAddon.package.version}</span></h1>
    <div class="customField"></div>

    </div>`);
    var customField;

    const libraryDir = nwPath.join(thisAddon.getLocation(), "dist");
    let libraryModels = [];
    let $customFieldForm;

    const renderLibraryDescription = (entry, $form)=> {
        if (!$form?.length) return;
        const $info = $form.find(".tpmInfo");
        if (!$info.length) return;

        if (!entry) {
            $info.html(`<p>${t("No parser model selected.")}</p>`);
            return;
        }

        const modelInfo = entry.modelInfo || {};
        const name = modelInfo.name || entry.fileName;
        const version = modelInfo.version ? ` v${modelInfo.version}` : "";
        const author = modelInfo.author ? `<p><strong>${t("Author")}</strong>: ${common.htmlEntities(modelInfo.author)}</p>` : "";
        const source = entry.path ? `<p><strong>${t("Source")}</strong>: ${common.htmlEntities(entry.path)}</p>` : "";
        const info = modelInfo.info || `<p>${t("Parser model metadata is not available.")}</p>`;
        $info.html(`<p><strong>${common.htmlEntities(name + version)}</strong></p>${author}${source}${info}`);
    };

    const updateTpmSourceUi = ($form, mode)=> {
        if (!$form?.length) return;
        const showLibrary = mode === "library";
        $form.find("select[name=tpmLibrary]").closest(".form-group, fieldset").toggleClass("hidden", !showLibrary);
        $form.find("input[name=tpmFile]").closest(".form-group, fieldset").toggleClass("hidden", showLibrary);
        const selectedPath = showLibrary
            ? $form.find("select[name=tpmLibrary]").val()
            : $form.find("input[name=tpmFile]").val();
        renderLibraryDescription(
            libraryModels.find((entry) => entry.path === selectedPath)
            || getModelEntryFromFile(selectedPath),
            $form
        );
    };

    const getModelEntryFromFile = (filePath)=> {
        if (!filePath) return;

        try {
            const model = JSON.parse(fs.readFileSync(filePath, "utf8"));
            return {
                fileName: nwPath.basename(filePath),
                path: filePath,
                modelInfo: model.modelInfo || {}
            };
        } catch (error) {
            console.warn("Unable to load TPM metadata", filePath, error);
            return {
                fileName: nwPath.basename(filePath),
                path: filePath,
                modelInfo: {}
            };
        }
    };

    const loadLibraryModels = ()=> {
        try {
            libraryModels = fs.readdirSync(libraryDir, {withFileTypes: true})
                .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".tpm"))
                .map((entry) => getModelEntryFromFile(nwPath.join(libraryDir, entry.name)))
                .sort((left, right) => left.fileName.localeCompare(right.fileName));
        } catch (error) {
            console.warn("Unable to list bundled TPM library", libraryDir, error);
            libraryModels = [];
        }
    };

    loadLibraryModels();


	ui.newProjectDialog.addMenu({
		icon 			: thisAddon.getWebLocation()+"/icon.png",
		descriptionBar 	: `<h2>${t("Parse any script with custom parser")}</h2>
                           <p>${t("Use bundled parser libraries or load your own TPM model to translate text-based formats that are not covered by the built-in engines. This is a powerful tool to let you translate any script with regular expressions or JavaScript.")}</p>
                           <p>${t("You can also choose from the pre-made parser models available in the library, such as: ass, ini, lrc, properties, sbv, srt, ssa, tsv, vtt")}</p>`,
		actionBar		: "",
		goToSlide		: thisAddon.package.name,
		at				: 9,
		slides 			: {
            customParser: ui.newProjectDialog.newSlide(thisAddon.package.name, $slide, {
                buttons: [
                    {
                        text: t("Create Project"),
                        click: async function() {
                            if (!customField) return alert("Error: customField is not defined. This should not happen!");
                            const values = customField.getValues();
                            const tpmFile = values?.tpmSourceMode === "library"
                                ? values?.tpmLibrary
                                : values?.tpmFile;

                            if (!values?.dirpath) return alert("Error: Target folder is empty.");
                            if (!tpmFile) return alert("Error: Parser model is empty.");

                            await ui.newProjectDialog.close();
                            const initOptions = await thisAddon.normalizeInitOptions({
                                dirpath: values.dirpath,
                                entryPoint: values.dirpath,
                                projectTitle: values.projectTitle,
                                tpmFile: tpmFile,
                                parserModel: await common.fileGetContents(tpmFile),
                                custom: {
                                    readEncoding: values.readEncoding
                                }
                            });
                            console.log("Options are", initOptions);
                            await thisAddon.createProjectFromInfo(initOptions);
                        }
                    }
                ],
                onActive: ()=> {
                    const libraryOptions = libraryModels.map((entry) => ({
                        value: entry.path,
                        title: entry.modelInfo.name ? `${entry.fileName} - ${entry.modelInfo.name}` : entry.fileName
                    }));

                    customField = new CustomFields($("<form></form>"), {
                        jsonForm: {
                            schema: {
                                tpmSourceMode: {
                                    type: "string",
                                    title: t("Parser Model Source"),
                                    enum: [
                                        {
                                            value: "library",
                                            title: t("Select from existing library")
                                        },
                                        {
                                            value: "file",
                                            title: t("Select TPM File")
                                        }
                                    ],
                                    default: libraryOptions.length > 0 ? "library" : "file"
                                },
                                tpmLibrary: {
                                    type: "string",
                                    title: t("Library Model"),
                                    enum: libraryOptions.map((entry) => entry.value),
                                    required: libraryOptions.length > 0
                                },
                                tpmFile: {
                                    type: "string",
                                    title: t("TPM File"),
                                    description: t("Select a Translator++ Parser Model (.tpm) file from disk."),
                                    required: true
                                },
                                dirpath: {
                                    type: "string",
                                    title: t("Target Folder"),
                                    description: t("Select the folder that contains the files to parse."),
                                    required: true
                                },
                                projectTitle: {
                                    type: "string",
                                    title: t("Project Title"),
                                    description: t("Project title for the new translation project.")
                                },
                                readEncoding: {
                                    title: t("Read Character encoding"),
                                    description: t(`List of the possible character encodings. <b>Order does matter!</b>. Separate each value with a comma.<br />Translator++ will read the original file with the following encodings, patch the files and write with the <b>Write Character encoding</b> option. Leave blank to use the original character encoding when the project is created.`)+
                                        `<br />${t("For BOM support, add a space after the encoding. Example: <code>utf8 bom</code>")}`+
                                        `<br />${t("Example: utf8,utf8 bom,utf16le,ascii")}`,
                                    type: "string",
                                    default: ""
                                }
                            },
                            form: [
                                {
                                    type: "info",
                                    value: `
                                        <h2>${t("Custom Parser Project")}</h2>
                                        <p>${t("Use this when your files are not covered by the built-in engines. A TPM tells Translator++ where text lives in your files and how to put it back after translation.")}</p>
                                        <p>${t("You can start with one of the bundled parser libraries, load a TPM from disk, or open the TPM editor and make your own.")}</p>
                                        <p>${t("To begin, pick a parser model, choose the folder that contains the files you want to process, then click Create Project. If needed, you can also set a project title and read encoding below.")}</p>
                                        <p><button type="button" class="openTpmEditor"><i class="icon-edit"></i> ${t("Open TPM Editor")}</button></p>
                                    `
                                },
                                {
                                    key: "tpmSourceMode",
                                    type: "radiobuttons",
                                    activeClass: "btn-success",
                                    onChange: function(evt) {
                                        const $form = $(evt.target).closest("form");
                                        updateTpmSourceUi($form, $(evt.target).val());
                                    }
                                },
                                {
                                    key: "tpmLibrary",
                                    type: "select",
                                    titleMap: Object.fromEntries(libraryOptions.map((entry) => [entry.value, entry.title])),
                                    onChange: function(evt) {
                                        const $form = $(evt.target).closest("form");
                                        const selectedPath = $(evt.target).val();
                                        const entry = libraryModels.find((item) => item.path === selectedPath);
                                        if (entry && !$form.find("input[name=projectTitle]").val()) {
                                            $form.find("input[name=projectTitle]").val(entry.modelInfo.name || common.getFilename(entry.fileName));
                                        }
                                        renderLibraryDescription(entry, $form);
                                    }
                                },
                                {
                                    key: "tpmFile",
                                    type: "selectfile",
                                    accept: ".tpm",
                                    onChange: function(evt) {
                                        const $form = $(evt.target).closest("form");
                                        const selectedPath = $(evt.target).val();
                                        const entry = getModelEntryFromFile(selectedPath);
                                        if (entry && !$form.find("input[name=projectTitle]").val()) {
                                            $form.find("input[name=projectTitle]").val(entry.modelInfo.name || common.getFilename(entry.fileName));
                                        }
                                        renderLibraryDescription(entry, $form);
                                    }
                                },
                                {
                                    key: "dirpath",
                                    type: "selectdir",
                                    onChange: function(evt) {
                                        const $form = $(evt.target).closest("form");
                                        const currentTitle = $form.find("input[name=projectTitle]").val();
                                        if (!currentTitle) {
                                            $form.find("input[name=projectTitle]").val(nwPath.basename($(evt.target).val() || ""));
                                        }
                                    }
                                },
                                {
                                    type: "info",
                                    value: `<p>${t("No parser model selected.")}</p>`,
                                    htmlClass: "tpmInfo"
                                },
                                {type: "msg", msg: "<h2>Misc Options</h2>"},
                                "projectTitle",
                                "readEncoding"
                            ]
                        }
                    });

                    $slide.find(".customField").empty().append(customField.getElm());
                    $customFieldForm = $slide.find(".customField form");
                    $customFieldForm.find(".openTpmEditor").off("click").on("click", function() {
                        thisAddon.openModelEditor();
                    });

                    const defaultLibraryPath = libraryOptions[0]?.value || "";
                    if (defaultLibraryPath) {
                        $customFieldForm.find("select[name=tpmLibrary]").val(defaultLibraryPath);
                    }

                    const initialMode = libraryOptions.length > 0 ? "library" : "file";
                    updateTpmSourceUi($customFieldForm, initialMode);
                }
            })
        }
	})

}

function init() {
    drawProjectCreator();

    var $newMenu = ui.mainMenu.addChild("tools", {
        label:"Create Custom Parser Model"
    });

    $newMenu.on("select", function() {
        thisAddon.openModelEditor();
    })


	engines.addHandler(supportedEngines, "onLoadTrans", 
	() => {
        // do something for custom translator
	});

    AddonUtils.applyCommonHandlers(supportedEngines, thisAddon);

    engines.addHandler(supportedEngines, 'onLoadSnippet', async function(selectedCell) {

		trans.getSelectedObject();
		this.commonHandleFile(selectedCell, "plain");

	});	

    engines.getEngine("custom").addProperty("exportOptionFields", ()=> {
		return {
			jsonForm: {
				"schema": {
					"readEncoding": {
						"title": "Read Character encoding",
						"description": "List of the possible character encodings. <b>Order does matter!</b>. Separate each value with a comma.<br />Translator++ will read the original file with the following encodings, patch the files and write with the <b>Write Character encoding</b> option. Leave blank to use the original character encoding when the project is created.",
						"type": "string",
						"default" :  ""
					},
					"writeEncoding": {
						"title": "Write Character encoding",
						"description": t('Select the target character encoding.'),
						"type": "string",
						"default" :  "",
						"enum" :  [
                            "",
                            "utf8",
                            "utf8 bom",
                            "utf16le",
                            "UTF-16",
                            "UTF-16BE",
                            "ascii",
                            "ISO-8859-1",
                            "ISO-8859-16",
                            "koi8-r",
                            "koi8-u",
                            "koi8-ru",
                            "koi8-t",
                            "Shift_JIS",
                            "Windows-31j",
                            "Windows932",
                            "EUC-JP",
                            "GB2312",
                            "GBK",
                            "GB18030",
                            "Windows936",
                            "EUC-CN",
                            "KS_C_5601",
                            "Windows949",
                            "EUC-KR",
                            "Big5",
                            "Big5-HKSCS",
                            "Windows950"
                        ]					
					},
				},
				"form": [
					{type: "msg", "msg": "<h2>Misc Options</h2>"},
					"*",
				]
			}
		}
	})
}


$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});