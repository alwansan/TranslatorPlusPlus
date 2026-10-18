<?php
set_time_limit(0);
$_PARAM['APP_PATH'] = substr(__FILE__ , 0, strrpos(__FILE__, "www".DIRECTORY_SEPARATOR));
//$_PARAM['CACHE_PATH'] = $_PARAM['APP_PATH']."www\\php\\cache\\";
$_PARAM['ENIGMA_PATH'] = str_replace("/", "\\", $_SERVER['APPLICATION_ROOT']."\\3rdParty\\EnigmaVBUnpacker.exe");

function onBeforeInit() {
	global $_PARAM;
	if (is_enigma($_POST['selectedFile'])) {
		MV_extractEnigma($_POST['selectedFile']);
		
		
		//die("Handling enigma's files are still under construction!");
	}
}

function onAfterProcess() {
	global $_PARAM;
	
	echo "Collecting data\r\n";
	$DATA = MV_extract();
	//print_r($DATA);
	
	$GLOBALS['RESULT']['files'] = $DATA;
}

function MV_extractEnigma($FILE) {
	global $_PARAM;
	echo "Creating cache directory\r\n";
	$CACHE = $_SERVER['TMP']."\\".md5(time());
	mkdir($CACHE);
	echo "Copying to cache directory\r\n";
	$pathinfo = pathinfo($FILE);
	copy($FILE, $CACHE."\\".$pathinfo['basename']);
	
	echo "Extracting enigma, this might take a while depend on the game size\r\n";
	$cmd = escape_win32_argv($_PARAM['ENIGMA_PATH'])." /nogui ".escape_win32_argv($CACHE."\\".$pathinfo['basename']);
	echo $cmd."\r\n";
	passthru($cmd);
	
	$_PARAM['MV_ROOT'] = "$CACHE\\%DEFAULT FOLDER%\\www";
	$_GET['gameFolder'] = $_PARAM['MV_ROOT'];
	echo "Redirecting to extracted path : ".$_PARAM['MV_ROOT']."\r\n";
	echo "TMP Path is :\r\n<b id='tmpPath' class='tmpPath'>".$_PARAM['MV_ROOT']."</b>\r\n";
	return $CACHE;
	
}


function MV_determineType($path) {
	$fileInfo = pathinfo($path);
	if (substr($fileInfo['filename'], 0, 3) == 'Map' && is_numeric(substr($fileInfo['filename'], 3))) {
		return "map";
	} else {
		return strtolower($fileInfo['filename']);
	}
	
}

function MV_fetchCommonData($data, $fetchData, $parentContext = '') {
	global $_PARAM;
	if (empty($data)) {
		return false;
		exit;
	}
	
	$RESULT = array();
	for ($i=1; $i<count($data); $i++) {
		if (empty($data[$i])) continue;

		$current = array();
		for ($fetch=0; $fetch<count($fetchData); $fetch++) {
			if (!isset($data[$i][$fetchData[$fetch]])) continue; // will allow blank if only this
			if (empty($data[$i][$fetchData[$fetch]])) continue;
			
			if (!empty($RESULT[$data[$i][$fetchData[$fetch]]])) {
				$RESULT[$data[$i][$fetchData[$fetch]]]['context'][] = $parentContext."/".$i."/".$fetchData[$fetch];
			} else {
				$thisObj = array();
				$thisObj['context'] = array();
				$thisObj['text'] = $data[$i][$fetchData[$fetch]];
				$thisObj['context'][] = $parentContext."/".$i."/".$fetchData[$fetch];
				$RESULT[$thisObj['text']] = $thisObj;
			}
		}
	}
	
	return $RESULT;
}

