<?php
$THISPATH = pathinfo(__FILE__);
require _ROOT_PATH.'vendor/autoload.php';

include($THISPATH['dirname']."/extractor.php");
include($THISPATH['dirname']."/applier.php");
include($THISPATH['dirname']."/csv.php");

/*
$_POST['options']['fetchMode'] = "all"||"normal";

*/

// ====================================================
// Mandatory template
// ====================================================
// registering allowed extension to be processed
if (!isset($_PARAM['ACCEPTED_EXTENSION'])) $_PARAM['ACCEPTED_EXTENSION'] = [];
array_push($_PARAM['ACCEPTED_EXTENSION'], "xls", "xlsx", "xml", "html", "ods", "csv", "slk", "gnumerik" );

function getGameInfo($folderPath) {
	print_r($folderPath);
	$baseName = baseName($folderPath);
	$RESULT['Title'] = $baseName;
	return $RESULT;
}

function getProjectId($gamePath="", $projectId="") {
	global $_PARAM;
	$gameInfo = getGameInfo($gamePath);
	if (!empty($projectId)) {
		$id = $projectId;
	} elseif (!empty($_SERVER['POST']['projectId'])) {
		$id = $_SERVER['POST']['projectId'];
	} elseif (!empty($_POST['projectId'])) {
		$id = $_POST['projectId'];
	} elseif (!empty($_PARAM['projectId'])) {
		$id = $_PARAM['projectId'];
	} else {
		$id = md5(time());
	}
	$_PARAM['projectId'] = $id;
	$_SERVER['POST']['projectId'] = $id;
	$_SERVER['GET']['projectId'] = $id;
	$_POST['projectId'] = $id;
	$_GET['projectId'] = $id;
	return $id;
}
function getProjectCacheInfo($gamePath="") {
	global $_PARAM;
	$dirname = getProjectId($gamePath);
	$RESULT['cacheID'] = $dirname;
	$RESULT['cachePath'] = $_PARAM['CACHE_PATH'].$dirname;
	
	return $RESULT;
}

function prepareProjectCache($gamePath) {
	global $_PARAM;
	$gameInfo = getGameInfo($gamePath);
	
	clearstatcache(true);

	$cacheInfo = getProjectCacheInfo($gamePath);
	
	if (!is_dir($cacheInfo['cachePath'])) {
		echo "creating dir : ".$cacheInfo['cachePath']."\n";
		mkdir($cacheInfo['cachePath']);
	}
	file_put_contents($cacheInfo['cachePath']."//gameInfo.json", json_encode($gameInfo, JSON_PRETTY_PRINT));
	print_r($cacheInfo);
	return $cacheInfo['cachePath'];
	
}


function processCustomData($tableData, $baseContext=[]) {
    /*
        $tableData["data"] is array of row (the row of the sheet)

        $_POST["options"]["model"]["columnPairs"][0]["source"] = 2;
        $_POST["options"]["model"]["columnPairs"][0]["target"] = 3;
    */
	$result = [];
    $result["data"] = [];
	$result["context"] = [];
	$rowOffset = intval($_POST['options']['skipHeader']);

	$index = [];
	
	if (empty($tableData["data"])) return $result;
    if (!is_array($_POST["options"]["model"]["columnPairs"])) return $result;

	
    foreach ($tableData["data"] as $rowId => $row) {
        if (empty($row)) continue;
        foreach ($_POST["options"]["model"]["columnPairs"] as $id => $columnPair) {
            if (empty($row[$columnPair["source"]])) continue;
			$keyText = $row[$columnPair["source"]];
			$thisContext = implode("/", array_merge($baseContext, ["row", $rowId+$rowOffset]));

			if (!isset($index[$keyText])) {
				$thisRow = [];
				$thisRow[0] = $row[$columnPair["source"]];
				$thisRow[1] = $row[$columnPair["target"]];
				$result["data"][] = $thisRow;
				$index[$keyText] = count($result["data"])-1;
			} 

			$result["context"][$index[$keyText]][] = $thisContext;

			
			if (isset($_POST['options']['model']['rowHeaderTextColumn'])) {
				$thisParam = [];
				$thisParam["rowInfoText"] = $row[$_POST['options']['model']['rowHeaderTextColumn']];
				$result["parameters"][$index[$keyText]][] = $thisParam;
			}


        }
    }


    return $result;
}

