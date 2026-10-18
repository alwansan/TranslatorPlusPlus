/*
TODO 
XUnity.prototype.getConfigPath <-- add more detection for type of patch

*/

var thisAddon 	= this;
var appName 	= this.package.name;
//console.warn("unityTrans Engine", thisAddon);
var spawn 		= spawn || require('child_process').spawn;
var ws 			= ws || require('windows-shortcuts');
//var ini 		= ini || require('ini')
var ini 		= ini || require('js-ini')
var stripBom	= require('strip-bom');
var bCopy 		= require('better-copy');
var fse 		= require('fs-extra');
const shell 	= require('shelljs');
const defaultConfigLocation = nwPath.join(thisAddon.getPathRelativeToRoot(), "res/defaultConfig.ini");


var XUnity = function(path) {
	this.path 		= path || "";
	this.init.apply(this, arguments)
}


XUnity.isUnity = function(exePath) {
	// TODO
	// for now, let's assume everything is unity
	return true;
}
XUnity.prototype.init = function(path) {
	console.log("PATH is : ", path);
	if (!path) return;
	path = path || ""
	this.dirname 	= nwPath.dirname(this.path);
}
XUnity.prototype.set = function(key, value){
	this[key] = value;
	if (key == "path") {
		this.dirname = nwPath.dirname(this.path);
	}
}

XUnity.prototype.get = function(key) {
	return this[key];
}

XUnity.prototype.prepare3rdPartyTools = function(toolsId) {
	// see 3rdParty.json
	toolsId = toolsId || "xunity-rei"
	if (thirdParty.isInstalled(toolsId)) return true;
	
	alert(t("XUnity Translator is needed to perform this action\nPlease install it through Third Party Application Installer!"))
	if (Boolean(thirdParty.config[toolsId]) == false) {
		var xunityPath = nwPath.join(thisAddon.getLocation(), "3rdParty.json");
		thirdParty.loadConfig(xunityPath);
	}
	thirdParty.check({
		popup:true,
		force:true,
		filter:toolsId
	})	
	return false;
}

XUnity.prototype.getConfigPath = function(exePath) {
	exePath = exePath || this.path;
	//TODO detect path for bepinex, unityInjector & ipa
	if (this.checkPatchType(exePath) == "bepinex") {
		return nwPath.join(this.dirname, "BepInEx/config/AutoTranslatorConfig.ini");
	} else {
		return nwPath.join(this.dirname, "AutoTranslator/Config.ini");
	}
}

XUnity.prototype.getConfig = function(force) {
	// parse XUnity config file

	if (!this.config || force) {
		this.configPath = this.getConfigPath();
		console.log("Parsing config file", this.configPath);
		console.log("Deploying default config");
		this.deployDefaultConfig();
		this.config = this.config || {};
		this.config = ini.parse(stripBom(fs.readFileSync(this.configPath, "utf8").toString()))
		return this.config;
	}
	
	return this.config
}


XUnity.prototype.deployDefaultConfig = function() {
	// copy the default config into the game directory
	const expectedConfig = this.getConfigPath();
	if (common.isFile(expectedConfig)) return;
	// create the directory if not exist
	const dirPath = nwPath.dirname(expectedConfig);
	if (!common.isDir(dirPath)) fs.mkdirSync(dirPath, {recursive:true});
	shell.cp(defaultConfigLocation, expectedConfig);
}

/**
 * Split XUnityTranslator's translation file line
 * @param {String} text - XUnityTranslator's translation file line
 * @returns {String[]} - Array of original text and translation
 */
XUnity.splitLine = function(text) {
	if (!text) return [text, ""];
	var placeHolder = text.replaceAll("\\=", "~~");
	var pos = placeHolder.indexOf("=");
	if (pos == -1) return [text, ""];
	return [text.substring(0, pos), text.substring(pos+1)]
}


