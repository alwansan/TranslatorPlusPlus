const thisAddon 	= this;
const appName 		= this.package.name;
const ini 			= require('ini')
const bCopy 		= require('better-copy');
const fse 			= require('fs-extra');
const AddonUtils	= require("www/js/AddonUtils.js");
const gameEngine 	= "rmmv";

thisAddon.debugLevel = 0;
thisAddon.config.maxLineMessage = thisAddon.config.maxLineMessage || 4;
AddonUtils(thisAddon);
this.optionsForm = {
	/*	
		"maxLineMessage": {
			"type": "number",
			"title": "Maximum number of line in message box.",
			"description": "Default value is 4. Type 0 to disable this feature. If the number of line in message box is greater than this number, Translator++ will generates a new message box to prevents the texts overflowing the boxes.",
			"HOOK": "thisAddon.config.maxLineMessage"
		},	
		
		"booleanValue": {
			"type": "boolean",
			"title": "Use legacy parser",
			"description": "Use the old parser prior to (Translator++ ver. 3.8.12). The old parser doesn't support some newly added features.",
			"HOOK": "thisAddon.config.useLegacyParser",
			"inlinetitle": "Use old parser",
			"fieldHtmlClass":"flipSwitch"
		},*/
		"beautifyJSON": {
			"type": "boolean",
			"title": t("Beautify JSON data"),
			"description": t("When checked the generated data will be beautified."),
			"HOOK": "thisAddon.config.beautifyJSON",
			"inlinetitle": t("Beautify JSON data"),
			"fieldHtmlClass":"flipSwitch"
		}
}


class RMMVData extends require("www/js/ParserBase.js").ParserBase {
	constructor(obj, options, callback) {
		super(obj, options, callback)
		this.debugLevel = thisAddon.debugLevel;
		this.currentEntryPoint = {};
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};
		this.exportOptions = options.exportOptions || {};
	}
}

RMMVData.RPGM_EVENT_CODE = {
	"0": "Empty",
	"101": "Show Text Attributes",
	"102": "Show Choices",
	"103": "Input Number",
	"104": "Select Key Item",
	"105": "Show Scrolling Text Attributes",
	"108": "Comment",
	"111": "Conditional Branch",
	"112": "Loop",
	"113": "Break Loop",
	"115": "Exit Event Processing",
	"117": "Call Common Event",
	"118": "Label",
	"119": "Jump to Label",
	"121": "Control Switches",
	"122": "Control Variables",
	"123": "Control Self Switch",
	"124": "Control Timer",
	"125": "Change Gold",
	"126": "Change Items",
	"127": "Change Weapons",
	"128": "Change Armor",
	"129": "Change Party Member",
	"132": "Change Battle BGM",
	"133": "Change Battle End ME",
	"134": "Change Save Access",
	"135": "Change Menu Access",
	"136": "Change Encounter",
	"137": "Change Formation Access",
	"138": "Change Window Color",
	"201": "Transfer Player",
	"202": "Set Vehicle Location",
	"203": "Set Event Location",
	"204": "Scroll Map",
	"205": "Set Move Route",
	"206": "Get on/off Vehicle",
	"211": "Change Transparency",
	"212": "Show Animation",
	"213": "Shot Balloon Icon",
	"214": "Erase Event",
	"216": "Change Player Followers",
	"217": "Gather Followers",
	"221": "Fadeout Screen",
	"222": "Fadein Screen",
	"223": "Tint Screen",
	"224": "Flash Screen",
	"225": "Shake Screen",
	"230": "Wait",
	"231": "Show Picture",
	"232": "Move Picture",
	"233": "Rotate Picture",
	"234": "Tint Picture",
	"235": "Erase Picture",
	"236": "Set Weather Effects",
	"241": "Play BGM",
	"242": "Fadeout BGM",
	"243": "Save BGM",
	"244": "Replay BGM",
	"245": "Play BGS",
	"246": "Fadeout BGS",
	"249": "Play ME",
	"250": "Play SE",
	"251": "Stop SE",
	"261": "Play Movie",
	"281": "Change Map Display",
	"282": "Change Tileset",
	"283": "Change Battle Back",
	"284": "Change Parallax Back",
	"285": "Get Location Info",
	"301": "Battle Processing",
	"302": "Shop Processing",
	"303": "Name Input Processing",
	"311": "Change HP",
	"312": "Change MP",
	"313": "Change State",
	"314": "Recover All",
	"315": "Change EXP",
	"316": "Change Level",
	"317": "Change Parameters",
	"318": "Change Skills",
	"319": "Change Equipment",
	"320": "Change Actor Name",
	"321": "Change Actor Class",
	"322": "Change Actor Graphic",
	"323": "Change Vehicle Graphic",
	"324": "Change Actor Nickname",
	"325": "Change Actor Profile",
	"331": "Change Enemy HP",
	"332": "Change Enemy MP",
	"333": "Change Enemy State",
	"334": "Enemy Recover All",
	"335": "Enemy Appear",
	"336": "Enemy Transform",
	"337": "Show Battle Animation",
	"339": "Force Action",
	"340": "Abort Battle",
	"351": "Open Menu Screen",
	"352": "Open Save Screen",
	"353": "Game Over",
	"354": "Return to Title Screen",
	"355": "Script Header",
	"356": "Plugin Command",
	"357": "MZ Plugin Command", // MZ
	"401": "Show Text",
	"402": "Choice",
	"403": "Choice Cancel",
	"404": "Choices End",
	"405": "Show Scrolling Text",
	"408": "Comment More",
	"411": "Else",
	"412": "Branch End",
	"413": "Repeat Above",
	"601": "If Win",
	"602": "If Escape",
	"603": "If Lose",
	"604": "Battle Processing End",
	"605": "Shop Item",
	"655": "Script",
	"657": "Plugin Parameter" // MZ
  }

RMMVData.determineType = function($path) {
	var fileName = nwPath.basename($path, nwPath.extname($path));
	if (/Map[0-9]+/g.test(fileName)) {
		return "map"
	} else {
		return fileName.toLowerCase();
	}
}


RMMVData.prototype.MV_buildTextList = function($text, $header) {
	// $splitEach 0 ... then no split;
	// Show message are $splitEach = 4
	//const maxLineMessage = trans.getOption("maxDialogLine") || 4;
	const maxLineMessage = this.exportOptions?.maxDialogLine || 4;

	$text = $text || "";
	if (typeof $text !== "string") {
		console.warn("Expected string, but ", typeof $text, "given:", $text);
		$text = $text.toString();
	}
	$text = $text.replaceAll("\r", "");
	var $textArray = $text.split("\n");
	
	var $LIST =[];
	for (var $key=0; $key<$textArray.length; $key++) { 
		var $line = $textArray[$key];
		if (($key+1)%maxLineMessage == 1) {
			$LIST.push($header);
		}
		var $newRow = {};
		$newRow['code'] = 401;
		$newRow['indent'] = $header['indent'];
		$newRow['parameters'] = [$line];
		$LIST.push($newRow);
	}
	return $LIST;
}

RMMVData.prototype.MV_buildScrollTextList = function($text, $header) {
	$text = $text || "";
	$text = $text.replaceAll("\r", "");
	var $textArray = $text.split("\n");
	
	var $LIST =[];
	$LIST.push($header);
	for (var $key=0; $key<$textArray.length; $key++) { 
		var $line = $textArray[$key];
		var $newRow = {};
		$newRow['code'] = 405;
		$newRow['indent'] = $header['indent'];
		$newRow['parameters'] = [$line];
		$LIST.push($newRow);
	}
	return $LIST;
}

/**
 * Converts a multi lined text into a valid array of RMMV event object
 * @since 2.5
 * @param {String} text - The multilined text
 * @param {Object} header - Header object with the first line of the message
 * @returns {Object[]} Array of the RMMV event list
 */
RMMVData.prototype.MV_buildCommentList = function(text, header) {
	// $splitEach 0 ... then no split;
	// Show message are $splitEach = 6
	text = text.replaceAll("\r", "");
	var $textArray = text.split("\n");
	
	var $LIST =[];
	for (var $key=0; $key<$textArray.length; $key++) { 
		var $line = $textArray[$key];
		if (($key+1)%6 == 1) {
			var newHeader = common.clone(header);
			newHeader.parameters = [$line];
			$LIST.push(newHeader);
			continue;
		}
		var $newRow = {};
		$newRow['code'] = 408;
		$newRow['indent'] = header['indent'];
		$newRow['parameters'] = [$line];
		$LIST.push($newRow);
	}
	return $LIST;
}


RMMVData.prototype.applyTranslation = function(translation, localContext, parameters, options) {
	console.log("Entering applyTranslation", arguments);
}


RMMVData.prototype.registerStringObject = function(obj, key, context, parameters, options) {
	//console.log("registerStringObject", arguments);
	var translation = this.registerString(obj[key], context, parameters, options);
	//console.log("translation", translation)
	// apply translation
	obj[key] = translation;
	return translation;
}

RMMVData.prototype.fetchCommonData = function($data, $fetchData, $parentContext, options) {
	options = options || {};
	options.currentAddress = options.currentAddress || [];
	console.log("parsing common data");
	if (empty($data)) return false;
	//console.log("incoming data is:", $data);

	// create a copy of data;
	//this.translatedData = common.clone($data);


	for (let $i=1; $i<$data.length; $i++) {
		if (empty($data[$i])) continue;

		for (let $fetch=0; $fetch<$fetchData.length; $fetch++) {
			if (!$data[$i][$fetchData[$fetch]]) continue; // will allow blank if only this
			if (empty($data[$i][$fetchData[$fetch]])) continue;
			//var context = common.clone($parentContext);
			//context.push($i, $fetchData[$fetch]);
			var context = $parentContext.concat([$i, $fetchData[$fetch]]);
			var thisCurrentAddress = options.currentAddress.concat([$i, $fetchData[$fetch]]);
			//this.registerString($data[$i][$fetchData[$fetch]], context, {});
			this.registerStringObject($data[$i], $fetchData[$fetch], context, [], {currentAddress:thisCurrentAddress})

		}
	}

	if (this.writeMode) this.writableObj = $data;
	return this;
}

RMMVData.prototype.buildScriptList = function(text, headerParam, translatedList) {
	console.log(">>buildScriptList", arguments);
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	var textArray = text.split("\n");

	console.log("Text array:", textArray);
	// first line is on header
	//translatedList.push(RMData.generateEventCommandData(headerParam.i, 355, textArray[0]));
	translatedList.push(
		{
			"code": 355,
			"indent": headerParam.indent,
			"parameters": [textArray[0]]
		}	
	);
	for (var i=1; i<textArray.length; i++) {
		translatedList.push(
			{
				"code": 655,
				"indent": headerParam.indent,
				"parameters": [textArray[i]]
			}
		);
	}
	console.log("script list", translatedList);
	return translatedList;
}

/**
 * Enter the index of choice header to process choice members
 * @param  {Array} pageList - Array of commands
 * @param  {Number} index - Index of the choice header
 * @param  {Array} context - parent context
 * @returns {Object} translated pageList[index]
 */
RMMVData.prototype.fetchChoices = function(pageList, index, context) {
	// this command = choice header
	var currentLine = pageList[index];
	var thisTexts 	= currentLine.parameters[0]; // array of texts

	/*
		{
			choiceStr: id
		}
	*/
	var choices = []; 

	if (empty(thisTexts)) return currentLine;

	for (let x=0; x<thisTexts.length; x++) {
		var thisText 	= thisTexts[x];
		var thisContext = context.concat([index, `${x+1}from${thisTexts.length}`]);
		var translation = this.registerString(thisText, thisContext, [], {});
		this.setEntryPointValue(thisTexts, x, translation);

		// create index
		choices[x] = {
			originalText	:thisText,
			indent			:currentLine.indent,
			translation		:translation
		}		
	}	

	// Choice member are translated directly without registering

	var processed = 0;

	// the rest of the choice is current indent + 1
	//var expectedIndent = currentLine.indent+1;
	for (let i=index+1; i<pageList.length; i++) {
		var currentPage = pageList[i];
		if (currentPage.code !== 402) continue;
		if (currentPage.indent !== currentLine.indent) continue;

		var currentChoice = choices[processed];
		if (Boolean(currentChoice) == false) continue;

		currentPage.parameters[1] = currentChoice.translation;

		processed++;
		if (processed >= choices.length) break;

	}

	// returns mutated currentLine
	return currentLine;
}


/**
 * Process MZ's Plugin command parameters
 * @param  {Array} pageList - Array of commands
 * @param  {Number} index - Index of the choice header
 * @param  {Array} context - parent context
 * @returns {Object} translated pageList[index]
 */
RMMVData.prototype.fetchMzPluginCommand = async function(pageList, index, context) {
	// currentLine = parameter header/ command 357
	var currentLine = pageList[index];

	console.log("Current line", currentLine);
	context = context.concat([currentLine.parameters[0], currentLine.parameters[1]])

	// what we need to process is parameter 3
	var paramData = currentLine.parameters[3];
	var translatedParam = [];
	var idx = -1;
	console.log("ParamData:", paramData);
	const JSONTranslate = window.JSONTranslate
	for (var key in paramData) {
		idx++; // should be located here.
		if (typeof paramData[key] !== "string") continue;
		if (!common.isTranslatableText(paramData[key])) continue;
		if (JSONTranslate.isCommonOperatorString(paramData[key])) continue;
		

		
		if (common.isJSONString(paramData[key])) {
			console.log("JSON String", paramData[key]);
			var jsonTranslate = new JSONTranslate(JSON.parse(paramData[key]), {
				baseContext		:context,
				translationPair	:this.translationPair,
				translationInfo	:this.translationInfo,
				writeMode		:this.writeMode
			});
			//jsonTranslate.assignTranslationPair("js/plugins.js", this.options.translationDatas);
			await jsonTranslate.parse();
			this.importTransData(jsonTranslate);
			console.log("jsonTranslate", jsonTranslate);

			let translation = jsonTranslate.toString();
			this.setEntryPointValue(paramData, key, translation);
			translatedParam[idx] = translation;
		} else {
			console.log("Register plain string:", paramData[key]);
			var thisText 	= paramData[key];
			var thisContext = context.concat([key]);
			let translation = this.registerString(thisText, thisContext, [], {});
			this.setEntryPointValue(paramData, key, translation);
			translatedParam[idx] = translation;
		}

	}

	console.log("Translated param:",translatedParam);

	if (this.writeMode) {
		var replace657Text = function(str, replacement) {
			if (!str) return str;
			if (typeof str !== "string") return str;

			replacement = replacement || "";

			// locate first occurance of " = "
			var splitLocation = str.indexOf(" = ");
			var firstPart = str.substring(0, splitLocation);
			return firstPart + " = " + replacement;
		}

		// traverse through the next 657 commands
		let idx = -1;
		for (let key in paramData) {
			idx++; // should be on the top
			if (!translatedParam[idx]) continue;
			//console.log("Translating 657: ", translatedParam[idx]);
			var thisIndex = idx + index + 1;
			var thisPageList = pageList[thisIndex]
			if (thisPageList.code !== 657) {
				console.warn(`Expected code is 657 but ${thisPageList.code} given`);
				continue;
			} 
			
			thisPageList.parameters[0] = replace657Text(thisPageList.parameters[0], translatedParam[idx]);

		}
	}

	return currentLine;
}


