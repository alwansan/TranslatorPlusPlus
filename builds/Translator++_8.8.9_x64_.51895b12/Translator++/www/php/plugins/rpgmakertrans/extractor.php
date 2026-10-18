<?php
set_time_limit(0);
$_PARAM['APP_PATH'] = substr(__FILE__ , 0, strrpos(__FILE__, "www".DIRECTORY_SEPARATOR));
//$_PARAM['CACHE_PATH'] = $_PARAM['APP_PATH']."www\\php\\cache\\";


function isResourceExtracted($gamePath) {
	global $_PARAM;
	clearstatcache(true);
	//if (!is_file($gamePath."\\data\\System.rvdata2")) {
	if (!is_file($gamePath."\\data\\System.".$_PARAM['dataExtension'])) {
		return false;
	} else {
		return true;
	}
}

function extractData($gamePath, $cacheLocation) {
	// RESULT : all data will be available on cache/[game title]/data folder
	echo "RUNNING extractData function\n";
	global $_PARAM;
	
	$folderInfo = pathinfo($cacheLocation);
	
	if (!is_dir($cacheLocation)) {
		mkdir($cacheLocation, 777, true);
	}
	if (!is_dir($cacheLocation."\\data")) {
		mkdir($cacheLocation."\\data", 777, true);
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
		$hasResourceExtracted = false;
		
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
		// extract from rgss archive
		$hasResourceExtracted = true;

		
		$cmd = "copy /Y ".escape_win32_argv($gamePath."\\*.".$_PARAM['dataArcExtension'])." ".escape_win32_argv($TMP_PATH);
		passthru($cmd);
		
		$cmd = "copy /Y ".escape_win32_argv($gamePath."\\*.ini")." ".escape_win32_argv($TMP_PATH);
		echo $cmd."\r\n";
		passthru($cmd);
		
		$decrypterPath = $_PARAM['APP_PATH']."3rdParty\\RgssDecrypter\\RgssDecrypter.exe";
		$cmd = escape_win32_argv($decrypterPath)." -p ".escape_win32_argv($TMP_PATH."\\Game.".$_PARAM['dataArcExtension']);
		echo "\n";
		echo "Extracting data\n";
		echo $cmd."\r\n";
		$WshShell = new COM("WScript.Shell");
		$oExec = $WshShell->Run($cmd, 1, true);
		//"D:/Apps/RPG-Maker-Translator-master/3rdParty/RgssDecrypter/RgssDecrypter" -p "E:/Document/Documents/TranslationResult/NoRice_Translated/Game.rgss3a"
		if (!is_dir($TMP_PATH."\\data")) {
			echo $TMP_PATH."\\data not found\n";
		}

		$cmd = "del /Q ".escape_win32_argv($TMP_PATH."\\*.".$_PARAM['dataArcExtension']);
		passthru($cmd);

		
		// additional step to filter out unsupported files
		rename($TMP_PATH."\\data", $TMP_PATH."\\data-unfiltered");
		copyFiles($TMP_PATH."\\data-unfiltered", $TMP_PATH."\\data");
		
	}
	$cmd = "copy /Y ".escape_win32_argv($gamePath."\\*.ini")." ".escape_win32_argv($TMP_PATH);
	echo $cmd."\r\n";
	passthru($cmd);
	
	// filtering compatible data
	echo "\n\nFiltering compatible data!\n\n";
	//$folderContent = get_folder_content($TMP_PATH."\\Data\\");
	//$folderContent = glob($TMP_PATH."\\Data\\*");
	$folderContent = fetchDir($TMP_PATH."\\Data");
	
	foreach ($folderContent as $filePath) {
		$filePathInf = pathinfo($filePath);
		if (isLegalRPGTransFile($filePathInf['basename']) !== true) {
			echo "Illegal data file : ".$filePathInf['basename']." ... moving to data-ignored\n";
			rename($filePath, $cacheLocation."\\data-ignored\\".$filePathInf['basename']);
		}
		
		if ($filePathInf['filename'] == "main") {
			runTesPatcher($TMP_PATH, $cacheLocation."\\data-tes\\extract_main", 1);
			echo "Moving TES encrypted file to : data-ignored\n";
			
			if (!is_dir($cacheLocation."\\data-tes\\Data")) {
				mkdir($cacheLocation."\\data-tes\\Data", 777, true);
			}
			if (is_file($TMP_PATH."\\data\\Scripts.".$_PARAM['dataExtension'])) {
				copy($TMP_PATH."\\data\\Scripts.".$_PARAM['dataExtension'], $cacheLocation."\\data-tes\\Data\\Scripts.".$_PARAM['dataExtension']);
			} else if (is_file( $cacheLocation."\\data-ignored\\Scripts.".$_PARAM['dataExtension'])) {
				copy($cacheLocation."\\data-ignored\\Scripts.".$_PARAM['dataExtension'], $cacheLocation."\\data-tes\\Data\\Scripts.".$_PARAM['dataExtension']);
			}
			
			copy($filePath, $cacheLocation."\\data-tes\\Data\\".$filePathInf['basename']);
			rename($filePath, $cacheLocation."\\data-ignored\\".$filePathInf['basename']);
			
		}
		
	}


	$cmd = escape_win32_argv($_PARAM['RPGMTRANS'])." ".escape_win32_argv($TMP_PATH)." -p ".escape_win32_argv($TMP_PATH."_patch");
	
	$batFile = Array();
	$batFile[]= "ECHO OFF";
	$batFile[]= "CLS";
	$batFile[]= "ECHO Starting third party app: RPGMT_CLI";
	$batFile[]= "ECHO DO NOT CLOSE THIS WINDOW!";
	$batFile[]= "ECHO.";
	$batFile[]= "ECHO If the process is stuck for more than 10 minutes (or other problems),";
	$batFile[]= "ECHO please see the documentation in the following url:";
	$batFile[]= "ECHO https://dreamsavior.net/?p=1413";
	$batFile[]= "ECHO ======================================================================";
	$batFile[]= "ECHO.";
	$batFile[]= $cmd;
	$batFile[]= "ECHO.";
	$batFile[]= "timeout 5";
	$batFile = implode("\r\n", $batFile);
	$batLocation = dirname($_PARAM['RPGMTRANS'])."\\parse.bat";
	file_put_contents($batLocation, $batFile);
	//$cmd = "F:\\rpgmt_cli_v4.5\\rpgmt.exe ".escape_win32_argv($TMP_PATH)." -p ".escape_win32_argv($TMP_PATH."_translated");
	echo "\n\n\n";
	echo $cmd;
	$shell = new COM("WScript.Shell");
	$oExec = $shell->Run(escape_win32_argv($batLocation), 1, true);
	
	// move extracted data to dump
	/*
	$cmd = "robocopy ".escape_win32_argv($TMP_PATH."_patch\\patch")." ".escape_win32_argv($cacheLocation."\\dump")." /MOV";
	echo "\nMoving patch to stage : \n";
	echo $cmd."\n\n";
	passthru($cmd);
	*/
	// ROBOCOPY replacement by Dreamsavior
	move_tree($TMP_PATH."_patch\\patch", $cacheLocation."\\dump");
	
	// copy bare patch structure to folder data
	/*
	$cmd = "robocopy ".escape_win32_argv($TMP_PATH."_patch")." ".escape_win32_argv($cacheLocation."\\rpgmktranspatch")." /E";
	echo "\nMoving patch to stage : \n";
	echo $cmd."\n\n";
	passthru($cmd);
	*/
	// ROBOCOPY replacement by Dreamsavior
	copy_tree($TMP_PATH."_patch", $cacheLocation."\\rpgmktranspatch");
	
	//copy original data
	/*
	$cmd = "robocopy ".escape_win32_argv($TMP_PATH."\\data")." ".escape_win32_argv($cacheLocation."\\data")." /s";
	echo "\nMoving patch to stage : \n";
	echo $cmd."\n\n";
	passthru($cmd);
	*/
	// ROBOCOPY replacement by Dreamsavior
	copy_tree($TMP_PATH."\\data", $cacheLocation."\\data");
	
	
	$cmd = "copy /y ".escape_win32_argv($TMP_PATH."\\*.ini")." ".escape_win32_argv($cacheLocation."\\original-assets");
	echo $cmd."\n\n";
	passthru($cmd);
	
	
	if ($hasResourceExtracted) {
		echo "TMP Path is :\r\n<b id='tmpPath' class='tmpPath'>".$TMP_PATH."</b>\r\n";
	}
	
	// REMOVING TMP FOLDERS
	/*
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


function dump($cache) {
	// dump data to JSON
	// input $cache = full path to root folder of game cache (directory with game name)
	global $_PARAM;
	$cachePath = $cache."\\dump";
	if (is_dir($cachePath)) {
		// cleaning up existing file in cache path
		shell_exec("RMDIR ".escape_win32_argv($cachePath)." /S /Q");	
	}
	
	mkdir($cachePath, 777, true);
	
	
	$dataPath = $cache.DIRECTORY_SEPARATOR."Data".DIRECTORY_SEPARATOR;
	$rubyPath = $_PARAM['APP_PATH']."ruby".DIRECTORY_SEPARATOR."bin".DIRECTORY_SEPARATOR."ruby.exe";
	
	//$fileList = glob($dataPath."*.rvdata2");
	$fileList = glob($dataPath."*.".$_PARAM['dataExtension']);
	
	foreach ($fileList as $path) {
		$command = escape_win32_argv($rubyPath)." ".
					escape_win32_argv($_PARAM['APP_PATH']."3rdParty\\rmxp_translator\\rmvxace_translator.rb")." ".
					"--dump=".str_replace("\\", "/", escape_win32_argv($path))." ".
					"--dest=".str_replace("\\", "/", escape_win32_argv($cachePath));
		echo $command."\n";
		passthru($command);
	}
//ruby "D:/Apps/RPG-Maker-Translator-master/3rdParty/rmxp_translator/rmvxace_translator.rb" --translate="E:/Document/Documents/TranslationResult/NoRice_Translated/DataExtracted/*.rvdata2" --dest="E:/Document/Documents/TranslationResult/NoRice_Translated/DataTranslated"	
}

if (!function_exists('getGameInfo')) {
	function getGameInfo($gamePath, $projectId="") {
		global $_PARAM;
		// added
		$infoCache = $_PARAM['CACHE_PATH'].$_POST['projectId']."\\gameInfo.json";		
		if (!empty($projectId)) {
			$infoCache = $_PARAM['CACHE_PATH'].$_POST['projectId']."\\gameInfo.json";
		}
		if (is_file($infoCache)) {
			//fwrite(STDERR, "Loading game info from cache!");
			return json_decode(file_get_contents($infoCache), true);
		}
		// =======================
		$str = file_get_contents($gamePath."\\Game.ini");
		$currentEncoding =  mb_detect_encoding($str, "JIS, eucjp-win, sjis-win, UTF-8");
		$str = mb_convert_encoding($str, "UTF-8", $currentEncoding);
		$gameInfo = parse_ini_string($str, false, INI_SCANNER_RAW);
		if (!empty($gameInfo['Title'])) $gameInfo['title'] = $gameInfo['Title'];
		if (empty($gameInfo['Title']) && !empty($gameInfo['title'])) $gameInfo['Title'] = $gameInfo['title'];
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
	
	clearstatcache(true);
	/*
	if (!empty($gameInfo['Title'])) {
		//$dirname = replaceIllegalCharacter($gameInfo['Title']);
		$dirname = md5($gameInfo['Title']);
	} else {
		$dirname = md5(time());
	}
	*/
	$cacheInfo = getProjectCacheInfo($gamePath);
	
	if (!is_dir($cacheInfo['cachePath'])) {
		mkdir($cacheInfo['cachePath']);
	}
	file_put_contents($cacheInfo['cachePath']."//gameInfo.json", json_encode($gameInfo, JSON_PRETTY_PRINT));
	return realpath($cacheInfo['cachePath']);
	
}

