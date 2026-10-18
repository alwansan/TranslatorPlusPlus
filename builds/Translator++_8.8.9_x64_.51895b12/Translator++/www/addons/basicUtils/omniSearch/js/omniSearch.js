const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { exec } = require('child_process');
const BLS = require("better-localstorage");

// --- STATE ---
let worker = null;
let fileGrid, lineGrid, editor;

// Data stores
let allFileResults = []; // Array of { fileName, matches: [], etc }
let currentFileIndex = -1; // Index in allFileResults
let lastSelectedRow = -1; // Track last selected row to prevent unnecessary refresh

// Context menu for file grid
let fileGridContextMenu = null;

// LocalStorage instance for persistence
const storage = new BLS("omniSearch");
const STORAGE_KEY_CONFIG = 'omniSearch_config';
const STORAGE_KEY_RESULTS = 'omniSearch_results';

// Preview column constants
const PREVIEW_CHARS_BEFORE = 24;
const PREVIEW_CHARS_AFTER = 50;

// --- PROGRESS BAR HELPERS ---

function showProgress() {
    const progressContainer = document.getElementById('progress-container');
    progressContainer.classList.add('active');
}

function hideProgress() {
    const progressContainer = document.getElementById('progress-container');
    progressContainer.classList.remove('active');
    updateProgress(0);
}

function updateProgress(percent) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const clampedPercent = Math.min(100, Math.max(0, percent));
    progressBar.style.width = clampedPercent + '%';
    progressText.innerText = Math.round(clampedPercent) + '%';
}

function setStatusText(text) {
    document.getElementById('status-text').innerText = text;
}

// --- INITIALIZATION ---

// 1. Ace Editor
editor = ace.edit("editor");
editor.setTheme("ace/theme/chrome");
editor.session.setMode("ace/mode/text");
editor.setReadOnly(true);
editor.$blockScrolling = Infinity;
editor.setShowPrintMargin(false);

// Add Ctrl+Scroll zoom functionality
let editorFontSize = 12; // Default font size
const editorElement = document.getElementById('editor');
editorElement.addEventListener('wheel', function(e) {
    if (e.ctrlKey) {
        e.preventDefault();
        
        // Determine zoom direction
        if (e.deltaY < 0) {
            // Scroll up - increase font size
            editorFontSize = Math.min(editorFontSize + 1, 30); // Max 30px
        } else {
            // Scroll down - decrease font size
            editorFontSize = Math.max(editorFontSize - 1, 8); // Min 8px
        }
        
        // Apply new font size
        editor.setFontSize(editorFontSize);
    }
}, { passive: false });

// 2. Top Grid (Files)
const fileContainer = document.getElementById('file-grid');
fileGrid = new Handsontable(fileContainer, {
    data: [],
    colHeaders: ['✓', 'File Name', 'Path', 'Count', 'Size', 'Date Modified'],
    columns: [
        { data: 'selected', type: 'checkbox', className: 'htCenter', width: 40 },
        { data: 'fileName', readOnly: true },
        { data: 'dirPath', readOnly: true, width: 250 }, // Adjusted key
        { data: 'count', readOnly: true, width: 60, className: 'htRight' },
        { data: 'size', readOnly: true, width: 80 },
        { data: 'date', readOnly: true, width: 200, className: 'htNoWrap'},

    ],
    rowHeaders: true,
    height: '100%', width: '100%',
    stretchH: 'last',
    selectionMode: 'single',
    licenseKey: 'non-commercial-and-evaluation',
    outsideClickDeselects: false,
    manualColumnResize: true,
    beforeSelection: (r) => {
        // clear all highlights class on tr

    },
    afterSelection: (r) => {
        $(fileContainer).find("tr.selected-row").removeClass("selected-row");

        // Only refresh if a different row is selected
        if (r !== lastSelectedRow) {
            lastSelectedRow = r;
            const rowData = fileGrid.getSourceDataAtRow(r);
            if(rowData) loadFileDetails(rowData);
        }

    },
    afterSelectionEnd: (r) => {
        // add highlight class to selected row
        $(fileContainer).find("th.ht__highlight").parent().addClass("selected-row");

    },
    afterGetRowHeader: function(row, TH) {
        const selected = this.getSelected();
        if (selected && selected.length > 0) {
            const selectedRow = selected[0][0];
            if (row === selectedRow) {
                const $thisTH = $(TH)
                const $thisTR = $(TH).closest("tr");
                $thisTR.addClass("selected-row");
            }
        }

    }

});

