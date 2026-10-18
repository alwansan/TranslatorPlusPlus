
var debugLevel = 0;
class RMRGSSData extends require("www/js/ParserBase.js").ParserBase {
	constructor(obj, options, callback) {
		super(obj, options, callback)
		this.debugLevel = debugLevel;
		this.currentEntryPoint = {};
		this.transData = {
			data:[],
			context:[],
			tags:[],
			parameters:[],
			indexIds:{}
		};
	}
}
RMRGSSData.RPGM_EVENT_CODE = {
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
	"655": "Script"
}

RMRGSSData.determineType = function($path) {
	var fileName = nwPath.basename($path, nwPath.extname($path));
	if (/Map[0-9]+/g.test(fileName)) {
		return "map"
	} else {
		return fileName.toLowerCase();
	}
}


RMRGSSData.prototype.MV_buildTextList = function($text, $header) {
	// $splitEach 0 ... then no split;
	// Show message are $splitEach = 4

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
		if (($key+1)%4 == 1) {
			$LIST.push($header);
		}
		var $newRow = {};
		$newRow['c'] = 401;
		$newRow['i'] = $header['i'];
		$newRow['p'] = [$line];
		$LIST.push($newRow);
	}
	return $LIST;
}

RMRGSSData.prototype.MV_buildScrollTextList = function($text, $header) {
	$text = $text || "";
	$text = $text.replaceAll("\r", "");
	var $textArray = $text.split("\n");
	
	var $LIST =[];
	$LIST.push($header);
	for (var $key=0; $key<$textArray.length; $key++) { 
		var $line = $textArray[$key];
		var $newRow = {};
		$newRow['c'] = 405;
		$newRow['i'] = $header['i'];
		$newRow['p'] = [$line];
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
RMRGSSData.prototype.MV_buildCommentList = function(text, header) {
	// $splitEach 0 ... then no split;
	// Show message are $splitEach = 6
	text = text.replaceAll("\r", "");
	var $textArray = text.split("\n");
	
	var $LIST =[];
	for (var $key=0; $key<$textArray.length; $key++) { 
		var $line = $textArray[$key];
		if (($key+1)%6 == 1) {
			var newHeader = common.clone(header);
			newHeader.p = [$line];
			$LIST.push(newHeader);
			continue;
		}
		var $newRow = {};
		$newRow['c'] = 408;
		$newRow['i'] = header['i'];
		$newRow['p'] = [$line];
		$LIST.push($newRow);
	}
	return $LIST;
}


RMRGSSData.prototype.applyTranslation = function(translation, localContext, parameters, options) {
	console.log("Entering applyTranslation", arguments);
}


RMRGSSData.prototype.registerStringObject = function(obj, key, context, parameters, options) {
	//console.log("registerStringObject", arguments);
	var translation = this.registerString(obj[key], context, parameters, options);
	//console.log("translation", translation)
	// apply translation
	obj[key] = translation;
	return translation;
}

RMRGSSData.prototype.fetchCommonData = function($data, $fetchData, $parentContext, options) {
	options = options || {};
	options.currentAddress = options.currentAddress || [];
	console.log("parsing common data");
	if (empty($data)) return false;
	//console.log("incoming data is:", $data);

	// create a copy of data;
	//this.translatedData = common.clone($data);


	for ($i=1; $i<$data.length; $i++) {
		if (empty($data[$i])) continue;

		for ($fetch=0; $fetch<$fetchData.length; $fetch++) {
			if (!Boolean($data[$i][$fetchData[$fetch]])) continue; // will allow blank if only this
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

RMRGSSData.prototype.buildScriptList = function(text, headerParam, translatedList) {
	console.log(">>buildScriptList", arguments);
	translatedList = translatedList || [];
	text = text.replaceAll("\r", "");
	var textArray = text.split("\n");

	console.log("Text array:", textArray);
	// first line is on header
	//translatedList.push(RMData.generateEventCommandData(headerParam.i, 355, textArray[0]));
	translatedList.push(
		{
			"c": 355,
			"i": headerParam.i,
			"p": [textArray[0]]
		}	
	);
	for (var i=1; i<textArray.length; i++) {
		translatedList.push(
			{
				"c": 655,
				"i": headerParam.i,
				"p": [textArray[i]]
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
RMRGSSData.prototype.fetchChoices = function(pageList, index, context) {
	// this command = choice header
	var currentLine = pageList[index];
	var thisTexts 	= currentLine.p[0]; // array of texts

	/*
		{
			choiceStr: id
		}
	*/
	var choices = []; 

	if (empty(thisTexts)) return currentLine;

	for (x=0; x<thisTexts.length; x++) {
		var thisText 	= thisTexts[x];
		var thisContext = context.concat([index, `${x+1}from${thisTexts.length}`]);
		var translation = this.registerString(thisText, thisContext, [], {});
		this.setEntryPointValue(thisTexts, x, translation);

		// create index
		choices[x] = {
			originalText	:thisText,
			i			    :currentLine.i,
			translation		:translation
		}		
	}	

	// Choice member are translated directly without registering

	var processed = 0;

	// the rest of the choice is current indent + 1
	//var expectedIndent = currentLine.indent+1;
	for (var i=index+1; i<pageList.length; i++) {
		var currentPage = pageList[i];
		if (currentPage.c !== 402) continue;
		if (currentPage.i !== currentLine.i) continue;

		var currentChoice = choices[processed];
		if (Boolean(currentChoice) == false) continue;

		currentPage.p[1] = currentChoice.translation;

		processed++;
		if (processed >= choices.length) break;

	}

	// returns mutated currentLine
	return currentLine;
}

RMRGSSData.prototype.fetchCommandList = async function(commandList, $parentContext, $RESULT = {}) {


}

RMRGSSData.prototype.fetchEventPages = async function($eventPages, $parentContext=[], $RESULT = {}) {
	//console.log("handling Event pages", arguments);
	if (!$eventPages) return false;


	// create result
	var translatedPage = common.clone($eventPages);

	for(var $keyPage in $eventPages) {
		var $page = $eventPages[$keyPage];
		console.log(`page of index ${$keyPage} is :`, $page);
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

		for ($i=0; $i<$page['list'].length; $i++) {
			var $currentLine = $page['list'][$i];
			var $thisObj = {};
			//console.log("handling command", $currentLine);
			// process current text buffer when not 401
			if (!empty($currentText) && $page['list'][$i]['c'] != 401) {
				console.log("registering texts", $currentText);
				var $pictureStatus = "noPicture";
				try {
					if (!empty($currentTextParam['headerParam'][0])) $pictureStatus = "hasPicture";
				} catch (e) {
					console.warn("Invalid sequence of event code 401")
					// do not translate
					translatedPage[$keyPage].list.push($currentLine);
					continue;
				}

				
				var context = common.clone($parentContext);
				context.push($keyPage, "list", $currentTextParam['headerIndex'], "message", $pictureStatus, $messagePossition[$currentTextParam['headerParam'][3]]);
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
			
			if (!empty($currentLongText) && $page['list'][$i]['c'] != 405) {

				var context = common.clone($parentContext);
				context.push($keyPage, "list", $currentLongTextParam['headerIndex'], "scrollingMessage");
				var translation = this.registerString($currentLongText.join("\n"), context, $currentLongTextParam);
				if (this.writeMode) {
					var newList = this.MV_buildScrollTextList(translation, last105);
					translatedPage[$keyPage].list = translatedPage[$keyPage].list.concat(newList);
				}
				$currentLongText = [];
				$currentLongTextParam = {};
			}

			if (!empty($currentComment) && $page.list[$i].c != 408) {
				console.log("Handling event's comment");
				var context = common.clone($parentContext);
				context.push($keyPage, "list", $currentCommentParam['headerIndex'], "comment");
				var translation = this.registerString($currentComment.join("\n"), context, $currentCommentParam, {tags:["blue"]});
				if (this.writeMode) {
					var newList = this.MV_buildCommentList(translation, last108);
					translatedPage[$keyPage].list = translatedPage[$keyPage].list.concat(newList);
				}
				$currentComment = [];
				$currentCommentParam = {};
			}


			if (scriptStack.length>0 && $page.list[$i].c !== 655) {
				// end of text stack
				console.log("executing scriptstack");
	
				var context = common.clone($parentContext);
				context.push($keyPage, "list", currentScriptParam.headerIndex, "script");
	
				// this is raw script
				var script = scriptStack.join("\n");
	
				// for raw viewer store raw script as Attachment, because we won't save the code into files.
				var attachmentName = "scriptCommand/"+common.generateId()+".js";
	
				
				console.log("registering string within event's JS code.");
				var copyOptions = common.clone(this.options);
					copyOptions.baseContext 	= context;
					copyOptions.baseParameter 	= {attachment:attachmentName}
					copyOptions.baseTags		= ["red"];
					copyOptions.translationPair = this.translationPair;
					copyOptions.translationInfo = this.translationInfo;
				var scriptObj = new RGSSParser(script, copyOptions);
				await scriptObj.parse();

				console.log("ScriptObj:", scriptObj);
				// produce translated script from scriptObj
				script = scriptObj.toString();
				console.log("parsed text below:\n", script);
				// import transData from scriptObj into rmData
				this.importTransData(scriptObj);
	
				// assign attachment only if has atleast one translatable string / data length > 0
                if (scriptObj.transData.data.length > 0) {
                    RMUtil.attachments[attachmentName] = new Attachment({
                        type:"text/ruby",
                        data:script
                    })
                }
	
				//var translation = this.registerString(script, context, last355);
				if (this.debugLevel > 2)console.log(">>Generated combined text:", script);
				
				this.buildScriptList(script, last355, translatedPage[$keyPage].list);
	
				scriptStack = [];
				currentScriptParam = {};
			}
			
			switch($page.list[$i].c) {
				// handling interpolatable texts
				case 101: //text parameters
					// MZ specific, capture name

					$currentTextParam.headerIndex = $i;
					$currentTextParam.headerParam = $page.list[$i].p;
					$currentText 	= [];
					last101 		= $currentLine;

					break;
				case 105: //start text scroll
					$currentLongTextParam.headerIndex = $i;
					$currentLongTextParam.headerParam = $page.list[$i].p;
					$currentLongText 	= [];
					last105 			= $currentLine;
					break;

				case 108: //Comment
					$currentCommentParam.headerIndex = $i;
					$currentCommentParam.headerParam = $page.list[$i].p;
					$currentComment 	= [];
					$currentComment.push($currentLine['p'][0]);
					last108 			= $currentLine;
					break;

				case 401: //text
					$currentText.push($currentLine['p'][0]);
                    console.log("EvtID 401. CurrentLine", $currentLine['p'][0], "currentText", $currentText);
					break;
				case 405: //long text
					$currentLongText.push($currentLine['p'][0]);
					break;
				case 408: //Comment header
					$currentComment.push($currentLine['p'][0]);
					break;

				
				case 355: //Script Header
					console.log("Code 355", $currentLine);
					scriptStack = [];
					currentScriptParam.headerIndex = $i;
					currentScriptParam.headerParam = $currentLine.p;
					last355 = $currentLine;
					scriptStack.push($currentLine.p[0]);
					break;					
				case 655: //Script
					console.log("Code 655", $currentLine);
					scriptStack.push($currentLine.p[0]);
					break;	
				

				// handling non interpolatable texts
				/*
				case 122: //set variable
					var thisText = $currentLine.p[4];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMRGSSData.RPGM_EVENT_CODE[$page.list[$i].code], "var:"+$currentLine.parameters[0]+"-"+$currentLine.parameters[1]);
					
					var translation = this.registerString(thisText, context, [], {tags: ["red"]});
					this.setEntryPointValue($currentLine.p, 4, translation);
					translatedPage[$keyPage].list.push($currentLine);
					break;
				*/
				case 122: //set variable
					console.log("Translating variable");
					var thisText = $currentLine.p[4];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMRGSSData.RPGM_EVENT_CODE[$page.list[$i].c], "var:"+$currentLine.p[0]+"-"+$currentLine.p[1]);
					
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
					$currentLine.p[4] = thisText;
					translatedPage[$keyPage].list.push($currentLine);

					break;
				case 102: //choice header
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMRGSSData.RPGM_EVENT_CODE[$page.list[$i].c]);

					var translatedLine = this.fetchChoices($page.list, $i, context);
					translatedPage[$keyPage].list.push(translatedLine);
					
					break;
				/*				
				case 402: //choice. NO NEED, handled in choice header
					var thisText = $currentLine['p'][1];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMRGSSData['RPGM_EVENT_CODE'][$page['list'][$i]['c']]);
					var translation = this.registerString(thisText, context, [], {});
					this.setEntryPointValue($currentLine['p'], 1, translation);
					translatedPage[$keyPage].list.push($currentLine);

					break;
				*/				
				case 320: //Change name
				case 324: //Change nick name
				case 325: //Change profile
					var thisText = $currentLine.p[1];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMRGSSData.RPGM_EVENT_CODE[$page.list[$i].c], "charId:"+$currentLine.p[0]);
					var translation = this.registerString(thisText, context, [], {});
					this.setEntryPointValue($currentLine.p, 1, translation);
					translatedPage[$keyPage].list.push($currentLine);
				
					break;
					
				//case 355: //Script Header
				//case 655: //Script
				case 356: //plugin command
					var thisText = $currentLine['p'][0];
					if (typeof thisText !== 'string') {
						translatedPage[$keyPage].list.push($currentLine);
						break;
					}
					var context = common.clone($parentContext);
					context.push($keyPage, "list", $i, RMRGSSData['RPGM_EVENT_CODE'][$page['list'][$i]['c']]);
					var translation = this.registerString(thisText, context, [], {tags:["red"]});
					this.setEntryPointValue($currentLine['p'], 0, translation);
					translatedPage[$keyPage].list.push($currentLine);
				
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

RMRGSSData.prototype.fetchSystem = function($system, $parentContext, $currentData = []) {
	
	if (!empty($system['gameTitle'])) {

		if (this.debugLevel>1) console.log("Fetch gameTitle");
		var context = $parentContext.concat(["gameTitle"]);
		this.registerStringObject($system, 'gameTitle', context, [], {currentAddress : ["gameTitle"]})
		this.gameTitle = $system['gameTitle'];
		RMRGSSData.lastGameTitle = $system['gameTitle'];
	}

	var $type = ['armorTypes', 'elements', 'equipTypes', 'skillTypes', 'weaponTypes', 'switches', 'variables'];	
	for (var $i in $type) {
		var $key = $type[$i];
		if (empty($system[$key])) continue;
		for (var $thisKey in $system[$key] ) {
			var $thisText = $system[$key][$thisKey];
			if (empty($thisText)) continue;
			
			//$currentData = this.appendResultData($currentData, $newData);
			if (this.debugLevel>2) console.log(">>>Fetch type definition: "+$key);
			if (this.debugLevel>2) console.log($system[$key], $thisKey, ">>", $system[$key][$thisKey]);

			var context = $parentContext.concat([$key, $thisKey]);
			//this.registerString($thisText, context, [], {currentAddress : [$key, $thisKey]})
			var thisOptions = {
				currentAddress : [$key, $thisKey]
			}
			if (["switches", "variables"].includes($key)) {
				thisOptions.tags = ["blue"];
			}
			this.registerStringObject($system[$key], $thisKey, context, [], thisOptions)
			
		}
	}
	
	for (var $key in $system['terms']) {
		var $terms = $system['terms'][$key];
		for (var $thisKey in $terms) {
			var $thisText = $terms[$thisKey];
			if (Boolean($thisText) == false) continue;

			if (this.debugLevel>2) console.log(">>>Fetch terms");
			if (this.debugLevel>2) console.log("$terms:", $terms);
			if (this.debugLevel>2) console.log("$thisKey:", $thisKey);
			if (this.debugLevel>2) console.log("$terms[$thisKey]:", $terms[$thisKey]);
			var context = $parentContext.concat(["terms", $key, $thisKey]);
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

RMRGSSData.mergeDeep = function(target, ...sources) {
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

RMRGSSData.prototype.appendResultData = function($currentData, $newData) {
	if (!Array.isArray($currentData)) return false;
	if (empty($newData['text'])) return $currentData;

	if (!empty($currentData[$newData['text']])) {
		$currentData[$newData['text']] = RMRGSSData.mergeDeep($currentData[$newData['text']], $newData);
		$currentData[$newData['text']]['text'] = $newData['text'];
	} else {
		$currentData[$newData['text']] = $newData;
	}
	return $currentData;
}

RMRGSSData.prototype.fetchFromOtherJson = function(obj, context, translationPair) {
	obj = obj || this.obj;
	obj = common.clone(obj);
	translationPair = translationPair || this.translationPair;

	if (!Boolean(context)) context = [];
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
				//if (contextString.includes("p") == false) continue;
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

RMRGSSData.prototype.setEntryPoint = function(obj, key) {
	this.currentEntryPoint.obj = obj;
	this.currentEntryPoint.key = key;
}

RMRGSSData.prototype.setEntryPointValue = function(obj, key, value) {
	this.currentEntryPoint.obj = obj;
	this.currentEntryPoint.key = key;
	try {
		obj[key] = value;
	} catch (e) {
		console.warn(e);
	}
}

RMRGSSData.selectTranslationData = function(translationDatas, path) {
	// must match trans.project.files[thefile].path
	var newPath = path;
	newPath = newPath.replace(/\\/g, "/");
	translationDatas.translationData = translationDatas.translationData || {};
	return translationDatas.translationData[newPath];
}

RMRGSSData.getRelativePath = function(longPath, shortPath) {
	longPath = longPath.replaceAll("\\", "/");
	var result = longPath.substr(shortPath.length);
	if (result[0] == "/") result = result.substr(1);
	return result;
}

module.exports = {
    RMRGSSData
}

/*
//test

var {RMRGSSData} = require("www/addons/rmrgss/rmrgss.json.js");
var yamlData = yaml.parseDocument(await common.fileGetContents("D:/Test/RMVXAce/YAML/Map005.yaml"));
var rgssJSON = yamlData.toJSON();
var rmData = new RMRGSSData(rgssJSON)

await rmData.fetchEventPages(rgssJSON.events[1].pages);
*/