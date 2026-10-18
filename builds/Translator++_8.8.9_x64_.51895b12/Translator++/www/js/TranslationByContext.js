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
/*
The instance of this class is defined globally by `ui.translationByContext` in `www/js/ui.js`.

TODO :
Change the structure into :


[rowNumber]["data"][context/path] = "translation"

example :
contextTranslation : [
    {
        data : {
            "CommonEvent.dat/CommonEvent/0/Command/1/Message/0" : "translation"
        },
        hasTranslation : true
    }
]

add this line to the trans.prototype.removeRow
if (trans.project.files[file].contextTranslation) trans.project.files[file].contextTranslation.splice(thisRow, 1);


*/

class TranslationByContext extends require('www/js/BasicEventHandler.js'){
    constructor(options) {
        super();
        this.options = options || {};
        this.container = this.options.container || $("#contextTranslation");
        this.grid = {}
        this.isInitialized = false;
        this.dataLocation = this.options.dataLocation || "parameters";
        this.data = [{"contextStr":"initialization","translation":""}]
        this.transRow; // active trans.grid's row
        this.init();
    }   
}

TranslationByContext.prototype.isTabActive = function() {
    if (typeof this._isTabActive == "undefined") return Boolean($(".tabButtons .active[data-fortab=contextTranslation]").length);
    return this._isTabActive;
}

TranslationByContext.prototype.getSelectedTranslationByContext = function() {
	if (!trans.lastSelectedCell) return;
	var rowNumber = trans.lastSelectedCell[0]

    try {
        var obj = trans.getSelectedObject()
        obj[this.dataLocation] = obj[this.dataLocation] || [];
        obj[this.dataLocation][rowNumber] = obj[this.dataLocation][rowNumber] || []
        return obj[this.dataLocation][rowNumber]   
    } catch (e) {
        return undefined;
    }
 
}

TranslationByContext.prototype.getContextTranslationByRow = function(row, file) {
	file = file || trans.getSelectedId();
	if (typeof row !== "number") return false;

    try {
        var thisObj = trans.getObjectById(file);
        if (!thisObj[this.dataLocation]) return false;
        return thisObj[this.dataLocation][row];
    } catch (e) {
        return false;
    }
}

TranslationByContext.prototype.rowHasContextTranslation = function(row, obj) {
    // TODO : Restructure the context translation data structure. The current structure is slow for seeking.
    obj = obj || trans.getSelectedObject()
	if (typeof row !== "number") return false;

    try {
        if (!obj[this.dataLocation]) return false;
        if (!obj[this.dataLocation][row]) return false;
        
        for (let i in obj[this.dataLocation][row]) {
            if (!obj[this.dataLocation][row][i]) continue;
            if (obj[this.dataLocation][row][i].translation) return true;
        }
    } catch (e) {
        return false;
    }
}


TranslationByContext.prototype.getData = function() {
    var param                   = this.getSelectedTranslationByContext();
    if (!param) return []
    const contexts                = trans.getSelectedContext();
    const rowInfoReference          = (trans.getOption("gridInfo")||{}).referenceName || "Actor Reference";
    // test if param is initialized
    if (Array.isArray(contexts) == false) return;
    param = param || [];
    for (let i=0; i<contexts.length; i++) {
        param[i] = param[i] || {}
        param[i].contextStr = contexts[i];
        param[i].translation = param[i].translation || "";
        param[i].rowInfoText = param[i].rowInfoText || "-";

        if (!param[i].rowInfoText) {
            param[i].rowInfoTranslated = "-";
        } else {
            param[i].rowInfoTranslated = trans.translateByReference(param[i].rowInfoText, false, rowInfoReference);
        }

    }

    this.data = param;
    console.log("context translator:", this.data);
    return this.data;
}


TranslationByContext.prototype.getContextDataByLine = function(row, transFileData) {
    var result = [];

    if (!transFileData[this.dataLocation]) return result;
    var paramData = transFileData[this.dataLocation][row];
    if (Array.isArray(paramData) == false) return result;
    for (var contextIdx=0; contextIdx<paramData.length; contextIdx++){
        var thisParam = paramData[contextIdx];
        if (!thisParam) continue;
        if (typeof thisParam.translation == 'undefined') continue;
        result.push({
            contextStr  : thisParam.contextStr,
            translation :thisParam.translation
        });
    }
    //console.log("Param data:", result);

    return result;

}

