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
// const { threadId } = require('worker_threads');
const myStorage = require("better-localstorage");

var win = nw.Window.get();
window.fs 		= require('graceful-fs');
window.afs 		= require('await-fs');
window.nwPath 	= require('path');
window.spawn 	= require('child_process').spawn;
window.fsp 		= require("graceful-fs").promises;

var dialogArguments;
var codeEditor;
var loadingScreen;

if (window.opener) {
    var trans   = window.opener.trans;
    //var ui      = window.opener.ui;
    var sys      = window.opener.sys;
}

/*
const die = function(text) {
    throw(`Process halted by user request --2472KAFSDFJ--:${text}`);
}


class BaseIterator {
    constructor(options) {
        this.options    = this.options || {};
    }
}
BaseIterator.prototype.getObj = function() {
    return trans.getObjectById(this.file);
}
*/





class CodeEditor extends require("www/js/CodeRunner.js") {
	constructor(filePath, options) {
		super(options)
        this.filePath   = filePath || "";
        this.options    = options || {};
        this.isChanged  = false;

        this.userSetting = new myStorage("codeEditor");
	}
}


CodeEditor.prototype.getCurrentHelpTopic = async function() {
    return dialogArguments.helpTopics || []
}

CodeEditor.prototype.getAutocompleteTopics = async function() {
    if (this._autoComplete) return this._autoComplete;
    const topics = await this.getCurrentHelpTopic();
    var result = [];
    for (var i=0; i<topics.length; i++) {
        result.push({
            value:topics[i].value,
            score:topics[i].score,
            meta:topics[i].type+". "+topics[i].meta
        })
    }
    var external = await common.fileGetContents("data/helpContext.json");
    if (external) {
        console.log("External is:", JSON.parse(external));
        result = result.concat(JSON.parse(external));
        console.log("The result:", result);
    }
    this._autoComplete = result;
    return result;
}

CodeEditor.prototype.break = function() {
    console.warn("Issuing break on the next iteration");
    this.isBreak = true;
}

CodeEditor.prototype.setTitle = function(str) {
    $("title").text(str);
}

CodeEditor.prototype.setFooter = function(col, text) {
    var $footer = $("#footer");
    if (typeof col == "number") {
        $footer.find(".footer-content").eq(col).find("span").html(text);
    } else {
        $footer.find(col).html(text);
    }
}

CodeEditor.prototype.openFileList = async function() {
    var that = this;
    var $dialog = $(`<div id='fileListDialog'>
                        <div class="menuPanelTool">
                            <input type="search" class="search menuPanelSearch" placeholder="Filter">			
                        </div>
                    </div>`);
    $dialog.find(".search").off("focus.filter");
    $dialog.find(".search").on("focus.filter", function() {
        if($(this).hasClass("listInitialized")) return;
        console.log("initializing list");
        window.listOption = {
            valueNames: [
              'filterable',
              //{ data: ['id'] }
            ]
        };
        that.fileList = new List('fileListDialog', listOption);	
        $(this).addClass("listInitialized");
    })
    var drawFileList = async () => {
        var $menu       = $(`<ul class="LiveFileSelector list"></ul>`)
        var fileList = await fsp.readdir(this.workspaceFolder);
        for (var i in fileList) {
            var $temp = $(`<li><div class="filterable">${fileList[i]}</div></li>`);
            $temp.data("path", nwPath.join(this.workspaceFolder, fileList[i]));
            $temp.on("click", function() {
                that.openFile($(this).data("path"));
                $dialog.dialog("close");
            });
            $temp.appendTo($menu);
        }
        $dialog.append($menu);
        //if (that.fileList) that.fileList.reIndex();
    }

    $dialog.dialog({
        autoOpen: false,
        title: "",
        modal:false,
        closeOnEscape:true,
        classes: {
            "ui-dialog": "highlight",
            "ui-dialog-titlebar": "hidden"
        },			
        width:$(".cellInfoPartsB").outerWidth(),
        height:Math.round($(window).height()/100*50),
        minWidth:400,
        minHeight:160,
        rezisable:false,
        modal:true,
        position: {
            my: "left top",
            at: "left bottom",
            of: ".pathinfoWrapper"
        },
        show: {
            effect: "slide",
            direction: "up",
            duration: 100
        },
        hide: {
            effect: "slide",
            direction: "up",
            duration: 100
        },
        close: function( event, ui ) {
            $dialog.remove();
        },
        open: function(ev, ui) {
            console.log("dialog opened");
            $(".ui-widget-overlay.ui-front").one("click", ()=>{
                $dialog.dialog("close");
            });
            drawFileList();

        },
        buttons:[
            {
                text: "OK",
                icon: "ui-icon-close",
                click: function() {
                    $(this).dialog( "close" );
                }
            }
        ]
    });	
    $(window).one("resize", ()=> {
        $dialog.dialog("close");
    });
    $dialog.dialog("option", "width", $(".pathinfoWrapper").width() );
    $dialog.dialog("option", "height", 160 );
    $dialog.dialog("open");
}


