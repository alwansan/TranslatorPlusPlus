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
var die = function(text) {
    throw(`Process halted by user request --2472KAFSDFJ--:${text}`);
}

class BaseIterator {
    constructor(options) {
        this.options    = options || {};
        this.userInput  = this.options.userInput || {}
        if (window) window.die = die;
    }
}

BaseIterator.prototype.getObj = function() {
    return trans.getObjectById(this.file);
}


class CodeRunner extends require("www/js/BasicEventHandler.js") {
    constructor (options) {
        super();
        this.options    = options || {};
        this.editedCellPool = []
        this.editedCellMap = {}
        this.editedTagMap = {}
        this.editedCommentMap = {}
        this.editedCellInfoMap = {}
    }
}

CodeRunner.prototype.onExecutionStart = function() {
    this.editedCellPool = [];
    this.editedCellMap = {};
    this.editedTagMap = {};
    this.editedCommentMap = {};
    this.editedCellInfoMap = {};
    this.hasEditedCell = false;
}

CodeRunner.prototype.onCellEdit = function(file, row, col, value, previousValue) {
    if (value === previousValue) return false;
    console.log("Automation set a cell at:",file, row, col, value, previousValue);
    this.hasEditedCell = true;
    var data = {
        file:file,
        row:row,
        col:col,
        value:value,
        previousValue:previousValue
    }
    this.trigger("cellEdit", data)
    this.editedCellPool.push(data)

    var editKey = [file, row, col].join(":");
    if (!this.editedCellMap[editKey]) {
        this.editedCellMap[editKey] = {
            file:file,
            row:row,
            col:col,
            value:value,
            previousValue:previousValue
        };
    } else {
        this.editedCellMap[editKey].value = value;
    }

    if (this.editedCellMap[editKey].previousValue === this.editedCellMap[editKey].value) {
        delete this.editedCellMap[editKey];
    }

    return true;
}

CodeRunner.prototype.onTagEdit = function(file, row, tags, previousTags) {
    var nextTags = JSON.parse(JSON.stringify(tags || []));
    var oldTags = JSON.parse(JSON.stringify(previousTags || []));
    if (JSON.stringify(nextTags) === JSON.stringify(oldTags)) return false;

    var editKey = [file, row].join(":");
    if (!this.editedTagMap[editKey]) {
        this.editedTagMap[editKey] = {
            file:file,
            row:row,
            tags:nextTags,
            previousTags:oldTags
        };
    } else {
        this.editedTagMap[editKey].tags = nextTags;
    }

    if (JSON.stringify(this.editedTagMap[editKey].previousTags) === JSON.stringify(this.editedTagMap[editKey].tags)) {
        delete this.editedTagMap[editKey];
        return false;
    }

    return true;
}

CodeRunner.prototype.onCommentEdit = function(file, row, col, comment, previousComment) {
    if (comment === previousComment) return false;

    var editKey = [file, row, col].join(":");
    if (!this.editedCommentMap[editKey]) {
        this.editedCommentMap[editKey] = {
            file:file,
            row:row,
            col:col,
            comment:comment,
            previousComment:previousComment
        };
    } else {
        this.editedCommentMap[editKey].comment = comment;
    }

    if (this.editedCommentMap[editKey].previousComment === this.editedCommentMap[editKey].comment) {
        delete this.editedCommentMap[editKey];
        return false;
    }

    return true;
}

CodeRunner.prototype.onCellInfoEdit = function(file, row, col, key, value, previousValue, isDelete) {
    if (value === previousValue && !isDelete) return false;

    var editKey = [file, row, col, key].join(":");
    if (!this.editedCellInfoMap[editKey]) {
        this.editedCellInfoMap[editKey] = {
            file:file,
            row:row,
            col:col,
            key:key,
            value:value,
            previousValue:previousValue,
            isDelete:Boolean(isDelete)
        };
    } else {
        this.editedCellInfoMap[editKey].value = value;
        this.editedCellInfoMap[editKey].isDelete = Boolean(isDelete);
    }

    if (this.editedCellInfoMap[editKey].previousValue === this.editedCellInfoMap[editKey].value && !this.editedCellInfoMap[editKey].isDelete) {
        delete this.editedCellInfoMap[editKey];
        return false;
    }

    return true;
}