TranslationByContext.prototype.emitContextTranslationMutations = function(mutations, meta) {
    if (!Array.isArray(mutations) || mutations.length < 1) return false;
    if (typeof trans == 'undefined' || typeof trans.trigger !== 'function') return false;
    meta = meta || {};
    trans.trigger("metaMutation", [{
        source: meta.source || "translationByContext",
        scope: "contextTranslation",
        method: meta.method || "TranslationByContext",
        mutations: mutations
    }]);
    return true;
}

TranslationByContext.prototype.createContextTranslationMutation = function(fileId, rowId, contextIdx, property, newValue, oldValue) {
    rowId = Number(rowId);
    contextIdx = Number(contextIdx);
    if (!fileId || Number.isNaN(rowId) || Number.isNaN(contextIdx) || !property) return null;
    if (newValue === oldValue) return null;
    return {
        kind: "contextTranslationSet",
        fileId: fileId,
        rowId: rowId,
        contextIdx: contextIdx,
        property: property,
        oldValue: oldValue,
        newValue: newValue
    };
}

TranslationByContext.prototype.clear = function(fileId, row, options) {
    options = options || {};
    var transContext = this.getContextTranslationByRow(row, fileId);
    if (!Array.isArray(transContext)) return [];
    var mutations = [];
    for (var i in transContext) {
        if (!transContext[i]) continue;
        var mutation = this.createContextTranslationMutation(fileId, row, i, "translation", "", transContext[i].translation);
        transContext[i].translation = "";
        if (mutation) mutations.push(mutation);
    }
    if (options.emit !== false) {
        this.emitContextTranslationMutations(mutations, {
            source: options.source,
            method: options.method || "TranslationByContext.clear"
        });
    }
    return mutations;
}

TranslationByContext.prototype.clearFromObjects = function(files, options) {
    console.log("clearFromObjects", arguments);
    if (typeof trans.project == false) return false;
	files = files||trans.getSelectedId();
	options = options||{};
	options.refreshGrid = options.refreshGrid||false;
	
	if (Array.isArray(files) == false) files = [files];
	
	for (var i=0; i<files.length; i++) {
		var file = files[i];
		var thisData = trans.project.files[file].data;
        var mutations = [];
		for (var row=0; row<thisData.length; row++) {
            mutations = mutations.concat(this.clear(file, row, {
                emit:false,
                source: options.source || "translationByContext",
                method: "TranslationByContext.clearFromObjects"
            }));
		}
        this.emitContextTranslationMutations(mutations, {
            source: options.source || "translationByContext",
            method: "TranslationByContext.clearFromObjects"
        });
	}
    this.grid.render();
}

TranslationByContext.prototype.clearBySelected = function(fileId, row, mode) {
    var mutations = [];
    if (Array.isArray(row)) row = [row];

    if (mode == "range") {
        // should be CellRange object
        var rowIndex = {};
        for (var i in row) {
            if (row[i].constructor.name !== "CellRange") continue;
            row[i].forAll((row, col)=>{
                rowIndex[row] = true;
            })
        }
        for (var thisRow in rowIndex) {
            mutations = mutations.concat(this.clear(fileId, thisRow, {
                emit:false,
                method: "TranslationByContext.clearBySelected"
            }));
        }
    } else {
        for (var i in row) {
            if (typeof row[i] !== "number") continue;
            mutations = mutations.concat(this.clear(fileId, row[i], {
                emit:false,
                method: "TranslationByContext.clearBySelected"
            }));
        }
    }

    this.emitContextTranslationMutations(mutations, {
        method: "TranslationByContext.clearBySelected"
    });

    this.grid.render();
}

/**
 * Import context translation.
 * Imported context translation must has a same key string, file & context address
 * @param  {} transData
 * @param  {} options
 */
