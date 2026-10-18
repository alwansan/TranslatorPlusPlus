const thisAddon = this;

thisAddon.switchTheme = function(theme="", wind = window) {
    const $ = wind ? wind.$ : window.$;

    if (theme == "dark") {
        $("link[data-theme]").each(function() {
            const $this = $(this);
            if ($this.attr("href").includes("jquery-ui")) {
                $this.attr("href", "/www/modules/jquery-ui/dark/jquery-ui.css");
            } else if ($this.attr("href").includes("theme-vars")) {
                $this.attr("href", "/www/css/theme-vars-dark.css");
            } else if ($this.attr("href").includes("hot-")) {
                $this.attr("href", "/www/css/hot-dark.css");
            }
        });

        if (wind.location.href.includes("formbuilder.html")) {
            console.log("Switching JSONEditor theme to dark");
            $("head").append(`<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vanilla-jsoneditor@3.5.0/themes/jse-theme-dark.css" type="text/css" data-theme="dark" />`);
        }

    } else {
        $("link[data-theme]").each(function() {
            const $this = $(this);
            if ($this.attr("href").includes("jquery-ui")) {
                $this.attr("href", "/www/modules/jquery-ui/base/jquery-ui.css");
            } else if ($this.attr("href").includes("theme-vars")) {
                $this.attr("href", "/www/css/theme-vars.css");
            } else if ($this.attr("href").includes("hot-")) {
                $this.attr("href", "/www/css/hot-normal.css");
            } else if ($this.attr("href").includes("jse-theme-")) {
                $this.remove();
            }
        });


    }
    $("body").attr("data-theme", theme);
    $("body").attr("data-bs-theme", theme);
}

const NWKit = {};
NWKit.installNW = async function(version="0.68.1", targetDir, isSDK=false, is32Bit=false) {
    if (!targetDir) throw new Error("Target directory is not specified");
    if (!version) throw new Error("Version is not specified");
    const arch = is32Bit ? "win-ia32" : "win-x64";
    const sdk = isSDK ? "-sdk" : "";

    let nwJsLink = `https://dl.nwjs.io/v${version}/nwjs${sdk}-v${version}-${arch}.zip`;


    var loadingIsDisplayed = ui.log.isShown();
    if (!loadingIsDisplayed) {
        ui.log.show();
    }
	ui.log.progress(0, "Processing");
	await ui.log("Preparing environment for the first run");
	var nwDir = "data/nwjs";

	await ui.log(`Downloading nwjs ${nwJsLink} to ${nwDir}`);
	ui.log.progress(0, "Downloading");
	await common.mkDir(targetDir);
    await common.mkDir(nwDir);

	const downloadedPath = await common.download(nwJsLink, nwDir, {
        resumeIfExist: true,
		onProgress : (state) =>  {
			ui.log.progress(parseInt(state.percent));
		}
	});

    await ui.log("Extracting archive", downloadedPath, targetDir, common.getFilename(nwJsLink));
	await common.extractFrom(downloadedPath, targetDir, common.getFilename(nwJsLink));

	ui.log.progress(100, "Downloaded");


    if (!loadingIsDisplayed) {
        ui.log.hide();
    }

	return targetDir;
}

NWKit.getNWDownloadUrl = function(version="0.68.1", isSDK=false, is32Bit=false) {
    const arch = is32Bit ? "win-ia32" : "win-x64";
    const sdk = isSDK ? "-sdk" : "";

    return `https://dl.nwjs.io/v${version}/nwjs${sdk}-v${version}-${arch}.zip`;
}