RMMVData.prototype.fetchEventPages = async function($eventPages, $parentContext, $RESULT = {}) {
	//console.log("handling Event pages", arguments);
	if (!Array.isArray($eventPages)) return false;


	// create result
	var translatedPage = common.clone($eventPages);

	for(var $keyPage=0; $keyPage<$eventPages.length; $keyPage++) {
		var $page = $eventPages[$keyPage];
		//console.log(`page of index ${$keyPage} is :`, $page);
		if (empty($page)) continue;
		if (empty($page['list'])) continue;
		
		// reset list for translatedPage
		translatedPage[$keyPage].list = [];


		var $messagePossition		= ["top", "middle", "bottom"];
		var $currentTextParam 		= {};
		var $currentLongTextParam 	= {};
		var $currentCommentParam 	= {};
		var last101 				= {};
		var last105 				= {};
		var last108					= {};
		var last355 				= {};
		var scriptStack 			= [];
		var currentScriptParam 		= {};
		var $currentText 			= [];
		var $currentLongText 		= [];
		var $currentComment 		= [];

		for (let $i=0; $i<$page['list'].length; $i++) {
			var $currentLine = $page['list'][$i];
			var $thisObj = {};
			//console.log("handling command", $currentLine);
			// process current text buffer when not 401
			if (!empty($currentText) && $page['list'][$i]['code'] != 401) {
				//console.log("registering texts", $currentText);
				var $pictureStatus = "noPicture";
				try {
					if (!empty($currentTextParam['headerParam'][0])) $pictureStatus = "hasPicture";
				} catch (e) {
					console.warn("Invalid sequence of event code 401. Current text param:", $currentTextParam);
					// do not translate
					translatedPage[$keyPage].list.push($currentLine);
					continue;
				}

				
				let context = common.clone($parentContext);
				context.push($keyPage, "list", $currentTextParam['headerIndex'], "message", $pictureStatus, $messagePossition[$currentTextParam['headerParam'][3]]);

				if ($currentTextParam['headerParam'][4]) {
					// MZ specific. Actor name
					$currentTextParam.rowInfoText = $currentTextParam['headerParam'][4];
				}

				var translation = this.registerString($currentText.join("\n"), context, $currentTextParam);
				//console.log("Translation: ", translation);
				if (this.writeMode) {
					var newList = this.MV_buildTextList(translation, last101);
					//console.log("Generating list based on translation:", newList);
					translatedPage[$keyPage].list = translatedPage[$keyPage].list.concat(newList);
				}

				$currentText = [];
				$currentTextParam = {};
			}
			
			if (!empty($currentLongText) && $page['list'][$i]['code'] != 405) {

				let context = common.clone($parentContext);
				context.push($keyPage, "list", $currentLongTextParam['headerIndex'], "scrollingMessage");
				let translation = this.registerString($currentLongText.join("\n"), context, $currentLongTextParam);
				if (this.writeMode) {
					let newList = this.MV_buildScrollTextList(translation, last105);
					translatedPage[$keyPage].list = translatedPage[$keyPage].list.concat(newList);
				}
				$currentLongText = [];
				$currentLongTextParam = {};
			}

			if (!empty($currentComment) && $page.list[$i].code != 408) {
				console.log("Handling event's comment");
				let context = common.clone($parentContext);
				context.push($keyPage, "list", $currentCommentParam['headerIndex'], "comment");
				let translation = this.registerString($currentComment.join("\n"), context, $currentCommentParam, {tags:["blue"]});
				if (this.writeMode) {
					let newList = this.MV_buildCommentList(translation, last108);
					translatedPage[$keyPage].list = translatedPage[$keyPage].list.concat(newList);
				}
				$currentComment = [];
				$currentCommentParam = {};
			}


			if (scriptStack.length>0 && $page.list[$i].code !== 655) {
				// end of text stack
				console.log("executing scriptstack");
	
				let context = common.clone($parentContext);
				context.push($keyPage, "list", currentScriptParam.headerIndex, "script");
	
				// this is raw script
				let script = scriptStack.join("\n");
	
				// for raw viewer store raw script as Attachment, because we won't save the code into files.
				let attachmentName = "scriptCommand/"+common.generateId()+".js";
	
				
				console.log("registering string within event's JS code.");
				let copyOptions = common.clone(this.options);
					copyOptions.baseContext 	= context;
					copyOptions.baseParameter 	= {attachment:attachmentName}
					copyOptions.baseTags		= ["red"];
					copyOptions.translationPair = this.translationPair;
					copyOptions.translationInfo = this.translationInfo;
				let scriptObj = new ESScript(script, copyOptions);
				await scriptObj.parse();

				console.log("ScriptObj:", scriptObj);
				// produce translated script from scriptObj
				script = scriptObj.toString();
				console.log("parsed text below:\n", script);
				// import transData from scriptObj into rmData
				this.importTransData(scriptObj);
	
				// assign attachment only if has atleast one translatable string / data length > 0
				if (scriptObj.transData.data.length > 0) {
					RMMVGames.lastAttachments[attachmentName] = new Attachment({
						type:"text/javascript",
						data:script
					})
				}
	
				//var translation = this.registerString(script, context, last355);
				if (thisAddon.debugLevel > 2)console.log(">>Generated combined text:", script);
				
				this.buildScriptList(script, last355, translatedPage[$keyPage].list);
	
				scriptStack = [];
				currentScriptParam = {};
			}
			
			switch($page.list[$i].code) {
				// handling interpolatable texts
				case 101: //text parameters
					// MZ specific, capture name
					if ($page.list[$i].parameters.length == 5) {
						this.registerStringObject($page.list[$i].parameters, 4, $parentContext.concat([$keyPage, "list", $i, RMMVData.RPGM_EVENT_CODE[$page.list[$i].code], "actorName"]))
					}

					$currentTextParam.headerIndex = $i;
					$currentTextParam.headerParam = $page.list[$i].parameters;
					$currentText 	= [];
					last101 		= $currentLine;

					break;
				case 105: //start text scroll
					$currentLongTextParam.headerIndex = $i;
					$currentLongTextParam.headerParam = $page.list[$i].parameters;
					$currentLongText 	= [];
					last105 			= $currentLine;
					break;

				case 108: //Comment
					$currentCommentParam.headerIndex = $i;
					$currentCommentParam.headerParam = $page.list[$i].parameters;
					$currentComment 	= [];
					$currentComment.push($currentLine['parameters'][0]);
					last108 			= $currentLine;
					break;

				case 401: //text
					$currentText.push($currentLine['parameters'][0]);
					break;
				case 405: //long text
					$currentLongText.push($currentLine['parameters'][0]);
					break;
				case 408: //Comment header
					$currentComment.push($currentLine['parameters'][0]);
					break;

				
				case 355: //Script Header
					console.log("Code 355", $currentLine);
					scriptStack = [];
					currentScriptParam.headerIndex = $i;
					currentScriptParam.headerParam = $currentLine.parameters;
					last355 = $currentLine;
					scriptStack.push($currentLine.parameters[0]);
					break;					
				case 655: //Script
					console.log("Code 655", $currentLine);
					scriptStack.push($currentLine.parameters[0]);
					break;	
				


				case 122: //set variable
					//console.log("Translating variable");
					var thisText = $currentLine.parameters[4];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMMVData.RPGM_EVENT_CODE[$page.list[$i].code], "var:"+$currentLine.parameters[0]+"-"+$currentLine.parameters[1]);
					
					var attachmentName = "scriptCommand/"+common.generateId()+".js";
					var copyOptions = common.clone(this.options);
					copyOptions.baseContext 	= context;
					copyOptions.baseParameter 	= {attachment:attachmentName}
					copyOptions.baseTags		= ["red"];
					copyOptions.translationPair = this.translationPair;
					copyOptions.translationInfo = this.translationInfo;
					var scriptObj = new ESScript(thisText, copyOptions);
					await scriptObj.parse();
					
					// translate thisText;
					thisText = scriptObj.toString();
					// import transData from scriptObj into rmData
					this.importTransData(scriptObj);
		
					// assign attachment only if has atleast one translatable string / data length > 0
					if (scriptObj.transData.data.length > 0) {
						RMMVGames.lastAttachments[attachmentName] = new Attachment({
							type:"text/javascript",
							data:thisText
						})
					}

					// apply new text into $currentLine
					$currentLine.parameters[4] = thisText;
					translatedPage[$keyPage].list.push($currentLine);

					break;
				case 102: //choice header
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMMVData.RPGM_EVENT_CODE[$page.list[$i].code]);

					var translatedLine = this.fetchChoices($page.list, $i, context);
					translatedPage[$keyPage].list.push(translatedLine);
					
					break;
			
				case 320: //Change name
				case 324: //Change nick name
				case 325: //Change profile
					var thisText = $currentLine.parameters[1];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMMVData.RPGM_EVENT_CODE[$page.list[$i].code], "charId:"+$currentLine.parameters[0]);
					var translation = this.registerString(thisText, context, [], {});
					this.setEntryPointValue($currentLine.parameters, 1, translation);
					translatedPage[$keyPage].list.push($currentLine);
				
					break;
					
				case 356: //plugin command
					var thisText = $currentLine['parameters'][0];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMMVData['RPGM_EVENT_CODE'][$page['list'][$i]['code']]);
					var translation = this.registerString(thisText, context, [], {tags:["red"]});
					this.setEntryPointValue($currentLine['parameters'], 0, translation);
					translatedPage[$keyPage].list.push($currentLine);
				
					break;
				
				// MZ only
				case 357: //MZ plugin command
					console.log("Handling MZ plugin command");
					var context = $parentContext.concat([$keyPage, "list", $i, RMMVData.RPGM_EVENT_CODE[$page.list[$i].code]]);
					var translatedLine = await this.fetchMzPluginCommand($page.list, $i, context);
					translatedPage[$keyPage].list.push(translatedLine);
					break;
				
				default:
					translatedPage[$keyPage].list.push($currentLine);
			}
		}
	}

	this.parsed = $RESULT;
	//console.log(">>>Translated page:", translatedPage);
	return translatedPage;
}

RMMVData.prototype.fetchSystem = function($system, $parentContext, $currentData = []) {
	
	if (!empty($system['gameTitle'])) {

		if (this.debugLevel>1) console.log("Fetch gameTitle");
		var context = $parentContext.concat(["gameTitle"]);
		this.registerStringObject($system, 'gameTitle', context, [], {currentAddress : ["gameTitle"]})
		this.gameTitle = $system['gameTitle'];
		RMMVData.lastGameTitle = $system['gameTitle'];
	}

	var $type = ['armorTypes', 'elements', 'equipTypes', 'skillTypes', 'weaponTypes', 'switches', 'variables'];	
	for (let $i in $type) {
		let $key = $type[$i];
		if (empty($system[$key])) continue;
		for (let $thisKey in $system[$key] ) {
			let $thisText = $system[$key][$thisKey];
			if (empty($thisText)) continue;
			
			//$currentData = this.appendResultData($currentData, $newData);
			if (this.debugLevel>2) console.log(">>>Fetch type definition: "+$key);
			if (this.debugLevel>2) console.log($system[$key], $thisKey, ">>", $system[$key][$thisKey]);

			let context = $parentContext.concat([$key, $thisKey]);
			//this.registerString($thisText, context, [], {currentAddress : [$key, $thisKey]})
			let thisOptions = {
				currentAddress : [$key, $thisKey]
			}
			if (["switches", "variables"].includes($key)) {
				thisOptions.tags = ["blue"];
			}
			this.registerStringObject($system[$key], $thisKey, context, [], thisOptions)
			
		}
	}
	
	for (let $key in $system['terms']) {
		var $terms = $system['terms'][$key];
		for (let $thisKey in $terms) {
			let $thisText = $terms[$thisKey];
			if (Boolean($thisText) == false) continue;

			if (this.debugLevel>2) console.log(">>>Fetch terms");
			if (this.debugLevel>2) console.log("$terms:", $terms);
			if (this.debugLevel>2) console.log("$thisKey:", $thisKey);
			if (this.debugLevel>2) console.log("$terms[$thisKey]:", $terms[$thisKey]);
			let context = $parentContext.concat(["terms", $key, $thisKey]);
			//this.registerString($thisText, context, [], {currentAddress : ["terms", $key, $thisKey]})
			this.registerStringObject($terms, $thisKey, context, [], {currentAddress : ["terms", $key, $thisKey]})

		}
	}
	
	if (!empty($system.advanced)) {
		// only in MZ
		for (var key in $system.advanced) {
			if (typeof $system.advanced[key] !== "string") continue;
			this.registerStringObject($system.advanced, key, $parentContext.concat(["advanced", key]), [], {
				currentAddress 	: ["advanced", key],
				tags			: ["red"]
			})
		}
	}

	//this.parsed = $currentData;
	if (this.writeMode) this.writableObj = $system;
	return this;
}

RMMVData.mergeDeep = function(target, ...sources) {
	if (!sources.length) return target;
	const source = sources.shift();
  
	if (typeof target == "object" && typeof source == "object") {
		for (const key in source) {
			if (typeof source[key] == "object") {
				if (!target[key]) Object.assign(target, { [key]: {} });
				this.mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, { [key]: source[key] });
			}
		}
	}
  
	return this.mergeDeep(target, ...sources);
}

RMMVData.prototype.appendResultData = function($currentData, $newData) {
	if (!Array.isArray($currentData)) return false;
	if (empty($newData['text'])) return $currentData;

	if (!empty($currentData[$newData['text']])) {
		$currentData[$newData['text']] = RMMVData.mergeDeep($currentData[$newData['text']], $newData);
		$currentData[$newData['text']]['text'] = $newData['text'];
	} else {
		$currentData[$newData['text']] = $newData;
	}
	return $currentData;
}

RMMVData.prototype.fetchFromOtherJson = function(obj, context, translationPair) {
	obj = obj || this.obj;
	obj = common.clone(obj);
	translationPair = translationPair || this.translationPair;

	if (!context) context = [];
	if (Array.isArray(context) == false) context = [context];

	var fetchChild = (childObj, localContext) => {
		// create new clone of localContext
		if (Array.isArray(localContext) == false) localContext = [localContext];

		for (var i in childObj) {
			var newContext = common.clone(localContext);
			newContext.push(i);
			if (Boolean(childObj[i]) == false) continue
			if (common.isNumeric(childObj[i])) continue;
			if (typeof childObj[i] == 'object') {
				fetchChild(childObj[i], newContext);
			} else if (typeof childObj[i] == 'string') {
				//var contextString = newContext.join("/");
				//if (contextString.includes("parameters") == false) continue;
				//if (RMMV.isCommonOperatorString(childObj[i])) continue;
				if (!common.isTranslatableText(childObj[i])) continue;				
				
				//childObj[i] = this.registerString(childObj[i], newContext);
				childObj[i] = this.registerStringObject(childObj, i, newContext);
			}
			
		}
	}

	fetchChild(obj, context);
	this.writableObj = obj;
	return this;
}

RMMVData.prototype.setEntryPoint = function(obj, key) {
	this.currentEntryPoint.obj = obj;
	this.currentEntryPoint.key = key;
}

RMMVData.prototype.setEntryPointValue = function(obj, key, value) {
	this.currentEntryPoint.obj = obj;
	this.currentEntryPoint.key = key;
	try {
		obj[key] = value;
	} catch (e) {
		console.warn(e);
	}
}

RMMVData.selectTranslationData = function(translationDatas, path) {
	// must match trans.project.files[thefile].path
	var newPath = path;
	newPath = newPath.replace(/\\/g, "/");
	translationDatas.translationData = translationDatas.translationData || {};
	return translationDatas.translationData[newPath];
}

RMMVData.getRelativePath = function(longPath, shortPath) {
	longPath = longPath.replaceAll("\\", "/");
	var result = longPath.substr(shortPath.length);
	if (result[0] == "/") result = result.substr(1);
	return result;
}
thisAddon.RMMVData = RMMVData;





var RMMVGames = function(gameFile, options) {
	this.gameFile 		= gameFile;
	this.options 		= options || {};
	this.options.files  = this.options.files || [];
	this.isExtracted 	= false;
	this.init();
}

RMMVGames.lastAttachments = {};

RMMVGames.prototype.init = function() {
	this.gameFile = this.gameFile.replaceAll("\\", "/");
	this.dirname = nwPath.dirname(this.gameFile);
}

RMMVGames.prototype.processThispath = function(relPath) {
	if (!(this.options)) return true;
	console.log("processThispath :", relPath, this.options.files);
	if (empty(this.options.files)) return true;

	if (this.options.files.includes(relPath)) return true;

	return false;
}

