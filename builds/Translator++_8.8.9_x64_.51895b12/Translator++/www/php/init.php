<?php
// debug mode, set true or 1 if you wish to run in debug mode
error_reporting(E_ERROR | E_WARNING | E_PARSE );


define("_DEBUG",1);
define("_SERVER_NAME","localhost");
define("_ROOT_PATH",$_SERVER['SERVER_ROOT']."/www/php/");
define("_WEB_PATH","http://"._SERVER_NAME."/trans/");
define("_TEMPLATE_PATH",_ROOT_PATH."template/");
define("_CACHE_PATH",_ROOT_PATH."cache/");

// resource path, web path to web element such as image, external css, javascript etc
define("_RESOURCE_PATH",_WEB_PATH."template/resource/");

// all uploaded files
define("_STORAGE_PATH",_ROOT_PATH."files/");
define("_FORMS_PATH",_ROOT_PATH."form/");
define("_STORAGE_WEB_PATH",_WEB_PATH."files/");


// temporary path, for extracting archives
define("_TEMP_PATH",_STORAGE_PATH."temp/");
define("_MAX_STORAGE", 5);
// salt
define("_SEED","klahf89qpwr"); 

// maximum path depth (delimited by ".")
define ("_MAX_PATH_DEPTH", 20);

// Cookie prefix
define("_COOKIE_PREFIX", "rcs_");

define ("_DB_TYPE", "");



// encode password
define("_ENCODE_PASS", true);


$_PARAM = array();
if (is_file("trans.json")) {
	$_RMMV = json_decode(file_get_contents("trans.json"), 1);
	if (is_array($_RMMV)) {
		$_PARAM = array_merge($_PARAM, $_RMMV);
	}
}
if (is_array($_GET)) {
	$_PARAM = array_merge($_PARAM, $_GET);
}
if (is_array($_POST)) {
	$_PARAM = array_merge($_PARAM, $_POST);
}

// include blank map on generated json (trans) data?
$_PARAM['INCLUDES_BLANK_MAP'] = 1;


$_PARAM['SERVER_NAME'] = _WEB_PATH;
$_PARAM['ALLOWED_EXTENSION'] = "gif|jpg|jpeg|png|doc|docx|xls|xlsx|txt|pdf|rar|zip|7z|csv|log|ai|psd|svg|cdr|htm|html|xml|ppt|pptx|ods|odt|wps|et|js|css";
$_PARAM['UPLOAD_MAX_SIZE'] = 2; // on MB
$_PARAM['HTML_BODY_FRAGMENT'] = "background='"._RESOURCE_PATH."trans.gif' ";
$_PARAM['RESOURCE_PATH'] = _RESOURCE_PATH ;
$_PARAM['WEB_PATH'] = _WEB_PATH ;
$_PARAM['THUMB_MAX_WIDTH'] = 120;
$_PARAM['THUMB_MAX_HEIGHT'] = 160;
$_PARAM['STORAGE_WEB_PATH'] = _STORAGE_WEB_PATH;


$_PARAM['VERSION'] = "0.9";


if (!empty($_SERVER['TARGET'])) {
	$_PARAM['TARGET'] = $_SERVER['TARGET'];
	$_PARAM['TARGET_INFO'] = pathinfo($_SERVER['TARGET']);
}



$_PARAM['CWD'] = substr(__FILE__ , 0, strrpos(__FILE__, DIRECTORY_SEPARATOR));
chdir($_PARAM['CWD']);
$_PARAM['RPGMTRANS'] 	= $_SERVER['APPLICATION_ROOT']."\\3rdParty\\rpgmt_cli_v4.5\\rpgmt.exe";
$_PARAM['RUBY_BIN'] 	= $_SERVER['APPLICATION_ROOT']."\\ruby\\bin\\ruby.exe";

$_PARAM['APP_PATH'] 	= $_SERVER['SERVER_ROOT']."\\";

$_SERVER['STAGING_PATH'] = "data/staging";

if (is_file($_SERVER['SERVER_ROOT']."\\package.json")) {
	$_PARAM['MANIFEST'] = json_decode(file_get_contents($_SERVER['SERVER_ROOT']."\\package.json"),1);
	$_PARAM['RUBY_BIN'] = $_SERVER['SERVER_ROOT']."\\".$_PARAM['MANIFEST']['localConfig']['ruby'];
	if (!empty($_PARAM['MANIFEST']['localConfig']['defaultStagingPath'])) $_SERVER['STAGING_PATH'] = $_PARAM['MANIFEST']['localConfig']['defaultStagingPath'];
}

if (is_file($_SERVER['SERVER_ROOT']."\\data\\config.json")) {
	$_PARAM['CONFIG'] = json_decode(file_get_contents($_SERVER['SERVER_ROOT']."\\data\\config.json"),1);
	if (!empty($_PARAM['CONFIG']['stagingPath'])) $_SERVER['STAGING_PATH'] = $_PARAM['CONFIG']['stagingPath'];

}
if (!empty(realpath($_SERVER['STAGING_PATH']))) {
	$_SERVER['STAGING_PATH'] = realpath($_SERVER['STAGING_PATH']);
} else if (!empty(realpath($_SERVER['SERVER_ROOT']."\\".$_SERVER['STAGING_PATH']))) {
	$_SERVER['STAGING_PATH'] = realpath($_SERVER['SERVER_ROOT']."\\".$_SERVER['STAGING_PATH']);
}
$_SERVER['STAGING_PATH'] 	= $_SERVER['STAGING_PATH']."\\";
$_PARAM['CACHE_PATH'] 		= $_SERVER['STAGING_PATH'];

?>