XUnity.prototype.parse = function(str, contextString) {
	// parse XUnity formatted data
	// format is : 
	/*
		original text=translation
		original text line 2=translation line 2
	*/
	contextString = contextString || "";

	if (typeof str !== 'string') str = "";
	str = str.replace(/\r/g, "");
	var lines = str.split("\n");
	var result = {
			data:[],
			context:[],
			indexIds:{},
			indexIsBuilt:true
		}
	
	var numLine = 0;
	for (var i in lines) {
		if (lines[i].includes("=") == false) continue;
		//var segment = lines[i].split("=");
		var segment = XUnity.splitLine(lines[i]);
		// check whether same record is already exist
		if (result.indexIds[segment[0]]) continue;
		
		// registering index;
		result.indexIds[segment[0]] = numLine;
		
		// handling data
		result.data[numLine] = [segment[0], segment[1]];
		
		// handling context
		var contextPath = nwPath.join(contextString, "line", numLine+"")
		contextPath = contextPath.replace(/\\/g, "/")
		result.context[numLine] = [contextPath];
		numLine++;
	}
	
	return result;
}

XUnity.isXunityTranslationData = function(str) {
	if (!str) return true;
	const lines = str.split("\n");
	for (let i=0; i<10; i++) {
		if (!lines[i]) continue;
		if (typeof lines[i] != "string") continue;
		if (!lines[i].trim()) continue;
		if (!lines[i].includes("=")) continue;
		return true;
	}
	return false;
}

XUnity.prototype.fetch = async function() {
	// fetch current existing translations into trans format
	// should not fetch folder inside translator++
	console.log("Parsing Unity game");
	var activeTransDir 	= this.getActiveTranslationDirectory(true);
	var skipDir 		= this.getTransInjectPath();
	
	var result 			= {};
	var that 			= this;
	console.log("parsing ", activeTransDir);
	// create the folder if activeTransDir is not exist
	if (!common.isDir(activeTransDir)) {
		console.log("Creating directory", activeTransDir);
		fs.mkdirSync(activeTransDir, {recursive:true});
	}

	return new Promise((resolve, reject)=> {
		var promises = [];
		
		bCopy.walk(activeTransDir, {
			onFile : async (filepath, stats) => {
				// when meet a file
				//console.log(arguments);
				if (common.isRelated(filepath, skipDir)) return console.log("Skip : ", filepath);
				console.log("processing : ", filepath);
				promises.push(new Promise((resolve, reject)=> {
					fs.readFile(filepath, (err, data) => {
						if (err) throw err;
						ui.log("Detecting type :"+ filepath);
						if (!XUnity.isXunityTranslationData(data.toString())) {
							ui.log(`Skipping file <u>${filepath}</u> because it's not a valid XUnity.AutoTranslator file`);
							return resolve();
						}
						ui.log(`Processing file ${filepath}`);
						var relPath 				= filepath.substring(activeTransDir.length)
						relPath 					= relPath.replace(/\\/g, "/")
						result[relPath] 			= that.parse(data.toString(), relPath);
						result[relPath].dirname 	= nwPath.dirname(relPath);
						result[relPath].basename 	= nwPath.basename(relPath);
						result[relPath].filename 	= nwPath.basename(relPath);
						result[relPath].extension 	= nwPath.extname(relPath).substring(1);
						result[relPath].path 		= relPath;
						result[relPath].relPath 	= relPath;
						result[relPath].originalFormat 	= "XUnity.AutoTranslator";
						result[relPath].type 		= "";
						result[relPath].lineBreak 	= "\r\n";
						resolve();
					});//readfile
				}))
			},
			onDir : function(filepath, stats) {
				// when meet a folder
				console.log(arguments);
			}
		})
		.then((folderContents) => {
			// the recursive content of folder in array format
			console.log("Walk finished", folderContents)
			return Promise.all(promises);
		}).then(()=>{
			console.log("parsed data", result);
			resolve(result);
		})
	});
}

XUnity.prototype.getGameTitle = function() {
	return nwPath.basename(this.dirname);
}

XUnity.prototype.newProject = async function() {
	console.log("create new project")
	var project = {
		project : {
			gameEngine 	: appName,
			gameTitle 	: this.getGameTitle(),
			options		: {
				AutoTranslator  : {
					patchType 	: this.checkPatchType(),
					configPath 	: this.getConfigPath(),
					config 		: common.clone(this.getConfig())
				},
				executable 		: this.path
			},
			loc 				: this.dirname,
			parser				: thisAddon.package.name,
			parserVersion		: thisAddon.package.version,
		}
	}
	
	const result = await this.fetch();
	project.project.files = result;
	console.log("project", project);
	trans.openFromTransObj(project, {isNew:true});
}


