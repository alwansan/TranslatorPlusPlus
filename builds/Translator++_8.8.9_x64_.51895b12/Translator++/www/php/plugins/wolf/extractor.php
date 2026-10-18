<?php
set_time_limit(0);

function isResourceExtracted($gamePath) {
	global $_PARAM;
	clearstatcache(true);

	return false;
}

function extractData($gamePath, $cacheLocation) {
	// RESULT : all data will be available on cache/[game title]/data folder
	echo "RUNNING extractData function\n";
	global $_PARAM;
	
	$folderInfo = pathinfo($cacheLocation);
	
	if (!is_dir($cacheLocation)) {
		mkdir($cacheLocation, 777, true);
	}
	if (!is_dir($cacheLocation."\\Data\\BasicData")) {
		mkdir($cacheLocation."\\Data\\BasicData", 777, true);
	}
	if (!is_dir($cacheLocation."\\dump")) {
		mkdir($cacheLocation."\\dump", 777, true);
	}
	if (!is_dir($cacheLocation."\\data-ignored")) {
		mkdir($cacheLocation."\\data-ignored", 777, true);
	}
	if (!is_dir($cacheLocation."\\original-assets")) {
		mkdir($cacheLocation."\\original-assets", 777, true);
	}
	
	if (substr($_SERVER['TMP'], -1, 1) == "\\") {
		$TMP_PATH = $_SERVER['TMP'].$folderInfo['basename'];
		
	} else {
		$TMP_PATH = $_SERVER['TMP']."\\".$folderInfo['basename'];
	}
	
	if (!is_dir($TMP_PATH)) {
		mkdir($TMP_PATH, true);
	}
	print_r($folderInfo);
	echo "\r\nTmp path : ".$TMP_PATH."\n";	
	
	if (isResourceExtracted($gamePath)) {
		// copy data directly to cache folder
		echo "copying folder data to cache\r\n";
		//("ROBOCOPY \"$ROOTPATH\" \"$_SERVER[TMP]\\Toybox\" /s")
		// Robocopy will copy files which is unable to handle with php
		/*
		$cmd = "robocopy ".escape_win32_argv($gamePath."\\data")." ".escape_win32_argv($TMP_PATH."\\data")." /s";
		echo $cmd;
		shell_exec($cmd);
		*/
		copyFiles($gamePath."\\data", $TMP_PATH."\\data");
		
		
		
	} else {
		// extract from wolf archive

		echo "Copy all *.wolf to temp folder\r\n";
		/*
		$cmd = "robocopy ".escape_win32_argv($gamePath)." ".escape_win32_argv($TMP_PATH)." *.wolf /S";
		echo $cmd."\r\n";
		passthru($cmd);
		*/
		copy_tree($gamePath, $TMP_PATH, '*.wolf');
		
		if (is_dir($gamePath."\\Data\\BasicData")) {
			echo "Extracted BasicData found!\r\n";
			if (!is_dir($TMP_PATH."\\Data\\BasicData")) {
				if (mkdir($TMP_PATH."\\Data\\BasicData", 777, true)) {
					copy_tree($gamePath."\\Data\\BasicData", $TMP_PATH."\\Data\\BasicData");
				} else {
					echo "failed to create directory : ".$TMP_PATH."\\Data\\BasicData\r\n";
				}
			}
		}
		
		if (is_dir($gamePath."\\Data\\MapData")) {
			echo "Extracted MapData found!\r\n";
			
			if (!is_dir($TMP_PATH."\\Data\\MapData")) {
				if (mkdir($TMP_PATH."\\Data\\MapData", 777, true)) {
					copy_tree($gamePath."\\Data\\MapData", $TMP_PATH."\\Data\\MapData");
				} else {
					echo "failed to create directory : ".$TMP_PATH."\\Data\\MapData\r\n";
				}
			}
		}
		
		$folderContent = get_folder_content($TMP_PATH);
		print_r($folderContent);
		
		$dxKey = "old";
		foreach ($folderContent['files'] as $key=>$file) {
			$thisPathInf = pathinfo($file);
			if (strtolower($thisPathInf['extension']) !== 'wolf') continue;
			
			if ($_SERVER['WOLF_EXTRACTION_METHOD'] !== "wolfDec") {
				if ($dkKey !== 'new') {
					echo "extracting ".$thisPathInf['basename']."\r\n";
					$cmd = escape_win32_argv($_PARAM['DX_EXTRACTOR'])." ".escape_win32_argv($file);
					echo $cmd."\r\n";
					$thisOutput = shell_exec($cmd);
					$thisOutput = trim($thisOutput);
					if (empty($thisOutput)) {
						echo "Failed to extract ".$thisPathInf['basename']." using DXextractor. Try to use newer key\n";
						$dxKey = "new";
						$_SERVER['WOLF_INFO']['version'] = "new";
					} else {
						$_SERVER['WOLF_INFO']['version'] = "old";
					}
					
				
				}
				
				if ($dxKey == 'new') {
					echo "extracting ".$thisPathInf['basename']."\r\n";
					
					$cmd = escape_win32_argv($_PARAM['DX_DECODEDEC'])." ".$_PARAM['WOLF_KEY'][1]." ".escape_win32_argv($file);
					echo $cmd."\r\n";

					passthru($cmd);
				}
			} else {
				echo "extracting ".$thisPathInf['basename']." with WolfDec \r\n";
				$cmd = escape_win32_argv($_PARAM['WOLFDEC_PATH'])." ".escape_win32_argv($file);
				echo $cmd."\r\n";
				$thisOutput = shell_exec($cmd);				
				
			}
		
			
		}
		
		echo "GENERATING PATCH\r\n";
		$cmd = escape_win32_argv($_PARAM['RUBY_BIN'])." ".escape_win32_argv($_PARAM['WOLFTRANS_PATH'])." ".escape_win32_argv($TMP_PATH)." ".escape_win32_argv($TMP_PATH."_patch")." ".escape_win32_argv($TMP_PATH."_translated");
		echo $cmd."\r\n";
		passthru($cmd);
		
		echo "Moving files to stage\r\n";
		/*
		$cmd = "robocopy ".escape_win32_argv($TMP_PATH."_patch\\Patch\\dump")." ".escape_win32_argv($cacheLocation."\\dump")." /S";
		echo $cmd."\r\n";
		passthru($cmd);
		*/
		// ROBOCOPY replacement by Dreamsavior
		copy_tree($TMP_PATH."_patch\\Patch\\dump", $cacheLocation."\\dump");
		
		echo "Moving raw data to stage's data\r\n";
		/*
		$cmd = "robocopy ".escape_win32_argv($TMP_PATH."\\Data\\BasicData")." ".escape_win32_argv($cacheLocation."\\Data\\BasicData")." /S";
		echo $cmd."\r\n";
		passthru($cmd);
		*/
		// ROBOCOPY replacement by Dreamsavior
		copy_tree($TMP_PATH."\\Data\\BasicData", $cacheLocation."\\Data\\BasicData");
		
		/*
		$cmd = "robocopy ".escape_win32_argv($TMP_PATH."\\Data\\MapData")." ".escape_win32_argv($cacheLocation."\\Data\\MapData")." /S";
		echo $cmd."\r\n";
		passthru($cmd);
		*/
		// ROBOCOPY replacement by Dreamsavior
		copy_tree($TMP_PATH."\\Data\\MapData", $cacheLocation."\\Data\\MapData");
		
		/*
		$cmd = "robocopy ".escape_win32_argv($TMP_PATH."\\Data\\Common")." ".escape_win32_argv($cacheLocation."\\Data\\Common")." /S";
		echo $cmd."\r\n";
		passthru($cmd);
		*/
		// ROBOCOPY replacement by Dreamsavior
		copy_tree($TMP_PATH."\\Data\\Common", $cacheLocation."\\Data\\Common");
		
		
		echo "TMP Path is :\r\n<b id='tmpPath' class='tmpPath'>".$TMP_PATH."</b>\r\n";
		
		
	}

	
	// REMOVING TMP FOLDERS
	/*
	echo "REMOVING TEMP DIR\r\n";
	$cmd = "RMDIR ".escape_win32_argv($TMP_PATH)." /S /Q";
	echo $cmd."\n\n";
	passthru($cmd);
	$cmd = "RMDIR ".escape_win32_argv($TMP_PATH."_patch")." /S /Q";
	echo $cmd."\n\n";
	passthru($cmd);
	$cmd = "RMDIR ".escape_win32_argv($TMP_PATH."_translated")." /S /Q";
	echo $cmd."\n\n";
	passthru($cmd);
	*/

	
	
	return $cacheLocation;
}


