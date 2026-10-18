<?php

function extractData($PATH, $cacheLocation) {
	
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

	$cacheInfo = getProjectCacheInfo($gamePath);
	
	if (!is_dir($cacheInfo['cachePath'])) {
		mkdir($cacheInfo['cachePath']);
	}
	file_put_contents($cacheInfo['cachePath']."//gameInfo.json", json_encode($gameInfo, JSON_PRETTY_PRINT));
	return realpath($cacheInfo['cachePath']);
	
}

function extractor($PATH) {
	// mandatory
	// extract data
	echo("Extracting data from : $PATH \r\n");
	if (empty($PATH)) {
		return false;
	}

	//print_r(getGameInfo($PATH));
	
	$cacheLocation = prepareProjectCache($PATH);
	extractData($PATH, $cacheLocation);
	return $cacheLocation;
	//dump($cacheLocation);
}