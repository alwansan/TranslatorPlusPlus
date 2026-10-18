<?php
$filename = 'D:\xampp\htdocs\YOURLS-master.zip';

// Create a FileInfo object
$finfo = finfo_open(FILEINFO_MIME_TYPE);

// Get the MIME type of the file
$mime_type = finfo_file($finfo, $filename);

// Close FileInfo resource
finfo_close($finfo);

echo "$mime_type";
?>