CodeEditor.prototype.openThisHelpContext = async function() {
    const that    = this;
    const $dialog = $("<div id='thisHelpContext'></div>");
    console.log("open help context")
    const generateHelpTopics = async ()=> {
        if ($dialog.is(".initialized")) return;
        const topic = await this.getCurrentHelpTopic();
        console.log("Topic is", topic)
        for (var i in topic) {
            if (topic[i].value.includes("this.") == false) continue;
            if (topic[i].workspace && topic[i].workspace.includes(this.workspace) == false) continue;
            var $elm = $(`
                <div class="helperChoice" data-value="${topic[i].value}" data-workspace="" title="click to add into the current pointer">
                    <h3>${topic[i].value}</h3>
                    <div class="types">
                        <span class="type">${topic[i].type}</span>
                    </div>
                    <p class="description">${topic[i].meta}</p>
                </div>`);
            $elm.on("click", function() {
                that.addTextToCursor($(this).attr('data-value'));
                $dialog.dialog("close");
            });
            $dialog.append($elm);
        }
        $dialog.addClass("initialized");
    }

    $dialog.dialog({
        autoOpen: false,
        title: "",
        modal:false,
        closeOnEscape:true,
        classes: {
            "ui-dialog": "highlight",
            "ui-dialog-titlebar": "hidden"
        },			
        height:Math.round($(window).height()/100*50),
        minWidth:320,
        minHeight:160,
        rezisable:false,
        modal:true,
        position: {
            my: "left bottom",
            at: "left top",
            of: ".thisHelpContext"
        },

        close: function( event, ui ) {

        },
        open: function(ev, ui) {
            console.log("dialog opened");
            $(".ui-widget-overlay.ui-front").one("click", ()=>{
                $dialog.dialog("close");
            });
            generateHelpTopics();
        },
        buttons:[
            {
                text: "OK",
                icon: "ui-icon-close",
                click: function() {
                    $(this).dialog( "close" );
                }
            }
        ]
    });	
    $(window).one("resize", ()=> {
        $dialog.dialog("close");
    });
    $dialog.dialog("option", "width", $("body").width() - 80);
    $dialog.dialog("option", "height", 160 );
    $dialog.dialog("open");
}

CodeEditor.prototype.setFunctionName = function(text) {
    $(".fnName").text(text);
}

CodeEditor.prototype.addTextToCursor = function(text) {
    if (!this.editor) return;
    this.editor.session.insert(this.editor.getCursorPosition(), text)
}

CodeEditor.prototype.setConfig = function(key, value) {
    this.config = this.config || {};
    this.config[key] = value;
    localStorage.setItem("codeEditor/"+this.workspace, JSON.stringify(this.config))
    return true
}

