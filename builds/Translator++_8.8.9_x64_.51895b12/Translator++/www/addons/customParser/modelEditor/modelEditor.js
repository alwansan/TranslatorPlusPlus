const { toHankakuSpace } = require("encoding-japanese");
const CustomParser = require('www/addons/customParser/CustomParser.js');
const trans = window.opener.trans;
var nwPath = require("path");
const BLS = require("better-localstorage");
const CustomFields = require("www/js/CustomFields.js");


const win = nw.Window.get();
win.restore(); // restore if minimized
win.show(); // show if hidden
win.setResizable(true);

var loadingScreen;
var modelEditor;

win.on('close', function() {
    var conf = confirm(t("Do you want to close Model editor?\rAll unsaved changes will be discarded."))
    if(!conf) return;

    (async ()=> {
        // Hide the window to give user the feeling of closing immediately
        this.hide();
        if (nw.process.versions["nw-flavor"] == "sdk") {
            win.closeDevTools();
            await common.wait(200);
        }
    
        /**
         * Triggered when option window is closed
         * @event ui#optionsWindowClosed
         * @since 4.5.1
         */
        window.opener.ui.trigger("modelEditorWindowClosed");
        //if (typeof window.opener.ui.windows.options !== 'undefined') window.opener.ui.windows.options = undefined;
    
        this.close(true);
    })()
});

if (win.y < 0) win.y = 0;
if (win.x < 0) win.x = 0;
//win.setResizable(false);
setTimeout(()=>{
	if (win.y < 0) win.y = 0;
	win.setMinimumSize(800, 600)
}, 200);

/**
 * @param  {Object} rootElm - JQuery instance of node as the root element or wrapper of the tabs
 * @param  {Object} options - Object of options
 * @class
 */

const SubTab = function(rootElm, options) {
    this.$elm               = rootElm;
    options                 = options || {};
    this.initialSelection   = options.initialSelection || 0;
    this.init();
}
SubTab.prototype.on = function(evt, fn) {
    this.$elm.on(evt, fn)
}
SubTab.prototype.off = function(evt, fn) {
    this.$elm.off(evt, fn)
}
SubTab.prototype.one = function(evt, fn) {
    this.$elm.one(evt, fn)
}
SubTab.prototype.trigger = function(evt, param) {
    this.$elm.trigger(evt, param)
}

SubTab.prototype.getActiveSubTab = function($rootElm) {
    $rootElm = $rootElm || this.$elm;
    return $rootElm.find(".active[data-tabid]").attr('data-tabid');
}

SubTab.prototype.select = function($tab, trigger) {
    var $rootElm = this.$elm;
    if (typeof $tab == "number") {
        $tab = $rootElm.find("[data-targettab]").eq($tab);
    } else if (typeof $tab == "string") {
        $tab = $rootElm.find(`[data-targettab="${CSS.escape($tab)}"]`);
    }
    var targetId = $tab.attr('data-targettab');
    if (trigger) {
        this.trigger("beforeSubTabChange", {
            targetId    : targetId,
            targetElm   : $rootElm.find(`[data-tabid="${targetId}"]`)
        });
    }
    
    $rootElm.find("[data-targettab]").removeClass("active");
    $rootElm.find("[data-tabid]").removeClass("active");
    $rootElm.find("[data-tabid]").addClass("hidden");
    $rootElm.find(`[data-tabid="${targetId}"]`).addClass("active");
    $rootElm.find(`[data-tabid="${targetId}"]`).removeClass("hidden");
    $tab.addClass("active");
    if (trigger) {
        this.trigger("afterSubTabChange", {
            targetId    : targetId,
            targetElm   : $rootElm.find(`[data-tabid="${targetId}"]`)
        });
    }
}

SubTab.prototype.init = function($rootElm) {
    var that = this;
    $rootElm = $rootElm || this.$elm;
    $rootElm.find("[data-targettab]").each(function() {
        var $this = $(this);
        if ($this.hasClass("tabInitialized")) return;
        $this.addClass("tabInitialized");
        $this.on("click", function() {
            var $tab = $(this);
            that.select($tab, true);
        });
    });
    this.select(this.initialSelection, false);
    $rootElm.addClass("subTabInitialized");
}


const ModelEditor = function(file, options) {
    this.file   = file;
    this.hasChange = false;
    this.option = options || {};
    this.$elm   = $("body");
    this.debugLevel = nw.App.manifest.debugLevel;
    this.activeFile = {
        options:{},
        modelInfo:{}
    };
    this.localStorage = new BLS("customParser.modelEditor");
    this.maxHistoryOpenedFile = 20;

}

ModelEditor.prototype.on = function(evt, fn) {
    this.$elm.on(evt, fn)
}
ModelEditor.prototype.off = function(evt, fn) {
    this.$elm.off(evt, fn)
}
ModelEditor.prototype.one = function(evt, fn) {
    this.$elm.one(evt, fn)
}
ModelEditor.prototype.trigger = function(evt, param) {
    this.$elm.trigger(evt, param)
}

ModelEditor.prototype.getModelInfo = function() {
    this.activeFile ||= {};
    this.activeFile.modelInfo ||= {};
    return this.activeFile.modelInfo;
}

ModelEditor.prototype.setModelInfo = function(modelInfo = {}) {
    this.activeFile ||= {};
    this.activeFile.modelInfo = {
        name: modelInfo.name || "",
        version: modelInfo.version || "",
        author: modelInfo.author || modelInfo.createdBy || "",
        contact: modelInfo.contact || "",
        info: modelInfo.info || ""
    };
    this.hasChange = true;
    return this.activeFile.modelInfo;
}

