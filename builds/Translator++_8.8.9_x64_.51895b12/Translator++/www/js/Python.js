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
/**
 * @file Manages the python script runtime
 * @author Dreamsavior
 * @since 5.9.1
 */

const nwPath = require("path");
const rootDir = common.getRootDir();

/**
 * NodeJS Python script wrapper and utility class.
 * @class
 * @example
 * const python = new Python();
 * await python.runPy("path/to/script.py", "path/to/cwd", ["arg1", "arg2"]);
 */
class Python extends require("www/js/BasicEventHandler.js") {
    /**
     * Python constructor.
     * @extends BasicEventHandler
     * @param {string} venvID - The virtual environment ID.
     * @param {string} version - The Python version.
     * @param {Object} options - The options for Python.
     */
    constructor(venvID="", version="3.10.5-x64", options={}) {
        super();
        this.venvID     = venvID || "def";
        this.version    = version;
        this.baseRepo   = options.baseRepo || "https://github.com/Quartzbell/portable-python/releases/download/portable-python/"
        this.baseDir    = options.baseDir || nwPath.join(rootDir, "python", version+"-"+this.venvID)
        this.configDir  = options.configDir || nwPath.join(this.baseDir, "tppconfig")
        
        
        this.pythonPath = nwPath.join(this.baseDir, "python.exe");
        this.isInitialized = false;
        this.defaultConfig = options.config||{};
        this.config     = this.defaultConfig;
        this.configFile = nwPath.join(this.baseDir, "config.json");

        /**
         * Load the configuration.
         * @returns {Object} The configuration.
         */
        this.loadConfig = async()=> {
            var loadedConfig = {};
            if (!await common.isFileAsync(this.configFile)) return this.config;
            try {
                loadedConfig = JSON.parse(await common.fileGetContents(this.configFile));
                this.config = {...loadedConfig, ...this.defaultConfig}
                return this.config;
            } catch (e) {
                return this.config;
            }
        }

        /**
         * Save the configuration.
         * @returns {Object} The configuration.
         */        
        this.saveConfig = async()=> {
            try {
                common.filePutContents(
                    this.configFile,
                    JSON.stringify(this.config, undefined, 2),
                    "utf8",
                    false);

            } catch (e) {
                // do nothing
            }
            this.resolveState("configIsReadyToSave")
            return this.config;
        }
        
        /**
         * Get the configuration.
         * @param {string} key - The key of the configuration.
         * @returns {Object} The configuration.
         */
        this.getConfig = (key)=> {
            if (!key) return this.config;
            if (typeof key == "string") return this.config[key]

        }

        /**
         * Set the configuration.
         * @param {string} key - The key of the configuration.
         * @param {any} value - The value to set.
         */
        this.setConfig = (key, value)=> {
            if (!key) return;
            this.config[key] = value;
            this.saveConfig();
        }
        
        /**
         * Install Python.
         * @returns {boolean} True if installation is successful, false otherwise.
         */
        this.installPython = async () => {
            var selfLoading = false;
            if (ui.isLoadingOverlayVisible()) {
                selfLoading = true;
                ui.showLoading();
                ui.loadingProgress("Installing", "Installing self contained Python", {consoleOnly:false, mode:'consoleOutput'});
            }
            const loadingEnd = ()=> {
                if (selfLoading) {
                    ui.hideLoading()
                }
            }
            ui.log("Installing a new portable python with environment ID: "+this.venvID);
            const downloadURL = this.baseRepo+"python-"+version+".zip"
            await common.mkDir(this.baseDir);
            ui.log("Downloading Python from "+downloadURL)
            let downloadedFile = await common.download(downloadURL, nwPath.join(rootDir, "data"), {resumeIfExist:true});
            if (!downloadedFile) {
                loadingEnd();
                return false;
            }
            ui.log("Download completed successfully!");
            ui.log("Extracting archive");
            await common.extract(downloadedFile, this.baseDir);
            await common.mkDir(this.configDir);
            // await common.unlink(downloadedFile);
            loadingEnd();
            return true;
        }

        /**
         * Initialize Python class.
         */
        this.init = async ()=> {
            if (this.isInitialized) return;
            if (!await common.isFileAsync(this.pythonPath)) {
                ui.log("Python installation not found...");
                let result = await this.installPython();
                if (!result) {
                    await ui.logError("Failed to initialize Python CLI")
                    this.rejectState("initialized")
                    return;
                }
            }
            ui.log("Initialization completed");
            await this.loadConfig();
            this.isInitialized = true;
            this.resolveState("initialized");
        }

    }
}

/**
 * Run a python script and return the result
 * @param {String} pathToPy - Path to the python script
 * @param {String} [cwd] - Directory where the python script will be called
 * @param {String[]} [args] - Arguments to be passed to the script
 * @returns {String} Output of the execution
 */
Python.prototype.runPy = async function(pathToPy, cwd="", args=[], options={}) {
    console.log("Running python script...", arguments);
    pathToPy = nwPath.resolve(pathToPy)
    if (!await common.isFile(pathToPy)) {
        ui.logError(pathToPy+" is not found")
        return;
    }
    cwd ||= nwPath.dirname(pathToPy);
    await this.init();
    args.unshift(pathToPy);
    
    return common.aSpawn(this.pythonPath, args, {...options, ...{
        cwd: cwd
    }})
}


