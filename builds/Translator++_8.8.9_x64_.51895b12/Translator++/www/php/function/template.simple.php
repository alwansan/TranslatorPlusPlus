<?php
function simple_template($template, $param=array()) {
	if (!empty($template)) {
		foreach ($param as $key=>$val) {
			$src[] = "[".$key."]";
			$rep[] = $val;
		}
		
		return str_replace($src, $rep, $template);
	}
}

function dotemplate($template, $param=array()) {
	if (!empty($template)) {
		foreach ($param as $key=>$val) {
			$src[] = "[?-".$key."-?]";
			$rep[] = $val;
		}
		
		return str_replace($src, $rep, $template);
	}
}

?>