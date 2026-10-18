<?php

$_POST["options"]["model"]["columnPairs"] = [];
$_POST["options"]["model"]["columnPairs"][0]["source"] = 2;
$_POST["options"]["model"]["columnPairs"][0]["target"] = 3;


function processCustomData($tableData) {
    /*
        $tableData["data"] is array of row (the row of the sheet)

        $_POST["options"]["model"]["columnPairs"][0]["source"] = 2;
        $_POST["options"]["model"]["columnPairs"][0]["target"] = 3;
    */
	$result = [];
    $result["data"] = [];

	if (empty($tableData["data"])) return $result;
    if (!is_array($_POST["options"]["model"]["columnPairs"])) return $result;


    foreach ($tableData["data"] as $rowId => $row) {
        if (empty($row)) continue;
        foreach ($_POST["options"]["model"]["columnPairs"] as $id => $columnPair) {
            if (empty($row[$columnPair["source"]])) continue;
            $thisRow = [];
            $thisRow[0] = $row[$columnPair["source"]];
            $thisRow[1] = $row[$columnPair["target"]];
            $result["data"][] = $thisRow;
        }
    }


    return $result;
}

$rows = [ "data" =>
    [["Idolchr_0101_B_20_01_001(0)",
    "Ｐ",
    "今日は春香と繁華街に、
    事務所の備品を買い出しに行くことになった）",
    null],
    ["Idolchr_0101_B_20_01_002(0)",
    "春香",
    "そういえば、プロデューサーさんが海外にいた時は、
    こうして街でお買い物に行ったりしてたんですか？",
    null]]
]
;

echo "test";
print_r(processCustomData($rows));