NWKit.changeCoreNW = async function(version="0.68.1", isSDK=false, is32Bit=false) {
    const fs = require('fs');
	const path = require('path');
    if (info.isDebugVersion()) {
        //return alert("This is a debug version. Please use the release version to do this action.");
        const sign = prompt("You're running on the development version. You usually don't do this. Please type 'I understand' to continue.");
        if (sign !== "I understand") {
            return;
        }
    }

	const downloadURL = this.getNWDownloadUrl(version, isSDK, is32Bit);
    const PROJECT_DIR = nwPath.resolve(".");
    const TEMP_DIR = nw.process.env.TEMP;
    const batchFileName = path.join(TEMP_DIR, 'updateTranslatorCore.bat');

    const batchTemplate = `@echo off
cls
ECHO TRANSLATOR++ CORE UPDATER
ECHO By. Dreamsavior
ECHO dreamsavior@gmail.com
ECHO.
ECHO This program will change TRANSLATOR++'s NWJS
ECHO ====================================================

:: Closing Translator++ process

ECHO Closing Translator++ process...
taskkill /IM "Translator++.exe" /F
:: When taskkill is failed for some reason, wait for the user to close the app manually

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

:: Define the project directory
set "PROJECT_DIR=${PROJECT_DIR}"

:: Change current directory to the project directory
cd /d "%PROJECT_DIR%"

:: Define paths to tools
set "WGET=.\\3rdParty\\GnuWin32\\bin\\wget.exe"

:: Define the NW.js file and download link
set "NWJS_URL=${downloadURL}"
set "NWJS_ZIP=.\\_UPDATE_PACKAGE.zip"

:: Download the NW.js file
echo Downloading NW.js file...
"%WGET%" -O "%NWJS_ZIP%" "%NWJS_URL%"
if errorlevel 1 (
    echo Failed to download NW.js file.
    exit /b 1
)

:: Run the uninstall.bat in the current directory
echo Running uninstall script...
if exist ".\\uninstallnw.bat" (
    call .\\uninstallnw.bat
) else (
    echo uninstall.bat not found. Skipping...
)

:: Create a temporary folder
set "TEMP_DIR=.\\data\\temp"
echo Creating temporary folder...
if not exist "%TEMP_DIR%" (
    mkdir "%TEMP_DIR%"
)

:: Extract the downloaded zip file into the temporary folder
echo Extracting NW.js zip file...
".\\node_modules\\7zip-bin\\win\\ia32\\7za.exe" x "%NWJS_ZIP%" -o"%TEMP_DIR%" -y
if errorlevel 1 (
    echo Failed to extract NW.js zip file.
    exit /b 1
)

:: Locate the extracted folder
echo Locating extracted folder...
for /d %%i in ("%TEMP_DIR%\\*") do set "EXTRACTED_DIR=%%i"

echo Copying extracted files to the current directory...
xcopy "%EXTRACTED_DIR%\\*" ".\\" /E /H /C /I /Y
if errorlevel 1 (
    echo Failed to copy extracted files.
    exit /b 1
)

:: Clean up
echo Cleaning up temporary files...
rmdir /S /Q "%TEMP_DIR%"

del -y "%NWJS_ZIP%"

ren nw.exe Translator++.exe

echo Task completed successfully.

start .\\Translator++.exe
`;

    try {
        // Write the batch file into the temporary directory
        await fs.promises.writeFile(batchFileName, batchTemplate, 'utf8');

        // Execute the batch file
        nw.Shell.openExternal(batchFileName);

    } catch (error) {
        console.error('Error generating or executing batch file:', error);
    }
}

NWKit.showChangeCoreNWDialog = async function() {
    const nwVersion = nw.process.versions.nw;
    const isDeveloper = nw.process.versions["nw-flavor"]  == "sdk";
    const is32Bit = nw.process.arch == "ia32";
    const value = await ui.form({jsonForm: 
        {
            schema: {
                nwversion: {
                    "type": "string",
                    "title": t("NWJS Version"),
                    "description": t("Change into this NWJS version"),
                    "default": nwVersion,
                    "enum": [
                        "",
                        "0.52.2",
                        "0.55.0",
                        "0.57.1",
                        "0.60.0",
                        "0.62.2",
                        "0.103.0",
                        "0.104.0",
                        ],
                },
                isDeveloper: {
                    "type": "boolean",
                    "title": t("Use Developer version"),
                    "description": t("Use the NWJS Developer version. The Developer version has developer tools available. Suitable for debugging and development.")
                        +"<br>"
                        +t("In Developer version you can use <b>Developer Console</b>. Developer Console can be accessed by pressing F12 or right-clicking the app and selecting 'Inspect'."),
                    "default": isDeveloper
                },
                is32Bit: {
                    "type": "boolean",
                    "title": t("Use 32-bit version"),
                    "description": t("Use the 32-bit version of NWJS. The 32-bit version is useful for compatibility with older systems. It is recommended to uncheck this option if possible (just upgrade your machine, dude)."),
                    "default": is32Bit
                }
            },
            form: [
                {
                    "type": "warn",
                    "value": `<h2>${t(`Some Translator++ feature may not work across NWJS version`)}</h2>
                        <p>${t(`Please be aware that some Translator++ feature may not work across NWJS version. Make sure to test your project after changing the NWJS version.`)}</p>
                        <p><b>${t("You're currently running on NWJS ver.")} ${nw.process.versions.nw} ${nw.process.versions["nw-flavor"] == "sdk" ? "-dev" : ""} ${nw.process.arch}.</b></p>`,
                },                    
                {
                    "key": "nwversion",
                },
                {
                    "key": "isDeveloper",
                    "inlinetitle": t("Use Developer version"),
                },
                {
                    "key": "is32Bit",
                    "inlinetitle": t("Use 32-bit version"),
                }
                
            ]
        }
    },
    {
        title: t(`Change Translator++ Core NWJS version`),
    });

    console.log(value);
    if (!value?.nwversion) return;

    // check if value is different from current version
    if (value.nwversion == nwVersion && value.isDeveloper == isDeveloper && value.is32Bit == is32Bit) {
        alert(t(`You're already using the selected NWJS version.`));
        return;
    }

    const conf = confirm(t(`This operation will close Translator++ and change the current NW.js version into`)+` ${value.nwversion}.\n`
                        +t(`If you have any unsaved changes, please select 'Cancel' and save your project first.\nDo you want to continue?`));
    if (!conf) return;

    NWKit.changeCoreNW(value.nwversion, value.isDeveloper, value.is32Bit);
}


