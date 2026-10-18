const thisAddon	= this;
const pLimit	= require("p-limit");
const AddonUtils        = require("www/js/AddonUtils.js");
thisAddon.gameEngine    = "rm2k-3"
thisAddon.supportedEngines  = ["2k", "2k3"];
AddonUtils(thisAddon);
thisAddon.alwaysExportFromStage = true;
// thisAddon.createProject = AddonUtils.createProject;
// thisAddon.exportToFolder = AddonUtils.exportToFolder;
// thisAddon.exportAsZip = AddonUtils.exportAsZip;
// thisAddon.handleExport = AddonUtils.handleExport;

// thisAddon.workerNum = 4;


const Rm2kUtils = require(nwPath.join(thisAddon.getRelativePath(), "Rm2kUtils.js"));
thisAddon.RPGM_EVENT_CODE = Rm2kUtils.RPGM_EVENT_CODE;



thisAddon.codeToString = function(code) {
	if (thisAddon.RPGM_EVENT_CODE[code]) return thisAddon.RPGM_EVENT_CODE[code];
	return code
}

thisAddon.convertEncodingName = function(encName) {
    // convert char encoding to the more known name
    encName ||= "";

    const conf = {
        "Shift_JIS" : ["943", "932", "windows-31J", "50220"],
        "utf8": ["5348"],
        "Windows936": ["936"]
    }

    encName ||= "";
    encName = encName.toLowerCase();
    encName = encName.replaceAll("_", "-");
    
    for (let enc in conf) {
        for (let pattern of conf[enc]) {
            if (encName.includes(pattern)) return enc;
        }
    }
}

thisAddon.detectEncoding = async function(gameDir) {
    if (await common.isFile(gameDir)) {
        gameDir = nwPath.dirname(gameDir);
    }

    // capture msg on stderr
    var captureMsg = []
    await common.aSpawn(nwPath.join(thisAddon.getLocation(), "bin", "lcfviz.exe"), [gameDir], {
        onError: (msg)=> {
            captureMsg.push(msg.toString());
        }
    });
    const lines = (captureMsg[0] || "").split("\n")
    const result = lines[0].replace("Using encoding ", "");
    const rawEncoding = result.trim();

    return this.convertEncodingName(rawEncoding);
}


thisAddon.getType = async function(path) {
	var dir = path
	if (await common.isFileAsync(path)) {
		dir = nwPath.dirname(path);
	}

    if (!await common.isFileAsync(nwPath.join(dir, "RPG_RT.ini"))) {
        return "";
    }

	if (common.isDir(nwPath.join(dir, "System2"))) return "2k3";
	return "2k";
}

thisAddon.toXml = async function(file, targetDir, type, encoding="utf8") {
	if (!type) {
		type = await this.getType(file);
	}
	if (!await common.isDir(targetDir)) await common.mkDir(targetDir);
	let command =  [`--${type}`, `${file}`];
    if (encoding !== "auto") {
        command = [`--${type}`, "--encoding", encoding, `${file}`];
    }
	await common.aSpawn(nwPath.join(thisAddon.getLocation(), "bin/new", "lcf2xml.exe"), command, {cwd: targetDir});
}

thisAddon.toXmls = async function(files, baseDir, targetDir, type, encoding="utf8") {
    const limit = pLimit(this.workerNum || 4);
    ui.log(`Extracting with ${this.workerNum || 4} concurrent worker(s).`);
    const queue = []
    for (let file of files) {
        queue.push(limit(async ()=>{
            const path = nwPath.join(baseDir, file);
            await thisAddon.toXml(path, targetDir, type, encoding);
        }));
    }

    await Promise.all(queue);
    return files;
}


thisAddon.toRmbin = async function(file, targetDir, type, encoding="utf8") {
	if (!type) {
		throw new Error("Type is required");
	}
    if (file.charAt(0) == "/" || file.charAt(0) == "\\") {
        file = file.substr(1);
    }

	if (!await common.isDir(targetDir)) await common.mkDir(targetDir);
	const command = [`--${type}`, "--encoding", encoding, `${file}`]
	await common.aSpawn(nwPath.join(thisAddon.getLocation(), "bin/new", "lcf2xml.exe"), command, {cwd: targetDir});
    if (nwPath.extname(file) == "emu") {
        return common.changeExtension(file, "lmu");
    } else if (nwPath.extname(file) == "edb") {
        return common.changeExtension(file, "ldb");
    } else if (nwPath.extname(file) == "emt") {
        return common.changeExtension(file, "lmt");
    } else if (nwPath.extname(file) == "esd") {
        return common.changeExtension(file, "lsd");
    }
}

