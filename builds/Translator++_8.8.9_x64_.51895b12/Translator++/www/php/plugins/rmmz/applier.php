<?php
class FlxZipArchive extends ZipArchive 
{
 public function addDir($location, $name) 
 {
       $this->addEmptyDir($name);
       $this->addDirDo($location, $name);
 } 
 private function addDirDo($location, $name) 
 {
    $name .= '/';
    $location .= '/';
    $dir = opendir ($location);
    while ($file = readdir($dir))
    {
        if ($file == '.' || $file == '..') continue;
        $do = (filetype( $location . $file) == 'dir') ? 'addDir' : 'addFile';
        $this->$do($location . $file, $name . $file);
    }
 } 
}

function createZip($cache, $zip_file_name="") {
	echo "Building zip from :  $cache\r\n";
	$currentScript = pathinfo(__FILE__);
	$pluginPath = $currentScript['dirname'];
	
	$the_folder = $cache;
	
	if (empty($zip_file_name)) {
		$zip_file_name = $cache."\\translation.zip";
	}
	
	if (is_file($zip_file_name)) {
		unlink($zip_file_name);
	}
	
	
	$za = new FlxZipArchive;
	$res = $za->open($zip_file_name, ZipArchive::CREATE);
	if($res === TRUE) 
	{
		//$za->addDir($the_folder, basename($the_folder));
		//$za->addFromString('readme.txt', 'file content goes here');
		if (is_file($pluginPath."\\distrib.txt")) {
			$noteContent = file_get_contents($pluginPath."\\distrib.txt");
			$za->setArchiveComment($noteContent);		
		}
		$za->addDir($the_folder."\\data","data");
		$za->close();
	}
	else{
		echo 'Could not create a zip archive on :'.$zip_file_name;
	}	
}

function MV_buildTextList($text, $header) {
	// $splitEach 0 ... then no split;
	// Show message are $splitEach = 4
	//echo "entering MV_buildTextList\r\n";
	//echo($text);
	//echo "\r\n=======================\r\n";
	global $_PARAM;
	$text = str_replace("\r", "", $text);
	$textArray = explode("\n", $text);
	
	$LIST = array();
	foreach ($textArray as $key=>$line) {
		if (($key+1)%4 == 1) {
			$LIST[] = $header;
		}
		$newRow = array();
		$newRow['code'] = 401;
		$newRow['indent'] = $header['indent'];
		$newRow['parameters'] = Array($line);
		$LIST[] = $newRow;
	}
	return $LIST;
}

function MV_buildScrollTextList($text, $header) {
	global $_PARAM;
	$text = str_replace("\r", "", $text);
	$textArray = explode("\n", $text);
	
	$LIST = array();
	$LIST[] = $header;
	foreach ($textArray as $key=>$line) {
		$newRow = array();
		$newRow['code'] = 401;
		$newRow['indent'] = $header['indent'];
		$newRow['parameters'] = Array($line);
		$LIST[] = $newRow;
	}
	return $LIST;
}

function MV_isOkToTranslateThis($tags, $options=null) {
	// determine that the given text is need to be skipped or not
	/*	
		$tags = row tags
		located at :  $fileData["tags"][$rowId]
		
		options : {
			filterTag:[],
			filterTagMode:"whitelist" //  "blacklist" or "" empty
		}
		
		if not set, will get from $_POST instead;
	
	*/	
	if (is_null($options)) {
		//option is not passed
		//try to get from $_POST;
		$options = $_POST['options'];
	}
	
	if (!empty($options['filterTagMode'])) {
		if (!empty($tags)) {
			if (is_array($tags)) {
				$intersects = array_intersect($options['filterTag'], $tags);
				//echo("Intersection of tags and blacklistTag:\n");
				//print_r($intersects);
				if ($options['filterTagMode'] == "blacklist") { 
					if (count($intersects) > 0) return false;
				} else if ($options['filterTagMode'] == "whitelist"){
					if (count($intersects) == 0) return false;
				}
			}
		} else {
			if ($options['filterTagMode'] == "whitelist") return false; // tags are blank and mode is whitelist then skip
		}
	}

	return true;
}