/**
 * Run a python script as a new shell window
 * All paths must be wrapped in double quotes
 * @param {String} pathToPy - Path to the python script
 * @param {String} [cwd] - Directory where the python script will be called
 * @param {String[]} [args] - Arguments to be passed to the script
 * @returns {String} Output of the execution
 */
Python.prototype.runPyDetached = async function(pathToPy, cwd="", args=[]) {
    pathToPy = nwPath.resolve(pathToPy);
    if (!await common.isFile(pathToPy)) {
        ui.logError(pathToPy+" is not found")
        return;
    }
    cwd ||= nwPath.dirname(pathToPy);
    await this.init();
    // in detached mode, the path must be wrapped in double quotes
    args.unshift(`"${pathToPy}"`);
    return common.aSpawn(`"${this.pythonPath}"`, args, {
        cwd: cwd,
        shell:true,
        detached:true
    })
}

Python.prototype.killProcess = async function(pythonScript) {
    // todo
    // wmic process where "commandline like '%D:\\App\\eztrans\\ezTransWeb\\eztrans.py%'" get processid,commandLine
}

/**
 * Lists all installed Python packages.
 * @returns {Promise<Array>} A promise that resolves to an array of installed packages.
 */
Python.prototype.listPackages = async function() {
    await this.init();

    var listPackage = await common.aSpawn("python.exe", ["-m", "pip", "list", "--format", "json"], {
        cwd: this.baseDir
    });
    if (typeof listPackage == "string") return []
    return listPackage;
}

/**
 * Checks if a specific Python package is installed.
 * @param {string} packageName - The name of the package to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the package is installed, false otherwise.
 */
Python.prototype.isPackage = async function(packageName) {
    await this.init();

    if (!packageName) return false;
    const packages = await this.listPackages();
    for (let i in packages) {
        if (!packages[i]?.name) continue;
        if (packages[i].name.toLowerCase() == packageName.toLowerCase()) return true;
    }
    return false;
}

/**
 * Checks if a specific script exists.
 * @param {string} scriptName - The name of the script to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the script exists, false otherwise.
 */
Python.prototype.isScript = async function(scriptName) {
    await this.init();
    const scriptDir = nwPath.join(this.baseDir, "Scripts");

    if (nwPath.extname(scriptDir).toLowerCase() != ".exe") {
        scriptName = scriptName+".exe";
    }

    return await common.isFileAsync(nwPath.join(scriptDir, scriptName));
}

/**
 * Gets information about a specific Python package.
 * @param {string} pkg - The name of the package to get information about.
 * @returns {Promise<Object>} A promise that resolves to an object containing information about the package.
 * @example
 * const python = new Python();
 * const info = await python.getPackageInfo("translators");
 * console.log(info);
 * // Output:
 * // {
 * //     "Name": "translators",
 * //     "Version": "5.9.3",
 * //     "Summary": "Translators is a library that aims to bring free, multiple, enjoyable translations to individuals and students in Python.",
 * //     "Home-page": "https://github.com/uliontse/translators",
 * //     "Author": "UlionTse",
 * //     "Author-email": "uliontse@outlook.com",
 * //     "License": "GPLv3",
 * //     "Location": "e:\\dreamsavior\\tpp\\translator++\\python\\3.10.5-x64-def\\lib\\site-packages",
 * //     "Requires": "cryptography, lxml, pathos, PyExecJS, requests, tqdm",
 * //     "Required-by": ""
 * // }
 */
Python.prototype.getPackageInfo = async function(pkg) {
    await this.init();

    if (!pkg) return;

    var info = await common.aSpawn("python.exe", ["-m", "pip", "show", pkg], {
        cwd: this.baseDir
    });
    if (!info) return;
    var result = {}
    var lines = info.replaceAll("\r", "").split("\n");
    for (let i in lines) {
        let thisLine = lines[i];
        if (!thisLine.trim()) continue;
        let segm = thisLine.split(": ");
        let key = segm.shift()
        result[key.trim()] = segm.join(": ").trim()
    }
    return result;
}

/**
 * Installing a package
 * @param {String} pkg - Package name
 * @example
 * await python.installPackage("litellm");
 * await python.installPackage("fastapi==0.109.0");
 */
Python.prototype.installPackage = async function(pkg, extraArgs=[]) {
    if (!pkg) return;

    await this.init();

    let spawnArgs = ["-m", "pip", "install"];

    if (extraArgs?.length) {
        spawnArgs = spawnArgs.concat(extraArgs);
    }

    if (Array.isArray(pkg)) {
        spawnArgs = spawnArgs.concat(pkg);
    } else {
        spawnArgs.push(pkg);
    }



    await common.aSpawn("python.exe", spawnArgs, {
        cwd: this.baseDir
    });
}

/**
 * Uninstalls a specific Python package.
 * @param {string | Array<string>} pkg - The name of the package(s) to uninstall.
 * @returns {Promise<void>} A promise that resolves when the package(s) have been uninstalled.
 */