XUnity.prototype.updateProject = async function(options={}) {
	console.log("Updating project");
	options ||= {};
	/**
	 * Whether to purge local data or not
	 */
	options.purgeLocal ||= false; 
	if (!options.purgeLocal) {
		// collect data from old trans
	}
	var project = trans.getSaveData();

	const result = await this.fetch()

	project.project.files = result;
	// console.log("project", project);
	var updatedProject = trans.updateProject(project);
	// console.log("%cupdated project", "color:green", updatedProject);
	trans.openFromTransObj(updatedProject, {
		onAfterLoading : () => {
			
		}
	});

}


XUnity.prototype.getTransInjectPath = function() {
	// get default path to Translator++'s inject folder
	var activeTransDir =  this.getActiveTranslationDirectory(true);
	return nwPath.join(activeTransDir, "translator++");
}

XUnity.prototype.getActiveTranslationDirectory = function(full) {
	// relative to this.dirname
	full = full || false;
	var config = this.getConfig();

	if (this.checkPatchType() == "bepinex") {
		if (full) return nwPath.join(this.dirname, "BepInEx", config.Files.Directory.replace("{Lang}", config.General.Language))

		return nwPath.join("BepInEx", config.Files.Directory.replace("{Lang}", config.General.Language))
	
	} else if (this.checkPatchType() == "reipatcher") {
		if (full) return nwPath.join(this.dirname, "AutoTranslator", config.Files.Directory.replace("{Lang}", config.General.Language))

		return nwPath.join("AutoTranslator", config.Files.Directory.replace("{Lang}", config.General.Language))
	
	}

}



XUnity.prototype.play = function() {
	var thisPatchLnk = this.getPatchLnk();
	var launcher = nwPath.join(this.dirname, thisPatchLnk);
	console.log("Opening ", launcher);
	return new Promise((resolve, reject) => {
		var output = "";
		var child = spawn("explorer", [launcher], {
			cwd : this.dirname,
			shell: true
		});
		child.stdout.on('data', (data) => {
			console.log('stdout: ' + data);
			output += data;
		});

		child.stderr.on('data', (data) => {
			console.log('stderr: ' + data);
		});

		child.on('close', (code) => {
			console.log('child process exited with code ' + code);
			console.log("output", output);
			console.log("reading dir content of ", this.dirname);
			
			console.log("Patch link :", this.getPatchLnk());
			resolve();
		});	
	})	
}

XUnity.prototype.getPatchLnk = function() {
	this.dirname = nwPath.dirname(this.path);
	var dirContent = fs.readdirSync(this.dirname);
	for (var i in dirContent) {
		if (dirContent[i].includes("(Patch and Run).lnk")) return dirContent[i]
	}
	return "";
}

XUnity.prototype.installPatch = function() {
	this.dirname = nwPath.dirname(this.path);
	return new Promise((resolve, reject) => {
		var output = "";
		var child = spawn(nwPath.join(thirdParty.getLocation("xunity-rei"), "SetupReiPatcherAndAutoTranslator.exe"), [], {
			cwd : this.dirname
		});
		child.stdout.on('data', (data) => {
			console.log('stdout: ' + data);
			output += data;
		});

		child.stderr.on('data', (data) => {
			console.log('stderr: ' + data);
		});

		child.on('close', (code) => {
			console.log('child process exited with code ' + code);
			console.log("output", output);
			console.log("reading dir content of ", this.dirname);
			
			console.log("Patch link :", this.getPatchLnk());
			resolve();
		});	
	})	
}

XUnity.prototype.runPatch = function() {
	var patch = this.getPatchLnk();
	if (!patch) return Promise.reject();
	patch = nwPath.join(this.dirname, patch);
	
	console.log("Opening patch file", patch);
	//nw.Shell.openExternal(patch);
	
	return new Promise((resolve, reject) => {
		
		// eslint-disable-next-line
		var output = ""; 
		var child = spawn(patch, [] , { shell: true });
		child.stdout.on('data', (data) => {
			console.log('stdout: ' + data);
			output += data;
		});

		child.stderr.on('data', (data) => {
			console.log('stderr: ' + data);
		});

		child.on('close', (code) => {
			console.log('child process exited with code ' + code);
			resolve();
		});	
	})
	
}