// Add double-click handler to open file with default app
fileContainer.addEventListener('dblclick', function(e) {
    const selected = fileGrid.getSelected();
    if (selected && selected.length > 0) {
        const row = selected[0][0];
        const rowData = fileGrid.getSourceDataAtRow(row);
        if (rowData) {
            const filePath = path.join(rowData.dirPath, rowData.fileName);
            openFileWithDefaultApp(filePath);
        }
    }
});

// Create context menu for file grid
fileGridContextMenu = new nw.Menu();
fileGridContextMenu.append(new nw.MenuItem({
    label: 'Open file with associated app',
    click: function() {
        const selected = fileGrid.getSelected();
        if (selected && selected.length > 0) {
            const row = selected[0][0];
            const rowData = fileGrid.getSourceDataAtRow(row);
            if (rowData) {
                const filePath = path.join(rowData.dirPath, rowData.fileName);
                openFileWithDefaultApp(filePath);
            }
        }
    }
}));

fileGridContextMenu.append(new nw.MenuItem({
    label: 'Open file location',
    click: function() {
        const selected = fileGrid.getSelected();
        if (selected && selected.length > 0) {
            const row = selected[0][0];
            const rowData = fileGrid.getSourceDataAtRow(row);
            if (rowData) {
                const filePath = path.join(rowData.dirPath, rowData.fileName);
                openFileLocation(filePath);
            }
        }
    }
}));

fileGridContextMenu.append(new nw.MenuItem({ type: 'separator' }));

fileGridContextMenu.append(new nw.MenuItem({
    label: 'Select all',
    click: function() {
        allFileResults.forEach(file => file.selected = true);
        fileGrid.render();
    }
}));

fileGridContextMenu.append(new nw.MenuItem({
    label: 'Clear selection',
    click: function() {
        allFileResults.forEach(file => file.selected = false);
        fileGrid.render();
    }
}));

fileGridContextMenu.append(new nw.MenuItem({
    label: 'Invert selection',
    click: function() {
        allFileResults.forEach(file => file.selected = !file.selected);
        fileGrid.render();
    }
}));

fileGridContextMenu.append(new nw.MenuItem({ type: 'separator' }));

fileGridContextMenu.append(new nw.MenuItem({
    label: 'Replace all',
    click: function() {
        showReplaceAllDialog();
    }
}));

// Attach context menu to file grid
fileContainer.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    fileGridContextMenu.popup(e.x, e.y);
    return false;
});

// 3. Bottom Left Grid (Line Numbers)
const lineContainer = document.getElementById('line-grid');
lineGrid = new Handsontable(lineContainer, {
    data: [],
    colHeaders: ['Line', 'Preview'],
    columns: [
        { data: 'line', readOnly: true, className: 'htCenter', width: 60 },
        { data: 'preview', readOnly: true, renderer: 'html', className: 'htLeft preview-cell htNoWrap' }
    ],
    rowHeaders: false,
    height: '100%', width: '100%',
    stretchH: 'last',
    selectionMode: 'single',
    licenseKey: 'non-commercial-and-evaluation',
    outsideClickDeselects: false,
    afterSelection: (r) => {
        $(lineContainer).find("tr.selected-row").removeClass("selected-row");
        const rowData = lineGrid.getSourceDataAtRow(r);
        if(rowData) scrollToLine(rowData.line);
    },
    afterSelectionEnd: (r) => {
        // add highlight class to selected row
        $(lineContainer).find("th.ht__highlight").parent().addClass("selected-row");

    },
    afterGetRowHeader: function(row, TH) {
        const selected = this.getSelected();
        if (selected && selected.length > 0) {
            const selectedRow = selected[0][0];
            if (row === selectedRow) {
                console.log("afterGetRowHeader", row, TH);
                const $thisTH = $(TH)
                const $thisTR = $(TH).closest("tr");
                $thisTR.addClass("selected-row");
            }
        }

    }
});

// --- INITIALIZE FROM GET PARAMS OR LOCALSTORAGE ---
window.addEventListener('DOMContentLoaded', function() {
    initializeSearchState();
});

