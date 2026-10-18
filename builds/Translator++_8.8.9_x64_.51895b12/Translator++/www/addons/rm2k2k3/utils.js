(async()=> {
const thisAddon = this;
await thisAddon.until("initialized");

thisAddon.determineGameFile = async function(gameDir) {
    var targeExe = nwPath.join(gameDir, "player.exe");
    if (await common.isFileAsync(targeExe)) return targeExe;


    var gameExe = trans.project?.options?.init?.entryPoint;
    if (gameExe) {
        targeExe = nwPath.join(gameDir, nwPath.basename(gameExe))
        if (await common.isFileAsync(targeExe)) return targeExe;
    }

	var files = fs.readdirSync(gameDir);
	var exePaths = [];
	for (let i=0; i<files.length; i++) {
		if (nwPath.extname(files[i]).toLowerCase() !== '.exe') continue;
		exePaths.push(nwPath.join(gameDir, files[i]))
	}

	console.log("determine game exe from ", exePaths);
	if (typeof exePaths == 'string') exePaths = [exePaths];
	exePaths = exePaths || [];
	
	var unknown = [];
	
	for (let i=0; i<exePaths.length; i++) {
		if (nwPath.basename(exePaths[i]).toLowerCase() == "player.exe") return exePaths[i];
		if (nwPath.basename(exePaths[i]).toLowerCase() == "rpg_rt.exe") return exePaths[i];
		unknown.push(exePaths[i]);
	}
	
	if (unknown.length == 1) return unknown[0];
}

thisAddon.play = async function(gameDir) {
    var spawn 		= spawn||require("child_process").spawn;

	if (common.isDir(gameDir) == false) return alert("Invalid path", gameDir);
	if (Boolean(thisAddon.config.useNative) == false) {
		spawn(nwPath.join(thisAddon.getLocation(), "bin", "player.exe"), ["--window"], {cwd: gameDir, detached: true, stdio:"ignore"})	
		return;
	}
	
	var exeFile = await this.determineGameFile(gameDir);
	spawn(exeFile, ['TestPlay', 'ShowTitle', 'Window'], {
		detached: true,
		stdio: 'ignore'
	});
	
}

thisAddon.patchCharEncoding = async function(gameDir) {
    const ini 		= require('ini');

	var iniFile = nwPath.join(gameDir, "RPG_RT.ini")
	if (!await common.isFileAsync(iniFile)) throw new Error("Can not find expected file ", iniFile)
	var iniContent = await common.fileGetContents(iniFile);
	var thisIni = ini.parse(iniContent);
	
	thisIni ||= {};
	
	thisIni.EasyRPG = {
		Encoding: "65001"
	}
	
	await common.filePutContents(iniFile, ini.stringify(thisIni), common.lastFileEncoding, false);
	
	// change default write encoding
	thisAddon.config.writeEncoding = "utf8";
	await sys.saveConfig();
	return true;
}


thisAddon.setupEasyRPG = async function(to) {
	to = to || trans.project.devPath;
	var $popup = $("#easyRPGSetup");
	if ($popup.length == 0) {
		var dvField = new DVField();
		$popup = $("<div id='easyRPGSetup'></div>");
		var $content = ($(`
		<div class="dialogSectionBlock">
		<h2 data-tran="">${t('Target folder')}</h2>
		<div data-tran="">
		${t('Select destination folder.')}
		</div>
		<label>
		<input type="dvSelectPath" class="toPath form-control" nwdirectory value="${to}" />
		</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">${(`Field can not be empty!`)}</div>
		</div>
		<div class="dialogSectionBlock">
		<label class="flex fullWidth">
		<div class="flexMain">
		<div class="label" data-tran="">Use UTF-8</div>
		<div class="info" data-tran="">Force EasyRPG player to use UTF-8 encoding.</div>
		</div>
		<div>
		<input type="checkbox" class="flipSwitch easyRPGUseUtf8" name="easyRPGUseUtf8" data-fld="easyRPGUseUtf8" value="1" checked /> 
		</div>
		</label>
		</div>
		`));
		console.log("rendering ", $popup);
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));
		
		$popup.empty();
		$popup.append($content);
	}
	$popup.dialog({
		title: t("Install Easy RPG Player"),
		autoOpen: false,
		modal:true,
		width:640,
		height:320,
		minWidth:640,
		minHeight:320,
		show: {
			effect: "fade",
			duration: 200
		},
		hide: {
			effect: "fade",
			duration: 200
		},
		close: function() {
			
		},
		buttons:[
			{
				text: t("Close"),
				icon: "ui-icon-close",
				click: function() {
					$(this).dialog( "close" );
				}
			},
			{
				text: t("Install"),
				click: async function() {
					var $this = $(this)
					
					var to = $this.find(".toPath").val();
					var useUTF8 = $this.find(".easyRPGUseUtf8").prop("checked");
					
					if (!to) return alert("Target path is empty");
					if (!await common.isDirectory(to)) return alert("Target path is invalid");
					
					if (useUTF8) await thisAddon.patchCharEncoding(to);
					
					$this.dialog( "close" );
					ui.showBusyOverlay();
					await common.copyFile(nwPath.join(thisAddon.getLocation(), "bin/player.exe"), to);
					
					const fontDir = nwPath.join(thisAddon.getLocation(), "Font");
					await common.mkDir(fontDir);

					const fontHowto = t(`How to add a custom font.\n\nThe fonts must be placed in the Font folder of the game directory and must be named Font.ttf or Font2.ttf. Which font file is used depends on the system graphic font setting. Besides ttf, fon and many other fonts are supported (anything supported by FreeType, the best open source library available for font rendering).\n\nSource: https://blog.easyrpg.org/2023/04/easyrpg-player-0-8-paralyze/`);
					await common.filePutContents(nwPath.join(fontDir, "HOWTO.txt"), fontHowto, "utf8", false);

					ui.hideBusyOverlay();
					
					alert(t("Process completed!"));
				}
			}
			
		]
	});	
	$popup.dialog("open");	
}

