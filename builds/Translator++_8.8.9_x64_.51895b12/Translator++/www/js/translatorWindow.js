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
window.gui = require('nw.gui');
var win = nw.Window.get();
var translator = {
	isAlwaysOnTop: false,
	cache:{
		index:[],
		data:{}
	},
	last:{
		text:"",
		translation:{}
	},
	clipboard :gui.Clipboard.get(),
	timer:{}
	
};


translator.setConfig = function(key, value) {
    this.config = this.config || {};
    this.config[key] = value;
    localStorage.setItem("transAggregatorConf", JSON.stringify(this.config))
    return true
}

translator.getConfig = function(key) {
    if (!this.config) this.config = JSON.parse(localStorage.getItem("transAggregatorConf")) || {};
    return this.config[key];
}

translator.getParentOptions = function() {
	const param = JSON.parse(localStorage.getItem("transAggregatorParam") || "{}");
	// remove the localStorage to prevent it from being used again
	localStorage.removeItem("transAggregatorParam");
	return param;
}

translator.getActiveTranslators = function() {
	return this.getConfig("activeTranslators") || [];
}

translator.isTranslatorActive = function(translatorId) {
	if (this.getActiveTranslators().includes(translatorId)) return true;
	return false;
}

translator.toggleTranslator = function(translatorId, status) {
	if (typeof status == "undefined") {
		// auto toggle
		var lastState = this.isTranslatorActive(translatorId);
		status = !lastState;
	}

	var activeTranslators = this.getActiveTranslators();
	if (status) {
		// on
		if (!this.isTranslatorActive()) activeTranslators.push(translatorId);
	} else {
		// off
		activeTranslators = activeTranslators.filter(item => ![translatorId].includes(item))
	}
	this.setConfig("activeTranslators", activeTranslators);
	
}


translator.isInFrame = function() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }	
}


if (!translator.isInFrame()) {
	win.restore(); // restore if minimized
	win.show(); // show if hidden

	win.setResizable(true);
	//win.height = 320;
	//win.width = 640;
	let options = translator.getParentOptions();
	if (options.posTop) win.y = Math.ceil(options.posTop);
	if (options.posLeft) win.x = Math.ceil(options.posLeft);
	win.show();
	window.trans = window.opener.trans;
	window.consts = window.opener.consts;
	window.romaji = window.opener.romaji;	
	window.php = window.opener.php;	
	window.autoload = window.opener.autoload;	
	
} else {
	window.trans = window.top.trans;
	window.consts = window.top.consts;
	window.romaji = window.top.romaji;
	window.php = window.top.php;
	window.autoload = window.top.autoload;
	

}

translator.column = function(num) {
	num = num||1;
	if (num < 1) num = 1;
	if (num > 4) num = 4;
	
	$(".mainPane .column").removeClass("col2 col3 col4").addClass("col"+num);
	
}


translator.getParameters = function() {
	return decodeURIComponent(window.location.hash.substr(1));
}

translator.alwaysOnTop = function(stat) {
	if (typeof stat == 'undefined') {
		if (translator.isAlwaysOnTop) {
			win.setAlwaysOnTop(false);
			translator.isAlwaysOnTop = false;
			$(".always-on-top").removeClass("checked");
		} else {
			win.setAlwaysOnTop(true);
			translator.isAlwaysOnTop = true;
			$(".always-on-top").addClass("checked");
			
		}
	} else {
		if (Boolean(stat) == false) {
			win.setAlwaysOnTop(false);
			translator.isAlwaysOnTop = false;
			$(".always-on-top").removeClass("checked");
		} else {
			win.setAlwaysOnTop(true);
			translator.isAlwaysOnTop = true;
			$(".always-on-top").addClass("checked");
		}
	
	}
}

translator.portletSwitchStatus = function(portlet, mode) {
	// portlet is portlet ID or object of portlet
	if (typeof portlet == 'string') portlet = $(".mainPane [data-id='"+portlet+"']");
	if (mode == "status" ) {
		portlet.find(".portlet-content").addClass("hidden");
		portlet.find(".portlet-status").removeClass("hidden");
	} else {
		portlet.find(".portlet-content").removeClass("hidden");
		portlet.find(".portlet-status").addClass("hidden");
	}
	return portlet;
}