async function initializeSearchState() {
    const urlParams = new URLSearchParams(window.location.search);
    const hasGetParams = urlParams.toString().length > 0;
    
    if (hasGetParams) {
        // Load from GET parameters
        loadFromGetParams(urlParams);
    } else {
        // Load from localStorage
        await restoreSearchState();
    }
}

function loadFromGetParams(urlParams) {
    if (urlParams.has('searchPath')) {
        document.getElementById('searchPath').value = urlParams.get('searchPath');
    }
    if (urlParams.has('fileTypes')) {
        document.getElementById('fileTypes').value = urlParams.get('fileTypes');
    }
    if (urlParams.has('searchText')) {
        document.getElementById('searchText').value = urlParams.get('searchText');
    }
    if (urlParams.has('subfolders')) {
        document.getElementById('optSubfolders').checked = urlParams.get('subfolders') === 'true';
    }
    if (urlParams.has('caseSensitive')) {
        document.getElementById('optCaseSensitive').checked = urlParams.get('caseSensitive') === 'true';
    }
    if (urlParams.has('wholeWord')) {
        document.getElementById('optWholeWord').checked = urlParams.get('wholeWord') === 'true';
    }
    if (urlParams.has('regex')) {
        document.getElementById('optRegex').checked = urlParams.get('regex') === 'true';
    }
    if (urlParams.has('autoSearch') && urlParams.get('autoSearch') === 'true') {
        // Auto-trigger search if specified
        setTimeout(() => startSearch(), 500);
    }
}

async function saveSearchConfig() {
    const config = {
        searchPath: document.getElementById('searchPath').value,
        fileTypes: document.getElementById('fileTypes').value,
        searchText: document.getElementById('searchText').value,
        optSubfolders: document.getElementById('optSubfolders').checked,
        optCaseSensitive: document.getElementById('optCaseSensitive').checked,
        optWholeWord: document.getElementById('optWholeWord').checked,
        optRegex: document.getElementById('optRegex').checked
    };
    await storage.set(STORAGE_KEY_CONFIG, config);
}

async function saveSearchResults() {
    const results = {
        timestamp: Date.now(),
        results: allFileResults,
        lastSelectedRow: lastSelectedRow
    };
    await storage.set(STORAGE_KEY_RESULTS, results);
}

async function restoreSearchState() {
    try {
        const config = await storage.get(STORAGE_KEY_CONFIG);
        if (config) {
            document.getElementById('searchPath').value = config.searchPath || '';
            document.getElementById('fileTypes').value = config.fileTypes || '*.js, *.txt, *.html, *.css, *.json';
            document.getElementById('searchText').value = config.searchText || '';
            document.getElementById('optSubfolders').checked = config.optSubfolders !== false;
            document.getElementById('optCaseSensitive').checked = config.optCaseSensitive || false;
            document.getElementById('optWholeWord').checked = config.optWholeWord || false;
            document.getElementById('optRegex').checked = config.optRegex || false;
        }
        
        const results = await storage.get(STORAGE_KEY_RESULTS);
        if (results && results.results && results.results.length > 0) {
            allFileResults = results.results;
            fileGrid.loadData(allFileResults);
            lastSelectedRow = results.lastSelectedRow || -1;
            
            // Restore selection if available
            if (lastSelectedRow >= 0 && lastSelectedRow < allFileResults.length) {
                setTimeout(() => {
                    fileGrid.selectCell(lastSelectedRow, 0);
                }, 200);
            }
            
            setStatusText(`Restored ${allFileResults.length} files from previous session.`);
        }
    } catch (e) {
        console.error('Error restoring state:', e);
    }
}

// --- EVENT LISTENERS ---

document.getElementById('dirPicker').addEventListener('change', function() {
    document.getElementById('searchPath').value = this.value;
});

// Form submit handler for Enter key
function handleSearchSubmit(event) {
    event.preventDefault();
    startSearch();
    return false;
}

// Open file with default associated application
function openFileWithDefaultApp(filePath) {
    nw.Shell.openItem(filePath);
}

// Open file location in Explorer/Finder and highlight the file
function openFileLocation(filePath) {
    nw.Shell.showItemInFolder(filePath)
}

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const activityBar = document.getElementById('activity-bar');
    sidebar.classList.toggle('collapsed');
    activityBar.classList.toggle('visible');
    setTimeout(() => { fileGrid.render(); lineGrid.render(); editor.resize(); }, 300);
}

