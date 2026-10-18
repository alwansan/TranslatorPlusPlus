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
var nwPath = require("path"); // eslint-disable-line
const Search = function() {
	try {
		this.config = JSON.parse(localStorage.getItem('search.config'));
	} catch (e) {
		// do nothing.
	}
	this.config = this.config || {};
	if (typeof this.config.alwaysOnTop == 'undefined') this.config.alwaysOnTop = true;
	this.config.blurOpacity = this.config.blurOpacity || 0.7
};
var search = new Search();

search.setConfig = function(key, value) {
	this.config[key] = value;
	this.saveConfig();
}

search.getConfig = function(key) {
	return this.config[key];
}

search.saveConfig = function() {
	localStorage.setItem('search.config', JSON.stringify(this.config));
}
search.blurOpacity = search.getConfig('blurOpacity');

var win = nw.Window.get();
win.restore(); // restore if minimized
win.show(); // show if hidden
win.setResizable(true);
win.height = 340;
win.width = 640;

if (win.y < 0) win.y = 0;
if (win.x < 0) win.x = 0;
//win.setResizable(false);
console.log("current Y", win.y, win.y < 0);
setTimeout(()=>{
	if (win.y < 0) win.y = 0;
	win.setMinimumSize(640, 340)
	console.log("current Y", win.y);
	try {
		var lastPos = window.localStorage.getItem("searchWindowPossition");
		if (!lastPos) return;
		lastPos = JSON.parse(lastPos);
		console.log("Setting window position", lastPos);

		win.x = lastPos.x;
		win.y = lastPos.y;
	} catch(e) {
		//do nothing
	}
}, 200)

win.setAlwaysOnTop(search.getConfig('alwaysOnTop'));
win.setShowInTaskbar(false);
win.setMinimumSize(530, 260);

var sys 	= window.opener.sys;
var trans 	= window.opener.trans;
var ui 		= window.opener.ui;
var UiTags 	= window.opener.UiTags;

search.getSelectedResult = function() {
	var $activeTab = $(".ui-tabs-panel[aria-hidden=false]")
	var $selected = $activeTab.find(".findItemSelector:checked");
	var data = [];
	$selected.each(function() {
		var $this = $(this);
		var thisData = $this.data();
		thisData.file = $this.closest(".resultContext").data("id")
		data.push(thisData);
	})
	return data;
}

search.toggleTargetSearchOptions = function() {
	const $findMenu = $("#find");
	$findMenu.toggleClass("targetExpanded");
}

/**
 * Replaces \r\n\t with carriage return, new line or tab
 * @param  {String} text 
 * @returns {String} transpiled text
 */
search.transpileText = function(text) {
	console.log("Transpiling text", text);
	text = text || "";
	text = text.replaceAll("\\r", "\r");
	text = text.replaceAll("\\n", "\n");
	text = text.replaceAll("\\t", "\t");
	console.log("After transpile:", text);
	return text;
}

search.initFileSelectorDragSelect = function() {
	var DragSelect = DragSelect||require("dragselect");

	const toggleCheck = function(elm) {
		//console.log($(elm));
		//console.log(this);
		var $elm = $(elm);
		// ignore selection if selecting less than 2 row
		var orig = this._initialCursorPos.x+","+this._initialCursorPos.y;
		var after = this._newCursorPos.x+","+this._newCursorPos.y;
		if (orig == after) return false;
		if ($elm.length <= 1) return false; 
		$elm.each(function() {
			var $input = $(this).find("input");
			if ($input.prop("disabled")) return;

			if (search.shiftPressed) {
				$input.prop("checked", false);
			} else {
				$input.prop("checked", true);
			}			
			$input.trigger("change");
			window.ds.clearSelection();
		})
	}

	const $fileSelectors = $(".fileSelector")
	for (let i=0; i<$fileSelectors.length; i++) {
		let thisSelector = $fileSelectors[i]
		window.ds = new DragSelect({
			selectables		: document.querySelectorAll('.selectable'),
			autoScrollSpeed	: 15,
			area 			: thisSelector,
			callback 		: toggleCheck
		});	
	}

	if (search.fileSelectorIsInitialized) return;
	// tracking shift key
	window.onkeyup = function(e) {
		if (e.keyCode == 16) search.shiftPressed = false;
		//console.log("canceled");
	}

	window.onkeydown = function(e) {
		if (e.shiftKey) search.shiftPressed = true;
		//console.log("do");		
	}
	search.fileSelectorIsInitialized = true;
}

search.getKeyboardStatus = function(keyboard) {
	if (keyboard == "shift") return search.shiftPressed;
}

search.checkGroup = function($selectFld, action) {
	var $allCheckbox = $selectFld.closest('.resultContext').find("ul .findItemSelector");
	var thisStatus = $selectFld.prop("checked");
	$allCheckbox.each(function() {
		$(this).prop("checked", thisStatus)
	})
}
search.checkAll = function($selectFld, action) {
	console.log($selectFld);
	var $allHeaderCheckbox = $selectFld.closest('.actionResult').find(".headerGroupCheckbox");
	var thisStatus = $selectFld.prop("checked");
	$allHeaderCheckbox.each(function() {
		$(this).prop("checked", thisStatus);
		$(this).trigger("input");
	})
}

search.getTags = function(file, row) {
	// results : array of tags;
	var result = [];
	try {
		result = trans.project.files[file].tags[row];
	} catch (err) {
		// do nothing
	}
	
	return result;
}

search.drawTags = function($resultLine, file, row, options) {
	options = options||{};
	options.force = options.force||false;

	try {
		var tags = search.getTags(file, row);
		if (options.force == false) {
			if (Array.isArray(tags) == false) return $resultLine;
			if (tags.length == 0) return $resultLine;
		}
		var $resultInfo = $resultLine.find(".resultInfo");
		$resultInfo.find(".tags").remove();
		var $tagContainer = $("<span class='tags'></span>");
		$resultInfo.append($tagContainer);

		if (Array.isArray(tags) == false) return $resultLine;

		for (var i=0; i<tags.length; i++) {
			let $thisIcon = $("<i class='tagIcon icon-circle "+tags[i]+"' title='"+tags[i]+"'></i>");
			$thisIcon.css("color", consts.tagColor[tags[i]]);
			$tagContainer.append($thisIcon);
		}
	} catch (err) {
		console.log("Error drawing tags", err);
	}
	return $resultLine;
}

search.appendTags = function(file, row, tags, $actionResult) {
	try {
		if (Array.isArray(tags) == false) tags = [tags];
		
		trans.appendTags(file, parseInt(row), tags);

	} catch (err) {
		console.warning("Failed to handle appendTags", err);
	}	
}

