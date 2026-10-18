<?php
if (!is_file($_POST['file'])) die("null");
$hash = hash_file('crc32b', $_POST['file']);

echo json_encode($hash);