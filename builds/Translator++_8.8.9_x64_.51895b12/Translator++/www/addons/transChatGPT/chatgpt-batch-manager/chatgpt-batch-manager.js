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
const openAiApi = require("www/addons/transChatGPT/openAiApi.js");
const LoadingScreen = require("www/js/loadingScreen.js");
const basicEventHandler = require("www/js/basicEventHandler.js");
var nwPath 		= require('path');
const UIParts = require("www/js/ui.parts.js");
const JSONL = require("www/modules/jsonl.js");
const ui = window.opener.ui;
var debounce = require("debounce");

var batchManager;
var leftPane;

const TranslatorEngine = window.opener.TranslatorEngine;
const trans = window.opener.trans;

openAiApi.getApiKey = function() {
    return TranslatorEngine.getEngine("chatGPT").apiKey;
}

const util = { }
util.timeToHuman = function(time) {
    if (!time) return "N/A";
    // converts timestamp to YYYY-MM-DD HH:MM:SS
    // console.log("converting time to human", time);
    if (typeof time == "number" && time < 10000000000) time *= 1000; // convert to milliseconds
    var date = new Date(time);
    return date.toISOString().replace("T", " ").replace("Z", "").replace(".000", "");
}

util.parseJsonl = function(jsonl) {
    // parse jsonl to array
    return jsonl.split("\n").map((line) => {
        if (!line) return null;
        try {
            return JSON.parse(line);
        } catch (e) {
            return null;
        }
    });
}

/**
 * Returns array of translation from given ChatGPT batch response
 * @param {string|Array|object} response - ChatGPT batch response
 * @returns {Array|Boolean} - Array of translations or false if not found
 */
util.getTranslations = function(response) {
    if (typeof response == "string") {
        try {
            response = JSON.parse(response);
        } catch (e) {
            return false;
        }
    }
    if (Array.isArray(response)) return response;

    if (typeof response == "object" && Object.keys(response).length) {
        // return the first found array in the object
        for (let key in response) {
            if (Array.isArray(response[key])) return response[key];
        }
    }

    return false;
}

util.loadJsonFile = async function(file) {
    if (!file) return null;
    if (!await common.isFile(file)) return null;
    try {
        return JSON.parse(await common.fileGetContents(file, "utf8", false));
    } catch (e) {
        console.error(e);
        return null;
    }
}


class BatchDetail extends basicEventHandler {
    constructor() {
        super();
        this.currentBatchItem = {
            input: null,
            output: null,
        };
        this.init();
    }
}

BatchDetail.prototype.init = async function() {
    console.log("ConversationDetail init");
    this.$elm = $("#offCanvasBatchDetail");
    this.bs = new bootstrap.Offcanvas($("#offCanvasBatchDetail").get(0));
}

BatchDetail.prototype.show = async function() {
    return new Promise((resolve, reject) => {
        this.$elm.one("shown.bs.offcanvas", () => {
            this.trigger("shown");
            resolve();
        })
        this.trigger("show");
        this.bs.show();
    });
}

BatchDetail.prototype.hide = async function() {
    return new Promise((resolve, reject) => {
        this.$elm.one("hidden.bs.offcanvas", () => {
            resolve();
            this.trigger("hidden");
        })
        this.trigger("hide");
        this.bs.show();
    });
}

BatchDetail.prototype.isShown = function() {
    return this.$elm.hasClass("show");
}




BatchDetail.prototype.clearMessage = function() {
    this.$elm.find("#conversationPreview").empty();
}

BatchDetail.prototype.addMessage = function(role, message, highlight = false) {
    if (role == "system") return this.addSystemMessage(message);
    var $message;
    const highlightClass = highlight ? " highlighted" : "";
    if (role == "user") {
        $message = $(`
                <div class="message user1${highlightClass}">
                    <div class="avatar"><i class="icon-user"></i></div>
                    <div class="bubble user1 bubble-content"></div>
                </div>`);
        $message.find(".bubble-content").text(message);
    } else if (role == "assistant") {
        $message = $(`
                <div class="message user2${highlightClass}">
                    <div class="avatar"><i class="icon-chatgpt"></i></div>
                    <div class="bubble user2 bubble-content"></div>
                </div>`);
        $message.find(".bubble-content").text(message);
    }
    this.$elm.find("#conversationPreview").append($message);
}

BatchDetail.prototype.addSystemMessage = function(message) {
    const template = $(`
                <div class="message system">
                    <div class="bubble system">
                        <div class="bubble-info">System message</div>
                        <div class="bubble-content"></div>
                    </div>
                </div>`);
    template.find(".bubble-content").text(message);
    this.$elm.find("#conversationPreview").append(template);
}

BatchDetail.prototype.addEventMessage = function(message) {
    const template = $(`<div class="chat-event"><span class="chat-event-text"></span></div>`);
    template.find(".chat-event-text").text(message);
    this.$elm.find("#conversationPreview").append(template);
}

BatchDetail.prototype.createMessagesFromBatchItem = async function(batchItem = this.currentBatchItem) {
    this.clearMessage();
    console.log("creating messages from batch item", batchItem);
    if (!batchItem?.input?.body?.messages) return;
    this.addEventMessage("Conversation started on "+util.timeToHuman(batchManager.getActiveBatch().created_at));

    for (let message of batchItem.input.body.messages) {
        this.addMessage(message.role, message.content);
    }
    // add the last message from batchItem.output
    this.addEventMessage("Response from assistant on "+batchItem.output.date_created);
    if (batchItem.output?.detail?.response?.body?.choices) {
        const lastMessage = batchItem.output.detail.response.body.choices;
        for (let message of lastMessage) {
            this.addMessage(message.message.role, message.message.content, true);
        }
    }
}

BatchDetail.prototype.getCurrentBatchItem = function() {
    if (!this.currentBatchItem?.output) return;
    return this.currentBatchItem;
}

BatchDetail.prototype.getCurrentTranslation = async function() {
    const lastMessage = this.currentBatchItem?.output?.detail?.response?.body?.choices?.[0];

    // const translation = JSON.parse(lastMessage?.message?.content);
    // return translation?.translation;
    return util.getTranslations(lastMessage?.message?.content);
}

BatchDetail.prototype.applySelected = async function() {
    if (!this.hot?.getSelectedRange()) return alert(t("Please select the rows to apply the translation"));
    const result = await UIParts.form({
        schema: {
            "targetColumn": {
                "type": "string",
                "title": t("Target Column"),
                "description": t("The column to put the translation result."),
            },
        },
        form: [
            {
                "key": "targetColumn",
                "type": "selecttranslationcolumn",
                
            },
        ],
        value: {
            targetColumn: 1,
        },
    }, {
        title: t("Import translation from ChatGPT Batch"),
        width: 400,
        height: 300,
        css: {
            "z-index": "10001"
        },
        overlayCss: {
            "z-index": "10000"
        }
    });

    if (!result) return;
    console.log("applying selected", result);

    const selectedRange = this.hot.getSelectedRange();
    if (!selectedRange) return;
    const row = common.gridSelectedRows(selectedRange);
    console.log("selected rows", row);
    for (let i = 0; i < row.length; i++) {
        const translation = this.gridData[row[i]].translation;
        const targetRow = this.gridData[row[i]].row;
        const targetPath = this.gridData[row[i]].path;
        const targetData = trans.getData(targetPath);
        console.log("target data", targetData);
        console.log("target row", targetRow);
        console.log("target path", targetPath);
        if (!targetData) continue;
        if (!targetData[targetRow]) continue;

        console.log("applying translation to", targetRow, targetData[targetRow]);
        targetData[targetRow][result.targetColumn] = translation;
    }
    alert(t("Translation applied to selected rows"));
    trans.refreshGrid();
    trans.evalTranslationProgress();
}

