const bCopy = require("better-copy");
const nwPath = require("path");
const HTMLPacker = {};
const shelljs = require("shelljs");

HTMLPacker.changeExeIcon = async function(path, iconPath) {
    if (!await common.isFile(path)) return alert(t("Path is not a file:") + path);
    if (!await common.isFile(iconPath)) return alert(t("Icon path is not a file:") + iconPath);
    // path must be an exe file
    if (!path.toLowerCase().endsWith(".exe")) return alert(t("Path is not an exe file:") + path);
    // iconPath must be an ico file
    if (!iconPath.toLowerCase().endsWith(".ico")) return alert(t("Icon path is not an ico file:") + iconPath);
    
    const rcedit = addonLoader.addons.basicUtils.require("rcedit");
    await rcedit(path, {
        icon: iconPath,
    });
}

HTMLPacker.getNWJSlinks = async function() {
	var basePath = 'https://dl.nwjs.io/'
	var data 	= await fetch(basePath)
	var nwjsPage = await data.text()
	var pattern = /<td><a href="(v[\d.\-a-zA-Z]+)\/">/g
	var found = [];
	nwjsPage.replaceAll(pattern, (all, match)=> {
		found.unshift(match);
	});

	var result = {};
	for (var i=0; i<found.length; i++) {
		var ver = found[i];
		var parts = ver.split(".");
		if (parseInt(parts[1]) < 13) continue;
		result[ver] = {};
		result[ver].x64 = `${basePath}${ver}/nwjs-${ver}-win-x64.zip`
		result[ver].i32 = `${basePath}${ver}/nwjs-${ver}-win-ia32.zip`
		result[ver].sdkx64 = `${basePath}${ver}/nwjs-sdk-${ver}-win-x64.zip`
		result[ver].sdki32 = `${basePath}${ver}/nwjs-sdk-${ver}-win-ia32.zip`
	}
	return result
}

HTMLPacker.drawNWJSOptions = async function() {
	ui.showBusyOverlay();
	var options = await this.getNWJSlinks();
	var result = [];
	for (var ver in options) {
		result.push(`<option value="${options[ver].x64}">${ver} x64</option>`);
		result.push(`<option value="${options[ver].i32}">${ver} i32</option>`);
	}
	ui.hideBusyOverlay();
	return result.join("\n");
}

HTMLPacker.getNWJSOptions = async function() {
	ui.showBusyOverlay();
	const options = await this.getNWJSlinks();
	const result = {
        options: [],
        titleMap: {}
    };
    for (let ver in options) {
        result.options.push(options[ver].x64);
        result.options.push(options[ver].i32);
        result.options.push(options[ver].sdkx64);
        result.options.push(options[ver].sdki32);
        result.titleMap[options[ver].x64] = `${ver} x64`;
        result.titleMap[options[ver].i32] = `${ver} i32`;
        result.titleMap[options[ver].sdkx64] = `${ver} SDK x64`;
        result.titleMap[options[ver].sdki32] = `${ver} SDK i32`;
    }

	ui.hideBusyOverlay();
    return result;
}

/**
 * Get available NW.js versions as a simple array
 * @returns {Promise<string[]>} Array of version strings (e.g., ['0.59.0', '0.59.1', ...])
 */
HTMLPacker.getNWJSVersions = async function() {
	ui.showBusyOverlay();
	const options = await this.getNWJSlinks();
	const versions = [];
	
	for (let ver in options) {
		// Remove 'v' prefix from version string (e.g., 'v0.59.0' -> '0.59.0')
		versions.push(ver.replace(/^v/, ''));
	}
	
	ui.hideBusyOverlay();
	return versions;
}

