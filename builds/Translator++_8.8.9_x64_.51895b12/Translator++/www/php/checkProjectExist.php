<?php
// Returning all project with same title with $_POST['gameTitle'];
// returning a JSON array 
/*
include("header.php");
if (!is_dir($_GET['gameFolder'])) {
	error("Can not open ".$_GET['gameFolder']);
	die();
}

if (empty($_POST['gameEngine'])) {
	$_POST['gameEngine'] = detectGameEngine($_GET['gameFolder']);
}

if ($_POST['gameEngine'] == "wolf") {
	echo "[]";
	die();
}


if (is_file("./plugins/".$_POST['gameEngine']."/loader.php")) {
	include("./plugins/".$_POST['gameEngine']."/loader.php");
} else {
	//error("Plugin not found for engine : ".$_POST['gameEngine']);
	//error("Failed to open required file : "."./plugins/".$_POST['gameEngine']."/loader.php");
	die("[]");
}
*/

ob_start();
include_once("moduleLoader.php");
ob_end_clean();

if (!empty($_GET['gameFolder'])) $_POST['gameFolder'] = $_GET['gameFolder'];

$gameInfo = getGameInfo($_POST['gameFolder']);


$result = checkProjectByTitle($gameInfo['title']);
echo json_encode($result);