CodeRunner.prototype.createCommentsProxy = function(file, row) {
    var codeRunner = this;
    var fileObj = trans.project.files[file];
    fileObj.comments = fileObj.comments || [];
    fileObj.comments[row] = fileObj.comments[row] || [];
    var commentRow = fileObj.comments[row];
    return new Proxy(commentRow, {
        get: function(target, name) {
            return target[name];
        },
        set: function(target, name, value) {
            var previousComment = target[name];
            target[name] = value;
            fileObj.comments[row] = JSON.parse(JSON.stringify(target));
            codeRunner.onCommentEdit(file, row, name, value, previousComment);
            return true;
        },
        deleteProperty: function(target, name) {
            var previousComment = target[name];
            try { delete target[name]; } catch (e) { return false; }
            fileObj.comments[row] = JSON.parse(JSON.stringify(target));
            codeRunner.onCommentEdit(file, row, name, undefined, previousComment);
            return true;
        }
    });
}

CodeRunner.prototype.createCellInfoProxy = function(file, row, col) {
    var codeRunner = this;
    if (typeof col === "undefined" || col === null) return undefined;
    var cellInfo = trans.cellInfo.getCell(file, row, col) || {};
    if (!trans.project.files[file].cellInfo) trans.project.files[file].cellInfo = [];
    trans.project.files[file].cellInfo[row] = trans.project.files[file].cellInfo[row] || [];
    trans.project.files[file].cellInfo[row][col] = JSON.parse(JSON.stringify(cellInfo));
    return new Proxy(trans.project.files[file].cellInfo[row][col], {
        get: function(target, name) {
            return target[name];
        },
        set: function(target, name, value) {
            var previousValue = target[name];
            target[name] = value;
            codeRunner.onCellInfoEdit(file, row, col, name, value, previousValue, false);
            return true;
        },
        deleteProperty: function(target, name) {
            var previousValue = target[name];
            try { delete target[name]; } catch (e) { return false; }
            codeRunner.onCellInfoEdit(file, row, col, name, undefined, previousValue, true);
            return true;
        }
    });
}

CodeRunner.prototype.finalize = async function(origin, options) {
    options = options || {};
    trans.grid.render();
    this.isBreak = false;

    if (this.hasEditedCell && typeof trans.emitDataMutation === "function") {
        var mutations = [];
        for (var key in this.editedCellMap) {
            var item = this.editedCellMap[key];
            if (!item) continue;
            mutations.push({
                kind: "cellChange",
                fileId: item.file,
                rowId: Number(item.row),
                colId: Number(item.col),
                oldValue: item.previousValue,
                newValue: item.value
            });
        }

        trans.emitDataMutation(mutations, {
            source: options.source || "automation",
            scope: "cell",
            method: "CodeRunner.finalize:"+origin
        });
    }

    if (typeof trans.trigger === "function") {
        var metaMutations = [];
        for (var metaKey in this.editedTagMap) {
            var metaItem = this.editedTagMap[metaKey];
            if (!metaItem) continue;
            metaMutations.push({
                kind: "tagSetRow",
                fileId: metaItem.file,
                rowId: Number(metaItem.row),
                tags: JSON.parse(JSON.stringify(metaItem.tags || []))
            });
        }

        for (var commentKey in this.editedCommentMap) {
            var commentItem = this.editedCommentMap[commentKey];
            if (!commentItem) continue;
            if (typeof commentItem.comment === "undefined") {
                metaMutations.push({
                    kind: "commentDeleteCell",
                    fileId: commentItem.file,
                    rowId: Number(commentItem.row),
                    colId: Number(commentItem.col)
                });
            } else {
                metaMutations.push({
                    kind: "commentSetCell",
                    fileId: commentItem.file,
                    rowId: Number(commentItem.row),
                    colId: Number(commentItem.col),
                    comment: String(commentItem.comment || "")
                });
            }
        }

        for (var cellInfoKey in this.editedCellInfoMap) {
            var cellInfoItem = this.editedCellInfoMap[cellInfoKey];
            if (!cellInfoItem) continue;
            metaMutations.push({
                kind: cellInfoItem.isDelete ? "cellInfoDelete" : "cellInfoSet",
                fileId: cellInfoItem.file,
                rowId: Number(cellInfoItem.row),
                colId: Number(cellInfoItem.col),
                key: cellInfoItem.key,
                value: cellInfoItem.value
            });
        }

        if (metaMutations.length > 0) {
            trans.trigger("metaMutation", [{
                source: options.source || "automation",
                scope: "row",
                method: "CodeRunner.finalize:"+origin,
                mutations: metaMutations
            }]);
        }
    }

    this.trigger("executionEnd", {
        changedCells: this.editedCellPool,
        handler:origin
    })
    trans.trigger("codeEditorExecutionEnd", {
        changedCells: this.editedCellPool,
        handler:origin
    })
    if (this.hasEditedCell) {
        trans.refreshGrid();
        trans.evalTranslationProgress();
        this.hasEditedCell = false;
    }
    this.editedCellMap = {};
    this.editedTagMap = {};
    this.editedCommentMap = {};
    this.editedCellInfoMap = {};
    return true;
}

