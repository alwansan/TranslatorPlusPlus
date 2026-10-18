<?php
//include_once("moduleLoader.php");
include_once("header.php");
include_once("./plugins/rmmv/loader.php");
print_r($_POST);
echo "hallo!";
extractEnigma($_POST['from'], $_POST['to']);