RMMVGames.determineEngine = async function(gameDir) {
	if (await common.isFileAsync(nwPath.join(gameDir, "js/rmmz_core.js"))) return "rmmz";
	if (await common.isFileAsync(nwPath.join(gameDir, "js/rpg_core.js"))) return "rmmv";
	if (await common.isFileAsync(nwPath.join(gameDir, "www/js/rpg_core.js"))) return "rmmv";
	
}

RMMVGames.prototype.determineEngine = async function() {
	return await RMMVGames.determineEngine(this.dirname);
}

RMMVGames.determineRootDir = async function(gameDir, definedEngine) {
	if (await common.isDirectory(gameDir) == false) return console.warn(gameDir, "is not a valid directory");
	var confirmedPath = gameDir;

	if(await common.isFileAsync(nwPath.join(gameDir, "www/data/System.json"))) {
		confirmedPath = nwPath.join(gameDir, "www");
		return confirmedPath;
	} else if (await common.isFileAsync(nwPath.join(gameDir, "data/System.json"))) {
		return confirmedPath;
	}

	if (definedEngine == "rmmv") {
		return nwPath.join(gameDir, "www");
	} else if (definedEngine == "rmmz") {
		return gameDir;
	}

	return console.warn("Invalid RMMV / RMMZ path "+gameDir);
}

RMMVGames.prototype.determineGameRootDir = async function() {
	this.gameRoot = this.dirname;
	this.gameDataPath = nwPath.join(this.dirname, "data");
	this.gameJsPath = nwPath.join(this.dirname, "js");
	if(await common.isFileAsync(nwPath.join(this.dirname, "www/data/System.json"))) {
		this.gameRoot = nwPath.join(this.dirname, "www");
		this.gameDataPath = nwPath.join(this.dirname, "www/data");
		this.gameJsPath = nwPath.join(this.dirname, "www/js");
	}
}

RMMVGames.prototype.createCache = async function(id) {
	if (!id) console.error("ID Must be defined");
	if (!this.isExtracted) await this.parse();
	await ui.log("Generating cache");

	var cacheInfo = {
		cacheID: id,
		cachePath: nwPath.join(common.getStagePath(), this.trans.projectId)
	}

	var cacheFolderData = nwPath.join(cacheInfo.cachePath, "data")
	await common.mkDir(cacheFolderData);
	// generate gameInfo.json
	var gameInfo = {
		Title: this.trans.gameTitle,
		title: this.trans.gameTitle
	}
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "gameInfo.json"), JSON.stringify(gameInfo), "UTF8");

	// copy index.html
	await ui.log("Copying index.html");
	await common.copyFile(nwPath.join(this.gameRoot, "index.html"), cacheFolderData);

	// copy file from current folder into cache
	await ui.log(`Copying data from ${this.gameDataPath} to ${nwPath.join(cacheFolderData, "data")}`);
	await bCopy(this.gameDataPath, nwPath.join(cacheFolderData, "data"));

	// copy plugins.js
	await ui.log("Copying plugins.js");
	var jsPath = nwPath.join(cacheFolderData, "js");
	await common.mkDir(jsPath);
	await common.copyFile(nwPath.join(this.gameJsPath, "plugins.js"), jsPath);

	await ui.log("Generating initial.json");
	this.trans.cache = cacheInfo;
	await common.filePutContents(nwPath.join(cacheInfo.cachePath, "initial.json"), JSON.stringify(this.trans), "UTF8");
	
	return cacheInfo;
}

RMMVGames.prototype.toTrans = async function(parsedData, options) {
	await ui.log("generating trans data");
	if (!this.isExtracted) await this.parse();
	parsedData = parsedData || this.parsed;
	this.trans = {
		projectId		: common.makeid(10),
		cache			: {},
		gameEngine		: await this.determineEngine()||"rmmv",
		gameTitle		: RMMVData.lastGameTitle || "",
		loc				: this.dirname,
		parser			: 'rmmvjs',
		parserVersion	: thisAddon.package.version,
		attachments 	: RMMVGames.lastAttachments,
		files			: {}
	}

	for (var path in parsedData) {
		//var relativePath = RMMVData.getRelativePath(path, this.dirname);
		var relativePath = common.getRelativePathFromNode(path, "/data/", true);
		this.trans.files[relativePath] = {...parsedData[path].transData, ...parsedData[path].fileInfo};
		this.trans.files[relativePath].originalFormat= "RPG MAKER MV RAW DATA";
		this.trans.files[relativePath].lineBreak= "\n";
	}


	this.trans.cache = await this.createCache(this.trans.projectId);

	return this.trans
}

/*
RMMVGames.prototype.processThispath = function(relPath) {
	console.log("Is file processed:", relPath, this.options.files);

	if (!(this.options)) return true;
	if (empty(this.options.files)) return true;

	relPath = relPath.replaceAll("\\", "/");
	if (relPath[0] == "/") relPath = relPath.substr(1);

	if (this.options.files.includes(relPath)) return true;

	return false;
}
*/

RMMVGames.prototype.parse = async function($MV_PATH, options) {
	console.log("Parsing RMMVData with options:", this.options);
	RMMVGames.lastAttachments = {};
	$MV_PATH 	= $MV_PATH || this.dirname;
	options 	= options || this.options || {};
	options.translationDatas = options.translationDatas || this.options.translationDatas || {};
	await ui.log("Determine root directory of the game");
	await this.determineGameRootDir();
	await ui.log("Root dir is: "+this.gameRoot);
	await ui.log("Parsing data");

	$MV_PATH = this.gameRoot;
	var files = [];
	if (empty(this.options.files)) {
		files = await common.readDir(nwPath.join($MV_PATH, "data"));
	} else {
		files = [];
		for (let i=0; i<this.options.files.length; i++) {
			files.push(nwPath.join($MV_PATH,this.options.files[i]));
		}
	}


	var $RESULT = {};
	for (var $key in files) {
		var $path 				= files[$key];
		var $fileInfo 			= {};
		var relativePath 		= RMMVData.getRelativePath($path, $MV_PATH);
		if (this.processThispath(relativePath) == false) continue;

		$fileInfo['extension'] 	= nwPath.extname($path).toLowerCase().substring(1);
		$fileInfo['dataType'] 	= RMMVData.determineType($path);
		$fileInfo['filename'] 	= nwPath.basename($path, nwPath.extname($path));
		$fileInfo['basename'] 	= nwPath.basename($path);
		$fileInfo['path'] 		= relativePath;
		$fileInfo['relPath'] 	= relativePath;
		$fileInfo['dirname'] 	= "/"+nwPath.dirname(relativePath);

		if ($fileInfo['extension'] !== 'json')	continue;

		console.log("File info:", $fileInfo);
		var content = await common.fileGetContents($path, "utf8");
		if (!common.isJSON(content)) continue;
		var $currentData = JSON.parse(content);
		if (empty($currentData)) continue;
		var rmmvData = new RMMVData($currentData, {
			fileInfo: $fileInfo,
			exportOptions: this.options.exportOptions,
		});

		console.log("%c Relative path is : "+relativePath, 'background: yellow; color: #111');
		rmmvData.fileInfo = $fileInfo;

		await ui.log("Parsing "+relativePath);
		
		var thisFetch;

		//rmmvData.data = $currentData;
		if (options.writeMode) {
			rmmvData.writeMode = true;
			rmmvData.writableObj = common.clone($currentData);
			if (!empty(options.translationDatas)) {
				var translationData = RMMVData.selectTranslationData(options.translationDatas, relativePath);
				console.log("Translation Data:", translationData);
				translationData = translationData || {};
				rmmvData.translationPair = translationData.translationPair || {};
				rmmvData.translationInfo = translationData.info || {};
			}
		}

		switch ($fileInfo['dataType']) {
			case "items":
			case "armors":
			case "weapons":
				thisFetch = rmmvData.fetchCommonData($currentData, ["name", "description", "note"], [$fileInfo['filename']]);
				$RESULT[$path] = thisFetch;
				break;
			case "skills":
				thisFetch = rmmvData.fetchCommonData($currentData, ["name", "description", "message1", "message2", "note"], [$fileInfo['filename']]);
				$RESULT[$path] = thisFetch;
				break;
			case "states":
				thisFetch = rmmvData.fetchCommonData($currentData, ["name", "message1", "message2", "message3", "message4", "note"], [$fileInfo['filename']]);
				$RESULT[$path] = thisFetch;
				break;
			case "classes":
			case "enemies":
			case "tilesets":
				thisFetch = rmmvData.fetchCommonData($currentData,["name", "note"], [$fileInfo['filename']]);
				$RESULT[$path] = thisFetch;
				break;
			case "animations":
			case "mapinfos":
				thisFetch = rmmvData.fetchCommonData($currentData, ["name"], [$fileInfo['filename']]);
				$RESULT[$path] = thisFetch;
				break;
			case "actors":
				thisFetch = rmmvData.fetchCommonData($currentData, ["name", "nickname", "note", "profile"], [$fileInfo['filename']]);
				$RESULT[$path] = thisFetch;
				break;
			case "map":
				thisFetch = {};
				//$newData = {};
				// fetch map name
				rmmvData.registerStringObject($currentData, 'displayName', [$fileInfo.filename, "displayName"], [], {currentAddress:["displayName"]})

				// fetch map note
				rmmvData.registerStringObject($currentData, 'note', [$fileInfo.filename, "note"], [], {currentAddress:["note"]})

				
				if ($currentData['events'].length>1) {
					for (let $eIndex=1; $eIndex<$currentData['events'].length; $eIndex++) {
						if (empty($currentData['events'][$eIndex])) continue;
						// fetch event name
						//rmmvData.registerString($currentData['events'][$eIndex]['name'], [$fileInfo.filename, "events", $eIndex, "name"], [], {currentAddress : ["events", $eIndex, "name"]})
						rmmvData.registerStringObject($currentData['events'][$eIndex], 'name', [$fileInfo.filename, "events", $eIndex, "name"], [], {currentAddress : ["events", $eIndex, "name"]})
						// fetch event note
						//rmmvData.registerString($currentData['events'][$eIndex]['note'], [$fileInfo.filename, "events", $eIndex, "note"], [], {currentAddress : ["events", $eIndex, "note"]})
						rmmvData.registerStringObject($currentData['events'][$eIndex], 'note', [$fileInfo.filename, "events", $eIndex, "note"], [], {currentAddress : ["events", $eIndex, "note"]})
						// fetch event pages content
						let eventPage = await rmmvData.fetchEventPages($currentData['events'][$eIndex]['pages'], [$fileInfo.filename, "events", $eIndex, "pages"], thisFetch, {currentAddress:["events", $eIndex, "pages"]});	
						//if (options.writeMode) rmmvData.writableObj['events'][$eIndex]['pages'] = eventPage;
						if (options.writeMode) $currentData['events'][$eIndex]['pages'] = eventPage;
					}
				}

				// writableObj is same with $currentData
				rmmvData.writableObj = $currentData;
				$RESULT[$path] = rmmvData;
				break;
			case "troops":
				if ($currentData.length<2) break;
				if (empty($currentData)) continue;

				rmmvData.fetchCommonData($currentData, ["name"], [$fileInfo['filename']]);
			
				for (let $eIndex=1; $eIndex < $currentData.length; $eIndex++) {
					if (empty($currentData[$eIndex]['pages'])) continue;
					// fetch event pages content
					let eventPage = await rmmvData.fetchEventPages($currentData[$eIndex]['pages'], [$fileInfo.filename, $eIndex, "pages"], thisFetch, {currentAddress:[$eIndex, "pages"]});	
					if (options.writeMode) rmmvData.writableObj[$eIndex]['pages'] = eventPage;

				}
				
				$RESULT[$path] = rmmvData;
				break;
			case "commonevents": 
				if ($currentData.length<2) break;
				if (empty($currentData)) continue;

				// fetch name manually
				for (let $eIndex=1; $eIndex<$currentData.length; $eIndex++) {
					if (empty($currentData[$eIndex])) continue;
					if (empty($currentData[$eIndex]['name'])) continue;

					//rmmvData.registerString($currentData[$eIndex]['name'], [$fileInfo.filename, $eIndex, "name"], [], {currentAddress:[$eIndex, "name"]})
					rmmvData.registerStringObject($currentData[$eIndex], 'name', [$fileInfo.filename, $eIndex, "name"], [], {currentAddress:[$eIndex, "name"]})

				}

				// the entire common events are a single event pages
				var eventPage = await rmmvData.fetchEventPages($currentData, [$fileInfo.filename], thisFetch, {currentAddress:[]});	
				if (options.writeMode) rmmvData.writableObj = eventPage;

				$RESULT[$path] = rmmvData;
				break;
			case "system":
				$RESULT[$path] = rmmvData.fetchSystem($currentData, [$fileInfo.filename]);
			
				break;
			default:
				$RESULT[$path] = rmmvData.fetchFromOtherJson($currentData, [$fileInfo.filename]);

				break;
		}

	}	
	
	//return  this.normalizeMVData($RESULT);
	this.isExtracted = true;
	this.parsed = $RESULT;	
	console.log("RMMVGame parsed result", this);
	return $RESULT;
}

RMMVGames.prototype.newProject = async function(initOptions) {
	console.log("RMMVGames.prototype.newProject");
	initOptions = Object.assign({}, initOptions);
	initOptions.entryPoint = initOptions.entryPoint || this.gameFile;

	// --- Start loading console ---
	ui.showLoading();
	ui.loadingProgress("Processing", "Creating a new RMMV/RMMZ project.", {consoleOnly:false, mode:'consoleOutput'});
	await ui.log("RMMVJS Parser version : "+thisAddon.package.version);
	await ui.log("Creating project from "+this.dirname);
	await ui.log("Entry point is: "+this.gameFile);

	try {
		var transData = await this.toTrans();
		console.log("Generated transData:", transData);
		trans.openFromTransObj({project:transData}, {
			isNew: true,
			onAfterLoading: function() {
				this.project.options = this.project.options || {};
				this.project.options.init = initOptions;
			}
		});
		if (initOptions.includePlugins === true) {
			// Load plugins immediately (awaited) so that prepareNewProject / updateProject
			// can capture plugin file rows in the new project before importing old translations.
			await loadPlugins();
		} else if (initOptions.includePlugins === false) {
			// user opted out during project creation — skip
		} else {
			// no stored choice (legacy / direct call) — ask after the loading console closes
			ui.one("loadingConsoleClosed", async ()=> {
				confirmLoadPlugins(async () => {
					await loadPlugins();
				});
			});
		}
	} catch (e) {
		console.error(e);
		ui.logError("Error occured! Please see console window(F12) for more information", e.toString());
	}

	//ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
	//ui.loadingEnd();
	console.log("RMMVGames", this);
}

RMMVGames.prototype.exportToFolder = async function(targetFolder, options) {
	console.log("RMMVGames.prototype.exportToFolder options:", options);
	if (options.translationDatas) console.log("Translation Datas already assigned");
	options 						= options || this.options || {};
	options.transData				= options.transData || trans.getSaveData();
	options.translationDatas 		= options.translationDatas || trans.getTranslationData(options.transData, {filterTag:options.filterTag, filterTagMode:options.filterTagMode, files:options.files});
	this.options.translationDatas 	= options.translationDatas || this.options.translationDatas || {};
	this.options.writeMode 			= true;
	this.options.exportOptions 		= options.custom || {};

	try {
		console.log("export to folder with options:", options);
		await common.mkDir(targetFolder);
		await this.parse(undefined);

		console.log("----Parsed result", this);
		for (var path in this.parsed) {
			var newFile = nwPath.join(targetFolder, this.parsed[path].fileInfo.relPath);
			//await ui.log("Creating directory if not exist:", nwPath.dirname(newFile));
			await common.mkDir(nwPath.dirname(newFile));
			await ui.log("Writing file :", newFile);

			if (!this.parsed[path].writableObj) continue;
			if (thisAddon.config.beautifyJSON) {
				await common.filePutContents(newFile, JSON.stringify(this.parsed[path].writableObj, undefined, 2), 'UTF-8', false);
			} else {
				await common.filePutContents(newFile, JSON.stringify(this.parsed[path].writableObj), 'UTF-8', false);
			}
		}
	} catch (e) {
		console.error(e);
		ui.logError("Error occured! Please see console window(F12) for more information", e.toString());
	}
}