function MV_applyToEventList($translationPair, $ORIG) {
	global $_PARAM;
	if (!is_array($translationPair['translation'])) return $ORIG;
	if (empty($translationPair['translation'])) return $ORIG;
	if (!is_array($ORIG)) {
		echo "Not a valid MV event list\r\n";
		return false;
	}
	
	
	$index = 0;
	while (!empty($ORIG[$index])) {
		switch ($ORIG[$index]['code']) {
			case 101: //text parameters
				$thisTextColl = array();
				for ($i=$index+1; $i<count($ORIG); $i++) {
					if ($ORIG[$i]['code'] != 401) break; // expected text body
					
					$thisTextColl[] = $ORIG[$i]['parameters'][0];
				}
				$thisTextBody = implode($_PARAM['LINEBREAK'], $thisTextColl);
				
				if (isset($translationPair['translation'][$thisTextBody])) {
					$replacement = MV_buildTextList($translationPair['translation'][$thisTextBody], $ORIG[$index]);
					array_splice($ORIG, $index, count($thisTextColl)+1, $replacement);
				}
				
				break;
			
			case 105: //Scrolling text
				$thisTextColl = array();
				for ($i=$index+1; $i<count($ORIG); $i++) {
					if ($ORIG[$i]['code'] != 405) break; // expected text body
					
					$thisTextColl[] = $ORIG[$i]['parameters'][0];
				}
				$thisTextBody = implode($_PARAM['LINEBREAK'], $thisTextColl);
				
				if (!empty($translationPair['translation'][$thisTextBody])) {
					$replacement = MV_buildScrollTextList($translationPair['translation'][$thisTextBody], $ORIG[$index]);
					array_splice($ORIG, $index, count($thisTextColl)+1, $replacement);
				}
				
				break;
			case 122: //set variable
				$thisText = $ORIG[$index]['parameters'][4];
				if (!empty($translationPair['translation'][$thisText])) {
					$ORIG[$index]['parameters'][4] = $translationPair['translation'][$thisText];
				}	
				break;				
			case 102: //choice header
				$thisText = $ORIG[$index]['parameters'][0];
				if (empty($thisText)) break;
				for ($x=0; $x<count($thisText); $x++) {
					if (empty($translationPair['translation'][$thisText[$x]])) continue;
					$ORIG[$index]['parameters'][0][$x] = $translationPair['translation'][$thisText[$x]];
				}
				
				break;
			case 402: //choice member
			case 320: //Change name
			case 324: //Change nick name
			case 325: //Change profile			
				$thisText = $ORIG[$index]['parameters'][1];
				if (!empty($translationPair['translation'][$thisText])) {
					$ORIG[$index]['parameters'][1] = $translationPair['translation'][$thisText];
				}
				break;
				
			case 355: //Script Header
			case 655: //Script
			case 356: //plugin command
				$thisText = $ORIG[$index]['parameters'][0];
				if (!empty($translationPair['translation'][$thisText])) {
					$ORIG[$index]['parameters'][0] = $translationPair['translation'][$thisText];
				}
				break;
				
		}
		$index++;
	}
	return $ORIG;
	
}


function MV_applyCommonData($data, $translationPair, $fetchData) {
	global $_PARAM;
	if (empty($data)) {
		return false;
		exit;
	}
	
	$RESULT = $data;
	for ($i=1; $i<count($data); $i++) {
		if (empty($data[$i])) continue;

		$current = array();
		for ($fetch=0; $fetch<count($fetchData); $fetch++) {
			$thisText = $data[$i][$fetchData[$fetch]];
			
			if (!isset($data[$i][$fetchData[$fetch]])) continue; // will allow blank if only this
			if (empty($thisText)) continue;
			if (empty($translationPair['translation'][$thisText])) continue;
			
			$RESULT[$i][$fetchData[$fetch]] = $translationPair['translation'][$thisText];
		}
	}
	return $RESULT;
}

function MV_applyEventPages($eventPages, $translationPair) {
	// $eventPages are event Pages
	global $_PARAM;
	if (!is_array($eventPages)) return false;
	
	$RESULT = $eventPages;
	foreach($eventPages as $keyPage=>$page) {
		if (empty($page)) continue;
		if (empty($page['list'])) continue;
		$RESULT[$keyPage]['list'] =  MV_applyToEventList($translationPair, $page['list']);

	}
	return $RESULT;
}