CodeRunner.prototype.executeGlobal = async function(fn, options) {
    this.onExecutionStart();

	fn = fn || async function() {};
	options= options || {};
    this.userInput = options.userInput || {}
    await fn.call(this);
    this.finalize("global", options)
	
	return true;
}

CodeRunner.prototype.executeObjectIterator = async function(fn, options) {
    var codeRunner = this;
    this.onExecutionStart();
	fn = fn || async function() {};
	options= options || {};

	var iteratorObj = new BaseIterator(options);

	var selectedFiles = trans.getCheckedFiles();
	if (selectedFiles.length < 1) selectedFiles = trans.getAllFiles();

	var iteratorMain = async function() {
        this.index      = -1;
        this.maxIndex   = selectedFiles.length - 1;
        this.isLast     = false;
        if (this.maxIndex < 0) this.maxIndex = 0;

		for (var fileId in selectedFiles) {
            this.index++;
			this.file = selectedFiles[fileId];
			if (!trans.project.files[this.file]) continue;
			if (empty(trans.project.files[this.file].data)) continue;

            if (this.index>=this.maxIndex) this.isLast = true;

            await fn.call(this);
            if (codeRunner.isBreak) return codeRunner.finalize("object", options);
		}
        codeRunner.finalize("object", options)
	}
	
	await iteratorMain.apply(iteratorObj);
	return true;
}

/**
 * Custom script for each rows
 * @param  {} fn
 * @param  {} options
 */
CodeRunner.prototype.executeRowIterator = async function(fn, options) {
    var codeRunner = this;
    this.onExecutionStart();

	fn = fn || async function() {};
	options= options || {};

    class IteratorRow extends BaseIterator {
        constructor( options) {
            super(options);

            this.getBestTranslationCol = function() {
                return trans.getTranslationColFromRow(this.cells);
            }

            this.getBestTranslation = function() {
                const bestCell = this.getBestTranslationCol();
                return this.cells[bestCell];
            }

            this.getBestTranslationCellInfo = function() {
                const bestCell = this.getBestTranslationCol();
                return trans.cellInfo.getBestCellInfo(this.file, this.rowId);
            }
            console.log("this obj", this);
        }
    }
	var iteratorObj = new IteratorRow(options);

	var selectedFiles = trans.getCheckedFiles();
	if (selectedFiles.length < 1) selectedFiles = trans.getAllFiles();



	var iteratorMain = async function() {
        // count the rows
        this.index      = -1;
        this.maxIndex   = 0;
        this.isLast     = false;
        for (let fileId in selectedFiles) {
            //console.log("length of", fileId, trans.getData(selectedFiles[fileId]).length);
            this.maxIndex += trans.getData(selectedFiles[fileId]).length;
        }
        if (this.maxIndex > 0) this.maxIndex = this.maxIndex-1; // because we start from 0;

		for (let fileId in selectedFiles) {
			this.file = selectedFiles[fileId];
			if (!trans.project.files[this.file]) continue;
			if (empty(trans.project.files[this.file].data)) continue;
			
			for (var rowId=0; rowId<trans.project.files[this.file].data.length; rowId++) {
                this.index++;
                //if (!trans.project.files[this.file].data[rowId][trans.keyColumn]) continue;
				this.rowId 		= rowId;
				this._cells 	= trans.project.files[this.file].data[rowId] || [];
                this.keyText 	= this._cells[trans.keyColumn];
                this.cells = new Proxy(this._cells, {
                    get: function(target, name) {
                        return target[name];
                    },
                    set: function(target, name, value) {
                        codeRunner.onCellEdit(this.file, rowId, name, value, target[name])
                        target[name] = value
                    }
                }); 
                this._tags 		= trans.project.files[this.file]?.tags[rowId] || [];
				this.tags 		= new Proxy(this._tags, {
                    get: (target, name) => {
                        return target[name];
                    },
                    set: (target, name, value) => {
                        var previousTags = JSON.parse(JSON.stringify(trans.project.files[this.file]?.tags?.[rowId] || []));
                        target[name] = value
                        if (!Array.isArray(trans?.project?.files?.[this.file]?.tags)) return false;
                        trans.project.files[this.file].tags[rowId] = JSON.parse((JSON.stringify(target)));
                        codeRunner.onTagEdit(this.file, rowId, trans.project.files[this.file].tags[rowId], previousTags);
                        return true;
                    }
                })
				this.parameters	= trans.project.files[this.file].parameters[rowId];
				this.context	= trans.project.files[this.file].context[rowId];
                this.comments   = codeRunner.createCommentsProxy(this.file, rowId);
                this.cellInfo   = codeRunner.createCellInfoProxy(this.file, rowId, trans.getTranslationColFromRow(this._cells));
				
                if (this.index>=this.maxIndex) this.isLast = true;
                await fn.call(this);
                if (codeRunner.isBreak) return codeRunner.finalize("row", options);
			}
		}
        codeRunner.finalize("row", options)
	}
	
	await iteratorMain.apply(iteratorObj);
	return true;
}


