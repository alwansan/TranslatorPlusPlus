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
var encoding 	= require('encoding-japanese');
var iconv 		= require('iconv-lite');

/**
 * Represents a RawViewer object.
 * @constructor
 * @param {object} options - Options for configuring the RawViewer.
 * @param {jQuery} [options.container=$("#previewRawData")] - The container element for the RawViewer.
 */
const RawViewer = function(options) {
    /**
     * Options for configuring the RawViewer.
     * @type {object}
     * @property {jQuery} [container=$("#previewRawData")] - The container element for the RawViewer.
     */
    this.options = options || {};

    /**
     * The container element for the RawViewer.
     * @type {jQuery}
     */
    this.container = this.options.container || $("#previewRawData");

    /**
     * The feather value for the RawViewer.
     * @type {number}
     */
    this.feather = 2;

    // Initialize the RawViewer
    this.init();
};

// RawViewer.prototype.loadPrism = function() {
//     if (this.prismIsLoaded) return;
//     $("head").append(`<link href="modules/prismjs/prism.css" rel="stylesheet" />`);  
//     $("head").append(`<script src="modules/prismjs/prism.js"></script>`);  
  
//     this.prismIsLoaded = true;
// }

/**
 * Loads Prism CSS stylesheet if not already loaded, and initializes Prism library if not already initialized.
 */
RawViewer.prototype.loadPrism = function() {
    if (!$("#prismStyle").length) {
        $("head").append(`<link href="modules/prismjs/prism.css" rel="stylesheet" id="prismStyle" />`);  
    }

    
    if (window.Prism) return;
    window.Prism = require("prismjs")
}

/**
 * Sets event listeners for the RawViewer.
 */
RawViewer.prototype.setListener = function() {
    var that = this;
    $(document).on("objectSelected", () => {
        this.clear();
    });
    $(document).on('cellInfoTabChange.RawViewer', function(e, target) {
        console.log("tabChange", arguments);
        if (target !== "previewRawData") that.clear();
    })

    $(document).off("onAfterSelectCell.RawViewer");
    $(document).on("onAfterSelectCell.RawViewer", function(e, selectionInfo) {
        if (ui.cellInfoTab.getActiveTab() !== "previewRawData") return;
        console.log("onAfterSelectedCell", arguments);
        that.selectionInfo = selectionInfo;
        engines.handler('onLoadSnippet').call(that, selectionInfo);
    }) 
}

/**
 * Adds text preview to the RawViewer.
 * @param {object|string} textObj - The text object or string to be previewed.
 * @param {object} [options] - Additional options.
 * @param {number} [options.lineStart=1] - The line number to start the preview.
 * @param {string} [options.language="html"] - The language of the text for syntax highlighting.
 * @returns {Promise<jQuery>} - A promise resolving to the jQuery object of the added text preview.
 */
RawViewer.prototype.addTextPreview = async function(textObj, options) {
    if (typeof textObj == "string") {
        // text object that marked with boundary
        textObj = {
            textMarked:textObj,
            boundary:""
        }
    }

    console.log("generating preview with textObj:", textObj);

    options             = options || {};
    options.lineStart   = options.lineStart || 1;
    options.language    = options.language || "html";
    var $template = $(`<pre class="snippetData line-numbers language-${options.language}" data-start="${options.lineStart}"><code class="language-${options.language}"></code></pre>`);
    var keyString = this.getKeyString();
    $template.find("code").text(textObj.textMarked);
    this.container.append($template);
    console.log("keyString", keyString);

    var highlighted = $template.find("code").html();
    if (textObj.boundary) {
        console.log("replacing boundary", textObj);
        highlighted = highlighted.replace(textObj.boundary, '<span class="highlight">');
        highlighted = highlighted.replace(textObj.boundary, '</span>');
    }
    
    $template.find("code").html(highlighted);
    await window.Prism.highlightAllUnder($template[0]);

    if (options.data) {
        for (var i in options.data)
        $template.data(i, options.data[i]);
    }
    return $template
}

/**
 * Gets the starting line number from the offset in the text.
 * @param {string} text - The text.
 * @param {number} offsetStart - The starting offset.
 * @returns {number} - The starting line number.
 */
RawViewer.prototype.getStartingLineFromOffset = function(text, offsetStart) {
    var before = text.substring(0, offsetStart).split('\n');
    var margin = this.feather+1
    if (before.length > margin) return before.length-margin;
    return 1;
}