XUnity.prototype.checkPatchType = function(gameExe) {
	// possible returns : "reipatcher", "bepinex", "ipa", "unityinjector", undefined
	gameExe = gameExe || this.path;
	var folder = nwPath.dirname(gameExe);
	if (common.isDir(nwPath.join(folder, "ReiPatcher"))) return "reipatcher";
	if (common.isDir(nwPath.join(folder, "IPA"))) return "ipa";
	if (common.isDir(nwPath.join(folder, "BepInEx"))) return "bepinex";
	if (common.isDir(nwPath.join(folder, "UnityInjector"))) return "unityinjector";
	if (common.isDir(nwPath.join(folder, "MelonLoader"))) return "melonloader";
	
	return undefined;
}

XUnity.prototype.isXunityInstalled = function(gameExe) {
	// check whether xunity translator is exist on the given path
	gameExe = gameExe || this.path;
	
	var patchType = this.checkPatchType(gameExe);
	if (!patchType) return false;
	if (!this.getActiveTranslationDirectory()) return false;
	return true;
}


XUnity.prototype.actionNewProject = function() {
	ui.showLoading();
	ui.loadingProgress("Processing", "Creating new project from "+this.path, {consoleOnly:false, mode:'consoleOutput'});
	
	this.newProject()
	.then(()=>{
		ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingEnd();
	})
}

XUnity.prototype.actionUpdateProject = function() {
	ui.showLoading();
	ui.loadingProgress("Processing", "Updating project from : "+this.path, {consoleOnly:false, mode:'consoleOutput'});
	
	this.updateProject()
	.then(()=>{
		ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingEnd();
	})
}

XUnity.addRibbonMenu = function() {
	ui.ribbonMenu.add("xUnity", {
		
	})
}

XUnity.changePath = function(newPath) {
	/*
		change the current trans.project.options.executable path to newPath
		reassign :
		trans.project.loc
		trans.project.options.AutoTranslator.configPath;

	*/
	try {
		var xUnityNew = new XUnity(newPath)
		
		trans.project.loc 					= nwPath.dirname(newPath)
		trans.project.options.executable 	= newPath
		trans.project.options.AutoTranslator.configPath = xUnityNew.getConfigPath()
	} catch (e) {
		alert("Error when assigning new path, please see console log for more information.")
		console.warn("Error when assigning new path :", newPath, e);
		
	}
	
}

XUnity.exportToFolder = async function(targetDir, transData, options) {
	options = options||{};
	ui.log("Options:", JSON.stringify(options, undefined, 2));
	trans.project.options 	= trans.project.options || {};
	options.writeEncoding 	= thisAddon.config.writeEncoding || options.writeEncoding || trans.project.writeEncoding;
	transData 				= transData || trans.getSaveData();
	transData.project 		= transData.project || {};
	transData.project.files = transData.project.files || {};
	options.onStartParsingFile = options.onStartParsingFile||function(targetFile){};
	options.onEndParsingFile = options.onEndParsingFile||function(targetFile){};
	options.options ||= {};
	options.options.files ||= trans.getAllFiles(transData.project.files);
	if (options.options.files.length == 0) options.options.files = trans.getAllFiles(transData.project.files);


	var keyColumn			= transData.project.indexOriginal || 0;
	var glue 				= "=";
	
	var promises = [];
	for (var i=0; i< options.options.files.length; i++) {
		var fileId = options.options.files[i];
		var translationPool = [];
		var thisFile 		= transData.project.files[fileId];
		var lineBreak 		= thisFile.lineBreak || "\r\n";
		var targetFile 		= nwPath.join(targetDir, thisFile.path);

		// create directory if not exist
		await common.mkDir(nwPath.dirname(targetFile));
		
		if (Array.isArray(thisFile.data) == false) continue;
		options.onStartParsingFile.call(this, targetFile);
		for (var rowId in thisFile.data) {
			if (Array.isArray(thisFile.data[rowId]) == false) continue;
			if (!thisFile.data[rowId][keyColumn]) continue;
			
			var thisRowString = [];
			thisRowString[0] = thisFile.data[rowId][keyColumn];
			thisRowString[1] = trans.getTranslationFromRow(thisFile.data[rowId], keyColumn) || "";
			thisRowString[1] = thisRowString[1].replace(/\r/g, "");

			// replaces line break with literal \\n character
			thisRowString[1] = thisRowString[1].replaceAll(/\n/g, "\\n");
			// substitute all occurance of "=" into "\="
			thisRowString[1] = common.escapeString(thisRowString[1], "=", "\\=");
			translationPool.push(thisRowString.join(glue));
		}
		console.log("writing to ", targetFile);
		promises.push(new Promise((resolve, reject) => {
			var thisFile = targetFile;
			fs.writeFile(thisFile, translationPool.join(lineBreak), (err) => {
				if (err) {
					reject();
					throw err;
				}
				console.log('The file '+thisFile+' has been saved!');
				options.onEndParsingFile.call(this, thisFile);
				
				resolve();
			});
		}))

	}
	
	return Promise.all(promises)
}