HTMLPacker.pack = async function(sourceDir, targetDir, options) {
    options = options || {};
    options.manifest = options.manifest || {};
    options.packageUrl = options.packageUrl || "https://dl.nwjs.io/v0.52.2/nwjs-v0.52.2-win-x64.zip"
    
    // Extract package name from URL (e.g., "nwjs-v0.52.2-win-x64")
    const packageName = common.getFilename(options.packageUrl);
    const nwjsCacheDir = nwPath.join("data/nwjs", packageName);

    await common.mkDir("data/nwjs");

    ui.loadingProgress(0, "Preparing package");

    // Check if cached NWJS directory exists
    if (!await common.isDirectory(nwjsCacheDir)) {
        const downloadDir = "data/nwjs/downloads";
        await common.mkDir(downloadDir);
        
        await ui.log(`Downloading ${options.packageUrl}`);
        await ui.log('Download only happens once for every selected NWJS package. The next build will be faster.');
        
        var downloaded = await common.download(options.packageUrl, downloadDir, {
            onProgress : (state) =>  {
                ui.loadingProgress(parseInt(state.percent));
            }
        });

        await common.wait(1000);

        await ui.log("Extracting package");
        await common.extract(downloaded, downloadDir);

        await ui.log("Removing downloaded archive");
        await common.unlink(downloaded);

        // The extracted directory will have the same name as the zip file
        var extractedDir = nwPath.join(downloadDir, packageName);

        if (!await common.isDirectory(extractedDir)) {
            await ui.log(`Expected directory ${extractedDir} is not found! Are you sure you downloaded the correct NWJS package?`);
            return;
        }

        // Rename nw.exe to game.exe
        await common.rename(nwPath.join(extractedDir, "nw.exe"), nwPath.join(extractedDir, "game.exe"));

        await ui.log("Caching NWJS package for future use");
        // Move the extracted directory to cache location
        await common.rename(extractedDir, nwjsCacheDir);
    } else {
        await ui.log(`Using cached NWJS package from ${nwjsCacheDir}`);
    }

    ui.loadingProgress(100, "Building");
    
    if (sourceDir !== targetDir) {
        await ui.log(`Copying ${sourceDir} to ${targetDir}`);
        await bCopy(sourceDir, targetDir, {
            onData:(file) => {
                ui.log(`Copying ${file}`);
            }
        });
    }

    await ui.log(`Setting up package.json`);

    // Setting up package.json
    const packageJson = nwPath.join(targetDir, "package.json");
    const defaultManifest = {
        "name": "nwjsgame",
        "main": "./index.html",
        "window": {
            "title": "Translator++ Translated Game",
            "icon": "icon.png",
            "toolbar": false,
            "frame": true,
            "width": 960,
            "height": 640,
            "position": "mouse",
            "min_width": 100,
            "min_height": 100,
            "resizable": true
        },
        "webkit": {
            "plugin": true
        }
    };

    let currentManifest = defaultManifest;
    if (await common.isFileAsync(packageJson)) {
        try {
            currentManifest = JSON.parse(await common.fileGetContents(packageJson));
        } catch (e) {
            console.error("Error parsing package.json", e);
            await ui.log(`Error parsing package.json: ${e.message}`);
            await ui.log(`Using default manifest`);
        }
    }
    currentManifest.main = options.manifest.main || "./index.html";
    currentManifest.name = options.manifest.name || currentManifest.name || "nwjsgame";
    currentManifest.description = options.manifest.description || currentManifest.description || "A NW.js game";
    currentManifest.version = options.manifest.version || currentManifest.version || "1.0.0";
    currentManifest.author = options.manifest.author || currentManifest.author || "Dreamsavior";
    currentManifest.window ||= {};
    currentManifest.window.title = options.manifest.window.title || currentManifest.window.title || "Translator++ Translated Game";
    currentManifest.window.icon = options.manifest.window.icon || currentManifest.window.icon || "icon.png";
    currentManifest.window.width = options.manifest.window.width || currentManifest.window.width || 960;
    currentManifest.window.height = options.manifest.window.height || currentManifest.window.height || 640;
    currentManifest.window.min_width = options.manifest.window.min_width || currentManifest.window.min_width || 100;
    currentManifest.window.min_height = options.manifest.window.min_height || currentManifest.window.min_height || 100;
    currentManifest.window.resizable = options.manifest.window.resizable || currentManifest.window.resizable || true;
    currentManifest.window.frame = options.manifest.window.frame || currentManifest.window.frame || true;

    await ui.log(`Writing package.json`);
    await common.filePutContents(packageJson, JSON.stringify(currentManifest, null, 4));

    await ui.log(`Copying NWJS files to ${targetDir}`);
    // Copy cached NWJS files to target directory using shelljs
    shelljs.cp("-R", nwPath.join(nwjsCacheDir, "*"), targetDir);
    
    await ui.log(`Done`);
}

