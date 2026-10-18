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
 * Represents a RowProperties object.
 * @constructor
 * @param {object} options - Options for configuring the RowProperties.
 * @param {jQuery} [options.container=$("#previewRawData")] - The container element for the RowProperties.
 */
const RowProperties = function(options) {
    /**
     * Options for configuring the RowProperties.
     * @type {object}
     * @property {jQuery} [container=$("#viewRowProperties")] - The container element for the RowProperties.
     */
    this.options = options || {};

    /**
     * The container element for the RowProperties.
     * @type {jQuery}
     */
    this.container = this.options.container || $("#viewRowProperties");

    /**
     * The feather value for the RowProperties.
     * @type {number}
     */
    this.feather = 2;

    // Initialize the RowProperties
    this.init();
};

RowProperties.prototype.clear = function() {
    this.container.empty();
}

/**
 * Sets event listeners for the RowProperties.
 */
RowProperties.prototype.setListener = function() {
    const that = this;
    $(document).on("objectSelected", () => {
        this.clear();
    });
    $(document).on('cellInfoTabChange.RowProperties', function(e, target) {
        console.log("tabChange", arguments);
        if (target !== "viewRowProperties") that.clear();
        that.drawInformation();
    })

    $(document).off("onAfterSelectCell.RowProperties");
    $(document).on("onAfterSelectCell.RowProperties", function(e, selectionInfo) {
        if (ui.cellInfoTab.getActiveTab() !== "viewRowProperties") return;
        console.log("onAfterSelectedCell", arguments); 
        that.drawInformation();
    });
}

RowProperties.prototype.drawInformation = async function() {
    console.log("draw RowProperties", arguments);
    ui.renderRowPropertiesContent(this.container);
}

/**
 * Initializes the RowProperties by setting event listeners
 */
RowProperties.prototype.init = function() {
    $("head").append(`
    <style data-id="RowPropertiesStyle">
        #viewRowProperties {
            overflow: auto;
            color: var(--text-color);
            font-size: 0.9em;
            box-sizing: border-box;
            padding-left: 1em;
        }
        #viewRowProperties h2 {
            font-size: 1.2em;
            margin: 0.5em 0px;
            color: var(--tips-link-color);
        }

        #viewRowProperties table,
        #viewRowProperties th,
        #viewRowProperties td {
            border: 1px solid var(--gr-lv7);
            padding: 0.5em;
            text-align: left;
            width: 50%;
        }
        #viewRowProperties table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid var(--gr-lv7);
        }

        #viewRowProperties table td.editable {
            background: var(--grid-active-cell-bg);
            color: var(--text-color-highlighted);
        }
    </style>
    `);
    this.setListener();
}


module.exports = RowProperties;