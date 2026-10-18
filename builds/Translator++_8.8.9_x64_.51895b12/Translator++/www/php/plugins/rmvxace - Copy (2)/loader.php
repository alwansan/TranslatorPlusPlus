<?php
$THISPATH = pathinfo(__FILE__);
include($THISPATH['dirname']."/extractor.php");
include($THISPATH['dirname']."/applier.php");
$_PARAM['ACCEPTED_EXTENSION'][] = "json";

// devaul RMVX ACE
$_PARAM['dataArcExtension'] = "rgss3a";
$_PARAM['dataExtension'] = "rvdata2";

if ($_POST['gameEngine'] == "rmvx") {
	$_PARAM['dataArcExtension'] = "rgss2a";
	$_PARAM['dataExtension'] = "rvdata";
} else if ($_POST['gameEngine'] == "rmxp") {
	$_PARAM['dataArcExtension'] = "rxdata";
	$_PARAM['dataExtension'] = "rgssad";
}




function fetchData($data) {
	global $_PARAM;
	$size = 2;
	$result = array();
	$origKey = 'original   ';
	$transKey = 'translation';
	//echo "<h1>Incoming data :</h1>";
	//print_r($data);
	
	
	foreach ($data as $key=>$elm) {
		//echo $key;
		if (!empty($_PARAM['skipElement'])) {
			// PHP bug in_array when checking integer 0
			if (!is_integer($key) && in_array($key, $_PARAM['skipElement'])) {
				continue;
			}
			
			if ($key == "type") {
				if (in_array($elm, $_PARAM['skipElement'])) break;
			}
		}
		
		if (!empty($elm[$origKey])) {
			//echo " orig key not empty\n";
			if (is_array($elm[$origKey])) {
				foreach($elm[$origKey] as $thisKey=>$str) {
					if (empty($str)) continue;
					$result[] = array($str, $elm[$transKey][$thisKey]);
				}
			} else {
				$result[] = array($elm[$origKey], $elm[$transKey]);
			}
		} else {
			//echo " orig key empty\n";
			if (empty($elm)) continue;
			if (!is_array($elm)) continue;
			$result = array_merge($result, fetchData($elm));
		}
	}
	return $result;
}



function loader($content) {
	$current['type'] = "text";
	if (isJson($content)) {
		//$current['content'] = json_decode($content, 1);
		$current['type'] = "json";
		
		$current['data'] = fetchData(json_decode($content, 1));
		
	}
	
	
	return $current;
	
}