// Horizontal Resizer Logic (between top and bottom panels)
const resizer = document.getElementById('resizer-horizontal');
const bottomPanel = document.getElementById('bottom-panel');
const contentArea = document.getElementById('content-area');
let isResizingHorizontal = false;

resizer.addEventListener('mousedown', () => { 
    isResizingHorizontal = true; 
    document.body.classList.add('resizing');
    document.body.style.cursor = 'ns-resize'; 
});
document.addEventListener('mousemove', (e) => {
    if (!isResizingHorizontal) return;
    const contentRect = contentArea.getBoundingClientRect();
    const newHeight = contentRect.bottom - e.clientY;
    if (newHeight > 50 && newHeight < contentRect.height - 50) {
        bottomPanel.style.height = newHeight + 'px';
    }
});
document.addEventListener('mouseup', () => { 
    if (isResizingHorizontal) {
        isResizingHorizontal = false; 
        document.body.classList.remove('resizing');
        document.body.style.cursor = 'default'; 
        fileGrid.render(); lineGrid.render(); editor.resize(); 
    }
});

// Vertical Resizer Logic (between bottom-left and bottom-right)
const resizerVertical = document.getElementById('resizer-vertical');
const bottomLeft = document.getElementById('bottom-left');
const bottomRight = document.getElementById('bottom-right');
let isResizingVertical = false;

resizerVertical.addEventListener('mousedown', () => { 
    isResizingVertical = true; 
    document.body.classList.add('resizing');
    document.body.style.cursor = 'ew-resize'; 
});
document.addEventListener('mousemove', (e) => {
    if (!isResizingVertical) return;
    const bottomPanelRect = bottomPanel.getBoundingClientRect();
    const newWidth = e.clientX - bottomPanelRect.left;
    if (newWidth > 50 && newWidth < bottomPanelRect.width - 50) {
        bottomLeft.style.width = newWidth + 'px';
    }
});
document.addEventListener('mouseup', () => { 
    if (isResizingVertical) {
        isResizingVertical = false; 
        document.body.classList.remove('resizing');
        document.body.style.cursor = 'default'; 
        lineGrid.render(); editor.resize(); 
    }
});

// --- SEARCH LOGIC ---

async function startSearch() {
    const rootPath = document.getElementById('searchPath').value;
    const text = document.getElementById('searchText').value;
    const types = document.getElementById('fileTypes').value;

    if (!rootPath || !text) return alert("Please select folder and enter text.");

    // Save search configuration to localStorage
    await saveSearchConfig();

    // Reset State
    allFileResults = [];
    lastSelectedRow = -1;
    fileGrid.loadData([]);
    lineGrid.loadData([]);
    editor.setValue("");
    
    setStatusText("Searching...");
    showProgress();
    updateProgress(0);
    document.getElementById('btnSearch').disabled = true;
    document.getElementById('btnCancel').disabled = false;

    const options = {
        recursive: document.getElementById('optSubfolders').checked,
        caseSensitive: document.getElementById('optCaseSensitive').checked,
        wholeWord: document.getElementById('optWholeWord').checked,
        isRegex: document.getElementById('optRegex').checked,
        fileExtensions: types.split(',').map(s => s.trim().replace('*.', '').toLowerCase())
    };

    if (worker) worker.terminate();

    const workerPath = path.join(process.cwd(), 'www/addons/basicUtils/omniSearch/js/searchWorker.js');
    worker = new Worker(workerPath);

    let totalFilesToSearch = 0;
    
    worker.postMessage({ rootPath, searchText: text, options });

    worker.on('message', (msg) => {
        if (msg.type === 'totalFiles') {
            // Worker has counted all files
            totalFilesToSearch = msg.count;
            setStatusText(`Searching ${totalFilesToSearch} files...`);
        } else if (msg.type === 'progress') {
            // Worker is reporting progress
            const percent = totalFilesToSearch > 0 ? (msg.processed / totalFilesToSearch) * 100 : 0;
            updateProgress(percent);
            setStatusText(`Searching... ${msg.processed}/${totalFilesToSearch} files (found ${allFileResults.length} matches)`);
        } else if (msg.type === 'fileResult') {
            // msg.data contains { fileName, dirPath, date, size, count, matches[] }
            msg.data.selected = true; // Default checkbox to true
            allFileResults.push(msg.data);
            // For performance, you might want to throttle this in a real app
            // But we will just reload data for simplicity here
            fileGrid.loadData(allFileResults);
        } else if (msg.type === 'done') {
            setStatusText(`Done. Found ${allFileResults.length} files in ${msg.duration}ms.`);
            updateProgress(100);
            setTimeout(() => hideProgress(), 1000);
            finalizeSearch();
            // Save search results to localStorage
            saveSearchResults(); // Fire and forget - no need to await
        } else if (msg.type === 'error') {
            console.error(msg.error);
        }
    });
    
    worker.on('error', (e) => { console.error(e); finalizeSearch(); });
}