BatchDetail.prototype.setDetailGrid = async function() {
    //const batchMeta = await batchManager.getBatchMeta();
    const customId = this.currentBatchItem.output.custom_id;
    console.log("currentMeta", customId);
    const currentMeta = await batchManager.getRowMeta(this.currentBatchItem.output.detail);
    const translations = await this.getCurrentTranslation();
    const $gridContainer = $("#responsePreview");
    $gridContainer.empty();
    const $applySelected = $("#applySelectedRow");
    $applySelected.prop("disabled", true);

    const $rawPayloadWrapper = $(".rawPayloadWrapper");
    $rawPayloadWrapper.addClass("hidden");
    
    if (!this.aceRawOutgoing) {
        this.aceRawOutgoing = ace.edit("rawPayloadOutgoing");
        this.aceRawOutgoing.setTheme("ace/theme/monokai");
        this.aceRawOutgoing.session.setMode("ace/mode/json");

        this.aceRawIncoming = ace.edit("rawPayloadIncoming");
        this.aceRawIncoming.setTheme("ace/theme/monokai");
        this.aceRawIncoming.session.setMode("ace/mode/json");
    }

    // clear the content
    this.aceRawOutgoing.setValue("");
    this.aceRawIncoming.setValue("");


    const $displayRawPayload = $("#displayRawPayload");
    $displayRawPayload.off("click").on("click", () => {
        $rawPayloadWrapper.removeClass("hidden");
        this.aceRawOutgoing.setValue(JSON.stringify(this.currentBatchItem.output, null, 2));
        this.aceRawIncoming.setValue(JSON.stringify(this.currentBatchItem.input, null, 2));
    });



    if (!translations) {
        this.$elm.find('[data-valuemap="validJSON"]').html(`<span class="badge rounded-pill bg-danger">${t("Invalid format")}</span>`);
        return;
    } else {
        this.$elm.find('[data-valuemap="validJSON"]').html(`<span class="badge rounded-pill bg-success">${t("OK")}</span>`);
    }

    if (currentMeta.info.length != translations.length) {
        // set numberOfMsgMatched
        this.$elm.find('[data-valuemap="numberOfMsgMatched"]').html(`<span class="badge rounded-pill bg-danger">${t("Mismatch")}</span>`);
        return;
    } else {
        this.$elm.find('[data-valuemap="numberOfMsgMatched"]').html(`<span class="badge rounded-pill bg-success">${t("OK")}</span>`);
    }



    this.gridData = [];

    const getOriginalText = (path, row) => {
        const obj = trans.getObjectById(path);
        if (!obj) return null;
        return obj?.data?.[row]?.[trans.keyColumn] || null;
    }

    const gptResult = this.getCurrentBatchItem().output.detail.response.body.choices[0].message.content
    const parsedBatchLine = await batchManager.parseBatchLine(gptResult, currentMeta);
    console.log("%c parsedBatchLine", "color:aqua", parsedBatchLine);

    for (let i = 0; i < parsedBatchLine.length; i++) {
        const meta = currentMeta.info[i];
        const lineData = parsedBatchLine[i];
        const thisPath = currentMeta.path||meta.path;
        this.gridData.push({
            row: meta.r,
            original: getOriginalText(thisPath, meta.r),
            rawTranslation: translations[i],
            translation: lineData.translation,
            actor: meta.a,
            path: thisPath,
        });
    }
    

    const hot = new Handsontable($gridContainer.get(0), {
        data: this.gridData,
        rowHeaders: true,
        colHeaders: ["Row", "Actor", "Original", "Translation"],
        manualColumnResize: true,
        outsideClickDeselects:false,
        columns: [
            {data: "row", readOnly: true},
            {data: "actor", readOnly: true},
            {data: "original", readOnly: true},
            // you can edit translation
            {data: "translation", readOnly: false},
        ],
        afterSelection: function(r, c, r2, c2) {
            $applySelected.prop("disabled", false);
        },
        
        contextMenu: false
    });
    this.hot = hot;
    this.hot.render();


    // initializing event
    
    $applySelected.off("click").on("click", async () => {
        await this.applySelected();
    });

}

BatchDetail.prototype.view = async function(index) {
    console.log("viewing batch item", index);
    const batchItem = batchManager.data[index];
    if (!batchItem) return;
    
    this.currentBatchItem.output = batchItem;
    this.currentBatchItem.input = await batchManager.getBatchItemFromInputFile(batchItem.custom_id);
    
    if (!this.isShown()) await this.show();
    console.log("viewing batch item", batchItem);

    // fill the attr data-valuemap with the value relative to batchItem
    const $elm = this.$elm.find("[data-valuemap]");
    $elm.each(function() {
        const $this = $(this);
        const key = $this.data("valuemap");
        $this.text(common.getPropertyByPath(batchItem, key));
    });

    await this.createMessagesFromBatchItem();
    await this.setDetailGrid();
}



class LeftMenu extends basicEventHandler {
    constructor() {
        super();
        this.wrapper = $("#menuPanel");
        this.init();
    }
}

LeftMenu.prototype.addFileGroup = function(dirname, fileObj) {
	var $group = $("#fileList [data-group='"+CSS.escape(dirname)+"']");
	if ($group.length < 1) {
		var hTemplate = $("<li class='group-header'  data-group='"+dirname+"'>"+dirname+"</li>");
		
		if ($("#fileList .fileListUl .group-header[data-group='*']").length > 0) {
			$("#fileList .fileListUl .group-header[data-group='*']").before(hTemplate);
		} else {
			$("#fileList .fileListUl").append(hTemplate);
		}
		return true;
	}
	return false;
}

