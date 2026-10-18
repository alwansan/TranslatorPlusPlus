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

function createZip($cache, $zip_file_name="") {
	$currentScript = pathinfo(__FILE__);
	$pluginPath = $currentScript['dirname'];
	
	$the_folder = $cache."\\data-translated";
	
	if (empty($zip_file_name)) {
		$zip_file_name = $cache."\\translation.zip";
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
		$za->addDir($the_folder,"Data");
		$za->close();
	}
	else{
		echo 'Could not create a zip archive on :'.$zip_file_name;
	}	
}

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
			/*
			echo $file."\n";
			if ($file == 'Map001.json') {
				print_r($replacement);
				print_r (travelAndApply($currentTemplate, $replacement));
			}
			*/
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
	$cmd = "robocopy ".escapeshellarg($dataPath)." ".escapeshellarg($prepPath)." /s";
	echo $cmd."\n";
	passthru($cmd);
	/*
	$cmd = "robocopy ".escapeshellarg($cachePath)." ".escapeshellarg($prepPath)." /s";
	echo $cmd."\n";
	*/
	applyTranslation($cache, $selectedFile);
	//passthru($cmd);
	
	$targetPath = $cache."\\data-translated";
	if (is_dir($targetPath)) {
		shell_exec("RMDIR ".escapeshellarg($targetPath)." /S /Q");	
	}
	
	if (is_dir($targetPath)) {
		shell_exec("RMDIR ".escapeshellarg($targetPath)." /S /Q");
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
		$command = escapeshellarg($rubyPath)." ".
					escapeshellarg($_PARAM['APP_PATH']."3rdParty\\rmxp_translator\\rmvxace_translator.rb")." ".
					"--translate=".str_replace("\\", "/", escapeshellarg($path))." ".
					"--dest=".str_replace("\\", "/", escapeshellarg($targetPath));
		echo $command."\n";
		passthru($command);
	}
	
	//ruby "D:/Apps/RPG-Maker-Translator-master/3rdParty/rmxp_translator/rmvxace_translator.rb" --translate="E:/Document/Documents/TranslationResult/NoRice_Translated/DataExtracted/*.rvdata2" --dest="E:/Document/Documents/TranslationResult/NoRice_Translated/DataTranslated"
}

function exportProject($GAME_FOLDER, $PATH, $selectedFile=Array()) {
	// $GAME_FOLDER is actual game folder or game title
	$cacheInfo = getProjectCacheInfo($GAME_FOLDER);
	apply($cacheInfo['cachePath'], $selectedFile);
	
	if (is_dir($PATH)) {
		if (empty($selectedFile)) {
			$cmd = "robocopy ".escapeshellarg($cacheInfo['cachePath']."\\data-translated")." ".escapeshellarg($PATH)." /s";
			echo $cmd."\n";
			passthru($cmd);		
		} else {
			foreach ($selectedFile as $filename) {
				$thisFile = $cacheInfo['cachePath']."\\data-translated\\".$filename;
				//echo "thisfile : $thisFile\n";
				$thisFileInfo = pathinfo($thisFile);
				
				$targetPath = $PATH."\\".$filename;
				$targetPathInfo = pathinfo($targetPath);
				if (!is_dir($targetPathInfo['dirname'])) {
					mkdir($targetPathInfo['dirname'], 777, true);
				}
				$cmd =  "COPY /y ".escapeshellarg($thisFileInfo['dirname']."\\".$thisFileInfo['filename'].".*")." ".escapeshellarg($targetPathInfo['dirname']);
				echo $cmd."\n";
				passthru($cmd);
			}
		}

	
	} else {
		createZip($cacheInfo['cachePath'], $PATH);	
	}
}