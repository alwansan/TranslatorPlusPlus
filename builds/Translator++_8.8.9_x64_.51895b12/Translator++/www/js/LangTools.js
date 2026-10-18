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
 * Language Tools class
 * @constructor
 * @param {Object} langDB - The language database
 */
var LangTools = function(langDB) {
    this.langDB = langDB;
}

/**
 * Get language by code
 * @param {string} code - The language code
 * @return {Object} The language object
 */
LangTools.prototype.getLanguage = function(code) {
    return this.lookupAlias(this.langDB[code]);
}

/**
 * Get a list of languages, excluding those in the blacklist
 * @param {Array} blacklist - The list of language codes to exclude
 * @param {string} mode - What code to send to the client, default is "name"
 * @return {Object} The list of languages
 */
LangTools.prototype.getLanguageList = function(blacklist=[], mode="name") {
    const langList = {}
    blacklist ||= []
    for (let code in this.langDB) {
        if (blacklist.includes(code)) continue;
        langList[code] = this.langDB[code][mode];
    }
    return langList
}

/**
 * Lookup alias in the language database
 * @param {Object} langObj - The language object
 * @return {Object} The language object
 */
LangTools.prototype.lookupAlias = function(langObj) {
    if (!langObj) return langObj;
    if (!langObj.alias) return langObj
    if (!this.langDB[langObj.alias]) return langObj
    if (this.langDB[langObj.alias]) return this.langDB[langObj.alias];
}

/**
 * Lookup in the language database by key or name
 * @param {string} key - The key to lookup
 * @param {string} name - The name to lookup
 * @return {Object} The language object
 */
LangTools.prototype.lookupDB = function(key="", name="") {
    if (!key) return;
    key = key.toLowerCase();
    if (this.langDB[key]) {
        return this.lookupAlias(this.langDB[key]);
    }
    
    for (var i in this.langDB) {
        if (key == this.langDB[i].idt) this.lookupAlias(this.langDB[i]);
        if (key == this.langDB[i].idb) this.lookupAlias(this.langDB[i]);
        if (typeof this.langDB[i].name !== "string") continue;
        if (this.langDB[i].name.toLowerCase() == name.toLowerCase()) return this.lookupAlias(this.langDB[i]);
    }
}

/**
 * Get the full name of the language
 * @param {Object|string} langObj - The language object
 * @return {string} The full name of the language
 * @example
 * ```js
 * langTools.getFullName("ja");
 * // returns "Japanese(日本語)"
 * ```
 */
LangTools.prototype.getFullName = function(langObj) {
    if (typeof langObj == "string") langObj = this.lookupDB(langObj);
    if (langObj.displayName && langObj.name!=langObj.displayName) {
        return `${langObj.name}(${langObj.displayName})`;
    }
    return langObj.name;
}

/**
 * Get the name of the language
 * @param {Object|string} langObj - The language object
 * @return {string} The name of the language
 * @example
 * ```js
 * langTools.getName("ja");
 * // returns "Japanese"
 * ```
 */
LangTools.prototype.getName = function(langObj) {
    if (typeof langObj == "string") langObj = this.lookupDB(langObj);
    return langObj.name;
}

/**
 * Get the display name of the language
 * @param {Object|string} langObj - The language object
 * @return {string} The display name of the language
 * @example
 * ```js
 * langTools.getDisplayName("ja");
 * // returns "日本語"
 * ```
 */
LangTools.prototype.getDisplayName = function(langObj) {
    if (typeof langObj == "string") langObj = this.lookupDB(langObj);
    return langObj.displayName;
}

/**
 * Compare language pairs with the language database
 * @param {Object} langPairs - The language pairs to compare
 * @return {Object} The result of the comparison
 */
LangTools.prototype.compareWithDB = function(langPairs) {
    var match = {}
    var unmatch = {}
    for (var code in langPairs) {
        var thisLang = this.lookupDB(code, langPairs[code])
        if (thisLang) {
            match[code] = thisLang;
        } else {
            unmatch[code.toLowerCase()] =   {
                "name": langPairs[code],
                "displayName": "",
                "displayNameAlt": "",
                "description": langPairs[code],
                "descriptionAlt": "",
                "groupTag": "",
                "id": code.toLowerCase(),
                "groupName": ""
            }
        }
    }

    return {
        match:match,
        unmatch:unmatch
    }
}

/**
 * Generate language pairs
 * @param {Object} langPairs - The language pairs to generate
 * @return {Object} The result of the generation
 */
LangTools.prototype.generateLangPairs = function(langPairs) {
    var match = {}
    var unmatch = {}
    for (var code in langPairs) {
        var thisLang = this.lookupDB(code, langPairs[code])
        if (thisLang) {
            match[thisLang.id] = code;
        } else {
            unmatch[code.toLowerCase()] =   {
                "name": langPairs[code],
                "displayName": "",
                "displayNameAlt": "",
                "description": langPairs[code],
                "descriptionAlt": "",
                "groupTag": "",
                "id": code.toLowerCase(),
                "groupName": ""
            }
        }
    }
    
    return {
        match:match,
        unmatch:unmatch
    }
}

/**
 * Check if a language is CJK (Chinese, Japanese, Korean)
 * @param {string} langCode - The language code
 * @return {boolean} True if the language is CJK, false otherwise
 */
LangTools.prototype.isCJK = function(langCode) {
    if (!langCode) return false;
    langCode = langCode.toLowerCase();
    let majorLang = (langCode.split("-"))[0];
    if (["ja", "ko", "zh"].includes(majorLang)) return true;
    return false;
}

module.exports = LangTools;