search.appendTagsOnSelected = function(tags, $actionResult) {
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	var startTime = performance.now();
	var $lines = $actionResult.find(".findItemSelector:checked");
	$lines.each(function() {
		var $this 		= $(this);
		var $resultItem 	= $this.closest(".resultItem");
		var $resultContext 	= $this.closest(".resultContext");
		search.appendTags($resultContext.data("id"), $resultItem.attr("data-row"), tags);
		search.drawTags($resultItem, $resultContext.data("id"), $resultItem.attr("data-row"));
	});
	var endTime = performance.now()
	console.log(`Append tags done! It took ${endTime - startTime} ms `);
	trans.grid.render();
}



search.setTags = function(file, row, tags, $actionResult) {
	try {
		if (Array.isArray(tags) == false) tags = [tags];
		
		trans.setTags(file, parseInt(row), tags);

		
	} catch (err) {
		console.warning("Failed to handle appendTags", err);
	}	
}

search.setTagsOnSelected = function(tags, $actionResult) {
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	
	var $lines = $actionResult.find(".findItemSelector:checked");
	$lines.each(function() {
		var $resultItem = $(this).closest(".resultItem");
		var $resultContext = $(this).closest(".resultContext");
		search.setTags($resultContext.data("id"), $resultItem.attr("data-row"), tags);
		search.drawTags($resultItem, $resultContext.data("id"), $resultItem.attr("data-row"));
	})
	trans.grid.render();
}


search.removeTags = function(file, row, tags, $actionResult) {
	try {
		if (Array.isArray(tags) == false) tags = [tags];
		
		trans.removeTags(file, parseInt(row), tags);

	} catch (err) {
		console.warning("Failed to handle appendTags", err);
	}	
}

search.removeTagsOnSelected = function(tags, $actionResult) {
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	
	var $lines = $actionResult.find(".findItemSelector:checked");
	$lines.each(function() {
		var $resultItem = $(this).closest(".resultItem");
		var $resultContext = $(this).closest(".resultContext");
		search.removeTags($resultContext.data("id"), $resultItem.attr("data-row"), tags);
		search.drawTags($resultItem, $resultContext.data("id"), $resultItem.attr("data-row"));

	});
	trans.grid.render();
}

search.clearTags = function(file, row, $actionResult) {
	try {
		
		trans.clearTags(file, parseInt(row));

	} catch (err) {
		console.warning("Failed to handle clearTags", err);
	}	
}

search.clearTagsOnSelected = function($actionResult) {
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	
	var $lines = $actionResult.find(".findItemSelector:checked");
	$lines.each(function() {
		var $resultItem = $(this).closest(".resultItem");
		var $resultContext = $(this).closest(".resultContext");
		search.clearTags($resultContext.data("id"), $resultItem.attr("data-row"));
		$resultItem.find(".tags").empty();
	})
	trans.grid.render();

}






search.openTagMenu = function() {
	var $popup = $("#find_tagMenu");
	if ($popup.length == 0) {
		$popup = $("<div id='find_tagMenu'></div>");
		$("#template").append($popup);
		var tags = new UiTags({
			options : $(`
			<h2 data-tran="">${t('Action')}</h2>
			<div class="actionSet">
				<label class="flex"><input type="radio" name="tagAction" class="appendTags" value="appendTags" /> <span data-tran="">${t('Append tags')}</span></label>
				<label class="flex"><input type="radio" name="tagAction" class="removeTags" value="removeTags" /> <span data-tran="">${t('Remove tags')}</span></label>
				<label class="flex"><input type="radio" name="tagAction" class="setTags" value="setTags" /> <span data-tran="">${t('Set tags')}</span></label>
				<label class="flex"><input type="radio" name="tagAction" class="actionNone" value="" /> <span data-tran="">${t('Do nothing')}</span></label>
			</div>		
			`)
		});
		this._uiTags = tags;
		$popup.empty();
		$popup.append(tags.element);
	}
	$popup.dialog({
		title: t("Set tags"),
		autoOpen: false,
		modal:true,
		width:480,
		height:220,
		minWidth:480,
		minHeight:220,
		show: {
			effect: "fade",
			duration: 200
		},
		hide: {
			effect: "fade",
			duration: 200
		},
		buttons:[
			{
				text: t("Close"),
				icon: "ui-icon-close",
				click: function() {
					$(this).dialog( "close" );
				}
			},
			{
				text: t("Proceed"),
				click: async function() {
					var $this = $(this)
					var tags = search._uiTags.getValue();
					console.log(tags);
					if (tags === false) return false;
					

					$this.dialog( "close" );

					if (tags.filterTagMode == "appendTags") {
						search.appendTagsOnSelected(tags.filterTag);
					} else if (tags.filterTagMode == "removeTags") {
						search.removeTagsOnSelected(tags.filterTag);
					} else {
						search.setTagsOnSelected(tags.filterTag);
					}
				}
			}

		]
	});	
	$popup.dialog("open");	
}

search.loadKeywords = function() {
	var $keywords = $("#keywords");
	if (!localStorage.getItem("search.keywords")) return;
	try {
		var keywords = JSON.parse(localStorage.getItem("search.keywords"))
	} catch (e) {
		// do nothing
	}
	for (var i=0; i<keywords.length; i++) {
		var $newOption = $("<option></option>");
		$newOption.attr("value", keywords[i]);
		$keywords.append($newOption);
	}
}

search.addKeyword = function(keyword) {
	var $keywords = $("#keywords");
	try {
		// remove existing keyword
		var $exsit = $keywords.find(`[value="${CSS.escape(keyword)}"]`);
		$exsit.remove();
	} catch (e) {
		console.warn(e)
	}
	var $newOption = $("<option></option>");
	$newOption.attr("value", keyword);
	$keywords.prepend($newOption);
	$keywords = $keywords.find("option");
	if ($keywords.length > 100) {
		$keywords.eq($keywords.length - 1).remove();
	}

	// save keyword
	var keywords = [];
	for (var i=0; i<$keywords.length; i++) {
		keywords.push($keywords.eq(i).attr("value"));
	}
	if (keywords.length>0) localStorage.setItem("search.keywords", JSON.stringify(keywords))
}

search.toggleExclusiveSearchLocation = function($elm) {
	$elm = $($elm);
	console.log($elm);
	// change other .searchTargetOption to disabled
	if ($elm.prop("checked")) {
		$(".searchTargetOption").not($elm).prop("disabled", true);
	} else {
		$(".searchTargetOption").not($elm).prop("disabled", false);
	}

}

search.getSearchLocations = function() {
	var locations = [];
	// get search locations
	const $searchTargets = $(".searchTargetOption:checked");
	$searchTargets.each(function() {
		// skip if disabled
		if ($(this).prop("disabled")) return;
		locations.push($(this).val());
	});

	return locations;
}