CodeRunner.prototype.executeSelectedCells = async function(fn, options) {
    var codeRunner = this;
    this.onExecutionStart();

	fn = fn || async function() {};
	options= options || {};

    class IteratorSelectedCells extends BaseIterator {
        constructor(options) {
            super(options)
        }
    }
    IteratorSelectedCells.prototype.setText = function(text) {
        if (this.colId == 0) return;
        try {
            codeRunner.onCellEdit(this.file, this.rowId, this.colId, text, trans.project.files[this.file].data[this.rowId][this.colId])
            trans.project.files[this.file].data[this.rowId][this.colId] = text;
        } catch (e) {
            console.warn(`Error when trying to set the text on cell: ${this.file} ${this.rowId},${this.colId}\n`, e);
        }
    }

	var iteratorObj = new IteratorSelectedCells(options);

	var cellRanges = trans.grid.getSelectedRange();
	if (empty(cellRanges)) return;

	var iteratorMain = async function() {
        this.index      = -1;
        this.maxIndex   = 0;
        this.isLast     = false;
        for (let rangeId in cellRanges) {
            this.maxIndex += cellRanges[rangeId].getAll().length;
        }
        if (this.maxIndex > 0) this.maxIndex = this.maxIndex-1; // because we start from 0;

        this.file       = trans.getSelectedId();
        var fileId = this.file;

        if (!trans.project.files[this.file]) return;
        if (empty(trans.project.files[this.file].data)) return;

        var processed = {};

		for (let rangeId in cellRanges) {
            var thisCoords = cellRanges[rangeId].getAll();
            for (var i=0; i<thisCoords.length; i++) {
                this.index++;
                var rowId = thisCoords[i].row;
                var colId = thisCoords[i].col;
                if (processed[rowId+","+colId]) continue; // already processed
                processed[rowId+","+colId] = true;

                this.rowId 		= rowId;
				this._cells 	= trans.project.files[this.file].data[rowId] || [];
                this.keyText 	= this._cells[trans.keyColumn];
                this.cells = new Proxy(this._cells, {
                    get: function(target, name) {
                        return target[name];
                    },
                    set: function(target, name, value) {
                        codeRunner.onCellEdit(fileId, rowId, name, value, target[name])
                        target[name] = value
                    }
                });  
				this._tags 		= trans.project.files[this.file]?.tags[rowId] || [];
				this.tags 		= new Proxy(this._tags, {
                    get: (target, name) => {
                        return target[name];
                    },
                    set: (target, name, value) => {
                        var previousTags = JSON.parse(JSON.stringify(trans.project.files[fileId]?.tags?.[rowId] || []));
                        target[name] = value
                        if (!Array.isArray(trans?.project?.files?.[fileId]?.tags)) return false;
                        trans.project.files[fileId].tags[rowId] = JSON.parse((JSON.stringify(target)));
                        codeRunner.onTagEdit(fileId, rowId, trans.project.files[fileId].tags[rowId], previousTags);
                        return true;
                    }
                })
				this.parameters	= trans.project.files[this.file].parameters[rowId];
				this.context	= trans.project.files[this.file].context[rowId];
                this.comments   = codeRunner.createCommentsProxy(this.file, rowId);
                this.cellInfo   = codeRunner.createCellInfoProxy(this.file, rowId, colId);
 
                this.colId      = colId;
                this.text       = trans.project.files[this.file].data[rowId][colId];
                this.cellCoords = thisCoords[i];

                if (this.index>=this.maxIndex) this.isLast = true;
                await fn.call(this);
                if (codeRunner.isBreak) return codeRunner.finalize("cell", options);
            }
		}
        codeRunner.finalize("cell", options)
	}
	
	await iteratorMain.apply(iteratorObj);
	return true;
}

