<?php
// Returning all project with same title with $_POST['gameTitle'];
// returning a JSON array 
$_GET['gameFolder'] = "F:\\Games\\Kozue's strange journey-edit2";
include_once("moduleLoader.php");

echo "game info.php";
$gameInfo = getGameInfo($_GET['gameFolder']);
print_r($_GET);
print_r($gameInfo);