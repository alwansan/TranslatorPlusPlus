const fs = require('fs');
const path = require('path');
const { parentPort } = require('worker_threads');

let totalFiles = 0;
let processedFiles = 0;

parentPort.on('message', (msg) => {
    const { rootPath, searchText, options } = msg;
    const startTime = Date.now();

    try {
        // First pass: count total files
        totalFiles = 0;
        processedFiles = 0;
        countFiles(rootPath, options);
        parentPort.postMessage({ type: 'totalFiles', count: totalFiles });
        
        // Second pass: process files
        traverseDirectory(rootPath, searchText, options);
    } catch (err) {
        parentPort.postMessage({ type: 'error', error: err.message });
    }

    parentPort.postMessage({ type: 'done', duration: Date.now() - startTime });
});

function countFiles(currentPath, options) {
    let files;
    try {
        files = fs.readdirSync(currentPath);
    } catch (err) { return; }

    files.forEach(file => {
        const fullPath = path.join(currentPath, file);
        let stat;
        try { stat = fs.statSync(fullPath); } catch (e) { return; }

        if (stat.isDirectory()) {
            if (options.recursive) countFiles(fullPath, options);
        } else if (stat.isFile()) {
            if (isTargetFileType(file, options.fileExtensions)) {
                totalFiles++;
            }
        }
    });
}

function traverseDirectory(currentPath, searchText, options) {
    let files;
    try {
        files = fs.readdirSync(currentPath);
    } catch (err) { return; }

    files.forEach(file => {
        const fullPath = path.join(currentPath, file);
        let stat;
        try { stat = fs.statSync(fullPath); } catch (e) { return; }

        if (stat.isDirectory()) {
            if (options.recursive) traverseDirectory(fullPath, searchText, options);
        } else if (stat.isFile()) {
            if (isTargetFileType(file, options.fileExtensions)) {
                processFile(fullPath, file, currentPath, stat, searchText, options);
            }
        }
    });
}

function isTargetFileType(filename, extensions) {
    if (extensions.includes('*') || extensions.length === 0) return true;
    const extWithDot = path.extname(filename).toLowerCase(); 
    const extNoDot = extWithDot.replace('.', '');            
    return extensions.some(e => {
        const cleanE = e.replace('*', '').replace('.', '');
        return cleanE === extNoDot;
    });
}

function processFile(fullPath, fileName, dirPath, stat, searchText, options) {
    processedFiles++;
    
    // Send progress update
    parentPort.postMessage({
        type: 'progress',
        processed: processedFiles,
        total: totalFiles
    });
    
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split(/\r?\n/);
        const fileMatches = [];

        // Prepare Regex
        let regex;
        let flags = options.caseSensitive ? 'g' : 'gi'; // Global is required for exec() loop

        if (options.isRegex) {
            try { regex = new RegExp(searchText, flags); } catch (e) { return; }
        } else {
            let escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (options.wholeWord) escaped = `\\b${escaped}\\b`;
            regex = new RegExp(escaped, flags);
        }

        // Scan lines
        lines.forEach((line, lineIndex) => {
            // We use a while loop with exec to find multiple matches on one line
            // and capture their column indices for highlighting
            regex.lastIndex = 0; 
            let match;
            while ((match = regex.exec(line)) !== null) {
                fileMatches.push({
                    line: lineIndex + 1,
                    startCol: match.index,
                    endCol: match.index + match[0].length
                });
                
                // Prevent infinite loop if zero-length match (e.g. regex ^)
                if (match.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
            }
        });

        // If we found matches, send the result for this file
        if (fileMatches.length > 0) {
            parentPort.postMessage({
                type: 'fileResult',
                data: {
                    fileName: fileName,
                    dirPath: dirPath,
                    date: formatTime(stat.mtime),
                    size: formatSize(stat.size),
                    count: fileMatches.length,
                    matches: fileMatches
                }
            });
        }

    } catch (err) { }
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(dateObj) {
    return dateObj.toLocaleString();
}