CodeEditor.prototype.getConfig = function(key) {
    if (!this.config) this.config = JSON.parse(localStorage.getItem("codeEditor/"+this.workspace)) || {};
    return this.config[key];
}


CodeEditor.prototype.isQuickLaunch = function(filePath) {
    if (!filePath) return false;
    filePath = filePath || this.filePath
    var sysConfig = sys.getConfig("codeEditor/"+this.workspace);
    if (!sysConfig) {
        sys.setConfig("codeEditor/"+this.workspace, {});
        sysConfig = sys.getConfig("codeEditor/"+this.workspace);
    }
    sysConfig["quickLaunch"] = sysConfig["quickLaunch"] || [];
    if (sysConfig["quickLaunch"].includes(filePath)) return true;
    return false;
}

CodeEditor.prototype.setQuickLaunch = function(filePath) {
    if (!filePath) return console.error("You must specify filepath");
    filePath = filePath || this.filePath
    if (this.isQuickLaunch(filePath)) return true;

    var sysConfig = sys.getConfig("codeEditor/"+this.workspace);
    sysConfig["quickLaunch"] = sysConfig["quickLaunch"] || [];
    sysConfig["quickLaunch"].push(filePath);
    sys.setConfig("codeEditor/"+this.workspace, sysConfig);
    sys.saveConfig();
    return true;
}


CodeEditor.prototype.unsetQuickLaunch = function(filePath) {
    if (!filePath) return console.error("You must specify filepath");
    filePath = filePath || this.filePath
    if (!this.isQuickLaunch(filePath)) return true;

    var sysConfig = sys.getConfig("codeEditor/"+this.workspace);
    sysConfig["quickLaunch"] = sysConfig["quickLaunch"] || [];

    const index = sysConfig["quickLaunch"].indexOf(filePath);
    if (index > -1) {
        sysConfig["quickLaunch"].splice(index, 1); // 2nd parameter means remove one item only
    }

    sys.setConfig("codeEditor/"+this.workspace, sysConfig);
    sys.saveConfig();
    return true;
}

CodeEditor.prototype.toggleQuickLaunch = function() {
    if (!this.filePath) return alert(t("You should save the current project first before creating shortcut to Translator++"))
    var $quickLaunchBtn = $(".button-publish");
    if ($quickLaunchBtn.hasClass("checked") == false) {
        $quickLaunchBtn.addClass("checked");
        this.setQuickLaunch(this.filePath);
    } else {
        $quickLaunchBtn.removeClass("checked");
        this.unsetQuickLaunch(this.filePath);
    }
}

CodeEditor.prototype.evalQuickLaunch = function(filePath) {
    filePath = filePath || this.filePath
    $(".button-publish").removeClass("checked")
    if (this.isQuickLaunch(filePath)) $(".button-publish").addClass("checked")
}

CodeEditor.prototype.setFilePath = function(newPath) {
    if (this.filePath == newPath) return false;
    this.filePath = newPath;
    // changing the display
    if (!newPath) {
        $("#currentFile").val("")
    } else {
        $("#currentFile").val(nwPath.basename(this.filePath));
    }
    this.setConfig("lastOpenedFile", this.filePath);
    this.evalQuickLaunch(this.filePath)
    this.trigger("filePathChanged")
    return true;
}