/**
 * Gets a snippet of text from the given offsets in the text.
 * @param {string} text - The text.
 * @param {number} offsetStart - The starting offset.
 * @param {number} [offsetEnd=offsetStart] - The ending offset.
 * @returns {object} - The snippet of text.
 */
RawViewer.prototype.getSnippetFromOffset = function(text, offsetStart, offsetEnd) {
    offsetEnd = offsetEnd || offsetStart;
    var result = [];
    var resultMarked = [];
    var boundary= `----boundary:${(Math.random()+"").substring(2,10)}-----`;
    var before = text.substring(0, offsetStart).split('\n');
    var lineNum = before.length;
    var current = text.substring(offsetStart, offsetEnd);
    var after = text.substring(offsetEnd).split("\n");
    var leftSide = before.pop()
    var rightSide = after.shift()
    var columnStart =  leftSide.length;
    var currentLine = leftSide+current+rightSide;
    var currentLineMarked = leftSide+boundary+current+boundary+rightSide;

    var starting = before.length-(1+this.feather);
    if (starting < 0) starting = 0;
    for (let i=starting; i<before.length; i++) {
        if (i<0) break;
        result.push(before[i]);
        resultMarked.push(before[i]);
    }
    result.push(currentLine);
    //resultMarked.push(boundary+currentLine+boundary);
    resultMarked.push(currentLineMarked);
    for (let i=0; i<this.feather; i++) {
        if (i>after.length) break;
        result.push(after[i]);
        resultMarked.push(after[i]);
    }

    return {
        text:result.join("\n"),
        textMarked:resultMarked.join("\n"),
        col:columnStart,
        boundary:boundary,
        line:lineNum
    };

}

/**
 * Checks if the RawViewer is clear.
 * @returns {boolean} - Indicates whether the RawViewer is clear.
 */
RawViewer.prototype.isClear = function() {
    if (this.container.find("*").length > 0) return false;
    return true;
}

/**
 * Clears the RawViewer.
 */
RawViewer.prototype.clear = function() {
    this.container.empty();
}

/**
 * Gets the key string from the selection info.
 * @returns {string} - The key string.
 */
RawViewer.prototype.getKeyString = function() {
    try {
       return trans.getSelectedObject().data[this.selectionInfo.fromRow][trans.keyColumn]
    } catch (e) {
        //do nothing
    }
}

/**
 * Appends HTML content to the RawViewer container.
 * @param {string} html - The HTML content to append.
 * @returns {jQuery} - The container element after appending the HTML content.
 */
RawViewer.prototype.append = function(html) {
    this.container.append($(html));
    return this.container;
}

/**
 * Opens a file asynchronously and reads its content.
 * @param {string} path - The path of the file to open.
 * @returns {Promise<string>} - A promise resolving to the content of the file.
 */
RawViewer.prototype.openFile = async function(path) {
	return new Promise((resolve, reject) => {
		fs.readFile(path, (err, data) => {
			if (err) return reject();
		
			var thisEncoding = encoding.detect(data);
			// if encoding is not detected, read with default writeEncoding
			if (!thisEncoding) {
                console.log("Unable to detect encoding via encoding.detect()");
                thisEncoding = this.fileEncoding || "utf8";
            }
			console.log("detected encoding", thisEncoding);
            var string;
			try {
				string = iconv.decode(data, thisEncoding);
			} catch (e) {
				console.warn("Unable to decode string try 'Shift_JIS'", e);
				string = iconv.decode(data, 'Shift_JIS');
			}

            resolve(string);
        })
    }) 
 
}

/**
 * Adds a text preview from a file offset to the RawViewer.
 * @param {string} file - The path of the file.
 * @param {number} offsetStart - The starting offset in the file.
 * @param {number} offsetEnd - The ending offset in the file.
 * @param {object} [options] - Additional options.
 * @param {string} [options.language] - The language for syntax highlighting.
 * @returns {Promise<jQuery>} - A promise resolving to the jQuery object of the added text preview.
 */