ModelEditor.prototype.sanitizeModelInfoHtml = function(html = "") {
    const parser = new DOMParser();
    const documentRoot = parser.parseFromString(`<div>${html}</div>`, "text/html");
    const root = documentRoot.body.firstElementChild || documentRoot.body;
    const blockedTags = new Set(["script", "iframe", "object", "embed", "frame", "frameset", "meta", "link", "base"]);
    const allowedTags = new Set(["a", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "li", "ol", "p", "pre", "s", "span", "strong", "sub", "sup", "u", "ul"]);
    const allowedAttrs = {
        a: new Set(["href", "title", "target", "rel"]),
        img: new Set(["src", "alt", "title"])
    };

    const sanitizeUrl = (value, tagName, attrName) => {
        if (!value) return "";
        const normalized = value.trim();
        const lowered = normalized.toLowerCase();
        if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:text/html")) {
            return "";
        }
        if (tagName === "img" && attrName === "src") {
            if (
                lowered.startsWith("data:image/") ||
                lowered.startsWith("http://") ||
                lowered.startsWith("https://") ||
                lowered.startsWith("/") ||
                lowered.startsWith("./") ||
                lowered.startsWith("../")
            ) {
                return normalized;
            }
            return "";
        }
        if (tagName === "a" && attrName === "href") {
            if (
                lowered.startsWith("http://") ||
                lowered.startsWith("https://") ||
                lowered.startsWith("mailto:") ||
                lowered.startsWith("/") ||
                lowered.startsWith("./") ||
                lowered.startsWith("../") ||
                lowered.startsWith("#")
            ) {
                return normalized;
            }
            return "";
        }
        return normalized;
    }

    const unwrapNode = (node) => {
        const parent = node.parentNode;
        if (!parent) return;
        while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
        }
        parent.removeChild(node);
    }

    const walk = (node) => {
        for (const child of Array.from(node.childNodes)) {
            if (child.nodeType !== Node.ELEMENT_NODE) continue;
            const tagName = child.tagName.toLowerCase();

            if (blockedTags.has(tagName)) {
                child.remove();
                continue;
            }

            if (!allowedTags.has(tagName)) {
                unwrapNode(child);
                continue;
            }

            for (const attr of Array.from(child.attributes)) {
                const attrName = attr.name.toLowerCase();
                const allowed = allowedAttrs[tagName];
                if (attrName.startsWith("on") || attrName === "style" || !allowed?.has(attrName)) {
                    child.removeAttribute(attr.name);
                    continue;
                }

                const sanitizedValue = sanitizeUrl(attr.value, tagName, attrName);
                if (!sanitizedValue) {
                    child.removeAttribute(attr.name);
                    continue;
                }
                child.setAttribute(attr.name, sanitizedValue);
            }

            if (tagName === "a") {
                child.setAttribute("rel", "noopener noreferrer nofollow");
                if (child.getAttribute("target") === "_blank") {
                    child.setAttribute("target", "_blank");
                } else {
                    child.removeAttribute("target");
                }
            }

            walk(child);
        }
    }

    walk(root);
    return root.innerHTML;
}