CodeEditor.prototype.setPathUI = async function(defaultPath, onInput) {
    var defaultFilename = nwPath.basename(defaultPath || this.defaultSavePath);
    var defaultFolder   = nwPath.dirname(defaultPath || this.defaultSavePath);
    
    await common.mkDir(defaultFolder);

    if (this.filePath) {
        defaultFilename = nwPath.basename(this.filePath);
        defaultFolder   = nwPath.dirname(this.filePath);
    }

    onInput = onInput || function(){};

    var that = this;
    return new Promise((resolve, reject) => {
        var hasInput = false;
        var $elm = $("<input type='file' style='display:none' class='hidden __pseudoFileDlg1' />");
        $elm.attr("nwsaveas", defaultFilename);
        $elm.attr("nwworkingdir", defaultFolder);
        $elm.attr("accept", ".js,text/javascript");
        $elm.on("click", function() {
            $(this).val("");
        });
        $elm.on("input", async function() {
            hasInput = true;
            console.log("some input file");
            var thisVal = $(this).val();
            if (thisVal) {
                console.log("received some change");
                that.setFilePath(thisVal);
                await onInput.call(this, thisVal);
                resolve(thisVal);
            } else {
                console.log("Input canceled");
                resolve("");
            }
            $(this).remove();
        });
        // when canceled
        $(window).one("focus.fileSelector", function() {
            setTimeout(()=> {
                if (hasInput) return;
                resolve("");
                $(this).remove();
            }, 500);
        })
        $elm.trigger("click");
    })

}



CodeEditor.prototype.openFileDialog = async function(defaultPath, onInput) {
    var defaultFilename = nwPath.basename(defaultPath || this.defaultSavePath);
    var defaultFolder   = nwPath.dirname(defaultPath || this.defaultSavePath);
    
    await common.mkDir(defaultFolder);

    if (this.filePath) {
        defaultFilename = nwPath.basename(this.filePath);
        defaultFolder   = nwPath.dirname(this.filePath);
    }

    onInput = onInput || function(){};

    return new Promise((resolve, reject) => {
        var hasInput = false;
        var $elm = $("<input type='file' style='display:none' class='hidden __pseudoFileDlg1' />");
        $elm.attr("nwworkingdir", defaultFolder);
        $elm.attr("accept", ".js,text/javascript");
        $elm.on("click", function() {
            $(this).val("");
        });
        $elm.on("input", async function() {
            hasInput = true;
            console.log("some input file");
            var thisVal = $(this).val();
            if (thisVal) {
                console.log("received some change");
                await onInput.call(this, thisVal);
                resolve(thisVal);
            } else {
                console.log("Input canceled");
                resolve("");
            }
            $(this).remove();
        });
        $elm.on("blur", async function() {
            console.log("blurred");
        });

        // when canceled
        $elm.on("click", ()=> {
            $(window).one("blur.fileSelector", ()=>{
                $(window).one("focus.fileSelector", () =>{
                    setTimeout(()=> {
                        if (hasInput) return;
                        resolve("");
                        $(this).remove();
                    }, 500);
                });
            });
        })
        
        $elm.trigger("click");
    })

}

CodeEditor.prototype.close = function(force) {
    if (!force) {
        if (this.isChanged) {
            var conf = confirm("Do you wish to close the current script? Any unsaved data will be discarded.");
            if (!conf) return;
        }
    }

    this.setFilePath("");
    this.isChanged = false;
    this.editor.setValue("");
    this.trigger("onClose");
}

CodeEditor.prototype.new = function(force) {
    if (dialogArguments.readOnly) return;
    if (dialogArguments.workspaceType != "automation") {

        return;
    }
    if (!force) {
        if (this.isChanged) {
            var conf = confirm("Do you wish to clear the current code and start a new one?");
            if (!conf) return;
        }
    }

    this.close(true);
    this.trigger("onNew");
}

CodeEditor.prototype.openFile = async function(file, force) {
    if (!file) return this.open(force);
    if (!await common.isFileAsync(file)) return;
    if (!force) {
        if (this.isChanged) {
            var conf = confirm("Do you wish to open another file?\nThe current code will be discarded, and any unsaved works may be lost.");
            if (!conf) return;
        }
    }

    loadingScreen.show();
    this.close(true);
    this.editor.setValue(await common.fileGetContents(file));
    loadingScreen.hide();
    this.setFilePath(file);
}