function MV_fetchEventPages($eventPages, $parentContext = '', $RESULT=array()) {
	// $eventPages are event Pages
	global $_PARAM;
	if (!is_array($eventPages)) return false;
	
	foreach($eventPages as $keyPage=>$page) {
		if (empty($page)) continue;
		if (empty($page['list'])) continue;
		
		$messagePossition = ["top", "middle", "bottom"];
		$currentTextParam = array();
		$currentLongTextParam = array();
		for ($i=0; $i<count($page['list']); $i++) {
			$currentLine = $page['list'][$i];
			$thisObj = array();
			
			// process current text buffer when not 401
			if (!empty($currentText) && $page['list'][$i]['code'] != 401) {
				$thisLine = array();
				$thisLine['context'] = array();
				$thisLine['text'] = implode($_PARAM['LINEBREAK'], $currentText);
				$pictureStatus = "noPicture";
				if (!empty($currentTextParam['headerParam'][0])) $pictureStatus = "hasPicture";
				$thisLine['context'][] =  $parentContext."/$keyPage/list/".$currentTextParam['headerIndex']."/message/$pictureStatus/".$messagePossition[$currentTextParam['headerParam'][3]];
				$thisLine['parameters'][] = $currentTextParam;
				
				if (empty($RESULT[$thisLine['text']])) {
					$RESULT[$thisLine['text']] = $thisLine;
				} else {
					$RESULT[$thisLine['text']]['context'][] = $parentContext."/$keyPage/list/".$i."/message/$pictureStatus/".$messagePossition[$currentTextParam['headerParam'][3]];
					$RESULT[$thisLine['text']]['parameters'][] = $currentTextParam;
					
				}
				$currentText = array();
			}
			
			if (!empty($currentLongText) && $page['list'][$i]['code'] != 405) {
				$thisLine = array();
				$thisLine['context'] = array();
				$thisLine['text'] = implode($_PARAM['LINEBREAK'], $currentLongText);
				$thisLine['context'][] =  $parentContext."/$keyPage/list/".$currentLongTextParam['headerIndex']."/scrollingMessage";
				$thisLine['parameters'][] = $currentLongTextParam;
				if (empty($RESULT[$thisLine['text']])) {
					$RESULT[$thisLine['text']] = $thisLine;
				} else {
					$RESULT[$thisLine['text']]['context'][] = $parentContext."/$keyPage/list/".$currentLongTextParam['headerIndex']."/scrollingMessage";
					$RESULT[$thisLine['text']]['parameters'][] = $currentLongTextParam;
				}
				$currentLongText = array();
			}
			
			switch($page['list'][$i]['code']) {
				case 101: //text parameters
					$currentTextParam['headerIndex'] = $i;
					$currentTextParam['headerParam'] = $page['list'][$i]['parameters'];
					$currentText = array();
					break;
				case 105: //start text scroll
					$currentLongTextParam['headerIndex'] = $i;
					$currentLongTextParam['headerParam'] = $page['list'][$i]['parameters'];
					$currentLongText = array();
					break;
				case 401: //text
					$currentText[] = $currentLine['parameters'][0];
					break;
				case 405: //long text
					$currentLongText[] = $currentLine['parameters'][0];
					break;
				
				case 122: //set variable
					$thisLine = array();
					$thisLine['text'] = $currentLine['parameters'][4];
					if (!is_string($thisLine['text'])) break;
					
					$thisLine['context'] =  Array($parentContext."/$keyPage/list/$i/".$_PARAM['RPGM_EVENT_CODE'][$page['list'][$i]['code']]."/var:".$currentLine['parameters'][0]."-".$currentLine['parameters'][1]);
					$thisLine['parameters'] = Array();
					$thisLine['tags'] = ["red"];
					
					if (empty($RESULT[$thisLine['text']])) {
						$RESULT[$thisLine['text']] = $thisLine;
					} else {
						$RESULT[$thisLine['text']]['context'] = Array($thisLine['context'][0]);
						$RESULT[$thisLine['text']]['parameters'] = Array();
					}					
					break;
				case 402: //choice
					$thisLine = array();
					$thisLine['text'] = $currentLine['parameters'][1];
					$thisLine['context'] =  Array($parentContext."/$keyPage/list/$i/".$_PARAM['RPGM_EVENT_CODE'][$page['list'][$i]['code']]);
					$thisLine['parameters'] = Array();
					if (empty($RESULT[$thisLine['text']])) {
						$RESULT[$thisLine['text']] = $thisLine;
					} else {
						$RESULT[$thisLine['text']]['context'] = Array($thisLine['context'][0]);
						$RESULT[$thisLine['text']]['parameters'] = Array();
					}					
					break;				
				case 320: //Change name
				case 324: //Change nick name
				case 325: //Change profile
					$thisLine = array();
					$thisLine['text'] = $currentLine['parameters'][1];
					$thisLine['context'] =  Array($parentContext."/$keyPage/list/$i/".$_PARAM['RPGM_EVENT_CODE'][$page['list'][$i]['code']]."/charId:".$currentLine['parameters'][0]);
					$thisLine['parameters'] = Array();
					if (empty($RESULT[$thisLine['text']])) {
						$RESULT[$thisLine['text']] = $thisLine;
					} else {
						$RESULT[$thisLine['text']]['context'] = Array($thisLine['context'][0]);
						$RESULT[$thisLine['text']]['parameters'] = Array();
					}					
					break;
					
				case 355: //Script Header
				case 655: //Script
				case 356: //plugin command
					$thisLine = array();
					$thisLine['text'] = $currentLine['parameters'][0];
					$thisLine['context'] =  Array($parentContext."/$keyPage/list/$i/".$_PARAM['RPGM_EVENT_CODE'][$page['list'][$i]['code']]);
					$thisLine['parameters'] = Array();
					$thisLine['tags'] = ["red"];
					if (empty($RESULT[$thisLine['text']])) {
						$RESULT[$thisLine['text']] = $thisLine;
					} else {
						$RESULT[$thisLine['text']]['context'] = Array($thisLine['context'][0]);
						$RESULT[$thisLine['text']]['parameters'] = Array();
					}					
					break;
			}
		}
	}
	return $RESULT;
}

