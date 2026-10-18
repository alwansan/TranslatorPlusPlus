const trans         = window.opener.trans;
const addonLoader   = window.opener.addonLoader;
const thisAddon     = addonLoader.addons.sugoiTrans;
const thisEngine    = trans.getTranslatorEngine('sugoitrans');
var nwPath        = require('path');
var serverManager;


//=====================================================
var childProcess = require("child_process");
if (nw.App.manifest.debugLevel > 3) {
	var oldSpawn = childProcess.spawn;
    // eslint-disable-next-line no-inner-declarations
	function mySpawn() {
		console.log('spawn called');
		console.log(arguments);
		var result = oldSpawn.apply(this, arguments);
		return result;
	}
	childProcess.spawn = mySpawn;
    var spawn = childProcess.spawn;
}
// ====================================================
// db based on filesize/file's MTime/CRC32
const modelDb = {
    ct2: {
        1102424891: {
            name: "CT2 Ver 3.1"
        },
        1102425180: {
            name: "CT2 Ver Fusion 1"
        },
        "1669350121063.415": {
            name: "CT2 Ver 4.0"
        },
        "1661332882000": {
            name: "CT2 Ver Levi"
        },
        "1656683444000": {
            name: "CT2 Ver 3.3"
        },
        
    },
    legacy: {
        1098360851 : {
            name: "Fairseq Ver 3.3"
        },
        3294773519 : {
            name: "Fairseq Ver 3.0"
        }
    }
}


const InstallSugoi = function(version) {
    this.version = version || "";
    this.baseUrl = "https://dreamsavior.net/rest/remotefile/";
    //common.addEventHandler(this);
}

InstallSugoi.prototype.selectInstallPath = async function(defPath) {
    var that = this;
	defPath = defPath || "";
    var targetPath = defPath || "";
    
	return new Promise((resolve, reject)=> {
		var $popup = $("#ui_installPath");
		if ($popup.length == 0) {
			var dvField = new DVField();
			$popup = $("<div id='ui_installPath'></div>");
			var $content = ($(`
            <div>
                <h2 data-tran="">Select preferred version</h2>
                <div class="fullWidth" data-tran="">We have several versions of CT2 Sugoi Translator. Each has the pros over the other. Choose the version you want.</div>
                <label>
                    <select class="installSugoiVersion fullWidth">
                        <option data-tran="" value="ct2-sugoi-model-4-0">Install the recommended version</option>
                        <option data-tran="" value="ct2-sugoi-model-4-0">Sugoi Model ver 4.0 on CT2 (Latest model Nov 2022)</option>
                        <option data-tran="" value="yojet-latest">YOJET Server(with the latest Sugoi Model)</option>
                        <option data-tran="" value="ct2-sugoi-model-levi">Sugoi Model ver Levi on CT2 (Aug 2022)</option>
                        <option data-tran="" value="ct2-sugoi-model-3-3-ctver-2.19.1">Sugoi Model ver 3.3 on CT2 (July 2022)</option>
                        <option data-tran="" value="ct2-sugoi-translator-fusion-v1">Sugoi Model ver Fusion 1 on CT2 (June 2022)</option>
                        <option data-tran="" value="ct2-sugoi-model">Sugoi Model ver 3.1 on CT2 (March 2022)</option>
                    </select>
                </label>
            </div>
			<div>
				<h2 data-tran="">${t(`Select installation folder`)}</h2>
				<div data-tran="">
					${t(`Where do you want to install the CT2 Sugoi Translator into?`)}
				</div>
				<label>
				    <input type="dvSelectPath" nwdirectory class="fullWidth targetPath" value="${defPath}" />
				</label>
			</div>`));

            if (common.debugLevel()) {
                $content.find(".installSugoiVersion").append(`<option data-tran="" value="test">-DEBUG TEST-</option>`);
            }

			console.log("rendering ", $popup);
			dvField.renderSelectPath($content.find("[type=dvSelectPath]"));
	
			$popup.empty();
			$popup.append($content);
		}
		$popup.dialog({
			title: t("Select installation folder"),
			autoOpen: false,
			modal:true,
			width:440,
			height:290,
			minWidth:440,
			minHeight:190,
			show: {
				effect: "fade",
				duration: 200
			},
			hide: {
				effect: "fade",
				duration: 200
			},
			close:function( event, ui ) {
				resolve(targetPath || "");
			},
			buttons:[
				{
					text: t("Cancel"),
					icon: "ui-icon-close",
					click: function() {
						$(this).dialog( "close" );
					}
				},
				{
					text: t("Install now!"),
					click: async function() {


						var $this = $(this)
                        that.version = $this.find(".installSugoiVersion").val();
                        
						var to = $this.find(".targetPath").val()
						if (!to) return alert(t("Path to the directory can not be empty!"));
						if (await common.isDirectory(to) == false) return alert(t('Invalid directory:')+to);
                        targetPath = to;
                        that.path = targetPath;
                        $(this).dialog("close");
					}
				}
	
			]
		});	
		$popup.find(".targetPath").val(defPath);
		$popup.dialog("open");
	})
}