CodeEditor.prototype.open = async function(force) {
    if (dialogArguments.readOnly) return;
    if (dialogArguments.workspaceType != "automation") {

        return;
    }
    if (!force) {
        if (this.isChanged) {
            var conf = confirm("Do you wish to open another file?\nThe current code will be discarded, and any unsaved works may be lost.");
            if (!conf) return;
        }
    }

    var newFile = await this.openFileDialog();
    console.log("Trying to open:", newFile);
    if (!newFile) return;

    this.close(true);
    this.editor.setValue(await common.fileGetContents(newFile));
    this.setFilePath(newFile);
}

CodeEditor.prototype.save = async function() {
    if (dialogArguments.readOnly) return;
    if (dialogArguments.workspaceType != "automation") {
        if (typeof dialogArguments.onSave == "function") {
            $(".button-save img").addClass("rotating");
            dialogArguments.onSave.call(this, this.editor.getValue());
            setTimeout(()=> {
                $(".button-save img").removeClass("rotating");
            }, 800);
        }
        return;
    }

    if (!this.filePath) return this.saveAs();
    $(".button-save img").addClass("rotating");
    await common.filePutContents(this.filePath, this.editor.getValue(), "utf8", false);
    setTimeout(()=> {
        $(".button-save img").removeClass("rotating");
    }, 800);
    this.isChanged = false;
    this.trigger("onSave");
    console.log("save completed");
    return this.filePath;
}

CodeEditor.prototype.saveAs = async function() {
    if (dialogArguments.readOnly) return;

    if (dialogArguments.workspaceType != "automation") {

        return;
    }

    var filePath = await this.setPathUI();
    if (!filePath) return console.log("empty path", filePath);
    console.log("Saving to : ", filePath);
    $(".button-save img").addClass("rotating");
    await common.filePutContents(filePath, this.editor.getValue());
    setTimeout(()=> {
        $(".button-save img").removeClass("rotating");
    }, 800);
    this.setFilePath(filePath);
    this.isChanged = false;
    this.trigger("onSave");
    return filePath;
}

CodeEditor.prototype.help = function() {
    if (!dialogArguments.helpPage) return;
    nw.Shell.openExternal(dialogArguments.helpPage);
}

CodeEditor.prototype.execute = async function() {
	try {
        let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
        var fn = new AsyncFunction(this.editor.getValue());
		//var fn = new Function(this.editor.getValue());
	} catch (e) {
		return alert("Unable to process your script because there is error on the code.");
	}
	
	loadingScreen.show();
    loadingScreen.addButton({
        label:"Stop Process",
        onClick: ($btn) => {
            if ($btn.prop("disabled")) return;
            $btn.prop("disabled", true);
            $btn.text("Stopping process");
            this.break();
        }
    });
	await common.wait(20);

	var conf = confirm("Do you want to save your project before execute the script?");
	if (conf) {
		await trans.save();
	}

    try {
        window.session = {};
        console.log("workspace is:", this.workspace);
        console.log("%c↓↓The outputs from your script are below↓↓", "color:blue;font-size:1.5em;");
        console.log("==========================================");
        if (this.workspace == "gridSelection") {
            await this.executeSelectedCells(fn);
        } else if (this.workspace == "foundCells") {
            await this.executeFoundCells(fn);
        } else if (this.workspace == "objectIterator") {
            await this.executeObjectIterator(fn);
        } else if (this.workspace == "rowIterator") {
            await this.executeRowIterator(fn);
        } else if (this.workspace == "global") {
            await this.executeGlobal(fn);
        } else {
            alert("Unknown workspace");
        }
    } catch (e) {
        if (e.toString().includes('--2472KAFSDFJ--') == true) {
            var msg = e.toString().split(":");
            alert(`Process halted by user request:\n${msg[1]}`);
        } else {
            console.error(e);
            alert("Error occured, please view console log for more information (F12)");
        }
        loadingScreen.hide();
        return;
    }
    console.log("%cExecution completed", "color:blue;font-size:1.5em;");
	alert("Execution completed!");
	loadingScreen.hide();
}