ModelEditor.prototype.insertHtmlAtCursor = function(html) {
    if (!html) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        document.execCommand("insertHTML", false, html);
        return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = range.createContextualFragment(html);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

ModelEditor.prototype.initModelInfoDialog = function() {
    if (this.$modelInfoDialog) return this.$modelInfoDialog;

    const $dialog = $("#modelInfoDialog");
    const $infoEditor = $dialog.find(".modelInfoEditor");
    const readClipboardHtml = (clipboardData) => {
        if (!clipboardData) return "";
        if (clipboardData.getData) {
            return clipboardData.getData("text/html") || "";
        }
        return "";
    }

    $infoEditor.on("paste", async (event) => {
        const originalEvent = event.originalEvent || event;
        const clipboardData = originalEvent.clipboardData;
        if (!clipboardData) return;

        const items = Array.from(clipboardData.items || []);
        const imageItem = items.find((item) => item.type && item.type.startsWith("image/"));
        if (imageItem) {
            event.preventDefault();
            const blob = imageItem.getAsFile();
            if (!blob) return;
            const reader = new FileReader();
            reader.onload = () => {
                this.insertHtmlAtCursor(`<img src="${reader.result}" alt="Pasted image" />`);
            };
            reader.readAsDataURL(blob);
            return;
        }

        const html = readClipboardHtml(clipboardData);
        const text = clipboardData.getData ? (clipboardData.getData("text/plain") || "") : "";
        if (!html && !text) return;

        event.preventDefault();
        const safeHtml = html ? this.sanitizeModelInfoHtml(html) : "";
        if (safeHtml) {
            this.insertHtmlAtCursor(safeHtml);
            return;
        }
        this.insertHtmlAtCursor((text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\r?\n/g, "<br>"));
    });

    this.$modelInfoDialog = $dialog.removeClass("hidden").dialog({
        autoOpen: false,
        modal: true,
        width: 720,
        resizable: true,
        buttons: [
            {
                text: t("Save"),
                click: () => {
                    const name = $dialog.find(".modelInfoName").val() || "";
                    const version = $dialog.find(".modelInfoVersion").val() || "";
                    const author = $dialog.find(".modelInfoAuthor").val() || "";
                    const contact = $dialog.find(".modelInfoContact").val() || "";
                    const info = this.sanitizeModelInfoHtml($infoEditor.html() || "");
                    this.setModelInfo({name, version, author, contact, info});
                    $infoEditor.html(info);
                    this.$modelInfoDialog.dialog("close");
                }
            },
            {
                text: t("Cancel"),
                click: () => {
                    this.$modelInfoDialog.dialog("close");
                }
            }
        ]
    });

    return this.$modelInfoDialog;
}

ModelEditor.prototype.openModelInfoDialog = function() {
    const $dialog = this.initModelInfoDialog();
    const modelInfo = this.getModelInfo();
    $dialog.find(".modelInfoName").val(modelInfo.name || "");
    $dialog.find(".modelInfoVersion").val(modelInfo.version || "");
    $dialog.find(".modelInfoAuthor").val(modelInfo.author || modelInfo.createdBy || "");
    $dialog.find(".modelInfoContact").val(modelInfo.contact || "");
    $dialog.find(".modelInfoEditor").html(this.sanitizeModelInfoHtml(modelInfo.info || ""));
    $dialog.dialog("open");
}

ModelEditor.prototype.delete = function($li) {
    if ($li.is(this.$selected)) {
        var $rightPane = $("#rightPane")
        $rightPane.empty();
    }
    $li.remove();
    this.redrawRuleId();
    this.hasChange = true;

    if ($("#leftPane .selectable").length == 0) this.addRule();
}


ModelEditor.prototype.addRule = function($li, defaultValue) {
    if (this.debugLevel) console.log("addingRule", arguments);
    var $rule = this.$ruleTemplate.clone(true, true);
    if (!$li) {
        $("#leftPane .sortable").append($rule);
    } else {
        $li.after($rule);
    }
    
    if (defaultValue) {
        $rule.data("rule", defaultValue);
        this.drawRuleSelectorType($rule);
    }

    this.redrawRuleId();
    this.hasChange = true;
    return $rule;
}

ModelEditor.prototype.clearRules = function() {
    var $rightPane = $("#rightPane")
    $rightPane.empty();
    $("#leftPane .sortable").empty();
}

ModelEditor.prototype.resetRules = function() {
    if (this.debugLevel) console.log("reset rule");
    this.clearRules();
    this.addRule();
    this.selectRule(0);
}

ModelEditor.prototype.redrawRuleId = function() {
    var $pattern = $(".pattern");
    $pattern.each(function(index) {
        $(this).find(".patternId").text(index);
    })
}

ModelEditor.prototype.getSelectedRule = function() {
    if (empty(this.$selected.data("rule"))) this.$selected.data("rule", {})
    return this.$selected.data("rule");
}

ModelEditor.prototype.setRuleValue = function(key, value, rule) {
    rule = rule || this.$selected.data("rule") || {};
    rule[key] = value;
    this.hasChange = true;
    //this.$selected.data("rule", this.selectedRule)
}


ModelEditor.prototype.loadRules = function(value) {
    console.log("loading rules :", value);
    if (empty(value)) return this.resetRules();

    this.clearRules();
    for (var i in value) {
        this.addRule(undefined, value[i]);
    }
}



ModelEditor.prototype.applyChange = function() {
    if (!this.$activeFileGroup) return;
    if (this.$activeFileGroup.length == 0) return;
    //console.log("applying rules to FileGroup at ", this.$activeFileGroup);
    //this.$activeFileGroup.data("fileData", this.dumpPatterns());
    this.applyFileGroupData("rules", this.dumpPatterns());
    this.hasChange = true;
}

ModelEditor.prototype.getRuleData = function($elm) {
    $elm = $elm || $("#rules .selectable.selected");
    if (empty($elm.data("rule"))) $elm.data("rule", {})
    return $elm.data("rule");
}

ModelEditor.prototype.getInnermostRuleData = function($elm) {
    var rootRule = this.getRuleData($elm);
    var getRule = (rule)=> {
        rule = rule || {};
        if (rule.action == "innerRule") {
            return getRule(rule.innerRule);
        }
        return rule;
    }
    return getRule(rootRule);
}

ModelEditor.prototype.drawRuleSelectorType = function($elm) {
    $elm = $elm || $("#rules .selectable.selected");
    var rule = this.getInnermostRuleData($elm);
    $elm.attr("rule-type", "");
    try {
        $elm.attr("rule-type", rule.type);
        if (!rule.action) return;
        if (rule.action == "mask")  {
            $elm.attr("rule-type", "mask");
        } else if (rule.action == "captureMask") {
            $elm.attr("rule-type", "mask");
        }
    } catch (e) {
        // do nothing
    }
}

ModelEditor.prototype.drawSelected = function() {
    var rule    = this.getSelectedRule();
    var modelEditor = this;

    var drawBreadCrumb = ($elm, path) => {
        var activeRule  = rule;
        var thisPath    = [];
        var $template;
        for (var i=0; i<path.length; i++) {
            thisPath.push(path[i]);
            if (i == 0) {
                $template = $(`<span class="breadCrumbNavigator"><i class="separator icon-home"></i>Root Rule</span>`)
            } else {
                activeRule = activeRule[path[i]];
                $elm.append(`<i class="separator icon-angle-double-right"></i>`);
                $template = $(`<span class="breadCrumbNavigator">${path[i]}</span>`)
            }

            if (i == path.length-1) {
                $template.addClass("active");
            } else {
                (()=>{
                    var currentActiveRule = activeRule;
                    var pathCopy = common.clone(thisPath);
                    $template.on("click", ()=>{
                        console.log("thisPath:", pathCopy);
                        console.log("currentActiveRole", currentActiveRule);
                        drawForm(currentActiveRule, pathCopy);
                    })
                })()
            }
            $elm.append($template);
        }
    }



    var drawForm = (selectedRule, path = []) => {
        var $rightPane = $("#rightPane")
        $rightPane.empty();
    
        var $template   = $("#template .editorRegexWrapper").clone(true, true);       
        var that        = this;
        var switchType  = (theType) => {
            $template.find(`[data-field="type"]`).val(theType);
            $template.find(`[data-fieldGroup]`).addClass("hidden");
            $template.find(`[data-fieldGroup="${theType}"]`).removeClass("hidden");
            $template.find(`[data-fieldGroup="${theType}"]`).addClass("active");
            $template.find(".typeSelection").addClass("hidden");

            var editor;
            if (theType == "function") {
                // activate ACE for JS Function field
                editor = ace.edit($template.find(".functionEditor")[0]);
                editor.setTheme("ace/theme/monokai");
                editor.session.setMode("ace/mode/javascript");
                editor.setShowPrintMargin(false);
                editor.setOptions({
                    fontSize: "12pt"
                  });
                editor.on("blur", ()=> {
                    that.setRuleValue("function", editor.getValue(), selectedRule);
                });
                editor.setValue(selectedRule.function || "");
            } else {
                editor = ace.edit($template.find(`[data-field="pattern"]`)[0]);
                editor.setTheme("ace/theme/monokai");
                editor.session.setMode("ace/mode/javascript");
                editor.setShowPrintMargin(false);
                editor.renderer.setShowGutter(false);
                editor.setOptions({
                    fontSize: "12pt"
                });
                editor.on("change", ()=> {
                    that.setRuleValue("pattern", editor.getValue(), selectedRule);
                });
                editor.setValue(selectedRule.pattern || "");
            }
            modelEditor.drawRuleSelectorType();
        }

        drawBreadCrumb($template.find(".breadCrumb .path"), path);

        if (selectedRule.type) {
            switchType(selectedRule.type);
        }

        $template.find("a.externalLink, a[external]").on("click", function(e) {
            e.preventDefault();
            nw.Shell.openExternal($(this).attr("href"));
        });

        $template.find('.typeSelectorFld').on("click", function() {
            var thisValue =  $(this).attr("value")
            that.setRuleValue("type", thisValue, selectedRule);
            switchType(thisValue);
        });

        $template.find('[data-field="pattern"]').on("input", function() {
            that.setRuleValue("pattern", $(this).val(), selectedRule);
        });
        $template.find('[data-field="captureGroups"]').on("input", function() {
            that.setRuleValue("captureGroups", $(this).val(), selectedRule);
        });

        // Save changes to rowInfoGroup when the field is edited
        $template.find('[data-field="captureRowInfo"]').on("input", function() {
            that.setRuleValue("captureRowInfo", $(this).val(), selectedRule);
        });

        $template.find('[data-field="contextTemplate"]').on("input", function() {
            that.setRuleValue("contextTemplate", $(this).val(), selectedRule);
        });

        $template.find('[data-field="action"]').on("input", function() {
            var $this = $(this);
            $this.closest(".form-group").find(".innerRuleWrapper").addClass("hidden")
    
            that.setRuleValue("action", $this.val(), selectedRule);
            if ($this.val() == "innerRule") {
                $this.closest(".form-group").find(".innerRuleWrapper").removeClass("hidden");
            }
            that.drawRuleSelectorType();
        });

        $template.find('[data-field="function"]').on("input", function() {
            that.setRuleValue("function", $(this).val(), selectedRule);
        });
    
        $template.find('.innerRule').on("click", () => {
            selectedRule.innerRule = selectedRule.innerRule || {};
            drawForm(selectedRule.innerRule, path.concat(["innerRule"]));
        })

        console.log("selected rule:", selectedRule);
        for (var i in selectedRule) {
            if (!i) continue;
            if (!selectedRule[i]) continue;
            $template.find(`[data-field="${i}"]`).val(selectedRule[i]);
        }

        if (selectedRule.action == "innerRule") {
            $template.find(".innerRuleWrapper").removeClass("hidden");
        }
    
        $rightPane.append($template);
    }
    drawForm(rule, ["rule"]);
}

ModelEditor.prototype.selectRule = function($li, doNotApply) {
    if (typeof $li == "number") $li = $("#leftPane .selectable").eq($li);
    if (!doNotApply) this.applyChange();
    console.log("selecting", $li);
    $(".pattern").removeClass("selected");
    $li.addClass("selected");
    this.$selected = $li;
    this.drawSelected();
}

/**
 * Dump currenctly active patterns
 */
ModelEditor.prototype.dumpPatterns = function() {
    var $patterns = $("#leftPane [data-role='pattern']");
    var result = []
    for (var i=0; i<$patterns.length; i++) {
        var data = $patterns.eq(i).data('rule');
        if (empty(data)) continue;
        result.push(data);
    }
    return result;
}

ModelEditor.prototype.renderSampleHighlight = function(editor, parsedData) {
    if (!editor) return;
    if (!parsedData?.length) return;
    // add marker to the editor
    const Range = ace.require('ace/range').Range;
    for (let offsetData of parsedData) {
        console.log("Offset data:", offsetData);
        //let thisRange = Range.fromPoints(offsetData.start, offsetData.end); // start offset 5, end offset 10
        //console.log("Rendering marker for range:", thisRange);
        let start = editor.session.doc.indexToPosition(offsetData.start)
        let end = editor.session.doc.indexToPosition(offsetData.end)
        let thisRange = new Range(start.row, start.column, end.row, end.column);
        console.log("Rendering marker for range:", thisRange);
        editor.session.addMarker(thisRange, "sampleHighlight", "text", true);
    }
}

ModelEditor.prototype.runSample = async function(text, model) {
    this.sampleIsRunning = true;
    text    = text || "";
    model   = model || this.loadFileGroupData()
    console.log("current model:", model);
    const options = {
        model:model
    }
    const customParser = new CustomParser(text, options);
    await customParser.parse();
    console.log("Custom parser:", customParser);
    this.gridPreviewData = customParser.transData.data;
    this.gridPreview.loadData(this.gridPreviewData);
    await this.gridPreview.render();

    // run highlighter
    const parsedData = customParser.parsedData;
    this.renderSampleHighlight(this.sampleEditor, parsedData);
    this.sampleIsRunning = false;
}

ModelEditor.prototype.getSampleTranslationPair = function() {
    var result = {};
    var data = modelEditor.gridPreview.getData();
    for (var r=0; r<data.length; r++) {
        var row = data[r];
        if (!row[0]) continue;
        if (!row[1]) continue;
        result[row[0]] = row[1];
    }
    return result;
}

ModelEditor.prototype.runSampleTranslationResult = async function(text, model) {
    text = text || this.sampleEditor.getValue();
    if (!text) return;
    this.sampleIsRunning = true;
    model   = model || this.loadFileGroupData()
    console.log("current model:", model);
    var options = {
        model:model
    }
    var customParser = new CustomParser(text, options);
    customParser.writeMode          = true;
    customParser.translationPair    = this.getSampleTranslationPair();
    await customParser.parse();
    console.log("Custom parser:", customParser);
    this.translationPreview.setValue(customParser.toString());
    this.sampleIsRunning = false;
}



ModelEditor.prototype.initSampleEditor = function() {
    var editor = ace.edit(this.$patterns.find(".sampleEditor")[0]);
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/text");
    editor.setShowPrintMargin(false);
    editor.setOptions({
        fontSize: "12pt"
      });
    editor.lastSampleRender = 0;
    editor.setOption("showInvisibles", true);
    editor.timeOutRender;
    editor.on("change", async ()=> {
        clearTimeout(editor.timeOutRender);
        editor.timeOutRender = setTimeout(async ()=> {
            if (this.sampleSubtab.getActiveSubTab() == "gridPreview") {
                await this.runSample(editor.getValue());
            } else {
                await this.runSampleTranslationResult(editor.getValue());
            }
        },100);
        /*
        if (this.sampleIsRunning) return;
        if (Date.now() < editor.lastSampleRender+1000) return;
        if (this.sampleSubtab.getActiveSubTab() == "gridPreview") {
            await this.runSample(editor.getValue());
        } else {
            await this.runSampleTranslationResult(editor.getValue());
        }
        editor.lastSampleRender = Date.now();
        */
    });
    // editor.on("blur", async ()=> {
    //     localStorage.setItem("modelEditor.sampleEditor", editor.getValue());
    // });
    // editor.setValue(localStorage.getItem("modelEditor.sampleEditor") || "");
    editor.setValue(this.activeFile.options?.testData || "");
    this.sampleEditor = editor;
}


ModelEditor.prototype.initGridPreview = function($elm) {
    var translateSelection = () => {
        if (empty(this.gridPreviewData)) return;
        var rows = common.gridSelectedRows(this.gridPreview.getSelectedRange());
        for (var i=0; i<rows.length; i++) {
            var rowData = this.gridPreviewData[i];
            if (!rowData[0]) continue;
            var reversed = rowData[0].split("").reverse().join("")
            rowData[1] = "Translated: "+reversed;
        }
        this.gridPreview.loadData(this.gridPreviewData);
        this.gridPreview.render();
    }
    var clearTranslation = () => {
        if (empty(this.gridPreviewData)) return;
        for (var i=0; i<this.gridPreviewData.length; i++) {
            this.gridPreviewData[i][1] = null;
        }
        this.gridPreview.render();
    }


    this.gridPreviewData    = [[]];
    this.gridPreview        = new Handsontable($elm[0], {
        data                : this.gridPreviewData,
        height              : '100%',
        width               : '100%',
        manualColumnResize  : true,
        rowHeaders          : true,
        colWidths           : [176, 176],
        colHeaders          : ["Original text", "Translation"],
        columns: [
            {
                readOnly:true
            },
            {
                readOnly:false
            }
        ],
        contextMenu: {
			items: {
				'generateTranslation': {
					name: "<i class='icon-language'></i>"+t("Translate here using ")+"dummy translator",
					callback: () => {
						translateSelection();
					}
					
				},
                'clearTranslation' : {
                    name: "<i class='icon-trash-empty'></i>Clear translation",
                    callback: ()=>{
                        clearTranslation();
                    }
                }
            }
        }
    });

    $(window).on("resizeEnd.gridPreview");
    $(window).on("resizeEnd.gridPreview", ()=> {
        //if (($elm).not(":visible")) return;
        this.gridPreview.render();
    });

    // change status from hidden to visible
    this.off("startShowingGrid");
    this.on("startShowingGrid", ()=> {
        //if (($elm).not(":visible")) return;
        console.log("start showing grid");
        this.gridPreview.render();
    })
}

ModelEditor.prototype.initTranslationPreview = function() {
    //this.initSubTab();
    var editor = ace.edit(this.$patterns.find(".translationPreview")[0]);
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/text");
    editor.setShowPrintMargin(false);
    editor.setReadOnly(true);
    editor.setOptions({
        fontSize: "12pt"
      });
    this.translationPreview = editor;

    this.sampleSubtab.off("beforeSubTabChange.transPreview");
    this.sampleSubtab.on("beforeSubTabChange.transPreview", (e, info) => {
        console.log(info);
        if (info.targetId == "translationPreview") {
            this.runSampleTranslationResult();
        }
    });

    this.sampleSubtab.off("afterSubTabChange.transPreview");
    this.sampleSubtab.on("afterSubTabChange.transPreview", (e, info) => {
        if (this.sampleSubtab.getActiveSubTab() == "gridPreview") this.trigger("startShowingGrid");
    });
}
/**
 * Initializing Testing Tab
 * If testing tab is initialized, then refresh the content
 */
ModelEditor.prototype.initTestingTab = async function() {
    if (this.$patterns.hasClass("testingTabInitialized")) {
        if (this.sampleSubtab.getActiveSubTab() == "gridPreview") {
            await this.runSample(this.sampleEditor.getValue());
        } else {
            await this.runSampleTranslationResult(this.sampleEditor.getValue());
        }
        return;
    }
    this.sampleSubtab = new SubTab(this.$elm.find(".translationPreviewer"));
    this.initSampleEditor();
    this.initGridPreview(this.$patterns.find(".gridPreview"));
    this.initTranslationPreview();
    this.$patterns.addClass("testingTabInitialized");
}

ModelEditor.prototype.initHooksTab = function($rootElm) {
    var that = this;
    $rootElm = $rootElm || this.$elm;
    if ($rootElm.hasClass("subTabInitialized")) return;
    // init navigator
    this.hooksTab = new SubTab($rootElm);

    // init field
    $rootElm.find(".editor").each(function() {
        var fieldName = $(this).attr("data-field");
        var editor = ace.edit($(this)[0]);
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/javascript");
        editor.setShowPrintMargin(false);
        editor.setOptions({
            fontSize: "12pt"
          });
        editor.on("blur", ()=> {
            that.applyFileGroupData(fieldName, editor.getValue())
        });
        editor.setValue(that.loadFileGroupData(undefined, fieldName) || "");
    });
    Prism.highlightAll();
}

var setValueRecursive = function(rootObj, stringVar, value, force) {
	try {
		var autosetPath = stringVar.split(".")
		if (autosetPath.length < 1) return false;

		rootObj ||= window;
		for (var i=0; i<autosetPath.length-1; i++) {
			if (force) {
				if (typeof rootObj[autosetPath[i]] == 'undefined') {
					rootObj[autosetPath[i]] = {};	
				}
			}
			rootObj = rootObj[autosetPath[i]];

			
		}
		rootObj[autosetPath[autosetPath.length-1]] = value;

	} catch (e) {
		return false;
	}
	return true;
}

ModelEditor.prototype.setOptionValue = function(key, value) {
    var fileGroupData = this.loadFileGroupData(undefined, undefined, true);
    fileGroupData.options ||= {};
    setValueRecursive(fileGroupData, `options.${key}`, value, true);
    console.log("data after set:", JSON.stringify(fileGroupData, undefined, 2));
}

ModelEditor.prototype.getOptionValue = function(key) {
    var fileGroupData = this.loadFileGroupData();
    console.log("loading path", key);
    try {
		var x = eval("fileGroupData.options."+key);
		return x;
	} catch (e) {
        console.log("can not find value");
		return;
	}
}

ModelEditor.prototype.initOptionsTab = function($rootElm) {
    var that = this;
    $rootElm = $rootElm || this.$elm;
    console.log("initializing options tab");

    var $options = $rootElm.find("#options");
    $options.find("[data-fld]").each(function() {
        var $this = $(this);
        var thisValue = that.getOptionValue($this.attr("data-fld")) || $this.attr("data-default");
        $this.val(thisValue)
    });


    if ($options.hasClass("eventInitialized")) return;
    console.log("initializing event's option");
    $options.find("[data-fld]").on("change", function() {
        console.log("saving options");
        var $this = $(this);
        that.setOptionValue($this.attr("data-fld"), $this.val())
    })
    
    $options.addClass("eventInitialized")
}

ModelEditor.prototype.newRulesPane = function(defaultValue) {
    console.log("Creating new rules pane");
    this.clearRulesPane();
    this.$patterns = this.$patternsTemplate.clone(true, true);
    this.$rulesRootElm.append(this.$patterns);
    this.$rulesRootElm.find(".patternEditor").tabs({
		active: 0,
		activate: function(e, thisUi) {
            
		}
	});
    this.$rulesRootElm.find(".patternEditor").on("tabsactivate", async (e, ui)=> {
        console.log(ui);
        if (ui.newPanel.attr("id") == "hooks") {
            console.log("hooks tab activated");
            this.initHooksTab(ui.newPanel);
        } else if (ui.newPanel.attr("id") == "options") {
            console.log("options tab activated");
            await this.initOptionsTab();
        } else if (ui.newPanel.attr("id") == "testing") {
            console.log("testing tab activated");
            await this.initTestingTab();
        }
    });

    this.$rulesRootElm.find(".sortable").sortable(); 
    this.loadRules(defaultValue.rules);
    this.selectRule(0, true);
    console.log("End of creating new rules pane");

    /*
    // initializing testing tab
    this.sampleSubtab = new SubTab(this.$elm.find(".translationPreviewer"));
    this.initSampleEditor();
    this.initGridPreview(this.$patterns.find(".gridPreview"));
    this.initTranslationPreview();
   */
}

ModelEditor.prototype.clearRulesPane = function() {
    this.$rulesRootElm.empty();
}

ModelEditor.prototype.clearFileGroup = function() {
    this.$fileGroups.empty();
}

ModelEditor.prototype.drawNoFileGroupWarning = function() {
    this.$rulesRootElm.append($("#template .noFileGroup").clone(true, true));
}

ModelEditor.prototype.getActiveFileGroup = function() {
    return this.$fileGroups.find(":selected");
}

ModelEditor.prototype.applyFileGroupData = function(key, data, $elm) {
    //console.log("applyFileGroupData", arguments);
    $elm = $elm || this.$activeFileGroup
    if (!$elm) return;
    if ($elm.length == 0) return;
    if (empty($elm.data("fileData"))) $elm.data("fileData", {});
    console.log("Applying key", key, JSON.stringify(data, undefined, 2), $elm.attr("value"));
    var fileData    = $elm.data("fileData");
    fileData[key]   = data;
    $elm.data("fileData", fileData);
}

ModelEditor.prototype.loadFileGroupData = function($elm, key, doNotSave) {
    console.log("loadFileGroupData", arguments)
    $elm = $elm || this.getActiveFileGroup();
    if (!doNotSave) this.applyChange();
    if (empty($elm.data("fileData"))) $elm.data("fileData", {});
    if (!key) return $elm.data("fileData");
    return $elm.data("fileData")[key];
}

ModelEditor.prototype.selectFileGroup = function($elm) {
    loadingScreen.show();
    $(".patternEditor").addClass("hidden");
    if (typeof $elm == "number") $elm = $("#fileNavSelector option").eq($elm);
    console.log("Selecting fileGroup", $elm.attr("value"));
    console.log("Applying any change on previous file group");
    this.applyChange();

    console.log("moving to selected group");
    $elm.prop("selected", true);
    this.$activeFileGroup = $elm;
    var defaultValue = this.loadFileGroupData($elm, undefined, true);
    this.newRulesPane(defaultValue);
    loadingScreen.hide();
}

ModelEditor.prototype.newFileGroup = function(group, defaultData) {
    console.log("creating new file group");

    defaultData         = defaultData || {};
    defaultData.pattern = group;
    var $template = $(`<option></option>`);
    $template.attr("value", group);
    $template.text(group);
    $template.data("fileData", defaultData)
    
    this.$fileGroups.append($template);
    this.enableSave();
    this.hasChange = true;
    console.log("file group creation done");
    return $template;
}

ModelEditor.prototype.editFileGroup = function(group, $elm) {
    $elm = $elm || this.getActiveFileGroup();
    $elm.attr("value", group);
    $elm.text(group);
    this.applyFileGroupData("pattern", group, $elm);
    this.hasChange = true;
    return $elm;
}

ModelEditor.prototype.removeFileGroup = function($elm) {
    $elm = $elm || this.getActiveFileGroup();
    console.log("removing FileGroup", $elm);
    console.log("removing group with active data:", $elm.data("fileData"));
    console.log($elm.is(":selected"));
    if ($elm.is(":selected")) this.clearRulesPane();
    if ($("#fileNavSelector option").length > 1) {
        var $prev = $elm.prev();
        $elm.remove();
        if ($prev.length == 0) this.selectFileGroup(0);
        this.selectFileGroup($prev);
        this.hasChange = true;
    } else {
        this.initialize();
    }
}

ModelEditor.prototype.dump = function() {
    this.applyChange();
    const fileGroups = $("#fileNavSelector option");

    var sampleValue = this.activeFile?.options?.sampleValue || "";
    if (this.sampleEditor) {
        sampleValue = this.sampleEditor.getValue();
    }

    const parserModel = {
        files:[],
        options:{
            testData: sampleValue
        },
        modelInfo: common.clone(this.activeFile?.modelInfo || {})
    }
    for (var i=0; i<fileGroups.length; i++ ) {
        /*
        var thisData = {
            pattern : fileGroups.eq(i).attr("value"),
            rules   : this.loadFileGroupData(fileGroups.eq(i))
        }
        */
        parserModel.files.push(this.loadFileGroupData(fileGroups.eq(i)))
    }
    return parserModel;
}

ModelEditor.prototype.disableSave = function() {
    this.isSaveEnable = false;
    $(".menu-button.button-save").prop("disabled", true);
    $(".menu-button.button-save-as").prop("disabled", true);
}

ModelEditor.prototype.enableSave = function() {
    this.isSaveEnable = true;
    $(".menu-button.button-save").prop("disabled", false);
    $(".menu-button.button-save-as").prop("disabled", false);
}

ModelEditor.prototype.saveAs = async function() {
    if (!this.isSaveEnable) return;
    var $elm = $(`<input type="file" class="saveAs hidden" nwsaveas="new parser model.tpm" accept=".tpm,application/tpm" autocomplete="off"  />`);
    return new Promise(async (resolve, reject)=>{
        $elm.one("input", async ()=> {
            var file = $elm.val();
            if (!$elm.val()) resolve;
            try {
                $(".button-save img").addClass("rotating");
                await common.filePutContents(file, JSON.stringify(this.dump()));
                this.hasChange = false;
                this.file = nwPath.resolve(file);
                this.setLastOpenedFile(this.file);
                this.setWindowTitle(nwPath.basename(this.file));
            } catch (e) {
                $(".button-save img").removeClass("rotating");
                console.warn(e);
                alert("Error when trying to save file to:"+file+"\n"+e.toString());
                resolve();
            }
            $(".button-save img").removeClass("rotating");
            resolve(file);
        });
        $elm.trigger("click");

    })

}

ModelEditor.prototype.saveTo = async function(file) {
    if (!this.isSaveEnable) return;
    file = file || this.file
    console.log("Saving to file:", file);
    if (!this.file) {
        return this.saveAs();
    }
    try {
        $(".button-save img").addClass("rotating");
        await common.filePutContents(file, JSON.stringify(this.dump()));
        this.hasChange = false;

    } catch (e) {
        $(".button-save img").removeClass("rotating");
        alert("Error when trying to save file to:"+file+"\n"+e.toString());
        return false;
    }
    $(".button-save img").removeClass("rotating");
    return file;
}

ModelEditor.prototype.historyAppend = async function(file) {
    var history = await this.localStorage.getItem("history");
    history = history || [];
    if (history.includes(file)) {
        history.splice(history.indexOf(file), 1);
 
    }
    history.unshift(file);
    if (history.length > this.maxHistoryOpenedFile) {
        history.pop();
    }
    await this.localStorage.setItem("history", history);
    return history;
}

ModelEditor.prototype.historyClear = async function() {
    await this.localStorage.setItem("history", []);
}

    

ModelEditor.prototype.loadFromJson = async function(json) {
    this.initialize();
    if (!common.isJSON(json)) return alert("Invalid JSON");
    const data = JSON.parse(json);
    data.files = data.files || [];
    console.log("loaded from json", data);
    for (let i=0; i<data.files.length; i++) {
        this.newFileGroup(data.files[i].pattern, data.files[i]);
    }
    this.activeFile = {};
    this.activeFile.options = data.options || {};
    this.activeFile.modelInfo = {
        ...(data.modelInfo || {}),
        author: data?.modelInfo?.author || data?.modelInfo?.createdBy || ""
    };
    this.selectFileGroup(0);
    this.trigger("jsonLoaded");
}

ModelEditor.prototype.setLastOpenedFile = async function(file) {
    file = file || this.file;
    await this.localStorage.setItem("lastOpenedFile", file);
    await this.historyAppend(file);
}

ModelEditor.prototype.loadFromFile = async function(file) {
    if (this.hasChange) {
        const conf = confirm(t("Do you want to discard your changes and open\n")+file+"?");
        if (!conf) return;
    }

    var openFileDialog = async () => {
        return new Promise(async (resolve, reject) => {
            var $elm = $(`<input type="file" class="openFile hidden" accept=".tpm,application/tpm" autocomplete="off" />`);
            $elm.one("input", async ()=> {
                resolve($elm.val());
            })
            $elm.trigger("click");
        })
    }

    if (typeof file == "undefined") {
        file = await openFileDialog();
    }

    if (!file) return;
    
    try {
        var fileContent = await common.fileGetContents(file);
        await this.loadFromJson(fileContent);

        this.file = nwPath.resolve(file);
        this.setWindowTitle(nwPath.basename(this.file));
        await this.setLastOpenedFile(this.file);
        this.trigger("fileLoaded");
    } catch (e) {
        console.error(e);
        alert(t("Error when trying to open file :")+file+"\n"+e.toString());
        return false;
    }
}

ModelEditor.prototype.setWindowTitle = function(string) {
    string = string || ""
    const baseTitle = t("Parser Model Creator")+" - Translator++"
    var title = baseTitle;
    if (string) {
        title = string + " - " + baseTitle;
    }
    $("title").text(title)
    return title;
}

ModelEditor.prototype.initialize = function() {
    console.log("Initializing model editor");
    var $template   = $("#template");
    var that        = this;
    this.hasChange  = false;
    this.file       = "";
    this.activeFile = {
        options:{},
        modelInfo:{}
    };
    // fileGroup
    this.$fileGroups    = $("#fileNavSelector");
    this.$fileGroups.off("change");
    this.$fileGroups.on("change", function() {
        that.selectFileGroup($(this).find(":selected"));
    });
    this.clearFileGroup();
    this.$activeFileGroup   = undefined;

    // rules
    if (!ModelEditor.$patternEditor) {
        ModelEditor.$patternEditor = $template.find(".patternEditor").clone(true, true);
        // remove the original to avoid confusion of the query
        $template.find(".patternEditor").remove();
    }
    this.$rulesRootElm      = $("#patternEditorWrapper");
    this.$patternsTemplate  = ModelEditor.$patternEditor.clone(true, true);
    this.$ruleTemplate      = ModelEditor.$patternEditor.find(".pattern").clone(true, true);



    this.$ruleTemplate.on("mouseup", function() {
        that.selectRule($(this));
    })

    this.$ruleTemplate.find(".buttons .add").on("click", function() {
        that.addRule($(this).closest(".selectable"));
    })

    this.$ruleTemplate.find(".buttons .delete").on("click", function() {
        that.delete($(this).closest(".selectable"));
    })

    this.clearRulesPane();
    this.drawNoFileGroupWarning();

    this.disableSave();

    this.setWindowTitle("");
}



const addFileGroup = function(elm) {
    console.log("Adding new file group");
    var fileGroup = prompt(t("Please specify what kind of file you want to parse.\nYou can use semicolon separated glob pattens. For example: *.txt;*.js;*.json"));
    if (!fileGroup) return;
    var newOpt = modelEditor.newFileGroup(fileGroup);
    if (!newOpt) alert(t("Failed to create new file group. Please check your pattern!"));
    modelEditor.selectFileGroup(newOpt);
}

$(document).ready(function() {
    loadingScreen    = new LoadingScreen();
    modelEditor      = new ModelEditor()
    if (nw.process.versions["nw-flavor"] == "sdk") {
        $(".button-debugger").removeClass("hidden");
    }


    window.dropFileToWindow = new (require("www/js/DropFileToWindow.js"))(document.querySelector("body"), {
        hoverText: "Drop .tpm file here!",
        supportedFiles: [".tpm"],
        onSupportedFileDrop: (filePath)=> {
            modelEditor.loadFromFile(filePath);
        }
    });
    window.dropFileToWindow.init()
    
    // MENU
    $(".addFileGroup").on("click", function() {
        addFileGroup(this);
    })

    $(".editFileGroup").on("click", function() {
        var currentFileGroup = modelEditor.getActiveFileGroup();
        if (currentFileGroup.length < 1) return;
        var defaultFileGroup = currentFileGroup.attr("value");
        var fileGroup = prompt(t("Please specify what kind of file you want to parse.\nYou can use semicolon separated glob pattens. For example: *.txt;*.js;*.json"), defaultFileGroup);
        if (!fileGroup) return;
        var newOpt = modelEditor.editFileGroup(fileGroup);
        if (!newOpt) alert(t("Failed to create new file group. Please check your pattern!"));
    });

    $(".removeFileGroup").on("click", function() {
        var conf = confirm(t("Do you wish to remove current file group?\nYou can not undo this action!"));
        if (!conf) return;
        modelEditor.removeFileGroup();
    });

    $(".modelInfoButton").on("click", function() {
        modelEditor.openModelInfoDialog();
    });

    $(".menu-button.button-new").on("click", function() {
        console.log("Creating new model");
        if (modelEditor.hasChange) {
            var conf = confirm(t("Do you want to discard your changes and create a new blank model?"));
            if (!conf) return;
        }
        modelEditor.initialize();
    })
    $(".menu-button.button-open > .mainButton").on("click", function() {
        if (modelEditor.hasChange) {
            var conf = confirm(t("Do you want to discard your changes and open a file?"));
            if (!conf) return;
        }
        modelEditor.loadFromFile();
    });
    $(".menu-button.button-open > .menuSide").on("click", async function(ev) {
		ev.preventDefault();
        const $wrapper = $(this).closest(".menu-button");
        const left = parseInt($wrapper.offset().left);
        const top = parseInt($wrapper.offset().top + $wrapper.outerHeight());
        const generateLatestFileMenu = async () => {
            const history = await modelEditor.localStorage.getItem("history");
            if (!history) return;
            const menu = [];
            for (let i=0; i<history.length; i++) {
                menu.push({
                    label: history[i],
                    click: async function() {
                        modelEditor.loadFromFile(history[i]);
                    }
                })
            }
            menu.push({ type: 'separator' });
            menu.push({
                label: t('Clear history'),
                click: async function() {
                    await modelEditor.historyClear();
                }
            })
            return menu;
        }
        const menu = common.nwUtil.createMenu([
            {
                label: t('Open latest file'),
                click: async function(){
                    console.log("Menu clicked", this);
                    const latestFile = await modelEditor.localStorage.getItem("lastOpenedFile");
                    modelEditor.loadFromFile(latestFile);
                }
            },
            { type: 'separator' },
            {
                label: t('Open from history'),
                submenu: await generateLatestFileMenu()
            }
        ]);
        menu.popup(left, top);
		// buttonObj.onClick.apply(this, arguments);
    });

    $(".menu-button.button-save").on("click", function() {
        modelEditor.saveTo();
    })
    $(".menu-button.button-save-as").on("click", function() {
        modelEditor.saveAs();
    })

    $(".button-debugger").on("click", function() {
        if (nw.process.versions['nw-flavor'] !== 'sdk') return alert(t("This feature only available if you are using Developer version of Translator++. You can switch into Developer version by using Basic Utilities -> Change Core NWJS."));
        win.showDevTools();
    });

    $(".menu-button.button-help").on("click", function() {
        nw.Shell.openExternal("https://dreamsavior.net/docs/translator/parser-model-creator/");
    })

    $(window).on("resize", function() {
        clearTimeout(this.windowResizeTimeout);
        this.windowResizeTimeout = setTimeout(()=>{
            $(window).trigger("resizeEnd");
        }, 100);
    });


    $(window).on("resizeEnd", function() {
        console.log("resizeEnd");
    });

    $(document).on('keydown', function(e) {
		var keyCode = e.keyCode || e.which;

		switch (keyCode) {

			case 112 : //F1, about
				e.preventDefault();
                nw.Shell.openExternal("https://dreamsavior.net/docs/translator/parser-model-creator/");
                break;		
			case 122 : //F11, Full screen
				var win = win || nw.Window.get();
				win.maximize();
			break;		
		}

		// EDITING COMMAND
		if (e.ctrlKey) {
			switch(keyCode) {
				case 79 : //o
                    if (modelEditor.hasChange) {
                        var conf = confirm(t("Do you want to discard your changes and open a file?"));
                        if (!conf) return;
                    }
                    modelEditor.loadFromFile();
				break;
				case 83 : //s
					e.preventDefault();
					console.log("Pressing CTRL+s");
					modelEditor.saveTo();
					//saveData();
				break;
			}
		} else if (e.altKey) {
			// switch(keyCode) {
			// }			
		} else if (e.shiftKey) {
			// switch(keyCode) {
			// }
		}
	});	

    // create tempalte
    modelEditor.initialize();
})
