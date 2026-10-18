<?php
/*
	process the $_POST['targetPath']
	$_POST['transPath']
	
*/
include_once("header.php");
set_time_limit(0);
$RESULT = array();
if (!is_dir(_CACHE_PATH)) {
	mkdir(_CACHE_PATH, 777, true);
}


if (!empty($_POST['gameFolder'])) $_GET['gameFolder'] = $_POST['gameFolder'];

if (!is_dir($_GET['gameFolder']) && empty($_POST['projectId'])) {
	die();
}
if (empty($_POST['mode'])) {
	
}


if (empty($_POST['indexOriginal'])) {
	$_POST['indexOriginal'] = 0;
}
if (empty($_POST['indexTranslation'])) {
	$_POST['indexTranslation'] = 1;
}
echo "Parameters : \r\n";
print_r($_POST);

$RESULT['indexOriginal'] = $_POST['indexOriginal'];
$RESULT['indexTranslation'] = $_POST['indexTranslation'];

$_PARAM['skipElement'] = array();
if (!empty($_POST['skipElement'])) {
	$_PARAM['skipElement'] = $_POST['skipElement'];
	if (!is_array($_PARAM['skipElement'])) $_PARAM['skipElement'] = array();
}
$_PARAM['ACCEPTED_EXTENSION'] = array("json", "txt", "csv");

$RESULT['skipElement'] = $_PARAM['skipElement'];

// ==================================================
// DETECTING GAME ENGINE
// ==================================================
if (empty($_POST['gameEngine'])) {
	$_POST['gameEngine'] = detectGameEngine($_GET['gameFolder'], $_POST['selectedFile']);
}
echo "Detected engine: {$_POST['gameEngine']}\n";

if (empty($_POST['gameEngine']) OR $_POST['gameEngine'] == 'default') {
	fwrite(STDERR, "Error: Unsupported format / engine!\n");
	fwrite(STDERR, "Project folder : $_GET[gameFolder]\n");
	fwrite(STDERR, "Incoming data :\n");
	fwrite(STDERR, json_encode($_POST, JSON_PRETTY_PRINT)."\n");

	die();
}

$RPG_MAKER_TRANS=array("rmxp", "rmvx", "rmvxace");
//if (!empty($_POST['rpgTransFormat']) && in_array($_POST['gameEngine'], $RPG_MAKER_TRANS)) {
// assume everything inside $RPG_MAKER_TRANS will be handled with rpgMakerTrans
if (in_array($_POST['gameEngine'], $RPG_MAKER_TRANS)) {
	include_once("./plugins/rpgmakertrans/loader.php");
} else if (is_file("./plugins/".$_POST['gameEngine']."/loader.php")) {
	include_once("./plugins/".$_POST['gameEngine']."/loader.php");
}