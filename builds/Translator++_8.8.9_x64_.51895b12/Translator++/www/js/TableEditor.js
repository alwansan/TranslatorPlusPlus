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

console.log("Table.js loaded");
const BLS = require("better-localstorage");
class TableEditor extends require("www/js/BasicEventHandler.js") {
    constructor(options) {
        super();
        this.options = options;
        this.isEditing = false;
        this.storage = new BLS("TableEditor");
        this.storage.on("beforeSet", ()=> {
            this.isBusy = true;
        });
        this.storage.on("set", ()=> {
            this.isBusy = false;
        });
        
    }

    async waitUntilNotEditing() {
        if (!this.grid) return;
        if (!this.isEditing) return;
        return new Promise((resolve, reject) => {
            this.one("endEditing", ()=> {
                resolve();
            });
        });
    }
    async waitUntilSaved() {
        await this.waitUntilNotEditing();
        if (!this.isBusy) return;
        return new Promise((resolve, reject) => {
            this.storage.one("set", ()=> {
                resolve();
            });
        });
    }
    

    getDefaultData() {
        return {
            data: [
                [""],
            ],
            rowHeaders: true,
            colHeaders: true,
            search: true,
            outsideClickDeselects: true,
            viewportColumnRenderingOffset: 15,
            maxCols: 15,
            autoRowSize: true,
            minSpareRows: 1,
            manualColumnMove: true,
            manualColumnResize: true,
            copyPaste: { columnsLimit: 15, rowsLimit: 100000 },
            contextMenu: ["copy", "cut", "paste", "search", "clear", "restoreDefaults"],
        };
    }

    async saveData() {
        const data = this.loadedData || {};
        data.grid ||= {};
        data.grid.data = this.grid.getData();
        this.storage.set("data", data);
    }

    clearTable() {
        this.grid.loadData([['']]);
        this.saveData();
    }

    restoreDefaults() {
        const defaultData = common.clone(this.getDefaultData().data);
        this.grid.loadData(defaultData);
        this.saveData();
    }

    searchTable(query) {
        const search = this.grid.getPlugin("search");
        const result = search.query(query);
        console.log("Search results:", result);
    }

    initTable(gridData = {}) {
        const that = this;
        gridData = { ...this.getDefaultData(), ...gridData };
        
        gridData.afterChange = async function (changes, source) {
            if (source === "loadData") return;
            console.log("afterChange", changes, source, this.getData());
            that.saveData();
        };

        gridData.afterSelection = function(r, c, r2, c2) {
            that.trigger("isEditing", [r, c, r2, c2]);
            console.log("afterSelection", r, c, r2, c2);
            that.isEditing = true;
        }
        gridData.afterDeselect = function() {
            console.log("afterDeselect", this.getSelected());
            that.trigger("endEditing");
            that.isEditing = false;
        }

        this.gridOptions = gridData;
        this.grid = new Handsontable(document.querySelector("#tableEditor"), gridData);
    }

    async init() {
        let data = await this.storage.get("data");
        this.loadedData = common.clone(data);
        console.log("Loaded data", JSON.stringify(data, null, 4));
        if (!data?.grid?.data?.length) {
            data.grid ||= {};
            data.grid.data = [[""]];

            if (data?.grid?.colHeaders?.length) {
                console.log("Filling empty data with empty strings");
                data.grid.data[0].length = data.grid.colHeaders.length;
                data.grid.data[0].fill("", 0, data.grid.colHeaders.length);
            }
        }
        this.initTable(data.grid);
    }
};

$(document).ready(function() {
    window.tableEditor = new TableEditor();
    tableEditor.init();
    
    $("#searchButton").on("click", function() {
        const query = $("#searchInput").val();
        tableEditor.searchTable(query);
    });
    
    $("#clearButton").on("click", function() {
        tableEditor.clearTable();
    });
    
    $("#restoreButton").on("click", function() {
        tableEditor.restoreDefaults();
    });
});

nw.Window.get().on('close', function() {
	// Hide the window to give user the feeling of closing immediately
	//this.hide();
    (async ()=> {
        if (tableEditor.grid) {
            await tableEditor.grid.deselectCell();
            await tableEditor.waitUntilSaved();
        }

        this.close(true);
    }
    )();
	// After closing the new window, close the main window.
	//this.close(true);

});

