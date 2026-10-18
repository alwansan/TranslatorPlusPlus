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
//const { shim } = require('regexp-match-indices'); // eslint-disable-line
const BasicEventHandler = require('www/js/BasicEventHandler.js');
var options = {};
var win = nw.Window.get();
win.restore(); // restore if minimized
win.show(); // show if hidden

win.setResizable(true);

var $DV 	= window.opener.$DV;
var trans 	= window.opener.trans;
var sys 	= window.opener.sys;
var addonLoader = window.opener.addonLoader;
var AddonInstaller = window.opener.AddonInstaller;
var fs 		= require('fs');
var lt 		= lt || window.opener.lt;
var info 	= window.opener.info;
var updater	= window.opener.updater;
var Updater	= window.opener.Updater;
var langTools = window.opener.langTools;
var TranslatorEngine = window.opener.TranslatorEngine;

/**
 * Triggered when option window is opened
 * @event ui#optionsWindowOpened
 * @since 4.3.20
 */
window.opener.ui.trigger("optionsWindowOpened");



trans.project = trans.project||{};
trans.project.options = trans.project.options||{};

options.__onBeforeClose = [];
options.onBeforeCloseRunOnce = function(fn) {
	if (typeof fn !== 'function') return console.info("Argument is not a function", fn)
	options.__onBeforeClose.push(fn);
}

options.localStorage = new (require("better-localstorage"))("options");

options.isUpdaterAvailable = function() {
	if (typeof updater?.update == "function") return true;
}

options.initLanguageList = function() {
	var langList = common.getLanguageCode();
	if ($("#languageList").length > 0) return;
	var $languageList = $(`<datalist id="languageList"></datalist>`);
	for (var i in langList) {
		$languageList.append(`<option value="${i}">${langList[i]}</option>`);
	}
	$("#template").append($languageList);
}

options.needRestart = false;
options.requestRestart = function() {
	this.needRestart = true;	
}

options.isNeedRestart = function() {
	if (options.needRestart) {
		alert(t("Some configuration require you to restart the application to take effect.\nPlease save your work, and restart Translator++."));
	}
}

let _bsTextAreaPromptController = null;

function bsClosePrompt(resolveValue) {
    if (_bsTextAreaPromptController) {
        _bsTextAreaPromptController.close(resolveValue);
        _bsTextAreaPromptController = null;
    }
}

async function bsTextAreaPrompt(title, info, { isCancelable = true } = {}) {
    return new Promise(resolve => {
        const modalId = "bsTextAreaPromptModal_" + Date.now();
        const wrapperId = modalId + "_wrapper";

        const modalHtml = `
<div id="${wrapperId}" class="bs5">
  <div class="modal fade" id="${modalId}" tabindex="-1"
       data-bs-backdrop="static" data-bs-keyboard="false"  style="background:#11111188">
    <div class="modal-dialog">
      <div class="modal-content bg-dark text-light">

        <div class="modal-header bg-dark text-light">
          <h5 class="modal-title">${title}</h5>
          ${isCancelable ? `<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>` : ""}
        </div>

        <div class="modal-body bg-dark text-light">
          <p>${info}</p>
          <textarea class="form-control form-control-dark text-light bg-secondary"
                    id="${modalId}_textarea" rows="5"></textarea>
        </div>

        <div class="modal-footer bg-dark">
          ${isCancelable ? `<button type="button" class="btn btn-secondary" id="${modalId}_cancel">Cancel</button>` : ""}
          <button type="button" class="btn btn-light" id="${modalId}_ok">OK</button>
        </div>

      </div>
    </div>
  </div>
</div>`;

        document.body.insertAdjacentHTML("beforeend", modalHtml);

        const wrapperEl = document.getElementById(wrapperId);
        const modalEl = document.getElementById(modalId);
        const textareaEl = document.getElementById(`${modalId}_textarea`);
        const okBtn = document.getElementById(`${modalId}_ok`);
        const cancelBtn = document.getElementById(`${modalId}_cancel`);

        const bsModal = new bootstrap.Modal(modalEl);

        okBtn.addEventListener("click", () => {
            const value = textareaEl.value.trim();
            cleanup();
            resolve(value);
        });

        if (isCancelable && cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                cleanup();
                resolve(false);
            });
        }

        function cleanup() {
            _bsTextAreaPromptController = null;
            bsModal.hide();
            setTimeout(() => wrapperEl.remove(), 200);
        }

        // expose a programmatic close controller
        _bsTextAreaPromptController = {
            close: (value) => {
                cleanup();
                resolve(typeof value !== 'undefined' ? value : null);
            }
        };

        bsModal.show();
    });
}

options.updateLanguageSelectors = function() {
	options.drawLanguageSelector($("#sl"),'sl', sys.config.default.sl);
	options.drawLanguageSelector($("#tl"),'tl', sys.config.default.tl);

	if ($("#language .languagePair").hasClass("initialized")) {
		$("#sl").trigger("input")
		$("#tl").trigger("input")
		return;
	}
	$("#sl").on("input", function() {
		var $this = $(this)
		$this.closest(".fieldLine").find("label .attention").remove();

		if (!$this.val()) {
			$this.addClass("error");
			$this.closest(".fieldLine").find("label").append(`<i class="attention icon-attention red" title="Please select a language"></i>`);

		} else {
			$this.removeClass("error");

		}

		/**
		 * Triggered when the default translator is changed
		 * @event Trans#languageChange
		 * @param  {String} sl - Source language
		 * @param  {String} tl - Target language
		 * @since 4.12.10
		 */
		trans.trigger("languageChange", [$("#sl").val(), $("#tl").val()])
	})
	$("#tl").on("input", function() {
		var $this = $(this)
		$this.closest(".fieldLine").find("label .attention").remove();

		if (!$this.val()) {
			$this.addClass("error");
			$this.closest(".fieldLine").find("label").append(`<i class="attention icon-attention red" title="Please select a language"></i>`);
		} else {
			$this.removeClass("error");
		}
		trans.trigger("languageChange", [$("#sl").val(), $("#tl").val()])

	})
	$("#sl").trigger("input")
	$("#tl").trigger("input")
	$("#language .languagePair").addClass("initialized")
}


options.drawTranslatorSelector = function($obj, defaultVal) {
	defaultVal = defaultVal || "google";
	$obj.data("previousValue", defaultVal);
	if (!trans.getTranslatorEngine) return;
	if (!trans.translator) return;
	if (Array.isArray(trans.translator)) trans.translator.sort();
	for (var i=0; i<trans.translator.length; i++) {
		var thisTranslator = trans.getTranslatorEngine(trans.translator[i]);
		if (!thisTranslator) {
			console.warn("Can not process option for:", trans.translator[i]);
			continue;
		}
		$obj.append("<option value='"+trans.translator[i]+"'>"+thisTranslator.name+"</option>");
	}
	$obj.val(defaultVal);
	
	if ($obj.hasClass("eventApplied") == false) {
		$obj.on("change.updater", function(e) {
			trans.project.options = trans.project.options||{};
			trans.project.options.translator = $(this).val();
			options.updateLanguageSelectors();
			// registering into sys
			try {
				sys.config.translator = $(this).val();
				sys.saveConfig();
			} catch (e) {
				console.info("error writing sys.config", e);
			}
		})
		$obj.addClass("eventApplied")
	}
	
	// initializing;
	$obj.trigger("change");

	$obj.on("change", function() {
		var $this = $(this);
		// store old value
		var oldValue = $(this).data("previousValue");
		// set old value to new value;
		$(this).data("previousValue", $this.val());
		options.updateLanguageSelectors();
		// trigger event
		
		/**
		 * Triggered when the default translator is changed
		 * @event Trans#translatorIsChanged
		 * @param  {String} oldTranslator - The id of the old translator
		 * @param  {String} newTranslator - The id of the new Translator
		 * @since 4.3.20
		 */
		options.trigger("translatorIsChanged", [$this.val(), oldValue])
		trans.trigger("translatorIsChanged", [$this.val(), oldValue]);
	})

	return $obj;
}

options.drawLanguageSelector = function($obj, id, defaultVal, options) {
	var languages;
	try {
		var thisTranslator = sys.config.translator||trans.project.options.translator;
		var keyName = "sourceLanguages"
		if (id == "tl") {
			keyName = "targetLanguages"
		}
		languages = trans[thisTranslator][keyName]||trans[thisTranslator].languages||consts.defaultLanguages||{};
	} catch (e) {
		languages = consts.defaultLanguages||{};
	}
	
	$obj.empty();
	options = options||{};
	options.disableChoice = options.disableChoice||[];
	if (typeof(defaultVal) == 'undefined') {
		defaultVal = 'en';
		if (id == 'sl') defaultVal = 'ja'; 
	}
	
	for (var langCode in languages) {
		var $opt;
		//var langDBData = langTools.lookupDB(langCode, languages[langCode])
		var langDBData = langTools.getLanguage(langCode, languages[langCode])
		if (langDBData) {
			$opt = $(`<option value="${langDBData.id}">${langTools.getFullName(langDBData)}</option>`);
		} else {
			$opt = $("<option value='"+langCode+"'>"+languages[langCode]+"</option>");
		}

		if (options.disableChoice.includes(langCode)) $opt.prop("disabled", true);
		$obj.append($opt);
	}
	$obj.val(defaultVal);

	if ($obj.hasClass("eventApplied") == false) {
		$obj.on("change.updater", function(e) {
			sys.config.default[id] = $(this).val();
			$DV.config[id] = $(this).val();		
		})
		$obj.addClass("eventApplied")
	}

	
	return $obj;
}

options.applyAll =function($obj) {
	$obj = $obj||$("body");
	
	$obj.find("input").trigger("change");
	$obj.find("select").trigger("change");
	$obj.find("textarea").trigger("change");
}




// ===================================================
// Handling tab / left menu
// ===================================================
options.tab = {};
options.tab.select = function($obj, scrollToView= false) {
	//$obj can be jquery instance, element or id
	if (typeof $obj == "string") {
		$obj = $(".tabMenu li[data-for='"+CSS.escape($obj)+"']");
	}
	if ($obj.length == 0) {
		return;
	}
	$obj.closest(".tabMenu").find("li.selectable").removeClass("selected");
	$obj.addClass("selected");
	let $panelContents = $(".panel-right .panelContent");
	$panelContents.removeClass("activeTab");
	$panelContents.addClass("hidden");
	
	let thisRef = $obj.data("for");
	let $targetObj = $("#"+thisRef);
	if ($targetObj.length > 0) {
		$targetObj.trigger("beforeShown");
		$targetObj.removeClass("hidden");
		$targetObj.addClass("activeTab");
		$targetObj.trigger("tabSelected");
	}
	if (typeof $obj.data("onOptionSelected") == "function") {
		$obj.data("onOptionSelected")($targetObj, $obj);
	}


	if ($obj.is(".hidden") && $obj.is("[data-parent]")) {
		// expand the parent
		const $parent = $(".tabMenu li[data-for='"+$obj.data("parent")+"']");
		const $expander = $parent.find(".expanderButton");
		options.expanderButton.toggle($expander, true);
	}

	if (scrollToView) {
		$obj[0].scrollIntoView();
	}


	return $obj;
}