translator.portletSetStatus = function(portlet, html) {
	if (typeof portlet == 'string') portlet = $(".mainPane [data-id='"+portlet+"']");
	return portlet.find(".portlet-status").html(html);
}

translator.translateAll = function(text) {
	if (!text) return false;

	translator.last.text = text;
	translator.last.translation = {};
	
	
	$(".mainPane [data-id='original'] .portlet-content").text(text);
	translator.portletSwitchStatus('original', "result");
	
	for (var i=0; i<trans.translator.length; i++) {
		var transEngine = trans.translator[i];
		//if (trans[transEngine].isDisabled == true) continue;
		if (!this.isTranslatorActive(transEngine)) continue;
		if (typeof trans[transEngine].translate !== 'function') continue;
		
		translator.portletSwitchStatus(transEngine, "status");
		translator.portletSetStatus(transEngine,"<div class='loadingTranslation animate-spin'></div>");
		trans[transEngine].translate(text, {
			onAfterLoading:function(data) {
				var result = data.translation.join($DV.config.lineSeparator);
				console.log(result);
				translator.last.translation[this.id] = result;
				console.log('$(".mainPane [data-id=\'"+'+this.id+'+"\'] .portlet-content")');
				$(".mainPane [data-id='"+this.id+"'] .portlet-content").text(result);
				translator.portletSwitchStatus(this.id, "result");
			}
		});
	}
}

translator.toggleAutoClipboard = function(state) {
	if (typeof state == 'undefined') {
		state = false;
		if (Boolean(translator.timer.autoClipboard) == false) state = true;
	}
	
	if (state) {
		console.log("switch on autoClipboard");
		translator.timer.autoClipboard =  setInterval(function() {
			var thisText = translator.clipboard.get();
			if (!thisText) return false;
			if (translator.lastClipboard == thisText) return false;
			if (common.containJapanese(thisText) == false) return false;
			
			console.log("translating : "+thisText);
			translator.lastClipboard = thisText;
			translator.translateAll(thisText);
			//translator.translateAll(text);
			
		}, 500);
		$(".menu-button.clipboard_copy").addClass("checked");
	} else {
		console.log("switch off autoClipboard");
		if (typeof translator.timer.autoClipboard !== 'undefined') {
			clearInterval(translator.timer.autoClipboard);
			translator.timer.autoClipboard = undefined;
		}
		$(".menu-button.clipboard_copy").removeClass("checked");
		
	}
}

translator.getPortletOrder = function() {
    // Returns array of portlet IDs in saved order, or null if not set
    try {
        return JSON.parse(localStorage.getItem("translatorPortletOrder")) || null;
    } catch (e) {
        return null;
    }
};

translator.setPortletOrder = function(orderArr) {
    // orderArr: array of portlet IDs
    localStorage.setItem("translatorPortletOrder", JSON.stringify(orderArr));
};

translator.doRepositioning = function() {
	var portlets = $(".mainPane .column .portlet");
	for (var i=0; i<portlets.length; i++) {
		if (i<10) {
			portlets.eq(i).find(".portlet-header .portlet-shortcut").text("alt+"+i);
			portlets.eq(i).find(".portlet-header .portlet-shortcut").removeClass("hidden");
			
		} else {
			portlets.eq(i).find(".portlet-header .portlet-shortcut").addClass("hidden");
		}
	}
}