function loader($path) {
// convert file into array of data
/*
Array format as follow :
$RESULT['data']
	Array: two dimensional array of data
	
$RESULT['type']
$RESULT['context']
	Array: array of row context
	
$RESULT['lineBreak']
	String : line break. Either \n or \r\n

$RESULT['parameters']
	Array : parameters of the data. All misc value goes here.
	
$RESULT['header']
	String : header describing the original format

*/
	$RESULT = Array();

	echo "loading data from $path\r\n";
	$SHEETDATA = getArrayFromSheet($path, true);

	if (empty($SHEETDATA)) return $RESULT;

	// remove header
	if (isset($_POST['options']['skipHeader'])) {
		// split but preserve the key
		$SHEETDATA["data"] = array_slice($SHEETDATA["data"], $_POST['options']['skipHeader'], null, true);
	}

	

	if ($_POST['options']['fetchType'] == 'all') {
		echo "All type parser";
		$newResult = Array();
		foreach ($SHEETDATA['data'] as $row) {
			foreach ($row as $cell) {
				if (empty($cell)) continue;
				if (!is_string($cell)) continue;
				$newResult[] = array($cell, null);
			}
		}
		$RESULT['data'] = $newResult;
	} else if ($_POST['options']['fetchType'] == 'custom') {
		echo "Custom table parser";
		$newResult = processCustomData($SHEETDATA, [basename($path)]);
		$RESULT['data'] = $newResult['data'];
		$RESULT['context'] = $newResult['context'];
		$RESULT['parameters'] = $newResult['parameters'];
	} else {
		echo "Normal type parser";
		$RESULT['data'] = $SHEETDATA['data'];
	}
	

	//print_r($RESULT);
	return $RESULT;

}

// ====================================================
// End of Mandatory template
// ====================================================


// handling EXCEL style csv
function SW_ExplodeCSV($csv, $headerrow=true, $mode='EXCEL', $fmt='2D_FIELDNAME_ARRAY') { 
	// SW_ExplodeCSV - parses CSV into 2D array(MS Excel .CSV supported)
	// AUTHOR: tgearin2@gmail.com
	// RELEASED: 9/21/13 BETA
	//SWMessage("SW_ExplodeCSV() - CALLED HERE -");
	$rows=array(); $row=array(); $fields=array();// rows = array of arrays
	
	//escape code = '\'
	$escapes=array('\r', '\n', '\t', '\\', '\"');  //two byte escape codes
	$escapes2=array("\r", "\n", "\t", "\\", "\""); //actual code
	
	if($mode=='EXCEL')
	{// escape code = ""
		$delim=','; $enclos='"'; $esc_enclos='""'; $rowbr="\r\n";
	}
	else //mode=STANDARD 
	{// all fields enclosed
		$delim=','; $enclos='"'; $rowbr="\r\n";
	}
	
	$indxf=0; $indxl=0; $encindxf=0; $encindxl=0; $enc=0; $enc1=0; $enc2=0; $brk1=0; $rowindxf=0; $rowindxl=0; $encflg=0;
	$rowcnt=0; $colcnt=0; $rowflg=0; $colflg=0; $cell="";
	$headerflg=0; $quotedflg=0;
	$i=0; $i2=0; $imax=strlen($csv);   
	
	while($indxf < $imax)
		{
		//find first *possible* cell delimiters
		$indxl=strpos($csv, $delim, $indxf);  if($indxl===false) { $indxl=$imax; }
		$encindxf=strpos($csv, $enclos, $indxf); if($encindxf===false) { $encindxf=$imax; }//first open quote
		$rowindxl=strpos($csv, $rowbr, $indxf); if($rowindxl===false) { $rowindxl=$imax; }
	
		if(($encindxf>$indxl)||($encindxf>$rowindxl))
		{ $quoteflg=0; $encindxf=$imax; $encindxl=$imax;
			if($rowindxl<$indxl) { $indxl=$rowindxl; $rowflg=1; }
		}
		else 
		{ //find cell enclosure area (and real cell delimiter)
			$quoteflg=1;
			$enc=$encindxf; 
			while($enc<$indxl) //$enc = next open quote
			{// loop till unquoted delim. is found
				$enc=strpos($csv, $enclos, $enc+1); if($enc===false) { $enc=$imax; }//close quote
				$encindxl=$enc; //last close quote
				$indxl=strpos($csv, $delim, $enc+1); if($indxl===false)  { $indxl=$imax; }//last delim.
				$enc=strpos($csv, $enclos, $enc+1); if($enc===false) { $enc=$imax; }//open quote
				if(($indxl==$imax)||($enc==$imax)) break;
			}
			$rowindxl=strpos($csv, $rowbr, $enc+1); if($rowindxl===false) { $rowindxl=$imax; }
			if($rowindxl<$indxl) { $indxl=$rowindxl; $rowflg=1; }
		}
	
		if($quoteflg==0)
		{ //no enclosured content - take as is
			$colflg=1;
			//get cell 
			// $cell=substr($csv, $indxf, ($indxl-$indxf)-1);
			$cell=substr($csv, $indxf, ($indxl-$indxf));
		}
		else// if($rowindxl > $encindxf)
		{ // cell enclosed
			$colflg=1;
	
			//get cell - decode cell content
			$cell=substr($csv, $encindxf+1, ($encindxl-$encindxf)-1);
	
			if($mode=='EXCEL') //remove EXCEL 2quote escapes
			{ $cell=str_replace($esc_enclos, $enclos, $cell);
			}
			else //remove STANDARD esc. sceme
			{ $cell=str_replace($escapes, $escapes2, $cell);
			}
		}
	
		if($colflg)
		{// read cell into array
			if( ($fmt=='2D_FIELDNAME_ARRAY') && ($headerflg==1) )
			{ $row[$fields[$colcnt]]=$cell; }
			else if(($fmt=='2D_NUMBERED_ARRAY')||($headerflg==0))
			{ $row[$colcnt]=$cell; } //$rows[$rowcnt][$colcnt] = $cell;
	
			$colcnt++; $colflg=0; $cell="";
			$indxf=$indxl+1;//strlen($delim);
		}
		if($rowflg)
		{// read row into big array
			if(($headerrow) && ($headerflg==0))
			{  $fields=$row;
				$row=array();
				$headerflg=1;
			}
			else
			{ $rows[$rowcnt]=$row;
				$row=array();
				$rowcnt++; 
			}
			$colcnt=0; $rowflg=0; $cell="";
			$rowindxf=$rowindxl+2;//strlen($rowbr);
			$indxf=$rowindxf;
		}
	
		$i++;
		//SWMessage("SW_ExplodeCSV() - colcnt = ".$colcnt."   rowcnt = ".$rowcnt."   indxf = ".$indxf."   indxl = ".$indxl."   rowindxf = ".$rowindxf);
		//if($i>20) break;
		}
	
		return $rows;
}