function MV_fetchSystem($system, $parentContext, $currentData = array()) {
	
	if (!empty($system['gameTitle'])) {
		$newData = array();
		$newData['text'] = $system['gameTitle'];
		$newData['context'] = Array("$parentContext/gameTitle");
		$currentData = MV_appendResultData($currentData, $newData);
	}

	$type = Array('armorTypes', 'elements', 'equipTypes', 'skillTypes', 'weaponTypes');	
	foreach($type as $key) {
		if (empty($system[$key])) continue;
		foreach ($system[$key] as $thisKey=>$thisText) {
			if (empty($thisText)) continue;
			$newData = array();
			$newData['text'] = $thisText;
			$newData['context'] = Array("$parentContext/$key/$thisKey");
			
			$currentData = MV_appendResultData($currentData, $newData);
		}
	}
	
	foreach($system['terms'] as $key=>$terms) {
		foreach ($terms as $thisKey=>$thisText) {
			$newData = array();
			$newData['text'] = $thisText;
			$newData['context'] = Array("$parentContext/terms/$key/$thisKey");
			
			$currentData = MV_appendResultData($currentData, $newData);
		}
	}
	
	return $currentData;
}


function MV_appendResultData($currentData, $newData) {
	if (!is_array($currentData)) return false;
	if (empty($newData['text'])) return $currentData;

	if (!empty($currentData[$newData['text']])) {
		$currentData[$newData['text']] = array_merge_recursive($currentData[$newData['text']], $newData);
		$currentData[$newData['text']]['text'] = $newData['text'];
	} else {
		$currentData[$newData['text']] = $newData;
	}
	return $currentData;
}

function MV_fetchFromOtherJson($currentData, $parent) {
	if (!is_array($currentData)) return $currentData;
	global $_PARAM;
	
	$RESULT = array();
	foreach ($currentData as $key=>$val) {
		if (is_array($val)) {
			$CHILD = MV_fetchFromOtherJson($val, $parent."/$key");
			foreach ($CHILD as $childKey=>$childVal) {
				if (empty($RESULT[$childKey])) {
					$RESULT[$childKey] = $childVal;
				} else {
					$RESULT[$childKey]['context'] = array_merge($RESULT[$childKey]['context'], $childVal['context']);
				}
			}
			
		} else {
			if (!is_string($val)) continue;
			if (is_numeric($val)) continue;
			$content = array();
			$content['text'] = $val;
			$content['context'] = Array($parent."/$key");
			if (empty($RESULT[$val])) {
				$RESULT[$val] = $content;
			} else {
				$RESULT[$val]['context'][] = $content['context'][0];
			}
			
		}
		
		
	}
	
	return $RESULT;
}