TranslationByContext.prototype.importContextTranslation = function(transData, options) {
    try {
        var obj = transData.project.files
    } catch (e) {
        console.warn("can not fetch file data from loaded trans data", transData);
        return {};
    }

    var index = {};
    var mutations = [];
    var keyColumn = transData.keyColumn || 0;
    var transKeyColumn = trans.keyColumn || 0;
    console.log("Generating index from TransData", transData);
    for (var i=0; i<options.files.length; i++) {
		var file = options.files[i];
        console.log(">>Handling file:", file);
        index[file] = index[file] || {};
		if (Boolean(obj[file]) == false) continue;

        var transFile = trans.getObjectById(file);
		if (Boolean(transFile) == false) continue;

		for (var row=0; row<obj[file].data.length; row++) {
            var keyString = obj[file].data[row][keyColumn];
			if (Boolean(keyString) == false) continue;
            var paramData = this.getContextDataByLine(row, obj[file]);
            if (empty(paramData)) continue;
            for (var contextId=0; contextId<paramData.length; contextId++) {
                if (!paramData[contextId]) continue;
                if (!paramData[contextId].contextStr) continue;
                var thisContextAddress = paramData[contextId].contextStr;
                index[file][keyString] = index[file][keyString] || {};
                index[file][keyString][thisContextAddress] = {
                    row:row,
                    paramData : paramData[contextId]
                }
            }

		}

        console.log("Analyzing current trans file", transFile);
        //console.log("Current index:", JSON.stringify(index, undefined, 2));
        transFile.parameters = transFile.parameters || [];
		for (var row=0; row<transFile.data.length; row++) {
            if (empty(transFile.data[row])) continue;
            var keyString = transFile.data[row][transKeyColumn];
			if (Boolean(keyString) == false) continue;
            //console.log("Keystring:", keyString);

            if (Array.isArray(transFile.context) == false) continue;
            var thisContext = transFile.context[row];
            if (empty(thisContext)) continue;
            //console.log("Found matches at source row:", row);
            //console.log("Text:", keyString);

            // checking index
            if (!index[file]) continue;
            if (!index[file][keyString]) continue;
            for (var contextId=0; contextId<thisContext.length; contextId++) {
                var thisContextAddress = thisContext[contextId];
                if(!index[file][keyString][thisContextAddress]) continue;
                //console.log("----match:", index[file][keyString][thisContextAddress]);
                //console.log("Applying translation");
                transFile.parameters[row] = transFile.parameters[row] || [];
                transFile.parameters[row][contextId] = transFile.parameters[row][contextId] || {}
                var currentContext = transFile.parameters[row][contextId];
                var nextContextStr = index[file][keyString][thisContextAddress].paramData.contextStr;
                var nextTranslation = index[file][keyString][thisContextAddress].paramData.translation;
                var contextMutation = this.createContextTranslationMutation(file, row, contextId, "contextStr", nextContextStr, currentContext.contextStr);
                var translationMutation = this.createContextTranslationMutation(file, row, contextId, "translation", nextTranslation, currentContext.translation);
                currentContext.contextStr = nextContextStr;
                currentContext.translation = nextTranslation;
                if (contextMutation) mutations.push(contextMutation);
                if (translationMutation) mutations.push(translationMutation);
            }
		}        
        // searching matching pair in current trans
	}
    this.emitContextTranslationMutations(mutations, {
        method: "TranslationByContext.importContextTranslation"
    });
    //console.log("Index:", index);
}


/**
 * Generate a key value object
 * Key is searchable things, value of a key phrases or a context string
 */
TranslationByContext.prototype.importGenerateSearchablePairs = function(transData, options) {
    try {
        var obj = transData.project.files
    } catch (e) {
        console.warn("can not fetch file data from loaded trans data", transData);
        return {};
    }
    var result = {};

    for (var i=0; i<options.files.length; i++) {
		var file = options.files[i];
		//console.log("Handling obj file : ", file, obj[file]);
		if (Boolean(obj[file]) == false) continue;
		for (var row=0; row<obj[file].data.length; row++) {
			if (Boolean(obj[file].data[row][0]) == false) continue;
			//var thisTranslation = trans.getTranslationFromRow(obj[file].data[row]);
			var thisTranslation = this.getContextTranslationByRow(row, file);
			if (Boolean(thisTranslation) == false) continue;
			result[obj[file].data[row][0]] = thisTranslation;
		}
	}

    console.log("importGenerateSearchablePairs:", result);
    return result;
}

