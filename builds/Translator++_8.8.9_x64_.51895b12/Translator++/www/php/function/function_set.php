<?php
if(!function_exists("mime_content_type")) {
	function mime_content_type($path) {
		// Create a FileInfo object
		$finfo = finfo_open(FILEINFO_MIME_TYPE);

		// Get the MIME type of the file
		$mime_type = finfo_file($finfo, $path);

		// Close FileInfo resource
		finfo_close($finfo);

		return $mime_type;
	}
}

// do not use glob() as it has a bug on dealing with "[" and "]" in the path.
// use this function instead for simple file listing
function listDirectoryContents($directoryPath, $fullPath = false) {
    // Check if the provided path is a valid directory
    if (!is_dir($directoryPath)) {
        throw new Exception("The provided path is not a valid directory.");
    }

    $contents = [];

    $iterator = new DirectoryIterator($directoryPath);
    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isDot()) {
            if ($fullPath) {
                $contents[] = $fileInfo->getPathname();
            } else {
                $contents[] = $fileInfo->getFilename();
            }
        }
    }

    return $contents;
}



/**
* Escape a single value in accordance with CommandLineToArgV()
* https://docs.microsoft.com/en-us/previous-versions/17w5ykft(v=vs.85)
*/
function escape_win32_argv(string $value): string
{
    static $expr = '(
        [\x00-\x20\x7F"] # control chars, whitespace or double quote
      | \\\\++ (?=("|$)) # backslashes followed by a quote or at the end
    )ux';

    if ($value === '') {
        return '""';
    }

    $quote = false;
    $replacer = function($match) use($value, &$quote) {
        switch ($match[0][0]) { // only inspect the first byte of the match

            case '"': // double quotes are escaped and must be quoted
                $match[0] = '\\"';
            case ' ': case "\t": // spaces and tabs are ok but must be quoted
                $quote = true;
                return $match[0];

            case '\\': // matching backslashes are escaped if quoted
                return $match[0] . $match[0];

            default: throw new InvalidArgumentException(sprintf(
                "Invalid byte at offset %d: 0x%02X",
                strpos($value, $match[0]), ord($match[0])
            ));
        }
    };

    $escaped = preg_replace_callback($expr, $replacer, (string)$value);

    if ($escaped === null) {
        throw preg_last_error() === PREG_BAD_UTF8_ERROR
            ? new InvalidArgumentException("Invalid UTF-8 string")
            : new Error("PCRE error: " . preg_last_error());
    }

	return '"' . $escaped . '"';
	/*
    return $quote // only quote when needed
        ? '"' . $escaped . '"'
        : $value;
	*/
}

/** Escape cmd.exe metacharacters with ^ */
function escape_win32_cmd(string $value): string
{
    return preg_replace('([()%!^"<>&|])', '^$0', $value);
}

/** Like shell_exec() but bypass cmd.exe */
function noshell_exec(string $command): string
{
    static $descriptors = [['pipe', 'r'],['pipe', 'w'],['pipe', 'w']],
           $options = ['bypass_shell' => true];

    if (!$proc = proc_open($command, $descriptors, $pipes, null, null, $options)) {
        throw new \Error('Creating child process failed');
    }

    fclose($pipes[0]);
    $result = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    proc_close($proc);

    return $result;
}

function isAccessible($path) {
	if (!is_dir($path) && !is_file($path)) return false;
	return true;
}




function randomstring($length) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+';
    $string = '';
	$thislen = strlen($characters);
    for ($p = 0; $p < $length; $p++) {
        $string .= $characters[mt_rand(0, $thislen)];
    }
    return $string;
}

function stripslashes_deep($value)
{
   $value = is_array($value) ?
               array_map('stripslashes_deep', $value) :
               stripslashes($value);

   return $value;
}
function lookup_path($id, $table, $keyid,  $target='', $method=0) {
	$nodeinfo = load_table('$table', "WHERE `$keyid`='$id'");
	if (!empty($nodeinfo)) {
		$patharray = explode(".", "$nodeinfo[path]");
		if (is_array($patharray)) {
			if ($method==1) {
				foreach ($patharray as $val) {
					if (!empty($val)) {
						$thisnodeinfo = load_table('$table', "WHERE `$keyid`='$val' limit 1");

						$result[$i][caption] = $thisnodeinfo[label];
						$result[$i][url] = "?nodeid=$val[nodeid]";
						$i++;
					}
					$result[$i][url] = "$nodeinfo[nodeid]";
					$result[$i][caption] = $nodeinfo[label];
				}
				return $result;
			} else {
				foreach ($patharray as $val) {
					if (!empty($val)) {
						$thisnodeinfo = load_table('$table', "WHERE `$keyid`='$val' limit 1");
						$result .= "<a href='nodeid=$val[nodeid]'>$thisnodeinfo[caption]</a>/";
					}
				}
				return $result;
			}

		}
	}
}

function dateformat($date) {
	$ut = strtotime($date);
	return date("d/m/Y H:i", $ut);
	
}

function get_extension($filename) {
	if (!empty($filename)) {
		$data = pathinfo($filename);
		return strtolower($data[extension]);
	}
}

function magic_mime($files, $fp='', $size=0) {
	if (empty($size)) {
		$thissize = filesize("$files");
	} else {
		$thissize = $size;
	}
	if ($thissize==0) {
		return false;
	} if ($thissize>=200) {
		$limit = 200;
	} else {
		$limit = $thissize;
	}

	if (!is_resource($fp)) {
		$handle = fopen ( "$files", "rb");
		$contents = fread($handle, $limit);
		fclose($handle);
	} else {
		fseek($fp, 0);
		$contents = fread($fp, $limit);
	}

	$keyboard = array(10,13,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126);

	$result = "text/plain";

	$i=0;
	while ($i<$limit) {
		if (in_array(ord($contents[$i]), $keyboard)===false) {
			$count++;
			if ($count>20) {
				$result = "application/octet-stream";
				break;
			}
		}
	$i++;
	}
	return $result;
}

function mkdirs($strPath, $mode) {
 if (is_dir($strPath)) return true;
 
 $pStrPath = dirname($strPath);
 if (!mkdirs($pStrPath, $mode)) return false;
 return mkdir($strPath);
}

function dircontent($path='.', $mode) {
	if ($handle = opendir($path)) { 
	   while (false !== ($file = readdir($handle))) { 
		   if ($file != "." && $file != "..") { 
			   echo "$file\n"; 
		   } 
	   } 
	   closedir($handle); 
	} 

}

function deldir($dir){
  $current_dir = opendir($dir);
  while($entryname = readdir($current_dir)){
     if(is_dir("$dir/$entryname") and ($entryname != "." and $entryname!="..")){
        deldir("${dir}/${entryname}");
     }elseif($entryname != "." and $entryname!=".."){
        unlink("${dir}/${entryname}");
     }
  }
  closedir($current_dir);
  rmdir(${dir});
}


function build_str($query_array) {
	$query_string = array();
	foreach ($query_array as $k => $v) {
		$query_string[] = $k.'='.$v;
	}
	return join('&', $query_string);
}


function query_str($vars) {
   $out = "";
   $snd = false;
   if ( !is_array($vars) || count($vars) == 0 ) {
       return $out;
   }
   $fga = func_get_args();
   if ( isset($fga[1],$fga[2]) && $fga[1] === true ) {
       $snd = true;
   }
   foreach ( $vars as $key=>$val ) {
       if ( !is_array($val) ) {
           $out .= ( ($snd) ? $fga[2]."[".$key."]" : $key );
           $out .= "=".rawurlencode($val)."&";
       } else {
           $key = ( ($snd) ? $fga[2]."[".$key."]" : $key );
           $out .= query_str($val,true,$key);
       }
   }
  return $out;
}

function return_query_str($array) {
	if (is_array($array)) {
		foreach ($array as $key=>$val) {
			$result .= "<input type='hidden' name='$key' value='$val' />";
		}
	}
	return $result;
}


function translate_path($path, $table, $keyid, $label='file_name', $target='') {
	static $_KEYPATH;
	if (!empty($path)) {
		//parse_str($_SERVER[QUERY_STRING], $thisquery);
		$thisquery = $_GET;
		unset($thisquery[path]);
		
		$newquery = query_str($thisquery);
		
		$patharray = explode ("/",$path);
		if (is_array($patharray)) {
			foreach ($patharray as $val) {
				if (!empty($val)) {
					if (empty($_KEYPATH[$val])) {
						$kword = load_table("$table", "WHERE `$keyid`='$val'");
						$_KEYPATH[$kword[$keyid]] = $kword[$label];
					}

					$stringpath []= "$val";
					$result[] = "<a href='?path=$target".urlencode(htmlentities(implode("/", $stringpath), ENT_QUOTES)."/")."&$newquery' class='linkpath' >".$_KEYPATH[$val]."</a>";
				}
			}
		}
		return "<div class='linkgroup'><a href='?path=&$newquery' class='linkpath'>"._SERVER_NAME."</a>/".implode("/", $result)."</div>";
	} else {
		return "<div class='linkgroup'><a href='?path=&$newquery' class='linkpath' class='linkpath'>"._SERVER_NAME."</a></div>";
	}
}

function validate_path($path) {

	$pathinfo = pathinfo($path);
	if ($pathinfo['dirname']!=='.') {
		$sqlpathinfo = $pathinfo['dirname'].'\\\\';
	} else {
		$sqlpathinfo = '';
	}
	$tableinfo = load_table("node", "WHERE `path`='$sqlpathinfo' AND `nodeid`='$pathinfo[basename]'");

	return $tableinfo;

}

function bytecount($byte) {
	if ($byte > 1073741824) {
		$result = round($byte/1073741824, 2)."Gb";
	} else if ($byte > 1048576) {
		$result = round($byte/1048576, 2). "Mb";
	} else if ($byte > 1024) {
		$result = round($byte/1024, 2). "Kb";
	} else {
		$result = "$byte B";
	}
	return $result;
}


function prepareforjs($string) {
     $output = preg_replace("'([\r\n])[\s]+'", " ",   $string);
     return $output;
}

function write2file($content, $file, $method="w") {
   if (!$handle = fopen($file, "$method")) {
		echo "failed to open file";
       exit;
   }
   if (fwrite($handle, $content) === FALSE) {
       exit;
   }
   
   fclose($handle);
   unset($handle);
   return true;
}

function single_whitespace($string) {
	return preg_replace('!\s+!', ' ', $string);
}

function search_logic($keyword, $row, $method=0, $querymark="AUTO") {
	if ($querymark == 'AUTO') {
		$querymark = "";
		
		if (_DB_TYPE == strtolower('mysql')) {
			$querymark = "`";
		} elseif ($_DB_TYPE == strtolower('sqlite')) {
			$querymark = '"';
		}
	} else {
		$querymark = "";
	}
	
	if (!empty($keyword)) {
		$method = strtolower($method);
		$EXACT = array("=", "<>", ">", "<", ">=", "<=");
		$LOGICAL = array("LIKE", "not LIKE");
		
		$opr = strtolower($opr);
		$keyword = trim($keyword);
		$replace[] = "_";
		$replace[] = "%";
		$replace[] = "=";
		$replace[] = '#';
		$keyword = str_replace($replace, "", $keyword);
		$keyword = single_whitespace($keyword);
		if ($keyword == '*') {
			$newkey = "1";
		} else {
			if (is_array($row)) {
				$newkeyR = array();
				foreach ($row as $key=>$col) {
					if ($method==1) { //allword match
						#$strcount substr_count($keyword, " ");
						$newkeyR[] = "($querymark$col$querymark LIKE '%$keyword%')";
					} else if ($method==2) { //prefix search
						$newkeyR[] = "($querymark$col$querymark LIKE '$keyword%')";
					} else if ($method==3) { // partial search
						$newkeyC = str_replace (" ", "%' or $querymark$col$querymarkLIKE'%", $keyword);
						$newkeyR[] = "($querymark$col$querymark LIKE '%".$newkeyC."%')";
					} else if ($method==4) { //exact match
						$newkeyR[] = "($querymark$col$querymark = '$keyword')";
					} else if (in_array($method, $EXACT)) { //exact match
						$newkeyR[] = "($querymark$col$querymark ".$method." '$keyword')";
					} else if (in_array($method, $LOGICAL)) { //logical match
						$newkeyC = str_replace (" ", "%' and $querymark$col$querymark ".$method." '%", $keyword);
						$newkeyR[] = "($querymark$col$querymark ".$method." '%".$newkeyC."%')";
					} else if ($method=='between') { //between
						$xkeyword = json_decode($keyword, 1);
						$kwordpart = array();
						if (!empty($xkeyword[0])) {
							$kwordpart[] = "$querymark$col$querymark >= '$xkeyword[0]'";
						}
						if (!empty($xkeyword[1])) {
							$kwordpart[] = "$querymark$col$querymark <= '$xkeyword[1]'";
						}
						$nkeyword = implode("AND", $kwordpart);
						if (!empty($nkeyword)) {
							$newkeyR[] = "(".$nkeyword.")";
						}
					} else { // logical search
						$newkeyC = str_replace (" ", "%' and $querymark$col$querymark LIKE '%", $keyword);
						$newkeyR[] = "($querymark$col$querymark LIKE '%".$newkeyC."%')";
					} 
				}
				
				if (!empty($newkeyR)) {
					$newkey = implode("OR", $newkeyR);
				}

			} else {
				if ($method==1) { //allword match
					#$strcount substr_count($keyword, " ");
					$newkey = "$querymark$row$querymark LIKE '%$keyword%'";
				} else if ($method==2) { //prefix search
					$newkey= "$querymark$row$querymark LIKE '$keyword%'";
				} else if ($method==3) { // partial search
					$newkey = str_replace (" ", "%' or $querymark$row$querymarkLIKE'%", $keyword);
					$newkey = "$querymark$row$querymark LIKE '%".$newkey."%'";
				} else if ($method==4) { //exact match
					$newkey = "$querymark$row$querymark = '$keyword'";
				} else if (in_array($method, $EXACT)) { //exact match
					$newkey = "($querymark$row$querymark ".$method." '$keyword')";
				} else if (in_array($method, $LOGICAL)) { //logical match
					$newkey = str_replace (" ", "%' and $querymark$row$querymark ".$method." '%", $keyword);
					$newkey = "($querymark$row$querymark ".$method." '%".$newkey."%')";
				} else if ($method=='between') { //between
					$xkeyword = json_decode($keyword, 1);
					$kwordpart = array();
					if (!empty($xkeyword[0])) {
						$kwordpart[] = "$querymark$row$querymark >= '$xkeyword[0]'";
					}
					if (!empty($xkeyword[1])) {
						$kwordpart[] = "$querymark$row$querymark <= '$xkeyword[1]'";
					}
					$nkeyword = implode("AND", $kwordpart);
					if (!empty($nkeyword)) {
						$newkey = "(".$nkeyword.")";
					}
				} else { // logical search
					$newkey = str_replace (" ", "%' and $querymark$row$querymark LIKE '%", $keyword);
					$newkey = "$querymark$row$querymark LIKE '%".$newkey."%'";
				} 
			}
		}
		return $newkey;
	}
}


function filter_table($table, $option=array()) {
	if (!empty($table)) {
		$CHECK = execute_sql("SHOW TABLES LIKE '$table'");
		if (!empty($CHECK)) {
			$column = execute_sql("SHOW FULL COLUMNS FROM $table", 1);
			print_r($column);
			foreach ($column as $key => $val) {
				
			}
		}
	}
}

function checkfilesize($originalsize) {
	if ($originalsize > 1073741824) {
		$size = number_format(round($originalsize/1073741824, 2),2);
		return "$size <font color='#FF0000' title='".number_format($originalsize)." bytes'>GB</font>";
	} elseif  ($originalsize > 1048576) {
		$size = round($originalsize/1048576, 1);
		return "$size <font color='#CC0000' title='".number_format($originalsize)." bytes'>MB</font>";
	} elseif ($originalsize > 1024) {
		$size = round($originalsize/1024, 2);
		return "$size <font color='#800000' title='".number_format($originalsize)." bytes'>KB</font>";
	} elseif ($originalsize > 0) {
		return "$originalsize byte";
	} else {
		$lval = rand(1, 5); // more funny this way
		if ($lval == 1) {
			return "zero";
		} elseif($lval == 2) {
			return "Nothin";
		} elseif($lval == 3) {
			return "whoops!";
		} elseif($lval == 4) {
			return "Oups!";
		} else{
			return "0 byte";
		} 
	}

}

function checksame($value1, $value2, $string) {
	if ($value1 == $value2) {
		return $string;
	}
}

function fill_ifempty($value, $otherwise='&nbsp;') {
	if (!empty($value)) {
		return $value;
	} else {
		return $otherwise;
	}
}

function sayifempty($value, $ifempty, $otherwise='') {
	if (!empty($value)) {
		return $ifempty;
	} else {
		return $otherwise;
	}
}

function sayifsame($value1, $value2, $string) {
	if ($value1 == $value2) {
		return $string;
	}
}

function sayifexist($needle,$haystack, $string) {
	if (in_array($needle, $haystack)) {
		return $string;
	}
}

function sayifon($param, $haystack, $string) {
	if ($haystack[$param]!=false) {
		return $string;
	}
}


function even_odd($i, $even, $odd) {
	$x = $i%2;
	if ($x == 0) {
		return $even;
	} else {
		return $odd;
	}
}

function filter_array($array, $param) {
	if (is_array($array) and is_array($param)) {
		foreach ($array as $key => $val) {
			if (in_array($key, $param)) {
				$result[$key] = $val;
			}
			
		}
		return $result;
	}
}

function translate_date($sqldate) {
	if ($sqldate=="0000-00-00" or $sqldate=="0000-00-00 00:00:00") {
		$result = "-";
	} else {
		$time = strtotime($sqldate);
		$result = "<span class=\"date\" nowrap>".date("d M Y H:i", $time)."</span>";
	}
	return $result;
}

function showdate($time) {
	if (is_numeric($time)) {
		if (!empty($time)) {
			$result = date("j M Y",$time);
		}
	} else {
		if ($time!="0000-00-00" AND $time!="0000-00-00 00:00:00") {
			$xtime = strtotime($time);
			$result = date("j M Y", $xtime);
		}
	}

	return $result;
}

function numberToRoman($num) 
 {
     // Make sure that we only use the integer portion of the value
     $n = intval($num);
     $result = '';
 
     // Declare a lookup array that we will use to traverse the number:
     $lookup = array('M' => 1000, 'CM' => 900, 'D' => 500, 'CD' => 400,
     'C' => 100, 'XC' => 90, 'L' => 50, 'XL' => 40,
     'X' => 10, 'IX' => 9, 'V' => 5, 'IV' => 4, 'I' => 1);
 
     foreach ($lookup as $roman => $value) 
     {
         // Determine the number of matches
         $matches = intval($n / $value);
 
         // Store that many characters
         $result .= str_repeat($roman, $matches);
 
         // Substract that from the number
         $n = $n % $value;
     }
 
     // The Roman numeral should be built, return it
     return $result;
 }


function int_to_words($x)
{
 $nwords = array(    "kosong", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh",
                     "delapan", "sembilan", "sepuluh", "sebelas", "dua belas", "tiga belas",
                     "empat belas", "lima belas", "enam belas", "tujuh belas", "delapan belas",
                     "sembilan belas", "dua puluh", 30 => "tiga puluh", 40 => "empat puluh",
                     50 => "lima puluh", 60 => "enam puluh", 70 => "tujuh puluh", 80 => "delapan puluh",
                     90 => "sembilan puluh" );
     if(!is_numeric($x))
     {
         $w = '#';
     }else if(fmod($x, 1) != 0)
     {
         $w = '#';
     }else{
         if($x < 0)
         {
             $w = 'minus ';
             $x = -$x;
         }else{
             $w = '';
         }
         if($x < 21)
         {
             $w .= $nwords[$x];
         }else if($x < 100)
         {
             $w .= $nwords[10 * floor($x/10)];
             $r = fmod($x, 10);
             if($r > 0)
             {
                 $w .= '-'. $nwords[$r];
             }
         } else if($x < 1000)
         {
             $w .= $nwords[floor($x/100)] .' ratus';
             $r = fmod($x, 100);
             if($r > 0)
             {
                 $w .= ' and '. int_to_words($r);
             }
         } else if($x < 1000000)
         {
             $w .= int_to_words(floor($x/1000)) .' ribu';
             $r = fmod($x, 1000);
             if($r > 0)
             {
                 $w .= ' ';
                 if($r < 100)
                 {
                     $w .= 'and ';
                 }
                 $w .= int_to_words($r);
             }
         } else {
             $w .= int_to_words(floor($x/1000000)) .' juta';
             $r = fmod($x, 1000000);
             if($r > 0)
             {
                 $w .= ' ';
                 if($r < 100)
                 {
                     $word .= 'and ';
                 }
                 $w .= int_to_words($r);
             }
         }
     }
     return $w;
} 


function append_query($param) {
	if (!empty($_GET)) {
		$query = $_GET;

		$vars = array_merge($query, $param);
		return query_str($vars);

	} else {
		echo "here";
		print_r($param);
		return query_str($param);

	}
}

function strip_newline($vars) {
	if (!empty($vars)) {
		$src = array("\r\n", "\r", "\n");
		$rep = " ";
		$result = addslashes(trim(str_replace($src, $rep, $vars)));
		return $result;
	}
}

function chunck_text($text, $character=80, $striphtml=false) {
	if ($striphtml) {
		$text =  strip_tags($text);
	}
	if (!empty($text)) {
		$numchar = strlen($text);
		if ($numchar > $character) {
			$text = strip_tags($text);
			return substr($text, 0, $character)." ...";
		} else {
			return $text;
		}
	}

}

function titleized($string) {
	$string = str_replace(array("-","_"), " ", $string);
	return ucwords($string);
}

function get_mysql_datatype($string) {
	$data = explode("(", $string);
	return $data[0];
}

/** 
* Finds path, relative to the given root folder, of all files and directories in the given directory and its sub-directories non recursively. 
* Will return an array of the form 
* array( 
*   'files' => [], 
*   'dirs'  => [], 
* ) 
* @author sreekumar 
* @param string $root 
* @result array 
*/ 
function get_folder_content($root = '.'){ 
  $files  = array('files'=>array(), 'dirs'=>array()); 
  $directories  = array(); 
  $last_letter  = $root[strlen($root)-1]; 
  $root  = ($last_letter == '\\' || $last_letter == '/') ? $root : $root.DIRECTORY_SEPARATOR; 
  
  $directories[]  = $root; 
  while (sizeof($directories)) { 
    $dir  = array_pop($directories); 
	if (!is_dir($dir)) continue;
    if ($handle = opendir($dir)) { 
      while (false !== ($file = readdir($handle))) { 
        if ($file == '.' || $file == '..') { 
          continue; 
        } 
        $file  = $dir.$file; 
        if (is_dir($file)) { 
          $directory_path = $file.DIRECTORY_SEPARATOR; 
		  $directory_path = str_replace("\\", "/", $directory_path);
          array_push($directories, $directory_path); 
          $files['dirs'][]  = $directory_path; 
        } elseif (is_file($file)) { 
          $files['files'][]  = $file; 
        } 
      } 
      closedir($handle); 
    } 
  } 
  
  return $files; 
} 

function copy_tree($source, $target, $pattern = false) {
	/* 
		Copy directory content from $source directory to $target
		directory structure are retained.
		existing file will be overwrited
		$pattern = glob pattern (ex: *.txt)
	*/
	echo "CopyTree by. Dreamsavior\r\n";
	echo "Source : $source\r\n";
	echo "Target : $target\r\n";
	if (!is_dir($source)) {
		echo "'$source' is not a directory or unaccessible!\r\n";
		return false;
	}
	
	$target = str_replace("\\", "/", $target);
	if (mb_substr($target, -1) !== '/') $target = $target."/";
	$sourceList = get_folder_content($source);
	foreach ($sourceList['dirs'] as $dirPath) {
		$dirPath = str_replace("\\", "/", $dirPath);
		if ($pattern !== false) {
			if (fnmatch($pattern, $dirPath) == false) continue;
		}
		
		$relPath = mb_substr($dirPath, mb_strlen($source));
		if (mb_substr($relPath,0,1)=="/") $relPath = mb_substr($relPath, 1);

		echo $relPath."\r\n";
		if (!is_dir($target.$relPath)) {
			echo "Creating folder : ".$target.$relPath."...";
			//echo "mkdir(".$target.$relPath.", 777, true)\n";
			if (mkdir($target.$relPath, 777, true)) {
				echo "done!\r\n";
			} else {
				echo "failed!\r\n";
			}
		}
	}
	
	foreach ($sourceList['files'] as $filePath) {
		$filePath = str_replace("\\", "/", $filePath);
		if ($pattern !== false) {
			if (fnmatch($pattern, $filePath) == false) continue;
		}
		
		$relPath = mb_substr($filePath, mb_strlen($source));
		if (mb_substr($relPath, 0, 1)=="/") $relPath = mb_substr($relPath, 1);
		$targetPathinfo = pathinfo($target.$relPath);
		if (!is_dir($targetPathinfo['dirname'])) {
			echo "creating directory : ".$targetPathinfo['dirname']." ... ";
			if (mkdir($targetPathinfo['dirname'], 777, true)) {
				echo "success!";
			} else {
				echo "failed!";
			}
		}		
		echo "Copy from : ".$filePath." to : ".$target.$relPath."...";
		//echo "copy($filePath, ".$target.$relPath.")\n";
		if (copy($filePath, $target.$relPath)) {
			echo "done!\r\n";
		} else {
			echo "failed!\r\n";
		}
	}
	return true;
	
}

function del_tree($source, $removeRoot = false) {
	/* 
		Delete a folder
	*/
	if (is_file($source)) {
		echo "Removing : ".$filePath." ... ";
		if (unlink($filePath)) {
			echo "done!\r\n";
		} else {
			echo "failed!\r\n";
		}
		return true;
	}
	
	if (!is_dir($source)) {
		echo "'$source' is not a file or directory or unaccessible!\r\n";
		return false;
	}

	
	$source = str_replace("\\", "/", $source);
	if (mb_substr($source, -1) !== '/') $source = $source."/";
	$sourceList = get_folder_content($source);

	// removing files
	foreach ($sourceList['files'] as $filePath) {
		$filePath = str_replace("\\", "/", $filePath);
		if (!is_file($filePath)) continue;
		echo "Removing : ".$filePath." ... ";
		if (unlink($filePath)) {
			echo "done!\r\n";
		} else {
			echo "failed!\r\n";
		}
	}
	
	// removing folders
	rsort($sourceList['dirs']);
	foreach ($sourceList['dirs'] as $dirPath) {
		$dirPath = str_replace("\\", "/", $dirPath);

		if (is_dir($dirPath)) {
			echo "Removing folder : ".$dirPath."...";
			if (rmdir($dirPath)) {
				echo "done!\r\n";
			} else {
				echo "failed!\r\n";
			}
		}
	}	
	if ($removeRoot) {
		rmdir($source);
	}
	return true;	
	
}

function move_tree($source, $target) {
	copy_tree($source, $target);
	del_tree($source);
}

function delete_all($root = '.', $filter="*") {
	/*
		example :
		delete_all('F:\test\folder', "*.txt");
	*/	
	$CONTENT = get_folder_content($root);
	$RESULT = array();
	foreach ($CONTENT['files'] as $file) {
		if (fnmatch($filter, $file)) {
			$RESULT[] = $file;
			echo "removing : $file\r\n";
			unlink($file);
		}
	}
	return $RESULT;
}

function rename_all($root = '.', $filter="*", $renameTo="*") {
	/*
		example :
		rename_all('F:\test\folder', "*.txt", "*.bak");
	*/
	$CONTENT = get_folder_content($root);
	$RESULT = array();
	foreach ($CONTENT['files'] as $file) {
		if (fnmatch($filter, $file)) {
			$pInfo = pathinfo($file);
			$newFileName = str_replace("*", $pInfo['basename'], $renameTo);
			if (empty($newFileName)) continue;
			
			$newPath = $pInfo['dirname']."/".$newFileName;
			echo "$file : $newPath ... ";
			if (rename($file, $newPath)) {
				$RESULT[] = $newPath;
				echo "success!\r\n";
			} else {
				echo "failure!\r\n";
			}
			
		}
	}
	return $RESULT;
}	

function is_exist($root = '.', $pattern=""){ 
/*
	Search for a $pattern inside a path and it's subfolders
	return true if found
*/
  $files  = array('files'=>array(), 'dirs'=>array()); 
  $directories  = array(); 
  $last_letter  = $root[strlen($root)-1]; 
  $root  = ($last_letter == '\\' || $last_letter == '/') ? $root : $root.DIRECTORY_SEPARATOR; 
  
  $directories[]  = $root; 
  while (sizeof($directories)) { 
    $dir  = array_pop($directories); 
	if (!is_dir($dir)) continue;
    if ($handle = opendir($dir)) { 
      while (false !== ($file = readdir($handle))) { 
        if ($file == '.' || $file == '..') { 
          continue; 
        } 
        $file  = $dir.$file; 
        if (is_dir($file)) { 
			$directory_path = $file.DIRECTORY_SEPARATOR; 
			$directory_path = str_replace("\\", "/", $directory_path);
			array_push($directories, $directory_path); 
			$files['dirs'][]  = $directory_path; 
        } elseif (is_file($file)) { 
			if (fnmatch($pattern, $file)) return true;
			$files['files'][]  = $file; 
        } 
      } 
      closedir($handle); 
    } 
  } 
  
  return false; 
} 



function clean_path( $A_path="", $A_echo=false )
{
    // IF YOU WANT TO LEAN CODE, KILL ALL "if" LINES and $A_echo in ARGS
    $_p                            = func_get_args();
    // HOW IT WORKS:
    // REMOVING EMPTY ELEMENTS AT THE END ALLOWS FOR "BUFFERS" AND HANDELLING START & END SPEC. SEQUENCES
    // BLANK ELEMENTS AT START & END MAKE SURE WE COVER SPECIALS AT BEGIN & END
    // REPLACING ":" AGAINST "://" MAKES AN EMPTY ELEMENT TO ALLOW FOR CORRECT x:/../<path> USE (which, in principle is faulty)

    // 1.) "normalize" TO "slashed" AND MAKE SOME SPECIALS, ALSO DUMMY ELEMENTS AT BEGIN & END 
        $_s                        = array( "\\", ":", ":./", ":../");
        $_r                        = array( "/", "://", ":/", ":/" );
        $_p['sr']                = "/" . str_replace( $_s, $_r, $_p[0] ) . "/";
        $_p['arr']                = explode('/', $_p['sr'] );
                                                                                if ( $A_echo ) $_p['arr1']    = $_p['arr'];
    // 2.) GET KEYS OF ".." ELEMENTS, REMOVE THEM AND THE ONE BEFORE (!) AS THAT MEANS "UP" AND THAT DISABLES STEP BEFORE
        $_p['pp']                = array_keys( $_p['arr'], '..' );
        foreach($_p['pp'] as $_pos )
        {
            $_p['arr'][ $_pos-1 ] = $_p['arr'][ $_pos ] ="";
        }
                                                                                if ( $A_echo ) $_p['arr2']    = $_p['arr'];
    // 3.) REMOVE ALL "/./" PARTS AS THEY ARE SIMPLY OVERFLUENT
        $_p['p']                = array_keys( $_p['arr'], '.' );
        foreach($_p['p'] as $_pos )
        {
            unset( $_p['arr'][ $_pos ] );
        }
                                                                                if ( $A_echo ) $_p['arr3']    = $_p['arr'];
    // 4.) CLEAN OUT EMPTY ONES INCLUDING OUR DUMMIES
        $_p['arr']                = array_filter( $_p['arr'] );
    // 5) MAKE FINAL STRING
        $_p['clean']            = implode( DIRECTORY_SEPARATOR, $_p['arr'] );
                                                                                if ($A_echo){ echo "arr=="; print_R( $_p  ); };
    return $_p['clean'];    
}

function get_relative_path($base, $path) {
	$base = clean_path($base)."\\";
	$path = clean_path($path);
	return substr($path, strlen($base));
}

?>