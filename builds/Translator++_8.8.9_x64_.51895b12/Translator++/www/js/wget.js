// file: wget.js

const { spawn } = require('child_process');
const path = require('path');
const { constants } = require('fs');
const fs = require('fs/promises');
const { URL } = require('url');

// --- Start of inlined utilities ---

function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*([KMGT])?/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = (match[2] || '').toUpperCase();

    switch (unit) {
        case 'K': return value * 1024;
        case 'M': return value * 1024 * 1024;
        case 'G': return value * 1024 * 1024 * 1024;
        case 'T': return value * 1024 * 1024 * 1024 * 1024;
        default: return value;
    }
}

function parseBytes(numStr) {
    if (!numStr) return 0;
    return parseInt(numStr.replace(/,/g, ''), 10);
}

function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formats seconds into a human-readable string (e.g., 1h 5m, 3m 10s, 15s).
 * @param {number} seconds The total number of seconds.
 * @returns {string} The formatted time string.
 */
function formatSeconds(seconds) {
    if (!isFinite(seconds) || seconds < 0) {
        return '--';
    }
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }
    if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${minutes}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// --- End of inlined utilities ---

const WGET_PATH = path.resolve('3rdParty/GnuWin32/bin/wget.exe');

const lengthRegex = /Length:.*?([\d,]+)/;
const filenameRegex = /filename="([^"]+)"/i;
const progressRegex = /.*?(\d{1,3})%\s*\[.*?\]\s+([\d.]+[KMGTB]*)\s+([^\s]+\/s)/;

async function checkWgetBinary() {
    try {
        await fs.access(WGET_PATH, constants.X_OK);
    } catch (error) {
        throw new Error(`wget.exe not found or not executable at: ${WGET_PATH}`);
    }
}

async function getFilenameFromUrlOrHeaders(urlString, options) {
    try {
        const fetchOptions = {
            method: 'HEAD',
            headers: options.userAgent ? { 'User-Agent': options.userAgent } : {}
        };
        const response = await fetch(urlString, fetchOptions);
        const disposition = response.headers.get('content-disposition');
        if (disposition) {
            const match = disposition.match(filenameRegex);
            if (match && match[1]) return path.basename(match[1]);
        }
    } catch (err) {
        console.warn(`Warning: Could not fetch headers for ${urlString}. Falling back to URL path. Error: ${err.message}`);
    }
    const url = new URL(urlString);
    const filename = path.basename(url.pathname);
    return (filename && filename !== '/') ? filename : 'download.dat';
}

async function resolveDestinationPath(from, to, options) {
    let isDirectory = false;
    try {
        isDirectory = (await fs.stat(to)).isDirectory();
    } catch (err) {
        if (err.code === 'ENOENT' && (to.endsWith(path.sep) || to.endsWith('/'))) {
            isDirectory = true;
        }
    }
    if (isDirectory) {
        const filename = await getFilenameFromUrlOrHeaders(from, options);
        return path.join(to, filename);
    }
    return path.resolve(to);
}

/**
 * Downloads a file from a URL to a local path using the external wget.exe binary.
 *
 * @param {string} from - The source URL to download from.
 * @param {string} to - The destination file or folder path.
 * @param {object} [options={}] - An object of options to pass to wget.
 * @param {function({downloaded: number|string, total: number|string, percent: number, speed: number|string, eta: number|string})} [options.onProgress] - Callback for progress updates.
 * @param {boolean} [options.dynamicUnits=false] - If true, `downloaded`, `total`, `speed`, and `eta` in onProgress will be formatted strings.
 * @param {number} [options.throttle=500] - Milliseconds to throttle progress updates.
 * @param {boolean} [options.noCheckCertificate=false] - Use --no-check-certificate flag.
 * @param {number} [options.timeout] - Set network timeout in seconds.
 * @param {string} [options.userAgent] - Set the User-Agent header.
 * @returns {Promise<string>} A promise that resolves with the final path of the downloaded file, or rejects on error.
 */