function cancelSearch() {
    if (worker) { worker.terminate(); worker = null; }
    setStatusText("Cancelled.");
    hideProgress();
    finalizeSearch();
}

function finalizeSearch() {
    document.getElementById('btnSearch').disabled = false;
    document.getElementById('btnCancel').disabled = true;
}

// --- DETAIL VIEW LOGIC ---

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createPreview(lineContent, matches) {
    // Get the first match on this line
    const match = matches[0];
    const startCol = match.startCol;
    const endCol = match.endCol;
    
    // Extract text parts
    const beforeKeyword = lineContent.substring(0, startCol);
    const keyword = lineContent.substring(startCol, endCol);
    const afterKeyword = lineContent.substring(endCol);
    
    // Trim before keyword if needed
    let displayBefore = beforeKeyword;
    let prependEllipsis = false;
    if (beforeKeyword.length > PREVIEW_CHARS_BEFORE) {
        displayBefore = beforeKeyword.substring(beforeKeyword.length - PREVIEW_CHARS_BEFORE);
        prependEllipsis = true;
    }
    
    // Trim after keyword if needed
    let displayAfter = afterKeyword;
    let appendEllipsis = false;
    if (afterKeyword.length > PREVIEW_CHARS_AFTER) {
        displayAfter = afterKeyword.substring(0, PREVIEW_CHARS_AFTER);
        appendEllipsis = true;
    }
    
    // Build HTML with escaped text and highlighted keyword
    let html = '';
    if (prependEllipsis) html += '...';
    html += escapeHtml(displayBefore);
    html += '<span style="background-color: #e67e22; color: white; padding: 1px 2px;">' + escapeHtml(keyword) + '</span>';
    html += escapeHtml(displayAfter);
    if (appendEllipsis) html += '...';
    
    return html;
}

function loadFileDetails(fileData) {
    // 1. Load Line Grid with previews
    // fileData.matches is array of { line, startCol, endCol }
    
    // Read file to get line content for previews
    const fullPath = path.join(fileData.dirPath, fileData.fileName);
    document.getElementById('preview-filename').innerText = fullPath;

    fs.readFile(fullPath, 'utf8', (err, content) => {
        if (err) {
            editor.setValue("Error: " + err.message);
            // Load grid without previews
            const uniqueLines = [...new Set(fileData.matches.map(m => m.line))];
            const gridData = uniqueLines.map(l => ({ line: l, preview: 'Error loading file' }));
            lineGrid.loadData(gridData);
            return;
        }

        // Split content into lines
        const lines = content.split('\n');
        
        // Group matches by line number
        const matchesByLine = {};
        fileData.matches.forEach(match => {
            if (!matchesByLine[match.line]) {
                matchesByLine[match.line] = [];
            }
            matchesByLine[match.line].push(match);
        });
        
        // Create grid data with previews
        const uniqueLines = [...new Set(fileData.matches.map(m => m.line))].sort((a, b) => a - b);
        const gridData = uniqueLines.map(lineNum => {
            const lineContent = lines[lineNum - 1] || ''; // Lines are 1-indexed
            const lineMatches = matchesByLine[lineNum] || [];
            const preview = lineMatches.length > 0 ? createPreview(lineContent, lineMatches) : escapeHtml(lineContent);
            
            return { 
                line: lineNum, 
                preview: preview 
            };
        });
        
        lineGrid.loadData(gridData);
        
        // Auto-select first row of matches grid
        if (gridData.length > 0) {
            setTimeout(() => {
                lineGrid.selectCell(0, 0);
            }, 100);
        }

        // Set editor content
        const ext = path.extname(fullPath).substring(1);
        const modePath = `ace/mode/${ext === 'js' ? 'javascript' : ext}`;
        try { editor.session.setMode(modePath); } catch(e) {}

        editor.setValue(content, -1);

        // Apply Highlights
        applyHighlights(fileData.matches);
    });
}

