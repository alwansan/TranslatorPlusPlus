var Association = function(extensions, options) {
	options = options||{};
	if (Array.isArray(extensions) == false) extensions = [extensions];
	this.extensions = extensions;
	this.debugMode = false;
	this.pauseAfter = true;
	this.iconIndex = options.iconIndex||{};
	this.defaultIconIndex = options.defaultIconIndex||0;
	this.templateAssign = (function(){/**
REG ADD HKEY_CLASSES_ROOT\Applications\[$EXE_FILE]\shell\open\command /t REG_SZ /d "\"[$APP_PATH]\" [$PREFIX]\"[$ARG]%%1\"" /f
REG ADD HKEY_CURRENT_USER\Software\Classes\Applications\[$EXE_FILE]\shell\open\command /t REG_SZ /d "\"[$APP_PATH]\" [$PREFIX]\"[$ARG]%%1\"" /f
REG ADD HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.[$EXT] /v "Application" /t REG_SZ /d "[$EXE_FILE]" /f
REG ADD HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.[$EXT]\OpenWithList /v "a" /t REG_SZ /d "[$EXE_FILE]" /f
REG ADD HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.[$EXT]\OpenWithList /v "MRUList" /t REG_SZ /d "a" /f
REG ADD HKEY_CLASSES_ROOT\.[$EXT] /t REG_SZ /d "[$EXT]File" /f
REG ADD HKEY_CLASSES_ROOT\[$EXT]File\DefaultIcon /t REG_EXPAND_SZ /d "[$APP_PATH],[$ICON_INDEX]" /f
REG ADD HKEY_CLASSES_ROOT\[$EXT]File\shell\open\command /t REG_SZ /d "\"[$APP_PATH]\" [$PREFIX]\"[$ARG]%%1\"" /f
REG ADD HKEY_CURRENT_USER\Software\Classes\.[$EXT] /t REG_SZ /d "[$EXT]File" /f
REG ADD HKEY_CURRENT_USER\Software\Classes\[$EXT]File\DefaultIcon /t REG_EXPAND_SZ /d "[$APP_PATH],[$ICON_INDEX]" /f
REG ADD HKEY_CURRENT_USER\Software\Classes\[$EXT]File\shell\open\command /t REG_SZ /d "\"[$APP_PATH]\" [$PREFIX]\"[$ARG]%%1\"" /f
**/}).toString().slice(15,-5).trim();
	
	this.templateUnassign = (function(){/**
REG DELETE HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.[$EXT] /f
REG DELETE HKEY_CLASSES_ROOT\.[$EXT] /f
REG DELETE HKEY_CLASSES_ROOT\[$EXT]File /f
REG DELETE HKEY_CURRENT_USER\Software\Classes\.[$EXT] /f
REG DELETE HKEY_CURRENT_USER\Software\Classes\[$EXT]File /f
**/}).toString().slice(15,-5).trim();
}
Association.prototype.hasAssociation = function(extension) {
	if (typeof extension !== 'string') return false;
	var thisExe = nw.process.execPath.replace(/^.*[\\\/]/, '');
	var command = 'REG QUERY HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FileExts\\.'+extension+' /v Application';
	var execSync = require('child_process').execSync
	try {
		var resultCommand = execSync(command).toString();
	} catch (error) {
		return false;
	}
	//console.log(resultCommand);
	if (resultCommand.indexOf(thisExe) !== -1) return true;
	return false;
}

Association.prototype.getAssociation = function(extensions) {
	extensions = extensions || this.extensions;
	if (Array.isArray(extensions) == false) extensions = [extensions]
	
	var result = {};
	for (var i=0; i<extensions.length; i++) {
		var thisExt = extensions[i]
		
		result[thisExt] = this.hasAssociation(thisExt);
	}
	return result;
}

Association.prototype.executeCommand = function(command, elevated) {
	command = command||"";
	elevated = elevated || false;
	var tmpName = nw.process.env.TMP+"\\associate.bat";
	var fs = fs||require('fs');
	fs.writeFileSync(tmpName, command);
	
	if (elevated) {
		var elevate = require('windows-elevate');
		elevate.exec(tmpName, '', function(error, stdout, stderror) {
			if (error) {
				console.error('Failed!');
				return;
			}

			console.log('Success!');
		});	
	} else {
		var execSync = require('child_process').execSync
		try {
			var resultCommand = execSync(tmpName).toString();
		} catch (error) {
			return false;
		}
		
	}
	return tmpName;	
}