options.tab.insertBefore = function(id, title, $insertBefore, options) {
	options = options||{};
	options.icon = options.icon||"circle";
	options.tabClass = options.tabClass||"";
	var $tab = $('<li data-for="'+id+'" class="selectable '+options.tabClass+'"><a><i class="icon-'+options.icon+'"></i><span class="menuTitle">'+title+'</span></a></li>');

	$tab.insertBefore($insertBefore);
	$tab.attr("data-keyword", title);
	if (typeof options.onSelect == "function") $tab.data("onOptionSelected", options.onSelect);
	
	var $tabContent = $('<div class="panelContent '+id+'" id="'+id+'"></div>');
	$(".panel-right").append($tabContent);
	
	return {tab:$tab, content:$tabContent};
}

options.tab.insertAfter = function(id, title, $insertAfter, options) {
	options = options||{};
	options.icon = options.icon||"circle";
	options.tabClass = options.tabClass||"";
	options.tabContent = options.tabContent||"";

	var $tab = $('<li data-for="'+id+'" class="selectable '+options.tabClass+'"><a><i class="icon-'+options.icon+'"></i><span class="menuTitle">'+title+'</span></a></li>');
	$tab.insertAfter($insertAfter);
	$tab.attr("data-keyword", title);

	if (typeof options.onSelect == "function") $tab.data("onOptionSelected", options.onSelect);

	var $tabContent = $('<div class="panelContent '+id+'" id="'+id+'"></div>');
	$tabContent.append(options.tabContent);
	$(".panel-right").append($tabContent);
	return {tab:$tab, content:$tabContent};
}

options.tab.insertAsChild = function(id, title, $insertAfter, options) {
	if (typeof $insertAfter == "string") {
		$insertAfter = $(".tabMenu li[data-for='"+CSS.escape($insertAfter)+"']");
	}

	const parentId = $insertAfter.data("for");
	options = options||{};
	options.icon = options.icon||"circle";
	options.tabClass = options.tabClass||"";
	options.tabContent = options.tabContent||"";

	var $tab = $('<li data-for="'+id+'" class="selectable '+options.tabClass+'"><a><i class="icon-'+options.icon+'"></i><span class="menuTitle">'+title+'</span></a></li>');
	$tab.insertAfter($insertAfter);
	$tab.attr("data-keyword", title);
	$tab.attr("data-parent", parentId);

	if (typeof options.onSelect == "function") $tab.data("onOptionSelected", options.onSelect);

	var $tabContent = $('<div class="panelContent '+id+'" id="'+id+'"></div>');
	$tabContent.append(options.tabContent);
	$(".panel-right").append($tabContent);
	return {tab:$tab, content:$tabContent};
}

options.tab.getActiveContent = function() {
	return $(".panel-right .panelContent.activeTab");
}

options.tab.findInActiveContent = function(text) {
	const $activeContent = this.getActiveContent();
	const targetElements = ["label", "h1", "h2", "h3", "h4"];
	// find the text in the active content, encapsulate with <span class='highlight'>
	for (let i=0; i<targetElements.length; i++) {
		$activeContent.find(targetElements[i]).each(function() {
			var $this = $(this);
			var html = $this.html();
			html = html.replace(new RegExp(text, "gi"), function(match) {
				return "<span class='highlight'>"+match+"</span>";
			})
			$this.html(html);
		})
	}


	// scroll into the highlighted element
	var $highlighted = $activeContent.find(".highlight");
	if ($highlighted.length) {
		$highlighted.get(0).scrollIntoView();
	}
}

options.tab.init = function() {
	var $selectableMenu = $(".tabMenu li.selectable");
	$selectableMenu.each(function() {
		var $thisLi = $(this);
		$thisLi.off("click.selectTab");
		$thisLi.on("click.selectTab", function(e){
			options.tab.select($(this));
		})
	});
}

// ===================================================
// Handling translator options
// ===================================================
options.translatorMenu = {};

/**
 * Linkify URLs in an HTML string without touching URLs inside markup (tags/attributes).
 * Only URLs that are standalone tokens (surrounded by whitespace or string boundaries)
 * are linkified.
 *
 * @param {string} html
 * @returns {string}
 */