function applyHighlights(matches) {
    const Range = ace.require('ace/range').Range;
    
    // Clear existing markers
    const currentMarkers = editor.session.getMarkers();
    for (let id in currentMarkers) {
        if (currentMarkers[id].clazz === 'keyword-highlight') {
            editor.session.removeMarker(id);
        }
    }

    matches.forEach(m => {
        // Ace Rows are 0-indexed, matches are 1-indexed
        const range = new Range(m.line - 1, m.startCol, m.line - 1, m.endCol);
        editor.session.addMarker(range, "keyword-highlight", "text");
    });
}

function scrollToLine(lineNum) {
    // Scroll to specific line
    editor.scrollToLine(lineNum - 1, true, true, function() {});
    editor.gotoLine(lineNum, 0, true);
}

// --- REPLACE ALL FUNCTIONALITY ---

function showReplaceAllDialog() {
    // Check if there are checked files
    const checkedFiles = allFileResults.filter(f => f.selected === true);
    
    if (checkedFiles.length === 0) {
        alert('No files selected. Please check at least one file in the file grid.');
        return;
    }
    
    // Show the modal
    const modal = document.getElementById('replaceAllModal');
    const replaceWithInput = document.getElementById('replaceWithText');
    replaceWithInput.value = '';
    replaceWithInput.focus();
    
    // Update modal title with count
    document.getElementById('replaceModalTitle').innerText = `Replace all in ${checkedFiles.length} file(s)`;
    
    $(modal).modal('show');
}

function performReplaceAll() {
    const replaceWith = document.getElementById('replaceWithText').value;
    const searchText = document.getElementById('searchText').value;
    
    if (!searchText) {
        alert('Search text is empty!');
        return;
    }
    
    // Get all checked files
    const checkedFiles = allFileResults.filter(f => f.selected === true);
    
    if (checkedFiles.length === 0) {
        alert('No files selected.');
        return;
    }
    
    // Close modal first
    $('#replaceAllModal').modal('hide');
    
    // Show progress
    setStatusText('Replacing...');
    showProgress();
    updateProgress(0);
    
    // Get search options
    const options = {
        caseSensitive: document.getElementById('optCaseSensitive').checked,
        wholeWord: document.getElementById('optWholeWord').checked,
        isRegex: document.getElementById('optRegex').checked
    };
    
    let totalReplacements = 0;
    let filesModified = 0;
    
    // Process each checked file
    checkedFiles.forEach((fileData, index) => {
        const fullPath = path.join(fileData.dirPath, fileData.fileName);
        
        // Update progress
        const progress = ((index + 1) / checkedFiles.length) * 100;
        updateProgress(progress);
        setStatusText(`Replacing... (${index + 1}/${checkedFiles.length})`);
        
        try {
            let content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content;
            let replacementCount = 0;
            
            if (options.isRegex) {
                // Use regex
                const flags = options.caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchText, flags);
                newContent = content.replace(regex, replaceWith);
                // Count matches
                const matches = content.match(regex);
                replacementCount = matches ? matches.length : 0;
            } else {
                // Plain text replacement
                let searchPattern = searchText;
                
                if (options.wholeWord) {
                    // Whole word: use regex with word boundaries
                    const escapedText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const flags = options.caseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(`\\b${escapedText}\\b`, flags);
                    newContent = content.replace(regex, replaceWith);
                    const matches = content.match(regex);
                    replacementCount = matches ? matches.length : 0;
                } else {
                    // Simple string replacement
                    if (options.caseSensitive) {
                        const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                        newContent = content.replace(regex, replaceWith);
                        const matches = content.match(regex);
                        replacementCount = matches ? matches.length : 0;
                    } else {
                        const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        newContent = content.replace(regex, replaceWith);
                        const matches = content.match(regex);
                        replacementCount = matches ? matches.length : 0;
                    }
                }
            }
            
            // Only write if content changed
            if (newContent !== content && replacementCount > 0) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                totalReplacements += replacementCount;
                filesModified++;
            }
            
        } catch (err) {
            console.error(`Error replacing in file ${fullPath}:`, err);
        }
    });
    
    // Update final status
    updateProgress(100);
    setStatusText(`Replace completed: ${totalReplacements} replacements in ${filesModified} file(s). Refreshing results...`);
    
    // Show result
    alert(`Replace completed!\n\nFiles modified: ${filesModified}\nTotal replacements: ${totalReplacements}\n\nRefreshing search results...`);
    
    // Refresh search results for affected files
    setTimeout(() => refreshAffectedFiles(checkedFiles), 500);
}

