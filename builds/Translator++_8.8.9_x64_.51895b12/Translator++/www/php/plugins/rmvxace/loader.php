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
	$_PARAM['dataArcExtension'] = "rgssad";
	$_PARAM['dataExtension'] = "rxdata";
}




function fetchData($data, $parentContext="") {
	global $_PARAM;
	$size = 2;
	$result = array();
	$origKey = 'original   ';
	$transKey = 'translation';
	//echo "<h1>Incoming data :</h1>";
	//print_r($data);
	
	if (!empty($data['type'])) {
		$parentContext = $parentContext."/".$data['type'];
	}
	
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
					$result[] = array($str, $elm[$transKey][$thisKey], $parentContext."/".$key);
				}
			} else {
				$result[] = array($elm[$origKey], $elm[$transKey], $parentContext."/".$key);
			}
		} else {
			//echo " orig key empty\n";
			if (empty($elm)) continue;
			if (!is_array($elm)) continue;
			$result = array_merge($result, fetchData($elm, $parentContext."/".$key));
		}
	}
	return $result;
}


/*
function fetchData($data, $parentContext="") {
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

*/


function loader($content) {
	$current['type'] = "text";
	if (isJson($content)) {
		//$current['content'] = json_decode($content, 1);
		// rawData[0] = original text
		// rawData[1] = default translation
		// rawData[2] = context
		$rawData = fetchData(json_decode($content, 1));
		if (!is_array($rawData)) echo "Error : failed to fecth data into array\n";
		
		$current['data'] = array();
		$current['context'] = array();
		foreach ($rawData as $key=>$val) {
			$current['data'][] = array($val[0], $val[1]);
			$current['context'][] = $val[2];
		}
		
		$current['type'] = "json";
		//$current['data'] = fetchData(json_decode($content, 1));
		
	}
	
	return $current;
	
}