thisAddon.RMMVGames = RMMVGames;



/**
 * @param  {} rootDir
 * rootDir is the place where index.html resides
 * @param  {} options
 */
var RMMV = function(rootDir, options) {
	this.rootDir 		= rootDir;
	this.options		= options || {};
	this.options.pluginPath	= this.options.pluginPath || "js/plugins/";
	this.options.translationDatas = this.options.translationDatas || {}
	this.options.files		= this.options.files || [];
}

RMMV.prototype.processThispath = function(relPath) {
	console.log("Is file processed:", relPath, this.options.files);

	if (!(this.options)) return true;
	if (empty(this.options.files)) return true;

	relPath = relPath.replaceAll("\\", "/");
	if (relPath[0] == "/") relPath = relPath.substr(1);

	if (this.options.files.includes(relPath)) return true;

	return false;
}

// utils
RMMV.getExe = async function(dir) {
	var list = await common.getAllExt(dir, "exe");
	var blacklist = ["notification_helper"]
	for (var i in list) {
		if (blacklist.includes(list[i])) continue;
		return list[i];
	}
	return false;
}

/**
 * Find NW.js executable inside a given directory.
 * Search order:
 * 1. If Game.exe (or game.exe) exists in the provided dir, use that.
 * 2. Otherwise, glob for *.exe recursively and filter blacklist.
 *    Excluded names: chromedriver.exe, notification_helper.exe, nwjc.exe, payload.exe
 * If multiple candidates remain, return the first one.
 * Returns full path to executable or false if none found.
 */
RMMV.findNwjsExecutable = async function(targetDir) {
	if (!targetDir) return false;
	try {
		// prefer Game.exe (case-insensitive on Windows)
		var gameExe1 = nwPath.join(targetDir, "Game.exe");
		var gameExe2 = nwPath.join(targetDir, "game.exe");
		if (await common.isFileAsync(gameExe1)) return gameExe1;
		if (await common.isFileAsync(gameExe2)) return gameExe2;

		// use glob to search for exe files recursively
		const glob = require('glob');
		const pattern = nwPath.join(targetDir, "**", "*.exe");
		// use sync search; convert to platform-correct paths
		var files = glob.sync(pattern, {nodir: true, nocase: true});
		if (!files || files.length === 0) return false;

		// blacklist basenames
		const blacklist = ["chromedriver.exe", "notification_helper.exe", "nwjc.exe", "payload.exe"];
		var candidates = files.filter(p => {
			var base = nwPath.basename(p).toLowerCase();
			if (blacklist.includes(base)) return false;
			return true;
		});

		if (candidates.length === 0) return false;
		// return the first candidate
		return candidates[0];
	} catch (e) {
		console.warn("findNwjsExecutable error", e);
		return false;
	}
}

/**
 * load data relative to rootDir
 * data will be stored to files
 * @param  {} files
 */
RMMV.prototype.load = async function(files) {
	this.files = this.files || {};
	if (Array.isArray(files) == false) files = [files];

	var output = {};
	for (var i in files) {
		var fullPath = nwPath.join(this.rootDir, files[i]);
		if (!await common.isFileAsync(fullPath)) continue;
		try {
			var raw = await common.fileGetContents(fullPath);
			this.files[files] = JSON.parse(raw);
			output[files] = this.files[files];
		} catch (e) {
			console.warn(e)
		}

	}
	return output;
}

/**
 * Parse JSON content of plugins.js
 * plugins.js itself is a js file not a json file
 * so we need to get anything between the first "[" to the last "]"
 * @param  {String} pluginContent - Content of plugins.js
 */
RMMV.getParsedPluginContent = function(pluginContent) {
	var start = pluginContent.indexOf("[");
	var end = pluginContent.lastIndexOf("]");
	var trimmed = pluginContent.substring(start, end+1);		

	try {
		this.plugins = JSON.parse(trimmed);
	} catch(e) {
		console.warn("error when parsing plugin script");
	}
	return this.plugins;
}

RMMV.prototype.parsePluginList = async function(options) {
	console.log("opening", nwPath.join(this.rootDir, "js/plugins.js"));
	try {
		var pluginContent = await common.fileGetContents(nwPath.join(this.rootDir, "js/plugins.js"));

	} catch (e) {
		console.warn(e);
		return;
	}
	var start = pluginContent.indexOf("[");
	var end = pluginContent.lastIndexOf("]");
	var trimmed = pluginContent.substring(start, end+1);		

	try {
		this.plugins = JSON.parse(trimmed);
	} catch(e) {
		console.warn("error when parsing plugin script");
	}
	return this.plugins;
}

/**
 * Dump untranslated plugins to directory
 * @param  {} dir
 */
RMMV.prototype.dumpPluginsToDir = async function(dir) {
	if (!dir) throw "first argument (dir) is blank"
	if (!this.plugins) await this.parsePlugins();
	await common.mkDir(dir);
	for (var file in this.pluginData) {
		var targetPath = nwPath.join(dir, file);
		await bCopy(this.pluginData[file].file, targetPath);
	}
	console.log("Copying pluginlist");
	var pluginList = nwPath.join(this.rootDir, "js/plugins.js");
	await bCopy(pluginList, nwPath.join(dir, "js/plugins.js"));
}

RMMV.prototype.writePluginListTo = async function(targetPath) {
	console.log("writePluginListTo", targetPath);

	var pluginString = this.pluginListObj.toString();
	console.log("Plugin String:", pluginString);
	if (pluginString == "[]") {
		// if the plugin list is empty, need to add line break.
		pluginString = "[\n]";
		console.log("Empty plugin list, adding line break", pluginString);
	}

	const translatedStr = `// Generated by Translator++.\n// Do not edit this file directly.\nvar $plugins =\n`+pluginString+";";
	console.log("Writing", targetPath);
	await common.mkDir(nwPath.dirname(targetPath));
	await common.writeFile(targetPath, translatedStr);
	console.log("Written:", targetPath);
}

RMMV.prototype.exportPluginsToFolder = async function(dir) {
	if (!dir) throw "first argument (dir) is blank"
	if (!this.plugins) await this.parsePlugins();
	await common.mkDir(dir);	
	for (var file in this.pluginData) {
		var targetPath = nwPath.join(dir, file);
		await ui.log("exporting "+targetPath);
		this.pluginData[file].writeTo(targetPath);
	}
	await ui.log("exporting plugins.js");
	try {
		if (this.processThispath("js/plugins.js")) await this.writePluginListTo(nwPath.join(dir, "js/plugins.js"))
	} catch (e) {
		console.warn("failed to write plugin list", e);
	}
	console.log("exporting plugin list done");
}

RMMV.prototype.selectTranslationData = function(path) {
	// must match trans.project.files[thefile].path
	var newPath = "/"+path;
	newPath = newPath.replace(/\\/g, "/");
	return this.options.translationDatas[newPath];
	
}

RMMV.prototype.parsePlugins = async function(options) {
	options = options || this.options || {};
	options.baseDir = options.baseDir || this.rootDir;

	// parse plugins
	if (!this.plugins) await this.parsePluginList(options);
	this.pluginData = {};

	console.log("Plugins : ", this.plugins);
	for (var i in this.plugins) {
		var thisPath 	= nwPath.join(this.rootDir, this.options.pluginPath, this.plugins[i].name+".js");
		var pluginPath 	= nwPath.join(this.options.pluginPath, this.plugins[i].name+".js");
		pluginPath 		= pluginPath.replaceAll("\\", "/");
		if (this.processThispath(pluginPath) == false) continue;
		
		ui.log("parsing "+ thisPath);
		if (await common.isFileAsync(thisPath) == false) continue;
		
		this.pluginData[pluginPath] = new ESFile(thisPath, options);
		await this.pluginData[pluginPath].init();
		//this.pluginData[pluginPath].setTranslationData(this.selectTranslationData(pluginPath));
		this.pluginData[pluginPath].esScript.assignTranslationPair(pluginPath);
		console.log("%cParsing plugin:", "color:aqua", thisPath, this.pluginData[pluginPath]);

		await this.pluginData[pluginPath].toTrans();
	}
	if (this.processThispath("js/plugins.js")) await this.parsePluginListToTrans(options);
	return this;
}

RMMV.prototype.parsePluginListToTrans = async function(options) {
	options = options || this.options || {};
	var thisRelPath = "js/plugins.js";

	if (!this.plugins) await this.parsePluginList(options);
	console.log(">>parsePluginListToTrans -> options:", options);
	ui.log("Parsing plugins.js");
	this.options.translationDatas 	= this.options.translationDatas || {};

	this.pluginListObj 				= new JSONTranslate(this.plugins, {beautifyOutput:true});
	this.pluginListObj.assignTranslationPair("js/plugins.js", this.options.translationDatas);
	this.pluginListObj.filter = function(string, context) {
		//var contextString = newContext.join("/");
		if (context.includes("parameters") == false) return false;
		return true;
	}

	await this.pluginListObj.parse();
	this.pluginListTrans 			= this.pluginListObj.transData;
	this.pluginListTrans.basename 	= nwPath.basename(thisRelPath);
	this.pluginListTrans.filename 	= nwPath.basename(thisRelPath);
	this.pluginListTrans.extension 	= nwPath.extname(thisRelPath);
	this.pluginListTrans.dirname 	= nwPath.dirname(thisRelPath);
	this.pluginListTrans.path		= thisRelPath;
	this.pluginListTrans.tags		= [];
	this.pluginListTrans.lineBreak  = "\n";
}

RMMV.prototype.pluginsToTrans = async function(transData) {
	transData = transData || trans;
	transData.project = transData.project || {};
	transData.project.files = transData.project.files || {};
	if (Boolean(this.pluginData) == false) await this.parsePlugins();
	for (var path in this.pluginData) {
		var nPath = path.replace(/\\/g, "/");
		transData.project.files[nPath] = this.pluginData[path].trans;
	}

	transData.project.files["js/plugins.js"] = this.pluginListTrans;
	return transData;
}

window.RMMV = RMMV;




var RMMVDecrypter = function(rootDir, options) {
	this.rootDir 		= rootDir;
	this.options 		= options;
}

RMMVDecrypter.prototype.loadData = async function(file) {
	this.files = this.files || {};

	var fullPath = nwPath.join(this.rootDir, file);
	console.log("Loading data from", fullPath);
	if (!await common.isFileAsync(fullPath)) return;
	try {
		var raw = await common.fileGetContents(fullPath);
		return JSON.parse(raw);
	} catch(e) {
		console.warn(e);
	}

}

RMMVDecrypter.prototype.loadSystem = async function() {
	try {
		this.system = await this.loadData("data/System.json");
		RMMVDecrypter.Decrypter.rawEncriptionKey = this.system.encryptionKey;
	} catch (e) {
		alert(t("Error loading system.json")+e.toString());
		throw e;
	}
}

RMMVDecrypter.prototype.getRelativePath = function(path) {
	return path.substring(this.rootDir.length);
}

RMMVDecrypter.prototype.decryptAll = async function(targetDir) {
	targetDir = targetDir || this.rootDir;
	var possibleExt = [
		".rpgmvo", ".rpgmvm", ".rpgmvp", //mv
		".png_", ".ogg_", ".m4a_" //mz
	];
	if (!this.isInitialized) await this.init();

	var maxItem = 0;
	for (let i in this.dirContent) {
		if (!possibleExt.includes(nwPath.extname(this.dirContent[i]).toLowerCase())) continue;
		maxItem++
	}
	console.log("maxItem", maxItem);
	await ui.log(`${maxItem} items found!`);

	var x = 0;
	for (let i in this.dirContent) {
		if (!possibleExt.includes(nwPath.extname(this.dirContent[i]).toLowerCase())) continue;
		let newPath = RMMVDecrypter.Decrypter.extToDecryptExt(nwPath.join(targetDir, this.getRelativePath(this.dirContent[i])));
		console.log("Decrypting", this.dirContent[i], "into", newPath);
		try {
			await common.mkDir(nwPath.dirname(newPath));
		} catch (e) {
			// do nothing
		}

		await ui.loadingProgress(Math.round((x/maxItem)*100));
		await ui.log(`Decrypting: ${this.dirContent[i]}`);
		await RMMVDecrypter.Decrypter.decrypt(this.dirContent[i], newPath);
		x++;
	}
	await ui.log(`All done!`);
	ui.loadingEnd();
}

RMMVDecrypter.prototype.init = async function() {
	await this.loadSystem();
	this.dirContent = await common.readDir(this.rootDir);
	this.isInitialized = true;
}


function Decrypter() {
    throw new Error('This is a static class');
}

Decrypter.rawEncriptionKey = ""; // get from System.encryptionKey
Decrypter.hasEncryptedImages = false;
Decrypter.hasEncryptedAudio = false;
Decrypter._requestImgFile = [];
Decrypter._headerlength = 16;
Decrypter._xhrOk = 400;
Decrypter._encryptionKey = "";
Decrypter._ignoreList = [
    "img/system/Window.png"
];
Decrypter.SIGNATURE = "5250474d56000000";
Decrypter.VER = "000301";
Decrypter.REMAIN = "0000000000";

Decrypter.checkImgIgnore = function(url){
    for(var cnt = 0; cnt < this._ignoreList.length; cnt++) {
        if(url === this._ignoreList[cnt]) return true;
    }
    return false;
};

Decrypter.decrypt = async function(path, targetPath) {
	return new Promise((resolve, reject) => {
		console.log(path);
		fs.readFile(path, async (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			//console.log("data", data);
			var arrayBuffer = Decrypter.decryptArrayBuffer(data);
			//console.log("Writing : ", targetPath);
			if (targetPath) await common.writeFile(targetPath, this.toBuffer(arrayBuffer));
			//console.log("done writing");
			resolve(arrayBuffer);
		});
	})

};

Decrypter.cutArrayHeader = function(arrayBuffer, length) {
    return arrayBuffer.slice(length);
};

Decrypter.decryptArrayBuffer = function(arrayBuffer) {
    if (!arrayBuffer) return null;
	if (arrayBuffer instanceof Buffer) {
		arrayBuffer = arrayBuffer.buffer.slice(arrayBuffer.byteOffset, arrayBuffer.byteOffset + arrayBuffer.byteLength);
	}
    var header = new Uint8Array(arrayBuffer, 0, this._headerlength);

    var i;
    var ref = this.SIGNATURE + this.VER + this.REMAIN;
    var refBytes = new Uint8Array(16);
    for (i = 0; i < this._headerlength; i++) {
        refBytes[i] = parseInt("0x" + ref.substr(i * 2, 2), 16);
    }
    for (i = 0; i < this._headerlength; i++) {
        if (header[i] !== refBytes[i]) {
            throw new Error("Header is wrong");
        }
    }

    arrayBuffer = this.cutArrayHeader(arrayBuffer, Decrypter._headerlength);
    var view = new DataView(arrayBuffer);
    this.readEncryptionkey();
    if (arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer);
        for (i = 0; i < this._headerlength; i++) {
            byteArray[i] = byteArray[i] ^ parseInt(Decrypter._encryptionKey[i], 16);
            view.setUint8(i, byteArray[i]);
        }
    }

    return arrayBuffer;
};

Decrypter.createBlobUrl = function(arrayBuffer){
    var blob = new Blob([arrayBuffer]);
    return window.URL.createObjectURL(blob);
};

Decrypter.toBuffer = function(arrayBuffer) {
	return Buffer.from(arrayBuffer)
}

Decrypter.extToEncryptExt = function(url) {
    var ext = url.split('.').pop();
    var encryptedExt = ext;

    if(ext === "ogg") encryptedExt = ".rpgmvo";
    else if(ext === "m4a") encryptedExt = ".rpgmvm";
    else if(ext === "png") encryptedExt = ".rpgmvp";
    else encryptedExt = ext;

    return url.slice(0, url.lastIndexOf(ext) - 1) + encryptedExt;
};

