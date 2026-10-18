<?php
set_time_limit(0);
$_PARAM['APP_PATH'] = substr(__FILE__ , 0, strrpos(__FILE__, "www".DIRECTORY_SEPARATOR));
$_PARAM['CACHE_PATH'] = $_PARAM['APP_PATH']."www\\php\\cache\\";


function isResourceExtracted($gamePath) {
	clearstatcache(true);
	if (!is_file($gamePath."\\data\\System.rvdata2")) {
		return false;
	} else {
		return true;
	}
}

function extractData($gamePath, $cacheLocation) {
	// RESULT : all data will be available on cache/[game title]/data folder
	global $_PARAM;

	
	if (isResourceExtracted($gamePath)) {
		// copy data directly to cache folder
		echo "copying folder data to cache\r\n";
		//("ROBOCOPY \"$ROOTPATH\" \"$_SERVER[TMP]\\Toybox\" /s")
		$cmd = "robocopy ".escapeshellarg($gamePath."\\data")." ".escapeshellarg($cacheLocation."\\data")." /s";
		
		echo $cmd;
		shell_exec($cmd);
		
	} else {
		// extract from rgss3a
		$folderInfo = pathinfo($cacheLocation);
		
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
		
		$cmd = "copy /Y ".escapeshellarg($gamePath."\\*.rgss3a")." ".escapeshellarg($TMP_PATH);
		echo $cmd."\r\n";
		//shell_exec();
		
		passthru($cmd);
		
		$decrypterPath = $_PARAM['APP_PATH']."3rdParty\\RgssDecrypter\\RgssDecrypter";
		$cmd = escapeshellarg($decrypterPath)." -p ".escapeshellarg($TMP_PATH."\\Game.rgss3a");
		echo $cmd."\r\n";
		//$cmd = escapeshellarg($decrypterPath)." -p ".escapeshellarg();
		
		passthru($cmd);
		//"D:/Apps/RPG-Maker-Translator-master/3rdParty/RgssDecrypter/RgssDecrypter" -p "E:/Document/Documents/TranslationResult/NoRice_Translated/Game.rgss3a"
		
		$cmd = "robocopy ".escapeshellarg($TMP_PATH."\\data")." ".escapeshellarg($cacheLocation."\\data")." /s";
		passthru($cmd);
		
	} 
}


function dump($cache) {
	// dump data to JSON
	// input $cache = full path to root folder of game cache (directory with game name)
	global $_PARAM;
	$cachePath = $cache."\\dump";
	if (is_dir($cachePath)) {
		// cleaning up existing file in cache path
		shell_exec("RMDIR ".escapeshellarg($cachePath)." /S /Q");	
	}
	
	mkdir($cachePath, 777, true);
	
	
	$dataPath = $cache.DIRECTORY_SEPARATOR."Data".DIRECTORY_SEPARATOR;
	$rubyPath = $_PARAM['APP_PATH']."ruby".DIRECTORY_SEPARATOR."bin".DIRECTORY_SEPARATOR."ruby.exe";
	
	$fileList = glob($dataPath."*.rvdata2");
	
	foreach ($fileList as $path) {
		$command = escapeshellarg($rubyPath)." ".
					escapeshellarg($_PARAM['APP_PATH']."3rdParty\\rmxp_translator\\rmvxace_translator.rb")." ".
					"--dump=".str_replace("\\", "/", escapeshellarg($path))." ".
					"--dest=".str_replace("\\", "/", escapeshellarg($cachePath));
		echo $command."\n";
		passthru($command);
	}
//ruby "D:/Apps/RPG-Maker-Translator-master/3rdParty/rmxp_translator/rmvxace_translator.rb" --translate="E:/Document/Documents/TranslationResult/NoRice_Translated/DataExtracted/*.rvdata2" --dest="E:/Document/Documents/TranslationResult/NoRice_Translated/DataTranslated"	
}

/*
function apply($cache) {
	//apply json translation to rpg data
	global $_PARAM;

	$cachePath = $cache."\\dump";
	if (!is_dir($cachePath)) {
		echo "path :".$cachePath." not found\n";
		return false;
	}
	$dataPath = $cache.DIRECTORY_SEPARATOR."Data".DIRECTORY_SEPARATOR;
	if (!is_dir($dataPath)) {
		echo "path :".$dataPath." not found\n";
		return false;
	}

	$cmd = "robocopy ".escapeshellarg($cachePath)." ".escapeshellarg($dataPath)."/s";
	echo $cmd."\n";
	passthru($cmd);
	
	$targetPath = $cache."\\data-translated";
	if (is_dir($targetPath)) {
		shell_exec("RMDIR ".escapeshellarg($targetPath)." /S /Q");	
	}
	
	mkdir($targetPath, 777, true);
	
	$rubyPath = $_PARAM['APP_PATH']."ruby".DIRECTORY_SEPARATOR."bin".DIRECTORY_SEPARATOR."ruby.exe";
	
	$fileList = glob($dataPath."*.rvdata2");
	
	foreach ($fileList as $path) {
		$command = escapeshellarg($rubyPath)." ".
					escapeshellarg($_PARAM['APP_PATH']."3rdParty\\rmxp_translator\\rmvxace_translator.rb")." ".
					"--translate=".str_replace("\\", "/", escapeshellarg($path))." ".
					"--dest=".str_replace("\\", "/", escapeshellarg($targetPath));
		echo $command."\n";
		passthru($command);
	}
	
	//ruby "D:/Apps/RPG-Maker-Translator-master/3rdParty/rmxp_translator/rmvxace_translator.rb" --translate="E:/Document/Documents/TranslationResult/NoRice_Translated/DataExtracted/*.rvdata2" --dest="E:/Document/Documents/TranslationResult/NoRice_Translated/DataTranslated"
}
*/

if (!function_exists('getGameInfo')) {
	function getGameInfo($gamePath, $projectId="") {
		global $_PARAM;
		// added by donovan
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
		$gameInfo = parse_ini_string($str);
		$gameInfo['title'] = $gameInfo['Title'];
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

function extractor($PATH) {
	// extract data
	if (empty($PATH)) {
		return false;
	}
	//$PATH = "F:\\Games\\[RPG] [ぱっくりパラダイス] リズベルのアトリエ-聖王国の錬金術士-はじめての物語 Ver.1.02";
	//echo isResourceExtracted($PATH);
	print_r(getGameInfo($PATH));
	
	$cacheLocation = prepareProjectCache($PATH);
	extractData($PATH, $cacheLocation);
	dump($cacheLocation);
}

/*
$PATH = "F:\\Games\\[RPG] [ぱっくりパラダイス] リズベルのアトリエ-聖王国の錬金術士-はじめての物語 Ver.1.02";
$cacheLocation = prepareProjectCache($PATH);
apply($cacheLocation);
*/

// DETECT project title first;

//extractor("F:\\game\\Abyss", "F:\\GDrive\\Other\\RMTranslate\\www\\trans\\cache\\Abyss");