LeftMenu.prototype.add = async function(batchName, fileObj = {}) {
    const self = this;
    console.log("adding new menu to left menu", batchName, fileObj);
    batchName ||= "Unnamed";
    fileObj ||= {};
    fileObj.dirname ||= "Batch";
    fileObj.filename || batchName;
    var $li = $("<li></li>");
    $li.append("<input type='checkbox' class='fileCheckbox' title='hold shift for bulk selection' />"+
        "<a href='#' class='filterable'><span class='filename'></span>"+
            "<span class='markers'></span>"+
            "<span class='percent' title='progress'></span>"+
            "<div class='progress' title='progress'></div>"+
        "</a>");
    $li.attr("title", batchName);
    $li.attr("data-group", fileObj.dirname);
    $li.find(".fileCheckbox").attr("value", batchName);
    $li.find(".filename").text(fileObj.filename);

    $li.addClass("data-selector");
    $li.data("id", batchName);
    $li.attr("data-id", batchName);

    $li.find("a").on("mousedown", function(e) {
        if( e.which == 2 ) {
            e.preventDefault();
            trans.clearSelection();
            return false;
        }			
    });
    $li.find("a").on("dblclick", function(e) {
        // select that item
        var $thisCheckbox = $(this).closest("li").find(".fileCheckbox");
        $thisCheckbox.prop("checked", !$thisCheckbox.prop("checked")).trigger("change")
        
    });
    $li.find("a").on("click", function(e) {
        console.log("left menu clicked");
        e.preventDefault();
        self.select($(this).closest("li"));
    });
    $li.find(".fileCheckbox").on("change", function() {
        if ($(this).prop("checked") == true) {
            this.$lastCheckedFile = $(this);
            $(this).closest(".data-selector").addClass("hasCheck");
        } else {
            this.$lastCheckedFile = undefined;
            $(this).closest(".data-selector").removeClass("hasCheck");
        }
    });
    $li.find(".fileCheckbox").on("mousedown", function(e) {
        if (!this.$lastCheckedFile) return false;
        if (e.shiftKey) {
            console.log("The SHIFT key was pressed!");
            var $checkBoxes = $(".fileList .fileCheckbox");
            var lastIndex = $checkBoxes.index(this.$lastCheckedFile);
            var thisIndex = $checkBoxes.index(this);
            var chckFrom;
            var chckTo;
            if (lastIndex < thisIndex) {
                chckFrom = lastIndex;
                chckTo = thisIndex;
            } else {
                chckFrom = thisIndex;
                chckTo = lastIndex;
            }
            console.log("check from index "+chckFrom+" to "+chckTo);
            for (var i=chckFrom; i<chckTo; i++) {
                $checkBoxes.eq(i).prop("checked", true).trigger("change");
            }
            
        } 		
    });

    console.log("adding batch to left menu", $li, fileObj.dirname);
    if (!$("#fileList [data-group='"+CSS.escape(fileObj.dirname)+"']").length) {
        this.addFileGroup(fileObj.dirname, fileObj);
    }
    if ($("#fileList [data-group='"+CSS.escape(fileObj.dirname)+"']").length) {
        $("#fileList [data-group='"+CSS.escape(fileObj.dirname)+"']").last().after($li);
    } else {
        $("#fileList ul").append($li);
    }

}

LeftMenu.prototype.refresh = async function(force = false) {
    console.log("refreshing left menu");
    if (!force) if (ChatGPTBatchManager.listHash == this.currentListHash) return; // same list, no need to refresh
    $("#fileList ul").empty();
    for (let batch of ChatGPTBatchManager.listData) {
        if (!batch?.metadata?.data) continue;
        const fname = batchManager.getIdFromBatchObject(batch);
        if (!fname) continue;
        if (batch.metadata.type == "locallog") {
            this.add(fname, {
                filename: fname,
                dirname: "Local log"
            });
            continue;
        }
        this.add(fname, {
            filename: fname,
            dirname: batch.metadata.data.header.title + " (" + batch.metadata.data.header.projectId + ")"
        });
    }

    this.currentListHash = ChatGPTBatchManager.listHash;
    this.renderProgress();

}

LeftMenu.prototype.getListElementById = function(id) {
    if (typeof id == "string") {
        return $("#fileList [data-id='"+CSS.escape(id)+"']");
    }
}

LeftMenu.prototype.select = function(id) {
    // id can be id(string) or li element
    if (typeof id == "string") {
        id = this.getListElementById(id);
    }
    if (id.is(".selected")) return;
    // unselect others
    const lastSelected = $("#fileList .selected");
    if (lastSelected.length) {
        lastSelected.removeClass("selected");
        this.trigger("unselected", lastSelected);
    }

    id.addClass("selected");
    this.trigger("selected", id);
}


LeftMenu.prototype.renderProgress = function(files) {
    files = files||[];
    if (!Array.isArray(files)) files = [files];
    
    ChatGPTBatchManager.listData = ChatGPTBatchManager.listData || [];
    for (let batch of ChatGPTBatchManager.listData) {
        const thisId = batchManager.getIdFromBatchObject(batch);
        if (files?.length) {
            if (!files.includes(thisId)) continue;
        }

        const $thisListElement = this.getListElementById(thisId);
        $thisListElement.find(".markers").empty();
        $thisListElement.find(".percent").attr("data-status", batch.status);

        // determine if the batch is failed
        if (batch.request_counts.failed >= batch.request_counts.total) {
            $thisListElement.find(".markers").append("<span class='status failed' title='failed'></span>");
            $thisListElement.find(".percent").attr("data-status", "failed");
        } else if (batch.request_counts.failed > 0) {
            $thisListElement.find(".markers").append("<span class='status partial' title='warning'></span>");
            $thisListElement.find(".percent").attr("data-status", "warning");
        } else if (batch.status == "completed") {
            $thisListElement.find(".markers").append("<span class='status completed' title='completed'></span>");
        } else if (batch.status == "failed") {
            $thisListElement.find(".markers").append("<span class='status failed' title='failed'></span>");
        } else if (batch.status == "in_progress") {
            $thisListElement.find(".markers").append("<span class='status in_progress' title='in progress'></span>");
        } else {
            $thisListElement.find(".markers").append("<span class='status unknown' title='unknown'></span>");
        }
        const percent = Math.round(batch.request_counts.completed / batch.request_counts.total * 100);
        $thisListElement.find(".percent").text(percent);
		$thisListElement.find(".progress").css("background", "linear-gradient(to right, #3159f9 0%,#3159f9 "+percent+"%,#ff0004 "+percent+"%,#ff0004 100%)");

    }
}

LeftMenu.prototype.getSelectedId = function() {
    return $("#fileList .selected").data("id");
}

LeftMenu.prototype.init = async function() {

}


/**
 * Content Tab handler.
 * @description This class handles the
 * tab navigation and event handling
 * @extends basicEventHandler
 * @class
 */
class ContentTab extends basicEventHandler {
    constructor() {
        super();
        this.init();
    }
}

ContentTab.prototype.select = async function(tabId) {
    return new Promise((resolve, reject) => {
        var thisTab = $(`#${tabId}`);
        // if tabId is an element, use it directly
        if (tabId instanceof jQuery) {
            thisTab = tabId;

            // ensures correct element
            if (!thisTab.is("button")) {
                thisTab = thisTab.find("button");
            }
        }

        // if tabId is integer, try to find element by index
        if (typeof tabId == "number") {
            thisTab = $('#mainTabNav button[data-bs-toggle="tab"]').eq(tabId);
        }


        if (!thisTab.length) return reject("Tab not found");

        thisTab.one('shown.bs.tab', function (e) {
            console.log("Resolved", tabId);
            resolve(tabId);
        });
        // trigger bootstrap tab selection
        thisTab.tab('show');
    });
}

ContentTab.prototype.getActiveTab = function() {
    return $('#mainTabNav button[data-bs-toggle="tab"].active').attr("id");
}

ContentTab.prototype.init = async function() {
    const self = this;
    console.log("UpperTab init");
    var tabEl = $('#mainTabNav button[data-bs-toggle="tab"]');

    tabEl.on('shown.bs.tab', function (event) {
        event.target // newly activated tab
        event.relatedTarget // previous active tab
        console.log("tab hidden", event.relatedTarget.id);
        self.trigger("tabHidden", event.relatedTarget.id);
        console.log("tab shown", event.target.id);
        self.trigger("tabShown", event.target.id);
    })
}