Decrypter.extToDecryptExt = function(url) {
    var ext = url.split('.').pop();
    var encryptedExt = ext;

    if(ext === "rpgmvo") encryptedExt = ".ogg";
    else if(ext === "rpgmvm") encryptedExt = ".m4a";
    else if(ext === "rpgmvp") encryptedExt = ".png";
    else if(ext === "png_") encryptedExt = ".png";
    else if(ext === "ogg_") encryptedExt = ".ogg";
    else if(ext === "m4a_") encryptedExt = ".m4a";
    else encryptedExt = ext;

    return url.slice(0, url.lastIndexOf(ext) - 1) + encryptedExt;
};

Decrypter.readEncryptionkey = function(){
    //this._encryptionKey = $dataSystem.encryptionKey.split(/(.{2})/).filter(Boolean);
	this._encryptionKey = this.rawEncriptionKey.split(/(.{2})/).filter(Boolean);
};

RMMVDecrypter.Decrypter = Decrypter;

window.RMMVDecrypter = RMMVDecrypter;

var decryptTo = async function(from, to) {
	console.log("Decrypting", from, to);
	var thisDecrypter = new RMMVDecrypter(from);
	await thisDecrypter.decryptAll(to);
}


/**
 * if engine is rmmv -> /www
 */
var adaptPath = function(path, engine) {
	engine = engine || trans.project.gameEngine;
	if (engine == "rmmv") return nwPath.join(path, "www");

	return path;
}


var applyTranslationPHP = async function(sourceMaterial, targetDir, options) {
	options = options||{};
	options.options		= options.options||{};
	options.mode 		= "dir"; // always dir
	options.onDone 		= options.onDone||function() {};
	options.dataPath 	= options.dataPath || ""; // location of data path (data folder). Default is using cache
	options.transPath	= options.transPath || ""; // location of .trans path to process. Default is using autosave on cache folder
	options.options.filterTag = options.options.filterTag||{};
	options.options.filterTagMode = options.options.filterTagMode||""; // whitelist or blacklist
	
	var transPath = targetDir+"\\translation.trans";
	var child_process = require('child_process');
	// remove existing data directory
	
	child_process.spawnSync("RMDIR", [targetDir+"\\www\\Data", "/S", "/Q"]);
	
	//ui.loadingClearButton();
	ui.showLoading();
	ui.loadingProgress("Loading", "Copying data...", {consoleOnly:true, mode:'consoleOutput'});
	
	return new Promise(async (resolve, reject) => {
		php.extractEnigma(sourceMaterial, targetDir, {
			onData: function(data) {
				ui.loadingProgress("Loading", data, {consoleOnly:true, mode:'consoleOutput'});
			},
			onDone: async function() {
				
				var autofillFiles = [];
				var checkbox = $(".fileList .data-selector .fileCheckbox:checked");
				for (var i=0; i<checkbox.length; i++) {
					autofillFiles.push(checkbox.eq(i).attr("value"));
				}
				options.files = options.files||autofillFiles||[];
				var hasError = false;
				await trans.save(transPath);
				//ui.showLoading();
				php.spawn("apply.php", {
					args:{
						gameFolder:trans.gameFolder,
						gameTitle:trans.gameTitle,
						projectId:trans.projectId,
						gameEngine:trans.gameEngine,
						files:options.files,
						exportMode:options.mode,
						options:options.options,
						rpgTransFormat:trans.config.rpgTransFormat,
						transPath:transPath,
						targetPath:targetDir
					},
					onData:function(buffer) {
						ui.loadingProgress("Loading", buffer, {consoleOnly:true, mode:'consoleOutput'});
						
					},
					onError:function(buffer) {
						ui.loadingProgress("Loading", buffer, {consoleOnly:true, mode:'consoleOutput', classStr:'stderr'});
						hasError = true;
					},
					onDone: async function(data) {
						//console.log(data); 
						console.log("done")
						//ui.hideLoading(true);
						ui.loadingEnd("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput', error:hasError});
						ui.LoadingAddButton("Open folder", function() {
							nw.Shell.showItemInFolder(transPath);
						},{
							class: "icon-folder-open"
						});
						ui.LoadingAddButton("Play!", function() {
							console.log("Opening game");
							nw.Shell.openItem(targetDir+"\\Game.exe");
						},{
							class: "icon-play"
						});
						
						ui.showCloseButton();
						if (hasError) {
							var conf = confirm("An error has occured when applying your translation\r\nYour game might can not be played properly.\r\nDo you want to read the online documentation?");
							if (conf) nw.Shell.openExternal(nw.App.manifest.localConfig.defaultDocsUrl+trans.gameEngine);
						}
						
						options.onDone.call(trans, data);
						resolve(trans);
					}
				})
				
				
			}});	
		})
	}

var exportToFolderPHP = async function(file, options) {
	// export translation
	if (typeof file=="undefined") return false;
	
	options = options||{};
	options.options = options.options||{};

	options.mode = "dir"; // always dir
	options.onDone = options.onDone||function() {};
	options.dataPath = options.dataPath || ""; // location of data path (data folder). Default is using cache
	options.transPath = options.transPath || ""; // location of .trans path to process. Default is using autosave on cache folder
	options.options.filterTag = options.options.filterTag||[];
	options.options.filterTagMode = options.options.filterTagMode||""; // whitelist or blacklist
	
	console.log("exporting project", arguments);
	
	var autofillFiles = [];
	var checkbox = $(".fileList .data-selector .fileCheckbox:checked");
	for (var i=0; i<checkbox.length; i++) {
		autofillFiles.push(checkbox.eq(i).attr("value"));
	}
	options.files = options.files||autofillFiles||[];

	await trans.autoSave()
	ui.showLoading();

	return new Promise((resolve, reject) => {
		php.spawn("export.php", {
			args:{
				path:file,
				gameFolder:trans.gameFolder,
				gameTitle:trans.gameTitle,
				projectId:trans.projectId,
				gameEngine:trans.gameEngine,
				files:options.files,
				exportMode:options.mode,
				options:options.options,
				rpgTransFormat:trans.config.rpgTransFormat,
				dataPath:options.dataPath,
				transPath:options.transPath
			},
			onData:function(buffer) {
				ui.loadingProgress(t("Loading"), buffer, {consoleOnly:true, mode:'consoleOutput'});
				
			},
			onError:function(buffer) {
				ui.loadingProgress(t("Loading"), buffer, {consoleOnly:true, mode:'consoleOutput', classStr:'stderr'});
				
			},
			onDone: function(data) {
				//console.log(data); 
				console.log("done")
				//ui.hideLoading(true);
				//ui.loadingProgress(t("Finished"), t("All process finished!"), {consoleOnly:false, mode:'consoleOutput'});
				
				//ui.showCloseButton();
				options.onDone.call(trans, data);
				resolve(data);
			}
		})
	})
	
}

/**
 * Export JS scripts to folder
 * @param  {} sourceDir
 * @param  {} targetDir
 * @param  {} transData
 * @param  {} options
 */
var exportPluginsToFolder = async function(sourceDir, targetDir, transData, options) {
	console.log("Exporting into a folder exportPluginsToFolder():", arguments);
	options = options||{};
	try {
		options.writeEncoding = options.writeEncoding || trans.project.writeEncoding;
	} catch (e) {
		options.writeEncoding = "utf8";
	}
	transData = transData || trans.getSaveData();
	
	//options.groupIndex = options.groupIndex||"relPath";
	
	var translationData = options.translationDatas || trans.getTranslationData(transData, options);

	console.log("translation Data : ", translationData);
	var rmmv = new RMMV(sourceDir, {
		'writeMode' 		: true,
		//'translationDatas'	: translationData.translationData,
		'translationDatas'	: translationData,
		'files'				: options.files
	});	
	window.rmmv = rmmv;
	
	try {
		await rmmv.exportPluginsToFolder(targetDir);
	} catch (e) {
		console.error(e);
		ui.logError("Error occured! Please see console window(F12) for more information", e.toString());
	}

}



var applyTranslation = async function(sourceDir, targetDir, transData, options) {
	options 		= options||{};
	transData 		= transData || trans.getSaveData();
	
	// real path first then temporary
	if (await common.isDirectory(sourceDir)) {
		// directory from inject dialog are root game folder (without www in rmmv)
		sourceDir = adaptPath(targetDir);
	}  else {
		// use stagging data
		sourceDir = transData.project.cache.cachePath;
		if (await common.isDirectory(sourceDir)) {
			// in stagging path, data and js folders are inside data directory
			sourceDir = nwPath.join(sourceDir, "data");
		} else {
			alert("Staging path not found "+sourceDir);
		}
	}

	targetDir = adaptPath(targetDir);
	console.warn("Running post injection ->", arguments);

	console.log("copy from", sourceDir, "to:", targetDir);
	
	await exportPluginsToFolder(sourceDir, targetDir, transData, options);

	
}

var createEditorFile = async function(dir, engine) {
	engine = engine || trans.project.gameEngine;
	var path;
	if (engine == "rmmv") {
		path = nwPath.join(dir, "www/Game.rpgproject");
		if (await common.isFileAsync(path)) return path;
		await common.writeFile(path, "RPGMV 1.5.0")
	} else {
		path = nwPath.join(dir, "Game.rmmzproject");
		if (await common.isFileAsync(path)) return path;
		await common.writeFile(path, "RPGMZ 1.0.1")
	}
	return path;
}

var openEditor = async function(dir, engine) {
	engine = engine || trans.project.gameEngine;
	var path = await createEditorFile(dir, engine);
	console.log("opening", path);
	nw.Shell.openExternal(path);

}

var playGame = async function(dir) {
	//dir = adaptPath(dir);
	var indexFile = nwPath.join(dir, "index.html");

	if (await common.isFileAsync(nwPath.join(dir, "www", "index.html"))) {
		indexFile = nwPath.join(dir, "www", "index.html");
	}

	if (await common.isFileAsync(indexFile) == false) {
		return alert(t("index.html not found in")+": "+dir);
	}

	nw.Window.open(indexFile, 
	{
		// id will makes the search window will be spawned once
		'id': "mvTestplay"+window.windowIndex
	},
	function(thisWin) {
		//ui.windows['search']
	})
}

var openDecryptorWindow = function(from, to, options) {
	from = from || "";
	to = to || "";
	var $popup = $("#rmmv_decryptorDialog");
	if ($popup.length == 0) {
		var dvField = new DVField();
		$popup = $("<div id='rmmv_decryptorDialog'></div>");
		var $content = ($(`<div>
			<h2 data-tran="">${t('Encrypted game')}</h2>
			<div data-tran="">
				${t('Select the index.html of your encrypted game.')}
			</div>
			<label>
				<input type="dvSelectPath" class="fromPath form-control" accept=".html" value="${from}" />
			</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">${(`Field can not be empty!`)}</div>
		</div>
		<div>
			<h2 data-tran="">${t('Target folder')}</h2>
			<div data-tran="">
			${t('Select destination folder. The process will replace the existing files.')}
			</div>
			<label>
				<input type="dvSelectPath" class="toPath form-control" nwdirectory value="${to}" />
			</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">${(`Field can not be empty!`)}</div>
		</div>`));
		console.log("rendering ", $popup);
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));

		$popup.empty();
		$popup.append($content);
	}
	$popup.dialog({
		title: t("Decrypt Resources"),
		autoOpen: false,
		modal:true,
		width:640,
		height:320,
		minWidth:640,
		minHeight:320,
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
				text: t("Process"),
				click: async function() {
					var $this = $(this)
					var from = $this.find(".fromPath").val()
					if (!from) return alert(t("Source path can not empty"));
					var to = $this.find(".toPath").val()
					if (!to) return alert(t("Destination path can not empty"));

					if (await common.isFileAsync(from) == false) return alert(t('Path is not a file:')+from);
					if (await common.isDirectory(to) == false) return alert(t('Invalid directory:')+to);
					
					$this.dialog( "close" );

					ui.showLoading();
					await decryptTo(nwPath.dirname(from),  to);
					ui.showCloseButton();
				}
			}

		]
	});	
	$popup.dialog("open");
}


var extractEnigma = function(from, to, options) {
	from = from || "";
	to = to || "";
	var $popup = $("#rmmv_extractEnigma");
	if ($popup.length == 0) {
		var dvField = new DVField();
		$popup = $("<div id='rmmv_extractEnigma'></div>");
		var $content = ($(`<div>
			<h2 data-tran="">${t('Extract enigma')}</h2>
			<div data-tran="">
				${t('Select enigma file.')}
			</div>
			<label>
				<input type="dvSelectPath" class="fromPath form-control" accept=".exe" value="${from}" />
			</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">${(`Field can not be empty!`)}</div>
		</div>
		<div>
			<h2 data-tran="">${t('Target folder')}</h2>
			<div data-tran="">
			${t('Select destination folder. The process will replace the existing files.')}
			</div>
			<label>
				<input type="dvSelectPath" class="toPath form-control" nwdirectory value="${to}" />
			</label>
		<div class="tooltip injectDestFolderTooltip error icon-cancel-circled hidden" data-tran="">${(`Field can not be empty!`)}</div>
		</div>`));
		console.log("rendering ", $popup);
		dvField.renderSelectPath($content.find("[type=dvSelectPath]"));

		$popup.empty();
		$popup.append($content);
	}
	$popup.dialog({
		title: t("Extract Enigma"),
		autoOpen: false,
		modal:true,
		width:640,
		height:320,
		minWidth:640,
		minHeight:320,
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
				text: t("Process"),
				click: async function() {
					var $this = $(this)

					
					var from = $this.find(".fromPath").val();
					var to = $this.find(".toPath").val();

					var isEnigma = await php.isEnigma(from);
					if (!isEnigma?.result) return alert(t("Selected file is not an Enigma Virtual Box package."));
					
					$this.dialog( "close" );
					ui.showBusyOverlay();
					await php.extractEnigma(from, to);
					ui.hideBusyOverlay();
				}
			}

		]
	});	
	$popup.dialog("open");
}

var loadPlugins = async function() {
	if (trans.project.pluginIsFetched) {
		var conf = confirm(t("Plugins are already fetched for this project. Want to re-fetch the plugins?"))
		if (!conf) return;
	}

	var thisLoc = trans.project.loc;
	if (trans.gameEngine == "rmmv") {
		thisLoc = nwPath.join(trans.project.loc, "www");
		console.log("Is file js/plugins.js exist?", await common.isFileAsync(nwPath.join(thisLoc, "js/plugins.js")));
		if (await common.isFileAsync(nwPath.join(thisLoc, "js/plugins.js")) == false) thisLoc = trans.project.loc;
	} 

	ui.showBusyOverlay();
	var thisRM = new RMMV(thisLoc);
	// all items stored in a folder named data
	await thisRM.dumpPluginsToDir(nwPath.join(trans.project.cache.cachePath, "data"));
	await thisRM.pluginsToTrans(trans);
	console.log(thisRM);
	trans.drawFileSelector();
	trans.project.pluginIsFetched = true;
	ui.hideBusyOverlay();
}

var confirmLoadPlugins = async function(onOk) {
	onOk = onOk || function() {};
	console.log("open confirmLoadPlugins");
	var $popup = $("#rmmv_fetchJS");
	if ($popup.length == 0) {
		$popup = $("<div id='rmmv_fetchJS'></div>");
		var $content = $(`<h2>${(`Do you also want to load JavaScript files?`)}</h2>
		<div class="blockBox warningBlock withIcon" data-tran="">
			${(`You are about to includes translation for Javascripts!`)}<br />
			${(`Translator++ will fetch all string from plugin related javascript files.`)}<br />
			${(`Most of these strings are not save for translation.`)}<br />
			${(`Make sure you know what you are doing when translating these strings.`)}
		</div>`)
		$popup.empty();
		$popup.append($content);
	}
	$popup.dialog({
		title: t("Translate Javascript File?"),
		autoOpen: false,
		modal:true,
		width:640,
		height:320,
		minWidth:640,
		minHeight:320,
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
				text: t("Cancel"),
				icon: "ui-icon-close",
				click: function() {
					$(this).dialog( "close" );
				}
			},
			{
				text: t("I know the risk, Proceed!"),
				click: async function() {
					var $this = $(this)
					$this.dialog( "close" );
					await onOk.call(this)
				}
			}

		]
	});	
	$popup.dialog("open");
}