CodeEditor.prototype.openLastFile = async function() {
    if (dialogArguments.workspaceType == "automation") {
        var lastFile = this.getConfig("lastOpenedFile");
        console.log("openLastFile", lastFile);
    
        if (!lastFile) return;
    
        return this.openFile(lastFile, true);
    } else if (dialogArguments.script) {
        this.editor.setValue(dialogArguments.script, -1);
    } else if (dialogArguments.file) {
        this.editor.setValue(await common.fileGetContents(dialogArguments.file), -1);
    }

}

CodeEditor.prototype.fontSizeUp = async function() {
    let fontSize = await this.userSetting.get("fontSize");
    fontSize ||= 12;

    fontSize++;
    if (fontSize > 100) fontSize = 100;
    this.editor.setOptions({
        fontSize: fontSize+"pt",
    })
    await this.userSetting.set("fontSize", fontSize);
}

CodeEditor.prototype.fontSizeDown = async function() {
    let fontSize = await this.userSetting.get("fontSize");
    fontSize ||= 12;

    fontSize--;
    if (fontSize < 7) fontSize = 7;
    this.editor.setOptions({
        fontSize: fontSize+"pt",
    })
    await this.userSetting.set("fontSize", fontSize);
}

CodeEditor.prototype.fontSizeReset = async function() {
    let fontSize = 12;
    this.editor.setOptions({
        fontSize: fontSize+"pt",
    })
    await this.userSetting.set("fontSize", fontSize);
}


CodeEditor.prototype.setupAutomation = async function() {
    if (this.workspace == "gridSelection") {
        this.setTitle("Automation - Grid selection")
    } else if (this.workspace == "foundCells") {
        this.setTitle("Automation - Found cells")
    } else if (this.workspace == "objectIterator") {
        this.setTitle("Automation - Object iterator")
    } else if (this.workspace == "rowIterator") {
        this.setTitle("Automation - Rows iterator")
    } else if (this.workspace == "global") {
        this.setTitle("Automation - GLobal")
    } else {
        console.error("Unknown workspace", window.dialogArguments);
        alert("Unknown workspace");
    }

    this.workspaceFolder = nwPath.join(__dirname, "data/custom-scripts/", this.workspace);
    this.defaultSavePath = nwPath.join(this.workspaceFolder, "NewCustomScript.js");
    await common.mkDir(nwPath.dirname(this.workspaceFolder));
    dialogArguments.helpPage ||= "https://dreamsavior.net/docs/translator/execute-script/custom-script/"
    $(".toolbar3").removeClass("hidden")
    $(".toolbar5").removeClass("hidden")
    $(".toolbar6").removeClass("hidden")


    dialogArguments.helpTopics = [
        {value: 'die', score: 1, type:'function()', meta: 'Immediately terminate execution'},
        {value: 'session', score: 1, type:'Object', meta: 'Placeholder that resets every execution. This object will be available across iteration'},
        {value: 'this', score: 1, type:"Object", meta: 'Current iteration object'},
        {value: 'this.file', score: 1, type:"String, readonly", meta: 'Current file ID'},
        {value: 'this.index', score: 1, type:"Number, readonly", meta: 'Current index of iteration'},
        {value: 'this.maxIndex', score: 1, type:"Number, readonly", meta: 'Maximum index of the current session'},
        {value: 'this.isLast', score: 1, type:"Boolean, readonly", meta: 'Current iteration is the last'},
        {value: 'this.rowId', score: 1, type:"Number, readonly", meta: 'Current id of the row'},
        {value: 'this.keyText', score: 1, type:"String, readonly", meta: 'The key text of the current row. Alias of this.cells[trans.keyColumn]'},
        {value: 'this.tags', score: 1, type:"Array, mutable", meta: 'Tags of current row.'},
        {value: 'this.cells', score: 1, type:"Array, mutable", meta: 'List of the cells of the current row.'},
        {value: 'this.parameters', score: 1, type:"Array, mutable", meta: 'List of the parameters of the current row.'},
        {value: 'this.context', score: 1, type:"Array, mutable", meta: 'List of the contexts of the current row.'},
        {value: 'this.comments', score: 1, type:"Array, mutable", meta: 'List of the comments of the current row. Index of the comments represents its cell id.'},
        {value: 'this.text', score: 1, type:"String, readonly", meta: 'Text of the currently visited cell.'},
        {value: 'this.colId', score: 1, type:"Number, readonly", meta: 'Column Id of currently visited cell.'},
        {value: 'this.cellCoords', score: 1, type:"Object, readonly", meta: 'Coordinate information of the currently visited cell.'},
        {value: 'this.setText', score: 1, type:"function(string):void", meta: 'Set text of the currently visited cell.'},
        {value: 'this.getBestTranslation', score: 1, type:"function():string", workspace:["rowIterator"], meta:"Get the text of the best (rightmost) translation from the current row."},
        {value: 'this.getBestTranslationCol', score: 1, type:"function():number", workspace:["rowIterator"], meta:"Get the column index of the best (rightmost) translation from the current row."},
        {value: 'this.userInput', score: 1, type:"Object", meta:"The value of the user input."},
    ]
}