HTMLPacker.showPackageDialog = async function(from="", to="", options={}) {
    options ||= {};
    options.manifest ||= {};

    ui.showBusyOverlay();
    
    const nwLinks = await this.getNWJSOptions();
    console.log("nwLinks", nwLinks);
    nwLinks.options.unshift("");

    const form = await ui.form({
		schema: {
			fromPath: {
				"type": "string",
				"title": t("Html entry point"),
				"description": t("Select the html entry point file (usually index.html)"),
				"default": from,
				"required": true
			},
            toPath: {
				"type": "string",
				"title": t("Destination folder"),
                "description": t("Select destination folder. The process will replace the existing files."),
				"default": to,
				"required": true
			},
			nwjsVersion: {
				"type": "string",
				"title": t("NWJS version"),
                "description": t("Optional. Select NWJS version and architecture.<br />Latest version not always better, just use what works for you."),
                "enum": nwLinks.options,
				"default": options.nwjsVersion || "",
			},

            // advanced options
            packageId: {
                "type": "string",
                "title": t("Application ID"),
                "description": t("Set the application ID for the game. The ID must be in lowercase and can only contain letters, numbers, and underscores."),
                "default": "translatedgame",
            },
            packageDescription: {
                "type": "string",
                "title": t("Application description"),
                "description": t("Set the application description for the game."),
                "default": "A NW.js game",
            },
            defaultWindowTitle: {
                "type": "string",
                "title": t("Window title"),
                "description": t("Set the default window title for the game.<br />This value may be overridden by the game engine."),
                "default": "Translator++ Translated game",
            },
            // windows specific options
            defaultWindowWidth: {
                "type": "integer",
                "title": t("Window width"),
                "description": t("Set the default window width for the game."),
                "default": 960,
            },
            defaultWindowHeight: {
                "type": "integer",
                "title": t("Window height"),
                "description": t("Set the default window height for the game."),
                "default": 640,
            },
            fullScreen: {
                "type": "boolean",
                "title": t("Full screen"),
                "description": t("Set the game to start in full screen mode."),
                "default": false,
            },
            resizable: {
                "type": "boolean",
                "title": t("Resizable"),
                "description": t("Set the game window to be resizable."),
                "default": true,
            },

            gameIcon: {
                "type": "string",
                "title": t("Game icon"),
                "description": t("Select the icon file for the game executable. The icon file must be in .ico format. The icon will be embedded in the game executable."),
                "default": "",
            },
		},
		form: [
			{
				"type": "info",
				"content": t(`Through this form, you can create a playable package of your game. <br />The process will replace the existing files in the destination folder.`)
			},
			{
				"key": "fromPath",
				"type": "selectfile",
				"accept": ".html",
                "onChange": async function(evt) {
                    const $this = $(evt.target);
                    const fromPath = this.getValue();
                    // set to path to the directory of the file + compiled
                    console.log("debug", this, arguments, fromPath);
                    const $domRoot = $(this.formTree.domRoot);
                    if (fromPath) {
                        $domRoot.find("input[name=toPath]").val(nwPath.join(nwPath.dirname(fromPath)+"-compiled"));
                    }

                    // check if have package.json
                    const packageJson = nwPath.join(nwPath.dirname(fromPath), "package.json");
                    if (await common.isFile(packageJson)) {
                        // read package.json
                        const packageData = JSON.parse(await common.fileGetContents(packageJson));
                        console.log("packageData", packageData);
                        if (packageData.name) {
                            $domRoot.find("input[name=packageId]").val(packageData.name);
                        }
                        if (packageData.description) {
                            $domRoot.find("input[name=packageDescription]").val(packageData.description);
                        }
                        if (packageData.window && packageData.window.title) {
                            $domRoot.find("input[name=defaultWindowTitle]").val(packageData.window.title);
                        }

                        // window options
                        if (!packageData.window) return;
                        if (packageData.window.width) {
                            $domRoot.find("input[name=defaultWindowWidth]").val(packageData.window.width);
                        }
                        if (packageData.window.height) {
                            $domRoot.find("input[name=defaultWindowHeight]").val(packageData.window.height);
                        }
                        if (typeof packageData.window.resizable == "boolean") {
                            $domRoot.find("input[name=resizable]").prop("checked", packageData.window.resizable);
                        }
                        if (typeof packageData.window.fullscreen == "boolean") {
                            $domRoot.find("input[name=fullScreen]").prop("checked", packageData.window.fullscreen);
                        }
                        if (packageData.window.icon) {
                            const iconPath = nwPath.join(nwPath.dirname(fromPath), packageData.window.icon);
                            // check if iconPath is a file
                            if (await common.isFile(iconPath)) {
                                $domRoot.find("input[name=gameIcon]").val(iconPath);
                            }
                        }
                    }
                }
			},
            {
                "key": "toPath",
                "type": "selectdir",
            },
            {
                "key": "nwjsVersion",
                "type": "select",
                "titleMap": nwLinks.titleMap,
            },
            {
                "type": "fieldset",
                "title": "Advanced",
                "expandable": true,
                "items": [
                    {
                        "type": "fieldset",
                        "title": "Manifest options",
                        "items": [
                            {
                                "key": "packageId",
                                "type": "text",
                                "onChange": function(evt) {
                                    const $this = $(evt.target);
                                    var value = this.getValue();
                                    // strip special characters and convert to lowercase
                                    if (value) {
                                        value = value.replace(/[^a-z0-9_]/g, "_");
                                        $this.val(value.toLowerCase());
                                    }
                                }
                            },
                            {
                                "key": "defaultWindowTitle",
                                "type": "text",
                            },
                            {
                                "key": "packageDescription",
                                "type": "text",
                                "title": t("Application description"),
                                "description": t("Set the application description for the game."),
                            }
                        ]
                    },
                    {
                        "type": "fieldset",
                        "title": "Window options",
                        "items": [
                            {
                                "key": "defaultWindowWidth",
                                "type": "number",
                            },
                            {
                                "key": "defaultWindowHeight",
                                "type": "number",
                            },
                            {
                                "key": "fullScreen",
                                "inlinetitle": t("Start the application in full screen mode"),
                            },
                            {
                                "key": "resizable",
                                "inlinetitle": t("Allow the application to be resizable"),
                            }
                        ]
                    }, 
                    {
                        "type": "fieldset",
                        "title": "Windows Binary Options",
                        "items": [
                            {
                                "key": "gameIcon",
                                "type": "selectfile",
                                "accept": ".ico",
                            },
                        ]
                    }

                ],
            }

		]
	}, {
		title: t("HTML Compiler"),
		height: 600,
		buttonOkText: t("Compile"),
	});
	console.log(form);

	if (!form) return;
    if (!form.fromPath) return alert(t("Source path can not empty"));
    if (!form.toPath) return alert(t("Destination path can not empty"));

    if (await common.isFile(form.fromPath) == false) return alert(t('Path is not a file:')+form.fromPath);
    await common.mkDir(form.toPath);
    
    ui.hideBusyOverlay();
    ui.log.start();
    const packageOptions = {
        packageUrl:form.nwjsVersion,
        manifest: {...options.manifest, ...{
            main: nwPath.basename(form.fromPath),
            name: form.packageId || "nwjsgame",
            description: form.packageDescription || "A NW.js game",
            window: {
                title: form.defaultWindowTitle || "Translator++ Translated Game",
                resizable: form.resizable || true,
                fullScreen: form.fullScreen || false,
                width: form.defaultWindowWidth || 960,
                height: form.defaultWindowHeight || 640,
                min_width: 100,
                min_height: 100,
                frame: true,
            },
        }}
    };


    if (form.gameIcon) {
        packageOptions.manifest.window.icon = nwPath.basename(form.gameIcon);
        // move the icon to the target directory
        await common.copy(form.gameIcon, nwPath.join(form.toPath, packageOptions.manifest.window.icon));
    }
    packageOptions.manifest.main = nwPath.basename(form.fromPath);

    console.log("Creating package");
    if (typeof options.onBeforePack == "function") {
        await options.onBeforePack(form, packageOptions);
    }

    await this.pack(nwPath.dirname(form.fromPath),  form.toPath, packageOptions);

    if (typeof options.onAfterPack == "function") {
        await options.onAfterPack(form, packageOptions);
    }

    if (form.gameIcon) {
        await ui.log(`Setting up game icon`);
        await this.changeExeIcon(nwPath.join(form.toPath, "game.exe"), form.gameIcon);
    }

    ui.log.addButton("Open folder", function() {
            nw.Shell.showItemInFolder(nwPath.join(form.toPath, "game.exe"));
        },{
            class: "icon-folder-open"
    });
    ui.log.addButton("Play!", function() {
            console.log("Opening game");
            nw.Shell.openItem(nwPath.join(form.toPath, "game.exe"));
        },{
            class: "icon-play"
    });
    ui.log.end();
    ui.log("Done", "success");
}

module.exports = HTMLPacker;