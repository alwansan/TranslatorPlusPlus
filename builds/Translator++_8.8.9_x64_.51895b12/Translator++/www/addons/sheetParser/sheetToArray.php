<?php
if (!$_POST['file']) die("null");

include("www/php/init.php");
$THISPATH = pathinfo(__FILE__);
require _ROOT_PATH.'vendor/autoload.php';

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
        echo "loading data from $path\r\n";
        $RESULT = Array();
        
        $SHEETDATA = getArrayFromSheet($path, true);
        if ($_POST['options']['fetchType'] == 'all') {
            $newResult = Array();
            foreach ($SHEETDATA['data'] as $row) {
                foreach ($row as $cell) {
                    if (empty($cell)) continue;
                    if (!is_string($cell)) continue;
                    $newResult[] = array($cell, null);
                }
            }
            $RESULT['data'] = $newResult;
            
        } else {
            $RESULT['data'] = $SHEETDATA['data'];
            
        }
        
        return $RESULT;
    
    }
    
    
    
function getArrayFromSheet($filePath, $merged = false) {
    /*
        $merged:
            true : each sheet will be put on different array
            false : each sheet will be merged on an array
    
    */
    /** Load $filePath to a Spreadsheet Object  **/
    
    if (isset($_POST['options']['calcValue']) == false) {
        $calcValue = true;
    } else {
        $calcValue = $_POST['options']['calcValue'];
    }
    
    if (isset($_POST['options']['calcFormat']) == false) {
        $calcFormat = true;
    } else {
        $calcFormat = $_POST['options']['calcFormat'];
    }
    
    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);

    $sheets = $spreadsheet->getAllSheets();

    $result = array();
    
    if ($merged == false) {
        foreach ($sheets as $escape_win32_argv => $thisSheet) {
            $sheetData = $thisSheet->toArray(null, $calcValue, $calcFormat, false);
            $thisTitle = $thisSheet->getTitle(); // worksheet title
            
            $result[$thisTitle] = $sheetData;
        }
    } else {
        foreach ($sheets as $escape_win32_argv => $thisSheet) {
            $sheetData = $thisSheet->toArray(null, $calcValue, $calcFormat, false);
            $result = array_merge($result, $sheetData);
        }
    }
    return $result;
}

function getTransData($filePath) {
    $data = getArrayFromSheet($filePath);
    if (empty($data)) return;
    $files = [];

    foreach ($data as $sheetName => $sheetContent) {
        $fileData = [];
        $fileData["data"]         = [];
        $fileData["context"]      = [];
        $fileData["parameters"]   = [];
        $fileData["comments"]     = [];
        
        $wordCache = [];
        foreach($sheetContent as $rowId => $row) {
            if ($rowId == 0) continue; // skip row header
            if (empty($row[1])) continue;
            if (isset($wordCache[$row[1]])) {
                // add to context
                $id = $wordCache[$row[1]];
                if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
                $fileData["context"][$id][] = implode("/", [$sheetName, $rowId, 1, "text"]);
    
                continue;
            }

            $thisRow = [];
            // original text
            $thisRow[0] = $row[1];

            // initial text
            if (!empty($row[3])) $thisRow[1] = $row[3];
            if (!empty($row[4])) $thisRow[1] = $row[4];
            if (!empty($row[5])) $thisRow[1] = $row[5];

            // add the data
            $fileData["data"][] = $thisRow;
            $id = count($fileData["data"]) -1;

            // context for data
            if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
            $thisContext = [$sheetName, $rowId, 1, "text"];
            if (!empty($row[0])) {
                // if has character name
                $thisContext[] = "actorName[$row[0]]";
            } else {
                $thisContext[] = "actorName[]";
            }

            $fileData["context"][$id][] = implode("/", [$sheetName, $rowId, 1, "text"]);
            $contextId =  count($fileData["context"][$id]) -1;

            // parameters
            if (!empty($row[0])) {
                // only if has character name
                $fileData["parameters"][$id][$contextId] = [];
                $fileData["parameters"][$id][$contextId]["actorName"] = $row[0];
            }
            

            // note
            if (!empty($row[6])) {
                if (empty($fileData["comments"][$id])) $fileData["comments"][$id] = [];
                $fileData["comments"][$id][0] = $row[6];

            }
            // add to cache
            $wordCache[$thisRow[0]] = $id; 


            // ===========================
            // character name (at index 0)
            // ===========================
            if (empty($row[0])) continue;
            if (isset($wordCache[$row[0]])) {
                // add to context
                $id = $wordCache[$row[0]];
                if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
                $fileData["context"][$id][] = implode("/", [$sheetName, $rowId, 0, "name"]);
    
                continue;
            }

            $thisRow = [];
            // original text
            $thisRow[0] = $row[0];
            $fileData["data"][] = $thisRow;
            $id = count($fileData["data"]) -1;

            // context for data
            if (empty($fileData["context"][$id])) $fileData["context"][$id] = [];
            $fileData["context"][$id][] = implode("/", [$sheetName, $rowId, 1, "text"]);
            
            // add to cache
            $wordCache[$thisRow[0]] = $id; 

        }
        $fileData["indexIds"]   = $wordCache;
        $fileData["lineBreak"]  = "\n";
        $fileData["originalFormat"] = "SPREADSHEET";
        $fileData["extension"]  = "";
        $fileData["basename"]   = $sheetName;
        $fileData["filename"]   = $sheetName;
        $fileData["relPath"]    = $sheetName;
        $fileData["path"]       = $sheetName;
        $files[$sheetName] = $fileData;
    }
    return $files;
}

//echo json_encode(getTransData($_POST['file']));

echo json_encode(getArrayFromSheet($_POST['file']));