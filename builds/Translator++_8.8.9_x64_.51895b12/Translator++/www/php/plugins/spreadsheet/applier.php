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

function applyTranslationToArray($origData, $translations) {
	echo "Apply translation to array\n";
	//print_r($origData);
	if (!is_array($origData['data'])) return $origData;
	if (!is_array($origData['data'][0])) return $origData;
	foreach ($translations[0] as $translation) {
		//if (!isset($origData['data'][0][$translation['row']][$translation['col']])) continue;
		//echo "Applying translation ".$translation["translation"]."\n";
		$origData['data'][0][intval($translation['row'])][intval($translation['col'])] = $translation["translation"];
	}
	
	return $origData;
}



function SW_ImplodeCSV(array $rows, $headerrow=true, $mode='EXCEL', $fmt='2D_FIELDNAME_ARRAY')
// SW_ImplodeCSV - returns 2D array as string of csv(MS Excel .CSV supported)
// AUTHOR: tgearin2@gmail.com
// RELEASED: 9/21/13 BETA
  { $r=1; $row=array(); $fields=array(); $csv="";
	$escapes=array('\r', '\n', '\t', '\\', '\"');  //two byte escape codes
	$escapes2=array("\r", "\n", "\t", "\\", "\""); //actual code

	if($mode=='EXCEL')// escape code = ""
	 { $delim=','; $enclos='"'; $rowbr="\r\n"; }
	else //mode=STANDARD all fields enclosed
	   { $delim=','; $enclos='"'; $rowbr="\r\n"; }

	  $csv=""; $i=-1; $i2=0; $imax=count($rows);

	  while( $i < $imax )
	  {
		// get field names
		if($i == -1)
		 { $row=$rows[0];
		   if($fmt=='2D_FIELDNAME_ARRAY')
			{ $i2=0; $i2max=count($row);
			  while( list($k, $v) = each($row) )
			   { $fields[$i2]=$k;
				 $i2++;
			   }
			}
		   else //if($fmt='2D_NUMBERED_ARRAY')
			{ $i2=0; $i2max=(count($rows[0]));
			  while($i2<$i2max)
			   { $fields[$i2]=$i2;
				 $i2++;
			   }
			}

		   if($headerrow==true) { $row=$fields; }
		   else                 { $i=0; $row=$rows[0];}
		 }
		else
		 { $row=$rows[$i];
		 }

		$i2=0;  $i2max=count($row); 
		while($i2 < $i2max)// numeric loop (order really matters here)
		//while( list($k, $v) = each($row) )
		 { if($i2 != 0) $csv=$csv.$delim;

		   $v=$row[$fields[$i2]];

		   if($mode=='EXCEL') //EXCEL 2quote escapes
				{ $newv = '"'.(str_replace('"', '""', $v)).'"'; }
		   else  //STANDARD
				{ $newv = '"'.(str_replace($escapes2, $escapes, $v)).'"'; }
		   $csv=$csv.$newv;
		   $i2++;
		 }

		$csv=$csv."\r\n";

		$i++;
	  }

	 return $csv;
}

function generateCustomTransTable($data) {
	//echo "Generating custom trans table: \n";
	$result = [];
	if (!is_array($_POST["options"]["model"]["columnPairs"])) return $result;
	foreach ($_POST["options"]["model"]["columnPairs"] as $id => $columnPair) {
		if ($columnPair['source'] != $data['col']) continue;
		$thisRow = [];
		$thisRow["translation"] = $data["translation"];
		$thisRow['row'] 		= $data['row'];
		$thisRow['col'] 		= $columnPair['target'];
		$result[] = $thisRow;
	}
	return $result;
}