CodeEditor.prototype.initialize = async function() {
    
    dialogArguments = dialogArguments || {};
    var waitTimeout = 0;
    while (!dialogArguments.workspace) {
        await common.wait(100);
        waitTimeout+=100;
        if (waitTimeout >  2000) break;
    }
    this.workspace = dialogArguments.workspace || "general";
    dialogArguments.language ||= "javascript";

    if (dialogArguments.workspaceType == "automation") {
        await this.setupAutomation();
    } else {
        // not automation
        if (typeof dialogArguments.onSave !== "function") {
            console.warn("onSave is not set or not a function, force the code to readonly mode!")
            dialogArguments.readOnly = true;
        }
    }

    if (dialogArguments.helpPage) {
        $(".button-help").removeClass("hidden")
    }


    if (dialogArguments.readOnly) {
        $(".toolbar1").addClass("hidden")
    }

    this.setFooter(0, this.workspace);
    this.setFooter(3, dialogArguments.language);
    this.setFunctionName(this.workspace);

    // initializing editor
	this.editor = ace.edit(document.querySelector("#aceEditor"));
    this.editor.setTheme("ace/theme/monokai");
    if (dialogArguments.language == "javascript") {
        this.editor.session.on('changeMode', function(e, session){
            if ("ace/mode/javascript" === session.getMode().$id) {
                console.log("mode changed");
                if (!!session.$worker) {  // eslint-disable-line
                    console.log("sending to worker?");
                    session.$worker.send("setOptions", [{
                        "esversion": 9,
                        "esnext": false,
                        "browser": true,
                        "jquery":true,
                    }]);
                }
            }
        });
        this.editor.session.setMode("ace/mode/javascript");
    
    } else {
        this.editor.session.setMode("ace/mode/"+dialogArguments.language);
    }
    this.editor.setShowPrintMargin(false);
    this.editor.on("change", ()=>{
        this.isChanged = true;
    })
    this.editor.setOptions({
        fontSize: ((await this.userSetting.get("fontSize")) || 12)+"pt",
		enableBasicAutocompletion: true,
        // to make popup appear automatically, without explicit _ctrl+space_
        enableSnippets: true,
        enableLiveAutocompletion: true,
    });

    let langTools = ace.require('ace/ext/language_tools');
    var customCompleter = {
        getCompletions: async (editor, session, pos, prefix, callback) => {
            callback(null, await this.getAutocompleteTopics());
        }
       }
      langTools.addCompleter(customCompleter);


    this.isInitialized = true;
    this.trigger("initialized");

    $("#currentFile").on("click", async ()=> {
        await this.openFileList();
    })
    $(".openFileList").on("click", async ()=> {
        await this.openFileList();
    })


    if (dialogArguments.readOnly) this.editor.setReadOnly(true);

    this.openLastFile();

    
}