InstallSugoi.prototype.getConfig = async function() {
    var linkInfo = await common.fetch(`${this.baseUrl}?f=${this.version}`);
    if (typeof linkInfo !== "object") return console.error("Fetch url failed");
    if (linkInfo.error) return alert("Error:\n"+linkInfo.error);
    return linkInfo
}

InstallSugoi.prototype.getWorkingLink = async function(urls) {

    if (typeof urls == "string") return urls;

    return urls[0];
}

InstallSugoi.prototype.runPostInstallationScript = async function(to, config) {
    console.log("Running post installation script");
    config = config || await this.getConfig();
    var targetPath = to;
    let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
    var fn = new AsyncFunction(config.onAfterInstall);
    try {
        await fn(to, config);
    } catch (e) {
        console.warn("Error when running post installation script", e);
    }
}

InstallSugoi.prototype.install = async function(to, config, $segments) {
    to = to || this.path;
	config = config || await this.getConfig();
    $segments = $segments || $(".installationStatus");
	
    if (!config) return;
    if (typeof config !== "object") return;

	var $statusInfo = $segments.find(".statusInfo");
	var $info 		= $statusInfo.find(".info");
	var $progress 	= $statusInfo.find(".progressValue");

    var downloadComplete = ()=> {
        $progress.css("width", "100%")
		$progress.html("100%")
		$info.html("Download done!")
    }

	$statusInfo.removeClass("hidden");
	$info.text("Checking available mirror");

	var url = await this.getWorkingLink(config.urls);
	console.log("url", url);
	if (!url) return alert(t("Failed to download file. Repository do not exist. Please see the console log for more information."));
	
	$info.text("Downloading file");
	
	var filename 	= nwPath.basename(url);
	//var tmp 		= nwPath.join(nw.process.env.TMP, nwPath.basename(url));

	
	$statusInfo.removeClass("hidden");

	var options = {}
	options.onEnd 	= function(){
		downloadComplete();
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
	let tmp = await common.downloadFile(url, nw.process.env.TMP, options);
    downloadComplete();
	console.log("Request done", tmp);

	await common.wait(1000);
	
    // unpack
    $info.html("Unpacking")
    
    await common.extract(tmp, to, {password:config.pass || ""});
    console.log("unpacking from", tmp);
    console.log("to", to);

    if (config.onAfterInstall) {
        $info.html("Running post installation script!");
        await this.runPostInstallationScript(to);
    }
    $info.html("Done!");
    $statusInfo.addClass("hidden");
    $segments.remove();
	return true;
}


const ServerManager = function() {
    this.configName = 'sugoiServerManager';
    this.$elm = $("body");
}

ServerManager.prototype.on = function(evt, fn) {
    this.$elm.on(evt, fn)
}

ServerManager.prototype.off = function(evt, fn) {
    this.$elm.off(evt, fn)
}

ServerManager.prototype.one = function(evt, fn) {
    this.$elm.one(evt, fn)
}

ServerManager.prototype.trigger = function(evt, param) {
    this.$elm.trigger(evt, param)
}

ServerManager.prototype.saveConfig = function() {
    this.config = window.localStorage.setItem(this.configName, JSON.stringify(this.config || {}));
    return this.config;
}

ServerManager.prototype.loadConfig = function() {
    this.config = JSON.parse(window.localStorage.getItem(this.configName) || "{}");
    return this.config;
}

ServerManager.prototype.getConfig = function(key) {
    if (empty(this.config)) this.loadConfig();
    if (typeof key == "undefined") return this.config;
    return this.config[key];
}

ServerManager.prototype.setConfig = function(key, value) {
    console.log("setting config", arguments);
    if (empty(this.config)) this.loadConfig();
    this.config[key] = value;
    this.saveConfig();
    return this.config;
}

ServerManager.prototype.resetConfig = function() {
    this.config = {};
    this.saveConfig();
    return this.config;
}

ServerManager.prototype.initDisplay = function() {
    console.log("init Display");
    console.log("sugoi Path", this.getValue("sugoiPath"));
    if (this.getValue("sugoiPath")) {
        $(".serverSettings").removeClass("hidden");
        $(".serverInstaller").addClass("hidden");
    } else {
        $(".serverSettings").addClass("hidden");
        $(".serverInstaller").removeClass("hidden");
    }
    this.determineServerType();
    this.determineModel();
    this.initYojet();
}

ServerManager.prototype.setSugoiPath = async function(path) {
    console.log("Set sugoi path");
    var rootDir = nwPath.dirname(path);

    var serverType = "legacy"
    var fairseqDir = nwPath.join(rootDir, 'backendServer/Program-Backend/Sugoi-Translator-Offline/offlineTranslation/fairseq');
    var cwd        = fairseqDir;
    var batScript  = "startServer.bat";
    var pyScript   = "startServer.py";
    var pythonBin  = nwPath.join(rootDir, "Power-Source/Python38/python.exe");


    if (!await common.isDirectory(fairseqDir)) {
        if(await common.isDir(nwPath.join(rootDir, 'Code/backendServer/Modules/Translation-API-Server/Offline'))) {
            serverType  = "sugoi-v11+ct2"
            fairseqDir  = nwPath.join(rootDir, 'Code/backendServer/Modules/Translation-API-Server/Offline');
            cwd         = fairseqDir;
            batScript   = "startServer.bat";
            pyScript    = "startServer.py";
            pythonBin   = nwPath.join(rootDir, "Code/Power-Source/Python39/python.exe");
        } else if (await common.isDir(nwPath.join(rootDir, 'Code/backendServer/Program-Backend/Sugoi-Japanese-Translator/offlineTranslation'))) {
            // ver changeLog_V9.4
            serverType  = "sugoi-v9+ct2"
            fairseqDir  = nwPath.join(rootDir, 'Code/backendServer/Program-Backend/Sugoi-Japanese-Translator/offlineTranslation');
            cwd         = fairseqDir;
            batScript   = "startServer.bat";
            pyScript    = "startServer.py";
            pythonBin   = nwPath.join(rootDir, "Code/Power-Source/Python39/python.exe");

        } else if (await common.isFileAsync(nwPath.join(rootDir, "Code/Power-Source/Python39/python.exe"))) {
            serverType  = "legacy-4.0+"
            fairseqDir  = nwPath.join(rootDir, 'Code/backendServer/Program-Backend/Sugoi-Japanese-Translator/offlineTranslation/fairseq');
            cwd         = fairseqDir;
            batScript   = "startServer.bat";
            pyScript    = "startServer.py";
            pythonBin   = nwPath.join(rootDir, "Code/Power-Source/Python39/python.exe");
        } else if (await common.isFileAsync(nwPath.join(rootDir, "Power-Source/Python39/python.exe")) && nwPath.basename(rootDir) == "Code") {
            serverType  = "legacy-4.0+"
            fairseqDir  = nwPath.join(rootDir, 'backendServer/Program-Backend/Sugoi-Japanese-Translator/offlineTranslation/fairseq');
            cwd         = fairseqDir;
            batScript   = "startServer.bat";
            pyScript    = "startServer.py";
            pythonBin   = nwPath.join(rootDir, "Power-Source/Python39/python.exe");
        } else if (await common.isFileAsync(nwPath.join(rootDir, "Power-Source/Python39/python.exe"))) {
            serverType  = "legacy-1.6"
            fairseqDir  = nwPath.join(rootDir, 'backendServer/Program-Backend/Sugoi-Japanese-Translator/offlineTranslation/fairseq');
            cwd         = fairseqDir;
            batScript   = "startServer.bat";
            pyScript    = "startServer.py";
            pythonBin   = nwPath.join(rootDir, "Power-Source/Python39/python.exe");
        } else if (await common.isFileAsync(nwPath.join(rootDir, "Python/python.exe")) && await common.isFileAsync(nwPath.join(rootDir, "yojet-servman.exe"))) {
            serverType  = "yojet"
            fairseqDir  = nwPath.join(rootDir, 'pys');
            cwd         = rootDir;
            batScript   = "pys\\startServer.bat";
            pyScript    = "pys\\startServer.py";
            pythonBin   = nwPath.join(rootDir, "Python/python.exe");

        } else if (await common.isFileAsync(pythonBin)) {
            serverType  = "cTranslate"
            fairseqDir  = nwPath.join(rootDir, 'fairseq');
            cwd         = rootDir;
            batScript   = "fairseq\\startServer.bat";
            pyScript    = "fairseq\\startServer.py";
        } else {
            serverType  = "ct2"
            fairseqDir  = nwPath.join(rootDir, 'pys');
            cwd         = rootDir;
            batScript   = "pys\\startServer.bat";
            pyScript    = "pys\\startServer.py";
            pythonBin  = nwPath.join(rootDir, "Python38/python.exe");
        }
    }

    console.log("Detected server type : ", serverType);

    var pathInfo = {
        entryPoint  : path,
        rootDir     : rootDir,
        pythonBin   : pythonBin,
        fairseqDir  : fairseqDir,
        serverType  : serverType,
        cwd         : cwd,
        batScript   : batScript,
        pyScript    : pyScript
    }

    if (!path) {
        this.initDisplay();
        return;
    }

    if (pathInfo.serverType == "legacy") {
        if (!await common.isDir(pathInfo.fairseqDir)) {
            console.warn("FairSeq path is invalid", pathInfo.fairseqDir)
            this.setConfig("sugoiPath", "");
            this.initDisplay();
            return alert("FairSeq path is invalid "+pathInfo.fairseqDir)
        }
    } 

    if (!await common.isFileAsync(pathInfo.pythonBin)) {
        console.warn("Python not found", pathInfo.pythonBin)
        this.setConfig("sugoiPath", "");
        this.initDisplay();
        return alert("Python not found")
    }
    console.log("setting path");
    this.setConfig("sugoiPath", path)
    this.setConfig("serverInfo", pathInfo)
    this.setConfig("fairseqDir", fairseqDir)
    this.setConfig("serverType", serverType)
    console.log("Server Type:", serverType);

    this.initDisplay();
    this.evalElmGpuControl();
    this.trigger("setSugoiPath")
    this.trigger("configRefreshed")
}

ServerManager.prototype.patchServer = async function() {
    console.log("patching");
    var serverType = this.getConfig("serverType");
    var fairseqDir = this.getConfig("fairseqDir");
    if (serverType == "legacy") {
        await common.copyFile(nwPath.join(thisAddon.getLocation(), "backend/startServer.py"), fairseqDir);
        await common.copyFile(nwPath.join(thisAddon.getLocation(), "backend/startServer.bat"), fairseqDir);
    } else  {
        // patch from serverType directory relative to backend
        await common.copyFile(nwPath.join(thisAddon.getLocation(), "backend", serverType, "startServer.py"), fairseqDir);
        await common.copyFile(nwPath.join(thisAddon.getLocation(), "backend", serverType, "startServer.bat"), fairseqDir);
    }
}

ServerManager.prototype.getValue = function(key) {
    if (this.getConfig(key)) return this.getConfig(key);
    return ($(`[data-bind="${key}"]`).val());
}

ServerManager.prototype.setValue = function(key, value) {
    this.setConfig(key, value)
    $(`[data-bind="${key}"]`).val(value)
}

ServerManager.prototype.isService = async function(port) {
    if (!port) throw("No port defined");
    try {
        await fetch(`http://localhost:${port}/`, {
            method		: 'POST',
            body		: JSON.stringify({content: "", message: "status"}),
            headers		: { 'Content-Type': 'application/json' },
        });
        return true;
    } catch (e) {
        return false;
    }
}

ServerManager.prototype.getTorchVersion = async function() {
    var pythonLoc = nwPath.dirname(this.getConfig("serverInfo").pythonBin);
    if (!pythonLoc) return "";

    var ver = await common.aSpawn('.\\python.exe', ['-m', 'pip', 'show', 'torch'], {cwd: pythonLoc});
    console.log("Torch version:", ver);
    if (!ver) return "";

    ver = ver.replaceAll("\r", "").split("\n");
    if (ver[1].includes("Version") == false) return "";
    ver = ver[1].split(": ")[1];
    return ver;
}

ServerManager.prototype.isGPUPatched = async function() {
    if (!this.getConfig("serverInfo")) return false;
    if (this.getConfig("serverInfo").serverType == "cTranslate") {
        if (process.env.CUDA_PATH) return true;
        return false;
    } else if (this.getConfig("serverInfo").serverType == "ct2") {
        return true;
    } else {
        // check if cudart64 dll is exist in fairseq directory
        var fairseqDir = this.getConfig("serverInfo").fairseqDir;
        const cudart = await common.searchFile("*cudart*.dll", fairseqDir);
        if (cudart.length) return true;

        //CUDA v10+ detect
        var pythonLoc = nwPath.dirname(this.getConfig("serverInfo").pythonBin);
        var cublas = await common.searchFile("*cublas*.dll", pythonLoc);
        var cudnn = await common.searchFile("*cudnn*.dll", pythonLoc);

        if(cublas.length >= 2 && cudnn.length >= 2) {
            return true;
        }
    }

    // old version detect torch version
    var ver = await this.getTorchVersion();
    if (!ver) return false;
    if (ver.includes("cpu")) return false;
    if (ver.includes("cu")) return true;
    return false;
}

ServerManager.prototype.patchGPU = async function() {
    //const serverType = this.getConfig("serverType");
    const rootDir = this.getConfig("serverInfo").rootDir;
    // search for existing patcher
    const patchFiles = await common.searchFile("run-install-cuda.bat", rootDir, true);

    if (patchFiles.length) {
        await loadingScreen.show();
        let cmd = spawn('cmd.exe', ['/c', nwPath.basename(patchFiles[0])], {
            detached:true,
            cwd     :nwPath.dirname(nwPath.join(rootDir, patchFiles[0])),
            shell   :true
        });

        cmd.on('close', (code) => {
            this.evalElmGpuControl();
            loadingScreen.hide();
        })
        return;
    }


    var patchLoc = nwPath.join(thisAddon.getLocation(), "backend/installCuda-latest.bat");
    
    if (await common.isFileAsync(nwPath.join(thisAddon.getLocation(), "backend", this.getConfig("serverType"), "installCuda-latest.bat"))) patchLoc = nwPath.join(thisAddon.getLocation(), "backend", this.getConfig("serverType"), "installCuda-latest.bat");

    var pythonLoc = nwPath.dirname(this.getConfig("serverInfo").pythonBin);
    await loadingScreen.show();

    console.log("Spawn with arg:", 'cmd.exe', ['/c', patchLoc], {
        detached:true,
        cwd     :pythonLoc,
        shell   :true
    });

    var cmd = spawn('cmd.exe', ['/c', patchLoc], {
        detached:true,
        cwd     :pythonLoc,
        shell   :true
    });

    cmd.on('close', (code) => {
        this.evalElmGpuControl();
        loadingScreen.hide();
    })
}

ServerManager.prototype.patchGPULegacy = async function() {
    var patchLoc = nwPath.join(thisAddon.getLocation(), "backend/installCuda-legacy.bat");

    if (await common.isFileAsync(nwPath.join(thisAddon.getLocation(), "backend", this.getConfig("serverType"), "installCuda-legacy.bat"))) patchLoc = nwPath.join(thisAddon.getLocation(), "backend", this.getConfig("serverType"), "installCuda-legacy.bat");

    var pythonLoc = nwPath.dirname(this.getConfig("serverInfo").pythonBin);
    await loadingScreen.show();
    var cmd = spawn('cmd.exe', ['/c', patchLoc], {
        detached:true,
        cwd     :pythonLoc,
        shell   :true
    });

    cmd.on('close', (code) => {
        this.evalElmGpuControl();
        loadingScreen.hide();
    })
}

ServerManager.prototype.getGpuInfo = async function() {
    var gpu =  await common.aSpawn('wmic', ['path', 'win32_VideoController', 'get', 'name']);
    if (!gpu) return [];
    var gpus = gpu.replaceAll("\r", "").split("\n");

    var result = [];
    for (var i in gpus) {
        gpus[i] = gpus[i].trim()
        if (gpus[i] == "Name") continue;
        if (!gpus[i]) continue;
        result.push(gpus[i]);
    }
    return result;
}

ServerManager.prototype.extractGPUNumber = function(str) {
    try {
        str = str || ""
        const pattern = /(?=NVIDIA)(.*?)([0-9]+)/
        var number = 0;
        str.replace(pattern, (all, start, int)=> {
            number = parseInt(int);
        })
        return number;
    } catch (e) {
        return 0
    }
}

ServerManager.prototype.resetGPUConfig = function() {
    this.setConfig("serverCountGPU", 0);
    $(".gpuServerControl [data-bind=serverCountGPU").val(0);
}

ServerManager.prototype.evalElmGpuControl = async function() {
    if (await this.isGPUPatched()) {
        $(".gpuServerControlWrapper .gpuServerPatcher").addClass("hidden");
        $(".gpuServerControlWrapper .gpuServerControl").removeClass("hidden");
    } else {
        this.resetGPUConfig();
        var recommend = (ver) => {
            if (ver == "patchGPU") {
                $(".patchGPULegacy").removeClass("recommended");
                $(".patchGPU").addClass("recommended");
            } else if (ver == "patchGPULegacy") {
                $(".patchGPULegacy").addClass("recommended");
                $(".patchGPU").removeClass("recommended");
            } else {
                $(".patchGPULegacy").removeClass("recommended");
                $(".patchGPU").removeClass("recommended");
            }
        }
        $(".gpuServerControlWrapper .gpuServerPatcher").removeClass("hidden");
        $(".gpuServerControlWrapper .gpuServerControl").addClass("hidden");

        var gpuInfo = await this.getGpuInfo();
        var list    = "";
        var gpuSeries = this.extractGPUNumber(gpuInfo[i])
        recommend();
        for (var i in gpuInfo) {
            if (gpuSeries>=3000) {
                recommend("patchGPU");
            } else if (gpuSeries<3000 && gpuSeries>0) {
                recommend("patchGPULegacy");
            }
            list+= `<li>${gpuInfo[i]}</li>`;
        }
        $(".gpuServerControlWrapper .gpuList").html(list);

        $(".gpuServerControlWrapper .patchGPU").off("click");
        $(".gpuServerControlWrapper .patchGPU").on("click", function() {
            var conf = confirm(t(`Are you sure want to update your server?\nThis update script will work for NVIDIA 3XXX series`));
            if (!conf) return;
    
            serverManager.patchGPU();
        })
        $(".gpuServerControlWrapper .patchGPULegacy").off("click");
        $(".gpuServerControlWrapper .patchGPULegacy").on("click", function() {
            var conf = confirm(t(`Are you sure want to update your server?\nThis update script will work for NVIDIA 2XXX series and earlier`));
            if (!conf) return;
            serverManager.patchGPULegacy();
        })
    }
}

ServerManager.prototype.startAllServerFromBat = async function() {
    console.log("Starting command from bat file");
    const serverScript = this.getConfig("serverInfo").batScript || "startServer.bat";
    
    var startingPort = parseInt(this.getValue('startingPortNumber'));
    var serverCount = parseInt(this.getValue('serverCount')) || 0;
    var serverGPUCount = parseInt(this.getValue('serverCountGPU')) || 0;

    loadingScreen.text("Starting CPU servers");
    var cwd = this.getConfig("serverInfo").cwd || this.getConfig("serverInfo").fairseqDir;

 

    for (var i=0; i<serverCount; i++) {
        if (await this.isService(startingPort+i)) continue;
        let cProc = spawn("start", [serverScript, "-p", startingPort+i], {
            detached:true,
            cwd     :cwd,
            shell   :true
        });
    }
    loadingScreen.text("Starting GPU servers");

    for (let x=0; x<serverGPUCount; x++) {
        if (await this.isService(startingPort+i+x)) continue;
        let cProc = spawn("start", [serverScript, "-g", "-p", startingPort+i+x], {
            detached:true,
            cwd     :cwd,
            shell   :true
        });
    }
    await loadingScreen.hide();
    if (serverCount+serverGPUCount == 0) return alert("No server to start!\nPlease set the number of CPU or GPU server to at least 1.");
    return true;
}

ServerManager.prototype.startAllServer = async function() {
    await loadingScreen.show();
    loadingScreen.text("Patching server");
    await this.patchServer();

    if (this.getConfig("preventClose")) {
        return await this.startAllServerFromBat();
    }
    
    //const serverScript = nwPath.join(this.getConfig("serverInfo").fairseqDir, "startServer.py")
    const serverScript = this.getConfig("serverInfo").pyScript || "startServer.py";
    var cwd = this.getConfig("serverInfo").cwd || this.getConfig("serverInfo").fairseqDir;

    console.log("Spawn with arg:", this.getConfig("serverInfo").pythonBin, [serverScript], {
        detached:true,
        cwd     :cwd,
        shell   :true
    });

    var startingPort = parseInt(this.getValue('startingPortNumber'));
    var serverCount = parseInt(this.getValue('serverCount')) || 0;
    var serverGPUCount = parseInt(this.getValue('serverCountGPU')) || 0;

    loadingScreen.text("Starting CPU servers");
    const pythonBin = common.escapeCmdPath(this.getConfig("serverInfo").pythonBin)

    for (var i=0; i<serverCount; i++) {
        if (await this.isService(startingPort+i)) continue;
        let cProc = spawn(pythonBin, [serverScript, "-p", startingPort+i], {
            detached:true,
            cwd     :cwd,
            shell   :true
        });
    }
    loadingScreen.text("Starting GPU servers");
    for (let x=0; x<serverGPUCount; x++) {
        if (await this.isService(startingPort+i+x)) continue;
        let cProc = spawn(pythonBin, [serverScript, "-g", "-p", startingPort+i+x], {
            detached:true,
            cwd     :cwd,
            shell   :true
        });
    }
    await loadingScreen.hide();
    if (serverCount+serverGPUCount == 0) return alert("No server to start");
    return true;

}

ServerManager.prototype.applySettings = function() {
    var validUrls = [];
    var startingPort = parseInt(this.getValue('startingPortNumber'));
    var serverCount = parseInt(this.getValue("serverCount"))||0;
    var serverCountGPU = parseInt(this.getValue("serverCountGPU"))||0;

    for (var i=0; i<serverCount+serverCountGPU; i++) {
        validUrls.push(`http://localhost:${startingPort+i}/`)
    }
    thisEngine.update("targetUrl", validUrls.join("\n"));
    //thisEngine.update("maxParallelJob", serverCount+serverCountGPU);
    // reinitialization servers
    thisEngine.servers.init();

    try {
        var optionWindow = window.opener.ui.windows['options'];
        if (optionWindow.$(".panelContent.sugoitrans.activeTab").length < 1) return;
        optionWindow.$(`.panelContent.sugoitrans [name="targetUrl"]`).val(validUrls.join("\n"));
        //optionWindow.$(`.panelContent.sugoitrans [name="maxParallelJob"]`).val(serverCount+serverCountGPU);
    } catch(e) {
        // do nothing
    }
}

ServerManager.prototype.determineModel = async function() {
    $(".modelInfo").addClass("hidden");
    $(".installedModel").html("unknown")
    var serverInfo = serverManager.getConfig("serverInfo") || {};
    if (!serverInfo.rootDir) return;
    
    var modelPath = "";
    if (serverInfo.serverType.includes("ct2")) {
        modelPath = nwPath.join(serverInfo.rootDir, "models/ct2_model/model.bin");
        var fileSize = await common.getFileSize(modelPath)
        
        if (modelDb[serverInfo.serverType][fileSize]) {
            $(".modelInfo").removeClass("hidden");
            $(".installedModel").html(modelDb[serverInfo.serverType][fileSize].name);

            return;
        }

        // try to lookup by mtime
        var fStat = await fs.promises.stat(modelPath)
        if (modelDb[serverInfo.serverType][fStat.mtimeMs]) {
            $(".modelInfo").removeClass("hidden");
            $(".installedModel").html(modelDb[serverInfo.serverType][fStat.mtimeMs].name);

            return;
        }
    }
}

ServerManager.prototype.determineServerType = async function() {
    var serverInfo = serverManager.getConfig("serverInfo") || {};
    $(".serverType").html(serverInfo.serverType);
}

ServerManager.prototype.loadDefault = async function() {
    var that = this;
    $(`[data-bind]`).each(function() {
        var $elm = $(this)
        var thisKey = $elm.attr("data-bind");
        // set default
        if (["radio", "checkbox"].includes($elm.attr("type"))) {
            $elm.prop("checked", that.getConfig(thisKey));
        } else {
            $elm.val(that.getConfig(thisKey) || $elm.val() || "")
        }

        $elm.off("change.automated");
        $elm.on('change.automated', function(e) {
            if (["radio", "checkbox"].includes($(this).attr("type"))) {
                console.log("Recording value", thisKey, $(this).prop("checked"));
                that.setConfig(thisKey, $(this).prop("checked"));
            } else {
                console.log("Recording value", thisKey, $(this).val());
                that.setConfig(thisKey, $(this).val());
            }
        })
    });

    $(`input[type=range]`).each(function() {
        var $wrapper = $(`<div class="rangeSliderWrapper"></div>`);
        var $output = $(`<input type="number" class="rangeSliderOutput" />`);
        $output.val($(this).val());
        $(this).after($wrapper);
        $wrapper.append($(this));
        $wrapper.append($output);
        $output.on("input", function() {
            var $slider = $(this).parent().find("input[type=range]");
            $slider.val($(this).val());
            $slider.trigger("change");
        });
        $(this).on("input", function() {
            var $output = $(this).parent().find("input[type=number]");
            $output.val($(this).val());
        })
    })

    if (this.getValue("sugoiPath")) {
        $(".serverSettings").removeClass("hidden");
    }

    this.initDisplay();
    this.evalElmGpuControl();
    this.trigger("afterLoadDefault");
}

ServerManager.closeLocalServer = async function(port) {
    var result = await fetch(`http://localhost:${port}/`, {
        method      : 'post',
        body        : JSON.stringify({message: "close server"}),
        headers     : { 'Content-Type': 'application/json' },
    });
    await result.json();
}

ServerManager.prototype.reset = async function() {
    $(".sugoiPath").val("");
    $(".sugoiPath").trigger("change");
    $(".serverType").text("");
    $(".modelInfo .installedModel").text("");
    $(".modelInfo").addClass("hidden");
    $(".installSugoi").prop("disabled", false);

    this.resetConfig();
}

ServerManager.prototype.refresh = async function() {
    $(".sugoiPath").trigger("change");
}

ServerManager.prototype.setServer = async function(path) {
    $(".sugoiPath").val(path); 
    this.refresh();
} 

ServerManager.prototype.installServer = async function(path) {
    var resetDisplay = ()=> {
        $(".installationStatus").addClass("hidden");
        $(".installSugoi span").text(t("Install CT2 Sugoi Translator"), true);

        $(".installSugoi").prop("disabled", false);
        $(".installSugoi i").attr("class", "icon-download-1");
    }


    const installSugoi = new InstallSugoi();
    if (!path) path = await installSugoi.selectInstallPath();
    console.log("Install to :", path);
    if (!path) return;
    $(".installationStatus").removeClass("hidden");
    $(".installSugoi").prop("disabled", true);
    $(".installSugoi i").removeClass("icon-download-1");
    $(".installSugoi i").addClass("icon-spin5 rotating-slow");
    
    $(".installSugoi span").text("Installing Sugoi Translator", true);
    
    var installed = await installSugoi.install(path)
    
    if (!installed) {
        resetDisplay();
        return;
    }
    
    var conf = confirm(t("Installation completed\nDo you want to set the Server Manager with this installed server?"));
    if (conf) {
        await this.setServer(nwPath.join(path, "startServer-CUDA.bat"));
    }
    $(".installSugoi span").text(t("Sugoi Translator Installed"), true);
    $(".installSugoi i").removeClass("icon-spin5 rotating-slow");
    $(".installSugoi i").addClass("icon-ok-squared");
    this.initDisplay()
}
ServerManager.prototype.initYojet = async function() {
    var serverConfig = serverManager.getConfig("serverInfo") || {};
    console.log("YOJET-server config", serverConfig);
    if (serverConfig.serverType == "yojet") {
        if ($(".actionSection .yojetPane").length < 1) {
            var $yojetPane = $(`
            <div class="actionButton yojetPane">
                <button class="openYojetManager button-big" data-tran="">Start Service from YOJET</button>
            </div>`);
            $yojetPane.find(".openYojetManager").on("click", ()=> {
                var yojetExe = serverManager.getConfig("serverInfo").entryPoint;
                var exe = nwPath.join(nwPath.dirname(yojetExe), "yojet-servman.exe");
                console.log("Opening ", exe);
                nw.Shell.openItem(exe);
            });
            $(".actionSection").append($yojetPane);
            $(".startAllServer").addClass("hidden")
            $(".gpuServerControlWrapper").addClass("hidden")
            $(".cpuServerControlWrapper").addClass("hidden")
        }
    } else {
        $(".actionSection .yojetPane").remove();
        $(".startAllServer ").removeClass("hidden")
        $(".gpuServerControlWrapper").removeClass("hidden")
        $(".cpuServerControlWrapper").removeClass("hidden")
    }
}
ServerManager.prototype.init = async function() {
    this.loadConfig();
    console.log("Loaded config:", this.config);
    this.loadDefault();
}


$(document).ready(function() {
    window.loadingScreen    = new LoadingScreen();
    serverManager = new ServerManager();
    // YOJET addition
    serverManager.on("afterLoadDefault", ()=>{
        serverManager.initYojet();
    })

    serverManager.init();

    var dvField = new DVField();
    dvField.init();

    $(".sugoiPath").on("change", function() {
        serverManager.setSugoiPath($(this).val());
    })

    $(".startAllServer").on("click", async function() {
        var conf = confirm(`${('Are you sure want to start')} ${serverManager.getValue('serverCount')} ${('CPU &')} ${serverManager.getValue('serverCountGPU')} ${('GPU server(s)?')}\n${('The server that already running will be skipped.')}`)
        if (!conf) return;
        if (await serverManager.startAllServer()) alert(t("Server started\nPlease wait until the server(s) are ready before you translate things."))
    })

    $(".applySettings").on("click", function() {
        var conf = confirm(t(`This action will overwrite the current value of Sugoi Trans Addon's settings.\nAre you sure?`));
        if (!conf) return;
        serverManager.applySettings();
        alert("New setting has been applied!");
    })




    // Config buttons;
    $(".config-reset").on("click", function() {
        var conf = confirm(t("Do you want to reset the current configuration?"));
        if (!conf) return;
        serverManager.reset();
    });

    $(".config-refresh").on("click", function() {
        serverManager.one("configRefreshed.refresh", ()=>{
            alert(t("Configuration refreshed!"));
        });
        serverManager.refresh();
    });

    $(".installSugoi").on("click", function() {
        if ($(this).prop("disabled")) return;
        serverManager.installServer();
    })

    void async function() {
        const searchParams = (new URL(document.location)).searchParams;
        if (searchParams.has("startAll")) {
            // starting all server;
            await serverManager.startAllServer();
            window.close();
        }
    }()

});

