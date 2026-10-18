<?php
set_time_limit(0);
// You can register all file to be processed with loader () via $GLOBALS[FILELIST]
// if $GLOBALS[FILELIST] is blank, the engine will process through $RESULT['cache']['cachePath']."\\dump"

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

function extractData($path, $cacheLocation) {
	// YOUR SCRIPT HERE
	// $path is array of path
	// can be files or folders
	
	if (!empty($_POST['selectedFile'])) {
		$pathCollection = explode(";",$_POST['selectedFile']);
		$filteredPaths = Array();
		foreach ($pathCollection as $key=>$thisPath) {
			if (is_file($thisPath) OR is_dir($thisPath)) $filteredPaths[] = $thisPath;
		}
		
		if (!empty($filteredPaths)) $path = $filteredPaths;
	}
	
	echo "Working for path : \r\n";
	print_r($path);
	echo "\r\n";
	
	if (!is_array($path)) $path = Array($path);
	echo "extracting data to : $cacheLocation \n";
	// filtering data
	$supported = array();
	foreach ($path as $thisPath) {
		if (is_dir($thisPath)) {
			$dirResult = handleDir($thisPath);
			if (empty($supported[$thisPath])) $supported[$thisPath] = array();
			foreach ($dirResult as $val) {
				$supported[$thisPath][] = $val;
			}
		} elseif (is_file($thisPath)) {
			
			$fileResult = handleFile($thisPath);
			if ($fileResult) $supported['root'][] = $fileResult;
		}
	}	
	
	// preparing $cacheLocation/data folder
	$targetCache = $cacheLocation."\\data";
	echo "Creating dir : $targetCache\r\n";
	if (!is_dir($targetCache)) mkdir($targetCache, true);
	
	//fetch sheet content
	$result = array();
	foreach ($supported as $basePath => $filePath) {
		echo "basepath $basePath : ";
		foreach ($filePath as $thisFile) {
			//print_r($thisFile);
			if ($basePath == 'root') {
				echo "copying : $thisFile to $targetCache\r\n";
				copy($thisFile, $targetCache."\\".basename($thisFile));
			} else {
				echo "get relative path of $thisFile from $path : \r\n";
				$thisDirName = pathinfo($basePath, PATHINFO_DIRNAME );
				$relPath = get_relative_path($thisDirName, $thisFile);
				echo "$relPath\n";
				$destPath = $targetCache."\\".$relPath;
				$targetCachePath = pathinfo($destPath, PATHINFO_DIRNAME );
				if (!is_dir($targetCachePath)) {
					echo "creating dir : $targetCachePath\r\n";
					if (mkdir(pathinfo($destPath, PATHINFO_DIRNAME ), 777, true) == false) echo "unable to create directory : $destPath\n";
				}
				echo "copying : $thisFile to $destPath\r\n";
				
				copy($thisFile, $destPath);
			}
		}
	}
	
	$GLOBALS['FILELIST'] = get_folder_content($targetCache);
}

function onAfterProcess() {
	
}


function extractor($PATH) {
	// extract data from $PATH and copy that to cache/data
	if (empty($PATH)) {
		return false;
	}
	print_r(getGameInfo($PATH));
	
	$cacheLocation = prepareProjectCache($PATH);
	extractData($PATH, $cacheLocation);
	return $cacheLocation;	
}