function MV_extract() {
	global $_PARAM;

	$MV_PATH = $_PARAM['MV_ROOT'];

	if (!is_file($MV_PATH.'\data\System.json')) {
		$MV_PATH = $MV_PATH.'\www';
	}
	if (!is_file($MV_PATH.'\data\System.json')) {
		die("System.json not found");
	}



	$DATA = get_folder_content($MV_PATH.'\data');

	$RESULT =array();
	foreach ($DATA['files'] as $key=>$path) {
		$fileInfo = pathinfo($path);
		if (strtolower($fileInfo['extension']) !== 'json')	continue;
		
		$dataPath = realpath($MV_PATH.'\data');
		$fileInfo['relPath'] = substr($path, strlen($dataPath)+1);
		
		echo "Handling $path\r\n";
		$fileInfo['dataType'] = MV_determineType($path);
		//print_r($fileInfo);
		$currentData = json_decode(file_get_contents($path), true);

		echo "handling $fileInfo[dataType] category \r\n";
		if (empty($currentData)) continue;
		switch ($fileInfo['dataType']) {
			case "items":
			case "armors":
			case "weapons":
				$THISFETCH = MV_fetchCommonData($currentData, array("name", "description", "note"), $fileInfo['filename']);
				$RESULT[$path] = $THISFETCH;
				break;
			case "skills":
				$THISFETCH = MV_fetchCommonData($currentData, array("name", "description", "message1", "message2", "note"), $fileInfo['filename']);
				$RESULT[$path] = $THISFETCH;
				break;
			case "states":
				$THISFETCH = MV_fetchCommonData($currentData, array("name", "message1", "message2", "message3", "message4", "note"), $fileInfo['filename']);
				$RESULT[$path] = $THISFETCH;
				break;
			case "classes":
			case "enemies":
			case "tilesets":
				$THISFETCH = MV_fetchCommonData($currentData, array("name", "note"), $fileInfo['filename']);
				$RESULT[$path] = $THISFETCH;
				break;
			case "animations":
			case "mapinfos":
				$THISFETCH = MV_fetchCommonData($currentData, array("name"), $fileInfo['filename']);
				$RESULT[$path] = $THISFETCH;
				break;
			case "actors":
				$THISFETCH = MV_fetchCommonData($currentData, array("name", "nickname", "note", "profile"), $fileInfo['filename']);
				$RESULT[$path] = $THISFETCH;
				break;
			case "map":
				$THISFETCH = array();
				$newData = array();
				// fetch map name
				$newData['text'] = $currentData['displayName'];
				$newData['context'] = Array($fileInfo['filename']."/displayName");
				$THISFETCH = MV_appendResultData($THISFETCH, $newData);
				
				// fetch map note
				$newData['text'] = $currentData['note'];
				$newData['context'] = Array($fileInfo['filename']."/note");
				$THISFETCH = MV_appendResultData($THISFETCH, $newData);
				
				if (count($currentData['events'])<2) {
					$RESULT[$path] = $THISFETCH;
					break;
				}

				
				for ($eIndex=1; $eIndex<count($currentData['events']); $eIndex++) {
					if (empty($currentData['events'][$eIndex])) continue;
					//echo "Handling event ".$currentData['events'][$eIndex]['name']."\r\n";
					// fetch event name
					$newData['text'] = $currentData['events'][$eIndex]['name'];
					$newData['context'] = Array($fileInfo['filename']."/events/$eIndex/name");
					$THISFETCH = MV_appendResultData($THISFETCH, $newData);
					// fetch event note
					$newData['text'] = $currentData['events'][$eIndex]['note'];
					$newData['context'] = Array($fileInfo['filename']."/events/$eIndex/note");
					$THISFETCH = MV_appendResultData($THISFETCH, $newData);
					
					// fetch event pages content
					$THISFETCH = MV_fetchEventPages($currentData['events'][$eIndex]['pages'], $fileInfo['filename']."/events/$eIndex/pages", $THISFETCH);	
				}

				$RESULT[$path] = $THISFETCH;
				break;
			case "troops":
				if (count($currentData)<2) break;
				if (empty($currentData)) continue;
				$THISFETCH = array();
				$THISFETCH = MV_fetchCommonData($currentData, array("name"), $fileInfo['filename']);
			
				for ($eIndex=1; $eIndex<count($currentData); $eIndex++) {
					if (empty($currentData[$eIndex]['pages'])) continue;
					// fetch event pages content
					$THISFETCH = MV_fetchEventPages($currentData[$eIndex]['pages'], $fileInfo['filename']."/$eIndex/pages", $THISFETCH);	
				}
				
				$RESULT[$path] = $THISFETCH;
				//print_r($RESULT[$path]);
				
				break;
			case "commonevents":
				if (count($currentData)<2) break;
				if (empty($currentData)) continue;
				$THISFETCH = array();
				$newData = array();
				// fetch name
				for ($eIndex=1; $eIndex<count($currentData); $eIndex++) {
					if (empty($currentData[$eIndex])) continue;
					if (empty($currentData[$eIndex]['name'])) continue;
					$newData['text'] = $currentData[$eIndex]['name'];
					$newData['context'] = Array($fileInfo['filename']."/$eIndex/name");
					$THISFETCH = MV_appendResultData($THISFETCH, $newData);
				}

				$THISFETCH = MV_fetchEventPages($currentData, $fileInfo['filename'], $THISFETCH);	
				
				//print_r($THISFETCH);
				$RESULT[$path] = $THISFETCH;
				break;
			case "system":
				$RESULT[$path] = MV_fetchSystem($currentData, $fileInfo['filename']);
			
				break;
			default:
				$RESULT[$path] = MV_fetchFromOtherJson($currentData, $fileInfo['filename']);
				
				break;
		}

	}	
	
	return  MV_normalizeMVData($RESULT);
}

