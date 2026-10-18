<?php
if (!$_POST['file']) die("Error: No file specified");
if (!$_POST['patch']) die ("Error: No patch file specified");
if (!is_file($_POST['file'])) die ("Error: File not found : $_POST[file]");
if (!is_file($_POST['patch'])) die ("Error: File not found : $_POST[patch]");

$patch = json_decode(file_get_contents($_POST['patch']), true);

if (empty($patch)) die("Error: Translation is empty");
if (!is_array($patch)) die("Error: Invalid translation type, Translation should be an array");

$path = $_POST['file'];

include("www/php/init.php");
require _ROOT_PATH.'vendor/autoload.php';


$spreadsheet    = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
$sheetType      = \PhpOffice\PhpSpreadsheet\IOFactory::identify($path);
$sheets         = $spreadsheet->getAllSheets();
echo "file identity : $sheetType\r\n";

foreach ($sheets as $sheetIndex => $thisSheet) {
    $thisTitle = $thisSheet->getTitle(); // worksheet title
    echo "Handling sheet : $thisTitle\r\n";
    if (empty($patch[$thisTitle])) continue;
    foreach ($patch[$thisTitle] as $key=>$thisPatch) {
        //echo "Replacing cell with value : ".$thisSheet->getCellValue($thisPatch['col']+1,  $thisPatch['row']+1)->getValue()."\r\n";
        //$thisSheet->setCellValueByColumnAndRow($thisPatch['col']+1, $thisPatch['row']+1, $thisPatch['translation']);
        $thisSheet->setCellValue([$thisPatch['col']+1, $thisPatch['row']+1], $thisPatch['translation']);
    }
    //$sheetData = $thisSheet->toArray(null, $calcValue, $calcFormat, false);
}
echo "Writing sheet : $path ...";
$writer = \PhpOffice\PhpSpreadsheet\IOFactory::createWriter($spreadsheet, $sheetType);
$writer->save($path);

echo "Done!\r\n";