<?php
include("www/php/init.php");
$THISPATH = pathinfo(__FILE__);
require _ROOT_PATH.'vendor/autoload.php';
/*
    input :
    file:the xlsFile,
    patch:the path to patch file,
    newFile:target newXlsPath
*/

function translateSheet($path, $patchData, $newFile) {
    echo "Translating sheet : $path\r\n";
    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
    $sheetType = \PhpOffice\PhpSpreadsheet\IOFactory::identify($path);
    echo "file identity : $sheetType\r\n";
    $sheets = $spreadsheet->getAllSheets();
    foreach ($sheets as $sheetIndex => $thisSheet) {
        echo "Handling sheet index $sheetIndex \r\n";

        $sheetName = $thisSheet->getTitle();
        echo "Sheet name: $sheetName \r\n";
        $patchSection = $patchData[$sheetName];
        //echo "Patch for this sheet: \r\n";
        //print_r($patchSection);
        if (empty($patchSection)) continue;
        foreach ($patchSection as $key=>$thisTrans) {
            if (empty($thisTrans)) continue;
            //echo "Writing cell $sheetName @ $thisTrans[row],$thisTrans[col] \r\n";
            //$thisSheet->setCellValueByColumnAndRow($thisTrans['col']+1, $thisTrans['row']+1, $thisTrans['translation']);
            $thisSheet->setCellValue([$thisTrans['col']+1, $thisTrans['row']+1], $thisTrans['translation']);
        }
    }
    echo "Writing sheet : $path\r\n";
    $writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, $sheetType);
    $writer->save($newFile);		
}

$patchFile = file_get_contents($_POST['patch']);
$patchData = json_decode($patchFile, true);
translateSheet($_POST['file'], $patchData, $_POST['newFile']);		
		