function MV_normalizeMVData($DATA) {
	// convert MV Raw data from MV_extract to Translator++ data format
	if (!is_array($DATA)) return false;
	global $_PARAM;
	$MV_PATH = $_PARAM['MV_ROOT'];

	if (!is_file($MV_PATH.'\data\System.json')) {
		$MV_PATH = $MV_PATH.'\www';
	}
	if (!is_file($MV_PATH.'\data\System.json')) {
		die("System.json not found");
	}
	
	$RESULT = array();
	foreach ($DATA as $path=>$fileData) {
		$THISDATA = array();
		$path = str_replace("\\", "/", $path);
		$fileInfo = pathinfo($path);
		//$dataPath = realpath($MV_PATH.'\data');
		$dataPath = realpath($MV_PATH);
		$fileInfo['relPath'] = substr($path, strlen($dataPath)+1);
		
		echo "Handling $path\r\n";
		
		$THISDATA['relPath'] = $fileInfo['relPath'];
		$THISDATA['dirname'] = substr($fileInfo['dirname'], strlen($dataPath));
		//$THISDATA['path'] = 'data/'.$fileInfo['relPath'];
		$THISDATA['path'] = $fileInfo['relPath'];
		$THISDATA['filename'] = $fileInfo['filename'];
		$THISDATA['basename'] = $fileInfo['basename'];
		$THISDATA['extension'] = $fileInfo['extension'];
		$THISDATA['lineBreak'] = $_PARAM['LINEBREAK'];
		$THISDATA['originalFormat'] = "RPG MAKER MV RAW DATA";
		
		$THISDATA['context'] = array();
		$THISDATA['parameters'] = array();
		$THISDATA['data'] = array();
		$THISDATA['tags'] = [];
		foreach ($fileData as $rowKey=>$rowData ) {
			$THISDATA['context'][] = $rowData['context'];
			$THISDATA['data'][] = Array($rowData['text']);
			if (!empty($rowData['tags'])) {
				$THISDATA['tags'][] = [$rowData['tags']];
			} else {
				$THISDATA['tags'][] = [];
			}
			if (!empty($rowData['parameters'])) $THISDATA['parameters'][] = $rowData['parameters'];
		
		}
		$RESULT[$fileInfo['relPath']] = $THISDATA;
	}
	return $RESULT;
}