class ChatGPTBatchManager extends basicEventHandler {
    constructor() {
        super();
        this.data = []
        this.activeBatch = null;
        this.activeBatchId = null;
        this.init();
    }
}

ChatGPTBatchManager.isBatchObject = function(obj) {
    // check if given object is a batch object
    // it must have id, status, endpoint, completed_at, created_at
    if (typeof obj != "object") return false;
    return obj?.id && obj?.status && obj?.endpoint && obj?.completed_at && obj?.created_at;
}

ChatGPTBatchManager.listData = []; //holds remote batch list


ChatGPTBatchManager.reindex = function() {
    // index listData by local ID
    // local ID is the human readable timestamp converted from batch.created_at with util.timeToHuman
    ChatGPTBatchManager.listIndex = {};
    for (let batch of ChatGPTBatchManager.listData) {
        const thisId = batchManager.getIdFromBatchObject(batch);
        ChatGPTBatchManager.listIndex[thisId] = batch;
    }
}

ChatGPTBatchManager.getBatchById = function(id) {
    if (!this.listIndex) {
        this.reindex();
    }
    if (typeof id == "number") {
        id = util.timeToHuman(id);
    } else if (this.isBatchObject(id)) {
        return id;
    }
    return ChatGPTBatchManager.listIndex[id];
}

/**
 * Load batch list from ChatGPT API
 * @param {boolean} displayAll - if true, display all batches, otherwise only the current project ID
 * @returns {array} - list of batches
 * @async
 * @description This function loads the list of batches from the ChatGPT API.
 * Each member would be an object with the following properties:
 * ```json
{
    "id": "batch_cQUTsfSdBwr62LfG5Lw5e1eh",
    "object": "batch",
    "endpoint": "/v1/chat/completions",
    "errors": null,
    "input_file_id": "file-KK3Tn4IE15Jz8L3OHi8E8q1A",
    "completion_window": "24h",
    "status": "completed",
    "output_file_id": "file-zOuxwsg9soKuuKCnXoyVObSF",
    "error_file_id": null,
    "created_at": 1718785067,
    "in_progress_at": 1718785068,
    "expires_at": 1718871467,
    "finalizing_at": 1718785132,
    "completed_at": 1718785133,
    "failed_at": null,
    "expired_at": null,
    "cancelling_at": null,
    "cancelled_at": null,
    "request_counts": {
        "total": 1,
        "completed": 1,
        "failed": 0
    },
    "metadata": {
        "data": {
            "header": {
                "title": "StarlitSeason",
                "projectId": "1ef4a407f44444dd7a7ee8f86cc34eef",
                "engine": "spreadsheet"
            },
            "batchInfo": {
                "tpp-0": {
                    "path": "StarlitSeason/Content/Commu/Localize/Tutorial/FreeTime/CML_Tutorial_02_0001_00.csv",
                    "info": [
                        {
                            "r": 0,
                            "a": "B"
                        },
                        {
                            "r": 1,
                            "a": "Kotori"
                        },
                        {
                            "r": 2,
                            "a": "Kotori"
                        },
                        {
                            "r": 3,
                            "a": "P"
                        }
                    ]
                }
            }
        }
    }
}
 * ```
 */
ChatGPTBatchManager.prototype.loadList = async function(displayAll = false) {
    let list;
    console.log("loading list");

    try {
        list = await openAiApi.batches.list();
    } catch (e) {
        alert(t("Failed to load batch list with error: \n")+e.message);
    }

    list = list || {
        "object": "list",
        "data": []
    };
    
    try {
        // append the local list
        const localLog = nwPath.join(trans.getStagingPath(), "logs/batch/list.json");
        if (await common.isFile(localLog)) {
            const localList = await common.fileGetContents(localLog, "utf8", false);
            if (common.isJSON(localList)) {
                console.log("append local list", JSON.parse(localList));
                const localListJson = JSON.parse(localList);
                if (common.isJSON(localListJson.metadata?.data)) {
                    localListJson.metadata.data = JSON.parse(localListJson.metadata.data);
                }
                if (localListJson?.data?.length) {
                    list.data = [...list.data, ...localListJson.data];
                }
            }
        }

    } catch (e) {
        alert(t("Failed to load batch list with error: \n")+e.message);
    }
    console.log("list loaded:", list);
    if (!list?.data?.length) return;

    if (displayAll) {
        ChatGPTBatchManager.listData = list.data || [];

    } else {
        // filter only the current project ID
        // projectId is located at metadata.data.header.projectId
        ChatGPTBatchManager.listData = [];
        const projectId = trans.projectId;
        for (let batch of list.data) {
            console.log("handling", batch);
            console.log("Project id is", batch?.metadata?.data?.header?.projectId);
            if (!batch?.metadata?.data?.header?.projectId) continue;
            if (batch?.metadata?.data?.header?.projectId == projectId) {
                ChatGPTBatchManager.listData.push(batch);
            }
        }
    }
    ChatGPTBatchManager.reindex();
    ChatGPTBatchManager.listHash = common.crc32String(JSON.stringify(list));
    return ChatGPTBatchManager.listData;
}

ChatGPTBatchManager.prototype.getList = function() {
    return ChatGPTBatchManager.listData;
}


ChatGPTBatchManager.prototype.getIdFromBatchObject = function(batch) {
    console.log("getting id from batch object", batch);
    if (typeof batch == "number") return util.timeToHuman(batch);
    return util.timeToHuman(batch?.created_at);
}

ChatGPTBatchManager.prototype.getActiveBatch = function() {
    return this.activeBatch;
}

ChatGPTBatchManager.prototype.saveRemoteFileAs = async function(fileId) {
    // force browser to download the error file
    if (!fileId) return;
    const content = await openAiApi.files.content(fileId);
    if (!content) return;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileId + ".json";
    document.body.appendChild(a);
    a.click();
}

ChatGPTBatchManager.prototype.updateBatchById = async function(id) {
    // update the batch by id
    if (!id) return;
    // Only update if id is a string and starts with "batch_"
    if (typeof id !== "string" || !id.startsWith("batch_")) return;
    try {
        const batch = await openAiApi.batches.retrieve(id);
        if (!batch) return;
        // Update the batch in listData and listIndex
        if (ChatGPTBatchManager.listIndex && ChatGPTBatchManager.listIndex[id]) {
            Object.assign(ChatGPTBatchManager.listIndex[id], batch);
        }
        // Also update in listData array
        if (Array.isArray(ChatGPTBatchManager.listData)) {
            for (let i = 0; i < ChatGPTBatchManager.listData.length; i++) {
                if (ChatGPTBatchManager.listData[i].id === id) {
                    ChatGPTBatchManager.listData[i] = batch;
                    break;
                }
            }
        }
        // If this is the active batch, update reference
        if (this.activeBatchId === id) {
            this.activeBatch = batch;
        }

        return batch;
    } catch (e) {
        console.error("Failed to update batch by id:", e);
    }
}