TranslationByContext.prototype.reload = function() {
    console.log("refreshing transGrid");
    this.getData();
    this.grid.updateSettings({
		data:this.data
    });
    this.grid.render();
}


TranslationByContext.prototype.refresh = function() {
    this.grid.updateSettings({
        height      : '100%',
        width       : '100%'		
	});	
    this.grid.render();
}

/**
 * Called by trans.getTranslationData()
 * @param  {} row
 * @param  {} fileId
 * @param  {} originalWord
 */
TranslationByContext.prototype.generateContextTranslation = function(row, fileId, originalWord) {
    var contextSeparator = "\n";
    var result = {
        length:0,
        translation:{}
    }		
    var parameters = this.getContextTranslationByRow(row, fileId);
    if (!parameters) return result;
    if (!Array.isArray(parameters)) return result;
    if (parameters.length < 1) return result;

    for (var contextId=0; contextId<parameters.length; contextId++) {
        if (Boolean(parameters[contextId]) == false) continue;
        if (Boolean(parameters[contextId].translation) == false) continue;
        if (Boolean(parameters[contextId].contextStr) == false) continue;
        var contextKey = parameters[contextId].contextStr+contextSeparator+originalWord
        result.translation[contextKey] = parameters[contextId].translation;
        result.length++;
    }	
    return result;	
}


/**
 * Determines the icon markup for a column's visibility state in the context menu.
 * @param {string} columnKey - The key of the column.
 * @returns {string} HTML string for the icon.
 */
TranslationByContext.prototype.determineTabIcon = function(columnKey) {
    if (this.enabledColumnKeys.includes(columnKey)) { 
        return '<i class="icon-check"></i> '; 
    } else { 
        return '<i class="icon-check-empty"></i> '; 
    }
};

/**
 * Toggles the visibility of a specified column, if it's not marked as 'alwaysVisible'.
 * @param {string} columnKeyToToggle - The key (data property) of the column to toggle.
 */
TranslationByContext.prototype.toggleColumn = function(columnKeyToToggle) {
    if (!this.grid || !this.allColumnsConfig) {
        console.error("Grid or column configuration not initialized.");
        return;
    }

    const columnConfigToToggle = this.allColumnsConfig.find(col => col.key === columnKeyToToggle);

    // 1. Prevent toggling 'alwaysVisible' columns
    if (columnConfigToToggle && columnConfigToToggle.alwaysVisible) {
        // console.log(`Column "${columnKeyToToggle}" is always visible and cannot be toggled.`);
        return;
    }

    let newEnabledKeys;
    const isCurrentlyEnabled = this.enabledColumnKeys.includes(columnKeyToToggle);

    if (isCurrentlyEnabled) {
        // Attempting to disable a toggleable column
        const tentativeEnabledKeys = this.enabledColumnKeys.filter(key => key !== columnKeyToToggle);

        // Ensure at least one column remains visible overall (considering alwaysVisible ones)
        const alwaysVisibleKeysInConfig = this.allColumnsConfig
            .filter(c => c.alwaysVisible)
            .map(c => c.key);

        // If, after removing the current column, no other toggleable columns are left
        // AND no alwaysVisible columns exist, then prevent hiding this last toggleable one.
        const remainingToggleableKeys = tentativeEnabledKeys.filter(k => !alwaysVisibleKeysInConfig.includes(k));
        if (remainingToggleableKeys.length === 0 && alwaysVisibleKeysInConfig.filter(k => tentativeEnabledKeys.includes(k)).length === 0) {
             if (alwaysVisibleKeysInConfig.length === 0) { // Only prevent if no always-visible columns to fall back on
                console.warn("Cannot hide the last toggleable column when no always-visible columns are present.");
                return;
             }
        }
        newEnabledKeys = tentativeEnabledKeys;
    } else {
        // Attempting to enable a toggleable column
        const temp = [...this.enabledColumnKeys, columnKeyToToggle];
        // Re-order based on allColumnsConfig to maintain a consistent order
        newEnabledKeys = this.allColumnsConfig
            .map(col => col.key)
            .filter(key => temp.includes(key));
    }

    // 2. Ensure all 'alwaysVisible' columns are definitely in the list
    // This is a crucial step to enforce their visibility.
    this.allColumnsConfig.forEach(colConfig => {
        if (colConfig.alwaysVisible && !newEnabledKeys.includes(colConfig.key)) {
            newEnabledKeys.push(colConfig.key);
            // Re-order again if an alwaysVisible column was forcefully re-added
            newEnabledKeys = this.allColumnsConfig
                .map(col => col.key)
                .filter(key => newEnabledKeys.includes(key));
        }
    });
    
    // Fallback: if somehow newEnabledKeys is empty (should be rare with alwaysVisible)
    if (newEnabledKeys.length === 0 && this.allColumnsConfig.length > 0) {
        const firstCol = this.allColumnsConfig.find(c => c.alwaysVisible) || this.allColumnsConfig[0];
        if (firstCol) {
            newEnabledKeys = [firstCol.key];
        }
        console.warn("Column toggle resulted in no visible columns. Defaulting to first available/always visible.");
    }

    this.enabledColumnKeys = newEnabledKeys;

    const newColHeaders = [];
    const newColumns = [];
    for (const colConfig of this.allColumnsConfig) {
        if (this.enabledColumnKeys.includes(colConfig.key)) {
            newColHeaders.push(t(colConfig.headerNameKey));
            newColumns.push({
                data: colConfig.key,
                readOnly: colConfig.readOnly
                // Add other column properties from colConfig if necessary
            });
        }
    }

    this.grid.updateSettings({
        columns: newColumns,
        colHeaders: newColHeaders
    });
    this.grid.render();

    // Save the current state of all enabled columns.
    // The loading logic in init() will also enforce alwaysVisible.
    sys.setConfig("translationByContextEnabledCols", this.enabledColumnKeys);
    sys.saveConfig();
};