async function wget(from, to, options = {}) {
    await checkWgetBinary();
    
    const finalPath = await resolveDestinationPath(from, to, options);
    await fs.mkdir(path.dirname(finalPath), { recursive: true });

    const args = [];
    const useProgress = typeof options.onProgress === 'function';

    if (useProgress) args.push('--progress=bar:force:noscroll');
    else args.push('-q');
    
    if (options.noCheckCertificate) args.push('--no-check-certificate');
    if (options.timeout) args.push(`--timeout=${options.timeout}`);
    if (options.userAgent) args.push(`--user-agent=${options.userAgent}`);
    args.push(from, '-O', finalPath);
    
    console.log(`Executing: ${WGET_PATH} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
        const wgetProcess = spawn(WGET_PATH, args);

        let stderrBuffer = '';
        let totalSize = 0;
        let lastProgressUpdate = 0;
        const throttle = options.throttle || 500;

        wgetProcess.stderr.on('data', (data) => {
            const chunk = data.toString();
            stderrBuffer += chunk;

            if (!useProgress) return;

            if (totalSize === 0) {
                const lengthMatch = stderrBuffer.match(lengthRegex);
                if (lengthMatch && lengthMatch[1]) totalSize = parseBytes(lengthMatch[1]);
            }
            
            if (Date.now() - lastProgressUpdate < throttle) return;
            
            const parts = stderrBuffer.split('\r');
            const lastPart = parts.reverse().find(p => p.trim() !== '');

            if (lastPart) {
                const progressMatch = lastPart.match(progressRegex);
                if (progressMatch) {
                    lastProgressUpdate = Date.now();
                    
                    const downloadedBytes = parseSize(progressMatch[2]);
                    const speedBytes = parseSize(progressMatch[3]);
                    const remainingBytes = totalSize - downloadedBytes;
                    const etaSeconds = speedBytes > 0 && totalSize > 0 ? remainingBytes / speedBytes : Infinity;
                    
                    let progressData;
                    if (options.dynamicUnits) {
                        progressData = {
                            percent: parseInt(progressMatch[1], 10),
                            downloaded: formatBytes(downloadedBytes),
                            speed: `${formatBytes(speedBytes)}/s`,
                            eta: formatSeconds(etaSeconds),
                            total: formatBytes(totalSize),
                        };
                    } else {
                        progressData = {
                            percent: parseInt(progressMatch[1], 10),
                            downloaded: downloadedBytes,
                            speed: speedBytes,
                            eta: isFinite(etaSeconds) ? etaSeconds : null,
                            total: totalSize,
                        };
                    }
                    options.onProgress(progressData);
                }
            }
        });

        wgetProcess.on('error', (err) => reject(new Error(`Failed to start wget process: ${err.message}`)));

        wgetProcess.on('close', async (code) => {
            if (code === 0) {
                if (useProgress && totalSize > 0) {
                    options.onProgress(options.dynamicUnits ? {
                        percent: 100, downloaded: formatBytes(totalSize), speed: '0 Bytes/s', eta: '0s', total: formatBytes(totalSize),
                    } : {
                        percent: 100, downloaded: totalSize, speed: 0, eta: 0, total: totalSize,
                    });
                }
                
                try {
                    // Ensure the file handle is released and the file is accessible before resolving.
                    await fs.stat(finalPath);
                    console.log(`\nDownload successful and file verified at ${finalPath}`);
                    resolve(finalPath);
                } catch (statError) {
                    reject(new Error(`Download finished but file is inaccessible at ${finalPath}. Error: ${statError.message}`));
                }
            } else {
                const errorMessage = `wget process exited with error code ${code}.\nStderr:\n${stderrBuffer.trim()}`;
                await fs.unlink(finalPath).catch(() => {});
                reject(new Error(errorMessage));
            }
        });
    });
}

module.exports = { wget };