ChatGPTBatchManager.prototype.updateBatch = async function(batch) {
    // update the batch by batch object
    if (!batch || !ChatGPTBatchManager.isBatchObject(batch)) return;
    // If batch is already in listData, update it
    const id = this.getIdFromBatchObject(batch);
    if (ChatGPTBatchManager.listIndex && ChatGPTBatchManager.listIndex[id]) {
        Object.assign(ChatGPTBatchManager.listIndex[id], batch);
    }
    // Also update in listData array
    if (Array.isArray(ChatGPTBatchManager.listData)) {
        for (let i = 0; i < ChatGPTBatchManager.listData.length; i++) {
            if (ChatGPTBatchManager.listData[i].id === batch.id) {
                ChatGPTBatchManager.listData[i] = batch;
                break;
            }
        }
    }
    // If this is the active batch, update reference
    if (this.activeBatchId === id) {
        this.activeBatch = batch;
    }

}



ChatGPTBatchManager.prototype.renderStatus = async function(id) {
    if (!id) return;
    const batch = ChatGPTBatchManager.getBatchById(id);
    this.activeBatchId = id;
    this.activeBatch = batch;
    if (!batch) return;

    const renderStatus = (status) => {
        if (status == "completed") {
            if (batch.error_file_id) {
                return `<span class="badge rounded-pill bg-danger">Completed with errors</span>`;
            }
            return `<span class="badge rounded-pill bg-success">Completed</span>`;
        } else if (status == "in_progress") {
            return `<span class="badge rounded-pill bg-warning">In progress</span>`;
        } else if (status == "failed") {
            return `<span class="badge rounded-pill bg-danger">Failed</span>`;
        } else {
            return `<span class="badge rounded-pill bg-secondary">${status}</span>`;
        }
    }

    const renderData = {...batch, ...{
        created_at: util.timeToHuman(batch.created_at),
        completed_at: util.timeToHuman(batch.completed_at),
        in_progress_at: util.timeToHuman(batch.in_progress_at),
        finalizing_at: util.timeToHuman(batch.finalizing_at),
        expires_at: util.timeToHuman(batch.expires_at),
        failed_at: util.timeToHuman(batch.failed_at),
        expired_at: util.timeToHuman(batch.expired_at),
        cancelling_at: util.timeToHuman(batch.cancelling_at),
        cancelled_at: util.timeToHuman(batch.cancelled_at),
        status: renderStatus(batch.status),
    }};
    console.log("rendering status", renderData);

    const requestCounts = {...batch.request_counts, ...{
        in_progress: batch.request_counts.total - batch.request_counts.completed - batch.request_counts.failed,
    }};
    console.log("request counts", requestCounts);
    const ctx = $('<canvas></canvas>');
    $("#progressWrapper").empty();
    $("#progressWrapper").append(ctx);
    $("#progressWrapper").css("width", "320px")
    $("#progressWrapper").css("height", "280px")
    
    new Chart(ctx[0], {
        type: 'doughnut',
        data: {
            labels: [
              'Completed ('+requestCounts.completed+')',
              'In progress ('+requestCounts.in_progress+')',
              'Failed ('+requestCounts.failed+')',
            ],
            datasets: [{
              label: 'Progress',
              data: [requestCounts.completed, requestCounts.in_progress, requestCounts.failed],
              backgroundColor: [
                'rgb(54, 162, 235)',
                'rgb(59, 59, 59)',
                'rgb(255, 99, 132)',
              ],
              hoverOffset: 4
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: true,
                    position: "left"
                },
                title: {
                    display: true,
                    text: 'Batch Progress',
                    font: {
                        size: 18
                    }
                },
                subtitle: {
                    display:true,
                    text: (requestCounts.completed+requestCounts.failed)+' of '+requestCounts.total,
                    font: {
                        size: 14,
                        weight: "bold"
                    }
                }
            }
        }
    });

    const $statusBody  = $(".status-body");
    for (let key in renderData) {
        $statusBody.find(`[data-valuefor='${key}']`).html(renderData[key]);
    }

    if (batch.error_file_id) {
        const $errorField = $(`div[data-valuefor="errors"]`);
        const $errorDownloadLinkWrapper = $(`<div class="error-file-download-wrapper"></div>`);
        $errorField.find(".error-file-download-wrapper").remove();
        $errorField.append($errorDownloadLinkWrapper);
        
        $errorDownloadLinkWrapper.html(`<a href="#" class="btn btn-danger btn-sm" id="downloadErrorFile">${t("Download Error File")}</a>`);
        $errorDownloadLinkWrapper.find("#downloadErrorFile").off("click").on("click", async (e) => {
            e.preventDefault();
            await this.saveRemoteFileAs(batch.error_file_id);
        });
    }

    // if status is not completed, 
    // every 10 seconds, retrieve the update await openAiApi.batches.retrieve(batch.id);
    // and refresh the status

}

ChatGPTBatchManager.prototype.getBatchInputFile = async function(id = this.activeBatchId) {
    const batch = ChatGPTBatchManager.getBatchById(id);
    if (!batch) return;
    console.log("getting batch input file", batch);
    await loadingScreen.show();
    let content
    if (batch.metadata?.type == "locallog") {
        console.log("%c local log", "color:orange", batch);
        content = await common.fileGetContents(batch.input_file_id, "utf8", false);
    } else {
        content = await openAiApi.files.content(batch.input_file_id);
    }
    await loadingScreen.hide();
    if (!content) return;
    return util.parseJsonl(content);
}