Association.prototype.generateBatch = function(template, extension, options) {
	extension = extension||this.extensions;
	template = template || "";
	options = options||{};
	options.ignoreIfExist = options.ignoreIfExist||undefined;
	options.ignoreIfNotExist = options.ignoreIfNotExist||undefined;
	options.execute = options.execute||false;
	options.elevated = options.elevated||false;
	options.clearCache = options.clearCache||false;
	options.pauseAfter = options.pauseAfter||false;
	options.iconIndex = options.iconIndex||this.iconIndex||{};
	
	if (Array.isArray(extension) == false) extension = [extension];
	var thisExe = nw.process.execPath.replace(/^.*[\\\/]/, '');
	console.log("pass here", arguments);
	var thisTemplate = "";
	for (var i=0; i<extension.length; i++) {
		var thisExtension = extension[i]
		if (Boolean(thisExtension) == false) continue;
		if (options.ignoreIfExist || options.ignoreIfNotExist) {
			var hasAssociation = this.hasAssociation(thisExtension)
			if (options.ignoreIfExist) {
				if (hasAssociation) continue;
			}				
			if (options.ignoreIfNotExist) {
				if (hasAssociation == false) continue;
			}				
		}
		if (typeof options.iconIndex[thisExtension] !== 'number') options.iconIndex[thisExtension]=this.defaultIconIndex;
		options.iconIndex[thisExtension] = options.iconIndex[thisExtension]+"";
			
		thisExtension = thisExtension.toLowerCase();
		thisTemplate += "REM handling extension "+thisExtension+"\n";
		thisTemplate += template.replace(/\[\$PREFIX\]/g, "")
						.replace(/\[\$EXE_FILE\]/g, thisExe)
						.replace(/\[\$APP_PATH\]/g, nw.process.execPath)
						.replace(/\[\$EXT\]/g, thisExtension)
						.replace(/\[\$ARG\]/g, "")
						.replace(/\[\$ICON_INDEX\]/g, options.iconIndex[thisExtension])
		thisTemplate += "\n"
		

	}
	
	if (options.clearCache) thisTemplate += "\nie4uinit.exe -ClearIconCache\nie4uinit.exe -show\n"
	if (options.pauseAfter) thisTemplate += "pause\n"
	if (this.debugMode) return (thisTemplate);
	
	if (options.execute) this.executeCommand(thisTemplate, options.elevated);
	
	return thisTemplate;
	
}

Association.prototype.registerExtension = function(extension) {
	return this.generateBatch(this.templateAssign, extension, {
		ignoreIfExist:true, 
		execute:true, 
		elevated:true,
		clearCache:true,
		pauseAfter:this.pauseAfter
		});
}

Association.prototype.unregisterExtension = function(extension) {
	return this.generateBatch(this.templateUnassign, extension, {
		ignoreIfNotExist:true, 
		execute:true, 
		elevated:true,
		clearCache:true,
		pauseAfter:this.pauseAfter
		});
}



Association.prototype.setExtension = function(extension, options) {
	console.log("setExtension : ", extension);
	var command = "";
	var arrayDiff = function(a, b) {
		return a.filter(function(i) {return b.indexOf(i) < 0;});
	};	
	var off = arrayDiff(this.extensions, extension)
	command += this.generateBatch(this.templateUnassign, off, {
		ignoreIfNotExist:true
		});	
	command += this.generateBatch(this.templateAssign, extension, {
		ignoreIfExist:true
		});	
	
	if (command.trim().length < 1) return "";
	command += "\nie4uinit.exe -ClearIconCache\nie4uinit.exe -show\n"
	if (this.pauseAfter) command += "pause\n"
	console.log(command);
	if (this.debugMode) return (command);
	
	this.executeCommand(command, true);
	
	
	return command;
}

module.exports = Association