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
 * @class
 * @param {*} elm - HTML element
 */
const DropFileToWindow = function(elm, options) {
    options ||= {};
    this.options = options;
    this.elm = elm;
    this.supportedFiles;
    this.options.supportedFiles ||= []
    this.options.onSupportedFileDrop ||= function(filepath) {}
    this.options.onUnsupportedFileDrop ||= function(filepath) {}
    this.options.multipleFile ||= false;
    this.options.hoverText ||= "Drop file here!"
    this.id = "dfw"+(Math.random() + 1).toString(36).substring(7);
}

/**
 * Generates styling for drop hover and leave
 */
DropFileToWindow.prototype.addCss = function() {
    console.log("dropFileToWindow addCss");
    if (!$("style.dropFileToWindow").length)  {
        const $elm = `<style class="dropFileToWindow">
            [data-draghover]::after {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #333333aa;
                color: #fafafa;
                font-weight: bold;
                pointer-events: none;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5em;
                z-index:9999999;
            }
        </style>`;
        $("head").append($elm);
    }
 
    $(`dropFileToWindow_${this.id}`).remove();
    $("head").append(`<style class="dropFileToWindow_${this.id}">
            [data-dragid=${this.id}][data-draghover]::after {
                content: ${JSON.stringify(this.options.hoverText)};
            }
        </style>`)
    console.log("dropFileToWindow style added");
}

/**
 * Prevents devault action to be triggered when dropping the file anywhere on the window
 * The default action when the files are dropped on a window is to open that file through browser
 */
DropFileToWindow.prototype.preventDefault = function() {
    // prevent default behavior from changing page on dropped file
    window.ondragover = function(e) { e.preventDefault(); return false };
    // NOTE: ondrop events WILL NOT WORK if you do not "preventDefault" in the ondragover event!!
    window.ondrop = function(e) { e.preventDefault(); return false };
}

DropFileToWindow.prototype.init = function($elm, options) {
    $elm = $elm || this.elm;
    options ||= this.options;

    // Define supported file extension to dragdrop
    options.supportedFiles ||= []
    options.onSupportedFileDrop ||= function() {}
    options.onUnsupportedFileDrop ||= function() {}

    this.preventDefault();
    this.addCss();

    const holder = $($elm)[0];
    holder.setAttribute("data-dragid", this.id)
    const handleClear = function(evt) {
        this.removeAttribute("data-draghover");
    }


    holder.ondragover = function (evt) { this.setAttribute("data-draghover", "true"); return false; };
    holder.ondragleave = function (evt) { handleClear.call(this, evt); return false; };
    holder.ondrop = function (e) {
        e.preventDefault();
        console.log("drop");

        const supportedFiles = []
        for (let i = 0; i < e.dataTransfer.files.length; ++i) {
            console.log(e.dataTransfer.files[i].path);
            if (options.supportedFiles.includes(nwPath.extname(e.dataTransfer.files[i].path)) || options.supportedFiles.includes("*.*") || options.supportedFiles.includes("*")) {
                console.log("file is supported !");
                // immidiately exit if not multiple file and supported file is found
                if (options.multipleFile) {
                    supportedFiles.push(e.dataTransfer.files[i].path);
                } else {
                    options.onSupportedFileDrop.call(this, e.dataTransfer.files[i].path);
                    break;
                }
            } else {
                console.log("file is not supported !");
                options.onUnsupportedFileDrop.call(this, e.dataTransfer.files[i].path);
            }
        }
        if (options.multipleFile && supportedFiles.length) {
            options.onSupportedFileDrop.call(this, supportedFiles);
        }
        handleClear.call(this, e);
        return false;
    };	
}


module.exports = DropFileToWindow;