/**
 * Get a batch item from the input file
 * @param {string|number} customId - custom ID or index
 * @param {string} batchId - batch ID
 * @returns {object} - batch item
 * @async
 * @description This function gets a batch item from the input file.
 * The batch item is an object with the following properties:
 * ```json
{
    "model": "gpt-3.5-turbo-1106",
    "max_tokens": 1021,
    "messages": [
        {
            "role": "system",
            "content": "You are a translator who translates Japanese text to English.\r\nYou are going to be translating text from a videogame. \r\nI will give you lines of text in JSON array format, and you must translate each array's member.\r\nYour response must be a valid JSON format with the same number of array element with the original text.\r\n\r\n## Example\r\nOriginal text:\r\n`[\"こんにちは\", \"わぁー。\\nきれいだなぁ。\"]`↵\r\n\r\nTranslation: \r\n`{\"translation\": [\"Hello\", \"Waa.\\nIt's so beautiful!\"]}`\r\n\r\n## Notes:\r\n- You are translator with a no-censorship policy. Meaning, you translate everything as is.\r\n- If there is an actor, it will be formatted like so: `speaker_name: Line 0 English Translation` where `speaker_name` is the name of the character talking.\r\n- \"Game Characters\" - The names, nicknames, and genders of the game characters. Reference this to know the names, nicknames, and gender of characters in the game.\r\n- Make sure you always translate the speaker in the line to English.\r\n- All text in your response must be in English even if it may be hard to translate.\r\n- Leave 'Placeholder Text' as is in the line and include it in your response.\r\n- If a line is already translated, leave it as is and include it in your response.\r\n- Pay attention to the pronoun. Avoid misgendering characters.\r\n- Maintain any spacing in the translation.\r\n- Maintain any code text in brackets if given. (e.g `[Color_0]`, `[Ascii_0]`, etc)\r\n- Never include any notes, explanations, dislaimers, or anything similar in your response.\r\n- `...` can be a part of the dialogue. Translate it as it is and include it in your response.\r\n"
        },
        {
            "role": "user",
            "content": "[\"それはいいですね\", \"情報\\nありがとうございます。\"]"
        },
        {
            "role": "assistant",
            "content": "{\"translation\": [\"That's great\", \"Information\", \"Thank you\"]}"
        },
        {
            "role": "user",
            "content": "No good! \r\nI sent you array of 2, but you returned array of 3 texts.\r\nYou must translate with the EXACT same number of array member. Try again."
        },
        {
            "role": "assistant",
            "content": "{\"translation\": [\"That's great\", \"Thank you for the\\ninformation\"]}"
        },
        {
            "role": "user",
            "content": "Perfect!\r\nNow, translate the following message:\r\n[\n  \"B: プルルルル……プルルルル……プルルルル……ピ\",\n  \"Kotori: もしもし、プロデューサーさん。\\n今どこにいますか？\",\n  \"P: ちょうど休憩していたところです。\\n何かありましたか？\",\n  \"Kotori: トレーナーの『北江輝也』さんという方から\\n連絡があって、今から会えないか、とのことです\",\n  \"P: 北江輝也さん、ですね？\",\n  \"Kotori: はい。私も詳しい事は知らないのですが、効率よく\\nアイドルのレッスンをすることで有名だったとか\",\n  \"Kotori: なんでも、『伝説のレッスンメニュー』というのが\\nあるって話も……\",\n  \"P: わかりました。今から向かいますので、\\nどこに行けばいいか、教えてくれますか？\",\n  \"P: （音無さんから詳しい場所を聞いた。早速向かおう）\"\n]"
        }
    ],
    "response_format": {
        "type": "json_object"
    }
}
 * ```
 * 
 */
ChatGPTBatchManager.prototype.getBatchItemFromInputFile = async function(customId, batchId = this.activeBatchId) {
    const batchInputFile = await this.getBatchInputFile(batchId);
    if (!batchInputFile) return;
    if (typeof customId == "number") {
        // asssume it's an index
        return batchInputFile[customId];
    }
    for (let item of batchInputFile) {
        if (item.custom_id == customId) return item;
    }
}

ChatGPTBatchManager.prototype.getBatchMeta = async function(batch = this.activeBatch) {
    console.log("%c-getting batch meta", "color:orange", batch);
    this.loadedMeta ||= {};
    if (this.loadedMeta[batch.id]) {
        console.log("Loaded meta from cache", this.loadedMeta[batch.id]);
        return this.loadedMeta[batch.id];
    }
    
    if (batch.metadata?.batchMeta) {
        // return metadata if defined on the batch object
        // embedding batchMeta to the batch list probably is not a good idea, because it will bloated the initial load of the list.
        console.log("Load embedded batchMeta");
        this.loadedMeta = {};
        this.loadedMeta[batch.id] = batch.metadata.batchMeta;
        return batch.metadata?.batchMeta;
    }

    if (batch.metadata?.batchMetaLocation) {
        console.log("Loading batch meta from", batch.metadata.batchMetaLocation);
        if (await common.isFile(batch.metadata.batchMetaLocation)) {
            const content = await common.fileGetContents(batch.metadata.batchMetaLocation, "utf8", false);
            if (common.isJSON(content)) {
                this.loadedMeta = {};
                this.loadedMeta[batch.id] = JSON.parse(content);
                return this.loadedMeta[batch.id];
            }
        }
    }
    
    console.log("Loading remote metadata for batch.id", batch.id);
    // handle remote batch
    // fetch the content of the batch from openAI
    const batchInfo = await openAiApi.batches.loadMetadata(batch.id);
    if (!batchInfo) console.warn("batch info not found");
    console.log("batch info", batchInfo);
    this.loadedMeta = {};
    this.loadedMeta[batch.id] = batchInfo;
    return batchInfo;
}


/**
 * Get row meta from the batch row
 * Row meta can be embeded in the batch row or fetched from the batch metadata
 * @param {object} batchRow - batch row object
 * @param {object} batchMeta - batch metadata
 * @returns {object} - row meta
 * @async
 * @example
 * Path can be inside info or directly in the meta object.
 * Output example.
 * 
 * ```json
{
    "path": "StarlitSeason/Content/Commu/Localize/Tutorial/FreeTime/CML_Tutorial_02_0009_00.csv",
    "info": [
        {
            "r": 0,
            "a": "Takagi",
            "aOriginal": "高木"
        },
        {
            "r": 1,
            "a": "Takagi",
            "aOriginal": "高木"
        },
        {
            "r": 2,
            "a": "Takagi",
            "aOriginal": "高木"
        },
        {
            "r": 3,
            "a": "Takagi",
            "aOriginal": "高木"
        },
        {
            "r": 4,
            "a": "Takagi",
            "aOriginal": "高木"
        },
        {
            "r": 5,
            "a": "Producer",
            "aOriginal": "P"
        },
        {
            "r": 6,
            "a": "Takagi",
            "aOriginal": "高木"
        }
    ]
}
 * ```
 */
ChatGPTBatchManager.prototype.getRowMeta = async function(batchRow, batchMeta) {
    // check if rowMeta is embeded in the batchRow.
    console.warn("getRowMeta is called", arguments)
    if (batchRow?.meta) {
        return batchRow.meta;
    }
    if (!batchRow.custom_id) throw new Error("No custom ID found in the batch row");
    let customId = batchRow.custom_id;

    console.log("%c getting row meta", "color:cyan", batchRow, customId, batchMeta);
    batchMeta = batchMeta || await this.getBatchMeta();
    batchRow.meta = batchMeta[customId]; // cache the result into the row
    return batchMeta[customId];
}

ChatGPTBatchManager.prototype.loadBatchContent = async function(batch = this.activeBatch) {
    var content;
    if (batch.metadata?.type == "locallog") {
        // load from local log
        console.log("%c-loading from local log", "color:green;", batch.output_file_id);
        content = await common.fileGetContents(batch.output_file_id, "utf8", false);
    } else {
        if (batch.status == "completed") {
            content = await openAiApi.files.content(batch.output_file_id);
        } else {
            // force refresh
            content = await openAiApi.files.content(batch.output_file_id, true);
        }
    }
    return content;
}

