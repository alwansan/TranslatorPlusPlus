<?php
echo getcwd();
echo phpversion();

$yaml = yaml_parse_file("notes/rpgmakertrans/sample/Armors.yaml");

echo yaml_emit($yaml);