XUnity.applyTranslation = async function(targetExe, transData, options) {
	options 		= options||{};
	transData 		= transData || trans.getSaveData();
	
	console.log("Data to be proccessed : ", transData);
	
	var targetUnity = new XUnity(targetExe);
	var targetDir 	= targetUnity.getTransInjectPath();
	console.log("Target dir is : ", targetDir);
	ui.loadingProgress("Processing", "Target dir is : "+targetDir, {consoleOnly:false, mode:'consoleOutput'});
	ui.loadingProgress("Processing", "Creating directory : "+targetDir, {consoleOnly:false, mode:'consoleOutput'});
	try {
		fs.mkdirSync(targetDir, {recursive:true})
	} catch (e) {
		// do nothing
	}
	
	options.onStartParsingFile = function(targetFile){
		ui.loadingProgress("Processing", "Processing : "+targetFile, {consoleOnly:false, mode:'consoleOutput'});
	};
	options.onEndParsingFile 	= function(targetFile){
		ui.loadingProgress("Processing", targetFile+" is created!", {consoleOnly:false, mode:'consoleOutput'});
	};
	
	await XUnity.exportToFolder(targetDir, transData, options)

	ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
	ui.loadingEnd();

	
}
XUnity.cache = {};

XUnity.writeConfig = function(project, options) {
	/*
		Write configuration
	*/
	try {
		project = project || trans.project;
		XUnity.cache[project.projectId] = XUnity.cache[project.projectId] || {}
		options = options || {};
		var config 		= project.options.AutoTranslator.config;
		var configPath 	= project.options.AutoTranslator.configPath;
		var bakPath 	= configPath+".bak";
		
		if (common.isFile(bakPath)) fs.unlinkSync(bakPath);
		fs.renameSync(configPath, bakPath);
		
		var iniString = ini.stringify(config);
		//console.log("ini stringify :");
		//console.log(iniString);
		fs.writeFileSync(configPath, iniString);
		console.log("Done writing to : ", configPath);
	} catch (e) {
		console.warn("Error writing config", e)
	}
	
}
XUnity.prototype.editConfig = function(project, options) {
	project = project || trans.project;
	XUnity.cache[project.projectId] = XUnity.cache[project.projectId] || {}
	options = options || {};
	options.force = true;
	options.rebuild = true;

	
	var $elm = $(thisAddon.getFile("configEdit.html").elm).clone(true, true);
	var config = {};
	try {
		//var config = project.options.AutoTranslator.config
		config = this.getConfig(true);
		project.options.AutoTranslator.config = config;
	} catch (e) {
		config = {};
	}
	console.log("Handling config : ", config);
	for (var groupId in config) {
		var $group = $elm.find(".dialogSectionGroup[data-fld="+groupId+"]");
		console.log("searching group : ", groupId, "found HTML instance:", $group.length);
		if ($group.length < 1) continue;
		for (var confItem in config[groupId]) {
			var $fld = $group.find(".addonUnityFld[data-fld="+confItem+"]");
			console.log("searching field : ", confItem, "found HTML instance:", $fld.length, "value :", config[groupId][confItem]);	
			//$fld.attr("data-default", config[groupId][confItem]);
			var currentValue = config[groupId][confItem] || "";
			
			if ($fld.attr("type") == "checkbox") {
				var flipSwitch = false;
				if (typeof currentValue == "string") {
					if (currentValue.toLowerCase() == "true") flipSwitch = true;
				} else {
					flipSwitch = currentValue;
				}

				console.log("flipswitch toggle ", confItem, flipSwitch);
				$fld.prop("checked", flipSwitch);
				
			} else {
				$fld.val(currentValue);
			}
			
			$fld.off("change.unityTrans")
			$fld.on("change.unityTrans", function(e) {
				var $fld 	= $(this);
				var $group 	= $fld.closest(".dialogSectionGroup");
				var groupId = $group.attr("data-fld")
				var confItem = $fld.attr("data-fld")
				
				try {
					var config 	= trans.project.options.AutoTranslator.config;
					if ($fld.attr("type") == "checkbox") {
						console.log("Flipswitch change");
						if ($fld.prop("checked")) {
							console.log("Change value to True");
							config[groupId][confItem] = "True"
						} else {
							console.log("Change value to False");
							config[groupId][confItem] = "False"
						}
					} else {
						// non flipswitch
						config[groupId][confItem] = $fld.val() || "";
					}
				} catch (e) {
					console.warn(e);
				}
			})
			
			
		}
	}
	
	// initialize tabs;
	$elm.tabs();
	try {
		$elm.find("#addonUnityConfigEdit_general .executable").val(project.options.executable)
	} catch(e) {
		// do nothing
	}
	$elm.find("#addonUnityConfigEdit_general .executable").on("change", function(e){
		XUnity.changePath($(this).val());
	})
	console.log("rendering DVField");
	var elmDv = new DVField($elm)
	elmDv.init();

	
	options.isUnpreventable = true;
	options.onClose = () => {
		XUnity.writeConfig()
	}
	options.title = "Auto Translator Configuration"
	ui.showPopup("XUnityEditIni", $elm, options);
}