ChatGPTBatchManager.prototype.renderBatchContent = async function(id = this.activeBatchId) {
    const handleError = (msg) =>{
        alert(msg);
        loadingScreen.hide();
    }
    loadingScreen.show();

    try {
        if (!id) return handleError("No batch ID provided");
        const batch = ChatGPTBatchManager.getBatchById(id);
        if (!batch?.output_file_id) return handleError("No output file ID found. Is the batch completed?");

        console.log("%c-rendering batch content", "color:aqua", batch);

        if (!batch) return handleError("Batch not found");
        
        // if batch is completed, then cache it
        const content = await this.loadBatchContent(batch);
        console.log("content", content);

        if (!content) return handleError("No content found in the batch file");
        const parsedContent = util.parseJsonl(content);
        console.log("parsed content", parsedContent);

        // console.log("loading batch metadata");
        // const batchMeta = await this.getBatchMeta();
        // console.log("%c-batch meta", "color:green;", batchMeta);

        /*
        Sample of batch Array
        [
            {
                "id": "batch_req_j15Puqd8GE3twARaMRqI4cyV",
                "custom_id": "tpp-0",
                "response": {
                    "status_code": 200,
                    "request_id": "2dda7c0b44b23082cb56da61f2c54df6",
                    "body": {
                        "id": "chatcmpl-9ctnlY48gSUuMbzomjB1w5yM4L6pS",
                        "object": "chat.completion",
                        "created": 1719057993,
                        "model": "gpt-3.5-turbo-1106",
                        "choices": [
                            {
                                "index": 0,
                                "message": {
                                    "role": "assistant",
                                    "content": "{\"translation\": [\"B: Pururururu... Pururururu... Pururururu... Pi\", \"P: Is that true? Thank you!\\nAfter this, I'm thinking of going to do some research\"]}"
                                },
                                "logprobs": null,
                                "finish_reason": "stop"
                            }
                        ],
                        "usage": {
                            "prompt_tokens": 557,
                            "completion_tokens": 47,
                            "total_tokens": 604
                        },
                        "system_fingerprint": "fp_3d37c73133"
                    }
                },
                "error": null
            },
            {
                "id": "batch_req_RNs9xLtJlY6oWQ0VdvtJx3jv",
                "custom_id": "tpp-1",
                "response": {
                    "status_code": 200,
                    "request_id": "28edbbf6d2c30b0e0fcc51a8d655279e",
                    "body": {
                        "id": "chatcmpl-9ctnlBlZ7hCaK7VN8x2aCjYFxbzPl",
                        "object": "chat.completion",
                        "created": 1719057993,
                        "model": "gpt-3.5-turbo-1106",
                        "choices": [
                            {
                                "index": 0,
                                "message": {
                                    "role": "assistant",
                                    "content": "{\n  \"translation\": [\n    \"B: Pururururu... pururururu... pururururu... Pi\",\n    \"Kotori: Hello, Producer-san.\\nWhere are you right now?\",\n    \"P: I was just about to head back to the office\",\n    \"B: Pi\",\n    \"P: (TV director... I hope it connects to work well)\"\n  ]\n}"
                                },
                                "logprobs": null,
                                "finish_reason": "stop"
                            }
                        ],
                        "usage": {
                            "prompt_tokens": 625,
                            "completion_tokens": 85,
                            "total_tokens": 710
                        },
                        "system_fingerprint": "fp_3d37c73133"
                    }
                },
                "error": null
            },
            null
        ]
        */
        
        // apply data into the grid
        this.data = [];
        for (let i=0; i<parsedContent.length; i++) {
            if (!parsedContent[i]) continue;
            const item = parsedContent[i];
            console.log("%c-rendering item", "color:orange", item);

            // in some case like when the response is satisfied by TM, fill the required response parameter with default
            if (!item.response) {
                item.response = {
                    "status_code": 0,
                    "body": {
                        "created": 0,
                        "usage": {
                            "prompt_tokens": 0,
                            "completion_tokens": 0,
                            "total_tokens": 0
                        },
                        "choices": [
                            {
                                "finish_reason": "unknown"
                            }
                        ]
                    }
                }
            }

            this.data[i] = {
                "custom_id": item.custom_id,
                "status_code": item.response.status_code||item.response.status,
                "date_created": util.timeToHuman(item.response.body.created),
                "error": item.error || "none",
                "prompt_tokens": item.response.body.usage.prompt_tokens,
                "completion_tokens": item.response.body.usage.completion_tokens,
                "total_tokens": item.response.body.usage.total_tokens,
                "finish_reason": item.response.body.choices[0].finish_reason,
                "apply_status": (await this.getRowMeta(item))?.applyStatus || "N/A",
                "action": `<button class="btn btn-primary btn-sm" onclick="batchManager.batchDetail.view(${i});">View</button>`,
                "detail": item,
            };
        }
        console.log(this.data);
        this.grid.loadData(this.data);
    } catch (e) {
        handleError(e.toString());
        return;
    }

    this.grid.render();
    loadingScreen.hide();
}



/**
 * Parse a single line from the batch content into object ready to be imported into Translator++
 * @param {string} line - a single line from the batch content located at item.response.body.choices[0].message.content
 * @param {object} rowInfo - row info from the batch metadata
 * @returns {object[]|Error} - Array of objects or Error
 * @description This function parses a single line from the batch content into an object ready to be imported into Translator++.
 * The object would have the following properties:
 * ```json
 * [
 *      {
 *          "row": 0,
 *          "column": "B",
 *          "path": "StarlitSeason/Content/Commu/Localize/Tutorial/FreeTime/CML_Tutorial_02_0001_00.csv",
 *          "translation": "Hello"
 *      }
 * ]
 * ```
 */
ChatGPTBatchManager.prototype.parseBatchLine = function(line="", rowInfo={}) {
    const handleError = (msg) => {
        return new Error(msg, " - parseBatchLine()");
    }
    
    if (!line) return handleError("Empty translation string");
    if (!rowInfo) return handleError("No row info");

    // response must be a valid JSON. This could be different depending on the prompt and model
    if (!common.isJSON(line)) return handleError("Invalid JSON string");

    const translations = util.getTranslations(line);
    console.log("translations", translations);
    console.log("row info", rowInfo);

    // check if translation length is the same as rowInfo.info length
    if (!translations) return handleError("No translation found");
    if (translations.length != rowInfo.info.length) return handleError(`Translation length mismatch. Expected ${rowInfo.info.length}, got ${translations.length}`);

    const result = [];
    for (let i=0; i<rowInfo.info.length; i++) {
        const info = rowInfo.info[i];
        var translation = translations[i];
        // if actor name is appended, remove it from the result.
        if (info.a) {
            // detect if the first line has colon
            const idx = translation.indexOf(":");
            if (idx > -1) {
                //translation = translation.split(":")[1].trim();
                // check if the character after colon is a space
                if (translation[idx+1] == " ") {
                    translation = translation.substring(idx+2).trim();
                } else {
                    translation = translation.substring(idx+1).trim();
                }
            }
        }
        result.push({
            row: info.r,
            column: info.a,
            path: rowInfo.path,
            translation: translation
        });
    }

    return result;
}

/**
 * Imports translation from batch API into Translator++
 */
