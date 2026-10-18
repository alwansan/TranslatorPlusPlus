<?php
$THISPATH = pathinfo(__FILE__);
include($THISPATH['dirname']."/loader.php");

$GAME_FOLDER = "F:\\test\\AtelierLizbel1.02";
$cacheInfo = getProjectCacheInfo($GAME_FOLDER);
//apply($cacheInfo['cachePath']);
print_r($_GET);
createZip($cacheInfo['cachePath'], $_GET['path']);