const showChangeNWDialog = async function() {
    // Get NW.js version options from HTMLPacker
    ui.showBusyOverlay();
    const HTMLPacker = require("www/addons/basicUtils/utils/HTMLPacker.js");
    const nwVersions = await HTMLPacker.getNWJSVersions();
    console.log("NW.js Versions:", nwVersions);
    nwVersions.unshift(""); // Add empty option at the beginning
    ui.hideBusyOverlay();

    const value = await ui.form({jsonForm: 
        {
            schema: {
				exePath : {
					"type": "string",
					"title": t("Game Executable Path"),
					"description": t("Path to the game executable file (.exe)"),
					"required": true,
				},
                nwversion: {
                    "type": "string",
                    "title": t("NWJS Version"),
                    "description": t("Change into this NWJS version"),
                    "enum": nwVersions,
                },
                isDeveloper: {
                    "type": "boolean",
                    "title": t("Use Developer version"),
                    "description": t("Use the NWJS Developer version. The Developer version has developer tools available. Suitable for debugging and development.")
                        +"<br>"
                        +t("In Developer version you can use <b>Developer Console</b>. Developer Console can be accessed by pressing F12 or right-clicking the app and selecting 'Inspect'."),
                },
                is32Bit: {
                    "type": "boolean",
                    "title": t("Use 32-bit version"),
                    "description": t("Use the 32-bit version of NWJS. The 32-bit version is useful for compatibility with older systems. It is recommended to uncheck this option if possible (just upgrade your machine, dude)."),
				},
            },
            form: [
                {
                    "type": "warn",
                    "value": `<h2>${t(`Some game feature may not work across NWJS version`)}</h2>
                        <p>${t(`Please be aware that some game feature may not work across NWJS version.`)}</p>`,
                },
				{
					"key": "exePath",
					"type": "selectfile",
					"accept": ".exe",
					"onChange": async function (evt) {
						const value = $(evt.target).val();
						const nwjsVersion = await addonLoader.addons.basicUtils.NWKit.getNWVersionFromExecutable(value);
						console.log("Detected NWJS version:", nwjsVersion);
						if (!nwjsVersion?.version) return;
						// set the nwversion field - now just use the version directly
						console.log("Event", evt, this);

						console.log("version field:",  $(evt.target).closest("form").find("[name='nwversion']"));
						$(evt.target).closest("form").find("[name='nwversion']").val(nwjsVersion.version);

						// set the developer field
						console.log("developer field:",  $(evt.target).closest("form").find("[name='isDeveloper']"));
						$(evt.target).closest("form").find("[name='isDeveloper']").prop("checked", nwjsVersion.isSDK);
						
						// set the 32-bit field
						console.log("32-bit field:",  $(evt.target).closest("form").find("[name='is32Bit']"));
						$(evt.target).closest("form").find("[name='is32Bit']").prop("checked", nwjsVersion.is32Bit);
					},
				},
                {
                    "key": "nwversion",
                    "type": "select",
                },
                {
                    "key": "isDeveloper",
                    "inlinetitle": t("Use Developer version"),
                },
                {
                    "key": "is32Bit",
                    "inlinetitle": t("Use 32-bit version"),
                }
                
            ]
        }
    },
    {
        title: t(`Change RPG Maker MV / RPG Maker MZ / NWJS version`),
    });

    console.log(value);
    if (!value?.exePath) return;
    if (!value?.nwversion) return;

    // Extract version info from the form values
    const version = value.nwversion;
    const isSDK = value.isDeveloper || false;
    const is32Bit = value.is32Bit || false;

    const conf = confirm(t(`This operation will change the NW.js version into`)+` ${version} ${isSDK ? 'SDK' : ''} ${is32Bit ? '32-bit' : '64-bit'}.\n`+t(`Please close the application first before continuing.\nDo you want to continue?`));
    if (!conf) return;

    addonLoader.addons.basicUtils.NWKit.changeNWVersionOf(value.exePath, version, isSDK, is32Bit);
}

/**
 * Install debug options into a game given the path to its executable.
 * This function performs the actual install and does not display the initial form.
 * @param {String} exePath - full path to the game executable
 */
const installDebugOptionsToExecutable = async function(exePath) {
	if (!exePath) return false;
	ui.showBusyOverlay();
	try {
		const nwjsInfo = await addonLoader.addons.basicUtils.NWKit.getNWVersionFromExecutable(exePath);
		console.log("Detected NWJS info:", nwjsInfo);

		if (!nwjsInfo?.isNWjs) {
			ui.hideBusyOverlay();
			alert(t("The selected file is not a valid NW.js application."));
			return false;
		}

		const exeDir = nwPath.dirname(exePath);

		// Find index.html in root directory or in "www" directory
		let indexHtmlPath = nwPath.join(exeDir, "index.html");
		let jsDir = nwPath.join(exeDir, "js");
		if (!await common.isFileAsync(indexHtmlPath)) {
			indexHtmlPath = nwPath.join(exeDir, "www", "index.html");
			jsDir = nwPath.join(exeDir, "www", "js");
			if (!await common.isFileAsync(indexHtmlPath)) {
				ui.hideBusyOverlay();
				alert(t("Could not find index.html in the game directory."));
				return false;
			}
		}

		console.log("Found index.html at:", indexHtmlPath);
		console.log("JS directory:", jsDir);

		const debugMenuScriptPath = nwPath.join(addonLoader.addons.rmmv.getLocation(), "utils", "dv-debugmenu.js");
		if (!await common.isFileAsync(debugMenuScriptPath)) {
			ui.hideBusyOverlay();
			alert(t("Debug menu script not found in addon directory."));
			return false;
		}

		if (!await common.isDirectory(jsDir)) {
			await common.mkDir(jsDir);
		}

		const targetScriptPath = nwPath.join(jsDir, "dv-debugmenu.js");
		await common.copyFile(debugMenuScriptPath, targetScriptPath);
		console.log("Copied debug menu script to:", targetScriptPath);

		const indexHtmlContent = await fs.promises.readFile(indexHtmlPath, 'utf8');
		if (indexHtmlContent.includes("js/dv-debugmenu.js")) {
			ui.hideBusyOverlay();
			alert(t("Debug menu script is already installed in index.html."));
			return true;
		}

		const scriptTag = `<script type="text/javascript" src="js/dv-debugmenu.js"></script>`;
		const modifiedContent = indexHtmlContent.replace(/<\/body>/i, `    ${scriptTag}\n</body>`);
		await common.writeFile(indexHtmlPath, modifiedContent);
		console.log("Updated index.html with debug menu script");

		alert(t("Debug options installed successfully!"));
		ui.hideBusyOverlay();

		// Offer to upgrade to SDK if not in SDK
		if (!nwjsInfo.isSDK) {
			const upgradeToSDK = confirm(
				t("The selected game is not running in NW.js Developer Mode (SDK).\n\n") +
				t("Developer Mode provides additional debugging features:\n") +
				t("• Developer Console (F12)\n") +
				t("• Inspect Element (Right-click)\n") +
				t("• Network Monitor\n") +
				t("• Performance Profiler\n\n") +
				t("Do you want to upgrade to NW.js Developer Mode?\n") +
				t("(Recommended for better debugging experience)")
			);

			if (upgradeToSDK) {
				const targetVersion = nwjsInfo.version || "0.60.0";
				const is32Bit = nwjsInfo.is32Bit || false;
				alert(t(`The game will be upgraded to NW.js SDK version`)+` ${targetVersion}.\n`+t(`This may take a few minutes. Please wait...`));
				try {
					await addonLoader.addons.basicUtils.NWKit.changeNWVersionOf(exePath, targetVersion, true, is32Bit);
					alert(t("NW.js has been upgraded to Developer Mode successfully!"));
				} catch (upgradeError) {
					console.error("Error upgrading to SDK:", upgradeError);
					alert(t("Failed to upgrade to Developer Mode:\n") + upgradeError.message);
				}
			}
		}

		return true;
	} catch (error) {
		ui.hideBusyOverlay();
		console.error("Error installing debug options:", error);
		alert(t("Error installing debug options: ") + (error.message || error.toString()));
		return false;
	}
}

// original (UI) install wrapper - shows form then delegates to installer
const installDebugOptions = async function() {
	// Display popup dialog to select game executable
	const value = await ui.form({jsonForm: 
		{
			schema: {
				exePath: {
					"type": "string",
					"title": t("Game Executable Path"),
					"description": t("Path to the game executable file (.exe)"),
					"required": true,
				}
			},
			form: [
				{
					"type": "warn",
					"value": `<h2>${t(`Install Debug Options`)}</h2>
						<p>${t(`This will install a debug menu into your RPG Maker MV/MZ game.`)}</p>
						<p>${t(`Select the game executable file to install debug options.`)}</p>`,
				},
				{
					"key": "exePath",
					"type": "selectfile",
					"accept": ".exe",
				}
			]
		}
	},
	{
		title: t(`Install Debug Options`),
	});

	console.log(value);
	if (!value?.exePath) return;

	// delegate to non-interactive installer
	await installDebugOptionsToExecutable(value.exePath);
}

/**
 * UI wrapper: shows the Decrypt Data Files dialog for both RPG Maker MV and MZ.
 * Auto-detects the engine from the selected file path.
 */
const showDecryptDataFilesDialog = async function() {
	const value = await ui.form(
		{
			jsonForm: {
				schema: {
					gameFilePath: {
						type: "string",
						title: t("Game File"),
						description: t("Path to the game executable (.exe) or index.html"),
						required: true,
					},
					patchPlugins: {
						type: "boolean",
						default: true,
						title: t("Patch game to support both encrypted / decrypted data"),
						description:
							t("Copies LoadDecryptedDataFallback.js into js/plugins/ and registers it in js/plugins.js.") +
							"<br>" +
							t("Safe to run more than once — already-registered entries are replaced, not duplicated."),
					},
				},
				form: [
					{
						type: "warn",
						value: `<h2>${t("Decrypt RPG Maker MV/MZ Data Files")}</h2>
<p>${t("Select the game executable or index.html. All encrypted JSON files under data/ will be decrypted in-place.")}</p>
<p>${t("Originals are backed up to data-original/ before any file is modified.")}</p>`,
					},
					{
						key: "gameFilePath",
						type: "selectfile",
						accept: ".exe,.html",
					},
					{
						key: "patchPlugins",
						inlinetitle: t("Patch game to support both encrypted / decrypted data"),
					},
				],
			},
		},
		{ title: t("Decrypt RPG Maker MV/MZ Data Files") }
	);

	if (!value?.gameFilePath) return;

	ui.log.show();
	await ui.log.info(t("Starting decryption process…"));

	try {
		const gameDir = nwPath.dirname(value.gameFilePath);
		const engine  = await RMMVGames.determineEngine(gameDir);

		let decrypted, skipped, patched;

		if (engine === "rmmz") {
			const rmmz = addonLoader.getAddon("rmmz");
			if (!rmmz?.decryptDataFilesInGame) throw new Error(t("RMMZ decryptor not available."));
			({ decrypted, skipped, patched } = await rmmz.decryptDataFilesInGame(value.gameFilePath, {
				patchPlugins: !!value.patchPlugins,
				onProgress: async ({ message, percent }) => {
					await ui.log(message);
					await ui.log.progress(percent);
				},
			}));
		} else if (engine === "rmmv") {
			if (!thisAddon.decryptDataFilesMVInGame) throw new Error(t("RMMV decryptor not available."));
			({ decrypted, skipped, patched } = await thisAddon.decryptDataFilesMVInGame(value.gameFilePath, {
				patchPlugins: !!value.patchPlugins,
				onProgress: async ({ message, percent }) => {
					await ui.log(message);
					await ui.log.progress(percent);
				},
			}));
		} else {
			throw new Error(t("Could not detect RPG Maker engine (MV/MZ) for: ") + value.gameFilePath);
		}

		const hasErrors = decrypted.length === 0 && skipped.length > 0;
		ui.log.addButton(t("Open folder"), function() {
				nw.Shell.showItemInFolder(value.gameFilePath);
			}, {
				class: "icon-folder-open"
		});
		ui.log.end(
			100,
			t("Done! Decrypted: ") + decrypted.length + "  " + t("Skipped: ") + skipped.length +
				(patched ? "  " + t("Plugin patched.") : ""),
			{ error: hasErrors }
		);
	} catch (err) {
		console.error("showDecryptDataFilesDialog error:", err);
		await ui.log.error(t("Error: ") + (err.message || String(err)));
		ui.log.end(100, t("Decryption failed."), { error: true });
	}
};

var init = function() {
	ui.mainMenu.addChild("tools", {
		id: "rmmv",
		label: "RMMV & RMMZ"
	});

	ui.mainMenu.addChild("rmmv", {
		label: t("Decrypt resources")
	}).on("select", function() {
		openDecryptorWindow();
	})

	ui.mainMenu.addChild("rmmv", {
		label: t("Decrypt Data Files"),
	}).on("select", function() {
		showDecryptDataFilesDialog();
	});

	ui.mainMenu.addChild("rmmv", {
		label: t("Extract Enigma Virtual Box")
	}).on("select", function() {
		extractEnigma();
	});

	ui.mainMenu.addChild("rmmv", {
		label: t("Compile HTML to Executable"),
	}).on("select", function() {
		const HTMLPacker = require("www/addons/basicUtils/utils/HTMLPacker.js");
		HTMLPacker.showPackageDialog();
	});

	ui.mainMenu.addChild("rmmv", {
		label: t("Change Existing NWJS Version"),
	}).on("select", function() {
		// do the task
		showChangeNWDialog();
	});

	ui.mainMenu.addChild("rmmv", {
		label: t("Install debug options"),
	}).on("select", function() {
		// do the task
		installDebugOptions();
	});		
}


var JSONPreview = function(json, htmlClass) {
	if (typeof json !== 'string') json = JSON.stringify(json);
	this.json = json;
	this.htmlClass = htmlClass;
	this.init();
}
JSONPreview.css = `
<style class="jsonPreview">
json-viewver {
    /* Background, font and color */
    --color: #f9f9f9;

}
</style>
`;

JSONPreview.prototype.addContextMenu = function() {
	var that = this;
	this.menu = new nw.Menu();
	// Add some items with label
	this.menu.append(new nw.MenuItem({
		label: t('Find next'),
		type: "normal", 
		click: function(){
			if (!that.elm.data("searcher")) return;
			that.elm.data("searcher").next();
		}
	}));	
	this.menu.append(new nw.MenuItem({ type: 'separator' }));
	this.menu.append(new nw.MenuItem({
		label: t('Open folder'),
		type: "normal", 
		click: function(){
			var filePath = that.elm.data("path");
			if (!filePath) return;
			nw.Shell.showItemInFolder(filePath);
		}
	}));
	this.menu.append(new nw.MenuItem({
		label: t('Open with external application'),
		type: "normal", 
		click: function(){
			var filePath = that.elm.data("path");
			if (!filePath) return;
			nw.Shell.openItem(filePath);			  
		}
	}));

	var that = this;
	this.elm.on("contextmenu", function(ev) {
		ev.preventDefault();
		that.menu.popup(parseInt(ev.originalEvent.x), parseInt(ev.originalEvent.y));
		return false;		
	})
}

