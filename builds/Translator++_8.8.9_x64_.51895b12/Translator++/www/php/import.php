<?php
require __DIR__ . '/vendor/autoload.php';
include 'function/function_set.php';

if (empty($_POST)) {
	$_POST['path'] = ''; //source path
	$_POST['output'] = ''; //default are directly json output
	$_POST['mergeSheet'] = true;
	$_POST['prettyPrint'] = true;
}

function getArrayFromSheet($filePath, $merged = false) {
	/*
		$merged:
			true : each sheet will be put on different array
			false : each sheet will be merged on an array
	
	*/
	/** Load $filePath to a Spreadsheet Object  **/
	
	$spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);

	$sheets = $spreadsheet->getAllSheets();

	$result = array();
	
	if ($merged == false) {
		foreach ($sheets as $sheetIndex => $thisSheet) {
			$sheetData = $thisSheet->toArray(null, true, true, false);
			$result[] = $sheetData;
		}
		return $result;
	} else {
		foreach ($sheets as $sheetIndex => $thisSheet) {
			$sheetData = $thisSheet->toArray(null, true, true, false);
			$result = array_merge($result, $sheetData);
		}
		return $result;
	}
}



if (is_dir($_POST['path'])) {
	$dirContent = get_folder_content($_POST['path']);

	foreach ($dirContent['files'] as $file) {
		$result = getArrayFromSheet($file, $_POST['mergeSheet']);
		
		if ($_POST['prettyPrint']) {
			echo json_encode($result, JSON_PRETTY_PRINT);
		} else {
			echo json_encode($result);
		}
	}

} else if (is_file($_POST['path'])) {
	$result = getArrayFromSheet($_POST['path'], $_POST['mergeSheet']);
		if ($_POST['prettyPrint']) {
			echo json_encode($result, JSON_PRETTY_PRINT);
		} else {
			echo json_encode($result);
		}
}