search.refineSearch = function(keyword, previousSearchResult=this.previousSearchResult, options={}) {

	/**
	 * @typedef SearchResult
	 * @property {String} keyword - The keyword used
	 * @property {Number} count - Total numbers of the result
	 * @property {Boolean} isRegExp - Whether the keyword is regular expression or not
	 * @property {Number} executionTime - Execution time in ms
	 * @property {Object} files - list of the search result by file id
	 * @property {String} files.fullString - Full string of the result
	 * @property {Number} files.row - Row id
	 * @property {Number} files.col - Column id
	 * @property {cell|context|comment} files.type - type of the search result
	 * @property {Number} files.lineIndex - The line index
	 */
	/**
	 * Sample result:
	 * {
			"keyword": "bat",
			"count": 2,
			"isRegexp": false,
			"executionTime": 1,
			"files": {
				"data/Enemies.json": [
					{
						"fullString": "Bat",
						"row": 0,
						"col": 0,
						"type": "cell"
					}
				],
				"data/Troops.json": [
					{
						"fullString": "Bat*2",
						"row": 0,
						"col": 0,
						"type": "cell"
					}
				]
			}
		}
	 */

	const startTime = performance.now();
	const result = {
		keyword: keyword,
		count: 0,
		isRegexp: options.isRegexp || false,
		executionTime: 0,
		files: {}
	};

	// immediately return if previous search result is empty
	if (!previousSearchResult || previousSearchResult.count == 0) {
		result.executionTime = Math.round(performance.now() - startTime);
		return result;
	}

	// prepare search criteria
	const caseSensitive = options.caseSensitive !== false; // default to true if not specified
	const isRegexp = options.isRegexp || false;
	
	let searchRegex = null;
	let searchKeyword = keyword;
	
	// prepare search pattern
	if (isRegexp) {
		try {
			const flags = caseSensitive ? 'g' : 'gi';
			searchRegex = new RegExp(keyword, flags);
		} catch (e) {
			console.warn('Invalid regex pattern:', keyword, e);
			result.executionTime = Math.round(performance.now() - startTime);
			return result;
		}
	} else {
		searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
	}

	// refine search by filtering previous results
	for (const fileId in previousSearchResult.files) {
		const fileResults = previousSearchResult.files[fileId];
		const refinedResults = [];

		for (let i = 0; i < fileResults.length; i++) {
			const searchItem = fileResults[i];
			const fullString = searchItem.fullString || '';
			let found = false;

			if (isRegexp && searchRegex) {
				// regex search
				found = searchRegex.test(fullString);
				searchRegex.lastIndex = 0; // reset regex for next test
			} else {
				// simple string search
				const searchIn = caseSensitive ? fullString : fullString.toLowerCase();
				found = searchIn.indexOf(searchKeyword) !== -1;
			}

			if (found) {
				refinedResults.push({
					fullString: searchItem.fullString,
					row: searchItem.row,
					col: searchItem.col,
					type: searchItem.type || 'cell',
					lineIndex: searchItem.lineIndex
				});
			}
		}

		// only include files that have matching results
		if (refinedResults.length > 0) {
			result.files[fileId] = refinedResults;
			result.count += refinedResults.length;
		}
	}

	result.executionTime = Math.round(performance.now() - startTime);
	return result;
	
}

