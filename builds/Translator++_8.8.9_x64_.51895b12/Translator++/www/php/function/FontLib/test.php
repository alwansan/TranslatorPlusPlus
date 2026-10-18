<?php
include("Autoloader.php");

$font = \FontLib\Font::load('C:/Windows/Fonts/BAUHS93.TTF');
$font->parse();
echo $font->getFontName();
