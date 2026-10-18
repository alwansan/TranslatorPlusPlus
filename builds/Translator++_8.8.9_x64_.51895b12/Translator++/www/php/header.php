<?php
include_once ("init.php");

function getmicrotime() { 
   list($usec, $sec) = explode(" ",microtime()); 
   return ((float)$usec + (float)$sec); 
   } 

$_start_time = getmicrotime();


include ("function/function_set.php");
include ("function/trans.php");