thisAddon.recompileLMT = async function(targetDir, type, sourceEncoding="utf8", targetEncoding="utf8") {
    console.log("recompileLMT", targetDir, type, sourceEncoding);
    const lmtFile = nwPath.join(targetDir, "RPG_RT.lmt");
    const file = "RPG_RT.lmt";
    if (!await common.isFileAsync(lmtFile)) return console.warn("File not found", lmtFile);
    await thisAddon.toXmls([file], targetDir, targetDir, type, sourceEncoding);
    const xmlFile = common.changeExtension(lmtFile, "emt");
    console.log("Compiling", xmlFile);
    await thisAddon.toRmbin(xmlFile, targetDir, type, targetEncoding);
    await common.unlink(xmlFile);
}

thisAddon.setFileFormatName = async function(file, basePath, options) {
    if (nwPath.extname(file) == ".ini") {
        return "INI file";
    } else {
        return "lcf2xml XML data";
    }
}

thisAddon.setEngineName = async function(transData, basePath, options={}) {
    console.log("%c setEngineName", "color:aqua", arguments, "from init", options?.init?.gameType);
    return options?.init?.gameType;
}

thisAddon.xmlTransConfig = {
    config: [
        {
            queryString : "event_commands string",
            onBeforeRegisterString : function(text, context, targetElm, configuration, options) {
                var $targetElm = $(targetElm);
                var code = parseInt($targetElm.find("code").text());
                //console.log("this event code is : ", code);
                const codeStr = thisAddon.codeToString(code);
                context.push("code", codeStr);

                // adding default tags
                if ([10130, 11110, 10220, 10630, 10640, 10650, 10660, 10670, 10680, 10710, 
                    11510,11550, 11560, 11720].includes(code)) {
                    options.tags = ["red"]
                } else if ([10140].includes(code)) {
                    options.tags = ["blue"]
                }

                // skips notes as it will not affect gameplay in 2k & 2k3 
                if ([12410, 22410].includes(code)) return undefined; 
                if (code == 20110) {
					const previousCommand = $targetElm.prev("event_commands")[0];
					const previousMessage = this.translatableTexts[this.translatableTexts.length - 1];
					if (!previousMessage || !previousMessage.elm.includes(previousCommand)) {
						return text;
					}
                    // process 20110 further
                    this.appendString("\n"+text, undefined, targetElm);
                    return undefined;
                }
                return text;
            },
            getTranslatableElement : function(elm) {
                var $elm = $(elm);
                return $elm.parent()[0]; // return parent instead of self element
            },
            translateElement : function(elm, text, config) {
                console.log("translating element", elm, text);
                var $elm = $(elm)
                var code = $elm.eq(0).find("code").text()
                if (code !== "10110" && code !== "20110") {
                    $(elm).find("string").text(text);
                    return $(elm)[0];
                }
                
                // split message by line and then generates interpreter object
                var texts = text.split("\n");
                for (let i=0 ; i<texts.length; i++) {
                    var $thisElm = $(elm[0]).clone(true, true);
                    if (i%4 !== 0)  {
                        $thisElm.find('code').text("20110");
                    } 
                    $thisElm.find('string').text(texts[i]);
                    $thisElm.insertBefore($elm.eq(0))
                }
                
                for (let i=0; i<elm.length; i++) {
                    $(elm[i]).remove();
                }
                
            }
            
        },
        {
            queryString : "name, description, terms>Terms>*, states message_actor, states message_enemy, states message_already, states message_affected, states message_recovery, skills using_message1,  skills using_message2, actors title",
        }
    ],
    onBeforeWrite :function(string) {
        return string.replace(/<(.*?)\s?\/>/g, '<$1></$1>')
    },
    // translationPair : options.translationPair,
    // translationInfo : options.translationInfo,
    // writeEncoding	: this.writeEncoding,
    // writeUseBom		: this.writeUseBom,
}


thisAddon.getTransDataIni = async function(file, basePath, options={}) {
    console.log("%c getTransDataIni", "color:aqua", arguments);
    const ini = require("ini");
    const iniData = ini.parse(await common.fileGetContents(nwPath.join(basePath, file), options?.init?.characterEncoding ||"utf8"));

    return await TranslatableObject.generate(iniData, true);
}

