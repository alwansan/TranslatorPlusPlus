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

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const wmic = {}
/**
 * Calculates the maximum width of each column in a line.
 *
 * @param {string} line - The input line containing words and white spaces.
 * @returns {Array<{ column: string, maxWidth: number | undefined }>} An array of objects representing each column and its maximum width.
 */
wmic.calculateColumnWidths = function(line) {
    var copyLine = line.trim();
    var columns = [...copyLine.matchAll(/\b(\w+\s+)/g)].map(match => match[1]);
  
    var result = []
    for (let column of columns) {
        result.push({
            column:column.trim(),
            maxWidth: column.length
        })
    }
    function getLastWord(text) {
        const matches = text.match(/\b\w+\b/g);
      
        if (!matches) {
          // No words found in the text
          return null;
        }
      
        return matches[matches.length - 1];
      }
    result.push({
        column: getLastWord(copyLine).trim(),
        maxWidth:undefined
    })
    return result;
  }

/**
 * Parses the result of a WMIC command into an array of objects.
 *
 * @param {string} result - The result string obtained from a WMIC command.
 * @returns {Array<Object>} An array of objects representing each row of the WMIC result.
 */
wmic.parseWmicResult = function(result) {
    // Split the result into lines
    console.log("Parsing\n", result);
    const lines = result.split('\n');

    // Extract headers from the first line
    //const headers = lines[0].trim().split(/\s+/);

    // Calculate the maximum width of each column based on the header
    const columnWidths = this.calculateColumnWidths(lines[0]);

    // Initialize an array to store objects
    const objects = [];

    // Iterate through the remaining lines
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        // skip blank line
        if (!lines[i].trim()) continue;
        // Extract values based on the calculated column widths
        let startIndex = 0;
        for (let j = 0; j < columnWidths.length-1; j++) {
            const header = columnWidths[j].column;
            const width = columnWidths[j].maxWidth;
            obj[header] = lines[i].substring(startIndex, startIndex + width).trim();
            startIndex += width; // Add 1 for the space between columns
        }

        // Add the rest of the text to the last column (infinite width)
        obj[columnWidths[columnWidths.length-1].column] = lines[i].substring(startIndex).trim();

        // Add the object to the array
        objects.push(obj);
    }

    return objects;
}

/**
 * Retrieves process information asynchronously based on command-line query parameters.
 *
 * This function first attempts to use a modern PowerShell command to get structured JSON output.
 * If PowerShell fails, it falls back to the legacy WMIC command and parses its text output.
 *
 * @param {Array<string>} queryParams - An array of strings to search for in the process command line.
 * @returns {Promise<Array<{ProcessId: string, CommandLine: string}> | null>} A promise that resolves to an array of matching process objects, or null if no match is found.
 */
wmic.getProcessIdAsync = async function(queryParams) {
    if (process.platform !== 'win32') {
        console.error("This function is only available on Windows.");
        return null;
    }

    if (!queryParams || queryParams.length === 0) {
        console.error("Query parameters cannot be empty.");
        return null;
    }

    // --- Method 1: PowerShell (Preferred) ---
    try {
        // Build the filter script for PowerShell's Where-Object
        const filterScript = queryParams
            .map(param => `($_.CommandLine -like '*${param}*')`)
            .join(' -and ');

        // Construct the full PowerShell command to get structured JSON output
        const psCommand = `powershell.exe -NoProfile -Command "& {Get-CimInstance -ClassName Win32_Process | Where-Object { ${filterScript} } | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress}"`;

        const { stdout } = await exec(psCommand);

        // If stdout is empty, no processes were found.
        if (!stdout.trim()) {
            return null;
        }

        const processes = JSON.parse(stdout);
        
        // ConvertTo-Json returns a single object if one result is found, and an array for multiple.
        // We ensure the function always returns an array or null.
        if (!processes) {
            return null;
        }
        const results = Array.isArray(processes) ? processes : [processes];
        
        // The process running the command itself might be included, let's filter it out.
        return results.filter(p => !p.CommandLine.includes('ConvertTo-Json'));

    } catch (psError) {
        console.warn(`PowerShell method failed: ${psError.message}. Falling back to WMIC.`);

        // --- Method 2: WMIC (Fallback) ---
        try {
            const queryString = queryParams.map(param => `commandline like '%%%${param}%%'`).join(' AND ');
            const wmicCommand = `wmic process where "${queryString}" get processid,commandline`;
            
            const { stdout, stderr } = await exec(wmicCommand);

            if (stderr) {
                // WMIC often writes non-error info to stderr, so we only fail if stdout is also empty.
                if (!stdout.trim()) {
                    throw new Error(`WMIC stderr: ${stderr}`);
                }
            }

            const lines = stdout.trim().split('\n');
            if (lines.length > 1) {
                const results = this.parseWmicResult(stdout);
                // Filter out the wmic command itself from the results
                return results.filter(p => !p.CommandLine.includes('wmic process where'));
            } else {
                return null; // No matching process found
            }
        } catch (wmicError) {
            // If both methods fail, throw a comprehensive error
            console.error(
                `Failed to retrieve processes. Both PowerShell and WMIC methods failed.\n` +
                `--- PowerShell Error ---\n${psError.message}\n` +
                `--- WMIC Error ---\n${wmicError.message}`
            );
            return null;
        }
    }
}

module.exports = wmic;