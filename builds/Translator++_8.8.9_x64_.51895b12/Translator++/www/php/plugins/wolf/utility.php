<?php
function extract_wolf($directory) {
	global $_PARAM;
	
	$folderContent = get_folder_content($directory);
	print_r($folderContent);
	
	$dxKey = "old";
	foreach ($folderContent['files'] as $key=>$file) {
		$thisPathInf = pathinfo($file);
		if (strtolower($thisPathInf['extension']) !== 'wolf') continue;
		
		if ($_SERVER['WOLF_EXTRACTION_METHOD'] !== "wolfDec") {
			if ($dkKey !== 'new') {
				echo "extracting ".$thisPathInf['basename']."\r\n";
				$cmd = escape_win32_argv($_PARAM['DX_EXTRACTOR'])." ".escape_win32_argv($file);
				echo $cmd."\r\n";
				$thisOutput = shell_exec($cmd);
				$thisOutput = trim($thisOutput);
				if (empty($thisOutput)) {
					echo "Failed to extract ".$thisPathInf['basename']." using DXextractor. Try to use newer key\n";
					$dxKey = "new";
					$_SERVER['WOLF_INFO']['version'] = "new";
				} else {
					$_SERVER['WOLF_INFO']['version'] = "old";
				}
				
			
			}
			
			if ($dxKey == 'new') {
				echo "extracting ".$thisPathInf['basename']."\r\n";
				
				$cmd = escape_win32_argv($_PARAM['DX_DECODEDEC'])." ".$_PARAM['WOLF_KEY'][1]." ".escape_win32_argv($file);
				echo $cmd."\r\n";

				passthru($cmd);
			}
		} else {
			echo "extracting ".$thisPathInf['basename']." with WolfDec \r\n";
			$cmd = escape_win32_argv($_PARAM['WOLFDEC_PATH'])." ".escape_win32_argv($file);
			echo $cmd."\r\n";
			$thisOutput = shell_exec($cmd);				
			
		}
	
		
	}
	
}


function prepareApply($destination) {
	global $_PARAM;
	
	echo "Check if .wolf exist\r\n";
	if (is_exist($destination, "*.wolf")) {
		echo "Wolf file is exist within $destination!\r\n";
		echo "Extracting all wolf file!\r\n";
		extract_wolf($destination);
	
		echo "Renaming all .wolf file\r\n";
		//rename_all($destination, "*.wolf", "*.bak");	
		delete_all($destination, "*.wolf");	
		
	}
}

function applyPatch($destination) {
	global $_PARAM;
	// assigning $_POST['dataPath'] manually
	// this is  needed for overriding exportToDir() default behavior
	// exportToDir() will lookup data from $_POST['dataPath'] instead of PHP cache
	
	$_POST['dataPath'] = $_POST['targetPath'];
	prepareApply($destination);
	echo "Running exportToDir";
	exportToDir($_POST['gameFolder'], $destination, $_POST['files']);
	
}