$(document).ready(function() {
    loadingScreen    = new LoadingScreen(); //eslint-disable-line 
    codeEditor       = new CodeEditor();
	codeEditor.initialize();

	$(".button-execute").on("click", function() {
		codeEditor.execute();
	});

    $(".button-debugger").on("click", function() {
        if (nw.process.versions['nw-flavor'] !== 'sdk') return alert(t("This feature only available if you are using Developer version of Translator++. You can switch into Developer version by using Basic Utilities -> Change Core NWJS."));

        win.showDevTools();
    });

	$(".button-help").on("click", function() {
        codeEditor.help();
	});

    $(".button-new").on("click", function() {
        codeEditor.new();
	});

    $(".button-open").on("click", function() {
        codeEditor.open();
	});

    $(".button-save").on("click", function() {
        codeEditor.save();
	});

    $(".button-save-as").on("click", function() {
        codeEditor.saveAs();
	});

    $(".thisHelpContext").on("click", function() {
        codeEditor.openThisHelpContext();
    })

    $(".button-publish").on("click", function() {
        codeEditor.toggleQuickLaunch();
    })

    if (nw.process.versions["nw-flavor"] == "sdk") {
        $(".button-debugger").removeClass("hidden");
    }


    $(document).on('keydown', function(e) {
		var keyCode = e.keyCode || e.which;

		switch (keyCode) {

			case 112 : //F1, about
				e.preventDefault();
				codeEditor.help();
			break;		
			case 27 : //esc, close active windows
				//e.preventDefault();
				//ui.introWindowClose();
			break;
            case 121 : //F10
                codeEditor.execute();
            break;
			case 122 : //F11, Full screen
				var win = win || nw.Window.get();
				win.maximize();
			break;		
		}

		// EDITING COMMAND
		if (e.ctrlKey) {
			switch(keyCode) {
				case 78 : //n
					e.preventDefault();
					console.log("Pressing CTRL+n");
					codeEditor.new();
				break;
				case 79 : //o
					e.preventDefault();
					console.log("Pressing CTRL+o");
					codeEditor.open();
				break;
				case 83 : //s
					e.preventDefault();
                    if (e.shiftKey) {
                        codeEditor.saveAs();
                    } else {
                        console.log("Pressing CTRL+s");
                        codeEditor.save();
                    }
				break;
				case 70 : //f
					e.preventDefault();
					(async () => {
						await common.wait(200);
						console.log("Pressing CTRL+f");
					})();

				break;
				case 72 : //h
					e.preventDefault();
					console.log("Pressing CTRL+h");
				break;

			}
		} else if (e.altKey) {
			switch(keyCode) {
				case 46 : //alt delete (remove context translation)
					//e.preventDefault();
					//$(document).trigger("clearContextTranslationByRow", {file:trans.getSelectedId(), row:trans.grid.getSelectedRange(), type:"range"});
				break;
			}			
		} else if (e.shiftKey) {
			switch(keyCode) {
				case 46 : //shift delete (remove selected row)
				break;
			}
			
		}
	});	

    $("body").on('mousewheel', function(e) { 
        // Control wheel to resize font
        if (e.ctrlKey) {
            var delta = null;
            var direction = false;

            if ( e.originalEvent.wheelDelta ) { // will work in most cases
                delta = e.originalEvent.wheelDelta / 60;
            } else if ( e.originalEvent.detail ) { // fallback for Firefox
                delta = -e.originalEvent.detail / 2;
            }
            if ( delta !== null ) {
                direction = delta > 0 ? 'up' : 'down';
            }

            if (direction == "up") {
                codeEditor.fontSizeUp();
            } else {
                codeEditor.fontSizeDown();
            }
        }
    })

    win.on('close', async function() {
        this.hide();
        if (nw.process.versions["nw-flavor"] == "sdk") {
            win.closeDevTools();
            await common.wait(200);
        }
        this.close(true);
    })

});