search.sendCommandFind = function(keyword) {
	keyword = keyword||$("#fieldFind").val();
	if (keyword.length < 1) return alert(t("Keyword too short!\nAre you trying to search all rows? Try using asterisk '*' as the keyword."));
	this.addKeyword(keyword);
	var caseSensitiveMode 	=  $("#caseSensitive").prop("checked");
	var $notFoundMsg 		= $("<div class='blockBox infoBlock withIcon'>"+t("Found nothing!<br />Don't forget to set the Target search field.")+"</div>")
	
	var selectedFiles 		= "*";
	if ($("#selectAllFile").prop("checked") == false) {
		selectedFiles = [];
		$("#find .fileSelector .filename:checked").each(function() {
			selectedFiles.push($(this).attr("value"));
		});
	}

	// transpile
	if ($("#find .transpileCode").prop("checked")) {
		keyword = this.transpileText(keyword);
	}

	console.log("Selected file is :");
	console.log(selectedFiles);
	
	// array of value
	//var searchLocations = $(".searchMode").val();
	const searchLocations = this.getSearchLocations();
	
	// Prepare search options
	const searchOptions = {
		caseSensitive 		: caseSensitiveMode,
		files				: selectedFiles,
		searchLocations	 	: searchLocations,
		isRegexp			: $("#findIsRegexp").prop("checked")
	};
	
	// Add targetColumns if applicable
	// Column filter only available for grid, comment, and refine search locations
	const columnFilterLocations = ['grid', 'comment', 'refine'];
	const hasColumnFilterLocation = searchLocations.some(loc => columnFilterLocations.includes(loc));
	
	if (hasColumnFilterLocation && this.targetColumn !== null && Array.isArray(this.targetColumn)) {
		searchOptions.targetColumns = this.targetColumn;
	}
	
	var result;
	// if searchLocation contains 'refine', assume user want to refine previous search
	if (searchLocations.includes("refine")) {
		// refine search using previous search results
		searchOptions.previousResult = this.previousSearchResult;
		result = trans.search(keyword, searchOptions);		
	} else {
		// normal search
		result = trans.search(keyword, searchOptions);
	}

	this.previousSearchResult = result;

	
	search.toggleFileList(false);
	$("#find .searchResult").empty();
	

	const $template = $("<div class='searchResultHeader column2'>\
						<div class='searchresultAction'>\
							<input type='checkbox' value='' class='headerCheckbox' /> \
							<span>Select all</span>\
						</div>\
						<div class='right searchResultData'>\
							<i class='icon-docs'></i> <span class='numFile'>"+result.count+"</span>\
							<i class='icon-hourglass-3'></i> "+result.executionTime+" ms\
						</div>\
					</div>");
	$template.find(".headerCheckbox").on("input", function(e) {
		search.checkAll.call(search, $(this));
	});
	

	$("#find .searchResult").append($template);
	if (typeof result.files == "undefined" || result.count == 0) $("#find .searchResult").append($notFoundMsg);
					
					
	for (var file in result.files) {
		//var $lineFile = $("<div class='resultContext' data-id="+file+"><h2><input type='checkbox' value='1' class='headerGroupCheckbox' /> <i class='icon-doc'></i>"+file+" <span class='contextCount'>"+result.files[file].length+"</span></h2><ul></ul></div>");
		var $lineFile = $("<div class='resultContext' ><h2><input type='checkbox' value='1' class='headerGroupCheckbox' /> <i class='icon-doc'></i>"+file+" <span class='contextCount'>"+result.files[file].length+"</span></h2><ul></ul></div>");
		$lineFile.data("id", file);
		$lineFile.find(".headerGroupCheckbox").on("input", function(e) {
			search.checkGroup.call(search, $(this));
		});
		for(var i in result.files[file]) {
			var currentLine = result.files[file][i];
			var refference  = "";
			var foundStr    = common.htmlEntities(currentLine.fullString);

			if (result.isRegexp) {
				var regExpKeyword = common.evalRegExpStr(keyword);
				if (regExpKeyword !== false) {
					foundStr = foundStr.replace(regExpKeyword,   
						function(){
							return '<span class="highlight">'+arguments[0]+'</span>';
						});
				}
			} else {
				foundStr = foundStr.replaces(keyword, "<span class='highlight'>"+common.htmlEntities(keyword)+"</span>", !caseSensitiveMode);
			}
			//console.log(currentLine);
			try {
				var thisFileRef = trans.project.files[file].data[currentLine.row];
				if (currentLine.col == 0) {
					// this is key row, search translation for refference
					for (var n=thisFileRef.length; n>0; n--) {
						if (thisFileRef[n]) {
							refference = thisFileRef[n];
							break;
						}
					}
				} else {
					// this not a key row, search keyrow for refference
					refference = thisFileRef[0];
				}
			}
			catch (err) {
				// do nothing
			}

			refference =  common.htmlEntities(refference);
			
			var lineTemplate = $("<li class='resultItem' title='click to go' data-row='"+currentLine.row+"' data-col='"+currentLine.col+"'>"+
						"<div class='texts'>"+
						"<h1>"+foundStr+"</h1>"+
						"<h1 class='refference' title='refference'>"+refference+"</h1>"+
						"</div>"+							
						`<div class='resultInfo'><span class='findItemSelectorWrapper'><input type='checkbox' data-row='${currentLine.row}' data-col='${currentLine.col}' class='findItemSelector' value='' /></span><span class='rowLabel' title='row'>${currentLine.row}</span><span class='colLabel' title='column'>${currentLine.col}</span></div></li>`);
			lineTemplate.data("row", currentLine.row);
			lineTemplate.data("col", currentLine.col);
			lineTemplate.data("context", file);
			lineTemplate.on("click", function(e) {
				if ($(e.target).is("input[type=checkbox]")) {
					return;
				}				
				trans.goTo($(this).data("row"), $(this).data("col"), $(this).data("context"));
				$(this).closest(".searchResult").find(".selected").removeClass("selected");
				$(this).addClass("selected");
			});
			
			lineTemplate.find(".findItemSelector").on("change", function() {
				search.find = search.find || {};
				if ($(this).prop("checked") == true) {
					search.find.$lastCheckedFile = $(this);
				} else {
					search.find.$lastCheckedFile = undefined;
				}				
			});
			lineTemplate.find(".findItemSelector").on("mousedown", function(e) {
				search.find = search.find || {};
				
				if (!search.find.$lastCheckedFile) return false;
				if (e.shiftKey) {
					console.log("The SHIFT key was pressed!");
					var $checkBoxes = $(this).closest(".actionResult").find(".findItemSelector");
					var lastIndex = $checkBoxes.index(search.find.$lastCheckedFile);
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
			
			search.drawTags(lineTemplate, file, currentLine.row);
			$lineFile.find("ul").append(lineTemplate);
		}
		$("#find .searchResult").append($lineFile);
	}
	
	console.log(result);
}


search.sendCommandReplace = function() {
	var keyword = $("#fieldReplaceFind").val();
	var replacer = $("#fieldReplaceReplace").val();
	if (keyword.length < 1) return alert("Keyword too short!");
	this.addKeyword(keyword);
	var $notFoundMsg = $("<div class='blockBox infoBlock withIcon'>"+t("Found nothing to replace!<br />Replace function doesn't replace anything on the key column.")+"</div>")
	
	var conf = confirm(t("Replace '")+keyword+t("' with '")+replacer+t("'?\r\nWe still haven't create undo function for this thing!\nAre you sure want to proceed?"));
	if (!conf) return false;
	
	
	var caseSensitiveMode =  $("#caseSensitiveReplace").prop("checked");
	
	var selectedFiles = "*";
	if ($("#selectAllFileReplace").prop("checked") == false) {
		selectedFiles = [];
		$("#replace .fileSelector .filename:checked").each(function() {
			selectedFiles.push($(this).attr("value"));
		});
	}

	// transpile
	if ($("#replace .transpileCode").prop("checked")) {
		keyword = this.transpileText(keyword);
		replacer = this.transpileText(replacer);
	}
	
	console.log("Selected file is :");
	console.log(selectedFiles);
	
	// Prepare replace options
	const replaceOptions = {
		caseSensitive 	: caseSensitiveMode,
		'files' 		: selectedFiles,
		isRegexp		: $("#replaceIsRegexp").prop("checked")
	};
	
	// Add targetColumns if applicable
	// In replace, exclude the first column (read-only key column)
	if (this.targetColumn !== null && Array.isArray(this.targetColumn)) {
		// Filter out column 0 (the key column) from target columns
		const filteredColumns = this.targetColumn.filter(col => col > 0);
		if (filteredColumns.length > 0) {
			replaceOptions.targetColumns = filteredColumns;
		}
	}
	
	var result = trans.replace(keyword, replacer, replaceOptions);
	
	search.toggleFileList(false);
	$(".replaceResult").empty();
	
	if (typeof result.files == "undefined") $(".replaceResult").html($notFoundMsg);
	if (result.count == 0)  $(".replaceResult").html($notFoundMsg);

	var $template = $("<div class='searchResultHeader column2'>\
						<div class='searchresultAction'>\
							<input type='checkbox' value='' class='headerCheckbox' /> \
							<span>Select all</span>\
						</div>\
						<div class='right searchResultData'>\
							<i class='icon-docs'></i> <span class='numFile'>"+result.count+"</span>\
							<i class='icon-hourglass-3'></i> "+result.executionTime+" ms\
						</div>\
					</div>");
	$template.find(".headerCheckbox").on("input", function(e) {
		search.checkAll.call(search, $(this));
	});
					
	$(".replaceResult").prepend($template);

	for (var file in result.files) {
		//var $lineFile = $("<div class='resultContext' data-id="+file+"><h2><input type='checkbox' value='1' class='headerGroupCheckbox' /><i class='icon-doc'></i>"+file+" <span class='contextCount'>"+result.files[file].length+"</span></h2><ul></ul></div>");
		var $lineFile = $("<div class='resultContext' ><h2><input type='checkbox' value='1' class='headerGroupCheckbox' /><i class='icon-doc'></i>"+file+" <span class='contextCount'>"+result.files[file].length+"</span></h2><ul></ul></div>");
		$lineFile.data("id", file);
		$lineFile.find(".headerGroupCheckbox").on("input", function(e) {
			search.checkGroup.call(search, $(this));
		});

		for(var i in result.files[file]) {
			var currentLine = result.files[file][i];
			
			
			var foundStr = common.htmlEntities(currentLine.originalString);
			
			if (result.isRegexp) {
				var regExpKeyword = common.evalRegExpStr(keyword);
				if (regExpKeyword !== false) {
					foundStr = foundStr.replace(regExpKeyword,   
						function(){
							return '<span class="highlight2">'+arguments[0]+'</span>';
						});
				}
			} else {
				foundStr = foundStr.replaces(keyword, "<span class='highlight2'>"+keyword+"</span>", !caseSensitiveMode);
			}
			
			var replacedString = common.htmlEntities(currentLine.fullString).replaces(replacer, "<span class='highlight'>"+replacer+"</span>");
			
			//var foundStr = currentLine.fullString.replaces(keyword, "<span class='highlight'>"+keyword+"</span>", !caseSensitiveMode);
			
			var lineTemplate = $("<li class='resultItem' title='"+t("click to go")+"' data-row='"+currentLine.row+"' data-col='"+currentLine.col+"'>"+
			"<div class='texts'>"+
				"<h1 class='refference' title='refference'>"+foundStr+"</h1>"+
				"<span><i class='icon-right-big'> </i></span>"+
				"<h1>"+replacedString+"</h1>"+
			"</div>"+
			`<div class='resultInfo'><span class='findItemSelectorWrapper'><input type='checkbox' data-row='${currentLine.row}' data-col='${currentLine.col}' class='findItemSelector' value='' /></span><span class='rowLabel' title='row'>${currentLine.row}</span><span class='colLabel' title='column'>${currentLine.col}</span></div></li>`);
			lineTemplate.data("row", currentLine.row);
			lineTemplate.data("col", currentLine.col);
			lineTemplate.data("context", file);
			lineTemplate.on("click", function(e) {
				if ($(e.target).is("input[type=checkbox]")) {
					return;
				}
				trans.goTo($(this).data("row"), $(this).data("col"), $(this).data("context"));
			});
			
			lineTemplate.find(".findItemSelector").on("change", function() {
				search.repl = search.repl || {};
				if ($(this).prop("checked") == true) {
					search.repl.$lastCheckedFile = $(this);
				} else {
					search.repl.$lastCheckedFile = undefined;
				}				
			});
			lineTemplate.find(".findItemSelector").on("mousedown", function(e) {
				search.repl = search.repl || {};
				
				if (!search.repl.$lastCheckedFile) return false;
				if (e.shiftKey) {
					console.log("The SHIFT key was pressed!");
					var $checkBoxes = $(this).closest(".actionResult").find(".findItemSelector");
					var lastIndex = $checkBoxes.index(search.repl.$lastCheckedFile);
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
					for (let i=chckFrom; i<chckTo; i++) {
						$checkBoxes.eq(i).prop("checked", true).trigger("change");
					}					
				}
			});		

			search.drawTags(lineTemplate, file, currentLine.row);
			$lineFile.find("ul").append(lineTemplate);
		}
		$(".replaceResult").append($lineFile);
	}
	
	console.log(result);
}

search.sendCommandPut = function() {
	var conf = confirm(t("This will replace any translation found in target colum,\nAre you sure?"));
	if (!conf) return false;
	var keyword = $("#findPut .fldFind").val();
	if (keyword.length < 1) return alert(t("Keyword too short!"));
	
	var put = $("#findPut .fldPut").val();
	var caseSensitiveMode =  $("#findPut .caseSensitive").prop("checked");
	var targetCol = parseInt($("#findPut .targetSelector select").val());
	targetCol = parseInt(targetCol);
	
	var selectedFiles = "*";
	if ($("#findPut .selectAllFile").prop("checked") == false) {
		selectedFiles = [];
		$("#findPut .fileSelector .filename:checked").each(function() {
			selectedFiles.push($(this).attr("value"));
		});
	}
	console.log("Selected file is :");
	console.log(selectedFiles);	
	
	var result = trans.findPut(keyword, put, targetCol, {
		caseSensitive 	: caseSensitiveMode,
		files 			: selectedFiles,
		lineMatch 		: true
	});	

	console.log("result is", result);
	
	search.toggleFileList(false);
	$("#findPut .searchResult").empty();
	
	if (typeof result.files == "undefined") $("#findPut .searchResult").html(t("Not found!"));
	if (result.count == 0)  $("#findPut .searchResult").html(t("Not found!"));

	var $template = $("<div class='searchResultHeader column2'>\
						<div class='searchresultAction'>\
							<input type='checkbox' value='' class='headerCheckbox' /> \
							<span>Select all</span>\
						</div>\
						<div class='right searchResultData'>\
							<i class='icon-docs'></i> <span class='numFile'>"+result.count+"</span>\
							<i class='icon-hourglass-3'></i> "+result.executionTime+" ms\
						</div>\
					</div>");
	$template.find(".headerCheckbox").on("input", function(e) {
		search.checkAll.call(search, $(this));
	});
	
	$("#findPut .searchResult").prepend($template);
	
	
	for (var file in result.files) {
		//var $lineFile = $("<div class='resultContext' data-id="+file+"><h2><i class='icon-doc'></i>"+file+" <span class='contextCount'>"+result.files[file].length+"</span></h2><ul></ul></div>");
		var $lineFile = $("<div class='resultContext' ><h2><i class='icon-doc'></i>"+file+" <span class='contextCount'>"+result.files[file].length+"</span></h2><ul></ul></div>");
		$lineFile.data("id", file);
		for(var i in result.files[file]) {
			var currentLine = result.files[file][i];
			var foundStr = currentLine.fullString.replaces(keyword, "<span class='highlight'>"+keyword+"</span>", !caseSensitiveMode);
			var refference = "";
			
			//console.log(currentLine);
			try {
				var thisFileRef = trans.project.files[file].data[currentLine.row];
				refference = thisFileRef[targetCol];
			}
			catch (err) {
				// do nothing
			}
			
			var lineTemplate = $("<li class='resultItem' title='click to go' data-row='"+currentLine.row+"' data-col='"+currentLine.col+"'>"+
						"<div class='texts'>"+
						"<h1>"+foundStr+"</h1>"+
						"<h1 class='refference' title='refference'>"+refference+"</h1>"+
						"</div>"+							
						`<div class='resultInfo'><span class='findItemSelectorWrapper'><input type='checkbox' data-row='${currentLine.row}' data-col='${currentLine.col}' class='findItemSelector' value='' /></span><span class='rowLabel' title='row'>${currentLine.row}</span><span class='colLabel' title='column'>${currentLine.col}</span></div></li>`);
			lineTemplate.data("row", currentLine.row);
			lineTemplate.data("col", currentLine.col);
			lineTemplate.data("context", file);
			lineTemplate.on("click", function(e) {
				if ($(e.target).is("input[type=checkbox]")) {
					return;
				}				
				trans.goTo($(this).data("row"), $(this).data("col"), $(this).data("context"));
			});
			
			lineTemplate.find(".findItemSelector").on("change", function() {
				search.find = search.find || {};
				if ($(this).prop("checked") == true) {
					search.find.$lastCheckedFile = $(this);
				} else {
					search.find.$lastCheckedFile = undefined;
				}				
			});
			lineTemplate.find(".findItemSelector").on("mousedown", function(e) {
				search.find = search.find || {};
				
				if (!search.find.$lastCheckedFile) return false;
				if (e.shiftKey) {
					console.log("The SHIFT key was pressed!");
					var $checkBoxes = $(this).closest(".actionResult").find(".findItemSelector");
					var lastIndex = $checkBoxes.index(search.find.$lastCheckedFile);
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
					for (let i=chckFrom; i<chckTo; i++) {
						$checkBoxes.eq(i).prop("checked", true).trigger("change");
					}					
				}
			});		
			
			search.drawTags(lineTemplate, file, currentLine.row);
			$lineFile.find("ul").append(lineTemplate);
		}
		$("#findPut .searchResult").append($lineFile);
	}	
	
}


search.drawFileSelector = function() {
	if (typeof trans.project == 'undefined') return false;
	var project = trans.project;
	for (var file in project.files) {
		var template = $("<label class='selectable'><input type='checkbox' class='filename' value='"+file+"' /><span>"+file+"</span></label>");
		template.attr("title", file)
		$(".fileSelector").append(template);
	}
	search.initFileSelectorDragSelect();	
}

search.toggleFileList = function(stat) {
	if (typeof stat == 'undefined') {
		stat = !$(".toggleFileSelector").hasClass("opened");
	}
	
	if (!stat) {
		$(".fileSelector").addClass("hidden");
		$(".toggleFileSelector").removeClass("opened");
	} else {
		$(".fileSelector").removeClass("hidden");
		$(".toggleFileSelector").addClass("opened");
	}
	return stat;
}



// ======================================================================
// context menu handler
// ======================================================================

search.selectAll = function($actionResult) {
	//select all by given actionResult
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	var $headerCheckbox = $actionResult.find(".headerCheckbox");
	$headerCheckbox.prop("checked", true);
	$headerCheckbox.trigger("input");
	//search.checkAll($actionResult.find(".headerCheckbox"));
}

search.invertSelection = function($actionResult) {
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	var $lines = $actionResult.find(".findItemSelector");
	$lines.each(function() {
		$(this).prop("checked", !$(this).prop("checked"));
	});
}

search.unSelectAll = function($actionResult) {
	//select all by given actionResult
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	var $headerCheckbox = $actionResult.find(".headerCheckbox");
	$headerCheckbox.prop("checked", false);
	$headerCheckbox.trigger("input");
	//search.checkAll($actionResult.find(".headerCheckbox"));
}

search.clearTranslationOnSelected = function($actionResult) {
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	
	var $lines = $actionResult.find(".findItemSelector:checked");
	$lines.each(function() {
		var $resultItem 	= $(this).closest(".resultItem");
		var $resultContext 	= $(this).closest(".resultContext");
		var fileId 		= $resultContext.data("id");
		var row 		= $resultItem.attr("data-row");
	
		try {
			var thisRow = trans.project.files[fileId].data[row];
			trans.project.files[fileId].data[row] = thisRow.fill("", 1);
		} catch (e) {
			//do nothing
		}
		//search.appendTags($resultContext.data("id"), $resultItem.attr("data-row"), tags);
	})
	trans.grid.render();

}


search.removeSelectedElement = function($actionResult) {
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	var $files = $actionResult.find(".resultContext");
	$files.each(function() {
		var $thisFile = $(this);
		var $thisLines = $thisFile.find(".findItemSelector:checked");
		if ($thisLines.length < 1) return;
		$thisLines.each(function() {
			$(this).closest("li").remove();
		})

		if($thisFile.find("li.resultItem").length < 1) $thisFile.remove();
	})

	$actionResult.find(".numFile").text( $actionResult.find("li.resultItem").length)

}

search.deleteSelected = function($actionResult) {
	// should make the row, col & file id unique
	$actionResult = $actionResult||$(".ui-tabs-panel[aria-hidden=false] .actionResult");
	
	var $files = $actionResult.find(".resultContext");
	for (var i=0; i<$files.length; i++) {
		var $thisFile = $files.eq(i);
		var $thisLine = $thisFile.find(".findItemSelector:checked");
		if ($thisLine.length < 1) continue;
		var fileId = $thisFile.data("id");
		var rows = [];
		for (var x=0; x<$thisLine.length; x++) {
			rows.push($thisLine.eq(x).data("row"));
		}
		console.log(`trans.removeRow()`, fileId, rows);
		trans.removeRow(fileId, rows)
	}
	this.removeSelectedElement($actionResult);
	trans.grid.render();
}

search.openAutomationEditor = async function() {
	var options = {
		workspace	: "foundCells",
		foundCells	: search.getSelectedResult()
	}
	ui.openAutomationEditor("codeEditor_foundCells", options);
}

search.automationMenu = function() {
	console.log("Creating automation menu");
	var subMenu = new nw.Menu();
	const configPath = "codeEditor/foundCells"

	var menuConfig = sys.getConfig(configPath);
	if (!menuConfig) {
        sys.setConfig(configPath, {quickLaunch:[]});
        menuConfig = sys.getConfig(configPath);
    }
    menuConfig["quickLaunch"] = menuConfig["quickLaunch"] || [];
	for (var i=0; i<menuConfig["quickLaunch"].length; i++) {
		(()=>{
			var filePath = menuConfig["quickLaunch"][i];
			var filename = common.getFilename(filePath);
			subMenu.append(new nw.MenuItem({
				label: filename,
				type: "normal", 
				click: function(){
					const searchResult = search.getSelectedResult();
					var conf = confirm(t("Are you sure want to execute the following script?")+"\n"+filename+"\n"+
					t("For ")+searchResult.length+t(" selected item(s)?")
					);
					if (!conf) return;
					trans.runCustomScript("foundCells", filePath,  {
						foundCells: searchResult
					});
				}
			}));
		})()
	}
	return subMenu;
}

search.searchResultContextMenu = function() {
    console.log("trans.fileSelectorContextMenuInit");
    if (this.searchResultContextMenuIsInitialized) return false;
    this.menu = new nw.Menu();

    // Add some items with label
    this.menu.append(new nw.MenuItem({
        label: t(' Select all'),
        type: "normal",
        click: function() {
            search.selectAll();
        }
    }));
	this.menu.append(new nw.MenuItem({
        label: t(' Invert selection'),
        type: "normal",
        click: function() {
            search.invertSelection();
        }
    }));
    this.menu.append(new nw.MenuItem({
        label: t(' Clear selection'),
        type: "normal",
        click: function() {
            search.unSelectAll();
        }
    }));
    this.menu.append(new nw.MenuItem({
        type: 'separator'
    }));

    var tagging = new nw.Menu();

    tagging.append(new nw.MenuItem({
        label: t(' Set Red tag'),
        type: "normal",
        icon: "www/img/red.png",
        click: function() {
            search.appendTagsOnSelected("red");
        }
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Set Yellow tag'),
        type: "normal",
        icon: "www/img/yellow.png",
        click: function() {
            search.appendTagsOnSelected("yellow");
        }
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Set Green tag'),
        type: "normal",
        icon: "www/img/green.png",
        click: function() {
            search.appendTagsOnSelected("green");
        }
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Set Blue tag'),
        type: "normal",
        icon: "www/img/blue.png",
        click: function() {
            search.appendTagsOnSelected("blue");
        }
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Set Gold tag'),
        type: "normal",
        icon: "www/img/gold.png",
        click: function() {
            search.appendTagsOnSelected("gold");
        }
    }));
    tagging.append(new nw.MenuItem({
        label: t(' More tags...'),
        type: "normal",
        click: function() {
            search.openTagMenu();
        }
    }));
    tagging.append(new nw.MenuItem({
        type: 'separator'
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Clear tags'),
        type: "normal",
        click: function() {
            search.clearTagsOnSelected();
        }
    }));
    tagging.append(new nw.MenuItem({
        type: 'separator'
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Create Automation'),
        type: "normal",
        click: function() {
            search.openAutomationEditor();
        }
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Run Automation'),
        type: "normal",
        submenu: search.automationMenu()
    }));
	tagging.append(new nw.MenuItem({
        label: t(' Clear Automation'),
        type: "normal",
		click: function() {
			var conf = confirm(t("Are you sure want to clear all quick launch scripts?"));
			if (!conf) return;
			sys.setConfig("codeEditor/foundCells", {quickLaunch:[]});
			sys.saveConfig();
        }
    }));
    tagging.append(new nw.MenuItem({
        type: 'separator'
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Clear translation'),
        type: "normal",
        icon: "www/img/brush_icon-blue.png",
        click: function() {
            var conf = confirm(t("Do you want to clear translations of the selected items?"));
            if (!conf) return;
            search.clearTranslationOnSelected();
        }
    }));
    tagging.append(new nw.MenuItem({
        label: t(' Delete rows'),
        type: "normal",
        icon: "www/img/trash_icon-blue.png",
        click: function() {
            var conf = confirm(t("Do you want to remove selected rows?\nYou can not undo this action!"));
            if (!conf) return;
            search.deleteSelected();
        }
    }));
    /*
    var withSelection = new nw.Menu();	
    withSelection.append(new nw.MenuItem({
      label: 'Tagging',
      submenu: tagging
    }))
    */

    this.menu.append(new nw.MenuItem({
        label: t(' With selection ...'),
        icon: "www/img/checkmark-blue.png",
        submenu: tagging
    }));

    var that = this;

    $(document.body).on("contextmenu", ".actionResult", function(ev) {
        ev.preventDefault();
        // Popup the native context menu at place you click
        //console.log(ev);
        console.log(ev.originalEvent);
        that.menu.popup(parseInt(ev.originalEvent.x), parseInt(ev.originalEvent.y));
        return false;
    })
    /*
    document.body.addEventListener('contextmenu', function(ev) {
      // Prevent showing default context menu
      //console.log(ev);
      if ($(ev.target).is(".actionResult") == false) return false;
      ev.preventDefault();
      // Popup the native context menu at place you click
      that.menu.popup(ev.x, ev.y);

      return false;
    }, false);
    */
    this.searchResultContextMenuIsInitialized = true;

}

search.toggleTargetColumnSelector = function(targetTab = "find") { // find or replace
	const $targetTab = $(`#${targetTab}`);
	const isOpening = !$targetTab.hasClass("targetColumnSelectorOpened");
	
	$targetTab.toggleClass("targetColumnSelectorOpened");

	// Initialize targetColumn if not exists
	if (typeof this.targetColumn === 'undefined') {
		this.targetColumn = null; // null means all columns selected
	}

	if (isOpening) {
		const $container = $targetTab.find(".columnSelectorWrapper .columnList");
		const $selectAllCheckbox = $targetTab.find(".selectAllColumnsCheckbox");
		const $wrapper = $targetTab.find(".columnSelectorWrapper");
		
		$container.empty();

		// Draw column checkboxes
		for (let i=0; i<trans.colHeaders.length; i++) {
			// skip original column if in replace tab
			if (targetTab == "replace" && i == trans.keyColumn) continue;

			const colName = trans.colHeaders[i];
			const isChecked = this.targetColumn === null || (Array.isArray(this.targetColumn) && this.targetColumn.includes(i));
			
			const $label = $(`<label><input type="checkbox" class="columnCheckbox" value="${i}" ${isChecked ? 'checked' : ''} /> <span class="label">${colName}</span></label>`);
			$container.append($label);
		}

		// Update "Select All" checkbox state
		this.updateSelectAllColumnsState($targetTab);

		// Handle "Select All" checkbox change
		$selectAllCheckbox.off('change').on('change', function() {
			const isChecked = $(this).prop('checked');
			$container.find('.columnCheckbox').prop('checked', isChecked);
			
			if (isChecked) {
				search.targetColumn = null; // All columns selected
			} else {
				search.targetColumn = []; // No columns selected
			}
		});

		// Handle individual column checkbox change
		$container.off('change', '.columnCheckbox').on('change', '.columnCheckbox', function() {
			const $checkedBoxes = $container.find('.columnCheckbox:checked');
			const totalBoxes = $container.find('.columnCheckbox').length;
			
			// Update targetColumn array
			if ($checkedBoxes.length === totalBoxes) {
				search.targetColumn = null; // All selected, use default behavior
			} else if ($checkedBoxes.length === 0) {
				search.targetColumn = []; // None selected
			} else {
				search.targetColumn = [];
				$checkedBoxes.each(function() {
					search.targetColumn.push(parseInt($(this).val()));
				});
			}
			
			// Update "Select All" checkbox
			search.updateSelectAllColumnsState($targetTab);
		});

		// Close when clicking outside
		$wrapper.off('click').on('click', function(e) {
			// Only close if clicking on the wrapper itself (the backdrop)
			if (e.target === this) {
				search.toggleTargetColumnSelector(targetTab);
			}
		});

		// Prevent clicks inside the selector from closing
		$targetTab.find(".columnSelector").off('click').on('click', function(e) {
			e.stopPropagation();
		});
	}
}

search.updateSelectAllColumnsState = function($targetTab) {
	const $container = $targetTab.find(".columnSelectorWrapper .columnList");
	const $selectAllCheckbox = $targetTab.find(".selectAllColumnsCheckbox");
	const $checkedBoxes = $container.find('.columnCheckbox:checked');
	const totalBoxes = $container.find('.columnCheckbox').length;
	
	if ($checkedBoxes.length === totalBoxes) {
		$selectAllCheckbox.prop('checked', true);
		$selectAllCheckbox.prop('indeterminate', false);
	} else if ($checkedBoxes.length === 0) {
		$selectAllCheckbox.prop('checked', false);
		$selectAllCheckbox.prop('indeterminate', false);
	} else {
		$selectAllCheckbox.prop('checked', false);
		$selectAllCheckbox.prop('indeterminate', true);
	}
}

search.optionsMenu = function(x, y) {
	console.log("search.optionsMenu");

	var uncheckBlurMenu = () => {
		for (var id in this.menuOpacityItem) {
			if (Boolean(this.menuOpacityItem[id]) == false) continue;
			this.menuOpacityItem[id].checked = false;
		}
	}


	this.menuOptions = new nw.Menu();

	// Add some items with label
	this.menuAlwaysOnTop = new nw.MenuItem({
		label: t('Always on top'),
		type: "checkbox", 
		checked: win.isAlwaysOnTop,
		click: function(){
			var currentState = win.isAlwaysOnTop;
			win.setAlwaysOnTop(!currentState);			
			this.checked = !currentState;
			search.setConfig('alwaysOnTop', !currentState);
		}
	})

	this.menuOptions.append(this.menuAlwaysOnTop);

	//this.menuOptions.append(new nw.MenuItem({ type: 'separator' }));
	
	var opacity = new nw.Menu();

	this.menuOpacityItem = {};

	for (let i=10; i>0; i--) {
		void function() {
			var z = i;
			var percent = z*10;				
			var current = search.blurOpacity*100;
			var isChecked = false;
			if (current == percent) isChecked = true;
			var thisMenu = new nw.MenuItem({
				label: percent+'%',
				type: "checkbox", 
				checked: isChecked,
				click: function(){
					uncheckBlurMenu();
					this.checked = true;				
					search.blurOpacity = z/10;
					search.setConfig('blurOpacity', z/10);
				}
			});
			search.menuOpacityItem[percent] = thisMenu;
			opacity.append(thisMenu);
		}()
	}
	
	opacity.append(new nw.MenuItem({ type: 'separator' }));
	var isChecked = false;
	if (search.blurOpacity == 0.6) isChecked = true;	
	this.menuOpacityItem['default'] = new nw.MenuItem({
		label: t('Default'),
		type: "checkbox", 
		checked: isChecked,
		click: function(){
			console.log(this, arguments)
			uncheckBlurMenu();
			this.checked = true;
			search.blurOpacity = 0.6;
			search.setConfig('blurOpacity', 0.6);
		}
	})
	opacity.append(this.menuOpacityItem['default']);
	
	/*
	var withSelection = new nw.Menu();	
	withSelection.append(new nw.MenuItem({
	  label: 'Tagging',
	  submenu: tagging
	}))
	*/
	
	this.menuOptions.append(new nw.MenuItem({
		label: t('Blur opacity'),
		submenu: opacity
	}));
	
	var that = this;
	
	if (this.optionsMenuIsInitialized) return false;
	$(".application-menu-button").on("click", function(ev) {
		ev.preventDefault();
		// Popup the native context menu at place you click
		var thisOffset = $(this).offset();
		//that.menu.popup(ev.originalEvent.x, ev.originalEvent.y);
		that.menuOptions.popup(parseInt(thisOffset.left) - 80, 32);
		return false;
	})

	this.optionsMenuIsInitialized = true;
	
}

search.getBlurOpacity = function() {
	return this.blurOpacity;
}

search.initialize = function() {
    this.appMenu = new nw.Menu();
    this.appMenu.append(new nw.MenuItem({
        label: t('Close'),
        type: "normal",
        click: function() {

        }
    }));
    var that = this;
    $(document.body).on("contextmenu", ".findWrapper", function(ev) {
        ev.preventDefault();
        // Popup the native context menu at place you click
        //console.log(ev);
        that.appMenu.popup(parseInt(ev.originalEvent.x), parseInt(ev.originalEvent.y));
        return false;
    })

    this.optionsMenu();
    this.loadKeywords();
}

// =======================================================
// EVENTS
// =======================================================

$(document).ready(function() {
	search.searchResultContextMenu();
	
	$(document).on('keydown', function(e) {
		var keyCode = e.keyCode || e.which;
		switch (keyCode) {
			case 13 : //Enter
				if (e.altKey || e.shiftKey) break;
				e.preventDefault();
				console.log("Searching");
				
				if ($("div[aria-hidden=false]").attr("id") == "find") {
					search.sendCommandFind();
				} else if  ($("div[aria-hidden=false]").attr("id") == "replace"){
					search.sendCommandReplace();
				} else {
					search.sendCommandPut();
				}
				//$(".button-about").trigger("click");
			break;		
		}
	});
	
	
	// INITIALIZING TAB
	
	var type = window.location.hash.substr(1);
	var mode = 0;
	if (type == "replace") mode = 1;
	console.log("tab index  : "+mode);
	
	$("#tabs").tabs({
		active: mode,
		activate: function(e, thisUi) {
			console.log(thisUi);
			if (thisUi.newPanel.attr("id") == 'findPut') {
				$("#findPut .targetSelector").empty();
				ui.generateColSelector({
					skipFirstCol:true
				}).appendTo($("#findPut .targetSelector"));
			}
			
		}
	});
	
	if (mode == 0) {
		$("#fieldFind").focus();
	} else {
		$("#fieldReplaceFind").focus();
	}

	$(".findOptionButton").on("click", function(e) {
		search.toggleTargetSearchOptions();
	});
	
	
	$(".toggleFileSelector").on("click", function(e) {
		var $thisTab = $(this).closest(".ui-tabs-panel");

		$(this).toggleClass("opened");
		if ($(this).hasClass("opened")) {
			$thisTab.find(".fileSelector").removeClass("hidden");
		} else {
			$thisTab.find(".fileSelector").addClass("hidden");
		}		
	});
	
	$(".selectAllFile").on("change", function(e) {
		var $thisTab = $(this).closest(".ui-tabs-panel");
		if ($(this).prop("checked")) {
			$thisTab.find(".fileSelector").addClass("hidden");
			$thisTab.find(".toggleFileSelector").removeClass("opened");
			$thisTab.find(".fileSelector .filename").each(function() {
				//console.log($(this));
				$(this).prop("disabled", true);
			});
		} else {
			$thisTab.find(".fileSelector").removeClass("hidden");
			$thisTab.find(".toggleFileSelector").addClass("opened");
			$thisTab.find(".fileSelector .filename").each(function() {
				$(this).prop("disabled", false);
			});
		}
	});
	
	$(".application-bar .application-close-button").on("click", function(e) {
		win.close();
	})

	$("#replaceIsRegexp").on("change", function() {
		let $this = $(this);
		if ($this.prop("checked")) {
			$("#fieldReplaceFind").attr("placeholder", t("Type regex with the modifier"))
			$("#fieldReplaceReplace").attr("placeholder", t("Use $n to replace a group. e.g. $1"))
		} else {
			$("#fieldReplaceFind").attr("placeholder", t("Find"))
			$("#fieldReplaceReplace").attr("placeholder", t("Replace"))

		}
	})
	
	search.initialize();
	search.drawFileSelector();
	$(".selectAllFile").trigger("change");
	
});  // document ready


win.on('blur', function() {
	$("body").css("opacity", search.getBlurOpacity())
})
win.on('focus', function() {
	$("body").css("opacity", "1")
})

win.on('close', function() {
	// Hide the window to give user the feeling of closing immediately
	this.hide();
	window.localStorage.setItem("searchWindowPossition", JSON.stringify({
		x: Math.round(win.x),
		y: Math.round(win.y)
	}));
	// unregister this window on parent window.
	if (typeof ui.windows.search !== 'undefined') ui.windows.search = undefined;

	// After closing the new window, close the main window.
	this.close(true);

});
