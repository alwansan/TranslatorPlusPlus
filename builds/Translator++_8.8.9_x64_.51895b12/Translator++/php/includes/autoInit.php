<?php
if (!empty($_SERVER['argv'][1])) {
	if (isset($_SERVER['argv'][2]) && $_SERVER['argv'][2] == "confpath") {
		if (is_file($_SERVER['argv'][1])) {
			$_SERVER['GET'] = $_SERVER['POST'] = $_GET = $_POST = json_decode(file_get_contents($_SERVER['argv'][1]), true);
		} else {
			$_SERVER["ERROR"] = "Can not find configuration file ".$_SERVER['argv'][1] ;
		}
	} elseif (isset($_SERVER['argv'][2]) && $_SERVER['argv'][2] == "url") {
		$_SERVER['GET'] = $_SERVER['POST'] = $_GET = $_POST = json_decode( rawurldecode(base64_decode($_SERVER['argv'][1])),1);
		
	} else {
		$_SERVER['GET'] = $_SERVER['POST'] = $_GET = $_POST = json_decode( base64_decode($_SERVER['argv'][1]),1);
		
	}
	
}
$_SERVER['APPLICATION_ROOT'] = $_SERVER['SERVER_ROOT'] = realpath("./");
$_SERVER['DOCUMENT_ROOT'] = $_SERVER['SERVER_ROOT'] = realpath("./");
