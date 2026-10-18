<?php
$THISPATH = pathinfo(__FILE__);
include($THISPATH['dirname']."/extractor.php");
include($THISPATH['dirname']."/applier.php");
include($THISPATH['dirname']."/utility.php");

$_PARAM['ACCEPTED_EXTENSION'][] = "json";
$_PARAM['WOLF_KEY'] = array("76 217 42 183 40 155 172 7 62 119 236 76", "56 80 64 40 114 79 33 112 59 115 53 56");
$_PARAM['DX_EXTRACTOR'] = $_PARAM['APP_PATH']."3rdParty\\DXExtract\\DXExtract.exe";
$_PARAM['WOLFDEC_PATH'] = $_PARAM['APP_PATH']."3rdParty\\wolfDec\\WolfDec.exe";
$_PARAM['DX_DECODEDEC'] = $_PARAM['APP_PATH']."3rdParty\\dxadecodedec\\DxaDecodeDEC.exe";
$_PARAM['WOLFTRANS_PATH'] = $_PARAM['APP_PATH']."3rdParty\\wolftrans-0.2.1\\bin\\wolftrans";
$_PARAM['APP_PATH'] = substr(__FILE__ , 0, strrpos(__FILE__, "www".DIRECTORY_SEPARATOR));
//$_PARAM['CACHE_PATH'] = $_PARAM['APP_PATH']."www\\php\\cache\\";

$_SERVER['WOLF_INFO'] = Array();
$_SERVER['WOLF_EXTRACTION_METHOD'] = "wolfDec";


function loader($path) {
// mandatory function
	$content = file_get_contents($path);
	return parseRPGTransFile($content);
}