<?php
include("init.php");

$_POST['path'] = 'F:\test\kirikiri\amakanExport\data\flash2.ks';

$content = file_get_contents($_POST['path']);
$content = mb_convert_encoding($content, "UTF-16", "SJIS-win");

file_put_contents($_POST['path'], $content);

echo "done";