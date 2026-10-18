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
var getConfiguration = function() {
	var fs = fs || require('fs');
	var path = path || require('path')
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
		fs.mkdirSync(path.dirname(configFile), {recursive:true})
		fs.writeFileSync(configFile, JSON.stringify(defaultConf))
	} else {
		try {
			config = JSON.parse(fs.readFileSync(configFile))
		} catch (e) {
			console.warn("Unable to parse config file at ", configFile);
		}
	}
	config = Object.assign(defaultConf, config);
	return config;
}

if (window.require) window.transConfig = getConfiguration()