function exportToDir($GAME_FOLDER, $destination, $selectedFile=Array()) {
	// $GAME_FOLDER is actual game folder or game title
	global $_PARAM;
	$cacheInfo = getProjectCacheInfo($GAME_FOLDER);
	echo "Cache information:\n";
	print_r($cacheInfo);
	$cacheLocation = $cacheInfo['cachePath'];
	
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
	
	passthru("RMDIR ".escape_win32_argv($TMP_PATH)." /S /Q");
	
	if (!is_dir($TMP_PATH)) mkdir($TMP_PATH, 777, true);
	

	echo "\nMoving data to temp : \n";
	if (empty($selectedFile)) {
		// ROBOCOPY replacement by Dreamsavior
		copy_tree($cacheInfo['cachePath']."\\data", $TMP_PATH."\\data");
	} else {
		if (!is_dir($TMP_PATH."\\data")) mkdir($TMP_PATH."\\data", 777, true);
	
		print_r($selectedFile);
		echo "\r\n";
		foreach ($selectedFile as $file) {
			echo "Handling $file \r\n";
			$thisPathinfo = pathinfo($file);
			if ($thisPathinfo['dirname'] == '.') $thisPathinfo['dirname']="";
			$thisRelPath 	= "\\".$thisPathinfo['dirname']."\\".$thisPathinfo['basename'];
			$toCopy  		= str_replace("/", "\\", $cacheInfo['cachePath']."\\data".$thisRelPath);
			$dest 			= str_replace("/", "\\", $TMP_PATH."\\data".$thisRelPath);
			echo "Copy: ".$toCopy."\n";
			echo "To: ".$dest."\n";
			if (!is_file($toCopy)) echo "Can not find $toCopy\n";
			mkdir(dirname($dest), 777, true);
			copy($toCopy, $dest);
		}
	}
	

	echo "\r\n";
	echo "Fetching content of : $TMP_PATH \r\n";
	$resultList = get_folder_content($TMP_PATH);
	print_r($resultList);
	echo "\r\n";
	
	echo "Fetching data from files\r\n";
	foreach ($resultList['files'] as $path) {
		echo "handling : $path\r\n";
		$newDest = substr($path, strlen($TMP_PATH));
		echo "generating array from sheet...\r\n";
		$origData = getArrayFromSheet($path);
		//echo "data is : \r\n";
		//print_r($origData);
		//echo "\n";
		$translation = array();
		
		foreach ($origData['data'] as $sheetId => $sheet) {
			$translation[$sheetId] = array();
			for ($rowId=0; $rowId<count($sheet); $rowId++){
				for ($colId=0; $colId<count($sheet[$rowId]); $colId++){
					$cellTranslation = getTranslation($sheet[$rowId][$colId]);
					if (empty($cellTranslation)) continue;

					$targetColId = $colId;
					$obj = array(
						'translation'=> $cellTranslation,
						'row' => $rowId,
						'col' => $targetColId
					);
					if ($_POST["options"]["fetchType"] == "custom") {
						$translation[$sheetId] = array_merge($translation[$sheetId], generateCustomTransTable($obj));

					} else {
						$translation[$sheetId][] = $obj;
					}
					
				}
			}
		}
		//echo "\r\nTranslation is : \r\n";
		//print_r($translation);
		
		//echo "Translating sheet : $path\r\n";

		$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
		echo "Ext is:".$ext."\n";
		if ($ext == "csv" && $_POST['options']['csvExcel']) {
			echo "Generating CSV in csvExcel\n";
			$translatedData = applyTranslationToArray($origData, $translation);
			$csv = SW_ImplodeCSV($translatedData['data'][0], false, 'EXCEL', '2D_NUMBERED_ARRAY');
			file_put_contents($path, $csv);
			continue;
		}
	

		$spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
		$sheetType = \PhpOffice\PhpSpreadsheet\IOFactory::identify($path);
		echo "file identity : $sheetType\r\n";
		$sheets = $spreadsheet->getAllSheets();
		foreach ($sheets as $sheetIndex => $thisSheet) {
			if (empty($translation[$sheetIndex])) continue;
			foreach ($translation[$sheetIndex] as $key=>$thisTrans) {
				$thisSheet->setCellValue([$thisTrans['col']+1, $thisTrans['row']+1], $thisTrans['translation']);
			}
		}
		echo "Writing sheet : $path\r\n";
		$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, $sheetType);
		$writer->save( $path );		
		
		
	}

	copy_tree($TMP_PATH."\\data", $destination);
	
	
	
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

		
		exportToDir($GAME_FOLDER, $TMP_PATH."_tozip", $selectedFile);
		createZip($TMP_PATH."_tozip", $destination);	
		echo "Cleaning up cache\n";
		passthru("RMDIR ".escape_win32_argv($TMP_PATH."_tozip")." /S /Q");
		
	} else {
		exportToDir($GAME_FOLDER, $destination, $selectedFile);
		
	}
	
}