translator.drawCards = function() {
	console.log("drawing cards");
	$(".mainPane .column").empty();

	// Build the list of all possible portlet IDs
	var allPortletIds = ["original"];
	for (var i = 0; i < trans.translator.length; i++) {
		allPortletIds.push(trans.translator[i]);
	}

	// Get saved order, if any
	var savedOrder = translator.getPortletOrder();
	var portletOrder = [];
	if (savedOrder && Array.isArray(savedOrder)) {
		// Only keep IDs that still exist, and preserve order
		portletOrder = savedOrder.filter(function(id) {
			return allPortletIds.includes(id);
		});
		// Append any new portlets not in saved order
		allPortletIds.forEach(function(id) {
			if (!portletOrder.includes(id)) portletOrder.push(id);
		});
	} else {
		portletOrder = allPortletIds.slice();
	}

	// Render portlets in order
	for (var i = 0; i < portletOrder.length; i++) {
		var portletId = portletOrder[i];
		var template = $("#template .column .portlet").clone(true, true);

		if (portletId === "original") {
			template.find(".portlet-header .portlet-title").text("Original text");
			template.addClass("original");
		} else {
			if (!trans[portletId]) continue; // skip if not found
			template.find(".portlet-header .portlet-title").text(trans[portletId].name);
			template.addClass(portletId);
			if (!this.isTranslatorActive(portletId)) template.addClass("disabled");
		}
		template.attr("data-id", portletId);
		template.data("id", portletId);

		$(".mainPane .column").append(template);
	}

	translator.doRepositioning();

    $(".column").sortable({
		connectWith: ".column",
		handle: ".portlet-header",
		cancel: ".portlet-toggle",
		placeholder: "portlet-placeholder ui-corner-all",
		start: function(e, ui) {
			console.log(arguments);
			ui.placeholder.css("width", ui.item.outerWidth());
			ui.placeholder.css("height", ui.item.outerHeight());
		},
		stop: function(e, ui) {
			// Save new order to localStorage
			var newOrder = [];
			$(".mainPane .column .portlet").each(function() {
				var id = $(this).attr("data-id");
				if (id) newOrder.push(id);
			});
			translator.setPortletOrder(newOrder);
			translator.doRepositioning();
		}
    });

    $( ".portlet" )
		.addClass( "ui-widget ui-widget-content ui-helper-clearfix ui-corner-all" )
		.find( ".portlet-header" )
		.addClass( "ui-widget-header ui-corner-all" )
		.each(function() {
			var portlet = $(this).closest('.portlet');
			var iconClass = portlet.hasClass('disabled') ? 'ui-icon-plusthick' : 'ui-icon-minusthick';
			$(this).prepend("<span title='Toggle portlet' class='btn-portlet-toggle ui-icon " + iconClass + " portlet-toggle'></span>");
		});

    // DRY: Reusable function to toggle portlet enabled/disabled state
    translator.togglePortlet = function(portlet) {
        var $portlet = (portlet instanceof $) ? portlet : $(portlet).closest(".portlet");
        var $icon = $portlet.find(".portlet-toggle");
        $icon.toggleClass("ui-icon-minusthick ui-icon-plusthick");
        $portlet.toggleClass("disabled");
        var id = $portlet.data("id");
        if ($portlet.hasClass("disabled")) {
            translator.toggleTranslator(id, false);
        } else {
            translator.toggleTranslator(id, true);
        }
    };

    // Toggle on icon click
    $(".portlet-toggle").on("click", function(e) {
        translator.togglePortlet($(this).closest(".portlet"));
        e.stopPropagation(); // Prevent bubbling to header
    });

    // Toggle on header double-click
    $(".portlet-header").on("dblclick", function(e) {
        // Only toggle if not clicking the toggle icon itself
        if (!$(e.target).hasClass("portlet-toggle")) {
            translator.togglePortlet($(this).closest(".portlet"));
        }
    });
}



translator.initPane = async function() {
	await autoload.until("completed");
	translator.drawCards();
	translator.translateAll(translator.getParameters());
}


$(document).ready(function() {
	console.log("translatorWindow.js loaded");
	if (translator.isInFrame()) {
		$("body").addClass("inFrame");
	} else {
		$("body").addClass("detachedFrame");
	}

	$(".toolbar-content.toolbar1 .menu-button").on("click", function(e) {
		$(".toolbar-content.toolbar1 .menu-button").removeClass("checked");
		$(this).addClass("checked");
		translator.column($(this).attr("data-for"));
	});
	
	$(".always-on-top").on("click", function(e) {
		translator.alwaysOnTop();
	});
	$(".menu-button.clipboard_copy").on("click", function(e) {
		translator.toggleAutoClipboard();
	})
	
	$(".menu-button.dock").on("click", function(e) {
		window.close();
	})
	
	//translator.translateAll(translator.getParameters());
	//translator.drawCards();
	translator.initPane();
});

$(window).on('hashchange', function(e) {
	console.log(translator.getParameters());
	translator.translateAll(translator.getParameters());
});	

win.on('close', function() {
	// if inside frame, do nothing
	if (translator.isInFrame) this.close(true);
	
	// Hide the window to give user the feeling of closing immediately
	this.hide();
	window.opener.ui.dockTranslatorPane(translator.last.text,true);
	// unregister this window on parent window.
	window.opener.ui.windows.translator = undefined;

	// After closing the new window, close the main window.
	this.close(true);

});