async function getManifest() {
    const fs = require('fs').promises;
    const manifestContent = await fs.readFile('package.json', 'utf-8');
    return JSON.parse(manifestContent);
}

async function saveManifest(manifest) {
    const fs = require('fs').promises;
    const manifestContent = JSON.stringify(manifest, null, 4);
    await fs.writeFile('package.json', manifestContent, 'utf-8');
}


/**
 * Adds a value to the "chromium-args" in package.json.
 * @param {string} value The value to add.
 */
NWKit.addManifestChromeArgs = async function(value) {
    const manifest = await getManifest();
    let args = manifest['chromium-args'] || '';
    const argsArray = args.split(' ').filter(arg => arg.trim() !== '');
    if (!argsArray.includes(value)) {
        argsArray.push(value);
        manifest['chromium-args'] = argsArray.join(' ');
        await saveManifest(manifest);
    }
};

/**
 * Removes a value from the "chromium-args" in package.json.
 * @param {string} value The value to remove.
 */
NWKit.removeManifestChromeArgs = async function(value) {
    const manifest = await getManifest();
    let args = manifest['chromium-args'] || '';
    let argsArray = args.split(' ').filter(arg => arg.trim() !== '');
    if (argsArray.includes(value)) {
        argsArray = argsArray.filter(arg => arg !== value);
        manifest['chromium-args'] = argsArray.join(' ');
        await saveManifest(manifest);
    }
};


/**
 * Change NW.js version of an existing NW.js executable to a different version
 * @param {string} targetNWExecutable - Path to a valid nwjs .exe file to upgrade/change version
 * @param {string} version - NW.js version to install (e.g., "0.68.1")
 * @param {boolean} isSDK - Whether to use SDK version
 * @param {boolean} is32Bit - Whether to use 32-bit version
 */
