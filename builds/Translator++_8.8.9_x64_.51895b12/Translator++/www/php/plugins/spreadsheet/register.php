<?php
// namespace format is : plugins\<folder name>
namespace plugins\spreadsheet;
// shared variable across plugins :
$_PLUGINS['spreadsheet'] = array();
$_PLUGINS['spreadsheet']['name'] = "spreadsheet";
$_PLUGINS['spreadsheet']["_folders"] = array();
$_PLUGINS['spreadsheet']["result"] = array();

function handleFile($path) {
	$supportedFiles = Array("xml", "xls", "xlsx", "ods", "slk", "gnumeric", "csv", "html");
	$thisExt = strtolower(pathinfo($path, PATHINFO_EXTENSION ));
	if (in_array($thisExt, $supportedFiles)) return $path;
	return false;
}

function handleDir($path) {
	global $_PLUGINS;
	if (!empty($_PLUGINS['spreadsheet']["_folders"])) return array();
	
	$content = get_folder_content($path);
	$supported = array();
	foreach ($content['files'] as $key=>$filePath) {
		$fileResult = handleFile($filePath);
		if ($fileResult) $supported[] = $fileResult;
	}
	return $supported;
}

// MANDATORY
// return array of supported files
// return blank array if nothing supported
function register($path="") {
	global $_PLUGINS;
	if (!is_array($path)) $path = Array($path);
	
	$supported = array();
	foreach ($path as $thisPath) {
		if (is_dir($thisPath)) {
			$dirResult = handleDir($thisPath);
			$supported = array_merge($supported, $dirResult);
		} elseif (is_file($thisPath)) {
			
			$fileResult = handleFile($thisPath);
			if ($fileResult) $supported[] = $fileResult;
		}
	}
	$_PLUGINS['spreadsheet']['result'] = $supported;
	return $supported;
}