JSONPreview.prototype.init = function() {
	var $template = $(`<json-viewer></json-viewer>`);
	$template.attr("title", t(`Raw JSON data. Right click to open menu.`));
	if (this.htmlClass) $template.addClass(this.htmlClass);
	$template.text(this.json);
	this.elm = $template;
	this.addContextMenu();


	if (JSONPreview.isInitialized) return;
	// initializing JSONPreview
	JSONPreview.viewer = require("@alenaksu/json-viewer");
	//$("head").append(JSONPreview.css);
	JSONPreview.isInitialized = true;

}
JSONPreview.prototype.getElement = function() {
	return this.elm;
}

/**
 * Generate direction path from RPG Maker MV styled context string
 * @param  {object} objData
 * @param  {integer} rowNumber
 */
JSONPreview.getDirectionPath = function(objData, rowNumber) {
	objData = objData || {};
	var result = [];
	if (!objData.context) return result;
	if (Array.isArray(objData.context[rowNumber]) == false) return result;
	if (objData.context[rowNumber].length == 0) return result;

	var arrayToPattern = function(array) {
		var str = array.join(".");
		return "**."+str
	}
	
	for (var i in objData.context[rowNumber]) {
		var contextString = objData.context[rowNumber][i];
		var contextSegment = contextString.split("/");
		if (objData.filename.toLowerCase() == "mapinfos.json") {
			// do nothing
		} else if (objData.filename.substring(0, 3).toLowerCase() == "map") {
			var segm = contextSegment.slice(1, 6);
			result.push(arrayToPattern(segm));
		}
	}
	return result;
}

JSONPreview.find = function(objData, rowNumber) {
	objData = objData || {};

	if (!objData.context) return;
	if (Array.isArray(objData.context[rowNumber]) == false) return;
	if (objData.context[rowNumber].length == 0) return;	
	if (!objData.data) return;
	if (!objData.data[rowNumber][trans.keyColumn]) return;	
	var previewer = $(".dataPreview")[0];

	var thisMsg = objData.data[rowNumber][trans.keyColumn];
	var firstContext = objData.context[rowNumber][0];
	var firstContextArr = firstContext.split("/");
	var searcher;
	if (firstContextArr.includes("message")) {
		thisMsg = thisMsg.replace(/\r/g, "");
		var msgs = thisMsg.split("\n");
		var keyword = msgs[0];
		if (msgs.length>1) keyword = msgs[1];
		searcher = previewer.search(keyword);
		searcher.next();
	} else {
		searcher = previewer.search(thisMsg);
		searcher.next();		
	}
	$(".dataPreview").data("searcher", searcher);
}

thisAddon.patchTransData = function() {
	// patch transData from previous version
	if (!trans.project) return;
	if (common.versionToFloat(trans.project.editorVersion) <= 30930 && trans.project.parser == "rmmvjs" && !trans.project.isPatched) {
		var conf = confirm(t("Patch is available for this trans data. This patch will make your trans data compatible with the current version of Translator++.\nDo you want to patch your Trans data?\n(Some feature may not work properly if you don't patch your trans data)"));
		if (!conf) return;

		trans.project.files = trans.project.files || {};
		for (var i in trans.project.files) {
			if (i.substring(0, 4) == "www/") {
				trans.project.files[i.substring(4)] = trans.project.files[i];
				delete trans.project.files[i];
			}
		}
		trans.project.isPatched = true;

		// redraw file selector
		trans.drawFileSelector();
	}
}

thisAddon.exportAsZip = async function(targetPath, transData, options) {
	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.engineType	= options.engineType || transData.project.gameEngine || trans.project.gameEngine;
	options.translationDatas = options.translationDatas || trans.getTranslationData(transData, options);
	var originPath 	= nwPath.join(trans.project.cache.cachePath, "data");
	var entryPoint 	= nwPath.join(originPath, "index.html")

	var tmpPath 	= nwPath.join(nw.process.env.TMP, trans.project.projectId);
	await ui.log("Generating a temporary folder", tmpPath);

	try {
		await fse.remove(tmpPath); 
		await common.mkDir(tmpPath, {recursive:true});
	} catch(e) {
		console.warn("Unable to create directory ", tmpPath);
		console.error(e);
		return;
	}

	await ui.log("Exporting to a temporary folder", tmpPath);
	//if (Boolean(thisAddon.config.useLegacyParser) == false) {
	if (trans.project.parser == "rmmvjs") {	
		await ui.log("--Handling RM Data");
		var entryPoint 	= nwPath.join(originPath, "index.html")
		await this.exportToFolderThread(tmpPath, transData, options);
	} else {
		await exportToFolderPHP(tmpPath, options);
		await exportPluginsToFolder(originPath, tmpPath, undefined, options)
	}

	await ui.log("Plugins has been exported to ", tmpPath)
	await ui.log("Zipping temporary data");
	var _7z = require('7zip-min');
	return new Promise((resolve, reject) => {
		_7z.cmd(['a', '-tzip', targetPath, tmpPath+"\\*"], err => {
			resolve(targetPath);
		});	
	})
	
}

thisAddon.exportToFolder = async function(destinationDir, transData, options) {
	console.log("calling exportToFolder with arguments:", arguments);
	transData 			= transData || trans.getSaveData();
	options 			= options || {};
	options.transData	= transData;
	options.engineType	= options.engineType || transData.project.gameEngine || trans.project.gameEngine;
	options.translationDatas = options.translationDatas || trans.getTranslationData(transData, options);

	var originPath 	= nwPath.join(trans.project.cache.cachePath, "data");
	var entryPoint 	= nwPath.join(originPath, "index.html")
	var rmmvGames 	= new addonLoader.addons.rmmv.RMMVGames(entryPoint, options);
	await rmmvGames.exportToFolder(destinationDir, options);
	
	// plugins
	await exportPluginsToFolder(originPath, destinationDir, transData, options);
}

thisAddon.exportSelectedFile = async function(destinationDir, transData, parserType, exportOptions) {
	exportOptions 	= exportOptions || {};
	transData 		= transData || trans.getSaveData();
	
	var cacheLocation 		= nwPath.join(transData.project.cache.cachePath, "data");
	var entryPoint 			= nwPath.join(cacheLocation, "index.html");
	
	console.log("ParserType", parserType);
	if (parserType == "plugin") {
		// plugins
		await exportPluginsToFolder(cacheLocation, destinationDir, transData, exportOptions);
	} else {
		// rmmv data
		var rmmvGames = new this.RMMVGames(entryPoint, exportOptions);
		await rmmvGames.exportToFolder(destinationDir, exportOptions);
	}
}


thisAddon.exportToFolderThread= async function(destinationDir, transData, options) {
	console.log("Exporting to folder with thread", arguments);
	//if (!parseInt(sys.config.threadNum)) {
	// we disable thread for now
		return await this.exportToFolder(destinationDir, transData, options);
	//}

	transData = transData || trans.getSaveData();
	await Thread.saveSession('lastTransData', transData);
	await Thread.saveSession('lastTranslationData', trans.getTranslationData(transData, options));
	
	await threadServer.startThread(sys.config.threadNum);
	var selectedFiles = options.files;
	if (empty(selectedFiles)) selectedFiles = trans.getAllFiles();

	var queue = [];

	var processThread = (files=[], parserType)=> {
		if (typeof files == "string") files = [files];
		var fn = `async ()=> {
			var options = ${JSON.stringify(options)};
			options.translationDatas = await Thread.loadSession('lastTranslationData');
			options.files = ${JSON.stringify(files)};
			var transData = await Thread.loadSession('lastTransData');
			return await addonLoader.addons.rmmv.exportSelectedFile(${JSON.stringify(destinationDir)}, transData, ${JSON.stringify(parserType)}, options);
		}`
		queue.push(fn);
	}

	// distribute the process of data files into threads
	var scriptFiles = [];
	for (let i=0; i<selectedFiles.length; i++) {
		console.log("Current selected file:", selectedFiles[i]);
		if (selectedFiles[i].substring(0, 2) == "js") {
			let type = "plugin";
			scriptFiles.push(selectedFiles[i]);
		} else {
			let type = "data";
			processThread([selectedFiles[i]], type);
		}
	}
	
	console.log("queue is", queue);
	var result = await threadServer.processQueue(queue);
	await threadServer.closeThreads();
	await Thread.removeSession('lastTransData');
	await Thread.removeSession('lastTranslationData');


	// process plugin by main thread
	if (scriptFiles.length>0) {
		options.files = scriptFiles;
		var cacheLocation 		= nwPath.join(transData.project.cache.cachePath, "data");
		await exportPluginsToFolder(cacheLocation, destinationDir, transData, options);
	}


	return result;
}

thisAddon.loadJSONEditorLibrary = async function() {
	if ($("head").find("#jsonEditorJS").length > 0) return;

	this.JSEcssIsLoaded = false;
	this.JSEjsIsLoaded 	= false;

	return new Promise((resolve, reject) => {
		var $css 	= $(`<link href="modules/jsoneditor/dist/jsoneditor.min.css" id="jsonEditorStyle" rel="stylesheet" type="text/css">`);
		//var $js 	= $(`<script src="modules/jsoneditor/dist/jsoneditor.min.js" id="jsonEditorJS"></script>`);
		
		$css.on("load", ()=>{
			console.log("css loaded");
			this.JSEcssIsLoaded = true;
			if (this.JSEcssIsLoaded && this.JSEjsIsLoaded) resolve();
		})
	

		let script = document.createElement('script')
		script.setAttribute('src', 'modules/jsoneditor/dist/jsoneditor.min.js')
		script.setAttribute('id', 'jsonEditorJS')
		// now wait for it to load...
		script.onload = () => {
			console.log("js loaded");
			this.JSEjsIsLoaded = true;
			if (this.JSEcssIsLoaded && this.JSEjsIsLoaded) resolve();
		} 
		document.head.appendChild(script);

		$("head").append($css);

	})
}




var JsonEditorHelper = function(jsonEditorInstance, $elm) {
	this.jsonEditor = jsonEditorInstance;
	this.$elm 	= $elm;
}

JsonEditorHelper.prototype.observeOnce = function(fn) {
	// Select the node that will be observed for mutations
	const targetNode =this.$elm[0];

	// Options for the observer (which mutations to observe)
	const config = { attributes: true, childList: true, subtree: true };

	// Callback function to execute when mutations are observed
	const callback = function(mutationsList, observer) {
		console.log("mutation occured");
		fn.call(this)
		observer.disconnect();
	};

	// Create an observer instance linked to the callback function
	const observer = new MutationObserver(callback);

	// Start observing the target node for configured mutations
	observer.observe(targetNode, config);	
}

JsonEditorHelper.prototype.expandPoint = async function(path) {
	if (!path) return;
	if (Array.isArray(path) == false) path = [path];

	var currentPath = this.jsonEditor.node;
	
	var expandChild = async (key) => {
		//console.log(`expandChild(${key})`);

		if (!isNaN(key)) {
			key = parseInt(key);
			//console.log("expanding index", key);
			currentPath.childs[key].expand(false);
			currentPath = currentPath.childs[key];
		} else {
			for (var i=0; i< currentPath.childs.length; i++) {
				var thisIndex = currentPath.childs[i].field || currentPath.childs[i].index;
				//console.log(">>thisIndex", thisIndex);
				if (thisIndex == key) {
					//console.log(`expanding childs[${i}]`, thisIndex, currentPath.childs[i]);
					currentPath.childs[i].expand(false);
					currentPath = currentPath.childs[i];
					return;
				}
			}
		}

	}

	// expand root
	currentPath.expand(false);

	// expand inbetween
	for (var i=0; i<path.length - 1; i++) {
		console.log("Handling path:", path[i]);
		await expandChild(path[i]);
	}

	return new Promise(async (resolve, reject) => {
		// last path 
		var lastPath = path[path.length - 1];
		this.observeOnce(()=>{
			console.log("dom mutated");
			console.log("scroll to:", currentPath.dom.value);
			currentPath.dom.value.scrollIntoView();
			resolve();
		});
		await expandChild(lastPath);
	})
	
}