if (!function_exists('getGameInfo')) {
	function getGameInfo($gamePath, $projectId="") {
		global $_PARAM;
		
		$infoCache = $_PARAM['CACHE_PATH'].$_POST['projectId']."\\gameInfo.json";		
		if (!empty($projectId)) {
			$infoCache = $_PARAM['CACHE_PATH'].$_POST['projectId']."\\gameInfo.json";
		}
		if (is_file($infoCache)) {
			return json_decode(file_get_contents($infoCache), true);
		}
		// =======================
		return $gameInfo;
	}
}

function replaceIllegalCharacter($string) {
	$bad = array_merge(array_map('chr', range(0,31)), array("<", ">", ":", '"', "/", "\\", "|", "?", "*"));
	$result = str_replace($bad, "-", $string);	
	return $result;
	
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
	
	clearstatcache(true);

	
	$cacheInfo = getProjectCacheInfo($gamePath);
	
	if (!is_dir($cacheInfo['cachePath'])) {
		mkdir($cacheInfo['cachePath']);
	}
	return realpath($cacheInfo['cachePath']);
	
}

function fetchGameTitle($path) {
	// $path is path to GameDat.txt
	echo "Fetch game data from $path";
	if (!is_file($path)) {
		return false;
		exit;
	}
	
	$result = parseRPGTransFile($path);
	if (empty($result)) {
		return false;
		exit;
	}
	
	foreach ($result['parameters'] as $key=>$val) {
		if (empty($val["CONTEXT GAMEDAT"][0])) continue;
		if (substr($val["CONTEXT GAMEDAT"][0], 0, 5) == "Title") {
			return $result['data'][$key][0];
			exit;
		}		
	}
}

function extractor($PATH) {
	// mandatory
	// extract data
	if (empty($PATH)) {
		return false;
	}

	//echo isResourceExtracted($PATH);
	$gameInfo = getGameInfo($PATH);
	echo "Game info : \r\n";
	print_r($gameInfo);
	echo "=========================\r\n";
	$cacheLocation = prepareProjectCache($PATH);
	extractData($PATH, $cacheLocation);
	
	echo "FETCH GAME TITLE \r\n";
	$gameInfo['title'] = fetchGameTitle($cacheLocation."\\dump\\GameDat.txt");
	$gameInfo['Title'] = $gameInfo['title'];
	$_POST['gameTitle'] = $gameInfo['gameTitle'];
	$GLOBALS['RESULT']['gameTitle'] = $gameInfo['title']; // inject game title to parent variable
	file_put_contents($cacheLocation."//gameInfo.json", json_encode($gameInfo, JSON_PRETTY_PRINT));
	
	return $cacheLocation;
	//dump($cacheLocation);
}