function onAfterProcess() {
// ==================================================
// ADDING "main"'s TES file to stage
// ==================================================	
	global $RESULT, $_PARAM;
	// generating .trans for TES DATA
	$FILELIST = get_folder_content($RESULT['cache']['cachePath']."\\data-tes\\extract_main");
	foreach ($FILELIST['files'] as $key=>$path) {
		$current= pathinfo($path);
		$current['path'] = str_replace("\\", "/", $current['dirname']."/".$current['basename']);
		
		if (!in_array(strtolower($current['extension']), $_PARAM['ACCEPTED_EXTENSION'])) continue;
		$text = file_get_contents($current['path']);
		
		$loadedData = parseRPGTransFile($text, true);
		//$current['content'] = $loadedData['content'];
		$current['data'] = $loadedData['data'];
		$current['type'] = $loadedData['type'];
		if (!empty($loadedData['context'])) {
			$current['context'] = $loadedData['context'];
		}
		if (!empty($loadedData['lineBreak'])) {
			$current['lineBreak'] = $loadedData['lineBreak'];
		}
		if (!empty($loadedData['parameters'])) {
			$current['parameters'] = $loadedData['parameters'];
		}
		if (!empty($loadedData['header'])) {
			$current['originalFormat'] = $loadedData['header'];
		}
		/*
		if (!empty($loadedData['rawData'])) {
			$current['rawData'] = $loadedData['rawData'];
		}
		*/

		$current['relPath'] = substr($current['path'], strlen($RESULT['cache']['cachePath']."/data-tes/"));
		
		if (substr($current['relPath'], 0, 1) == "/") {
			$current['relPath'] = substr($current['relPath'], 1);
		}
		
		$current['dirname'] = substr($current['dirname'], strlen($RESULT['cache']['cachePath'])+1);
		$current['path'] = substr($current['path'], strlen($RESULT['cache']['cachePath'])+1);
		
		$RESULT['files'][$current['relPath']] = $current;

	}	
}

function extractor($PATH) {
	// mandatory
	// extract data
	if (empty($PATH)) {
		return false;
	}

	print_r(getGameInfo($PATH));
	
	$cacheLocation = prepareProjectCache($PATH);
	extractData($PATH, $cacheLocation);
	return $cacheLocation;
	//dump($cacheLocation);
}