function MV_applyToOtherJson($currentData, $translationPair) {
	if (!is_array($currentData)) return $currentData;
	global $_PARAM;
	
	$RESULT = $currentData;
	foreach ($currentData as $key=>$val) {
		if (is_array($val)) {
			$RESULT[$key] = MV_applyToOtherJson($val, $translationPair);
			
		} else {
			if (!is_string($val)) continue;
			if (is_numeric($val)) continue;

			if (!empty($translationPair['translation'][$val])) {
				$RESULT[$key] = $translationPair['translation'][$val];
			}
			
		}
		
		
	}
	return $RESULT;
}

function MV_translateData($TARGET_FOLDER, $FILTER) {
	global $_PARAM;

	if (!empty($_POST['dataPath'])) {
		echo "\nUse dataPath : ".$_POST['dataPath']."\n";
		$cacheLocation = $cacheInfo['cachePath'] = $_POST['dataPath'];
	} else {
		$cacheInfo = getProjectCacheInfo("");
		$cacheLocation = $cacheInfo['cachePath'];
	}

	$transPath = $cacheLocation."\\autosave.json";
	if (!empty($_POST['transPath'])) $transPath = $_POST['transPath'];
	
	echo "Processing : $transPath\n";
	$THISDATA = json_decode(file_get_contents($transPath), true); //<-- unmark this on production
	

	if (!is_dir($TARGET_FOLDER)) {
		if (mkdir($TARGET_FOLDER, 777, true) == false) {
			echo "Error : Folder $TARGET_FOLDER is not exist and unable to create one!\r\n";
			exit;
		}
	}
	
	
	if (is_string($FILTER)) {
		$FILTER = array($FILTER);
	}
	

	$THISPROJECT = $THISDATA['project'];
	
	// calculate path 
	// default is cache directory
	$basePath = $cacheLocation."\\data";
	if (is_file($cacheLocation."\\data\\System.json")) {
		// actual game directory where game.exe resides
		$basePath = $cacheLocation;
	} else if (is_file($cacheLocation."\\data\\System.json")) {
		// game directory where index.html resides
		$basePath = $cacheLocation;
	}
	
	foreach ($THISPROJECT['files'] as $relPath=>$fileData) {
		if ($fileData['extension'] !== "json") continue;
		if (empty($fileData['data'])) continue;
		if (!empty($FILTER)) {
			if (in_array($relPath, $FILTER) == false) continue;
		}
		echo "\r\n";
		$THISPATH = str_replace("\\", "/", $basePath."\\$relPath");
		echo "Loading $THISPATH\r\n";
		if (!is_file($THISPATH)) {
			echo "File not found :  $THISPATH\r\n";
			continue;
		}
		$ORIG_DATA = json_decode(file_get_contents($THISPATH), true);
		
		
		echo "collecting translation from $relPath\r\n";
		echo "=======================================================\r\n";
		$TRANSLATION_PAIR[$relPath] = array();
		foreach ($fileData['data'] as $rowId => $row) {
			if (MV_isOkToTranslateThis($fileData['tags'][$rowId]) == false) continue; // filter blacklist or whitelist
			
			$thisTrans = getPrefferedTrans($row);
			if (empty($thisTrans)) continue;
			echo "translation found : \r\n".$thisTrans."\r\n";
			$TRANSLATION_PAIR[$relPath]['translation'][$row[0]] = $thisTrans;

		}
		
		echo "Handling $relPath\r\n";
		$MV_TYPE = MV_determineType($relPath);
		echo "handling $MV_TYPE category \r\n";
		
		$NEWPATH = $TARGET_FOLDER."/$relPath";
		$NEWPATH_info = pathinfo($NEWPATH);
		if (!is_dir($NEWPATH_info['dirname'])) {
			mkdir($NEWPATH_info['dirname'], 777, true);
		}
		switch ($MV_TYPE) {
			case "items":
			case "armors":
			case "weapons":
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name", "description", "note"));
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "skills":
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name", "description", "message1", "message2", "note"));
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "states":
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name", "message1", "message2", "message3", "message4", "note"));
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "classes":
			case "enemies":
			case "tilesets":
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name", "note"));
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "animations":
			case "mapinfos":
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name"));
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "actors":
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name", "nickname", "note", "profile"));
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "map":
				$NEWDATA = $ORIG_DATA;
				
				if (!empty($TRANSLATION_PAIR[$relPath]['translation'][$NEWDATA['displayName']])) $NEWDATA['displayName'] 	= $TRANSLATION_PAIR[$relPath]['translation'][$NEWDATA['displayName']];
				if (!empty($TRANSLATION_PAIR[$relPath]['translation'][$NEWDATA['note']])) $NEWDATA['note'] 					= $TRANSLATION_PAIR[$relPath]['translation'][$NEWDATA['note']];
				
				
				$NEWDATA['events'] = MV_applyCommonData($ORIG_DATA['events'], $TRANSLATION_PAIR[$relPath], array("name", "note"));			
				for ($eIndex=1; $eIndex<count($NEWDATA['events']); $eIndex++) {
					if (empty($NEWDATA['events'][$eIndex])) continue;
					echo "Handling event ".$NEWDATA['events'][$eIndex]['name']."\r\n";
					$NEWDATA['events'][$eIndex]['pages'] = MV_applyEventPages($NEWDATA['events'][$eIndex]['pages'], $TRANSLATION_PAIR[$relPath]);
				}		

				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "troops":
				if (count($ORIG_DATA)<2) break;
				if (empty($ORIG_DATA)) continue;
				
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name"));			
				
				for ($eIndex=1; $eIndex<count($NEWDATA); $eIndex++) {
					if (empty($NEWDATA[$eIndex]['pages'])) continue;
					// fetch event pages content
					$NEWDATA[$eIndex]['pages'] = MV_applyEventPages($NEWDATA[$eIndex]['pages'], $TRANSLATION_PAIR[$relPath]);	
				}
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			case "commonevents":
				if (count($ORIG_DATA)<2) break;
				if (empty($ORIG_DATA)) continue;
				$NEWDATA = MV_applyCommonData($ORIG_DATA, $TRANSLATION_PAIR[$relPath], array("name"));	
				$NEWDATA = MV_applyEventPages($NEWDATA, $TRANSLATION_PAIR[$relPath]);	
				
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				break;
			default:
				$NEWDATA =  MV_applyToOtherJson($ORIG_DATA, $TRANSLATION_PAIR[$relPath]);
				file_put_contents($NEWPATH, json_encode($NEWDATA));
				
				break;
		}		
		
	}
	
	return $TARGET_FOLDER;
	//print_r($TRANSLATION_PAIR);
}