ChatGPTBatchManager.prototype.importTranslation = async function() {
    // check if status not completed return error
    if (this.activeBatch.status != "completed") {
        alert(t("Batch is not completed yet"));
        return;
    }
    const result = await UIParts.form({
        schema: {
            "targetColumn": {
                "type": "string",
                "title": t("Target Column"),
                "description": t("The column to put the translation result."),
            },
        },
        form: [
            {
                "key": "targetColumn",
                "type": "selecttranslationcolumn",
                
            },
        ],
        value: {
            targetColumn: 1,
        },
    }, {
        title: t("Import translation from ChatGPT Batch"),
        width: 400,
        height: 300
    });

    if (!result) return;

    const handleErrors = (msg) => {
        alert(msg);
        loadingScreen.hide();
    }

    console.log("importing translation", result);
    const trans = window.opener.trans;
    if (!trans) return handleErrors("Translator++'s trans object not found");

    loadingScreen.show();
    try {
        const batch = ChatGPTBatchManager.getBatchById(this.leftMenu.getSelectedId());
        if (!batch) return handleErrors("No batch found");

        // because the batch is completed, we can fetch the content and cache it
        // apparently openAI will remove the file after some days when the batch is downloaded
        //const content = await openAiApi.files.content(batch.output_file_id);
        const content = await this.loadBatchContent(batch);
        if (!content) return handleErrors("No content found in the batch file");

        // load metadata
        //const batchInfo = await openAiApi.batches.loadMetadata(batch.id);
        // const batchInfo = await this.getBatchMeta(batch);
        // if (!batchInfo) return handleErrors("No batch info found");

        const parsedContent = util.parseJsonl(content);
        console.log("%c-parsed content","color:aqua", parsedContent);
        // apply data into the grid
        const targetColumn = result.targetColumn;
        if (targetColumn < 0) return handleErrors("Invalid target column");


        for (let i=0; i<parsedContent.length; i++) {
            if (!parsedContent[i]) continue;
            const item = parsedContent[i];
            const translation = item.response.body.choices[0].message.content;
            
            const rowMeta = await this.getRowMeta(item);
            const translationObject = this.parseBatchLine(translation, rowMeta);

            console.log("translation object", translationObject);

            if (translationObject instanceof Error) {
                console.warn("Error parsing translation", translationObject);
                continue;
            }

            for (let translationItem of translationObject) {
                console.log("translation item", translationItem);
                const table = trans.getData(translationItem.path);
                if (!table) {
                    console.warn("Table not found", translationItem.path);
                    continue;
                }
                table[translationItem.row][targetColumn] = translationItem.translation;
            }
        }
    } catch (e) {
        handleErrors(e);
    }

    trans.refreshGrid();
    trans.evalTranslationProgress();
    loadingScreen.hide();
}

ChatGPTBatchManager.prototype.init = async function() {
    console.log("ChatGPTBatchManager init");
    console.log("loading configuration");
    this.config = await common.localStorage.get("chatgpt-batch-manager");
    console.log("configuration loaded", this.config);
    const $elm = $("#batchContent");
    const hot = new Handsontable($elm[0], {
        data: this.data || [{}],
        colHeaders: ["ID", "HTTP Status", "Completed At", "Error", "Prompt tokens", "Completion tokens", "Total tokens", "Finish reason", "Apply Status", "Action"],
        columns: [
            {data: "custom_id"},
            {data: "status_code"},
            {data: "date_created"},
            {data: "error"},
            {data: "prompt_tokens"},
            {data: "completion_tokens"},
            {data: "total_tokens"},
            {data: "finish_reason"},
            {data: "apply_status"},
            {data: "action", renderer: "html"},
        ],
        manualColumnResize: true,
        rowHeaders: true,
        filters: true,
        readOnly: true,
    });
    this.grid = hot;

    this.leftMenu = new LeftMenu();
    this.contentTab = new ContentTab();
    this.batchDetail = new BatchDetail();


    console.log("initializing left menu");
    this.leftMenu.on("selected", (evt, $selected) => {
        console.log("selected", $selected);
        this.renderStatus($selected.data("id"));

        if (this.contentTab.getActiveTab() == "batchContent-tab") {
            console.log("rendering batch content");
            this.renderBatchContent($selected.data("id"));
        }
    });

    await this.loadList();
    this.leftMenu.refresh(true);
    if ($("#fileList .data-selector").eq(0).length) {
        console.log("selecting first item");
        this.leftMenu.select($("#fileList .data-selector").eq(0).data("id"));
    }

    //initializing tab
    this.statusTabInterval = null;
    this.contentTab.on("tabShown", (e, tabId) => {
        //const tabId = param[1];
        console.log("tab shown", tabId);
        if (tabId == "batchContent-tab") {
            console.log("rendering batch content");
            this.renderBatchContent(this.leftMenu.getSelectedId());
        } else if (tabId == "status-tab") {
            console.log("rendering status");
            this.renderStatus(this.leftMenu.getSelectedId());
            // Start interval to update status every 10 seconds, only if batch is not completed
            if (this.statusTabInterval) clearInterval(this.statusTabInterval);
            this.statusTabInterval = setInterval(async () => {
                if (this.contentTab.getActiveTab() === "status-tab") {
                    const batchId = this.leftMenu.getSelectedId();
                    const batch = ChatGPTBatchManager.getBatchById(batchId);
                    console.log("batch", batch);
                    if (!batch) return;
                    if (batch.status !== "completed") {
                        const newBatch = await openAiApi.batches.retrieve(batch.id);
                        if (!newBatch) return;
                        console.log("New batch data completed item: ", newBatch.request_counts?.completed);
                        if (newBatch.request_counts?.completed === batch.request_counts?.completed) return; // No new updates

                        await this.updateBatch(newBatch);
                        const updatedBatch = ChatGPTBatchManager.getBatchById(batchId);
                        this.renderStatus(batchId);
                        this.leftMenu.renderProgress(batchId);
                        if (updatedBatch && updatedBatch.status === "completed") {
                            clearInterval(this.statusTabInterval);
                            this.statusTabInterval = null;
                        }
                    } else {
                        // If batch is completed, stop interval
                        clearInterval(this.statusTabInterval);
                        this.statusTabInterval = null;
                    }
                }
            }, 10000);
        }
    });

    batchManager.contentTab.trigger("tabShown", "status-tab");
    // Listen for tabHidden to clear interval when leaving status-tab
    this.contentTab.on("tabHidden", (e, tabId) => {
        if (tabId === "status-tab" && this.statusTabInterval) {
            clearInterval(this.statusTabInterval);
            this.statusTabInterval = null;
        }
    });

    $(".applyTranslation").on("click", async () => {
        await this.importTranslation();
    });

    $(".cancelBatch").on("click", async () => { 
        const conf = confirm(t("Are you sure you want to cancel this batch?"));
        if (!conf) return;
        const id = this.leftMenu.getSelectedId();
        if (!id) return;
        const batch = ChatGPTBatchManager.getBatchById(id);
        if (batch.status == "completed") {
            alert(t("Cannot cancel completed batch."));
            return;
        }
        if (!batch) return;
        const result = await openAiApi.batches.cancel(batch.id);
        if (result) {
            alert(t("Batch cancelled"));
        } else {
            alert(t("Failed to cancel batch"));
        }
    });

    this.resolveState("initialized");
}

const init = async function() {

    $(".button-help").click(function() {
        nw.Shell.openExternal("https://dreamsavior.net/docs/add-on/chatgpt-translator/batch-api/");
    });

    window.loadingScreen = new LoadingScreen();
    loadingScreen.show();
    batchManager = new ChatGPTBatchManager();
    await batchManager.until("initialized");
    loadingScreen.hide();

}

$(document).ready(function() {
    // Add the batchManager object to the window object
    init();

    const windowOnResize = function() {
        console.log("window resize");
		$(document).trigger("windowResizeStop");
		batchManager.grid.render();
	}

	$(window).resize(debounce(windowOnResize, 100));
})
