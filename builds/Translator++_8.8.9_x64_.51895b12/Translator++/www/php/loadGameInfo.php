<?php
include_once("moduleLoader.php");



if (function_exists('onBeforeInit')) {
	onBeforeInit();
}


$gameInfo = getGameInfo($_GET['gameFolder']);
$RESULT['gameEngine'] 	= $_POST['gameEngine'];
$RESULT['gameTitle'] 	= $gameInfo['Title'];
$RESULT['projectId'] 	= getProjectId($_GET['gameFolder']);
$RESULT['cache'] 		= getProjectCacheInfo($_GET['gameFolder']);
$RESULT['buildOn'] 		= date("Y-m-d H:i:s");
$RESULT['appVersion'] 	= $_PARAM['VERSION'];
$RESULT['parser'] 		= "rmPHParser";




// ==================================================
// LOAD FROM initial.json IF EXIST
// ==================================================
if (is_file($RESULT['cache']['cachePath']."//initial.json")) {
	if (empty($_POST['force'])) {
		echo "\r\nInitial data : \n";
		echo "\n<b id='initialDataPath' data-path='".$RESULT['cache']['cachePath']."\\initial.json"."'>".$RESULT['cache']['cachePath']."\\initial.json"."</b>\r\n";
		
		
		//echo file_get_contents($RESULT['cache']['cachePath']."/initial.json");
		die();
	}
}


// ==================================================
// FETCH EXTRACTED JSON FROM CACHE
// ==================================================
if (!is_dir($RESULT['cache']['cachePath'])) {
	// create new project cache;
	//ob_start();
	extractor($_GET['gameFolder']);
	//$stdout = ob_get_clean();
	//file_put_contents("./cache/lastOutput.txt", $stdout);
	
}



$RESULT['loc'] = $_GET['gameFolder'];

// You can inject $FILELIST by $GLOBALS[FILELIST]
if (empty($FILELIST)) {
	$FILELIST = get_folder_content($RESULT['cache']['cachePath']."\\dump");
}
foreach ($FILELIST['files'] as $key=>$path) {
	$current= pathinfo($path);
	$current['path'] = str_replace("\\", "/", $current['dirname']."/".$current['basename']);
	
	if (!in_array(strtolower($current['extension']), $_PARAM['ACCEPTED_EXTENSION'])) continue;
	//$text = file_get_contents($current['path']);
	
	// run loader function to convert data from $current['path'] into objects
	$loadedData = loader($current['path']);
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
	$current['relPath'] = substr($current['path'], strlen($RESULT['cache']['cachePath']."/dump/"));
	
	if (substr($current['relPath'], 0, 1) == "/") {
		$current['relPath'] = substr($current['relPath'], 1);
	}
	
	$current['dirname'] = substr($current['dirname'], strlen($RESULT['cache']['cachePath'])+1);
	$current['path'] = substr($current['path'], strlen($RESULT['cache']['cachePath'])+1);
	$RESULT['files'][$current['relPath']] = $current;
}



if (function_exists('onAfterProcess')) {
	onAfterProcess();
}


// ==================================================
// SAVE CACHE to initial.json
// ==================================================
$JSON_RESULT = json_encode($RESULT);
echo "JSON length: ".strlen($JSON_RESULT)."bytes \r\n";
file_put_contents($RESULT['cache']['cachePath']."\\initial.json", $JSON_RESULT);
echo "Writing PHP serialized var:\r\n";
file_put_contents($RESULT['cache']['cachePath']."\\initial.ser", serialize($RESULT));
echo "\r\nInitial data : \n";
echo "\n<b id='initialDataPath' data-path='".$RESULT['cache']['cachePath']."\\initial.json"."'>".$RESULT['cache']['cachePath']."\\initial.json"."</b>\r\n";
//echo "<i id='initialData' style='display:none'>".$JSON_RESULT."</i>";
echo "DONE!";
//echo json_encode($RESULT);