<?php
include("header.php");
set_time_limit(0);


// ==================================================
// DETECTING GAME ENGINE
// ==================================================
if (empty($_POST['gameEngine'])) {
	$_POST['gameEngine'] = detectGameEngine($_GET['gameFolder']);
}



$RPG_MAKER_TRANS=array("rmxp", "rmvx", "rmvxace");

if (!empty($_POST['rpgTransFormat']) && in_array($_POST['gameEngine'], $RPG_MAKER_TRANS)) {
	include("./plugins/rpgmakertrans/loader.php");
} else if (is_file("./plugins/".$_POST['gameEngine']."/loader.php")) {
	include("./plugins/".$_POST['gameEngine']."/loader.php");
}

// typeguard $_POST['gameFolder']. In the previous version, blank $_POST['gameFolder'] generates an array
if (empty($_POST['gameFolder'])) $_POST['gameFolder'] = "";

echo "Received parameters on export.php : \r\n";
print_r($_POST);

if (!empty($_POST["transPath"])) {
	$_POST['transFile'] = $_POST["transPath"];
}

if (empty($_POST['transFile'])) {
	$projectCachePath = getProjectCahePath();
	$_POST['transFile'] = $projectCachePath."\\autosave.json";
}

echo "generating from trans file : ".$_POST['transFile']."\r\n";

if ($_POST['exportMode'] == 'RPGMakerTrans') {
	echo "Exporting to RPGMakerTrans data\r\n";
	exportToRMTrans($_POST['transFile'], $_POST['path'], $_POST['files']);
	echo "Done!\r\n";
/*	
} elseif ($_POST['exportMode'] == 'csv') {
	echo "Exporting to CSV\r\n";
	$projectCachePath = getProjectCahePath();
	echo "current cache path : $projectCachePath \r\n";
	exportToCSV($projectCachePath."\\autosave.json", $_POST['path'], $_POST['files']);
	echo "Done!\r\n";
*/
} elseif ($_POST['exportMode'] == 'csv') {
	require 'vendor/autoload.php';
	echo "Exporting to CSV\r\n";
	exportToCSV2($_POST['transFile'], $_POST['path'], $_POST['files']);
	echo "Done!\r\n";
} elseif ($_POST['exportMode'] == 'xls') {
	require 'vendor/autoload.php';
	echo "Exporting to XLS format\r\n";
	exportToXls($_POST['transFile'], $_POST['path'], $_POST['files']);
	echo "Done!\r\n";	
} elseif ($_POST['exportMode'] == 'xlsx') {
	require 'vendor/autoload.php';
	echo "Exporting to XLSX format\r\n";
	exportToXlsx($_POST['transFile'], $_POST['path'], $_POST['files']);
	echo "Done!\r\n";	
} elseif ($_POST['exportMode'] == 'html') {
	require 'vendor/autoload.php';
	echo "Exporting to HTML\r\n";
	exportToHtml($_POST['transFile'], $_POST['path'], $_POST['files']);
	echo "Done!\r\n";	
} elseif ($_POST['exportMode'] == 'ods') {
	require 'vendor/autoload.php';
	echo "Exporting to ODS\r\n";
	exportToOds($_POST['transFile'], $_POST['path'], $_POST['files']);
	echo "Done!\r\n";	
} else {
	// export to dir / zip handler
	exportProject($_POST['gameFolder'], $_GET['path'], $_POST['files']);
}