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

const Util = {};

Util.getAllNwWindow = async function(params) {
    return new Promise((resolve, reject) => {
        nw.Window.getAll(function(win) {
            resolve(win)
        })
    })
}

Util.hasV2Features = async function() {
    try {
        await this.getAllNwWindow();
        return true;
    } catch (e) {
        return false;
    }
}

Util.getMasterWindow = async function() {
    const nwWindows = await this.getAllNwWindow();
    return nwWindows[0];
}

Util.getAllNwWindowAtIndex = async function(index) {
    const windows = await this.getAllNwWindow();
    return windows[index];
}

Util.getAllNwWindowsWithTitle = async function(title="") {
    const windows = await this.getAllNwWindow();
    const result = [];
    for (const win of windows) {
        const winTitle = (win.title || "");
        if (winTitle == title) {
            result.push(win);
        }
    }
    return result;
}


Util.getAllNwWindowsWithTitleLike = async function(title="") {
    const windows = await this.getAllNwWindow();
    const result = [];
    title = title.toLowerCase();
    for (const win of windows) {
        const winTitle = (win.title || "").toLowerCase();
        if (winTitle.includes(title)) {
            result.push(win);
        }
    }
    return result;
}

/**
 * Resolve a window selector to NW.js Window objects.
 * Supported selectors are current, master, all, index, title, and titleLike.
 */
Util.getNwWindows = async function(options = {}) {
    const selector = options.selector || "current";

    if (selector === "current") {
        return [nw.Window.get()];
    }
    if (selector === "master") {
        const window = await this.getMasterWindow();
        return window ? [window] : [];
    }
    if (selector === "all") {
        return this.getAllNwWindow();
    }
    if (selector === "index") {
        const index = Number(options.index);
        if (!Number.isInteger(index) || index < 0) {
            throw new Error("index must be a non-negative integer when selector is 'index'");
        }
        const window = await this.getAllNwWindowAtIndex(index);
        return window ? [window] : [];
    }
    if (selector === "title") {
        return this.getAllNwWindowsWithTitle(options.title || "");
    }
    if (selector === "titleLike") {
        return this.getAllNwWindowsWithTitleLike(options.titleLike || "");
    }

    throw new Error(`Unsupported window selector '${selector}'`);
};

/**
 * Capture a window as a PNG base64 string.
 * @param {Object} window - NW.js Window object
 * @param {Object} options - capturePage options
 * @returns {Promise<string>} PNG data encoded as base64
 */
Util.capturePage = function(window, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            window.capturePage((data) => {
                if (Buffer.isBuffer(data)) {
                    resolve(data.toString("base64"));
                } else if (typeof data === "string") {
                    resolve(data);
                } else {
                    reject(new Error("NW.js returned an unsupported capturePage result"));
                }
            }, options);
        } catch (error) {
            reject(error);
        }
    });
};

Util.getWindowAtIndex = async function(index) {
    const windows = await this.getAllNwWindow();
    return windows[index]?.window;
}

Util.closeAllDevTools = async function() {
    const windows = await this.getAllNwWindow();
    for (const win of windows) {
        win.closeDevTools();
    }
}

Util.closeAllWindows = async function() {
    const windows = await this.getAllNwWindow();
    // close all windows from last index down to 0
    for (let i=windows.length-1; i>=0; i--) {
        windows[i].close(true);
    }
}

Util.isNW2 = function() {
    // if (nw.App.manifest["chromium-args"].includes("--disable-features=nw2")) {
    //     return false;
    // }
    // return true;
    // chrome.app.window.current() is null in NW2
    if (!chrome.app.window.current()) return true;
    return false;
}


module.exports = Util;