$(document).ready(function() {
	var supportedEngines = ["rmmv", "rmmz"];

	if (window.engineDetectionRegistry && !window.engineDetectionRegistry.definitions.has("rmmv-rmmz")) {
		window.engineDetectionRegistry.register({
			id: "rmmv-rmmz",
			addonId: thisAddon.id,
			engineIds: supportedEngines,
			displayName: "RPG Maker MV / MZ",
			priority: 100,
			detect: async function(request) {
				const entryPoint = request.entryPoint;
				const gameRoot = nwPath.dirname(entryPoint);
				const engineId = await RMMVGames.determineEngine(gameRoot);
				if (!engineId) return { matches: [] };

				return {
					matches: [{
						engineId,
						confidence: 1,
						evidence: [engineId === "rmmz" ? "Found RPG Maker MZ runtime files." : "Found RPG Maker MV runtime files."],
						entryPoint,
						gameRoot,
						preferredInput: "entryPoint"
					}]
				};
			},
			openProjectWizard: async function(candidate, launchContext) {
				ui.newProjectDialog.gotoSlide("rpgmaker", "engineDetectResult");
				const $slide = ui.newProjectDialog.getSlide("rpgmaker");
				window.engineDetectionRegistry.setFieldValue(
					$slide.find(".rpgMakerLocation"),
					launchContext.entryPoint
				);
			}
		});
	}

	engines.addHandler(supportedEngines, 'rmCreateProject', async function(targetPath, initOptions) {
		await ui.log("Handling RPG Maker MV/MZ");
		initOptions = Object.assign({}, initOptions, { entryPoint: targetPath });
		var rmmvGames = new RMMVGames(targetPath);
		console.log(rmmvGames);
		await rmmvGames.newProject(initOptions);
	});

	thisAddon.prepareNewProject = async function(info) {
		info = info || {};
		if (!info.entryPoint) {
			throw new Error(t("Cannot update project: original game path (entryPoint) is not stored in project options. Please recreate the project."));
		}
		await ui.log("Recreating RMMV/RMMZ project from:", info.entryPoint);
		var rmmvGames = new RMMVGames(info.entryPoint);
		await rmmvGames.newProject(info);
	};

	engines.addHandler(supportedEngines, 'updateProjectHandler', async function() {
		await thisAddon.updateProject();
	});


	engines.addHandler(supportedEngines, 'exportHandler', async function(targetPath, options) {
		if (trans.project.parser !== "rmmvjs") return;
		if (options.mode !== "dir" && options.mode !== "zip") return false;
		console.log("Export handler", arguments);
		console.log(JSON.stringify(options));

		ui.showLoading();
		ui.loadingProgress("Processing", "Export into : "+targetPath, {consoleOnly:false, mode:'consoleOutput'});
		await ui.log("Target directory:", targetPath);
		await ui.log("Options : ", options);
		await ui.log("Origin path is cache path");
	
		options.translationDatas = trans.getTranslationData(undefined, options);
		if (options.mode == "dir") {
			if (trans.project.parser == "rmmvjs") {
				await ui.log("--Handling RM Data");
				await thisAddon.exportToFolderThread(targetPath, undefined, options);
				ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
				await ui.log.showOpenDirButton(targetPath);
				ui.loadingEnd();
				return common.halt();
			} else {
				// export plugins only
				var originPath = nwPath.join(trans.project.cache.cachePath, "data");
				await exportPluginsToFolder(originPath, targetPath, undefined, options);
				// then use legacy by exiting this function with false 
				await ui.log("Use legacy parser");
				return;
			}
		} else if (options.mode == "zip") {
			await thisAddon.exportAsZip(targetPath, undefined, options);
			console.log("process done");
			ui.loadingProgress("Finished", "All process finished!", {consoleOnly:false, mode:'consoleOutput'});
			ui.log.showOpenDirButton(targetPath);
			ui.loadingEnd();

			// prevent default behavior
			return common.halt();
		}

	});

	engines.addHandler(supportedEngines, 'onOpenInjectDialog', async function(ui, $dialog, options) {
		console.log("beforeOpenDialog from RMMV");
		var $copyOption = $(".copyOptionsBlock");
		$copyOption.removeClass("hidden");
		//$copyOption.find("option[value=copyIfNewer]").addClass("hidden");
	});

	engines.addHandler(supportedEngines, 'injectHandler', async function(targetDir, sourceMaterial, options) {
		if (trans.project.parser !== "rmmvjs") return;
		
		console.log("Running on inject handler", arguments);

		ui.showLoading();
		ui.loadingProgress("Processing", "Injecting translation", {consoleOnly:false, mode:'consoleOutput'});
		
		await ui.log("Copying with options:", options);
		var sourceDir = sourceMaterial;
		if (await common.isFileAsync(sourceMaterial)) {
			sourceDir = nwPath.dirname(sourceMaterial);
		} 

		if (["copyNothing"].includes(options.copyOptions) == false) {
			await ui.log(`Copy ${sourceDir} to ${targetDir}`);
			var overWrite = true;
			if (options.copyOptions == "copyIfNotExist") overWrite = false;
			await ui.log("Overwrite option: "+overWrite.toString());
			await bCopy(sourceDir, targetDir, {
				onBeforeCopy: async (from, to) => {
					await ui.log(`Start copying ${from}`);
				},
				onAfterCopy: async (from, to) => {
					await ui.log(`Successfully copied into ${to}`);
				},
				overwrite: overWrite
			});
		}


		// if nothing in target directory. Then targetPath will empty, so add second argument.
		var targetPath = await RMMVGames.determineRootDir(targetDir, trans.project.gameEngine);

		/*
		await ui.log("--Handling RM Data");
		var originPath = nwPath.join(trans.project.cache.cachePath, "data");
		await ui.log("Generating translation from cache data "+originPath);
		var entryPoint = nwPath.join(originPath, "index.html")
		var rmmvGames = new addonLoader.addons.rmmv.RMMVGames(entryPoint, options);
		await rmmvGames.exportToFolder(targetPath, options);

		await ui.log("--Handling JavaScript files");
		await exportPluginsToFolder(originPath, targetPath, undefined, options);
		*/
		options.translationDatas = trans.getTranslationData(undefined, options);

		await thisAddon.exportToFolderThread(targetPath, undefined, options);

		if (options?.exportOptions?.addDebugOptions) {
			await ui.log("Installing debug options into the injected game");
			try {
				// Per requirement: search executable inside the given targetDir (first argument)
				const exePath = await RMMV.findNwjsExecutable(targetDir);
				if (exePath) {
					await ui.log(`Found executable to install debug options: ${exePath}`);
					await installDebugOptionsToExecutable(exePath);
				} else {
					await ui.log("No suitable executable found to install debug options.");
					alert(t("Unable to locate executable to install debug options. Make sure your game is packaged for Windows with NW.js."));
				}
			} catch (e) {
				console.error("Error while auto-installing debug options:", e);
				alert(t("Error while installing debug options: ") + (e.message || e.toString()));
			}
		}

		ui.loadingProgress("Finished", "Finished!", {consoleOnly:false, mode:'consoleOutput'});
		ui.log.showOpenDirButton(targetPath);		
		ui.loadingEnd();

		return common.halt();
	});

	
	engines.addHandler(supportedEngines, 'afterInjectHandler', async function(targetDir, sourceMaterial, options) {
		// only executed if using the legacy parser
		console.log("afterInjectHandler called with arguments:", arguments);
		if (trans.project.parser == "rmmvjs") return;

		console.log("Path is : ", targetDir);
		console.log("options are : ", options);
		console.log(arguments);

		// convert sourceMaterial to folder if path is file
		var sourceStat = fs.lstatSync(sourceMaterial)
		if (sourceStat.isFile()) sourceMaterial = nwPath.dirname(sourceMaterial);
		
		ui.loadingProgress("Processing", "Additional steps :", {consoleOnly:false, mode:'consoleOutput'});
		ui.loadingProgress("Processing", "Injecting translation for plugins (if any)", {consoleOnly:false, mode:'consoleOutput'});
		await applyTranslation(sourceMaterial, targetDir, trans.getSaveData(), options);
		ui.loadingProgress("Processing", "That's all.", {consoleOnly:false, mode:'consoleOutput'});
		return false;
	});
	

	engines.addHandler(supportedEngines, "onLoadTrans", async () => {
		thisAddon.patchTransData();

		var appIcon =  "addons/rmmv/rmmv-ico.png"
		if (trans.project.gameEngine == "rmmz") {
			appIcon =  "addons/rmmv/rmmz-ico.png"
		}

		ui.ribbonMenu.add("rmmv", {
			title : trans.gameEngine.toUpperCase(),
			toolbar : {
				buttons : {
					play : {
						icon : "icon-play",
						title : t("Play last build"),
						onClick : async () => {
							if (await common.isDirectory(trans.project.devPath) == false) {
								return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."));
							}
							playGame(trans.project.devPath);
						}
					},
					openEditor : {
						img : appIcon,
						title : t("Open editor"),
						onClick : async () => {
							if (await common.isDirectory(trans.project.devPath) == false) {
								return alert(t("Dev path is not defined.\nYou should inject your game once to generate dev path."));
							}
							openEditor(trans.project.devPath, trans.project.gameEngine);
						}
					},
					loadPlugins : {
						icon : "icon-publish",
						title : t("Load Plugins Into Project"),
						onClick : async () => {
							if (trans.project.parser !== "rmmvjs") return alert("Plugin translation is not supported on legacy parser");
							// all items stored in a folder named data
							confirmLoadPlugins(async () => {
								await loadPlugins();
							})

						}
					},
					decryptResources : {
						icon : "icon-lock-open",
						title : t("Decrypt Resources"),
						onClick : async () => {
							var from = trans.project.loc;
							var to = trans.project.devPath

							if (trans.project.gameEngine == "rmmv") {
								from = nwPath.join(from, "www/index.html")
								to 	= nwPath.join(to, "www")
							}
							if (trans.project.gameEngine == "rmmz") from = nwPath.join(from, "index.html")
							openDecryptorWindow(from, to);
						}
					},
					compileGame : {
						icon : "icon-box",
						title : t("Compile Game"),
						onClick : async () => {
							const HTMLPacker = require("www/addons/basicUtils/utils/HTMLPacker.js");
							HTMLPacker.showPackageDialog();
						}
					},
					
				}
			}
		})
		
		// check version
		thisAddon.config = thisAddon.config || {};
		if (common.versionToFloat(trans.project.editorVersion) < common.versionToFloat("3.9.15") && trans.project.parser == "rmmvjs") {
			var popupOption = {
				title: "Project requires update",
				buttons : [
					{
						text: "Switch to old parser",
						icon: "ui-icon-close",
						click: function() {
							thisAddon.config.useLegacyParser = true;
							alert(t("The option has been set to use the legacy parser.\nYou can switch back to the new parser anytime via option menu."));
							$(this).dialog( "close" );
						}
					},{
						text: "Close",
						icon: "ui-icon-close",
						click: function() {
							$(this).dialog( "close" );
						}
					}
				]
			}
			var content = $(`
			<h1>${(`This project is not compatible with the current parser`)}</h1>
			<p>${(`Your project is created with the older version of the parser. Some features may not be compatible with the current version.`)}</p>
			<p><b>${(`Advice:`)}</b> ${(`Create a new project and then import the translation of the current project into the newly created project.`)} <a href="https://dreamsavior.net/docs/translator/getting-started/updating-a-project/" external>${(`(read more on the documentation)`)}</a></p>
			<p>${(`Or alternatively you can also switch back to the old version of parser on the options menu (not recomended though, since the old parser is deprecated).`)}</p>`)
			await ui.showPopup("rmmv_rquireUpgrade", content, popupOption);
		}


		
	})

	engines.addHandler(supportedEngines, "onAfterCreateProject", async ()=>{
		ui.one("loadingConsoleClosed", async ()=> {
			if (trans.project.parser !== "rmmvjs") return;
			const initOpts = trans.project?.options?.init || {};
			if (initOpts.includePlugins === true) {
				await loadPlugins();
			} else if (initOpts.includePlugins === false) {
				// user opted out — skip
			} else {
				confirmLoadPlugins(async () => {
					await loadPlugins();
				});
			}
		})
	});	

	
	$(".cellInfoContent.rawData").css("background-color", "#2a2f3a");
	var cropableData = ["commonevents", "actors", "animations", "armors", "classes", "enemies", "items", "skills", "mapinfos", "states", "tilesets", "troops", "weapons"]

	var allowedExtension = [".json", "json", ".js", "js"];
	engines.addHandler(supportedEngines, 'onLoadSnippet', async function(selectedCell) {
		console.log("RMMV/MZ onLoadSnippet handler");
		console.log("selected cell:", selectedCell);

		var obj = trans.getSelectedObject();

		if (obj.extension.toLowerCase() == ".js" && ["js/plugins.js", "/js/plugins.js"].includes(obj.path.toLowerCase()) == false) return this.commonHandleFile(selectedCell, "js");



		if (allowedExtension.includes(obj.extension) == false) return;
		if (!Array.isArray(obj.context[selectedCell.fromRow])) return;
		if (obj.context[selectedCell.fromRow].length == 0) return;

		console.log("determining active path");
		var activePath = nwPath.join(trans.project.loc, obj.path);
		if (trans.project.gameEngine=="rmmv") {
			activePath = nwPath.join(trans.project.loc, "www", obj.path);
			if (await common.isFileAsync(activePath) == false) activePath = nwPath.join(trans.project.loc, obj.path);
		}
		console.log("testing", activePath);
		if (await common.isFileAsync(activePath) == false)  activePath = nwPath.join(trans.project.cache.cachePath, "data", obj.path);
		console.log("testing", activePath);
		if (await common.isFileAsync(activePath) == false) {
			this.clear();
			console.log("no active path");

			let $warningMsg = $(`<div class="blockBox warningBlock withIcon">${t(`Unable to find the file related to the data`)}<br />
			${t(`To fix this correct the <b>Raw material location</b> field at the <a href="#" class="openProjectProperties">Project properties</a>`)}</div>`)
			$warningMsg.find(".openProjectProperties").on("click", function() {
				ui.openProjectProperties();
			});
			this.append($warningMsg)
			return;
		}

		if (obj.path == "js/plugins.js" || obj.path == "/js/plugins.js" ) {
			console.log("plugins.js viewer");
			if (this.lastOpenedPath !== activePath || this.isClear()) {
				var addonList = RMMV.getParsedPluginContent(await common.fileGetContents(activePath));
				/*
				var jsonPreview = new JSONPreview(addonList, "dataPreview");
				this.jsonPreviewElm = jsonPreview.getElement();
				*/
				await thisAddon.loadJSONEditorLibrary();
				this.jsonPreviewElm = $("<div class='jsonViewerWrapper'></div>");
				this.jsonPreviewElm.data("path", activePath);

				var options = {
					mode:'view'					
				}
				this.jsonPreview = new JSONEditor(this.jsonPreviewElm[0], options);
				this.jsonPreview.set(addonList);
				this.jsonEditorHelper = new JsonEditorHelper(this.jsonPreview, this.jsonPreviewElm)

				thisAddon.jsonPreview = this.jsonPreview;

				this.clear();
				this.append(this.jsonPreviewElm);
				this.lastOpenedPath	 = activePath;
			}

			//this.jsonPreviewElm[0].collapseAll()
			//JSONPreview.find(obj, selectedCell.fromRow);
			var contexts = trans.getSelectedContext() || [];
			for (var i=0; i<contexts.length; i++) {
				var thisContext = contexts[i].split("/");
				console.log("Expanding context:", thisContext);
				await this.jsonEditorHelper.expandPoint(thisContext);
			}

		} else {
			console.log("obj.filename.", obj.filename);

			if (this.lastOpenedPath !== activePath || this.isClear()) {
				this.lastOpenedData = await common.fileGetContents(activePath);
				this.lastOpenedPath = activePath;

				var json = this.lastOpenedData
			
			}
			if (cropableData.includes(obj.filename.toLowerCase())) {
				console.log("handling common events");
				// show by each page
				var commonEvents = JSON.parse(this.lastOpenedData);
				var thisContext = trans.getSelectedContext()[0];
				console.log("thisContext", thisContext);
				var contextPart = thisContext.split("/");
				console.log("contextPart", contextPart);
				var json = commonEvents[contextPart[1]];
				console.log(contextPart[1]);
			}		
			if (json) {
				var jsonObj = json;
				if (typeof json == "string") jsonObj = JSON.parse(json)
				console.log("processing json preview", json);


				/*
				var jsonPreview = new JSONPreview(json, "dataPreview");
				this.jsonPreviewElm = jsonPreview.getElement();
				this.jsonPreviewElm.data("path", activePath);
				*/
				await thisAddon.loadJSONEditorLibrary();
				this.jsonPreviewElm = $("<div class='jsonViewerWrapper'></div>");
				this.jsonPreviewElm.data("path", activePath);

				var options = {
					mode:'view'					
				}
				this.jsonPreview = new JSONEditor(this.jsonPreviewElm[0], options);
				this.jsonPreview.set(jsonObj);
				this.jsonEditorHelper = new JsonEditorHelper(this.jsonPreview, this.jsonPreviewElm)

				thisAddon.jsonPreview = this.jsonPreview;

				this.clear();
				this.append(this.jsonPreviewElm);

									
			}

			if (!this.jsonPreview) return;
			this.jsonPreview.collapseAll();
			console.log("expanding node");
			var contexts = trans.getSelectedContext() || [];
			for (let i=0; i<contexts.length; i++) {
				var thisContext = contexts[i].split("/").slice(1,7);
				console.log("Expanding context:", thisContext);
				await this.jsonEditorHelper.expandPoint(thisContext);
			}
			console.log("End of handling raw viewer");
			//this.jsonPreviewElm[0].collapseAll();
			// open related object
			/*
			var opener = JSONPreview.getDirectionPath(obj, selectedCell.fromRow);
			for (var i in opener) {
				console.log("expanding", opener[i]);
				this.jsonPreviewElm[0].expand(opener[i]);
			}
			*/
			// search into related object
			//JSONPreview.find(obj, selectedCell.fromRow);
		}
		
	});

	const exportOptions = ()=> {
		return {
			jsonForm: {
				"schema": {
					"maxDialogLine": {
						"title": t("Maximum dialog line"),
						"description": t('Maximum line in the dialog box. Default is 4.'),
						"type": "integer",
                        "default": trans.getOption("maxDialogLine") || 4,
					},
				},
				"form": [
					{type: "msg", "msg": "<h2>Misc Options</h2>"},
					{
						key:"maxDialogLine",
                        type: "number",
					},
				], 
                "value" : trans.getOption("exportOptions") || {},
				"onChange": function(form, id) {
					trans.setOption(id, this.getValue());
				},
				"onSubmit": function(form) {
					console.log("Form submitted", this, arguments);
				}
			}
		}
	}
	const injectOptions = ()=> {
		return {
			jsonForm: {
				"schema": {
					"maxDialogLine": {
						"title": t("Maximum dialog line"),
						"description": t('Maximum line in the dialog box. Default is 4.'),
						"type": "integer",
                        "default": trans.getOption("maxDialogLine") || 4,
					},
					"addDebugOptions": {
						"title": t("Add debug options"),
						"description": t('Add debug options into the game to help testing.'),
						"type": "boolean",
					},
				},
				"form": [
					{type: "msg", "msg": "<h2>Misc Options</h2>"},
					{
						key:"maxDialogLine",
                        type: "number",
					},
					{
						type: "info",
						value: t("Enable this option to add debugging tools to the game. These features can help you test your translation.<br/><b>⚠️ Note: This option is only available if your game is packaged with NWJS for Windows.</b>")
					},
					{
						key:"addDebugOptions",
						type: "checkbox",
					},
				], 
                "value" : trans.getOption("injectOptions") || {},
				"onChange": function(form, id) {
					trans.setOption(id, this.getValue());
				},
				"onSubmit": function(form) {
					console.log("Form submitted", this, arguments);
				}
			}
		}
	}
    engines.addHandler(supportedEngines, "exportOptionFields", exportOptions)
    engines.addHandler(supportedEngines, "injectOptionFields", injectOptions)


	ui.onReady(function() {
		init();
	});
});