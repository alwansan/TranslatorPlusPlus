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

/*
function travelAndApply($data, $replacement) {
	global $_PARAM;
	$size = 2;
	$result = array();
	$origKey = 'original   ';
	$transKey = 'translation';
	$dataCopy = $data;
	foreach ($data as $key=>$elm) {
		//if (!is_array($elm)) continue;
		if (!empty($_PARAM['skipElement'])) {
			if (!is_integer($key) && in_array($key, $_PARAM['skipElement'])) {
				continue;
			}
			
			if ($key == "type") {
				if (in_array($elm, $_PARAM['skipElement'])) break;
			}			
		}
		
		if (!empty($elm[$origKey])) {
			if (is_array($elm[$origKey])) {
				foreach($elm[$origKey] as $thisKey=>$str) {
					if (empty($str)) continue;
					if (empty($replacement[$str])) continue;
					//$result[] = array($str, $elm[$transKey][$thisKey]);
					$dataCopy[$key][$transKey][$thisKey] = $replacement[$str];
				}
			} else {
				if (!empty($replacement[$elm[$origKey]])) {
					//$result[] = array($elm[$origKey], $elm[$transKey]);
					$dataCopy[$key][$transKey] = $replacement[$elm[$origKey]];
				}
			}
		} else {
			if (empty($elm)) continue;
			if (!is_array($elm)) continue;
			$dataCopy[$key] = travelAndApply($dataCopy[$key], $replacement);
		}
	}
	return $dataCopy;
}

function applyTranslation($cache, $selectedFile) {
	// apply translation to dump/*.json script
	// write the result to mixed/*.json
	echo "entering applyTranslation\n";
	clearstatcache(true);
	$prepPath = $cache."\\mixed";
	if (!is_dir($prepPath)) {
		mkdir($prepPath,777, true);
	}	
	
	$saveData = json_decode(file_get_contents($cache."\\autosave.json"), true);
	//echo "content of : ".$cache."\\autosave.json";
	//print_r($project);
	//$folderContent = get_folder_content($cache."\\dump");
	$project = $saveData["project"];
	
	if (is_array($project['files'])) {
		foreach($project['files'] as $file => $projectFiles) {
			$currentPath = str_replace("/", "\\", $cache."/dump/".$file);
			
			if (!empty($selectedFile)) {
				$currentPathInfo = pathinfo($currentPath);
				if (in_array($currentPathInfo['basename'], $selectedFile) == false) { 
					continue;
				}
			}
			
			if (!is_array($projectFiles)) continue;
			if (!is_file($currentPath)) { continue;	}
			if (!is_array($projectFiles['data'])) continue;
			
			echo "Applying translation on : ".$currentPath."\n";
			
			$currentTemplate = json_decode(file_get_contents($currentPath), true);
			$replacement = array();
			foreach ($projectFiles['data'] as $key=>$colums) {
				if (empty($colums[0])) continue;
	
				for ($i=count($colums)-1; $i>0; $i--) { // exclude $columns[0]
					if (!empty($colums[$i]) && $colums[$i]!==null) {
						$replacement[$colums[0]] = $colums[$i];
						break;
					}
				}
				
			}
			$newObject = travelAndApply($currentTemplate, $replacement);
			
			file_put_contents($prepPath."\\".$file, json_encode($newObject));
			// debugging purpose

		}
	} else {
		echo "project files not found";
	}
	
}


function apply($cache, $selectedFile=Array()) {
	//apply json translation to rpg data
	global $_PARAM;

	$cachePath = $cache."\\dump";
	if (!is_dir($cachePath)) {
		echo "path :".$cachePath." not found\n";
		return false;
	}
	
	$prepPath = $cache."\\mixed";
	if (!is_dir($prepPath)) {
		mkdir($prepPath,777, true);
	}
	
	$dataPath = $cache.DIRECTORY_SEPARATOR."data";
	if (!is_dir($dataPath)) {
		echo "path :".$dataPath." not found\n";
		return false;
	}
	$cmd = "robocopy ".escape_win32_argv($dataPath)." ".escape_win32_argv($prepPath)." /s";
	echo $cmd."\n";
	passthru($cmd);

	applyTranslation($cache, $selectedFile);
	//passthru($cmd);
	
	$targetPath = $cache."\\data-translated";
	if (is_dir($targetPath)) {
		shell_exec("RMDIR ".escape_win32_argv($targetPath)." /S /Q");	
	}
	
	if (is_dir($targetPath)) {
		shell_exec("RMDIR ".escape_win32_argv($targetPath)." /S /Q");
	}
	mkdir($targetPath, 777, true);
	//return true();
	$rubyPath = $_PARAM['APP_PATH']."ruby".DIRECTORY_SEPARATOR."bin".DIRECTORY_SEPARATOR."ruby.exe";
	
	//$fileList = glob($prepPath."\\*.rvdata2");
	$fileList = glob($prepPath."\\*.".$_PARAM['dataExtension']);
	echo "===========================\n";
	echo "START TRANSLATING DATA\n";
	echo "===========================\n";
	

	print_r($selectedFile);
	
	foreach ($fileList as $path) {
		
		if (!empty($selectedFile)) { // if empty, all files are exported
			$thisPathInf = pathinfo($path);
			if (in_array($thisPathInf['filename'].".json", $selectedFile) == false) {
				echo "skipping ".$thisPathInf['basename']."\n";
				continue;
			}
		}		
		$command = escape_win32_argv($rubyPath)." ".
					escape_win32_argv($_PARAM['APP_PATH']."3rdParty\\rmxp_translator\\rmvxace_translator.rb")." ".
					"--translate=".str_replace("\\", "/", escape_win32_argv($path))." ".
					"--dest=".str_replace("\\", "/", escape_win32_argv($targetPath));
		echo $command."\n";
		passthru($command);
	}
	
	//ruby "D:/Apps/RPG-Maker-Translator-master/3rdParty/rmxp_translator/rmvxace_translator.rb" --translate="E:/Document/Documents/TranslationResult/NoRice_Translated/DataExtracted/*.rvdata2" --dest="E:/Document/Documents/TranslationResult/NoRice_Translated/DataTranslated"
}
*/



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
	$cmd = "COPY ".escape_win32_argv($cacheInfo['cachePath']."\\original-assets\\*.ini")." ".escape_win32_argv($TMP_PATH."\\project");
	echo $cmd."\r\n";
	passthru($cmd);
	
	echo "\nMoving data to temp : \n";
	if (empty($selectedFile)) {
		/*
		$cmd = "robocopy ".escape_win32_argv($cacheInfo['cachePath']."\\data")." ".escape_win32_argv($TMP_PATH."\\project\\data")." /s";
		echo $cmd."\n\n";
		passthru($cmd);
		*/
		// ROBOCOPY replacement by Dreamsavior
		copy_tree($cacheInfo['cachePath']."\\data", $TMP_PATH."\\project\\data");
	} else {
		// MapInfos  & Scripts are mandatory file
		if (!is_dir($TMP_PATH."\\project\\data")) mkdir($TMP_PATH."\\project\\data", 777, true);
		copy($cacheInfo['cachePath']."\\data\\MapInfos.".$_PARAM['dataExtension'], $TMP_PATH."\\project\\data\\MapInfos.".$_PARAM['dataExtension']);
		copy($cacheInfo['cachePath']."\\data\\Scripts.".$_PARAM['dataExtension'], $TMP_PATH."\\project\\data\\Scripts.".$_PARAM['dataExtension']);
		foreach ($selectedFile as $file) {
			$thisPathinfo = pathinfo($file);
			if ($thisPathinfo['dirname'] == '.') $thisPathinfo['dirname']="";
			$thisRelPath = "\\".$thisPathinfo['dirname']."\\".$thisPathinfo['filename'].".".$_PARAM['dataExtension'];
			copy($cacheInfo['cachePath']."\\data".$thisRelPath, $TMP_PATH."\\project\\data".$thisRelPath);
		}
	}

	echo "\nGenerating patch file : \n";
	transToRPGTransFile($transPath, $TMP_PATH."\\project_patch", $selectedFile);

	echo "\nBuilding patch : \n";
	$cmd = escape_win32_argv($_PARAM['RPGMTRANS'])." ".escape_win32_argv($TMP_PATH."\\project")." -p ".escape_win32_argv($TMP_PATH."\\project_patch");

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
	$batFile[]= "ECHO Select some text to pause this window from automatically closeing.";
	$batFile[]= "timeout 5";
	$batFile = implode("\r\n", $batFile);
	$batLocation = dirname($_PARAM['RPGMTRANS'])."\\parse.bat";
	file_put_contents($batLocation, $batFile);

	echo $cmd."\n";
	$shell = new COM("WScript.Shell");
	$oExec = $shell->Run(escape_win32_argv($batLocation), 1, true);
	
	
	$resultList = get_folder_content($TMP_PATH."\\project_translated");
	print_r($resultList);
	$basePathLength = strlen($TMP_PATH."\\project_translated\\");
	$basePathFull = strlen($TMP_PATH."\\project_translated\\data\\");
	//$targetPathLength = strlen($destination);
	
	foreach ($resultList['files'] as $path) {
		$thisPathInfo = pathinfo($path);
		//if (!is_dir($destination)) mkdir($destination, 777, true);
		$newDest = substr($path, $basePathLength);
		


		
		if (!empty($selectedFile)) {
			// handling GameINI.txt
			echo "basename : ".$thisPathInfo['filename']."\n";
			if (strtolower($thisPathInfo['basename']) == "game.ini") {
				echo "Checking user selection of GameINI.txt\n";
				var_dump(in_array("GameINI.txt", $selectedFile))."\n";
				if (in_array("GameINI.txt", $selectedFile))  {
					$targetInfo = pathinfo($destination."\\".$newDest);
					if (!is_dir($targetInfo['dirname'])) {
						mkdir($targetInfo['dirname'], 777, true);
					}
					echo "GameINI.txt file is selected!\n";
					copy($path, $destination."\\".$newDest);
				}
				continue;
			}

		
			$thisID = substr($path, $basePathFull);
			echo "checking file id : $thisID \n";
			//if (!isset($idList[])) continue;
			if (!isExistOnList($thisID, $selectedFile)) continue;
		}
		
		$targetInfo = pathinfo($destination."\\".$newDest);
		if (!is_dir($targetInfo['dirname'])) {
			mkdir($targetInfo['dirname'], 777, true);
		}
		
		echo "copy(".$path.", ".$destination."\\".$newDest.")\n";
		copy($path, $destination."\\".$newDest);
	}
	
	if (hasSelectedTES($selectedFile) || empty($selectedFile)) {
		echo "Detect whether any encrypted TES data are exist :".$cacheInfo['cachePath']."\\data-tes\\extract_main \n";
		if (is_dir($cacheInfo['cachePath']."\\data-tes\\extract_main")) {
			echo "DETECTED!\n";			
			echo "Decrypting TES data. Do not close the popup window!\n";
			applyTesPatcher($cacheInfo['cachePath'], $destination."\\Data");
		} else {
			echo "Doesn't have TES data!\n";
		}
	}
	
	if (is_dir($destination."\\data")) {
		rename($destination."\\data", $destination."\\Data");
	}
	
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