/**
 * Initializes the translation grid.
 */
TranslationByContext.prototype.init = async function() {
    if (this.isInitialized) return false;
    console.log("Initializing context grid");

    if (!this.container || this.container.length === 0) {
        console.error("Container not provided or not found for Handsontable.");
        return false;
    }
    this.container.empty();
    this.gridContainer = $("<div class='hotContainer'></div>");
    this.container.append(this.gridContainer);

    // Define or re-confirm allColumnsConfig with the 'alwaysVisible' property
    this.allColumnsConfig = [
        { key: "contextStr", headerNameKey: "Context path", readOnly: true, defaultVisible: true, alwaysVisible: false },
        { key: "rowInfoText", headerNameKey: "Row info", readOnly: true, defaultVisible: true, alwaysVisible: false },
        { key: "rowInfoTranslated", headerNameKey: "Translated row info", readOnly: true, defaultVisible: true, alwaysVisible: false },
        { key: "translation", headerNameKey: "Translation", readOnly: false, defaultVisible: true, alwaysVisible: true }
    ];

    // Initialize enabled columns
    const savedEnabledCols = sys.getConfig("translationByContextEnabledCols");
    let tempEnabledKeys = [];

    if (savedEnabledCols && Array.isArray(savedEnabledCols) && savedEnabledCols.length > 0) {
        // Start with valid saved keys
        tempEnabledKeys = savedEnabledCols.filter(key => this.allColumnsConfig.some(col => col.key === key));
    } else {
        // Fallback to defaultVisible columns if no saved config
        tempEnabledKeys = this.allColumnsConfig
            .filter(col => col.defaultVisible)
            .map(col => col.key);
    }

    // 3. Enforce 'alwaysVisible' columns during initialization
    this.allColumnsConfig.forEach(colConfig => {
        if (colConfig.alwaysVisible && !tempEnabledKeys.includes(colConfig.key)) {
            tempEnabledKeys.push(colConfig.key);
        }
    });

    // Re-order based on allColumnsConfig to maintain a consistent order
    this.enabledColumnKeys = this.allColumnsConfig
        .map(col => col.key)
        .filter(key => tempEnabledKeys.includes(key));

    // Ensure at least one column is enabled (especially if config was empty or all non-alwaysVisible)
    if (this.enabledColumnKeys.length === 0 && this.allColumnsConfig.length > 0) {
        const firstAlwaysVisible = this.allColumnsConfig.find(col => col.alwaysVisible);
        if (firstAlwaysVisible) {
            this.enabledColumnKeys.push(firstAlwaysVisible.key);
        } else if (this.allColumnsConfig.length > 0) {
            this.enabledColumnKeys.push(this.allColumnsConfig[0].key); // Fallback to the very first column
        }
    }

    const initialColHeaders = [];
    const initialColumns = [];
    for (const colConfig of this.allColumnsConfig) {
        if (this.enabledColumnKeys.includes(colConfig.key)) {
            initialColHeaders.push(t(colConfig.headerNameKey));
            initialColumns.push({
                data: colConfig.key,
                readOnly: colConfig.readOnly
            });
        }
    }

    // Build context menu items dynamically
    const contextMenuItems = {};
    const columnDisplaySubmenuItems = [];

    this.allColumnsConfig.forEach(colConfig => {
        // 4. Exclude 'alwaysVisible' columns from the toggle submenu
        if (colConfig.alwaysVisible) {
            return; // Skip adding this column to the toggle menu
        }

        columnDisplaySubmenuItems.push({
            key: `columnDisplay:${colConfig.key}`,
            name: () => { // Dynamic name for icon updates
                return this.determineTabIcon(colConfig.key) + t(colConfig.headerNameKey);
            },
            callback: (key, selection, clickEvent) => {
                this.toggleColumn(colConfig.key);
            }
            // Optional: Add a 'disabled' function here if you want to disable hiding the last *toggleable* column via context menu
            // disabled: () => {
            //     const enabledToggleableCount = this.enabledColumnKeys.filter(k => {
            //         const cfg = this.allColumnsConfig.find(c => c.key === k);
            //         return cfg && !cfg.alwaysVisible;
            //     }).length;
            //     // Disable if it's currently enabled AND it's the only enabled toggleable column
            //     return this.enabledColumnKeys.includes(colConfig.key) && enabledToggleableCount === 1;
            // }
        });
    });

    // if (columnDisplaySubmenuItems.length > 0) {
    //     contextMenuItems['columnDisplay'] = {
    //         name: t("Column"),
    //         submenu: {
    //             items: columnDisplaySubmenuItems
    //         }
    //     };
    // }
    
    const self = this; // For callbacks

    this.grid = new Handsontable(this.gridContainer[0], {
        data: this.data,
        colHeaders: initialColHeaders,
        columns: initialColumns,
        height: '100%',
        width: '100%',
        colWidths: 200,
        allowInsertColumn: false,
        allowInsertRow: false,
        allowRemoveColumn: false,
        allowRemoveRow: false,
        stretchH: 'last',
        manualColumnResize: true,
        placeholder: t("~use default translation~"),
        minSpareRows: 0,
        afterChange: function(changes, source) {
            if (source === 'loadData') {
                return; // Don't rerender on initial load if not necessary
            }
            if (trans.grid) {
                trans.grid.render();
                console.log("%cContext translation changed:", "color: orange", arguments);
                var fileId = trans.getSelectedId();
                var rowId = self.transRow;
                var mutations = [];
                if (fileId && typeof rowId !== "undefined") {
                    for (const change of (changes || [])) {
                        if (!Array.isArray(change)) continue;
                        var mutation = self.createContextTranslationMutation(fileId, rowId, change[0], change[1], change[3], change[2]);
                        if (mutation) mutations.push(mutation);
                    }
                }
                self.emitContextTranslationMutations(mutations, {
                    source: source || "translationByContext",
                    method: "TranslationByContext.afterChange"
                });
                self.trigger("contextTranslationChange", [changes, source]);
            }
        },
        beforeContextMenuShow: (menuInstance) => {
            // Handsontable should re-evaluate 'name' functions automatically.
            // If not, you might need to trigger an update of the menu items here.
        },
        contextMenu: {
            items: {
                'columnDisplay': { // Key for the main "Column" menu
                    key: 'columnDisplay', // Explicitly set key
                    name: t("Column"), // Name of the parent menu item
                    submenu: {
                        items: columnDisplaySubmenuItems // Our dynamically generated submenu items
                    }
                }
                // You can add other default or custom context menu items here:
                // '---------', // Separator
                // 'undo', 'redo',
            }
        },
        licenseKey: 'non-commercial-and-evaluation'
    });

    $(document).off("beforeProcessSelection.tbc");
    $(document).on("beforeProcessSelection.tbc", (e, selectionOpt)=>{
        //row, column, row2, column2, preventScrolling, selectionLayerLevel
        //this.reload();
        if (!this.isTabActive()) return;
        console.log("deselect cell");
        this.grid.deselectCell();
    })

    $(document).off("onAfterSelectCell.tbc");
    $(document).on("onAfterSelectCell.tbc", (e, options)=>{
        if (!this.isTabActive()) return;

        console.log("reload context list with options:", options);
        options = options || {};
        this.transRow = options.fromRow;
        this.reload();
    })

    $(document).off("onCellInfoResizeStart");
    $(document).on("onCellInfoResizeStart", ()=> {
        this.grid.updateSettings({
            height      : '80',
            width       : '80'		
        });	        
        this.gridContainer.addClass("hidden");
    })

    var resetTablePossition = ()=> {
        this.gridContainer.removeClass("hidden");
        this.grid.updateSettings({
            height      : $("#contextTranslation").innerHeight()-4,
            width       : $("#contextTranslation").innerWidth()	-4	
        });	       
        this.refresh();       
    }

    $(document).off("onCellInfoResizeStop");
    $(document).on("onCellInfoResizeStop", ()=> {
        resetTablePossition();
    });

    $(document).off("translationOnTabChange.tbc");
    $(document).on("translationOnTabChange.tbc", (e, tabName)=> {
        console.log("changed to ", tabName);
        if (tabName == "contextTranslation") {
            this._isTabActive = true;
            resetTablePossition();

            // filling tab
            //this.transRow = trans.getLastSelectedCell()[0];
            //this.reload();
        } else {
            this._isTabActive = false;
        }
    });

    $(document).off("onAfterImportTranslations.tbc");
    $(document).on("onAfterImportTranslations.tbc", (e, obj)=> {
        /*
        obj: {
			options:options, 
			loadedData:loadedData,
			refTranslation:refTranslation
        }
        */
        if (!obj.options.translateContext) return;
        console.log("onAfterImportTranslations ", obj);
        //this.importGenerateSearchablePairs(obj.loadedData, obj.options);
        this.importContextTranslation(obj.loadedData, obj.options);
    });

    $(document).off("removeAllTranslation.tbc");
    $(document).on("removeAllTranslation.tbc", (e, param) => {
        this.clearFromObjects(param.files, param.options)
    });

    $(document).off("clearContextTranslationByRow.tbc");
    $(document).on("clearContextTranslationByRow.tbc", (e, param) => {
        var conf = confirm(t("Do you want to delete all context translation on the currently selected row?"));  
        if (!conf) return;
      
        this.clearFromObjects(param.files, param.options)
    });

    $('[data-tabname="contextTranslation"] .clearContextTranslation').off('click');
    $('[data-tabname="contextTranslation"] .clearContextTranslation').on('click', ()=> {
        var conf = confirm(t("Do you want to delete all translation on the currently active row?"));  
        if (!conf) return;
        console.log(`Clearing ${trans.getSelectedId()} row ${this.transRow}`);
        this.clear(trans.getSelectedId(), this.transRow);
        this.grid.render();
    })

    $(document).off("afterRemoveRow.tbc");
    $(document).on("afterRemoveRow.tbc", (e, param) => {
        if (this.dataLocation == "parameters") return;
        var file = param.file;
        var rows = param.rows;
        var options = param.options;

        for (var i=0; i<rows.length; i++) {
            var thisRow = rows[i];
            if (typeof trans.getObjectById(file).data[thisRow] == 'undefined') continue;
            if (empty(trans.getObjectById(file)[this.dataLocation])) continue;
            if (trans.getObjectById(file)[this.dataLocation]) trans.project.files[file][this.dataLocation].splice(thisRow, 1);
        }        
    });

    /*
    $(document).off("cellInfoTabChange.tbc")
    $(document).on("cellInfoTabChange.tbc", (e, tabName) => {
        if ($(".tabButtons .active[data-fortab=contextTranslation]").length) return this._isTabActive = true;
        this._isTabActive = false;
    })
    */

    this.isInitialized =true;
}

module.exports = TranslationByContext;