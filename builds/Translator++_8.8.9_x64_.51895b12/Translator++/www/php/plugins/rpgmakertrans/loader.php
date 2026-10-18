<?php
$THISPATH = pathinfo(__FILE__);
include($THISPATH['dirname']."/extractor.php");
include($THISPATH['dirname']."/applier.php");
include($THISPATH['dirname']."/utility.php");
$_PARAM['ACCEPTED_EXTENSION'][] = "json";

// default RMVX ACE
$_PARAM['dataArcExtension'] = "rgss3a";
$_PARAM['dataExtension'] = "rvdata2";

if ($_POST['gameEngine'] == "rmvx") {
	$_PARAM['dataArcExtension'] = "rgss2a";
	$_PARAM['dataExtension'] = "rvdata";
} else if ($_POST['gameEngine'] == "rmxp") {
	$_PARAM['dataArcExtension'] = "rgssad";
	$_PARAM['dataExtension'] = "rxdata";
}

function loader($path) {
// mandatory function
	$content = file_get_contents($path);

	return parseRPGTransFile($content);
}