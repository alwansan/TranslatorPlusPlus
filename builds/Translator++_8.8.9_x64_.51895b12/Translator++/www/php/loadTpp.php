<?php
include("header.php");
echo "Incoming data : \r\n";
print_r($_POST);
function fetchProjectId($projectId="") {
	global $_PARAM;

	if (!empty($projectId)) {
		$id = $projectId;
	} elseif (!empty($_SERVER['POST']['projectId'])) {
		$id = $_SERVER['POST']['projectId'];
	} elseif (!empty($_POST['projectId'])) {
		$id = $_POST['projectId'];
	} elseif (!empty($_PARAM['projectId'])) {
		$id = $_PARAM['projectId'];
	} else {
		$id = md5(time());
	}
	$_PARAM['projectId'] = $id;
	$_SERVER['POST']['projectId'] = $id;
	$_SERVER['GET']['projectId'] = $id;
	$_POST['projectId'] = $id;
	$_GET['projectId'] = $id;
	return $id;
}



function loadTpp($zip_file_name="") {
	$zip = new ZipArchive;
	if ($zip->open($zip_file_name) === TRUE) {
		
		//echo 'ok';
	} else {
		echo "Failed to open : $zip_file_name\r\n";
		return false;
	}
	
	// fetch header;
	$headerStr = $zip->getArchiveComment();
	
	$header = json_decode($headerStr, true);
	if (!is_array($header)) {
		echo "Invalid TPP file : missing header\r\n";
		return false;
	}
	if (!is_array($header)) {
		echo "Invalid TPP file : missing ID field\r\n";
		return false;
	}
	print_r($header);
	
	//$cachePath = str_replace("\\", "/", __DIR__."/cache/".$header['id']);
	$cachePath = str_replace("\\", "/", $_SERVER['STAGING_PATH']."\\".$header['id']);
	$cachePath = str_replace("//", "/", $cachePath);
	if (!is_dir($cachePath)) {
		if (mkdir($cachePath, 777, true) == false) {
			echo "Can not create project directory on : $cachePath\r\n";
			return false;
		}
	}
	
	echo "Generating project data : $cachePath ...";
	$zip->extractTo($cachePath);
	echo "done!\r\n";
	$zip->close();
	echo "<output class='cachepath'>".$cachePath."</output>";
	return true;
	

	
}


loadTpp($_POST["path"]);
//loadTpp('F:\test\translation2.tpp');