CodeRunner.prototype.getDialogArguments = function(key) {
    try {
        return window.dialogArguments[key]
    } catch (e) {
        return console.warn("No arguments:", key);
    }
}

CodeRunner.prototype.executeFoundCells = async function(fn, options) {

    var codeRunner  = this;
    this.onExecutionStart();

	fn              = fn || async function() {};
	options         = options || {};

    class IteratorFoundCells extends BaseIterator {
        constructor( options) {
            super(options)
        }
    }
    IteratorFoundCells.prototype.setText = function(text) {
        if (this.colId == 0) return;
        try {
            codeRunner.onCellEdit(this.file, this.rowId, this.colId, text, trans.project.files[this.file].data[this.rowId][this.colId])
            trans.project.files[this.file].data[this.rowId][this.colId] = text;
        } catch (e) {
            console.warn(`Error when trying to set the text on cell: ${this.file} ${this.rowId},${this.colId}\n`, e);
        }
    }

	var iteratorObj = new IteratorFoundCells(options);

    var foundCells = options.foundCells || this.getDialogArguments('foundCells');
    console.log("found cells:", foundCells);
	if (empty(foundCells)) return;

	var iteratorMain = async function() {
        console.log("Found cell:", foundCells);
        this.index      = -1;
        this.maxIndex   = foundCells.length - 1;
        this.isLast     = false;
        if (this.maxIndex < 0) this.maxIndex = 0;
        var processed = {};

		for (var idx in foundCells) {
            this.index++;
            var thisCoords = foundCells[idx];
            var rowId = thisCoords.row;
            var colId = thisCoords.col;
            if (processed[thisCoords.file+","+rowId+","+colId]) continue;
            processed[thisCoords.file+","+rowId+","+colId] = true;

            this.file 		= thisCoords.file;
            this.rowId 		= rowId;
            this._cells 	= trans.project.files[this.file].data[rowId] || [];
            this.keyText 	= this._cells[trans.keyColumn];
            this.cells = new Proxy(this._cells, {
                get: function(target, name) {
                    return target[name];
                },
                set: function(target, name, value) {
                    codeRunner.onCellEdit(thisCoords.file, rowId, name, value, target[name])
                    target[name] = value
                }
            }); 
            this._tags 		= trans.project.files[this.file].tags?.[rowId] || [];
            this.tags 		= new Proxy(this._tags, {
                get: (target, name) => {
                    return target[name];
                },
                set: (target, name, value) => {
                    var previousTags = JSON.parse(JSON.stringify(trans.project.files[this.file]?.tags?.[rowId] || []));
                    target[name] = value
                    if (!Array.isArray(trans?.project?.files?.[this.file]?.tags)) return false;
                    trans.project.files[this.file].tags[rowId] = JSON.parse((JSON.stringify(target)));
                    codeRunner.onTagEdit(this.file, rowId, trans.project.files[this.file].tags[rowId], previousTags);
                    return true;
                }
            })

            this.parameters	= trans.project.files[this.file].parameters?.[rowId] || [];
            this.context	= trans.project.files[this.file].context?.[rowId] || [];
			this.comments   = codeRunner.createCommentsProxy(this.file, rowId);
			this.cellInfo   = codeRunner.createCellInfoProxy(this.file, rowId, colId);
            
            this.colId      = colId;
            this.text       = trans.project.files[this.file].data[rowId][colId];
            this.cellCoords = {
                row:rowId,
                col:colId
            };

            if (this.index>=this.maxIndex) this.isLast = true;
            
            await fn.call(this);
            if (codeRunner.isBreak) return codeRunner.finalize("find", options);
            
        }
        codeRunner.finalize("find", options)
	}
	
	await iteratorMain.apply(iteratorObj);
	return true;
}

