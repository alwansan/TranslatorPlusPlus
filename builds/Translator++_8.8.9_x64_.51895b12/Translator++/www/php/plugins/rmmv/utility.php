<?php

function extractEnigma($exeFile, $targetDir) {
	global $_PARAM;
	if (is_enigma($exeFile)) {
		$location = MV_extractEnigma($exeFile);
		copy_tree($location."\\%DEFAULT FOLDER%\\", $targetDir);
	} else {
		$originPath = $exeFile;
		if (is_dir(dirname($exeFile))) $originPath = $exeFile;
		copy_tree($originPath, $targetDir);
	}
}


function applyPatch($destination) {
	global $_PARAM;
	// assigning $_POST['dataPath'] manually
	// this is  needed for overriding exportToDir() default behavior
	// exportToDir() will lookup data from $_POST['dataPath'] instead of PHP cache
	
	if (is_dir($destination."\\www")) $destination = $destination."\\www";
	
	$_POST['dataPath'] = $_POST['targetPath'];
	MV_translateData($destination, $_POST['files']);
}