function getArrayFromSheet($filePath, $merged = false) {
	/*
		$merged:
			false : each sheet will be put on different array
			true : each sheet will be merged on an array
	
	*/
	/** Load $filePath to a Spreadsheet Object  **/
	$result = array();
	$result['data'] = array();
	$result['context'] = array();

	echo "filePath:$filePath\n";
	$ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
	echo "Ext is:".$ext."\n";
	if ($ext == "csv" && $_POST['options']['csvExcel']) {
		echo "Parsing CSV in csvExcel\n";
		if ($merged) {
			//$result['data'] = SW_ExplodeCSV(file_get_contents($filePath), false, 'EXCEL', '2D_NUMBERED_ARRAY');
			//$result['data'] = csvToArrayChunk($filePath);
			$result['data'] = csvToArrayStream($filePath);
		} else {
			$result['data'] = [];
			//$result['data'][0] = SW_ExplodeCSV(file_get_contents($filePath), false, 'EXCEL', '2D_NUMBERED_ARRAY');
			//$result['data'][0] = csvToArrayChunk($filePath);
			$result['data'][0] = csvToArrayStream($filePath);
		}
		return $result;
	}
	
	if (isset($_POST['options']['calcValue']) == false) {
		$calcValue = false;
	} else {
		$calcValue = $_POST['options']['calcValue'];
	}
	
	if (isset($_POST['options']['calcFormat']) == false) {
		$calcFormat = false;
	} else {
		$calcFormat = $_POST['options']['calcFormat'];
	}
	
	echo "calcValue: ";
	var_dump($calcValue);
	echo "\n";
	echo "calcFormat: ";
	var_dump($calcFormat);
	echo "\n";

	echo "Loading file ".$filePath;
	$spreadsheet = null;
	try {
		$spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
	} catch (Exception $e) {
		echo "Unable to parse ".$filePath." because phpSpreadsheed throws an error:\n";
		echo $e;
		return null;
	}
	$sheets = $spreadsheet->getAllSheets();

	
	if ($merged == false) {
		foreach ($sheets as $escape_win32_argv => $thisSheet) {
			$sheetData = $thisSheet->toArray(null, $calcValue, $calcFormat, false);
			//$thisTitle = $thisSheet->getTitle(); // worksheet title
			
			$result['data'][$escape_win32_argv] = $sheetData;
		}
		return $result;
	} else {
		foreach ($sheets as $escape_win32_argv => $thisSheet) {
			$sheetData = $thisSheet->toArray(null, $calcValue, $calcFormat, false);
			$result['data'] = array_merge($result['data'], $sheetData);
		}
		return $result;
	}
}