// --- REFRESH AFFECTED FILES AFTER REPLACE ---

async function refreshAffectedFiles(affectedFiles) {
    setStatusText('Refreshing search results...');
    showProgress();
    updateProgress(0);
    
    const searchText = document.getElementById('searchText').value;
    const options = {
        recursive: false, // Not needed for individual files
        caseSensitive: document.getElementById('optCaseSensitive').checked,
        wholeWord: document.getElementById('optWholeWord').checked,
        isRegex: document.getElementById('optRegex').checked,
        fileExtensions: []
    };
    
    // Remove affected files from current results
    const affectedFilePaths = new Set(
        affectedFiles.map(f => path.join(f.dirPath, f.fileName))
    );
    allFileResults = allFileResults.filter(f => 
        !affectedFilePaths.has(path.join(f.dirPath, f.fileName))
    );
    
    // Reset selection
    lastSelectedRow = -1;
    fileGrid.loadData(allFileResults);
    lineGrid.loadData([]);
    editor.setValue("");
    
    // Re-search each affected file
    let filesProcessed = 0;
    let filesStillMatching = 0;
    
    for (const fileData of affectedFiles) {
        const fullPath = path.join(fileData.dirPath, fileData.fileName);
        
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const stats = fs.statSync(fullPath);
            const lines = content.split('\n');
            const matches = [];
            
            // Search for matches based on options
            if (options.isRegex) {
                const flags = options.caseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchText, flags);
                
                lines.forEach((line, idx) => {
                    let match;
                    const lineNum = idx + 1;
                    while ((match = regex.exec(line)) !== null) {
                        matches.push({
                            line: lineNum,
                            startCol: match.index,
                            endCol: match.index + match[0].length
                        });
                    }
                    regex.lastIndex = 0; // Reset for next line
                });
            } else {
                // Plain text search
                const searchLower = options.caseSensitive ? searchText : searchText.toLowerCase();
                
                lines.forEach((line, idx) => {
                    const searchLine = options.caseSensitive ? line : line.toLowerCase();
                    const lineNum = idx + 1;
                    
                    let startIndex = 0;
                    while (true) {
                        const foundIndex = searchLine.indexOf(searchLower, startIndex);
                        if (foundIndex === -1) break;
                        
                        // Check whole word option
                        if (options.wholeWord) {
                            const charBefore = foundIndex > 0 ? line[foundIndex - 1] : ' ';
                            const charAfter = foundIndex + searchText.length < line.length ? 
                                line[foundIndex + searchText.length] : ' ';
                            const isWordBoundary = /\W/.test(charBefore) && /\W/.test(charAfter);
                            
                            if (isWordBoundary) {
                                matches.push({
                                    line: lineNum,
                                    startCol: foundIndex,
                                    endCol: foundIndex + searchText.length
                                });
                            }
                        } else {
                            matches.push({
                                line: lineNum,
                                startCol: foundIndex,
                                endCol: foundIndex + searchText.length
                            });
                        }
                        
                        startIndex = foundIndex + 1;
                    }
                });
            }
            
            // If matches found, add back to results
            if (matches.length > 0) {
                const newFileData = {
                    fileName: fileData.fileName,
                    dirPath: fileData.dirPath,
                    date: stats.mtime.toLocaleString(),
                    size: formatFileSize(stats.size),
                    count: matches.length,
                    matches: matches,
                    selected: true
                };
                allFileResults.push(newFileData);
                filesStillMatching++;
            }
            
        } catch (err) {
            console.error(`Error re-searching file ${fullPath}:`, err);
        }
        
        filesProcessed++;
        updateProgress((filesProcessed / affectedFiles.length) * 100);
    }
    
    // Update grid with new results
    fileGrid.loadData(allFileResults);
    
    // Save updated results
    await saveSearchResults();
    
    // Update final status
    updateProgress(100);
    const filesRemoved = affectedFiles.length - filesStillMatching;
    setStatusText(`Refresh complete: ${filesRemoved} file(s) removed, ${filesStillMatching} file(s) still contain matches.`);
    setTimeout(() => hideProgress(), 2000);
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}