NWKit.changeNWVersionOf = async function(targetNWExecutable, version="0.68.1", isSDK=false, is32Bit=false) {
    const fs = require('fs');
    const path = require('path');
    const fsp = fs.promises;
    
    // Validate the executable path
    if (!targetNWExecutable) {
        throw new Error("Target NW executable is not specified");
    }
    
    if (!await common.isFileAsync(targetNWExecutable)) {
        throw new Error(`The specified executable does not exist: ${targetNWExecutable}`);
    }
    
    // Validate it's an .exe file
    if (!targetNWExecutable.toLowerCase().endsWith('.exe')) {
        throw new Error("Target must be a valid .exe file");
    }
    
    // Resolve paths
    const PROJECT_DIR = nwPath.resolve(".");
    targetNWExecutable = nwPath.resolve(targetNWExecutable);
    const targetDir = nwPath.dirname(targetNWExecutable);
    const originalExeName = nwPath.basename(targetNWExecutable);
    
    // Check if we're replacing the current application
    const currentExe = nwPath.resolve(process.execPath);
    const isReplacingCurrent = (targetNWExecutable === currentExe);
    
    if (isReplacingCurrent && info.isDebugVersion()) {
        const sign = prompt("You're running on the development version. You usually don't do this. Please type 'I understand' to continue.");
        if (sign !== "I understand") {
            return;
        }
    }
    
    // Show loading UI
    var loadingIsDisplayed = ui.log.isShown();
    if (!loadingIsDisplayed) {
        ui.log.show();
    }
    
    try {
        ui.log.progress(0, "Processing");
        await ui.log("Starting NW.js version change process");
        
        // Remove existing conversion marker if exists
        const conversionMarker = nwPath.join(targetDir, "conversion.txt");
        if (await common.isFileAsync(conversionMarker)) {
            await ui.log("Removing existing conversion marker");
            await common.unlink(conversionMarker);
        }
        
        ui.log.progress(10, "Cleaning up old files");
        
        // Run the uninstall script if it exists
        const uninstallScript = nwPath.join(targetDir, "uninstallnw.bat");
        if (await common.isFileAsync(uninstallScript)) {
            await ui.log("Running uninstall script");
            await common.aSpawn("cmd.exe", ["/c", uninstallScript], {shell: true, cwd: targetDir});
        }
        
        // Remove the target executable (uninstallnw.bat doesn't do this)
        if (await common.isFileAsync(targetNWExecutable)) {
            await ui.log(`Removing old executable: ${originalExeName}`);
            try {
                await common.unlink(targetNWExecutable);
            } catch (unlinkError) {
                console.warn(`Could not remove ${originalExeName}: ${unlinkError.message}`);
            }
        }
        
        ui.log.progress(30, "Installing new NW.js version");
        
        // Use NWKit.installNW to install the new version
        await ui.log(`Installing NW.js version ${version} (SDK: ${isSDK}, 32-bit: ${is32Bit})`);
        await NWKit.installNW(version, targetDir, isSDK, is32Bit);
        
        ui.log.progress(90, "Finalizing");
        
        // Rename nw.exe to match the original executable name
        const nwExe = nwPath.join(targetDir, "nw.exe");
        const newExePath = nwPath.join(targetDir, originalExeName);
        
        if (await common.isFileAsync(nwExe)) {
            await ui.log(`Renaming nw.exe to ${originalExeName}`);
            await fsp.rename(nwExe, newExePath);
        }
        
        // Write conversion marker
        await ui.log("Writing conversion marker");
        await common.writeFile(conversionMarker, `NW.js conversion completed successfully
Date: ${new Date().toISOString()}
Original: ${targetNWExecutable}
New Version: ${version}
SDK: ${isSDK}
32-bit: ${is32Bit}
Target: ${targetDir}
`);
        
        ui.log.progress(100, "Completed");
        await ui.log("NW.js version change completed successfully!");
        
        return targetDir;
        
    } catch (error) {
        await ui.log(`Error during version change: ${error.message}`);
        console.error('Error during NW.js version change:', error);
        throw error;
    } finally {
        if (!loadingIsDisplayed) {
            ui.log.hide();
        }
    }
};

NWKit.getNWVersionFromExecutable = async function(nwExecutable) {
    if (!nwExecutable) {
        throw new Error("NW executable path is not specified");
    }
    const exeInfo = await common.getFileVer(nwExecutable);
    /**
     * Expected exeInfo structure:
     * {
            "Language": "0x0409 (English (United States))",
            "CharSet": "0x04b0 Unicode",
            "OleSelfRegister": "Disabled",
            "CompanyName": "The NW.js Community",
            "FileDescription": "nwjs",
            "InternalName": "nw_exe",
            "OriginalFilenam": "nw.exe",
            "ProductName": "nwjs",
            "ProductVersion": "0.68.1",
            "FileVersion": "0.68.1",
            "LegalCopyright": "Copyright 2020, The NW.js community and The Chromium Authors. All rights reserved.",
            "Signature": "feef04bd",
            "Struc Ver": "00010000",
            "FileVer": "00000044:00010000 (0.68:1.0)",
            "ProdVer": "00000044:00010000 (0.68:1.0)",
            "FlagMask": "00000017",
            "Flags": "00000000",
            "OS": "00000004 Win32",
            "FileType": "00000001 App",
            "SubType": "00000000",
            "FileDate": "00000000:00000000"
        }
     */

    const result = {
        version: exeInfo["ProductVersion"] || exeInfo["FileVersion"] || null,
        isSDK: false,
        is32Bit: false,
        isNWjs: false,
    }

    // Determine if it's SDK version based on the existance of nwjc.exe in the same directory
    const nwDir = nwPath.dirname(nwExecutable);
    const nwjcPath = nwPath.join(nwDir, "nwjc.exe");
    result.isSDK = await common.isFileAsync(nwjcPath);

    // Determine if it's nwjs from the availability of nw.dll file
    const nwDllPath = nwPath.join(nwDir, "nw.dll");
    result.isNWjs = await common.isFileAsync(nwDllPath);


    return result;
}

thisAddon.NWKit = NWKit;