CodeRunner.prototype.openFormWindow = async function(schema, def={}, options={}) {
    if (!schema) return;
    if (!schema.components?.length) return;
    
    const id 			= "formWindow";
    options 	= options || {};
    options.id 	= options.id || id;
    options.workspaceType = "formIO";


    console.log("Opening modal window", arguments);
    await common.localStorage.set("formIOLastSchema", schema)

    var {showModalDialog} = require("www/js/modalDialog.js");
    await showModalDialog("www/form.html", options, {id:id, width:480, height:520});
    console.log("script editor closed");
    return await common.localStorage.get("formIOLastValue");

}


// CodeRunner.prototype.getCodeInfo = function(code) {
//     if (!code) return console.warn("Code cannot empty!");

//     const infos = commentParser.parse(code);
//     if (!infos?.length) return;
    
//     var result = {

//     };
//     for (let i=0; i<infos.length; i++) {
//         if (!infos[i]) continue;
//         if (!infos[i].description) continue;
//         if (infos[i].description.substring(0, 5) !== ":info") continue;
//     }

//     return result;
// }



CodeRunner.prototype.isUserInputRequired = async function(code) {
    if (!code) return false;
    const commentParser = new (require("www/js/CommentParser.js"))(code);
    const schema = commentParser.getDescriptionByTag("form");
    if (!schema?.length) return false;
    return true;
}

CodeRunner.prototype.initUserInput = async function(code) {
    if (!code) return;
    const commentParser = new (require("www/js/CommentParser.js"))(code);
    const schema = commentParser.getDescriptionByTag("form");
    console.log("Form schema is", schema, commentParser);
    if (!common.isJSON(schema[0])) return console.warn("Invalid schema", schema, commentParser);
    const formSchema = JSON.parse(schema[0])
    var userData = await this.openFormWindow(formSchema);
    console.log("lastUserInput is ", userData);
    this.lastUserInput = userData?.data
    return userData;
}

CodeRunner.prototype.run = async function(code, workspace, options) {
    if (!code) return console.error("Empty code");
    workspace = workspace || this.workspace;
    options = options || {};
    options.userInput ||= this.lastUserInput;

    if (!options.userInput) {
        if (await this.isUserInputRequired(code)) {
            let userInput = await this.initUserInput(code);
            if (userInput?.state!=="submitted") {
                console.warn("Canceled because user input is not submitted");
                return;
            }
        }

        options.userInput = this.lastUserInput;
    }


    try {
        let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
        var fn = new AsyncFunction(code);
	} catch (e) {
        console.error("Error executing automation")
		throw e;
	}

    console.log("workspace is:", workspace);
    console.log("Options is:", options);
    console.log("%c↓↓The outputs from your script are below↓↓", "color:blue;font-size:1.5em;");
    console.log("==========================================");

    try {
        window.session = {};
        if (workspace == "gridSelection") {
            await this.executeSelectedCells(fn, options);
        } else if (workspace == "foundCells") {
            await this.executeFoundCells(fn, options);
        } else if (workspace == "objectIterator") {
            await this.executeObjectIterator(fn, options);
        } else if (workspace == "rowIterator") {
            await this.executeRowIterator(fn, options);
        } else if (workspace == "global") {
            await this.executeGlobal(fn, options);
        } else {
            throw "Unknown workspace : "+workspace;
        }
    } catch (e) {
        if (e.toString().includes('--2472KAFSDFJ--') == true) {
            var msg = e.toString().split(":");
            if (typeof options.onHalt == "function") {
                options.onHalt.call(this, msg[1]);
            }
            console.log(`Process halted by user request:\n${msg[1]}`);
        } else {
            console.error(e);
            throw e;
        }
    }
    console.log("%cExecution completed", "color:blue;font-size:1.5em;");

}

module.exports = CodeRunner;
module.exports.BaseIterator = BaseIterator;