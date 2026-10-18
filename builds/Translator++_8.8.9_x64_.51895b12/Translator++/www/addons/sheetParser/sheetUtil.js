const csv       = require('jquery-csv');
var nwPath      = require('path');
const common    = require('www/js/common.js');

const sheetUtil = {
    scriptPath: nwPath.resolve("www/addons/sheetParser"),
};

/**
 * Parse a sheet into an array
 * @param  {} xlsFile - Path to the file
 * @returns Array of the sheet, or undefined
 */
sheetUtil.parseSheet = async function(xlsFile) {
    if (!await common.isFileAsync(xlsFile)) return;

    if (nwPath.extname(xlsFile).toLowerCase() == ".csv") {
        return {
            Worksheet: csv.toArrays(await common.fileGetContents(xlsFile))
        }
    }

    return await php.spawn("sheetToArray.php", {
        args: {
            file    : nwPath.resolve(xlsFile)
        },
        scriptPath: this.scriptPath
    });
}

/**
 * Patch Sheet
 * @param  {String} xlsFile - Path to the spreadsheet file
 * @param  {Object} patch - Object representation of the patch
 * Patch format should be:
 * {
 *     Sheet1: [
 *         {
 *             row: 0,
 *             col: 0,
 *             translation: "Translation"
 *         }
 *     ]
 * }
 */
sheetUtil.patchSheet = async function(xlsFile, patch) {
    if (!await common.isFileAsync(xlsFile)) return;

    if (nwPath.extname(xlsFile).toLowerCase() == ".csv") {
        // patch via javascript
    }

    const patchFile = `xlsFile.patch~`;
    ui.log(`Dumping patch ${patchFile}`);
    await common.filePutContents(patchFile, JSON.stringify(patch), 'utf8', false);

    // patch via PHP
    await php.spawn("patchSheet.php", {
        args: {
            file    : nwPath.resolve(xlsFile),
            patch   : nwPath.resolve(patchFile)
        },
        onData: (output) => {
            ui.log(output.toString());
        },
        scriptPath: this.scriptPath
    });
    ui.log(`Removing patch file.`);
    await common.unlink(patchFile);
}
module.exports = sheetUtil;