options.linkifyHtml = function(html) {
	if (typeof html !== "string" || !html) return html;

	// Match URLs that are either the full text or surrounded by whitespace.
	// Note: strict on trailing boundary per requirement (no punctuation).
	const urlRegex = /(^|\s)((?:https?|ftp|file):\/\/[^\s<>"']+)(?=\s|$)/ig;

	const container = document.createElement("div");
	container.innerHTML = html;

	const shouldSkipNode = (textNode) => {
		let p = textNode.parentNode;
		while (p) {
			const tag = (p.nodeName || "").toLowerCase();
			if (tag === "a" || tag === "script" || tag === "style") return true;
			p = p.parentNode;
		}
		return false;
	};

	const linkifyTextNode = (textNode) => {
		const text = textNode.nodeValue;
		if (!text) return;
		urlRegex.lastIndex = 0;
		if (!urlRegex.test(text)) return;
		urlRegex.lastIndex = 0;

		const frag = document.createDocumentFragment();
		let lastIndex = 0;
		let match;
		while ((match = urlRegex.exec(text)) !== null) {
			const fullMatchIndex = match.index;
			const leading = match[1] || "";
			const url = match[2];
			const urlStartIndex = fullMatchIndex + leading.length;
			const urlEndIndex = urlStartIndex + url.length;

			if (urlStartIndex > lastIndex) {
				frag.appendChild(document.createTextNode(text.slice(lastIndex, urlStartIndex)));
			}
			const a = document.createElement("a");
			a.setAttribute("href", url);
			a.setAttribute("target", "_system");
			a.appendChild(document.createTextNode(url));
			frag.appendChild(a);
			lastIndex = urlEndIndex;
		}

		if (lastIndex < text.length) {
			frag.appendChild(document.createTextNode(text.slice(lastIndex)));
		}

		textNode.parentNode.replaceChild(frag, textNode);
	};

	// Walk text nodes and replace only those that contain URL tokens.
	const SHOW_TEXT = (typeof NodeFilter !== "undefined" && NodeFilter?.SHOW_TEXT) ? NodeFilter.SHOW_TEXT : 4;
	const walker = document.createTreeWalker(container, SHOW_TEXT, null);
	const textNodes = [];
	let n;
	while ((n = walker.nextNode())) textNodes.push(n);
	for (let i = 0; i < textNodes.length; i++) {
		if (shouldSkipNode(textNodes[i])) continue;
		linkifyTextNode(textNodes[i]);
	}

	return container.innerHTML;
}

options.translatorMenu.assignDefault = function(thisTranslator) {
	if (thisTranslator.id == "testEngine2") {
		console.log("%cAssign default", "color:aqua", thisTranslator);
	}
	if (typeof thisTranslator.optionsForm == 'undefined') return thisTranslator;
	if (typeof thisTranslator.optionsForm.schema == 'undefined') return thisTranslator;
	
	for (var key in thisTranslator.optionsForm.schema) {
		if (typeof thisTranslator[key] == 'undefined') continue;
		if (["array", "object"].includes(thisTranslator.optionsForm.schema[key].type) && typeof thisTranslator[key] == "string") {
			// if the schema type is object or array, and the saved value is string, try to JSON.parse() it.
			thisTranslator.optionsForm.schema[key]['default'] = JSON.parse(thisTranslator[key]);
		} else {
			thisTranslator.optionsForm.schema[key]['default'] = thisTranslator[key];
		}
	}
	if (thisTranslator.id == "testEngine2") {
		console.log("%cafter assigning default :", "color:aqua", thisTranslator);
	}
	return thisTranslator;
	
}
	
options.translatorMenu.linkify = function(text) {
	return options.linkifyHtml(text);
}

options.translatorMenu.renderOptions = function(thisTranslator, $elm) {
	console.log("%cRendering options", "color:yellow;", thisTranslator.id)
	options.translatorMenu.assignDefault(thisTranslator);
	$elm ||= $("#"+thisTranslator.id+" .pluginOptions")
	$elm.empty();
	// append the default value into the form
	const optionsForm = {...thisTranslator.optionsForm, 
		...{
			value: thisTranslator.getOptionsFormValue(),
		}
	};
	var jsonForm = $elm.jsonForm(optionsForm);
	$elm.data("jsonForm", jsonForm);
	$elm.closest(".panelContent").data("translatorInfo", thisTranslator);

	console.log("rendering custom attr for translator engine:", thisTranslator.id, optionsForm);
	for (var key in optionsForm.schema) {
		var thisForm = optionsForm.schema[key];
		if (!thisForm.attr) continue;
		console.log("rendering attr for:", key);
		var $thisField = $elm.find(`[name="${key}"]`);
		for (var attrKey in thisForm.attr) {
			$thisField.attr(attrKey, thisForm.attr[attrKey]);
		}
	}

	$elm.find(".help-block").each(function() {
		$(this).html(options.translatorMenu.linkify($(this).html()));
		$(this).find("a[target=_system]").on("click", function(e) {
			e.preventDefault();
			nw.Shell.openExternal($(this).attr("href"));
		})
	});
	console.log(`Translator option: ${thisTranslator.id} JSON form:`, jsonForm);
	// to get the values:
	// jsonForm.root.getFormValues()
	// to set the values
	// let's create a function on translatorEngine to batch apply value	
}

/**
 * Set the value of a <select> element. If the value does not exist in the options,
 * a new option is added.
 *
 * @param {jQuery} $select - The jQuery object representing the <select> element.
 * @param {string} valueToSet - The value to set in the <select>.
 */
options.setSelectValue = function($select, valueToSet) {
	// Check if the value already exists in the options
	if ($select.find('option[value="' + valueToSet + '"]').length > 0) {
		// If it exists, simply set the value
		$select.val(valueToSet);
	} else {
		// If it doesn't exist, add a new option and then set the value
		$select.append($('<option>', {
			value: valueToSet,
			text: valueToSet
		}));
		$select.val(valueToSet);
	}
}

options.translatorMenu.configLoad = async function($panelContent, configName="") {
	console.log("Changing configuration to:", configName);
	const translatorInfo = $panelContent.data("translatorInfo");
	const $pluginOptions = $panelContent.find(".pluginOptions");
	//const jsonForm = $pluginOptions.data("jsonForm");

	const oldConfigName = 	translatorInfo.getOptions("activeConfiguration") || "";

	console.log("Save current configuration which is", oldConfigName);
	await options.translatorMenu.configSave($panelContent, oldConfigName);

	console.log("Old options:", JSON.stringify(translatorInfo.getOptions(), undefined, 2))
	console.log("Reset options");
	await translatorInfo.resetOptions();
	console.log("After reset:", JSON.stringify(translatorInfo.getOptions(), undefined, 2))

	var storageKey = `tlEngineConfig/${translatorInfo.id}`
	var existingConfig = await options.localStorage.get(storageKey) || {}
	var thisConfig = existingConfig[configName] || {}
	if (!thisConfig) {
		console.warn("No configuration found");
	}

	for (let i in thisConfig) {
		translatorInfo.update(i, thisConfig[i])
	}
	console.log("After setting value:", JSON.stringify(translatorInfo.getOptions(), undefined, 2))

	options.translatorMenu.renderOptions(translatorInfo, $pluginOptions);
	translatorInfo.update("activeConfiguration", configName);

	console.log("After everything:", JSON.stringify(translatorInfo.getOptions(), undefined, 2))

	return thisConfig;
}

options.translatorMenu.configSave = async function($panelContent, configName="") {
	if (!$panelContent?.length) return;
	const translatorInfo = $panelContent.data("translatorInfo");
	const $pluginOptions = $panelContent.find(".pluginOptions");
	const jsonForm = $pluginOptions.data("jsonForm");
	console.log("Saving config saveAs", translatorInfo, jsonForm);

	var storageKey = `tlEngineConfig/${translatorInfo.id}`
	console.log("Set: ", storageKey, "value:", jsonForm.root.getFormValues())
	var existingConfig = await options.localStorage.get(storageKey) || {}
	existingConfig[configName] = jsonForm.root.getFormValues()
	await options.localStorage.set(storageKey, existingConfig);
	return existingConfig;
}

options.translatorMenu.configSaveAs = async function($panelContent, configName="") {
	if (!$panelContent?.length) return;
	const translatorInfo = $panelContent.data("translatorInfo");
	const $pluginOptions = $panelContent.find(".pluginOptions");
	const jsonForm = $pluginOptions.data("jsonForm");
	console.log("Saving config saveAs", translatorInfo, jsonForm);
	if (!configName) {
		configName = prompt(t("Pleae select the name for your configuration."));
	}
	if (!configName) return;

	const result = await options.translatorMenu.configSave($panelContent, configName);
	options.setSelectValue($panelContent.find(".configurationControl .configSelector"), configName);
	return result;
}

/**
 * Renders select box of configuration selection
 * @param {JQuery} $panelContent - Jquery instance of panelContent
 * @param {string} defaultSelection - Selected configuration as default
 */
options.translatorMenu.renderConfigSelection = async function($panelContent, defaultSelection="") {
	const translatorInfo = $panelContent.data("translatorInfo");
	const $configSelector = $panelContent.find(".configurationControl .configSelector");
	$configSelector.empty();

	var storageKey = `tlEngineConfig/${translatorInfo.id}`
	var existingConfig = await options.localStorage.get(storageKey) || {}
	$configSelector.append(`<option value="">Default</option>`)
	for (let confName in existingConfig) {
		$configSelector.append(`<option value="${common.htmlEntities(confName)}">${common.htmlEntities(confName)}</option>`)
	}

	$configSelector.off("change");
	$configSelector.on("change", function() {
		console.log("Selection change, changing to configuration ", $(this).val());
		options.translatorMenu.configLoad($panelContent, $(this).val());
	})

	defaultSelection ||= translatorInfo.getOptions("activeConfiguration") || "";

	if (defaultSelection) options.setSelectValue( $configSelector, defaultSelection);

}

options.translatorMenu.init = function() {
	if (Array.isArray(trans.translator) == false) return false;
	console.log("Initializing translator engine's options");

	var translators = common.sort(TranslatorEngine.translators, "name", true);
	for (var i=0; i<translators.length; i++) {
		(()=> {
			var thisTranslator = translators[i];
			thisTranslator.description = thisTranslator.description||"";
			thisTranslator.author = thisTranslator.author||"Anonymous";
			thisTranslator.version = thisTranslator.version||"1.0";
			let thisIcon = thisTranslator.icon || 'mtl'
			let translatorType = thisTranslator.getOptions("translatorType") || "";
			if (translatorType) translatorType = `<span class="translatorType">(${translatorType})</span>`;
			var thisOption = {
				icon: thisIcon,
				tabClass: 'submenu translatorSetting hidden',
				tabContent:$("<h1 class='pluginTitle'><i class='icon-"+thisIcon+"'></i> "+thisTranslator.name+"</h1>\
							<div class='subtitle'>"+t("Translator Engine configuration")+translatorType+"</div>\
							<div class='authorBlock'>"+t("Translator engine version.")+" <span class='author'>"+thisTranslator.version+"</span></div>\
							<div class='versionBlock'>"+t("By.")+" <span class='engineVersion'>"+thisTranslator.author+"</span></div>\
							<p class='description'>"+thisTranslator.description+"</p>\
							<div class='configurationControl'></div>\
							<div class='pluginOptions'></div>")
			}
			
			if (typeof thisTranslator.onOptionSelected == "function") thisOption.onSelect = thisTranslator.onOptionSelected
			const tab = options.tab.insertAsChild(thisTranslator.id, thisTranslator.name, $(".langSetting"), thisOption);
			let $formContainer = tab.content.find(".pluginOptions");

			if (typeof thisTranslator.optionsForm == 'undefined') {
				$formContainer.html(t("No option for this engine"));
				return;
			}
			
			options.translatorMenu.renderOptions(thisTranslator, $formContainer);

			// ================================================================
			// Option manager section only available if enableOptionManager is TRUE
			if (!thisTranslator.getOptions("enableOptionManager")) return;
			if (thisOption.tabContent.parent().find(".configurationControl").html(`
				<span class='configurationLabel'>Manage configuration</span>
				<span class='configSelectorFieldWrapper'>
					<select type='search' class='configSelector'>
						<option value=''>Default</option>
					</select>
					<button class='configSave'>Save</button>
					<button class='configSaveAs'>Save As</button>
				</span>`));

			thisOption.tabContent.parent().find(".configurationControl .configSave").on("click", function() {
				options.translatorMenu.configSave($(this).closest(".panelContent"));

			});
			thisOption.tabContent.parent().find(".configurationControl .configSaveAs").on("click", function() {
				const $panelContent = $(this).closest(".panelContent");
				const currentConfigName = $panelContent.find(".configurationControl .configSelector").val();
				options.translatorMenu.configSaveAs($panelContent, currentConfigName);
				alert(`Configuration ${currentConfigName} saved!`);

			});

			options.translatorMenu.renderConfigSelection(tab.content);
	
		})()
	}
}

class ConfigControl extends BasicEventHandler {
	constructor(translatorEngine) {
		super();
		this.translatorEngine = translatorEngine;
	}
}

ConfigControl.prototype.init = function() {
	this.$elm = $(`
		<div class="bs5 form-group jsonform-formcontrol">
            <nav class="navbar bg-body-tertiary">
                <div class="container-fluid justify-content-end">
                    <div class="btn-group me-3" role="group">
                        <button class="btn btn-primary jsonform-save">Quick Save</button>
                        <button class="btn btn-primary jsonform-load">Quick Load</button>
                    </div>
                    <div class="btn-group me-3" role="group">
                        <button class="btn btn-primary jsonform-export">Export</button>
                        <button class="btn btn-primary jsonform-import">Import</button>
                    </div>
                    <button class="btn btn btn-outline-danger jsonform-reset">Reset</button>
                </div>
            </nav>
            <nav class="navbar bg-body-tertiary">
                <div class="container-fluid">
                    <div class="input-group">
                            <label class="input-group-text">Preset</label>
                        <select class="form-select custom-select jsonform-preset-list">
                            <optgroup label="Default Presets" class="defaultPresets">
                                <option value="default" selected>Default</option>
                            </optgroup>
                            <optgroup label="User's Presets" class="userPresets">
                            </optgroup>
                        </select>
                            <button type="button" class="btn btn-outline-secondary jsonform-preset-save" title="save"><i class="icon-save"></i></button>
                            <button type="button" class="btn btn-outline-secondary jsonform-preset-saveas" title="save-as"><i class="icon-save-as"></i></button>
                            <button type="button" class="btn btn-danger jsonform-preset-remove" title="delete"><i class="icon-trash"></i></button>
                    </div>
                </div>
            </nav>
        </div>`);
}


// ===================================================
// Handling addons options
// ===================================================
var AddonsOption = function(addons) {
	this.addons = addons || addonLoader.addons;
}
// Draw the list of addons
AddonsOption.prototype.initInstallFilter = function(defaultFilter) {
	const doFilter = (keyword)=> {
        $("#addons [data-id=online] .addonListWrapper > .listMember").filter(function() {
			$(this).toggle($(this).text().toLowerCase().indexOf(keyword) > -1)
		});
	}
    $("#addonInstallerSearch").off("input")
    $("#addonInstallerSearch").on("input", function() {
        var value = $(this).val().toLowerCase();
		doFilter(value);
    });

	doFilter(defaultFilter);
}

AddonsOption.prototype.initManagerFilter = function(defaultFilter) {
	const doFilter = (keyword)=> {
        $("#addons [data-id=installed] .addonListWrapper > .listMember").filter(function() {
			$(this).toggle($(this).text().toLowerCase().indexOf(keyword) > -1)
		});
	}
    $("#addonManagerSearch").off("input")
    $("#addonManagerSearch").on("input", function() {
        var value = $(this).val().toLowerCase();
		doFilter(value);
    });

	doFilter(defaultFilter);
}

AddonsOption.prototype.drawList = function() {
	var $container = $("#addons .installedAddons .addonListWrapper");
	var that = this;
	for (var id in this.addons) {
		var thisAddon = this.addons[id];
		var label 	= thisAddon.package.title || thisAddon.package.name;
		var author	 = thisAddon.package.author || "Unknown";
		var license	 = thisAddon.package?.license || "";
		if (typeof thisAddon.package.author?.name == "string") {
			author = author.name;
		}

		var licenseBlock = "";
		if (license) {
			licenseBlock = `<div class="licenseBlock">${t('License')}: ${license}</div>`;
		}
		var $template = $(`<div class="addonsOption addonList listMember">
			<div class="addonsIconBlock"></div>
			<div class="addonsInfoBlock">
				<div class='titleBlock'><span class="name">${label}</span><span class="ver">${thisAddon.package.version}</span></div>
				<div class="authorBlock">By. ${author}</div>
				${licenseBlock}
				<div class='descBlock'>${thisAddon.package.description}</div>
			</div>
			<div class="addonsAction"></div>
		</div>`)	
		$template.data('id', id)
		if (thisAddon.package.icon) {
			$template.find(".addonsIconBlock").append('<img class="addonsIcon" src="'+thisAddon.getWebLocation()+'/'+thisAddon.package.icon+'" alt="icon" />');
		} else {
			$template.find(".addonsIconBlock").append('<img class="addonsIcon" src="img/icon.png" alt="icon" />');
		}

		if (thisAddon.config.isMandatory) {
			var $lock = $("<i class='icon-lock' title='"+t("Can not disable this addon")+"'></i>")
			$template.find(".addonsAction").append($lock);
		} else {
		
			var $flipSwitch = $("<i class='iconToggle icon-toggle-on'></i>")
			if (thisAddon.config.isDisabled) {
				$flipSwitch.removeClass('icon-toggle-on');
				$flipSwitch.addClass('icon-toggle-off');
			}
			
			$template.find(".addonsAction").append($flipSwitch);
			
			$flipSwitch.on("click", function(e) {
				var addonId = $(this).closest(".addonList").data("id");
				if ($(this).hasClass('icon-toggle-on')) {
					$(this).removeClass('icon-toggle-on');
					$(this).addClass('icon-toggle-off');
					that.addons[addonId].setConfig("isDisabled", true)
				} else {
					$(this).removeClass('icon-toggle-off');
					$(this).addClass('icon-toggle-on');
					that.addons[addonId].setConfig("isDisabled", false)
					
				}
				options.needRestart = true;
			})
		}
		
		$container.append($template);
	}
	
	this.initManagerFilter($("#addonManagerSearch").val());
}


AddonsOption.prototype.drawOnlineList = async function(onlineList) {
	// check if updater is available
	if (!options.isUpdaterAvailable()) return;

	var $container = $("#addons [data-id=online] .addonListWrapper");
	$container.empty();
	options.busy();
	var fetchError = false;
	try{
		var homepage = (nw && nw.App && nw.App.manifest && nw.App.manifest.homepage) ? nw.App.manifest.homepage : "";
		if (typeof homepage !== "string" || !homepage.trim()) homepage = "https://dreamsavior.net";
		homepage = homepage.replace(/\/+$/, "");
		onlineList = onlineList || this.onlineList || await common.fetch(homepage + '/rest/addons/list/');
	} catch (e) {
		alert("Unable to fetch online list");
		onlineList = onlineList || {};
		fetchError = true;
	}
	if (!fetchError) this.onlineList = onlineList;
	console.log("online list is :", onlineList);
	var that = this;
	onlineList.list = onlineList.list || [];
	for (var id in onlineList.list) {
		var thisAddon = onlineList.list[id];
		var cost = thisAddon.patron_level || 0;
		if (thisAddon.purchase_type == "points") {
			cost = thisAddon.patron_points;
		}
		var iconPath = "<img src='/www/img/icon.png' class='addonsIcon' alt='' />";

		if (thisAddon.icon) {
			iconPath = "<img src='"+thisAddon.icon+"' class='addonsIcon' alt='' />";
		}
		
		var $template = $(`<div class="addonsOption addonList listMember">
			<div class="addonsIconBlock">${iconPath}</div>
			<div class="addonsInfoBlock">
				<div class='titleBlock'>
					<span class="name">${thisAddon.title}</span>
					<span class="ver">${thisAddon.version}</span>
				</div>
				<div class="authorBlock">by. ${thisAddon.author}</div>
				<div class='descBlock'>${thisAddon.description}</div>
				<div class="addonReq"><i class="icon-info-circled-1"></i><span>`+t('Requirements')+`: <span>  <span class="reqCost ${thisAddon.purchase_type}">`+cost+`</span> <span class="reqType noInvert" data-reqtype="${thisAddon.purchase_type}">${thisAddon.purchase_type}</span><a href="https://dreamsavior.net/docs/translator/faq/what-is-points-and-level/" class="noInvert" title="${t("What is this?")}" external><i class="icon-help-circled-1"></i></a></div>					

			</div>
			<div class="addonsAction">
				<div class="addonsActionBtn"></div>
			</div>
		</div>`);

		var isUnsupported = false;
		if (thisAddon.min_ver) {
			var $minver = $(`<div class="minVer"><i class="icon-info-circled-1"></i>Minimum Translator++ version: <span class="version">${thisAddon.min_ver}</span></div>`)
			$template.find(".addonReq").append($minver);

			if (common.versionToFloat(nw.App.manifest.version) < common.versionToFloat(thisAddon.min_ver)) isUnsupported = true;
		}

		$template.find("a[external]").on("click", function(e) {
			e.preventDefault();
			nw.Shell.openExternal($(this).attr("href"));
		});
		
		$template.attr('data-id', thisAddon.id)
		$template.data('id', thisAddon.id)
		$template.attr('data-name', thisAddon.name)
		$template.data('name', thisAddon.name)
		$template.data('addonInfo', thisAddon)
		var $installButtons;
		
		if (addonLoader.getByName(thisAddon.name)) {
		//if (AddonInstaller.isInstalled(thisAddon.id)) {
			var installedVersion = addonLoader.getByName(thisAddon.name).package.version;
			$installButtons = [$(`<div class='addon-installedVer'>Installed ver. ${installedVersion}</div>`)]
			var $installBtn =$("<button class='addon-uninstall'><i class='icon-cancel-circled'></i> Uninstall</button>")
			$installButtons.push($installBtn);
		
			$installBtn.on("click", async function() {
				var thisName = $(this).closest('.addonsOption').data("name");
				var conf = confirm(t("Uninstall")+` ${thisName}?`);
				if (!conf) return;
				
				options.busy();
				var thisId = $(this).closest('.addonsOption').data("id");
				//await addonLoader.uninstall(AddonInstaller.getRootAddonDir(thisId));
				await addonLoader.uninstall(addonLoader.getByName(thisName));
				AddonInstaller.configUninstall(thisId);
				await that.drawOnlineList();
			});


			try {
				
				console.log("Addon:", thisAddon.name);
				console.log("current version:", common.versionToFloat(thisAddon.version) );
				console.log("installed version:", common.versionToFloat(installedVersion));
				if (common.versionToFloat(thisAddon.version) > common.versionToFloat(installedVersion)) {
					// update
					console.log("%cshow update flag", "color:orange", thisAddon);
					if (isUnsupported) {
						const $updateBtn = $("<button class='addon-unsupported' disabled><i class='icon-cancel-circled'></i> Please update your Translator++ to install the addon</button>");
						$installButtons.push($updateBtn)
					} else {
						const $updateBtn = $("<button class='addon-update noInvert'><i class='icon-arrows-cw'></i> Update</button>");
						$installButtons.push($updateBtn)
			
						$updateBtn.on("click", async function() {
							var thisName = $(this).closest('.addonsOption').data("name");
							var conf = confirm(t("Update")+` ${thisName}?`);
							if (!conf) return;
							
							options.busy();
							// uninstall
							var thisId = $(this).closest('.addonsOption').data("id");
							//await addonLoader.uninstall(AddonInstaller.getRootAddonDir(thisId));
							await addonLoader.uninstall(addonLoader.getByName(thisName));
							AddonInstaller.configUninstall(thisId);

							// install
							thisId = $(this).closest('.addonsOption').data("id");
							var addonInstaller = new AddonInstaller(parseInt(thisId));
							var installOption = {
								onError: async function(message, result) {
									window.opener.ui.alert(message, "options");
								},
								onSuccess: async function() {
									window.opener.ui.alert(t("Addon successfully installed.\r\nTranslator++ may need to be restarted for some addon to take effect."), "options");
									console.log("reloading addon");
									await addonLoader.loadAll();
								}
							}
							await addonInstaller.install(undefined, installOption);
							console.log("refreshing online list")
							await common.wait(500);
							await that.drawOnlineList();
						});
					}
				}
			} catch(e) {
				console.warn("Unable to get package version of "+thisAddon.name, e)
			}
		} else if (isUnsupported) {
			// unsupported
			$installButtons = $("<button class='addon-unsupported' disabled><i class='icon-cancel-circled'></i> Please update your Translator++ to install the addon</button>");
		} else {
			// install
			$installButtons = $("<button class='addon-install noInvert'><i class='icon-download-cloud-1'></i> Install</button>")
		
			//console.log("drawing install button", thisAddon);
			if (thisAddon.purchase_type == "points") {
				updater.user.points = updater.user.points || 0;
				thisAddon.patron_points = thisAddon.patron_points || 0;
				//console.log(`User points: ${updater.user.points} addonPoints = ${thisAddon.patron_points}`);
				if (updater.user.points < thisAddon.patron_points) {
					console.log("User points less then required");
					$installButtons.prop("disabled", true);
				}
			}

			$installButtons.on("click", async function() {
				console.log("installing addon", $(this).closest('.addonsOption').data());
				const addonInfo = $(this).closest('.addonsOption').data("addonInfo");
				const thisId 		= addonInfo.id;
				const addonName 	=  addonInfo.name;
				const addonInstaller = new AddonInstaller(parseInt(thisId));
				//var thisAddon = onlineList.list[thisId];
				if (addonInfo?.is_parser_change == "yes") {
					let conf = confirm(t(`WARNING!\n`)+t(`This add-on has marked as "parser change". Your old project related to this add-on may no longer worked as expected. It is advised to backup your project before installing this add-on.\nYou can import your existing translation into the newly created project.\n\nDo you wish to install `)+addonName+`?`);
					if (!conf) return;
				} else {
					let conf = confirm(t(`Do you want to install `) +addonName);
					if (!conf) return;
				}

				options.busy();

				var installOption = {
					onError: async function(message, result) {
						window.opener.ui.alert(message, "options");
					},
					onSuccess: async function() {
						window.opener.ui.alert(t(`Add-on`)+` ${addonName} `+t(`is installed successfully.\r\nTranslator++ may need to be restarted for some addon to take effect.`), "options");
						console.log("reloading addon");
						await addonLoader.loadAll();
					}
				}
				await addonInstaller.install(undefined, installOption);
				console.log("refreshing online list")
				await common.wait(500);
				await that.drawOnlineList();
			});
		}
		
		$template.find(".addonsActionBtn").append($installButtons);	


		$container.append($template);
		
	}
	this.initInstallFilter($("#addonInstallerSearch").val());
	options.busyNot();
}

// Drawing the form
AddonsOption.prototype.findForm = function(optionsForm, key) {
	optionsForm.form = optionsForm.form || [];
	for (var i=0; i<optionsForm.form.length; i++) {
		optionsForm.form[i].key = optionsForm.form[i].key|| ""
		if (optionsForm.form[i].key == key) return i;
	}
}
AddonsOption.prototype.camelCaseToWords = function(text) {
	var result = text.replace( /([A-Z])/g, " $1" );
	var finalResult = result.charAt(0).toUpperCase() + result.slice(1);
	return 	finalResult;
}

AddonsOption.prototype.generateFromMini = function(optionsForm) {
	// generates minified json form to full json form
	console.info("generate from mini", optionsForm);
	if (typeof optionsForm.schema !== 'undefined') return optionsForm
	console.log("pass here");
	var form = [];
	for (var key in optionsForm) {
		var thisData = {};
		thisData.key = key;
		
		// enum
		if (Array.isArray(optionsForm[key].enum)) {
			thisData.titleMap = {};
			if (optionsForm[key].preventAutoCamelCase) {
				for (let i=0; i<optionsForm[key].enum.length; i++) {
					thisData.titleMap[optionsForm[key].enum[i]] = optionsForm[key].enum[i]
				}
			} else {
				for (let i=0; i<optionsForm[key].enum.length; i++) {
					thisData.titleMap[optionsForm[key].enum[i]] = this.camelCaseToWords(optionsForm[key].enum[i])
				}
			}

		}
		// array
		if (optionsForm[key].type == "array") {
			thisData.type = "checkboxes";
			if (optionsForm[key].enum && Boolean(optionsForm[key].items)==false) {
				optionsForm[key].items = {
					enum : optionsForm[key].enum
				};
				
			}
		}
		// radio
		if (optionsForm[key].type == "radio" || optionsForm[key].type == "radios") {
			optionsForm[key].type = "string"
			thisData.type = "radios";
		}
		
		// checkbox
		if (optionsForm[key].inlinetitle) thisData.inlinetitle = optionsForm[key].inlinetitle
		
		form.push(thisData);
	}	
	var result = {
		schema:optionsForm,
		form:form
	}
	
	console.info("result : ", result);
	return result;
}

AddonsOption.prototype.renderCustomSchema = function(optionsForm, thisAddon) {
	if (typeof optionsForm == 'undefined') return optionsForm;
	if (typeof optionsForm.schema == 'undefined') return optionsForm;
	console.log("before assigning default :", optionsForm);
	for (var key in optionsForm.schema) {
		var formKey = this.findForm(optionsForm, key);
		var thisForm = optionsForm.form[formKey]
		var onChangeAdd = [];
		var onClickAdd = [];
		
		if (typeof optionsForm.schema[key] == 'undefined') continue;
		//addon.optionsForm.schema[key]['default'] = addon[key];
		
		if (typeof optionsForm.schema[key]['default'] == "function") {
			optionsForm.schema[key]['default'] = optionsForm.schema[key]['default'].call(thisAddon);
		}


		if (typeof thisForm.onInput == 'function') {
			onChangeAdd.push('thisForm.onInput.call(thisAddon, $(evt.target))')	
		}
		
		
		if (typeof optionsForm.schema[key]['onChange'] == "function") {
			console.warn("Rendering on change");
			onChangeAdd.push("("+optionsForm.schema[key]['onChange'].toString()+").apply($(evt.target), arguments)");
		}
		
		if (typeof optionsForm.schema[key]['HOOK'] == "undefined") {
			optionsForm.schema[key]['HOOK'] = "thisAddon.config['"+key+"']";
		}

		if (typeof optionsForm.schema[key]['HOOK'] == "function") {
			optionsForm.schema[key]['default'] = optionsForm.schema[key]['HOOK'].call(thisAddon);
		} else if (typeof optionsForm.schema[key]['HOOK'] == "string") {
			optionsForm.schema[key]['default'] = eval(optionsForm.schema[key]['HOOK']);
			
			console.log("assigning hook for", key);
			if (optionsForm.schema[key].type == 'boolean') {
				onChangeAdd.push('console.log("onChange boolean type")');
				
				onChangeAdd.push('var value = $(evt.target).prop("checked");')	
				onChangeAdd.push(optionsForm.schema[key]['HOOK']+` = value;`)	

			} else if (thisForm.type == 'radios') {
				onChangeAdd.push('console.log("onChange radios type")');
				onChangeAdd.push('var value = $(evt.target).closest(".controls").find("input[type=radio]:checked").val();')	
				onChangeAdd.push(optionsForm.schema[key]['HOOK']+` = value;`)	
				
			} else if (optionsForm.schema[key].type == 'array') {
				onChangeAdd.push('console.log("onChange array type")');
				onChangeAdd.push('var value = $(evt.target).val();')	
				onChangeAdd.push(optionsForm.schema[key]['HOOK']+` = value;`)
				
			} else {
				onChangeAdd.push('console.log("onChange string type")');
				
				onChangeAdd.push(optionsForm.schema[key]['HOOK']+` = $(evt.target).val();`)	
			}
		} 
	
	
		if (onChangeAdd.length > 0) {
			thisForm.onChange = eval (` (evt) => {
				var field = $(evt.target);
				`+onChangeAdd.join("\n")+`}`);	
			//console.log("generated onChange :", key, thisForm.onChange);
		}
		if (onClickAdd.length > 0) {
			thisForm.onChange = eval (` (evt) => {
				var field = $(evt.target);
				`+onClickAdd.join("\n")+`}`);	
			//console.log("generated onChange :", key, thisForm.onChange);
		}
		
	}
	console.info("%cafter assigning default :", "color:green", thisAddon.id, optionsForm);
	return optionsForm;
	
}

/**
 * Assign default value of the JSONform
 * @param {*} optionsForm 
 * @param {*} thisAddon 
 */
AddonsOption.prototype.assignDefault = function(optionsForm, thisAddon) {
	if (!optionsForm?.schema) return;
	for (let key in optionsForm.schema) {
		let thisConfig = thisAddon.getConfig(key);
		if (typeof thisConfig == "undefined") continue;
		if (optionsForm.schema[key].type == "array") {
			console.log("%cassigning array", "color:aqua", key, thisConfig);
		}
		optionsForm.schema[key].default = thisConfig;
	}
}
	
AddonsOption.prototype.linkify = function(text) {
	return options.linkifyHtml(text);
}
	
AddonsOption.prototype.init = function() {
	if (Array.isArray(trans.translator) == false) return false;
	
	addonLoader = addonLoader || {};
	addonLoader.addons = addonLoader.addons || {};
	var that = this;


	for (var addonId in addonLoader.addons) {
		var addon = addonLoader.addons[addonId];
		addon.package 			= addon.package || {};
		addon.package.name 		= addon.package.name||"";
		addon.package.title 	= addon.package.title||addon.package.name||"";
		addon.package.description = addon.package.description||"";
		addon.package.author 	= addon.package.author||{name:"Anonymous", email:""}
		addon.package.version 	= addon.package.version||"1.0";
		addon.optionsForm 		= addon.optionsForm||{}

		var thisOptionForm = addon.optionsForm
		if (typeof addon.optionsForm == "function") thisOptionForm = addon.optionsForm.call(addon, options)
		addon.config = addon.config || {}
		
		if (addon.config.isDisabled) continue;

		console.log("drawing option menu for addon : ", addon);
		options.tab.insertAsChild(addonId, addon.package.title, $(".addonSetting"), {
			icon:'box',
			tabClass:'submenu addonOptionMember hidden',
			tabContent:$("<h1 class='pluginTitle'>"+addon.package.title+"</h1>\
						<div class='subtitle'>Add-on configuration</div>\
						<div class='authorBlock'>"+t("Add-on version.")+" <span class='engineVersion'>"+addon.package.version+"</span></div>\
						<div class='versionBlock'>"+t("By.")+" <span class='author'>"+addon.package.author.name+"</span></div>\
						<p class='description'>"+addon.package.description+"</p>\
						<div class='pluginOptions'></div>")
		});
		
		const $pluginOptions = $("#"+CSS.escape(addonId)+" .pluginOptions");
		
		console.log("addon", addonId, thisOptionForm, !Object.keys(thisOptionForm).length);
		if (!Object.keys(thisOptionForm).length == false) {
			console.log($pluginOptions);
			if ($pluginOptions.length > 0) {
				if (!thisOptionForm.form) {
					thisOptionForm = this.generateFromMini(thisOptionForm);
					this.renderCustomSchema(thisOptionForm, addon);
				} else {
					this.assignDefault(thisOptionForm, addon);
				}

				console.info("Creating form with option", thisOptionForm);
				$pluginOptions.jsonForm(thisOptionForm);
				
				// open url to external browser
				$pluginOptions.find(".help-block").each(function() {
					$(this).html(that.linkify($(this).html()));
					$(this).find("a[target=_system]").on("click", function(e) {
						e.preventDefault();
						nw.Shell.openExternal($(this).attr("href"));
					})
				});

				// rendering custom attrribute : attr
				console.log("rendering custom attr for:", thisOptionForm);
				for (var key in thisOptionForm.schema) {
					var thisForm = thisOptionForm.schema[key];
					if (!thisForm.attr) continue;
					console.log("rendering attr for:", key);
					//var $thisField = $thisOptionSet.find(`[name="${key}"]`);
					var $thisField = $pluginOptions.find(`[name="${key}"]`);
					for (var attrKey in thisForm.attr) {
						$thisField.attr(attrKey, thisForm.attr[attrKey]);
					}
				}

				$pluginOptions.find("input[type=range]").each(function() {
					var $this 		= $(this);
					var $thisParent = $this.parent();
					var $wrapper 	= $(`<div class='fullWidth flex rangeWrapper'><output></output></div>`);
					$wrapper.find("output").text($this.val());
					$wrapper.prepend($this);
					$thisParent.prepend($wrapper);
					$this.on("input", function() {
						console.log("on input listener");
						$(this).next().html($(this).val());
					})
				});
			}

		}
		
		if (addon.optionsFormHtml) {
			$pluginOptions.append(addon.optionsFormHtml);
		}

		if ($pluginOptions.children().length == 0) $pluginOptions.html(t("No option for this add-on"));
	
		
	}
	
	this.drawList();
}


options.addonsOption = new AddonsOption();







// ===================================================
// Handling ABOUT
// ===================================================
options.about = {};
options.about.init = function() {
	let config = sys.app||nw.App.manifest
	const version = config.version	
	$("#about .version").text(version);
	
	$("#about .viewChangelog").on("click", async ()=> {
		let changelog = fs.readFileSync('changelog.txt', 'utf8');
		$("#about .changelog").text(changelog);
	});
	
	$("#about .nwVersion").text(process.versions.nw);
	$("#about .nodeVersion").text(process.versions.node);
	$("#about .phpVersion").text(sys.phpVersion);
	$("#about .archVersion").text(process.arch);
	
	//var rbVersion = "";
	if (typeof window.spawn  == "undefined") {
		window.spawn = require('child_process').spawn;
	}
	
	var child = window.spawn(nw.App.manifest.localConfig.ruby, ['www\\rb\\getVersion.rb']);
	//var child = spawn("ruby\\bin\\ruby.exe", ['www\\rb\\getVersion.rb']);
	var outputBuffer = "";
	child.stdout.on('data', function (data) {
		console.log("data : ", data);
		outputBuffer += data;
	});	
	child.on('close', function (code) {
		console.log("closed");
		$("#about .rubyVersion").text(outputBuffer);
	});		
	
	$(".licenseLink").attr("href", "file://"+__dirname+"/LICENSE.txt")
	
}


var Association = require("associate-ext");
var thisOptions = {
	iconIndex: nw.App.manifest.localConfig.iconIndex
	,defaultIconIndex : nw.App.manifest.localConfig.defaultIconIndex
}
console.log("thisOptions", thisOptions);
options.association = new Association(nw.App.manifest.localConfig.extensions,thisOptions);
options.association.init = function() {
	var thisAssoc = options.association.getAssociation();
	$(".associateBtn.submit").off("click");
	$(".associateBtn.setAll").off("click");
	$(".associateBtn.unsetAll").off("click");
	const $table = $(".extensionTable");
	$table.empty();
	$table.append("<tr><th>Extension</th><th>Associate</th></tr>");
	for (var ext in thisAssoc) {
		var $thisRow = $('<tr><th>'+ext+'</th><td class="formFld"></td></tr>');
		var $checkBox = $('<input type="checkbox" data-ext="'+ext+'" value="'+ext+'" class="flipSwitch associate ext_'+ext+'" name="associate['+ext+']" />');

		$checkBox.prop("checked", thisAssoc[ext]);

		$thisRow.find(".formFld").append($checkBox);
		$table.append($thisRow);
	}

	$(".associateBtn.unsetAll").on("click", function() {
		$(".extensionTable input.associate").prop("checked", false);
	});
	$(".associateBtn.setAll").on("click", function() {
		$(".extensionTable input.associate").prop("checked", true)
	});
	
	$(".associateBtn.submit").on("click", function() {
		var $checkBox = $(".extensionTable input.associate");
		var ext = [];
		for (var i=0; i<$checkBox.length; i++) {
			if ($checkBox.eq(i).prop("checked")) {
				ext.push($checkBox.eq(i).data("ext"));
			}
		}
		
		var conf = confirm(t("Translator++ will write Window's registry.\r\nAre you sure?"));
		if (conf) options.association.setExtension(ext);
	});

	return $table;
}


options.initUiLanguageSelector = function() {
	var docLocation = "www/lang/options.json";
	var $wrapper = $("#uiLanguage");
	$wrapper.off("input");
	var langData = {};
	fs.readFile(docLocation, (err, data)=> {
		if (err) return console.info('unable to read ', docLocation);
		
		try {
			langData = JSON.parse(data);
		} catch (e) {
			console.info("unable to parse lang options");
		}
		
		for (var code in langData) {
			let $option = $("<option value='"+code+"'>"+langData[code].name+"</option>")
			$wrapper.append($option);
		}
		
		$wrapper.val(lt.getConfig("lang") || "default");
	
	});	
	$wrapper.on("input", function() {
		var lang = $(this).val();
		console.log("language selected", lang);
		console.log("translation data : ", langData);
		lt.save("lang", lang);
		lt.from(langData[lang].location);
		options.requestRestart();
	})

}


options.initSpellCheckLanguage = async function() {
	options.initLanguageList();
	var $spellCheckLanguage = $("#spellCheckLanguage");
	$spellCheckLanguage.val(sys.getConfig("spellCheckLang"));
	$spellCheckLanguage.off("change");
	$spellCheckLanguage.on("change", function() {
		console.log("spellCheck changed", $(this).val());
		window.opener.ui.changeEditorLanguage($(this).val());
		sys.setConfig("spellCheckLang", $(this).val());
	});
}

var EscaperPattern = function() {
	sys.config.escaperPatterns = sys.config.escaperPatterns || [];
	this.$elm = $("#customEscaper");
	this.init();
}

EscaperPattern.prototype.reset = function() {
	const defaultPattern = window.opener.HexPlaceholder.initDefaultPattern(true);
	sys.config.escaperString = window.opener.HexPlaceholder.joinRenderedFormula(defaultPattern);
	this.editor.setValue(sys.config.escaperString);
	this.commit();
}

EscaperPattern.prototype.clear = function() {
	window.opener.HexPlaceholder.setActiveFormulas([]);
	sys.config.escaperString = "";
	this.editor.setValue(sys.config.escaperString);
	this.commit();
}

EscaperPattern.prototype.setValue = function(val) {
	sys.config.escaperString = val;
	var result = [];
	try {
		var rendered = window.opener.HexPlaceholder.parseStringTemplate(val);
		console.log("rendered", rendered);
		var pattern = window.opener.HexPlaceholder.renderedFormulaToStrings(rendered);
		console.log("rendered to string", pattern);
		for (var i in pattern) {
			result.push({
				value:pattern[i]
			})
		}
		sys.config.escaperPatterns = result;
	
		window.opener.HexPlaceholder.renderedFormulas = []
		// eslint-disable-next-line
		MiniEditor.patterns = window.opener.HexPlaceholder.getActiveFormulas() || [];
		//this.miniEditor.trigger();
	} catch (e) {
		console.warn(e);
		var conf = confirm(t("Error parsing patterns:")+e.toString()+`\nDo you want to revert the pattern into default?`);
		if (conf) {
			this.reset();
		}
	}
	return result;
}

EscaperPattern.prototype.toText = function() {
	if (sys.config.escaperString) return sys.config.escaperString;

	// initialize from sys.config.escaperPatterns
	sys.config.escaperPatterns = sys.config.escaperPatterns || [];
	var texts = [];
	for (var i in sys.config.escaperPatterns) {
		if (!sys.config.escaperPatterns[i].value) continue;
		texts.push(sys.config.escaperPatterns[i].value);
	}
	console.log("pattern : ", texts);
	return texts.join(",\n");
}

EscaperPattern.prototype.commit = function() {
	var value = this.editor.getValue();
	this.setValue(value);
	this.renderHighlight(value, this.editor);
}

EscaperPattern.prototype.renderHighlight = (text, editor)=> {
	editor 	= editor || this.testEditor;
	if (!editor) return;
	text	= text || editor.getValue();
	var clearMarker = (editor) => {
		const prevMarkers = editor.session.getMarkers();
		if (prevMarkers) {
			const prevMarkersArr = Object.keys(prevMarkers);
			for (let item of prevMarkersArr) {
				editor.session.removeMarker(prevMarkers[item].id);
			}
		}
	}
	var rules = window.opener.HexPlaceholder.getActiveFormulas();
	var possitions = [];
	for (var i=0; i<rules.length; i++) {
		if (!rules[i]) continue;
		
		if (typeof rules[i] == 'function') {
			var arrayStrings = rules[i].call(this, text);
			if (typeof arrayStrings == 'string') arrayStrings = [arrayStrings];
			if (Array.isArray(arrayStrings) == false) continue;

			for (var x in arrayStrings) {
				text = text.replaceAll(arrayStrings[x], function(match) {
					if (!match) return match;
					var start 	= arguments[arguments.length-2];
					var end 	= start + match.length;
					possitions.push({
						start:editor.session.doc.indexToPosition(start),
						end  :editor.session.doc.indexToPosition(end)
					});
					return match;
				});				
			}
			continue;            
		}
		
		text = text.replaceAll(rules[i], function(match) {
			if (!match) return match;
			var start 	= arguments[arguments.length-2];
			var end 	= start + match.length;
			console.log("start", start, "end", end);
			possitions.push({
				start:editor.session.doc.indexToPosition(start),
				end  :editor.session.doc.indexToPosition(end)
			});
			return match;
		});

	}
	console.log("possitions:", possitions);
	clearMarker(editor);
	if (possitions.length > 0) {
		for(var posIdx=0; posIdx<possitions.length; posIdx++) {
			var thisPos = possitions[posIdx];
			editor.session.addMarker(
				new window.ace.Range(thisPos.start.row, thisPos.start.column, thisPos.end.row, thisPos.end.column),
				"testHighlight",
				"text",
				true
			);
		}
	}

}

EscaperPattern.prototype.init = function() {
	/*
	this.miniEditor = new MiniEditor($('.dvEditor'));
	MiniEditor.patterns = window.opener.HexPlaceholder.getActiveFormulas()
	*/
	//var that = this;
	/*
	$fld = $(".customEscaperFld");
	$fld.val(this.toText());
	$fld.on("change", function() {
		that.setValue($(this).val());
	})*/
	//var Range = ace.require("ace/range").Range;

	var editor = window.ace.edit($(".customEscaperFld")[0]);
	editor.setTheme("ace/theme/monokai");
	editor.session.setMode("ace/mode/javascript");
	editor.setShowPrintMargin(false);
	editor.session.on('changeMode', function(e, session){
        if ("ace/mode/javascript" === session.getMode().$id) {
            if (session.$worker) {
                session.$worker.send("setOptions", [{
                    "asi":true,
					"expr":true
                }]);
            }
        }
    });
	editor.setOptions({
		fontSize: "12pt"
	});
	editor.on("blur", ()=> {
		this.commit();
	});
	editor.setValue(this.toText() || "");
	this.editor = editor;


	var initTestEditor = ()=> {
		var editor = window.ace.edit($("#patternTester")[0]);
		editor.setTheme("ace/theme/monokai");
		editor.session.setMode("ace/mode/text");
		editor.setShowPrintMargin(false);
		editor.setOptions({
			fontSize: "12pt"
		});
		editor.lastSampleRender = 0;
		editor.on("change", ()=> {
			clearTimeout(editor.timeOutRender);
			editor.timeOutRender = setTimeout(async ()=> {
				this.renderHighlight(editor.getValue(), editor);
			},300);
			/*
			if (Date.now() < editor.lastSampleRender+1000) return;
			renderHighlight(editor.getValue(), editor);
			editor.lastSampleRender = Date.now();
			*/
		});
		editor.on("blur", ()=> {
			this.renderHighlight(editor.getValue(), editor);
			localStorage.setItem("options.escaperPattern.sample", editor.getValue());
		});
		var defaultVal = localStorage.getItem("options.escaperPattern.sample") || ""
		editor.setValue(defaultVal);
		if (defaultVal) this.renderHighlight(defaultVal, editor);
		this.testEditor = editor;
		return editor;
	}
	this.testerEditor = initTestEditor();

	this.$elm.find(".clearEscaper").off("click");
	this.$elm.find(".clearEscaper").on("click", ()=> {
		var conf = confirm(t(`Do you really want to clear the custom escaper?`));
		if (!conf) return;
		this.clear();
	});

	this.$elm.find(".resetEscaper").off("click");
	this.$elm.find(".resetEscaper").on("click", ()=> {
		var conf = confirm(t(`Do you really want to reset the custom escaper?`));
		if (!conf) return;
		this.reset();
	});
}

// ===================================================
// CLASS Autoset
// ===================================================

var Autoset = function() {
	
}
Autoset.prototype.init = function() {
	$(document).ready(function() {	
		$("[data-autoset]").each(function() {
			var $this = $(this);
			//if ($this[0].tagName == "select")
			try {
				if ($this.attr("type") == "checkbox") {
					$this.prop("checked", Boolean(common.varAsStringGet($this.attr('data-autoset'))));
				} else if (["INPUT", "SELECT"].includes($this.prop("tagName")) == false) {
					$this.text(common.varAsStringGet($this.attr('data-autoset')));
				} else {
					$this.val(common.varAsStringGet($this.attr('data-autoset')));
				}
			} catch (e) {
				//do nothing
			}
		});
		
		$("[data-autoset]").on("change.autoset", function(e) {
			console.log("Autoset triggered!");
			var $this = $(this);
			if ($this.data("autoset") == "") return;
			
			// var autosetPath = $this.data('autoset').split(".")
			// if (autosetPath.length < 1) return;
			
			// console.log("autoset path : ", autosetPath);
			// var thisObj = window;
			// for (let i=0; i<autosetPath.length-1; i++) {
			// 	thisObj = thisObj[autosetPath[i]];
			// 	console.log("accessing "+autosetPath[i], thisObj);
			// 	if (typeof thisObj == "undefined") {
			// 		thisObj[autosetPath[i]] = {};
			// 		thisObj = thisObj[autosetPath[i]];
			// 	}
				
			// }
			// console.log("setting up : "+autosetPath[autosetPath.length-1], $this.val());
			
			// if ($this.attr("type") == "checkbox") {
			// 	thisObj[autosetPath[autosetPath.length-1]] = $this.prop("checked");
			// } else {
			// 	thisObj[autosetPath[autosetPath.length-1]] = $this.val();
			// }
			if ($this.attr("type") == "checkbox") {
				common.setPropertyByPath(window, $this.data('autoset'), $this.prop("checked"), true);
			} else {
				common.setPropertyByPath(window, $this.data('autoset'), $this.val(), true);
			}

			// triggering onafterset
			if ($this.data("onafterset")) {
				let AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
				let thisFunc = new AsyncFunction($this.data("onafterset"));
				thisFunc.call($this);
			}

		})
	});
}

options.autoset = new Autoset();
options.autoset.init();


options.busy = function() {
	options.isBusy = true;
	return new Promise((resolve, reject) => {
		$("#busyOverlay").fadeIn( 200, ()=>{
			resolve();
		})
	});
	
}
options.busyNot = function() {
	options.isBusy = false;
	return new Promise((resolve, reject) => {
		$("#busyOverlay").fadeOut( 200, ()=>{
			resolve();
		})
	});
}


options.UpdateUI = function() {
	this.$baseElm = $();
}
/**
 * Evaluate whether the auto-update controls should be enabled.
 * Auto update is restricted to registered users (level > 0).
 */
options.UpdateUI.prototype.evalUpdateAccess = function() {
	if (!options.isUpdaterAvailable()) return;

	const user = updater.getUser();
	const level = parseInt(user?.level) || 0;
	const hasAccess = level > 0;

	const $autoUpdate = $(".autoUpdateFlag");
	const $allowReinstall = $(".allowReinstallUpdate");

	if (!hasAccess) {
		if ($autoUpdate.prop("checked")) {
			$autoUpdate.prop("checked", false).trigger("change");
		}
		if ($allowReinstall.prop("checked")) {
			$allowReinstall.prop("checked", false).trigger("change");
		}
		$autoUpdate.prop("disabled", true);
		$allowReinstall.prop("disabled", true);
		$(".updateAccessNotice").removeClass("hidden");
	} else {
		$autoUpdate.prop("disabled", false);
		$allowReinstall.prop("disabled", false);
		$(".updateAccessNotice").addClass("hidden");
	}
}

options.UpdateUI.prototype.evalUpdateButton = function() {
	this.$baseElm.find(".updateStatus > div").addClass("hidden");
	if (sys.config.autoUpdateReinstall) {
		this.$baseElm.find(".updateStatus .pendingUpdate").removeClass("hidden");
	} else {
		if (info.isUpToDate()) {
			this.$baseElm.find(".updateStatus .upToDate").removeClass("hidden");
		} else {
			this.$baseElm.find(".updateStatus .pendingUpdate").removeClass("hidden");
		}
	}
}

options.UpdateUI.prototype.evalLastChecked = function() {
	this.$baseElm.find(".updateLastChecked").html(common.formatDate(new Date(info.getLastCheckedUpdate())));
}

options.UpdateUI.prototype.onUpdateStart = function() {
	this.$baseElm.find(".updateNow").prop("disabled", true);
	
	this.$baseElm.find(".updateNow > i").addClass("rotating-slow");
	this.$baseElm.find(".updateNow > span").html("updating");
	this.$baseElm.find(".updateProcess").removeClass("hidden");
	this.$baseElm.find(".updateProcess").html("Updating...");
	
}

options.UpdateUI.prototype.onUpdateEnd = function() {
	this.$baseElm.find(".updateNow").prop("disabled", false);
	
	this.$baseElm.find(".updateProcess").html("");
	this.$baseElm.find(".updateNow > span").html("Update now");
	this.$baseElm.find(".updateNow > i").removeClass("rotating-slow");
	this.$baseElm.find(".updateProcess").addClass("hidden");
	this.evalUpdateButton();	
}

options.UpdateUI.prototype.setUserAvatar = function() {
	if (!options.isUpdaterAvailable()) return;

	console.warn("user loaded");
	$("#userinfo .username").html(updater.getUser().display_name || "click to login");
	$("#userinfo .userLevel").html(updater.getUser().level || "0");
	$("#userinfo .userPoints").html(updater.getUser().points || "0");
	
	$("#userinfo .defaultUserPicture").removeClass("hasAvatar");		
	if (updater.getUser().localAvatar) {
		$("#userinfo .defaultUserPicture").addClass("hasAvatar");		
	}
	var imgPath = updater.getUser().localAvatar || "/www/img/transparent.png" ;
	console.warn("setting avatar : ", imgPath);
	$("#userinfo .userPicture").attr("src", imgPath);
}
options.UpdateUI.prototype.setUserName = function() {
	if (!options.isUpdaterAvailable()) return;

	if (!updater.user) return;
	console.log("Set username", updater.getUser().display_name);
	$("#userinfo .username").html(updater.getUser().display_name || "login");	

	this.renderUserDetailedInfo();
}

options.UpdateUI.prototype.renderUserDetailedInfo = async function() {
	// Increment call counter so any previously started concurrent call can detect it is stale
	// and discard its result, preventing out-of-order async responses from overwriting correct UI state.
	this._renderDetailCallId = (this._renderDetailCallId || 0) + 1;
	const thisCallId = this._renderDetailCallId;

	console.log("%c rendering user detailed info:", "color:yellow;", JSON.stringify(updater.getUser()));
	const $userInfoContent = $("#userinfocontent");

	const userInfo = await updater.getUserInfo();

	// Discard this result if a newer call was made while we were awaiting
	if (thisCallId !== this._renderDetailCallId) return;

	// getUserInfo() can occasionally return falsy when called early in the options window
	// lifecycle even though the user is logged in. Fall back to the synchronous getUser()
	// which is always up to date.
	const effectiveUserInfo = userInfo?.id ? userInfo : updater.getUser();

	if (effectiveUserInfo?.id) {
		$userInfoContent.find(".notLoggedIn").addClass("hidden");
		$userInfoContent.find(".loggedIn").removeClass("hidden");
	} else {
		$userInfoContent.find(".notLoggedIn").removeClass("hidden");
		$userInfoContent.find(".loggedIn").addClass("hidden");
	}

	const $userFld = $userInfoContent.find("[data-fld]");
	$userFld.each(function() {
		const $this = $(this);
		const fld = $this.data("fld");
		if (fld == "avatar") {
			$this.attr("src", effectiveUserInfo?.localAvatar || "www/img/transparent.png");
		} else {
			$this.text(effectiveUserInfo?.[fld] || "");
		}
	});

	if (effectiveUserInfo?.declined) {
		$userInfoContent.find(".declined").removeClass("hidden");
		$userInfoContent.find(".success").addClass("hidden");
	} else {
		$userInfoContent.find(".declined").addClass("hidden");
		$userInfoContent.find(".success").removeClass("hidden");
	}

}

options.UpdateUI.prototype.init = function() {
	if (!options.isUpdaterAvailable()) return;
	$("#userinfo").removeClass("hidden");
	this.$baseElm = $("#updaterBlock");
	$("#userinfo .username").html(updater.getUser().display_name || "login");
	$("#userinfo .loadingSymbol").addClass("hidden");
	/*
	updater.onAvatarReady((imgPath)=> {
		imgPath = imgPath || "www/img/blank.png" ;
		$("#userinfo .userPicture").attr("src", imgPath);
	});
	*/
	this.setUserName();
	this.setUserAvatar();
	
	updater.onBeforeLoginSuccessFunctions = updater.onBeforeLoginSuccessFunctions || [];
	updater.onBeforeLoginSuccessFunctions[0] = () => {
		console.log("Trigger on before login");
		$("#userinfo .loadingSymbol").removeClass("hidden");
	}

	updater.onLoginSuccessFunctions = updater.onLoginSuccessFunctions || [];
	updater.onLoginSuccessFunctions[0] = () => {
		this.setUserAvatar();
		this.setUserName();
	}

	
	updater.onUserLoadedFunctions = updater.onUserLoadedFunctions || [];
	updater.onUserLoadedFunctions[0] = () => {
		this.setUserAvatar();
		this.setUserName();
		$("#userinfo .loadingSymbol").addClass("hidden");
		this.evalUpdateAccess();
	}
	updater.onUserLoadingFunctions = updater.onUserLoadingFunctions || [];
	updater.onUserLoadingFunctions[0] = () => {
		$("#userinfo .loadingSymbol").removeClass("hidden");
	}
	
	if (updater.isUpdating) {
		this.onUpdateStart();
	}
	
	updater.onUpdateStart(()=> {
		this.onUpdateStart();
	})
	updater.onUpdateEnd(()=> {
		this.onUpdateEnd();
	})
	
	this.$baseElm.find(".updateCheckNow").on("click", async () => {
		const $this = this.$baseElm.find(".updateCheckNow");
		$this.find("i").addClass("rotating-slow");
		await window.top.info.updateNotification({force:true});
		this.evalLastChecked();
		this.evalUpdateButton();
		$this.find("i").removeClass("rotating-slow");
	});
	
	this.$baseElm.find(".updateNow").on("click", async () => {
		if (this.$baseElm.find(".updateNow").prop("disabled")) return;
		if (info.isUpToDate()) {
			var conf = confirm(t("You are currently on the latest version.\nDo you still want to update?"));
			if (!conf) return;
		}
		const updateIsSuccess = await updater.update({
			type:"manual",
			onStart : ()=> {
				this.onUpdateStart();
			},
			onFetchUrl : ()=> {
				this.$baseElm.find(".updateProcess").html("Fetching information...");
			},			
			downloadOptions: {
				onProgress : (status) => {
					this.$baseElm.find(".updateProcess").html("Downloading patch "+status.percent+"%");
				},
				onEnd : ()=> {
					this.$baseElm.find(".updateProcess").html("Download completed");
				}
			},
			onExtract : ()=> {
				this.$baseElm.find(".updateProcess").html("Patching");
			},
			onEnd : ()=> {
				this.onUpdateEnd();
			},
			onFail : (errorId, message)=> {
				alert(`Update failed!\nReason:${message}\nPlease see console log(F12) for more information.`);
			}
			
		});
		options.busy();
		await common.wait(2000);
		options.busyNot();
		if (updateIsSuccess) alert("Translator++ is successfully updated, please restart your Translator++.");
	});
	//this.$baseElm.find(".updateLastChecked").html(common.formatDate(new Date(info.getLastCheckedUpdate())));
	this.evalLastChecked();
	if (Updater.config.debugMode == false && Boolean(info.debugVersion)==false) this.evalUpdateButton();

	// add event listener for user info
	const $userInfoContent = $("#userinfocontent");
	$userInfoContent.off("beforeShown");
	$userInfoContent.on("beforeShown", () => {
		console.log("userinfo content shown");
		this.renderUserDetailedInfo();

	});


	// listen to login button
	$userInfoContent.find(".loginButton").off("click");
	$userInfoContent.find(".loginButton").on("click", async () => {
		if (!options.isUpdaterAvailable()) return;
		options.busy();
		try {	
			await updater.login();
		} catch (error) {
			console.error("Login failed", error);
		}
		options.busyNot();

	});

	// login with browser
	$userInfoContent.find(".loginWithBrowserButton").off("click");
	$userInfoContent.find(".loginWithBrowserButton").on("click", async () => {
		if (!options.isUpdaterAvailable()) return;
		const conf = confirm(t("This option will open your default browser to login.\nDo you want to continue?"));
		if (!conf) return;

		// Start browser login; pass a callback so we know when the auto token arrives
		updater.login({
			tokenLogin: true,
			onTokenReceived: () => {
				// Token received automatically via browser callback - close manual prompt and show busy overlay
				bsClosePrompt(null);
				options.busy();
			}
		});

		// Show a manual-token prompt while waiting for the automatic callback
		const manualToken = await bsTextAreaPrompt(
			t("Login with Browser"),
			t("Your browser has been opened to <b>dreamsavior.net/gettoken/</b>.<br>The login will complete automatically once you log in.<br><br>If the automatic login does not work, copy your token from that page and paste it below:"),
			{ isCancelable: true }
		);

		if (manualToken === null) {
			// Prompt was closed programmatically because the token arrived automatically.
			// Busy overlay is already shown; just wait for avatarReady to clear it.
			updater.one("avatarReady", () => {
				options.busyNot();
			});
			return;
		}

		if (manualToken === false) {
			// User cancelled the prompt - stop the automatic token listener
			updater.stopTokenListener();
			return;
		}

		if (manualToken) {
			// User pasted a token manually - stop the automatic listener to prevent overlap
			updater.stopTokenListener();
			options.busy();
			await updater.loginByToken(manualToken);
			updater.one("avatarReady", () => {
				options.busyNot();
			});
		}
	});

	// listen to logout button
	$userInfoContent.find(".logoutButton").off("click");
	$userInfoContent.find(".logoutButton").on("click", async () => {
		if (!options.isUpdaterAvailable()) return;
		const conf = confirm("Logout current user?");
		if (!conf) return;
		options.busy();
		updater.one("avatarReady", () => {
			options.busyNot();
		});		
		await updater.logout();
		await this.renderUserDetailedInfo();
		this.evalUpdateAccess();
		options.busyNot();
	});

	// run once for the first time
	this.evalUpdateAccess();
	this.renderUserDetailedInfo();
}
options.updateUI = new options.UpdateUI();


var ExpanderButton = function(elements) {
	this.elements = elements || $(".panel-left .expanderButton");
	this.init();
}

ExpanderButton.prototype.expandAll = function() {
	if (this.allExpanded) return;
	var that = this;
	this.elements.each(function() {
		that.toggle($(this), true);
	});
	this.allExpanded = true;
}


ExpanderButton.prototype.toggle = function($button, expand) {
	if (typeof expand == 'undefined') {
		// auto toggle
		expand = !$button.hasClass('isExpanded');
	}

	var $targets;
	try {
		$targets = $($button.attr('data-expand'));
	} catch (e) {
		$targets = $();
	}

	if (expand) {
		console.log("expanding child", $button.attr('data-expand'), $targets.length);
		// expand child
		$button.removeClass('icon-right-dir')
		$button.addClass('icon-down-dir')
		$button.addClass('isExpanded');
		$targets.removeClass("hidden");
	} else {
		// collapse child
		console.log("collapsing child", $button.attr('data-expand'),$targets.length);

		$button.removeClass('icon-down-dir')
		$button.addClass('icon-right-dir')
		$button.removeClass('isExpanded');
		$targets.addClass("hidden");
		ExpanderButton.allExpanded = false;
	}
}

ExpanderButton.prototype.init = function() {
	var thisExpanderButton = this;
	this.elements.each(function() {
		const $this = $(this);
		$this.addClass("expanderTogler");
		$this.attr("title", "Click to expand/collapse");
		if ($this.is(".rendered")) return;
		
		$this.on("click", function() {
			console.log("expander button clicked");
			thisExpanderButton.toggle($(this));
		});
		
		$this.closest(".selectable").on("dblclick", function() {
			console.log("expander button clicked");
			thisExpanderButton.toggle($(this).find(".expanderTogler"));			
		})

		$this.addClass("rendered");
	})
}

options.hasError = function() {
	if ($("#sl").hasClass("error")) {
		return "There is an error on Source Language field!\nPlease make sure that the field is not empty.";
	}	
	if ($("#tl").hasClass("error")) {
		return "There is an error on Target Language field!\nPlease make sure that the field is not empty.";
	}
}

options.drawListContent = function() {
	var $lists = $(".tabMenu.list li[data-for]");
	$lists.each(function() {
		var $tabMenu = $(this);
		if ($tabMenu.find(".contains").length > 0) return;
		var target = $tabMenu.attr("data-for");
		var $tabContent = $(`#${CSS.escape(target)}`);
		if (!$tabContent.length) return;

		var $contains = $(`<span class="hidden contains"></span>`);
		$contains.text($tabContent.text().replace(/\s+/g, ' '));

		$tabMenu.append($contains);
	})
}

options.initList = function() {
	if (this.listIsInitialized) return;
	this.busy();
	console.log("Initializing list");
	this.drawListContent();
	window.commandOption = {
		valueNames: [
			'menuTitle',
			'contains',
			{ data: ['keyword'] }
		]
	};	
	this.menus = new window.List('leftMenu', window.commandOption);
	this.menus.reIndex();
	this.menus.on("searchStart", function() {
		console.log("Search start", arguments);
		options.expanderButton.expandAll();
	})

	this.listIsInitialized = true;
	this.busyNot()
}

options.init = async function() {
	$(".logIntoFile").prop("checked", logger.getConfig("replaceConsole"));
	$(".logTruncate").prop("checked", logger.getConfig("truncate"));

	$(".logIntoFile").on("change", function() {
		logger.setConfig("replaceConsole", $(this).prop("checked"))
		options.requestRestart()
	})
	$(".logTruncate").on("change", function() {
		logger.setConfig("truncate", $(this).prop("checked"))
		options.requestRestart()
	});

	// Application Settings - chromium-args flags
	const _getManifest = async function() {
		const fs = require('fs').promises;
		const content = await fs.readFile('package.json', 'utf-8');
		return JSON.parse(content);
	};
	const _saveManifest = async function(manifest) {
		const fs = require('fs').promises;
		await fs.writeFile('package.json', JSON.stringify(manifest, null, 4), 'utf-8');
	};
	const _toggleChromeArg = async function(flag, enabled) {
		const manifest = await _getManifest();
		let args = manifest['chromium-args'] || '';
		let argsArray = args.split(' ').filter(function(a) { return a.trim() !== ''; });
		const hasFlag = argsArray.some(function(a) { return a === flag || a.startsWith(flag.split('=')[0]+'='); });
		if (enabled && !hasFlag) {
			argsArray.push(flag);
		} else if (!enabled && hasFlag) {
			argsArray = argsArray.filter(function(a) { return a !== flag && !a.startsWith(flag.split('=')[0]+'='); });
		} else {
			return; // no change needed
		}
		manifest['chromium-args'] = argsArray.join(' ');
		await _saveManifest(manifest);
		options.requestRestart();
	};

	// Init states from current manifest
	const _chromiumArgs = (nw.App.manifest['chromium-args'] || '');
	$(".enableRemoteDebugging").prop("checked", /--remote-debugging-port(=|\s|$)/.test(_chromiumArgs));
	$(".disableGpu").prop("checked", /--disable-gpu(\s|$)/.test(_chromiumArgs));

	$(".enableRemoteDebugging").on("change", function() {
		_toggleChromeArg('--remote-debugging-port=9222', $(this).prop("checked"));
	});
	$(".disableGpu").on("change", function() {
		_toggleChromeArg('--disable-gpu', $(this).prop("checked"));
	});

	// set initial focus;
	// consume optionWindowFocus localstorage
	var focus = localStorage.getItem("optionWindowFocus");
	localStorage.removeItem("optionWindowFocus");

	console.log("focus", focus);
	if (focus) {
		focus = JSON.parse(focus);
		// options.expanderButton.expandAll();

		// select item
		if (focus.menu) {
			console.log("selecting menu", focus.menu);
			options.tab.select(focus.menu, true);
		}

		if (focus.find) {
			console.log("finding", focus.find);
			options.tab.findInActiveContent(focus.find);
		}
	}

}

$(document).ready(function() {
	try {
		common.addEventHandler(options);
		options.dvField = new DVField();
		options.dvField.init();
		options.initUiLanguageSelector()	
		options.expanderButton = new ExpanderButton();	
		options.escaperPatterns = new EscaperPattern()
	} catch (e) {
		console.warn("Error on initializing option window:", e);
		alert("Error on initializing option window, please see the console log to view the detailed information.");
		options.busyNot();
	}

	var thisTranslator = sys.config.translator||trans.project.options.translator;
	if (Boolean(thisTranslator) == false) alert(t("There is no default translator selected.\nChange the default translator to Google!"));
	
	$("#commonReferenceFile").val(trans.getTemplatePath());
	$("#stagingPath").val(sys.config.stagingPath);
	$("#stagingPath").on("change", function() {
		var conf = confirm(t("Change Stagging Path to :")+$(this).val());
		if (!conf) {
			$(this).val(sys.config.stagingPath);
			return;
		}
		var oldStaggingPath = sys.config.stagingPath;
		sys.config.stagingPath = $(this).val();
		sys.saveConfig();

		conf = confirm(t("Move the content of current Stagging Path into the new one?"));
		if (!conf) return;
		// moving the data
		options.busy()
		.then(()=>{
			return common.copy(oldStaggingPath, sys.config.stagingPath, 
			function(result){
				console.log(result)
				options.busyNot()
			})	
		});	
		//sys.config.stagingPath = $(this).val();
	})
	
	// render horizontal tabs
	$(".horizTabMenu").each(function(e) {
		var $tabMenu = $(this);
		var $targetTabWrapper = $("[data-id='"+$tabMenu.data("for")+"']");
		$tabMenu.children().each(function(e) {
			var $tabButton = $(this);
			
			$tabButton.on('click', function() {
				$tabMenu.trigger("tabChange");
				$(this).trigger("tabSelected");
				var $targetTabContent = $targetTabWrapper.find("[data-id='"+$(this).data("for")+"']");
				$tabMenu.children().removeClass("selected");
				$(this).addClass("selected");
				$targetTabWrapper.children().addClass("hidden");
				$targetTabContent.removeClass("hidden");
			})
		});
		
		$tabMenu.children().eq(0).trigger("click")
	})
	
	$(".installAddonFrom").on("change", function() {
		var files = $(this).val().split(";")
		addonLoader.install(files)
		.then(() => {
			options.requestRestart();
			alert(t("Addon(s) has been installed.\nTranslator++ is need to be restarted to take effect."));
		});
	})
	
	// $("#userinfo").on("click", function() {
	// 	if (!options.isUpdaterAvailable()) return;
	// 	var conf;
	// 	if (updater.getUser().id) {
	// 		conf = confirm("Logout current user?");
	// 		if (!conf) return;
	// 		updater.logout();
	// 		return;
	// 	}
		
	// 	conf = confirm("Do you want to login?");
	// 	if (!conf) return;
	// 	updater.login();
	// });
	
	$(".horizTabMenu [data-for=online]").on("tabSelected", async function() {
		console.log("online tab selected");
		await options.addonsOption.drawOnlineList();
	})

	$(".menuPanelSearch").on("focus", function() {
		console.log("field focused");
		options.initList();
	})

	$("#clearAllSettings").on("click", function(e) {
		var conf = confirm(t("Do you really want to clear all settings and reset Translator++ to default?\nPlese note that this action is irreversible.\nPlease backup your project before proceeding."));
		if (!conf) return;
		sys.hardReset();
	});

	
	try {	
		options.drawTranslatorSelector($("#defaultTransEngine"), thisTranslator);
		options.translatorMenu.init();
		options.addonsOption.init();
		options.tab.init();
		options.tab.select($(".tabMenu li.selectable").eq(0));
		options.about.init();
		options.association.init();
		options.updateUI.init();
		options.initSpellCheckLanguage();
		options.init();
		options.busyNot();
	} catch (e) {
		console.warn("Error on initializing option window:", e);
		alert("Error on initializing option window, please see the console log to view the detailed information.");
		options.busyNot();
	}

	console.log("initializing open external");

	setTimeout(function() {
		$("a.externalLink, a[external]").on("click", function(e) {
			console.warn("clicked")
			e.preventDefault();
			nw.Shell.openExternal($(this).attr("href"));
		})
	}, 50)


});


win.on('close', async function() {
	for (var i=0; i<options.__onBeforeClose.length; i++){
		var funct = options.__onBeforeClose.shift();
		funct.call(options);
	}
	if (options.hasError()) {
		var conf = confirm(options.hasError()+"\n"+t("Translator++ may not work normally if you don't fix the error.\nDo you want to close the options Window?"));
		if (!conf) return;
	}
	options.isNeedRestart();


	// Hide the window to give user the feeling of closing immediately
	this.hide();
	if (nw.process.versions["nw-flavor"] == "sdk") {
		win.closeDevTools();
		await common.wait(200);
	}
	//await sys.saveConfig();
	//await common.wait(200);
	// unregister this window on parent window.
	// sending event to main window
	
	/**
	 * Triggered when option window is closed
	 * @event ui#optionsWindowClosed
	 * @since 4.3.20
	 */
	window.opener.ui.trigger("optionsWindowClosed");
	if (typeof window.opener.ui.windows.options !== 'undefined') window.opener.ui.windows.options = undefined;

	this.close(true);

});