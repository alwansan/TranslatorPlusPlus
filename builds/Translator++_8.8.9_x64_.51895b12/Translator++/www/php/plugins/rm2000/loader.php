<?php
$THISPATH = pathinfo(__FILE__);
include($THISPATH['dirname']."/extractor.php");
include($THISPATH['dirname']."/applier.php");


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