RawViewer.prototype.addTextPreviewFromFileOffset = async function(file, offsetStart, offsetEnd, options) {
    options = options || {};
    var fileContent;
    if (this.cachedFileContentName !== file) {
        //var fileContent = await common.fileGetContents(file);
        fileContent = await this.openFile(file);
        this.cachedFileContent = fileContent;
        this.cachedFileContentName = file;        
    } else {
        fileContent = this.cachedFileContent;
    }

    var snippetData = this.getSnippetFromOffset(fileContent, offsetStart, offsetEnd);
    if (!options.language) {
        var ext = nwPath.extname(file);
        options.language = ext.substring(1);
    }
    options.lineStart = this.getStartingLineFromOffset(fileContent, offsetStart);

    options.data = {
        path:file,
    };
    var snippet = await this.addTextPreview(snippetData, options);

    var wrapper = $(`<div class="snippetWrapper"><div class="snippetInfo flex"><span class="snippetPath">${file}</span><span class="lineNumber">Line:${snippetData.line}</span></div></div>`)
    wrapper.append(snippet);
    wrapper.data("fileInfo", {...options, ...{offsetStart:offsetStart, offsetEnd:offsetEnd}});
    this.container.append(wrapper);
    return wrapper;

}

/**
 * Adds a text preview from a text offset to the RawViewer.
 * @param {string} text - The text content.
 * @param {number} offsetStart - The starting offset in the text.
 * @param {number} offsetEnd - The ending offset in the text.
 * @param {object} [options] - Additional options.
 * @param {string} [options.language] - The language for syntax highlighting.
 * @param {object} [options.data] - Additional data.
 * @returns {Promise<jQuery>} - A promise resolving to the jQuery object of the added text preview.
 */
RawViewer.prototype.addTextPreviewFromTextOffset = async function(text, offsetStart, offsetEnd, options) {
    options = options || {};

    var snippetData = this.getSnippetFromOffset(text, offsetStart, offsetEnd);
    options.lineStart = this.getStartingLineFromOffset(text, offsetStart);

    var snippet = await this.addTextPreview(snippetData, options);

    var wrapper = $(`<div class="snippetWrapper"><div class="snippetInfo flex"><span class="snippetPath">${options?.data?.path || ""}</span><span class="lineNumber">Line:${snippetData.line}</span></div></div>`)
    wrapper.append(snippet);
    wrapper.data("fileInfo", {...options, ...{offsetStart:offsetStart, offsetEnd:offsetEnd}});
    this.container.append(wrapper);
    return wrapper;

}


/**
 * @param  {Object} selectedCell - Selected cell object passed from event onLoadSnippet
 * @param  {String} language - language of the snippet, determines syntax highlight
 * @param  {Object[]} offsetList - Array of object (because one row can have more than one occurance of string)
 * @param  {integer} offsetList[].start - Offset start of the string
 * @param  {integer} offsetList[].end - Offset end of the string
 * @param  {string} [filePath] - Path to the file. By default the file in the original project location / cache.
 */
RawViewer.prototype.commonHandleFile = async function(selectedCell, language, offsetList, filePath) {
    console.log("commonHandleFile");
    console.log("selected cell:", selectedCell);
    var obj = trans.getSelectedObject();

    if (!Array.isArray(obj.context[selectedCell.fromRow])) return;
    if (obj.context[selectedCell.fromRow].length == 0) return;

    console.log("determining active path");
    var activePath = filePath || nwPath.join(trans.project.loc, obj.path);
    if (await common.isFileAsync(activePath) == false)  activePath = nwPath.join(trans.getStagingDataPath(), obj.path);

    if (await common.isFileAsync(activePath) == false) {
        this.clear();
        console.log("no active path");

        let $warningMsg = $(`<div class="blockBox warningBlock withIcon">${t(`Unable to find the file related to the data`)}<br />
        ${t(`To fix this correct the <b>Raw material location</b> field at the <a href="#" class="openProjectProperties">Project properties</a>`)}</div>`)
        $warningMsg.find(".openProjectProperties").on("click", function() {
            ui.openProjectProperties();
        });
        this.append($warningMsg)
        return;
    }
    console.log("active path is:", activePath);

    this.clear();

    offsetList = offsetList || obj.parameters[selectedCell.fromRow]
    for (var i in offsetList) {
        var thisParam = offsetList[i]
        if (!thisParam.start) continue;
        var previewOptions = {
            language:language,
            externalEditor:true
        }
        var elm = await this.addTextPreviewFromFileOffset(activePath, thisParam.start, thisParam.end, previewOptions);
        this.addContextMenu(elm, {...thisParam, ...{path:activePath}}, previewOptions);
        elm.data("path", activePath)
    }
}

/**
 * Handles attachment content by adding text previews with context menus.
 * @param {object} selectedCell - The selected cell object.
 * @param {string} language - The language for syntax highlighting.
 * @param {Array<object>} [offsetList] - The list of offsets.
 */