window.XUnity = XUnity;




function init() {
	// add into thirdParty application manager
	console.log("Add 3rdParty config into third party manager");
	thirdParty.loadConfigFile(nwPath.join(thisAddon.getPathRelativeToRoot(), "3rdParty.json"));

	var unityGame = new XUnity();
	console.log("xUnity instance", unityGame);
	var $slide = $(`
		<h1><i class="icon-plus-circled"></i>Unity Soft Translator</h1>
		<div>
			<div class="blockBox infoBlock withIcon">
				<h2>UnityTrans Ver.`+thisAddon.package.version+`</h2>
				<p>This parser is still under active development.</p>
			</div>
			<div class="blockBox warningBlock withIcon">
				<h1>Soft Translator</h1>
				<p>Translator ++ will give you a better experience in producing quality translations using <b>XUnity Auto Translator</b>.</p>
				<p>Before starting a translation project, please be aware of the following things:</p>
				<ul>
					<li>This is a soft translation, it means that the translation will not be written directly into the game but as an on-the-fly mod.</li>
					<li>A Playthru is required to fetch all the text in the games. Depending on the game type and scenario branching, some games may require more than one play thru.
						But don't worry, because XUnity Auto Translator will still provide you with generic machine translation on-the-fly for every untranslated text.
					</li>
					<li>There is a chance that this mod is incompatible with another mod.</li>
					<li>XUnity Auto Translator does support a broad range of Unity games. But it doesn't mean that it will support <b>every</b> Unity games.</li>
				</ul>
			</div>
		</div>
		`);
		$slide.data("next", "unity2")


	var $unity2 = $(`<h1><i class="icon-plus-circled"></i>Unity Soft Translator</h1>
			<div class="fieldgroup">
				<h2>Select an Unity Game</h2>
				<label><input type="dvSelectPath" class="gameLocation" accept=".exe" /></label>
			</div>
			<div class="fieldgroup unityTrans patchInfo hidden">
				<h2></h2>
				<div class="desc"></div>
			</div>`);

	var skipPatchInstallation = false;
	$unity2.find(".gameLocation").on("change", function() {
		const $thisElm = $(this).closest("#dialogNewProject");

		console.log("selected game is  : ", $(this).val());
		var gameExe = $(this).val();
		if (!XUnity.isUnity()) {
			skipPatchInstallation = true;
			return;
		}
		console.log("Setting game exe", gameExe);
		unityGame.set("path", gameExe)
		var isPatched = unityGame.isXunityInstalled(gameExe);
		console.log("Is the game has xUnityAutoTranslator?", isPatched);
		if (isPatched) {
			$thisElm.find(".unityTrans.patchInfo h2").html(t("XUnity.AutoTranslator is found!"))
			$thisElm.find(".unityTrans.patchInfo .desc").html(t("Translator++ detects that XUnity.AutoTranslator is already installed. Translator++ will use existing translation data to start a new translation project."));
			$thisElm.find(".unityTrans.patchInfo").removeClass("hidden");
			skipPatchInstallation = true;
		} else {
			$thisElm.find(".unityTrans.patchInfo h2").html(t("XUnity.AutoTranslator is not found!"));
			$thisElm.find(".unityTrans.patchInfo .desc").html(t("The wizard will guide you to install XUnity.AutoTranslator into the game."));
			$thisElm.find(".unityTrans.patchInfo").removeClass("hidden");
			skipPatchInstallation = false;
		}
	})

	ui.newProjectDialog.newSlide("unity2", $unity2, {
		buttons: [
					{
						text: t("Next"),
						click: function() {
							if (!skipPatchInstallation) {
								var exePath = $unity2.find(".gameLocation").val();
								if (!exePath) return alert("Please select an executable file.");
								if (!XUnity.isUnity(exePath)) {
									var conf = confirm(t("Given path: "+exePath+"\nis not an Unity game. Do you still want to proceed?"))
									if (!conf) return;
								}
								ui.newProjectDialog.gotoSlide("unity3", "unity2");
							} else {
								ui.newProjectDialog.close();
								unityGame.actionNewProject();
							}

						}
					}
				]
	});

	var hintImg = thisAddon.getWebLocation()+"/img/hint1.png"
	var $unity3 = $(`<h1><i class="icon-plus-circled"></i>Unity Soft Translator</h1>
		<div class="fieldgroup">
			<h2>${('Install XUnity Auto Translator')}</h2>
			<div class="blockBox infoBlock withIcon">
			${('You may skip this process if you already have your game patched with XUnity Auto Translator!')}
			</div>
			<div class="actionButtons">
				<button class="installPatch"><i class="icon-login"></i>${('Install Patch')}</button>
			</div>
			<div style="margin-top:40px"><img src="${hintImg}" alt="" /></div>
		</div>
	`);
	$unity3.find(".installPatch").on("click", ()=> {
		unityGame.installPatch()
		.then(()=> {
			var conf = confirm(t("Patch successfully installed!\r\n")+
						t("The configuration will be generated when you play the game for the first time.\r\n")+
						t("Open the game now?"));
			if (conf) return unityGame.play();
			
			return;
		})
		.then(()=> {
			
		})
	});
	
	ui.newProjectDialog.newSlide("unity3", $unity3, {
		onActive : function(e, newProjectDialog) {
			unityGame.prepare3rdPartyTools()
		},
		buttons: [
					{
						text: t("Finish"),
						click: function() {
							ui.newProjectDialog.close();
							unityGame.actionNewProject();
						}
					}
				]
	});


	// var $button = $(`<button class="btnSelectExe selectRPGExe"><i class="icon-doc-inv"></i>${('Select executable file from your the game')}</button>`)
	// $button.on('click', function() {
	// 	ui.openFileDialog({
	// 		accept:".exe",
	// 		onSelect : function(selectedFile) {				
	// 			ui.showLoading();

	// 			var selectedDir = nwPath.dirname(selectedFile);
	// 			ui.loadingProgress("Processing", "Processing : "+selectedDir, {consoleOnly:true, mode:'consoleOutput'});
	// 			ui.loadingProgress("Processing", "Please wait! The Window will appear like it's hang up for a large game. It is normal.", {consoleOnly:true, mode:'consoleOutput'});
	// 			ui.newProjectDialog.close()

	// 			new Promise((resolve, reject) => {
	// 				return createProject(selectedDir, {})
	// 			}).then(function() {
	// 				ui.loadingProgress("Processing", "Processing files...", {consoleOnly:true, mode:'consoleOutput'});
	// 			})
	// 		}
	// 	})		
	// })
	//$slide.find(".actionButtons").append($button);
	
	ui.newProjectDialog.addMenu({
		icon : "addons/unityTrans/icon.png",
		descriptionBar : `<h2>Unity Soft Translation</h2>
						<p>Soft translation of unity engine</p>`,
		classes : "invertableImageColor",
		actionBar: "",
		goToSlide: 'unity',
		at:4,
		slides : {
			'unity': {
				html : $slide,
				buttons : [
					{
						text: t("Next"),
						click: function() {
							ui.newProjectDialog.gotoSlide("unity2", "unity");
						}
					}
				],
				onActive : function() {
					console.log("Slide id Unity is active");
					console.log("arguments : ", arguments);
					console.log("This : ", this);
				}
			}

		}
	})

	// =====================================================
	// register handler
	// =====================================================
	if (typeof window.engines[appName] == 'undefined') engines.add(appName);
	engines[appName].addProperty('exportHandler', async function(targetPath, options) {
		console.log("entering export handle", arguments);
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		options.onStartParsingFile = function(targetFile){
			ui.loadingProgress("Processing", "Processing : "+targetFile, {consoleOnly:false, mode:'consoleOutput'});
		};
		options.onEndParsingFile 	= function(targetFile){
			ui.loadingProgress("Processing", targetFile+" is created!", {consoleOnly:false, mode:'consoleOutput'});
		};
		
		ui.showLoading();
		ui.loadingProgress("Processing", "Exporting XUnity.AutoTranslator format into : "+targetPath, {consoleOnly:false, mode:'consoleOutput'});

		if (common.isDir(targetPath)) {
			await XUnity.exportToFolder(targetPath, trans.getSaveData(), options)
			ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
			ui.loadingEnd();

			return true;
		}
		
		
		// is file
		var tmpPath = nwPath.join(nw.process.env.TMP, trans.project.projectId);
		fse.removeSync(tmpPath); 
		try {
			fs.mkdirSync(tmpPath, {recursive:true});
		} catch(e) {
			console.warn("Unable to create directory ", tmpPath);
			console.error(e);
			return true;
		}
		
		await XUnity.exportToFolder(tmpPath, trans.getSaveData(), options)
		ui.loadingProgress("Processing", "Writing "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		
		var _7z = require('7zip-min');
		// export to a folder without the folder itself ... notice the trailing /*
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+'/*'], err => {
			// done
			console.log("process done");
			ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
			ui.loadingEnd();
		});

		
		return true;
	});
	
	engines[appName].addProperty('injectHandler', async function(exeFile, sourceMaterial, options) {
		console.log("Path is : ", exeFile);
		console.log("options are : ", options);
		console.log(arguments);

		ui.showLoading();
		
		ui.loadingProgress("Processing", "Parsing data. The window will appear hang sometimes. That's normal!", {consoleOnly:false, mode:'consoleOutput'});
		await XUnity.applyTranslation(exeFile, trans.getSaveData(), options);
		
		return true;
	});

	engines[appName].addProperty('onOpenInjectDialog', function($dialogInject, options) {
		console.log(arguments);
		$dialogInject.find(".sourceDir").addClass("hidden");
		$dialogInject.find(".targetDir").addClass("hidden");
		$dialogInject.find(".targetExe").removeClass("hidden");
		options.targetOnly = true;
		options.targetMode = "file";
	});

	engines.addHandler([appName], "onLoadTrans", 
	() => {
		var unityInstance = new XUnity(trans.project.options.executable)
		
		ui.ribbonMenu.add(appName, {
			title : "XUnity",
			toolbar : {
				buttons : {
					update : {
						icon : "icon-arrows-cw",
						title : "Update current project",
						onClick : () => {
							var conf = confirm(t("Update current project?"));
							if (!conf) return;
							unityInstance.actionUpdateProject();
						}
					},
					setting : {
						icon : "icon-equalizer",
						title : "XUnity.AutoTranslator Settings",
						onClick : () => {
							//XUnity.editConfig()
							unityInstance.editConfig();
						}
					},
					play : {
						icon : "icon-play",
						title : "Play last build",
						onClick : () => {
							unityInstance.play();
						}
					}
					/*
					,
					playBuild : {
						icon : "icon-play green",
						title : "Apply translation then play",
						onClick : () => {
							rebuildPlay();
						}
					}
					*/
				}
			}
		})		
	})		
	
}

$(document).ready(function() {
	ui.onReady(function() {
		init();
	});
});