thisAddon.getTransData = async function(file, basePath, options={}) {
    console.log("getTransData", arguments);
    if ([".emu", ".edb", ".emt"].includes(nwPath.extname(file))) {
        const xmlTrans = new addonLoader.addons.xmlTrans.XmlTrans(nwPath.join(basePath, file), thisAddon.xmlTransConfig);
        await xmlTrans.parse();
        console.log("%c Parsed xmlTrans", "color:navy", xmlTrans);
        return xmlTrans.transData;
    } else if ([".ini"].includes(nwPath.extname(file))){
        // ini file
        return this.getTransDataIni(file, basePath, options);
    }
}

thisAddon.prepareNewProject = async function(info = {}) {
    ui.showLoading();
    ui.loadingProgress("Processing", "Creating a new RM2k / RM2k3 translation project.", {consoleOnly:false, mode:'consoleOutput'});

    const basePath = nwPath.dirname(info.entryPoint);

    this.setProjectLocation = () => {
        return basePath;
    }

    const extractPath = nwPath.join(basePath, "_extract");
    await common.mkDir(extractPath);
    await common.copyFile( nwPath.join(basePath, "RPG_RT.ini"), nwPath.join(extractPath, "RPG_RT.ini"));
    const lmuFiles = await common.glob("*.lmu", {cwd:basePath});

    // add ldb file
    lmuFiles.push("RPG_RT.ldb");

    // add lmt file
    lmuFiles.push("RPG_RT.lmt");

    console.log("info", info);
    console.log("lmuFiles", lmuFiles);
    
    await this.toXmls(lmuFiles, basePath, extractPath, info.gameType, info.characterEncoding);
    

    await thisAddon.createProject(await common.glob("*.*", {cwd:extractPath}), extractPath, {
        init:info
    });
    
    await ui.log.progress("Done!", "Done!")
    ui.log.end();

}


thisAddon.writeFileIni = async function(file, basePath, targetDir, options={}) {
    console.log("%c writeFileIni", "color:aqua", arguments);
    const ini = require("ini");
    const iniData = ini.parse(await common.fileGetContents(nwPath.join(basePath, file), options.projectInfo.init.characterEncoding ||"utf8"));
    
    const parserOptions = {};
    parserOptions.translationPair = options.translationDatas?.translationData?.[file]?.translationPair||{}
    parserOptions.translationInfo = options.translationDatas?.translationData?.[file]?.info||{}

    console.log("parserOptions", parserOptions);

    iniData.RPG_RT 			||= {};
    iniData.RPG_RT.Encoding ||= 932
    const translatable = new TranslatableObject(iniData, parserOptions);

    const translatedIni = await translatable.translate();

    console.log("translated INI", translatedIni);
    await common.filePutContents(nwPath.join(targetDir, file), ini.stringify(translatedIni), "utf8", false);

    return file;
}

thisAddon.writeFile = async function(file, basePath, targetDir, options={}) {
    console.log("Writing file", arguments);

    await ui.log(`Writing ${file}`);
    if ([".emu", ".edb", ".emt"].includes(nwPath.extname(file))) {
        let thisConfig = {...thisAddon.xmlTransConfig, ...{
            // translationPair : options.translationPair,
            // translationInfo : options.translationInfo,
            writeEncoding	: this.writeEncoding,
            writeUseBom		: this.writeUseBom,
        }};
        const fullPath      = nwPath.join(basePath, file);
        const targetFile    = nwPath.join(targetDir , file);
        const parser = new addonLoader.addons.xmlTrans.XmlTrans(fullPath, thisConfig);
        parser.assignTranslationPair(file, options.translationDatas);
        await parser.parse();
        console.log("%c parser", "color:aqua", parser);
        await parser.write(targetFile);
        const type = options.projectInfo.init.gameType;

        // always write back to utf8
        const resultBin = await thisAddon.toRmbin(file, targetDir, type, "utf8");

        // remove the xml file
        if (!options?.taskOptions?.custom?.preserveDecompiledFiles) {
            if (await common.isFileAsync(nwPath.join(targetDir, file))) await common.unlink(nwPath.join(targetDir, file));
        }
        return resultBin;
    } else if ([".ini"].includes(nwPath.extname(file))) {
        // ini file
        return await this.writeFileIni(file, basePath, targetDir, options);
    }
}

thisAddon.getProjectTitle = async function(gameExe, encoding) {
    const ini = require('ini');
    const gameDir = nwPath.dirname(gameExe);
    const iniFile = nwPath.join(gameDir, "RPG_RT.ini");
    if (!await common.isFileAsync(iniFile)) return "";
    const config = ini.parse(await common.fileGetContents(iniFile, encoding));
    console.log("config", config);
    
    return config?.RPG_RT?.GameTitle
}

