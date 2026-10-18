<?php

function extractArchive($gamePath, $targetPath="") {
	// extract game archive and return the path of extracted path
	global $_PARAM;
	
	if (empty($targetPath)) {
		/*
		$rand = md5(time().rand(1,10000));
		$targetPath = $_SERVER['TMP']."\\".$rand;
		if (!is_dir($targetPath)) mkdir($targetPath, 0777, true);
		*/
		$targetPath = $gamePath;
	}
	
	
	echo "\r\nextract to : $target\r\n";
	if (isResourceExtracted($gamePath)) {
		echo "\r\nresource already extracted\n";
		return $gamePath;
		
	} else if (realpath($gamePath) == realpath($targetPath)) {
		// target directory is same
		echo "\r\nTarget Directory is same\n";
		echo "Extracting data\n";

		$decrypterPath = $_PARAM['APP_PATH']."3rdParty\\RgssDecrypter\\RgssDecrypter.exe";
		$cmd = escape_win32_argv($decrypterPath)." -p ".escape_win32_argv($targetPath."\\Game.".$_PARAM['dataArcExtension']);
		echo $cmd."\r\n";
		$WshShell = new COM("WScript.Shell");
		$oExec = $WshShell->Run($cmd, 1, true);
		//"D:/Apps/RPG-Maker-Translator-master/3rdParty/RgssDecrypter/RgssDecrypter" -p "E:/Document/Documents/TranslationResult/NoRice_Translated/Game.rgss3a"
		if (!is_dir($targetPath."\\data")) {
			echo $targetPath."\\data not found\n";
		}

		
	} else {
		echo "\r\nExtracting Resource\n";
		
		$cmd = "copy /Y ".escape_win32_argv($gamePath."\\*.".$_PARAM['dataArcExtension'])." ".escape_win32_argv($targetPath);
		echo $cmd."\r\n";
		passthru($cmd);
		
		$cmd = "copy /Y ".escape_win32_argv($gamePath."\\*.ini")." ".escape_win32_argv($targetPath);
		echo $cmd."\r\n";
		passthru($cmd);
		
		$decrypterPath = $_PARAM['APP_PATH']."3rdParty\\RgssDecrypter\\RgssDecrypter.exe";
		$cmd = escape_win32_argv($decrypterPath)." -p ".escape_win32_argv($targetPath."\\Game.".$_PARAM['dataArcExtension']);
		echo "\n";
		echo "Extracting data\n";
		echo $cmd."\r\n";
		$WshShell = new COM("WScript.Shell");
		$oExec = $WshShell->Run($cmd, 1, true);
		//"D:/Apps/RPG-Maker-Translator-master/3rdParty/RgssDecrypter/RgssDecrypter" -p "E:/Document/Documents/TranslationResult/NoRice_Translated/Game.rgss3a"
		if (!is_dir($targetPath."\\data")) {
			echo $targetPath."\\data not found\n";
		}

	}
	
	return $targetPath;
}

function clearArchive($targetPath) {
	global $_PARAM;
	echo "Removing original archive to avoid duplication\r\n";

	if (count(glob($targetPath."\\*.".$_PARAM['dataArcExtension']))) {
		$cmd = "del /Q ".escape_win32_argv($targetPath."\\*.".$_PARAM['dataArcExtension']);
		echo $cmd."\r\n";
		passthru($cmd);
	}

}


function copyTranslatableData($gamePath, $targetPath) {
	// copy any supported data inside $transPath
	$sourcePath = extractArchive($gamePath);
	clearArchive($sourcePath);
	global $_PARAM;
	clearstatcache();
	if (!is_dir($targetPath)) {
		mkdir($targetPath, 0777, true);
	}
	
	if (!is_dir($targetPath."\\data")) mkdir($targetPath."\\data", 0777, true);
	if (!is_dir($targetPath."\\original-assets")) mkdir($targetPath."\\original-assets", 0777, true);

	$cmd = "copy /Y ".escape_win32_argv($gamePath."\\*.ini")." ".escape_win32_argv($targetPath."\\original-assets");
	echo $cmd."\r\n";
	passthru($cmd);
	
	echo "Fetching dir : ".$sourcePath."\\Data\r\n";
	$folderContent = fetchDir($sourcePath."\\Data");
	echo "Folder Content : \r\n";
	print_r($folderContent);
	foreach ($folderContent as $filePath) {
		$filePathInf = pathinfo($filePath);
		if (isLegalRPGTransFile($filePathInf['basename']) !== true) continue;
		if ($filePathInf['filename'] == "main") {
			echo "main file found ... handling TES data\r\n";
			if (!is_dir($targetPath."\\data-tes\\Data\\")) mkdir($targetPath."\\data-tes\\Data\\", 0777, true);
			if (!is_dir($targetPath."\\data-tes\\extract_main\\")) mkdir($targetPath."\\data-tes\\extract_main\\", 0777, true);
			// copy neccesary TES file 
			// main file & script file
			echo "Copying main file : \r\n";
			copy($filePath, $targetPath."\\data-tes\\Data\\".$filePathInf['basename']);
			
			echo "Copying script file : \r\n";			
			copy($filePathInf['dirname']."\\Scripts.".$filePathInf['extension'], $targetPath."\\data-tes\\Data\\Scripts.".$filePathInf['extension']);
			continue;
		}
		copy($filePath, $targetPath."\\data\\".$filePathInf['basename']);

	}	
	return $targetPath;
}

function applyPatch($destination) {
	global $_PARAM;
	// assigning $_POST['dataPath'] manually
	// this is  needed for overriding exportToDir() default behavior
	// exportToDir() will lookup data from $_POST['dataPath'] instead of PHP cache
	$rand = md5(time().rand(1,10000));
	$_POST['dataPath'] =$_SERVER['TMP']."\\".$rand; 
	copyTranslatableData($destination, $_POST['dataPath']);
	echo 'pseudo $_POST["dataPath"] : '.$_POST['dataPath']."\r\n";
	echo "Start executing exportToDir : \r\n";
	exportToDir($_POST['gameFolder'], $destination, $_POST['files']);
}