RawViewer.prototype.handleAttachment = async function(selectedCell, language, offsetList) {
    console.log("commonHandleFile");
    console.log("selected cell:", selectedCell);
    var obj = trans.getSelectedObject();

    if (!Array.isArray(obj.context[selectedCell.fromRow])) return;
    if (obj.context[selectedCell.fromRow].length == 0) return;

    this.clear();

    offsetList = offsetList || obj.parameters[selectedCell.fromRow]
    for (var i in offsetList) {
        var thisParam = offsetList[i]
        if (!thisParam.start) continue;
        let attachmentContent = trans.getAttachmentContent(thisParam.attachment);
        if (!attachmentContent) continue;

        let activePath = "attachment:"+thisParam.attachment
        var previewOptions = {
            language:language,
            data: {
                path:activePath
            }
        }
        var elm = await this.addTextPreviewFromTextOffset(trans.getAttachmentContent(thisParam.attachment), thisParam.start, thisParam.end, previewOptions);
        this.addContextMenu(elm, {...thisParam, ...{path:activePath}}, previewOptions);
        elm.data("path", activePath)
    }
}


/**
 * Adds a context menu to the specified element.
 * @param {HTMLElement} elm - The element to which the context menu will be added.
 * @param {object} obj - An object.
 * @param {object} [options={}] - Additional options.
 * @param {boolean} [options.externalEditor=false] - Whether to enable options for opening with external editors.
 */
RawViewer.prototype.addContextMenu = function(elm, obj, options={}) {
	//var that = this;
    elm = elm  || this.elm
    
    var menu;

    var createMenu = () => {
        menu = new nw.Menu();
        // Add some items with label
        menu.append(new nw.MenuItem({
            label: t('Copy path to clipboard'),
            type: "normal", 
            click: function(){
                var filePath = elm.data("path");
                if (!filePath) return;
                var clipboard = nw.Clipboard.get();
                clipboard.set(nwPath.resolve(filePath));
                alert(t("Path has been copied to clipboard."));
            }
        }));

        if (!options.externalEditor) return;

        menu.append(new nw.MenuItem({
            label: t('Open folder'),
            type: "normal", 
            click: function(){
                var filePath = elm.data("path");
                if (!filePath) return;
                nw.Shell.showItemInFolder(nwPath.resolve(filePath));
            }
        }));
        menu.append(new nw.MenuItem({
            label: t('Open with external application'),
            type: "normal", 
            click: function(){
                var filePath = elm.data("path");
                if (!filePath) return;
                nw.Shell.openItem(nwPath.resolve(filePath));			  
            }
        }));

        var openWithMenu = new nw.Menu();

        //opacity.append(new nw.MenuItem({ type: 'separator' }));
        openWithMenu.append(new nw.MenuItem({
            label: t('VS Code'),
            type: "normal", 
            click: async function(){
                var scriptInfo = elm.data()
                var content = ""
                try {
                    content = await common.fileGetContents(scriptInfo.path);
                } catch (e) {
                    return alert("Error opening file:", scriptInfo.path)
                }

                var pos = common.cursorPosInfo(content, scriptInfo.fileInfo.offsetStart);

                common.aSpawn("code", ["--goto", `"${scriptInfo.path}":${pos.row}`], {
                    detached:true,
                    shell:true
                })
            }
        }));
        openWithMenu.append(new nw.MenuItem({
            label: t('Notepad++'),
            type: "normal", 
            click: async function(){
                var scriptInfo = elm.data()
                var content = ""
                try {
                    content = await common.fileGetContents(scriptInfo.path);
                } catch (e) {
                    return alert("Error opening file:", scriptInfo.path)
                }

                var pos = common.cursorPosInfo(content, scriptInfo.fileInfo.offsetStart);

                common.aSpawn("start", ["notepad++", `"${scriptInfo.path}"`, `-n${pos.row}`], {
                    detached:true,
                    shell:true
                })        
            }
        }));
        
        menu.append(new nw.MenuItem({
        label: t('Open with...'),
        submenu: openWithMenu
        }));
    }

	elm.on("contextmenu", function(ev) {
		ev.preventDefault();
        createMenu();
		menu.popup(parseInt(ev.originalEvent.x), parseInt(ev.originalEvent.y));
		return false;		
	})
}

/**
 * Initializes the RawViewer by setting event listeners and loading Prism.
 */
RawViewer.prototype.init = function() {
    $("head").append(`
    <style>
        #previewRawData .blockBox  {
            background-color: #fff;
            margin: 12px;
        }
    </style>
    `)
    this.setListener();
    this.loadPrism();
}


module.exports = RawViewer;