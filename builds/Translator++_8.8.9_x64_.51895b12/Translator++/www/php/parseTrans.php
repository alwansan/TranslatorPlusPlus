<?php
include("header.php");
/*
Parse trans file into array
$_POST['path'] = path to file
*/
/*
$_POST['path'] = 'F:\Games\Japanese\水晶物語外伝_覚醒\水晶物語外伝 V1.4_patch\patch\Armors.txt';
$_POST['prettyPrint'] = true;
*/
if (is_file($_POST['path'])) {
	$result = parseRPGTransFile($_POST['path']);

	if ($_POST['prettyPrint']) {
		echo json_encode($result, JSON_PRETTY_PRINT);
	} else {
		echo json_encode($result);
	}
}