function exportProject($GAME_FOLDER, $PATH, $selectedFile=Array()) {
	global $_PARAM;
	// $GAME_FOLDER is actual game folder or game title
	$targetPathInfo = pathinfo($PATH);
	$cacheInfo = getProjectCacheInfo($GAME_FOLDER);
	echo "CACHE INFO\r\n";
	print_r($cacheInfo);
	if ($_POST['exportMode'] == 'zip') { // zip or dir
		$TARGET_FOLDER = $_SERVER['TMP']."\\".$cacheInfo['cacheID']."\\data-translated";
		/*
		if (is_dir($_SERVER['TMP']."\\".$cacheInfo['cacheID'])) {
			$cmd = "RMDIR ".escape_win32_argv($_SERVER['TMP']."\\".$cacheInfo['cacheID'])." /S /Q";
			echo $cmd."\n\n";
			passthru($cmd);			
		}
		*/
		try {
			mkdir($TARGET_FOLDER, 777, true);
		} catch (Exception $e) {
		}
		
		MV_translateData($TARGET_FOLDER, $selectedFile);
		createZip($TARGET_FOLDER, $PATH);
		
		if (is_dir($_SERVER['TMP']."\\".$cacheInfo['cacheID'])) {
			$cmd = "RMDIR ".escape_win32_argv($_SERVER['TMP']."\\".$cacheInfo['cacheID'])." /S /Q";
			echo $cmd."\n\n";
			passthru($cmd);			
		}		
	} else {
		MV_translateData($PATH, $selectedFile);
	}
	echo "\r\n\r\n";
	echo "DONE!";

}