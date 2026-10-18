<?php
include("header.php");
copy_tree($_POST['from'], $_POST['to']);