thisAddon.init = async function() {
    if (this.isInitialized) return;
	const $slide = $(`<div>
				<h1><i class="icon-plus-circled"></i>RPG Maker 2k & 2k3</h1>
				<div class="RM2kCustomField"></div>
			</div>`);
	var customField;
    const initializeEntryPoint = async function(value, $form) {
        ui.showBusyOverlay();
        const type = await thisAddon.getType(value);
        const $entryPoint = $form.find("[name=entryPoint]");
        const $gameType = $form.find("[name=gameType]");
        if (!type) {
            alert(t("Unable to detect RPG Maker type!\nAre you sure the game is RPG Maker 2000 / 2003?"));
            ui.hideBusyOverlay();
            $entryPoint.val("");
            return;
        }
        $gameType.val(type);

        const detectedEncoding = await thisAddon.detectEncoding(nwPath.dirname(value));

        try {
            const $projectTitle = $form.find("[name=projectTitle]");
            $projectTitle.val(await thisAddon.getProjectTitle(value, detectedEncoding));
        } catch (e) {
            console.error("Failed to detect the game title", e);
        }

        const $detectedEnc = $form.find(".detectedEncoding");
        $detectedEnc.html(`Detected encoding is <strong>${detectedEncoding}</strong>.<br />Depending on the detected encoding, you may need to manually enter the Character Encoding field manually based on the closest encoding that is supported.`);

        const $characterEncoding = $form.find("[name=characterEncoding]");
        $characterEncoding.val(detectedEncoding);

        ui.hideBusyOverlay();
        console.log("Initialized RM2k/3 project form for", value);
    };
	ui.newProjectDialog.addMenu({
		icon 			: thisAddon.getWebLocation()+"/icon.png",
		descriptionBar 	: `<h2>RPG Maker 2000 & 2003</h2>
						<p>${t('Start translation from RM2k / RM2k3 engine')}</p>`,
		actionBar		: "",
		goToSlide		: "RM2k",
		at				: 3,
		slides : {
			kag: ui.newProjectDialog.newSlide("RM2k", $slide, {
				buttons: [
					{
						text: t("Create project"),
						icon: "ui-icon-plusthick",
						click: async function() {
							if (!customField) return alert("Error: customField is not defined. This should not happen!");
							const values = customField.getFormValues();
                            if (!values.entryPoint) {
                                alert(t("Please select RPG Maker 2000/2003 game!"))
                                return;
                            }
							console.log("Form value", values);
                            await thisAddon.prepareNewProject(values);
                            $(this).dialog( "close" );
						}
					},
				],
                onActive: ()=> {
					customField = new CustomFields($("<form></form>"), {jsonForm: {
						"schema": {
                            "entryPoint": {
                                "type": "string",
                                "title": "Game location",
                                "description" : "Path to the game executable file (.exe)."
                            },
                            "projectTitle": {
                                "type": "string",
                                "title": "Project Title",
                                "description": "Your project title",
                                "default": "Untitled RM2k/3 project"
                            },
                            "gameType": {
                                "type": "string",
                                "title": "RPG Maker type",
                                "description" : "Type of the RPG Maker (RPG Maker 2000 or 2003). Will be automatically detected when you selected the exe file.",
                                "enum": ["", "2k", "2k3"]
                            },
                            "characterEncoding": {
                                "type": "string",
                                "title": "Character Encoding",
                                "description" : "Character encoding used in the game.",
                            }
						},
						"form": [
                            {
                                type: "info",
                                value: `Start a translation project for RPG Maker 2000 / 2003.<br /> The parser may not support RM2k3 games tinkered with third party patch, such as Maniac Patch.`
                            },
                            {
                                "key": "entryPoint",
                                "type": "selectfile",
                                "accept": ".exe",
                                onChange: async function(evt) {
                                    await initializeEntryPoint(this.getValue(), $(this.node.el).closest("form"));
                                }
                            },
                            {
                                "key": "projectTitle",
                            },
                            {
                                "key": "gameType",
                                "type": "select",
                            },
                            {
                                "type": "html",
                                "value": `<div class="detectedEncoding"></div>`,
                            },
                            {
                                "key": "characterEncoding",
                                "type": "selectencoding",
                            },
                            
                        ],
					}});
					console.log(`.RM2kCustomField`, customField);
					$slide.find(`.RM2kCustomField`).empty();
					console.log("custom field element:", customField.getElm());
					$slide.find(`.RM2kCustomField`).append(customField.getElm());
                }
			})
		}
	})

    if (window.engineDetectionRegistry && !window.engineDetectionRegistry.definitions.has("rm2k2k3")) {
        window.engineDetectionRegistry.register({
            id: "rm2k2k3",
            addonId: thisAddon.id,
            engineIds: thisAddon.supportedEngines,
            displayName: "RPG Maker 2000 / 2003",
            priority: 100,
            detect: async function(request) {
                const entryPoint = request.entryPoint;
                const type = await thisAddon.getType(entryPoint);
                if (!type) return { matches: [] };

                return {
                    matches: [{
                        engineId: type === "2k3" ? "2k3" : "2k",
                        confidence: 1,
                        evidence: [`Found RPG Maker ${type === "2k3" ? "2003" : "2000"} game files.`],
                        entryPoint,
                        gameRoot: nwPath.dirname(entryPoint),
                        preferredInput: "entryPoint"
                    }]
                };
            },
            openProjectWizard: async function(candidate, launchContext) {
                ui.newProjectDialog.gotoSlide("RM2k", "engineDetectResult");
                if (!customField) throw new Error("RPG Maker 2000/2003 project form is not ready.");
                const $form = customField.$elm;
                $form.find("[name='entryPoint']").val(launchContext.entryPoint);
                await initializeEntryPoint(launchContext.entryPoint, $form);
            }
        });
    }

    AddonUtils.applyCommonHandlers(thisAddon.supportedEngines, thisAddon);

    thisAddon.resolveState("initialized")

    const exportOptionFields = {
        jsonForm: {
            schema: {
                preserveDecompiledFiles: {
                    title: "Preserve decompiled files",
                    description: "Preserve the decompiled files after the project is exported."
                        +`<br />EasyRPG Player prioritizes decompiled files over compiled ones, which may affect the gameplay experience if the decompiled files exist in the same directory.`
                        +`<br />It is recommended to keep this option <b>off</b> to remove the decompiled files.`,
                    type: "boolean",
                    default: false
                },
            },
            form: [
                {
                    type: "warn",
                    value: `<h2>Warning</h2>`
                        +`RPG Maker 2000/2003 is an ancient engine that does not support Unicode.`
                        +`To translate into multiple languages, Translator++ will convert RM2k/3 data`
                        +`to UTF-8 Unicode, and most likely, the game will likely not be playable with <b>RPG_RT.exe</b> `
                        +`or the original executable anymore.`
                        +`<br />To play the game, you need to set up <b>EasyRPG Player</b>`
                        +`...the much more modern player...`
                        +`in your game directory.`
                        +`<br />You can use <input type="button" value="the tool in the RM2k/3 ribbon" onclick="addonLoader.getAddon('rm2k2k3').setupEasyRPG()" /> `
                        +`to install EasyRPG Player.`,
                },
                {
                    type: "info",
                    value: `Your previous save data may not be fully compatible with the translated Game.`
                },
                {
                    key: "preserveDecompiledFiles",
                }
            ]
        }
    };

    
    engines.addHandler(thisAddon.supportedEngines,"exportOptionFields", ()=> {
		return exportOptionFields;
	})

	engines.addHandler(thisAddon.supportedEngines,"injectOptionFields", ()=> {
        const injectFields = JSON.parse(JSON.stringify(exportOptionFields));
        injectFields.jsonForm.schema.installEasyRPG = {
            title: "Install EasyRPG Player",
            description: "Install EasyRPG Player in the game directory. <b>Recommended!</b>",
            type: "boolean",
            default: true,
        }
        injectFields.jsonForm.schema.easyRPGUseUtf8 = {
            title: "Force EasyRPG to use UTF-8",
            description: "Force EasyRPG Player to use UTF-8 encoding. <b>Recommended!</b>",
            type: "boolean",
            default: true
        }
        // injectFields.jsonForm.schema.recompileLMT = {
        //     title: "Recompile RPG_RT.lmt",
        //     description: "The RPG_RT.lmt file contains several parameters for map information. Generally, all text inside this file is non-translatable. However, sometimes you may need to change the character encoding of RPG_RT.lmt to fix certain map-related BGM glitches. This option will do that for you.",
        //     type: "boolean",
        //     default: true
        // }
        injectFields.jsonForm.form.push(
            {
                key: "installEasyRPG",
            },
            {
                key: "easyRPGUseUtf8",
            },
            // {
            //     key: "recompileLMT",
            // }
        )
		return injectFields;
	});


    this.isInitialized = true;
}

$(document).ready(function() {
	ui.onReady(function() {
		thisAddon.init();
	});
});