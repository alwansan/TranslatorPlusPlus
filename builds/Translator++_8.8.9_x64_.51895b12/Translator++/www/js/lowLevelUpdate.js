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
const fs            = require("graceful-fs");
const nwPath        = require("path");
const shellescape   = require('shell-escape');
const spawn         = require('child_process').spawn;
/**
 * Copy 7zip to temp folder
 * 
 */
const LowLevelUpdate = function(packageFile, options) {
    this.packageFile = packageFile;
	this.rootPath	= nwPath.dirname(nw.process.execPath);
	this.exe7z      = nwPath.join(this.rootPath, "node_modules/7zip-bin/win/ia32/7za.exe");
    this.tempFolder = nwPath.join(nw.process.env.TMP, "tpp_updater");
	this.options 	= options || {};
	this.options.callbackArguments = this.options.callbackArguments || "--installPackageDone"
}

LowLevelUpdate.prototype.spawn = async function(command, args, options) {
	args = args || [];
	if (Array.isArray(args) == false) args = [args];
	options = options||{};
	options.args = options.args||{};
	options.onData = options.onData||function(result, e) {};
	options.onDone = options.onDone||function(result, e) {};
	options.onError = options.onError||function(result, e) {};
	//options.onReceive = options.onReceive||function(result, e) {};
	var resolver;
	var rejecter;
	var thisPromise = new Promise((resolve, reject)=>{
		resolver = resolve;
		rejecter = reject;
	});	
	
	
	var outputBuffer = "";
	var child = spawn(command, args, options);
	
	child.stdout.on('data', function (data) {
		//console.log('stdout: ' + data);
		outputBuffer += data;
		//console.log("Received buffer : "+data);
		options.onData.call(this, data);
		//options.onReceive.call(this, data);
	});

	child.stderr.on('data', function (data) {
		console.warn('stderr: ' + data);
		options.onError.call(this, data);
		
	});

	child.on('close', function (code) {
		console.log('child process exited with code ' + code);
		//console.log("data is : "+outputBuffer);
		resolver(outputBuffer);
	});	
	
	return thisPromise;
}

LowLevelUpdate.prototype.mkdir = async function(path) {
    return new Promise((resolve, reject) => {
        try {
            fs.mkdir(path, { recursive: true }, (err) => {
                if (err) reject();
                resolve(path);
            });
        } catch (e){

        }
    });
}

LowLevelUpdate.prototype.writeFile = async function(file, data, options) {
	options = options || {};
    await this.mkdir(nwPath.dirname(file));
	return new Promise((resolve, reject) => {
		fs.writeFile(file, data, options, (err)=> {
			if (err) {
				reject(err);
				return;
			}
			resolve(file);
		});
	});	
}

LowLevelUpdate.prototype.copyFile = async function(source, destination, options) {
	options = options || {};
    await this.mkdir(nwPath.dirname(source));
	return new Promise((resolve, reject) => {
		fs.copyFile(source, destination, (err)=> {
			if (err) {
				reject(err);
				return;
			}
			resolve(destination);
		});
	});
}

LowLevelUpdate.prototype.createBatFile = async function() {

   // var unzipCommand = shellescape([this.exe7z, 'x', nwPath.join(__dirname, "updates/test.7z"), '-o'+targetPath, '-r', '-y']);
    var unzipCommand = `"${this.exe7z}" x "${this.packageFile}" -o"${this.rootPath}" -r -y`;
    // current cwd must be the translator++ directory
    var translatorApp = '"'+nw.process.execPath+'"';

    var batfile = `
@ECHO OFF

ECHO TRANSLATOR++ LOW LEVEL UPDATER
ECHO By. Dreamsavior
ECHO dreamsavior@gmail.com
ECHO.
ECHO This program will update TRANSLATOR++'s NWJS
ECHO ====================================================

:LOOP
tasklist | find /i "translator++" >nul 2>&1
IF ERRORLEVEL 1 (
  GOTO CONTINUE
) ELSE (
  ECHO.
  ECHO Translator++ is still running
  ECHO Please save your work and close all instance of Translator++
  Timeout /T 5 /Nobreak
  GOTO LOOP
)

:CONTINUE
ECHO EXTRACTING UPDATE
${unzipCommand}

cmd /c start "" ${translatorApp} ${this.options.callbackArguments}
exit
`;
    var batPath = nwPath.join(this.tempFolder, "setup.bat");
    await this.writeFile(batPath, batfile);
    return batPath;
}

LowLevelUpdate.prototype.run = async function() {
    var batFile = await this.createBatFile();
    await this.copyFile(this.exe7z, nwPath.join(this.tempFolder, "7za.exe"));
    // this.spawn('start', [batFile], {
    //     detached: true,
    //     shell: true
    // });
	nw.Shell.openItem(batFile);
}


exports.LowLevelUpdate = LowLevelUpdate;