Python.prototype.uninstallPackage = async function(pkg) {
    if (!pkg) return;

    await this.init();

    let spawnArgs = ["-m", "pip", "uninstall", "-y"];

    if (Array.isArray(pkg)) {
        spawnArgs = spawnArgs.concat(pkg);
    } else {
        spawnArgs.push(pkg);
    }

    await common.aSpawn("python.exe", spawnArgs, {
        cwd: this.baseDir
    });
}

/**
 * Checks if a specific requirements file is installed.
 * @param {string} requirementsFile - The path to the requirements file.
 * @returns {boolean} True if the requirements file is installed, false otherwise.
 */
Python.prototype.requirementIsInstalled = function(requirementsFile="") {
    var installedRequirements = this.getConfig("installedRequirements") || {};
    if (installedRequirements[requirementsFile]) return true;
    return false;
}

/**
 * Installs the packages from a specific requirements file.
 * @param {string} requirementsFile - The path to the requirements file.
 * @param {boolean} force - Whether to force the installation even if the requirements file is already installed.
 * @returns {Promise<void>} A promise that resolves when the packages have been installed.
 */
Python.prototype.installRequirements = async function(requirementsFile="", force=false) {
    if (!await common.isFile(nwPath.resolve(requirementsFile))) return console.error("Requirements file not found", requirementsFile);

    await this.init();
    if (this.requirementIsInstalled(requirementsFile)) {
        console.log("Requirement file is already installed...");

        if (!force) return;
    }
    console.log("Requirement file is not installed, so installing...");
    const absPath = nwPath.resolve(requirementsFile);
    await common.aSpawn("python.exe", ["-m", "pip", "install", "-r", `${absPath}`], {
        cwd: this.baseDir
    });

    var installedRequirements = this.getConfig("installedRequirements") || {};
    installedRequirements[requirementsFile] = true;
    this.setConfig("installedRequirements", installedRequirements)
}

/**
 * Uninstalls the packages from a specific requirements file.
 * @param {string} requirementsFile - The path to the requirements file.
 * @returns {Promise<void>} A promise that resolves when the packages have been uninstalled.
 */
Python.prototype.uninstallRequirements = async function(requirementsFile="") {
    if (!await common.isFile(requirementsFile)) return;
    await this.init();
    const absPath = nwPath.resolve(requirementsFile);
    await common.aSpawn("python.exe", ["-m", "pip", "uninstall", "-y", "-r", `${absPath}`], {
        cwd: this.baseDir
    });

    var installedRequirements = this.getConfig("installedRequirements") || {};
    installedRequirements[requirementsFile] = false;
    this.setConfig("installedRequirements", installedRequirements)
}

/**
 * Checks all available versions of a package from the Python Package Index.
 * NOTE: This uses an experimental pip command (`pip index versions`).
 * @param {string} packageName - The name of the package to check.
 * @returns {Promise<string[]>} A promise that resolves to an array of available versions, sorted from newest to oldest. Returns an empty array if the package is not found or an error occurs.
 */
Python.prototype.checkAvailablePackageVersion = async function(packageName) {
    if (!packageName) return [];

    await this.init();

    const output = await common.aSpawn("python.exe", ["-m", "pip", "index", "versions", packageName], {
        cwd: this.baseDir
    });

    // aSpawn is expected to return stdout (string) on success and something else (e.g. stderr string, object, or falsy) on failure.
    // If a package is not found, pip exits with an error code and prints to stderr.
    if (typeof output !== 'string' || output.includes("No matching distribution found")) {
        return [];
    }

    const lines = output.replaceAll("\r", "").split('\n');
    const versionsLine = lines.find(line => line.trim().startsWith("Available versions:"));

    if (!versionsLine) {
        return [];
    }

    try {
        const versionsString = versionsLine.split(":")[1];
        if (!versionsString) return [];
        
        const versions = versionsString.split(",").map(v => v.trim()).filter(Boolean);
        return versions;
    } catch (e) {
        ui.logError(`Failed to parse pip index versions output for ${packageName}. Error: ${e}`);
        return [];
    }
}

/**
 * Checks the latest available version of a package from the Python Package Index.
 * @param {string} packageName - The name of the package to check.
 * @returns {Promise<string|null>} A promise that resolves to the latest version string, or null if not found.
 */
Python.prototype.checkLatestPackageVersion = async function(packageName) {
    const versions = await this.checkAvailablePackageVersion(packageName);
    return versions?.[0] || null;
}


// Static
/**
 * Downloads a file using Python.
 * @static
 * @param {string} from - The URL of the file to download.
 * @param {string} to - The path where to save the downloaded file.
 * @returns {Promise<string>} A promise that resolves to the path of the downloaded file.
 */
Python.downloader = async function(from, to) {
    const python = new Python();
    await python.installPackage(["tqdm", "requests"]);

    await common.mkDir(nwPath.dirname(to));
    to = nwPath.resolve(to);
    await python.runPyDetached("www/py/download.py", "", [from, to])

    return to;
}

module.exports = Python;