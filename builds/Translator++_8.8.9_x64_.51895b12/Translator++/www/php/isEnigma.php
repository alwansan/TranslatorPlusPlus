<?php
// detect whether $_GET['path'] is enigma or not
include_once("header.php");

$result = array();
$result['input'] = $_GET;
$result['result'] = is_enigma($_GET['path']);
echo json_encode($result);