//todo
thisAddon.rebuildPlay = function() {
	// inject and play
	// if trans.project.loc or trans.project.devPath are not defined open applyTranslation
	
	if (!trans.project.loc || !trans.project.devPath || !common.isDir(trans.project.loc) || !common.isDir(trans.project.devPath)) {
		var conf = confirm("Game path or Development environment are not defined or invalid!\nYou can generate this by running the Apply Translation once.\nApply Translation now?");
		if (!conf) return;
		ui.openInjectDialog();
		return;
	}
	
	// applyTranslation(trans.project.loc, trans.project.devPath, trans.getSaveData(), {play:true});
}




engines.addHandler(thisAddon.supportedEngines, "onLoadTrans", 
	() => {
		ui.ribbonMenu.add("rm2k", {
			title : "RM2k/3",
			toolbar : {
				buttons : {
					play : {
						icon : "icon-play",
						title : t("Play last build"),
						onClick : () => {
							thisAddon.play(trans.project.devPath);
						}
					},
					playBuild : {
						icon : "icon-play green",
						title : t("Apply translation then play"),
						onClick : () => {
							thisAddon.rebuildPlay();
						}
					},
					setupEasyRPG : {
						img : "/www/addons/rm2k2k3/easyrpg-setup.png",
						title : t("Setup Easy RPG in the current directory"),
						onClick : () => {
							thisAddon.setupEasyRPG();
						}
					}
					
				}
			}
		})		
	})


	thisAddon.afterExportToFolder = async function(exportResult, destinationDir, transData, options) {
		console.log("afterExportToFolder", arguments);
		if (options?.taskOptions?.custom?.installEasyRPG) {
			await ui.log("Installing EasyRPG Player");
			await common.copyFile(nwPath.join(thisAddon.getLocation(), "bin/player.exe"), destinationDir);
		}
		if (options?.taskOptions?.custom?.easyRPGUseUtf8) {
			await ui.log("Setting EasyRPG to use UTF-8");
			await this.patchCharEncoding(destinationDir);
		}
	
	}

thisAddon.injectDone = async function(targetDir, sourceMaterial, options) {
    console.log("after inject", arguments);

	// if (options?.custom?.recompileLMT) {
	// 	// recompile .lmt files
	// 	await thisAddon.recompileLMT(targetDir, trans.project?.options?.init?.gameType, "auto", "utf8");
	// }

    const exeFile = await thisAddon.determineGameFile(targetDir);

	if (options?.custom?.installEasyRPG) {
		await ui.log("Installing EasyRPG Player");
		await common.copyFile(nwPath.join(thisAddon.getLocation(), "bin/player.exe"), targetDir);
	}
	if (options?.custom?.easyRPGUseUtf8) {
		await ui.log("Setting EasyRPG to use UTF-8");
		await this.patchCharEncoding(targetDir);
	}

    ui.LoadingAddButton("Open folder", function() {
        nw.Shell.showItemInFolder(exeFile);
    },
    {
        class: "icon-folder-open"
    });

    ui.LoadingAddButton("Play!", () => {
        console.log("Opening game ", exeFile);
        thisAddon.play(targetDir)
    },
    {
        class: "icon-play"
    });

    ui.loadingProgress("Completed", "Completed!", {consoleOnly:false, mode:'consoleOutput'});
    ui.loadingEnd();
    return common.halt();
}



})()