<?php
include("init.php");
echo json_encode($_SERVER, JSON_PRETTY_PRINT);
phpinfo();