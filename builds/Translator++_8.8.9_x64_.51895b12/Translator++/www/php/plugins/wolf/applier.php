<?php
class FlxZipArchive extends ZipArchive 
{
 public function addDir($location, $name) 
 {
       $this->addEmptyDir($name);
       $this->addDirDo($location, $name);
 } 
 private function addDirDo($location, $name) 
 {
    $name .= '/';
    $location .= '/';
    $dir = opendir ($location);
    while ($file = readdir($dir))
    {
        if ($file == '.' || $file == '..') continue;
        $do = (filetype( $location . $file) == 'dir') ? 'addDir' : 'addFile';
        $this->$do($location . $file, $name . $file);
    }
 } 
}

function createZip($targetDir, $zip_file_name="") {
	$currentScript = pathinfo(__FILE__);
	$pluginPath = $currentScript['dirname'];
	
	$the_folder = $targetDir;
	
	if (empty($zip_file_name)) {
		$zip_file_name = $targetDir."\\translation.zip";
	}
	
	if (is_file($zip_file_name)) {
		unlink($zip_file_name);
	}
	
	
	$za = new FlxZipArchive;
	$res = $za->open($zip_file_name, ZipArchive::CREATE);
	if($res === TRUE) 
	{
		//$za->addDir($the_folder, basename($the_folder));
		//$za->addFromString('readme.txt', 'file content goes here');
		if (is_file($pluginPath."\\distrib.txt")) {
			$noteContent = file_get_contents($pluginPath."\\distrib.txt");
			$za->setArchiveComment($noteContent);		
		}
		//$za->addDir($the_folder,"patch");
		
		$FILES = glob($targetDir."\\*");
		foreach ($FILES as $file) {
			$pathinfo = pathinfo($file);
			if (is_dir($file)) {
				$za->addDir($file, $pathinfo['basename']);
			} else {
				$za->addFile($file, $pathinfo['basename']);
			}
		}
		
		$za->close();
	}
	else{
		echo 'Could not create a zip archive on :'.$zip_file_name;
	}	
}


function exportToDir($GAME_FOLDER, $destination, $selectedFile=Array()) {
	// $GAME_FOLDER is actual game folder or game title
	global $_PARAM;
	
	if (!empty($_POST['dataPath'])) {
		echo "\nUse dataPath : ".$_POST['dataPath']."\n";
		$cacheLocation = $cacheInfo['cachePath'] = $_POST['dataPath'];
	} else {
		$cacheInfo = getProjectCacheInfo($GAME_FOLDER);
		print_r($cacheInfo);
		$cacheLocation = $cacheInfo['cachePath'];
	}
	$transPath = $cacheInfo['cachePath']."\\autosave.json";
	if (!empty($_POST['transPath'])) $transPath = $_POST['transPath'];	
	
	
	
	echo "filter : \n";
	print_r($selectedFile);
	$idList = array();
	

	
	$folderInfo = pathinfo($cacheInfo['cachePath']);
	if (substr($_SERVER['TMP'], -1, 1) == "\\") {
		$TMP_PATH = $_SERVER['TMP'].$folderInfo['basename'];
	} else {
		$TMP_PATH = $_SERVER['TMP']."\\".$folderInfo['basename'];
	}	

	echo "Preparing temp folder\n";
	if (!is_dir($TMP_PATH."\\project")) mkdir($TMP_PATH."\\project", 777, true);
	if (!is_dir($TMP_PATH."\\project_translated")) mkdir($TMP_PATH."\\project_translated", 777, true);
	if (!is_dir($TMP_PATH."\\project_patch")) mkdir($TMP_PATH."\\project_patch", 777, true);
	
	echo "copying data to temporary folder\n";
	/*
	//if (empty($selectedFile)) { // doesn't support selective file
		$cmd = "robocopy ".escape_win32_argv($cacheInfo['cachePath']."\\Data")." ".escape_win32_argv($TMP_PATH."\\project\\Data")." /s";
		echo $cmd."\n\n";
		passthru($cmd);
	//}
	*/
	// ROBOCOPY replacement by Dreamsavior
	//copy_tree($cacheInfo['cachePath']."\\Data", $TMP_PATH."\\project\\Data");
	copy_tree($cacheInfo['cachePath']."\\Data\\BasicData", $TMP_PATH."\\project\\Data\\BasicData");
	copy_tree($cacheInfo['cachePath']."\\Data\\MapData", $TMP_PATH."\\project\\Data\\MapData");
	copy_tree($cacheInfo['cachePath']."\\Data\\Common", $TMP_PATH."\\project\\Data\\Common");

	echo "\nGenerating patch file : \n";
	transToWolfTransFile($transPath, $TMP_PATH."\\project_patch", $selectedFile);

	echo "\nBuilding patch : \n";
	echo "GENERATING PATCH\r\n";
	$cmd = escape_win32_argv($_PARAM['RUBY_BIN'])." ".escape_win32_argv($_PARAM['WOLFTRANS_PATH'])." ".escape_win32_argv($TMP_PATH."\\project")." ".escape_win32_argv($TMP_PATH."\\project_patch")." ".escape_win32_argv($TMP_PATH."\\project_translated");
	echo $cmd."\r\n";
	passthru($cmd);
	
	echo "REMOVING DUPLICATE MAP DATA\r\n";
	$cmd = "DEL /Q ".escape_win32_argv($TMP_PATH."\\project_translated\\Data\\*.mps");
	echo $cmd."\r\n";
	passthru($cmd);

	echo "COPYING TO : ".$destination."\r\n";
	/*
	if (!is_dir($destination)) {
		if (mkdir($destination, 777, true)) {
			$cmd = "ROBOCOPY ".escape_win32_argv($TMP_PATH."\\project_translated\\")." ".escape_win32_argv($destination)." /s";
			passthru($cmd);
			echo "Patch file copied to : ".$destination."\r\n";
		}
	} else {
		$cmd = "ROBOCOPY ".escape_win32_argv($TMP_PATH."\\project_translated\\")." ".escape_win32_argv($destination)." /s";
		passthru($cmd);
		echo "Patch file copied to : ".$destination."\r\n";
	}
	*/
	// ROBOCOPY replacement by Dreamsavior
	copy_tree($TMP_PATH."\\project_translated\\", $destination);

	echo "ALL DONE!\r\n";
	

	return $destination;
		
}

function exportProject($GAME_FOLDER, $destination, $selectedFile=Array()) {
	global $_PARAM;
	$cacheInfo = getProjectCacheInfo($GAME_FOLDER);
	

	if ($_POST['exportMode'] == 'zip') {
		// export to zip file
		echo "Entering zip export mode\n";
		$folderInfo = pathinfo($cacheInfo);
		if (substr($_SERVER['TMP'], -1, 1) == "\\") {
			$TMP_PATH = $_SERVER['TMP'].$folderInfo['basename'];
		} else {
			$TMP_PATH = $_SERVER['TMP']."\\".$folderInfo['basename'];
		}	

		echo "Preparing temp folder\n";
		//if (!is_dir($TMP_PATH."\\project")) mkdir($TMP_PATH."\\project", 777, true);		
		
		exportToDir($GAME_FOLDER, $TMP_PATH."_tozip", $selectedFile);
		createZip($TMP_PATH."_tozip", $destination);	
		echo "Cleaning up cache\n";
		passthru("RMDIR ".escape_win32_argv($TMP_PATH."_tozip")." /S /Q");
		
	} else {
		exportToDir($GAME_FOLDER, $destination, $selectedFile);
		
	}
	
}