if (!function_exists('getGameInfo')) {
	function getGameInfo($gamePath, $projectId="") {
		global $_PARAM;
		// added by donovan
		
		if (!is_file($_PARAM["MV_ROOT"].'\data\System.json')) echo "Unable to locate System.json\r\n";
		
		$SYSTEM = json_decode(file_get_contents($_PARAM["MV_ROOT"].'\data\System.json'), true);
		$gameInfo['title'] = $gameInfo['Title'] = $SYSTEM['gameTitle'];
		return $gameInfo;
	}
}


if (function_exists('getProjectId') == false) {
	function getProjectId($gamePath="", $projectId="") {
		global $_PARAM;
		$gameInfo = getGameInfo($gamePath);
		if (!empty($projectId)) {
			$id = $projectId;
		} elseif (!empty($_SERVER['POST']['projectId'])) {
			$id = $_SERVER['POST']['projectId'];
		} elseif (!empty($_POST['projectId'])) {
			$id = $_POST['projectId'];
		} elseif (!empty($_PARAM['projectId'])) {
			$id = $_PARAM['projectId'];
//		} elseif (!empty($gameInfo['Title'])) {
//			$id = md5($gameInfo['Title']);
		} else {
			$id = md5(time());
		}
		$_PARAM['projectId'] = $id;
		$_SERVER['POST']['projectId'] = $id;
		$_SERVER['GET']['projectId'] = $id;
		$_POST['projectId'] = $id;
		$_GET['projectId'] = $id;
		return $id;
	}
}

function getProjectCacheInfo($gamePath="") {
	global $_PARAM;
	$dirname = getProjectId($gamePath);
	$RESULT['cacheID'] = $dirname;
	$RESULT['cachePath'] = $_PARAM['CACHE_PATH'].$dirname;
	
	return $RESULT;
}


function prepareProjectCache($gamePath) {
	global $_PARAM;
	$gameInfo = getGameInfo($gamePath);
	$cacheInfo = getProjectCacheInfo($gamePath);
	
	if (!is_dir($cacheInfo['cachePath'])) {
		mkdir($cacheInfo['cachePath']);
	}
	
	file_put_contents($cacheInfo['cachePath']."//gameInfo.json", json_encode($gameInfo, JSON_PRETTY_PRINT));
	return realpath($cacheInfo['cachePath']);
	
}

function MV_processToStage($gamePath) {
	echo "Preparing stage\r\n";
	global $_PARAM;
	
	
	
	$MV_PATH = $_PARAM['MV_ROOT'];

	if (!is_file($MV_PATH.'\data\System.json')) {
		$MV_PATH = $MV_PATH.'\www';
	}
	if (!is_file($MV_PATH.'\data\System.json')) {
		die("System.json not found");
	}
	
	$cacheLocation = prepareProjectCache($gamePath);	
	echo "current cache path : $cacheLocation\r\n";
	mkdir($cacheLocation."\\data\\data", 777, true);
	mkdir($cacheLocation."\\data\\js", 777, true);

	
	echo "Copying data to stage\r\n";
	/*
	$cmd = "robocopy ".escape_win32_argv($MV_PATH.'\data')." ".escape_win32_argv($cacheLocation."\\data\\data")." /s";
	echo "\nMoving patch to stage : \n";
	echo $cmd."\n\n";
	passthru($cmd);
	*/
	// ROBOCOPY replacement by Dreamsavior
	copy_tree($MV_PATH.'\data', $cacheLocation."\\data\\data");

	copy($MV_PATH.'\index.html', $cacheLocation."\\data\\index.html");
	copy($MV_PATH.'\js\plugins.js', $cacheLocation."\\data\\js\\plugins.js");
}

function extractor($PATH) {
	// extract data
	
	MV_processToStage($PATH);
	

	
}
