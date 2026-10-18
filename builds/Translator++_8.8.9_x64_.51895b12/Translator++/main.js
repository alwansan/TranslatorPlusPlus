var thatNW 		= nw;
var fs 			= require('fs');
var nwPath 		= require('path')
var {LowLevelUpdate} 	= require("www/js/lowLevelUpdate.js");
nw.windowIndex 	= 0;


var getConfiguration = function() {
	//var path = path || require('path')
	var configFile = nw.App.manifest.localConfig.configFile;
	var defaultConf = {
			configPath				:nw.App.manifest.localConfig.configFile,
			lastOpenedProject		:{},
			historyOpenedProject 	:{},
			historyOpenedFiles 		:[],
			translator				:"google"		
		}
	var config = {}
	
	fs.existsSync(configFile);
	if (!fs.existsSync(configFile)) {
		fs.mkdirSync(nwPath.dirname(configFile), {recursive:true})
		fs.writeFileSync(configFile, JSON.stringify(defaultConf))
	} else {
		try {
			config = JSON.parse(fs.readFileSync(configFile))
		} catch (e) {
			console.warn("Unable to parse config file at ", configFile);
		}
	}
	config = Object.assign(defaultConf, config);
	localStorage.setItem('Config', JSON.stringify(config));
	return config;
}

var installAddon = function(targetPath, callback) {
	callback = callback || function(){};
	var _7z = _7z||require('7zip-min');

	return new Promise((resolve, reject) => {
		_7z.cmd(['x', '-tzip', targetPath, '-o'+nw.App.manifest.localConfig.addons], err => {
			console.log("installation done");
			callback(targetPath)
			resolve(targetPath)
		});
	});	
}


function openApp(args) {
	nw.windowIndex++;
	args = args || nw.App.argv;
	var stringArgs = JSON.stringify(args);
	fs.writeFileSync("./data/args.txt", stringArgs)

	if (Array.isArray(args)) {
		var filtered = [];
		var installMode = false;
		for (var i=0; i<args.length; i++) {
			if (nwPath.extname(args[i]).toLowerCase() == ".tap") {
				installAddon(args[i])
				.then((targetPath)=> {
					alert("Addon "+targetPath+" has been installed!");
				})
				installMode = true;
			} else {
				filtered.push(args[i]);
			}
		}
		if (filtered.length == 0 && installMode) return;
		args = filtered;
	}

	

	
	// DEBUG PURPOSE
	/*
	var debugTxt = "";
	var debugVar = {
		"argv":thatNW.process.argv,
		"execPath":thatNW.process.execPath,
		"execArgv":thatNW.process.execArgv
		
	};
	debugTxt = JSON.stringify(debugVar, null, 2);
	fs.writeFileSync("./data/debug.txt", debugTxt)
	*/
	// END OF DEBUG PURPOSE
	var configuration = getConfiguration();
	thatNW.transConfig = configuration;
	

		if (args.includes("--daemon")) {
			nw.Window.open('www/translator.html',{
					'id':"mainWindow"+nw.windowIndex,
					'frame':true,
					'min_width' : 880,
					'min_height' : 600,
					'new_instance' :true
				}, 
				function(thisWindow) {
					thatNW.mainWindow = thisWindow;
					thisWindow.window.args = args;
					thisWindow.window.transConfig = configuration
	
					
				});		
			return true;
		} else if (args.includes("--installPackageDone")) {
			localStorage.removeItem('onStartInstallPackage')
		}


	if (localStorage.getItem('onStartInstallPackage')) {
		// installing package

		nw.Window.open('www/updating.html',{
			'frame':false,
			'width' : 420,
			'height' : 120,
			'resizable':false
		}, 
		function(thisWindow) {
			thatNW.mainWindow = thisWindow;
			thisWindow.window.args = args;
			thisWindow.window.transConfig = configuration

		});			
		//nw.App.quit();
		return;
	}
	
	
	if (Boolean(thatNW.mainWindow) == false) {
		var transWindow = nw.Window.open('www/trans.html',{
				'id':"mainWindow"+nw.windowIndex,
				'frame':false,
				'min_width' : 880,
				'min_height' : 600,
				//'new_instance' :true
			}, 
			function(thisWindow) {
				thatNW.mainWindow = thisWindow;
				thisWindow.window.args = args;
				thisWindow.window.transConfig = configuration
				thisWindow.window.windowIndex = nw.windowIndex;
			});
	} else {
		var transWindow = nw.Window.open('www/trans.html',{
				'id':"mainWindow"+nw.windowIndex,
				'frame':false,
				'min_width' : 880,
				'min_height' : 600,
				//'new_instance' :true
			}, 
			function(thisWindow) {
				thisWindow.window.args = args;
				thisWindow.window.transConfig = configuration
				thisWindow.window.windowIndex = nw.windowIndex;
			});		
	}

}

process.on('uncaughtException', function (e) {
	console.error('uncaughtException:', e);
	console.error(e.stack);
});

nw.App.on('open', function(args) {
	openApp(args)	
});
openApp();