<?php

function fetchDir($path) {
	// return array of full path within folder content of $path
	if (!is_dir($path)) return Array();
	
	$path = str_replace("/", "\\", $path);
	if (substr($path, -1, 1) !== "\\") {
		$path = $path."\\";
	}
	$cmd = "dir ".escape_win32_argv($path)." /b ";
	//echo $cmd."\r\n";
	$output = shell_exec("dir ".escape_win32_argv($path)." /b ");
	$currentEncoding =  mb_detect_encoding($output, "JIS, eucjp-win, sjis-win, UTF-8");
	$output = mb_convert_encoding($output, "UTF-8");
	
	
	
	$outputs = explode("\r\n", $output);
	if (count($outputs) == 1) {
		$outputs = explode("\n", $output);
	}
	$result = array();
	foreach ($outputs as $key=>$val) {
		if (empty($val)) continue;
		$result[] = $path.$val;
	}
	return $result;
	
}

function isExistOnList($id, $data) {
	// check wether current file is exist on user selected files
	// regardless its extension 
	$idList = array();
	if (!empty($data)) {
		//echo "generating file list : \n";
		foreach($data as $fileID) {

			$thisPath = substr($fileID, 0,  -strlen(substr(strrchr($fileID, "."), 0 )));
			//echo "registering path :".$thisPath."\n";
			$idList[$thisPath] = true;
		}
	}
	
	$stripped = substr($id, 0,  -strlen(substr(strrchr($id, "."), 0 )));

	//echo "incoming id without extension : ".$stripped."\n";
	//echo "Comparing with list : \n";
	//print_r($idList);	
	return $idList[$stripped];
	
}

function hasSelectedTES($data) {
	// incoming $data is an array of user selected files
	if (is_array($data)) {
		foreach($data as $fileID) {
			$fileID = str_replace("\\", "/", $fileID);
			$firstDir = strstr($fileID, '/', true);
			if (strtolower($firstDir) == 'extract_main') {
				return true;
				exit;
			}
		}
	}
	
	return false;
}


function getPrefferedTrans($input, $col=false, $includeOrig=false) {
	// input : array
	// $col : integer, index of preffered translation
	if (!is_array($input)) {
		return $input;
		exit;
	}
	if (is_int($col)) {
		return $input[$col];
		exit;
	}
	
	if ($includeOrig) {
		for ($i=count($input)-1; $i>=0; $i--) {
			if (!empty($input[$i])) {
				return $input[$i];
				exit;
			}
		}
	} else {
		for ($i=count($input)-1; $i>0; $i--) {
			if (!empty($input[$i])) {
				return $input[$i];
				exit;
			}
		}
	}
	return "";
}


function listFilesInDirectory($dir, $fileOnly = false) {
    $files = [];

    // Check if the directory exists
    if (is_dir($dir)) {
        // Get all files and directories in the specified directory
        $items = scandir($dir);

        // Loop through the items and filter files or files and directories based on $fileOnly parameter
        foreach ($items as $item) {
            $itemPath = $dir . '/' . $item;

            // Check if it's a file and not a directory
            if (is_file($itemPath) && ($fileOnly || !$fileOnly)) {
                $files[] = $itemPath;
            }
        }
    } else {
        // If the directory doesn't exist, return an empty array
        return $files;
    }

    return $files;
}

function copyFiles($source, $to, $recursive=false) {
	echo "Copying file from $source to $to, recursive? $recursive \n";
	if (!is_dir($to)) {
		if (mkdir($to, 777, true) == false) {
			echo "Failed to create directory : $to\n";
			return false;
			exit;
		}
	}
	$to = str_replace("\\", "/", $to);
	if (substr($to, -1, 1) !== "/") {
		$to = $to."/";
	}
	$source = str_replace("\\", "/", $source);
	if (substr($source, -1, 1) !== "/") {
		$source = $source."/";
	}

	
	
	$fileList = Array($source);
	if (is_dir($source)) {
		if ($recursive) {
			$list = get_folder_content($source);
			$fileList = $list['files'];
		} else {
			$fileList = listFilesInDirectory($source);
		}
	} 

	echo "File to copy:\n";
	print_r($fileList);
	$origPathLength = strlen($source);
	foreach ($fileList as $from) {
		$fileInfo = pathinfo($from);
		$relPath = substr($fileInfo['dirname']."/", $origPathLength);
		if (!is_dir($to.$relPath)) {
			mkdir($to.$relPath, 777, true);
		}
		echo "Copying to '$from' :".$to.$relPath.$fileInfo['basename']."\n";
		copy($from, $to.$relPath.$fileInfo['basename']);
	}
}

function moveFiles($source, $to, $recursive=false) {
	if (!is_dir($to)) {
		if (mkdir($to, 777, true) == false) {
			echo "Failed to create directory : $to\n";
			return false;
			exit;
		}
	}
	$to = str_replace("\\", "/", $to);
	if (substr($to, -1, 1) !== "/") {
		$to = $to."/";
	}
	$source = str_replace("\\", "/", $source);
	if (substr($source, -1, 1) !== "/") {
		$source = $source."/";
	}

	
	
	$fileList = Array($source);
	if (is_dir($source)) {
		if ($recursive) {
			$list = get_folder_content($source);
			$fileList = $list['files'];
		} else {
			$fileList = listFilesInDirectory($source);
		}
	} 

	$origPathLength = strlen($source);
	foreach ($fileList as $from) {
		$fileInfo = pathinfo($from);
		$relPath = substr($fileInfo['dirname']."/", $origPathLength);
		if (!is_dir($to.$relPath)) {
			mkdir($to.$relPath, 777, true);
		}
		echo "Moving to '$from' :".$to.$relPath.$fileInfo['basename']."\n";
		rename($from, $to.$relPath.$fileInfo['basename']);
	}
}


function error($msg, $code="") {
	echo "Error : $msg\n";
	return "Error : $msg\n";
	
}

function isJson($string) {
	json_decode($string);
	return (json_last_error() == JSON_ERROR_NONE);
}

function detectGameEngine($folder="", $selectedFile="", $skipLoadFromData = false) {
	global $_PARAM, $_PLUGINS;
	clearstatcache(true);
	
	if ($skipLoadFromData == false) {
		if (!empty($_POST['gameEngine'])) {
			return $_POST['gameEngine'];
		} elseif (!empty($_PARAM['gameEngine'])) {
			return $_PARAM['gameEngine'];
		}
	}
	
	
	if (is_file($folder."\\Game.rgss3a")) {
		return "rmvxace";
	} elseif (is_file($folder."\\Data\\System.rvdata2")) {
		return "rmvxace";
	} elseif (is_file($folder."\\Game.rgss2a")) {
		return "rmvx";
	} elseif (is_file($folder."\\Data\\System.rvdata")) {
		return "rmvx";
	} elseif (is_file($folder."\\Game.rgssad")) {
		return "rmxp";
	} elseif (is_file($folder."\\Data\\System.rxdata")) {
		return "rmxp";
	} elseif (is_file($folder."\\js\\rmmz_core.js")) {
		return "rmmz";
	} elseif (is_file($folder."\\www\\data\\System.json")) {
		return "rmmv";
	} elseif (is_file($folder."\\data\\System.json")) {
		return "rmmv";
	} elseif (is_file($folder."\\GuruguruSMF4.dll")) {
		return "wolf";
	} elseif (is_file($folder."\\RPG_RT.ldb")) {
		if (is_rm2000Dir($folder)) {
			return "rm2000";
		}
	} elseif (is_enigma($selectedFile)) {
		return "rmmv"; // assume RMMV
	} elseif (is_enigma($_POST['selectedFile'])) {
		return "rmmv"; // assume RMMV
	}
	// searching supports from plugin directory
	$_PLUGINS_PATH = array_filter(glob(_ROOT_PATH.'plugins/*'), 'is_dir');
	foreach ($_PLUGINS_PATH as $thisDir)  {
		$thisDir = realpath($thisDir);
		$dirName = basename($thisDir);
		if (is_file($thisDir."/register.php")) {
			include_once($thisDir."/register.php");
			if (!function_exists("plugins\\".$dirName."\\register")) continue;
			$result = call_user_func_array("plugins\\".$dirName."\\register", Array($selectedFile));
			if (!empty($result)) {
				$_PARAM['plugin'][$dirName]['result'] = $result;
				if (!empty($_PLUGINS[$dirName]['name'])) return $_PLUGINS[$dirName]['name'];
				return $dirName;
				// halt!
			}
		}
	}	
	
	return "default";
}

function checkProjectByTitle($gameTitle) {
	// check wether same project already exist on cache;
	global $_PARAM;
	
	//$cachePath = $_SERVER['APPLICATION_ROOT']."\\www\\php\\cache\\*";
	$cachePath = $_SERVER['STAGING_PATH']."\\*";
	$result = array();
	foreach(glob($cachePath) as $path) {
		if (!is_dir($path)) continue;
		if (!is_file($path."\\gameInfo.json")) continue;
		$thisPathinfo = pathinfo($path);
		$config = json_decode(file_get_contents($path."\\gameInfo.json"), true);
		if ($config['title'] == $gameTitle) {
			$data = $config;
			$data['id'] = $thisPathinfo['basename'];
			$result[] = $data;
		} elseif ($config['Title'] == $gameTitle) {
			$data = $config;
			$data['id'] = $thisPathinfo['basename'];
			$result[] = $data;
		}
	}
	
	return $result;
	
}

function unescapeRPGTransText($text) {
	//echo "incoming text : \n".$text."\n\n";
	$escapeHash = "[escapeH-".md5(time())."]";
	$text = str_replace("\\#", $escapeHash, $text);
	$textA = explode("\n", $text);
	$newTexts = Array();
	foreach ($textA as $textPart) {
		$textB = explode("#", $textPart);
		$newTexts[] = $textB[0];
	}
	$text= implode("\n", $newTexts);
	$text= str_replace($escapeHash, "#", $text);
	
	
	$find = array("\\\\", "\\".">");
	$replace = array("\\", ">");
	$text = str_replace($find, $replace, $text);
	//echo "unescaped : \n".$text;;
	return $text;
}

/*
function escapeRPGTransText($text) {

	$src = array("\\");
	$rep = array("\\\\");
	
	$text = str_replace($src, $rep, $text);
	return $text;
}
*/

function escapeRPGTransText($text) {

	$src = array("\\", "#", ">");
	$rep = array("\\\\", "\\#", "\\>");
	
	$text = str_replace($src, $rep, $text);
	return $text;
}


function detectLineBreak($text) {
	if (empty($text)) {
		return "\n";
		exit;
	}
	
	$chunk = substr($text, 0, 500);
	$chunks = explode("\r\n", $chunk);
	if (count($chunks) > 1) {
		return "\r\n";
		exit;
	}
	$chunks = explode("\r\n", $chunk);
	if (count($chunks) > 1) {
		return "\n\r";
		exit;
	}
	
	return "\n";
}




function normalizeRPGTrans($text, $newLine="\r\n") {
	// makes inline ">" go to new line
	// THIS MUST BE RUN BEFORE unescapeRPGTransText!!!
	
	$escape = "[escapeM-".md5(time())."]";
	$text = str_replace("\\>", $escape, $text);
	$text = str_replace(">", $newLine.">", $text);
	$text = str_replace($escape, "\\>", $text);
	return $text;
}

/*
function isLegalRPGTransFile($filename) {
	return preg_match("/^[A-Za-z0-9\.]*$/", $filename);
}
*/

function isLegalRPGTransFile($filename) {
	//$rest = mb_ereg_replace("([^\w\s\d\-_~,;\[\]\(\).])", '', $filename);
	$rest = mb_ereg_replace("([^\w\d\-_~,;\[\]\(\).])", '', $filename);
	if ($rest == $filename) {
		//echo "true";
		return true;
	} 
	//echo "false";
	return false;
}

function standarizeNewLine($text, $newLine) {
	global $_PARAM;
	if (empty($newLine)) {
		$newLine = "\r\n";
	}
	if (strpos($newLine, "\r") !== false) {
		$text = str_replace("\r", "", $text);
		$text = str_replace("\n", $newLine, $text);
		return $text;
	} else {
		$text = str_replace("\r", "", $text);
		return $text;
	}
}

function parseRPGTransFile($file, $skipUnescape=false) {
	error_reporting(E_ERROR | E_PARSE);
	// $file is path to file or string content of the file
	if (strpos($file, "\n") === false) {
		$file = str_replace("\\", "/", $file);
		//if (!is_file("wfio://".$file)) return false;
		//$content = file_get_contents("wfio://".$file);
		if (!is_file($file)) return false;
		$content = file_get_contents($file);
	} else {
		$content = $file;
	}
	
	global $_PARAM;
	$RESULT = array();
	$RESULT['rawData'] = array();	
	$contentSegm = explode("> BEGIN STRING".$lineSeparator, $content);
	
	if (count($contentSegm) < 1) {
		return false;
		exit();
	}
	
	$lineBreak = detectLineBreak($content);
	$content = normalizeRPGTrans($content, $lineBreak);
	/*
	$RESULT['lineBreakType'] = 0;
	if (strpos("\r\n", $contentSegm[1]) !== false) {
		$lineBreak = "\r\n";
		$RESULT['lineBreakType'] = 1;
		
	} else if (strpos("\n\r", $contentSegm[1]) !== false) {
		$lineBreak = "\n\r";
		$RESULT['lineBreakType'] = 2;
		
	}
	*/
	
	$RESULT['header'] = trim(array_shift($contentSegm));
	$RESULT['lineBreak'] = $lineBreak;
	
	foreach ($contentSegm as $key=> $segment) {
		$elm = explode($lineBreak, $segment);
		$RESULT['data'][$key] = array("");
		$RESULT['context'][$key] = array();
		$RESULT['parameters'][$key] = array();
		//$RESULT['structure'][$key] = array();
		$RESULT['rawData'][$key]['text'] .= "";	
		
		// text section
		$index=0;
		$textArray = array();
		foreach ($elm as $i=>$line) {
			if (!isset($line[0])) continue;
			if ($line[0] == "#") continue;
			if ($line[0] == ">") break;
			if ($i==0) {
		
				if (substr($line, 0, 2) == "\r\n") {
					$line = substr($line, 2);
				} elseif (substr($line, 0, 2) == "\n\r") {
					$line = substr($line, 2);
				} elseif (substr($line, 0, 1) == "\n") {
					$line = substr($line, 1);
				} elseif (substr($line, 0, 1) == "\r") {
					$line = substr($line, 1);
				}
				$trimLine = trim($line);
				if (empty($trimLine)) continue;
			}
			$textArray[] = $line;
			$index++;
		}
		$RESULT['rawData'][$key]['text'] = implode($lineBreak, $textArray);
		$RESULT['data'][$key][0] = implode($lineBreak, $textArray);
		
		// parameter section
		for ($n=$index+1; $n<count($elm); $n++) {
			$line = $elm[$n];
			if ($line[0] == "#") continue;
			if ($line[0] !== ">") {
				$trimLine = trim($line);
				if (empty($trimLine)) continue;
				if ($lastElm == "translation") {
					// second line... previous line is already entering translation mode
					$currentIndex = count($RESULT['rawData'][$key]['translation'])-1;
					$RESULT['rawData'][$key]['translation'][$currentIndex] .= $lineBreak.$line;
					$RESULT['data'][$key][$currentIndex+1] .= $lineBreak.$line;
				} else {
					// first row of each column
					if (empty($RESULT['rawData'][$key]['translation'])) {
						// initializing translation column
						$RESULT['rawData'][$key]['translation'] = array($line);
						$RESULT['data'][$key][1] = $line;
						
					} else {
						// second translation is found!
						// put next translation into next index of array
						$currentIndex = count($RESULT['rawData'][$key]['translation']);
						$RESULT['rawData'][$key]['translation'][$currentIndex] = $line;
						
						// put next translation into next column
						// because first index is original data, shift $currentIndex by 1 column
						$RESULT['data'][$key][$currentIndex+1] = $line;
					}
				}
				
				$lastElm = "translation";
				continue;
			}
			//$parts = explode(":", substr($line, 2));

			if (strpos($line, ":") !== false) {
				$thisKey = trim(substr(strstr($line, ':', true), 1));
				$thisValue = trim(substr(strstr($line, ':'), 1));
				if (empty($RESULT['rawData'][$key][$thisKey])) {
					$RESULT['rawData'][$key][$thisKey] = array();
					$RESULT['parameters'][$key][$thisKey] = array();
				}
				array_push($RESULT['rawData'][$key][$thisKey], $thisValue);
				array_push($RESULT['parameters'][$key][$thisKey], $thisValue);
				
				if ($thisKey == 'CONTEXT') {
					$contextPart = explode(" < ", $thisValue);
					array_push($RESULT['context'][$key], $contextPart[0]);
				} else {
					// parsing wolftrans style context
					// > CONTEXT COMMONEVENT:1/33/Picture < UNTRANSLATED
					$keyParts = explode(" ", $thisKey); 
					if ($keyParts[0] == 'CONTEXT') {
						$contextPart = explode(" < ", $line);
						array_push($RESULT['context'][$key], substr($contextPart[0], 10));
					}
					
				}
			} else {
				$thisKey = trim(substr($line, 1));
				if ($thisKey == 'END STRING') break;
				
				$RESULT['rawData'][$key][$thisKey] = true;
				$RESULT['parameters'][$key][$thisKey] = true;
			}
			$RESULT['structure'][$key][] = Array("type" => "param", "value" => trim(substr($line, 1)));
			
			$lastElm = $thisKey;
		}
		
	}
	
	if ($skipUnescape == false) {
		foreach ($RESULT['data'] as $indexRow=>$row) {
			if (!is_array($row)) continue;
			foreach ($row as $indexCol=>$cell) {
				$RESULT['data'][$indexRow][$indexCol] = unescapeRPGTransText($cell); 
			}
		}
	}
	
	return $RESULT;
	
}

function getContextTranslation($fileData, $rowId, $row, $thisLineBreak) {
	if (empty($fileData['contextTranslation'])) return "";
	if (empty($fileData['contextTranslation'][$rowId])) return "";
	if (!is_array($fileData['contextTranslation'][$rowId])) return "";

	/*
	// remove < UNTRANSLATED
	if (substr($contextName, -15) == " < UNTRANSLATED") {
		$contextName = substr($contextName, 0, -15);
	}
	*/
	$translated 	= [];
	$untranslated 	= [];
	foreach ($fileData['contextTranslation'][$rowId] as $contextId=>$contextTranslation) {
		if (empty($contextTranslation['translation'])) {
			$untranslated[] = "> CONTEXT: ".$contextTranslation['contextStr'];
		} else {
			$translated[] = "> CONTEXT: ".$contextTranslation['contextStr'];
			if ($skipEscape) {
				$translated[] = standarizeNewLine($contextTranslation['translation'], $thisLineBreak);
			} else {
				$translated[] = escapeRPGTransText(standarizeNewLine($contextTranslation['translation'], $thisLineBreak));
			}
		}
	}

	// let's the normal handler handle the translations
	if (count($translated) == 0) return "";

	$line = [];
	$line[] = implode($thisLineBreak, $translated);

	if (count($untranslated) > 0) {
		$line[] = implode($thisLineBreak, $untranslated);
		$thisTranslation = getPrefferedTrans($row);
		if ($skipEscape) {
			$line[] = standarizeNewLine($thisTranslation, $thisLineBreak);
		} else {
			$line[] = escapeRPGTransText(standarizeNewLine($thisTranslation, $thisLineBreak));
		}

	}

	return implode($thisLineBreak, $line);
}

function changeExtension($filename, $newExt) {
	$filename = pathinfo($filename);
	return $filename['dirname']."\\".$filename['filename'].".".$newExt;
}

function transToRPGTransFile($data, $target="", $skipEscape=false, $selectedFiles=Array(), $options=null, $skipFormatCheck=false) {
	// $data	: json formatted Project file path
	// $target 	: target path (directory) 
	// return $target path on success, or boolean false on failed.
	/*
		options : {
			filterTag:[],
			filterTagMode:"whitelist" //  "blacklist" or "" empty
		}
		
		if not set, will get from $_POST instead;
	
	*/
	// $skipFormatCheck : if true, will convert to trans file regardless it's original format
	global $_PARAM;
	
	
	if (!is_file($data)) exit;
	
	if (!is_dir($target."\\patch")) {
		mkdir($target."\\patch", 777, true);
	}

	if (is_null($options)) {
		//option is not passed
		//try to get from $_POST;
		$options = $_POST['options'];
	}
	
	$content = file_get_contents($data);
	$PROJECT = json_decode($content, true);
	foreach ($PROJECT['project']['files'] as $filePath=> $fileData) {
		echo "Generating RPGMTrans file: $filePath \r\n";
		if (!empty($selectedFiles)) {
			if (!in_array($filePath, $selectedFiles)) continue;
		}		
		
		if ($skipFormatCheck == false) {
			if (strpos($fileData['originalFormat'], 'RPGMAKER TRANS PATCH FILE') === false) {
				echo "Not an RPGMTrans file, skipping!\r\n";
				continue; // skip TES data
			}
		}
		
		$thisLineBreak = "\r\n";
		if (!empty($fileData['lineBreak'])) $thisLineBreak = $fileData['lineBreak'];
		

			
		$thisSegm = array();
		$thisSegm[] = $fileData['originalFormat'];
		foreach ($fileData['data'] as $rowId=>$row) {
			if (empty($row[0])) continue; // skip if first key is blank
			
			/* skip if tag is blacklisted /whitelisted */
			if (!empty($options['filterTagMode'])) {
				if (!empty($fileData["tags"][$rowId])) {
					if (is_array($fileData["tags"][$rowId])) {
						$intersects = array_intersect($options['filterTag'], $fileData["tags"][$rowId]);
						//echo("Intersection of tags and blacklistTag:\n");
						//print_r($intersects);
						if ($options['filterTagMode'] == "blacklist") { 
							if (count($intersects) > 0) continue;
						} else if ($options['filterTagMode'] == "whitelist"){
							if (count($intersects) == 0) continue;
						}
					}
				} else {
					if ($options['filterTagMode'] == "whitelist") continue; // tags are blank and mode is whitelist then skip
				}
			}
			
			$line = array("> BEGIN STRING");
			if ($skipEscape) {
				$line[] = standarizeNewLine($row[0], $thisLineBreak);
			} else {
				$line[] = escapeRPGTransText(standarizeNewLine($row[0], $thisLineBreak));
			}


			$skipDefaultTranslation = false;
			if (is_array($fileData['parameters'][$rowId])) {
				foreach ($fileData['parameters'][$rowId] as $thisParamKey => $thisParams) {
					if (is_numeric($thisParamKey)) continue;
					if ($thisParamKey == "CONTEXT") {
						$contextTranslation = getContextTranslation($fileData, $rowId, $row, $thisLineBreak);
						if (empty($contextTranslation)) {
							// draw normally
							foreach($thisParams as $thisParamVal) {
								$line[] = "> ".$thisParamKey.": ".$thisParamVal;
							}
						} else {
							$line[] = $contextTranslation;
							$skipDefaultTranslation = true;
						}
					} else {
						foreach($thisParams as $thisParamVal) {
							$line[] = "> ".$thisParamKey.": ".$thisParamVal;
						}
					}
				}
			}

			if ($skipDefaultTranslation == false) {
				$thisTranslation = getPrefferedTrans($row);
				if ($skipEscape) {
					$line[] = standarizeNewLine($thisTranslation, $thisLineBreak);
				} else {
					$line[] = escapeRPGTransText(standarizeNewLine($thisTranslation, $thisLineBreak));
				}
			}

			$line[] = "> END STRING";
			$line[] = "";
			//echo "translating : ".$row[0]."\n";
			$thisSegm[] = implode($thisLineBreak, $line);
		}
		
		$newFile = implode($thisLineBreak, $thisSegm);
		file_put_contents(changeExtension(sanitizeFilepath($target."\\patch\\".$fileData['basename']), "txt"), $newFile);
		
		// put version file
		file_put_contents($target."\\RPGMKTRANSPATCH", "> RPGMAKER TRANS PATCH V3");
		
	}
	
	
}


function transToWolfTransFile($data, $target="", $skipEscape=false, $selectedFiles=Array(), $options=null) {
	// $data	: json formatted Project file path
	// $target 	: target path (directory) 
	// return $target path on success, or boolean false on failed.
	global $_PARAM;
	
	if (!is_file($data)) exit;
	
	if (!is_dir($target."\\Patch")) {
		mkdir($target."\\Patch", 777, true);
	}
	if (!is_dir($target."\\Patch\\dump")) {
		mkdir($target."\\Patch\\dump", 777, true);
	}
	if (is_null($options)) {
		//option is not passed
		//try to get from $_POST;
		$options = $_POST['options'];
	}	
	$content = file_get_contents($data);
	$PROJECT = json_decode($content, true);
	foreach ($PROJECT['project']['files'] as $filePath=> $fileData) {
		echo "Converting $filePath \r\n";
		if (!empty($selectedFiles)) {
			if (!in_array($filePath, $selectedFiles)) continue;
		}		
		
		if (strpos($fileData['originalFormat'], 'WOLF TRANS PATCH FILE VERSION') === false) continue; 

		$thisLineBreak = "\r\n";
		if (!empty($fileData['lineBreak'])) $thisLineBreak = $fileData['lineBreak'];

			
		$thisSegm = array();
		$thisSegm[] = $fileData['originalFormat'];
		$thisSegm[] = "";
		foreach ($fileData['data'] as $rowId=>$row) {
			$trimKey = trim($row[0]);
			if (empty($trimKey)) {
				// skip blank line
				if (empty($fileData['parameters'][$rowId])) continue; 
			}

			/* skip if tag is blacklisted /whitelisted */
			if (!empty($options['filterTagMode'])) {
				if (!empty($fileData["tags"][$rowId])) {
					if (is_array($fileData["tags"][$rowId])) {
						$intersects = array_intersect($options['filterTag'], $fileData["tags"][$rowId]);
						//echo("Intersection of tags and blacklistTag:\n");
						//print_r($intersects);
						if ($options['filterTagMode'] == "blacklist") { 
							if (count($intersects) > 0) continue;
						} else if ($options['filterTagMode'] == "whitelist"){
							if (count($intersects) == 0) continue;
						}
					}
				} else {
					if ($options['filterTagMode'] == "whitelist") continue; // tags are blank and mode is whitelist then skip
				}
			}
			


			
			$line = array("> BEGIN STRING");
			if ($skipEscape) {
				$line[] = standarizeNewLine($row[0], $thisLineBreak);
			} else {
				$line[] = escapeRPGTransText(standarizeNewLine($row[0], $thisLineBreak));
			}
			if (is_array($fileData['parameters'][$rowId])) {
				foreach ($fileData['parameters'][$rowId] as $thisParamKey => $thisParams) {
					if (is_numeric($thisParamKey)) continue;
					foreach($thisParams as $thisParamVal) {
						$line[] = "> ".$thisParamKey.":".$thisParamVal;
					}
				}
			}
			$thisTranslation = getPrefferedTrans($row);
			if ($skipEscape) {
				$line[] = standarizeNewLine($thisTranslation, $thisLineBreak);
			} else {
				$line[] = escapeRPGTransText(standarizeNewLine($thisTranslation, $thisLineBreak));
			}
			$line[] = "> END STRING";
			$line[] = "";
			//echo "translating : ".$row[0]."\n";
			$thisSegm[] = implode($thisLineBreak, $line);
		}
		
		$newFile = implode($thisLineBreak, $thisSegm);
		echo "Writing ".$target."\\Patch\\dump\\".$filePath."\r\n";
		$targetPathInfo = pathinfo($target."\\Patch\\dump\\".$filePath);
		if (!is_dir($targetPathInfo['dirname'])) {
			mkdir($targetPathInfo['dirname'], 777, true);
		}
		file_put_contents($target."\\Patch\\dump\\".$filePath, $newFile);
		
	}
	
}




// TES PATCHER
function runTesPatcher($gamePath, $copyTo="", $keepWindow=0) {
	// $gamePath is direct game path where "./Data/main.rvdata2" file is exist
	// return false on failure
	// otherwize return extracted data path
	global $_PARAM;
	$TMP_PATH = $gamePath;
	
	$keepWindow = 0;
	if ($keepWindow) {
		$keepWindow = 1;
	} 
	
	/*
	if (is_file($filePath)) {
		// direct main.rvdata2 file
		$filePathInf = pathinfo($filePath);
	} 
	*/
	$TESFile = glob($TMP_PATH."\\Data\\main.*");
	if (count($TESFile) < 1) {
		return false;
		exit;
	}

	echo "TES encryption found....\n";
	echo "Let's decrypt it....\n";
	//$cmd = "COPY /Y ".escape_win32_argv($_SERVER['APPLICATION_ROOT']."\\3rdParty\\TES_Patcher.exe")." ".escape_win32_argv($TMP_PATH);
	//passthru($cmd);
	$drivePath = explode("\\", $TMP_PATH);
	
$BAT = "
ECHO OFF
CLS
ECHO ============================================
ECHO RUNNING TES PATCHER
ECHO https://github.com/Sinflower/TES-Patcher
ECHO extracting some encrypted file
ECHO don't close this window!
ECHO ============================================
".$drivePath[0]."
CD ".escape_win32_argv($TMP_PATH)."
".escape_win32_argv($_PARAM['RUBY_BIN'])." ".escape_win32_argv($_SERVER['APPLICATION_ROOT']."\\3rdParty\\TES-Patcher\\TES_Patcher.rb")." -e
REM TES_Patcher.exe -e
REM del TES_Patcher.exe
REM del runpatch.bat
REM PAUSE
";	
	
	file_put_contents($TMP_PATH."\\runpatch.bat", $BAT);
	sleep(2);
	//$cmd = escape_win32_argv($TMP_PATH."\\TES_Patcher.exe")." -e";
	$ORIG_CWD = getcwd();
	chdir($TMP_PATH);
	echo "\n\nCurrent CWD".getcwd()."\r\n";
	$cmd = escape_win32_argv($TMP_PATH."\\runpatch.bat");
	echo $cmd;
	$shell = new COM("WScript.Shell");
	$oExec = $shell->Run($cmd, 1, true);
	chdir($ORIG_CWD);
	echo "\n\nCurrent CWD".getcwd()."\r\n";
	echo "successfully decrypt files to : ".$TMP_PATH."\\extract_main\n";
	if (empty($copyTo)) {
		return $TMP_PATH."\\extract_main";
	} else {
		if (!is_dir($copyTo)) {
			if (!mkdir($copyTo, 777, true)) {
				echo "Failed to create directory : ".$copyTo."\n";
				return $TMP_PATH."\\extract_main";
				exit;
			}
		}
		/*
		$cmd = "robocopy ".escape_win32_argv($TMP_PATH."\\extract_main")." ".escape_win32_argv($copyTo)." /s";
		echo $cmd."\n";
		passthru($cmd);
		*/
		copy_tree($TMP_PATH."\\extract_main", $copyTo);
		$cmd = "RMDIR ".escape_win32_argv($TMP_PATH."\\extract_main")." /S /Q";
		echo $cmd."\n";
		passthru($cmd);
		
		return $copyTo;
	}

}


function applyTesPatcher($TMP_PATH, $copyTo="", $keepWindow=0) {
	// $gamePath is direct game path where "./Data/main.rvdata2" file is exist
	// return false on failure
	// otherwize return extracted data path
	global $_PARAM;

	$transPath = $TMP_PATH."\\autosave.json";
	if (!empty($_POST['transPath'])) $transPath = $_POST['transPath'];

	
	$keepWindow = 0;
	if ($keepWindow) {
		$keepWindow = 1;
	} 
	
	if (is_dir($TMP_PATH."\\data-tes\\extract_main") == false) {
		return false;
		exit;
	}
	
	// rename original file
	rename($TMP_PATH."\\data-tes\\extract_main", $TMP_PATH."\\data-tes\\extract_main_orig");
	echo "TES data found....\n";
	echo "Let's build....\n";
	
	echo "GENERATING NEW PATCH FROM .TRANS FILE";
	echo "==========================================";
	transToTESfile($transPath, $TMP_PATH."\\data-tes");	
	
	
	//$cmd = "COPY /Y ".escape_win32_argv($_SERVER['APPLICATION_ROOT']."\\3rdParty\\TES-Patcher\\TES_Patcher.exe")." ".escape_win32_argv($TMP_PATH."\\data-tes");
	//passthru($cmd);
	$drivePath = explode("\\", $TMP_PATH);
$BAT = "
ECHO OFF
CLS
ECHO ============================================
ECHO RUNNING TES PATCHER
ECHO https://github.com/Sinflower/TES-Patcher
ECHO Applying patch
ECHO don't close this window!
ECHO ============================================
".$drivePath[0]."
CD ".escape_win32_argv($TMP_PATH."\\data-tes")."
ECHO Current Dir : %CD%
".escape_win32_argv($_PARAM['RUBY_BIN'])." ".escape_win32_argv($_SERVER['APPLICATION_ROOT']."\\3rdParty\\TES-Patcher\\TES_Patcher.rb")." -p
REM TES_Patcher.exe -p
REM del TES_Patcher.exe
REM del runpatch.bat
REM PAUSE
";	
	
	file_put_contents($TMP_PATH."\\data-tes\\runpatch.bat", $BAT);
	
	//$cmd = escape_win32_argv($TMP_PATH."\\TES_Patcher.exe")." -e";
	$cmd = escape_win32_argv($TMP_PATH."\\data-tes\\runpatch.bat");
	echo $cmd;
	$shell = new COM("WScript.Shell");
	$oExec = $shell->Run($cmd, 1, true);
	
	echo "\n\nCurrent CWD".getcwd();
	echo "successfully build files to : ".$TMP_PATH."\\data-tes\n";
	
	echo "removing cache ... ";
	passthru("RMDIR ".escape_win32_argv($TMP_PATH."\\data-tes\\extract_main")." /S /Q");
	rename($TMP_PATH."\\data-tes\\extract_main_orig", $TMP_PATH."\\data-tes\\extract_main");
	echo "done!\n";
	
	if (empty($copyTo)) {
		$result = glob($TMP_PATH."\\data-tes\\main.*");
		return $result[0];
	} else {
		if (!is_dir($copyTo)) {
			if (!mkdir($copyTo, 777, true)) {
				echo "Failed to create path : ".$copyTo."\n";
				$result = glob($TMP_PATH."\\data-tes\\main.*");
				return $result[0];
				exit;
			}
		}
		$cmd = "copy /y ".escape_win32_argv($TMP_PATH."\\data-tes\\main.*")." ".escape_win32_argv($copyTo);
		echo $cmd."\n";
		passthru($cmd);

		$result = glob($copyTo."\\main.*");
		return $result[0];
		
	}
}

function transToTESfile($data, $target="") {
	// $data	: json formatted Project file path
	// $target 	: target path (directory) 
	// return $target path on success, or boolean false on failed.
	global $_PARAM;
	
	echo "\r\nBuilding TES feed data from : $data \r\n";
	echo "Target :  $target \r\n";
	if (!is_file($data)) exit;
	
	if (!is_dir($target."\\extract_main")) {
		mkdir($target."\\extract_main", 777, true);
	}
	
	$content = file_get_contents($data);
	$PROJECT = json_decode($content, true);
	foreach ($PROJECT['project']['files'] as $filePath=> $fileData) {
		if (strpos($fileData['originalFormat'], 'ANTI TES PATCH FILE') === false) continue;
		echo "Building TES data : ".$fileData['basename']."\r\n";
		$thisLineBreak = "\r\n";
		if (!empty($fileData['lineBreak'])) $thisLineBreak = $fileData['lineBreak'];

			
		$thisSegm = array();
		$thisSegm[] = $fileData['originalFormat'];
		foreach ($fileData['data'] as $rowId=>$row) {
			if (empty($row[0])) continue; // skip empty key
			
			$line = array("> BEGIN STRING");
			$line[] = $row[0];
			foreach ($fileData['parameters'][$rowId] as $thisParamKey => $thisParams) {
				if (is_numeric($thisParamKey)) continue;
				foreach($thisParams as $thisParamVal) {
					$line[] = "> ".$thisParamKey.": ".$thisParamVal;
				}
			}
			/*
			$line[] = "> EVENT CODE: ".$fileData['parameters'][$rowId]['EVENT CODE'];
			$line[] = "> VALUE ID: ".$fileData['parameters'][$rowId]['VALUE ID'];
			$line[] = "> PARAMETER ID: ".$fileData['parameters'][$rowId]['PARAMETER ID'];
			*/
			$thisTranslation = getPrefferedTrans($row);
			$line[] = $thisTranslation;
			$line[] = "> END STRING";
			$line[] = "";
			//echo "translating : ".$row[0]."\n";
			$thisSegm[] = implode($thisLineBreak, $line);
		}
		
		$newFile = implode($thisLineBreak, $thisSegm);
		echo "saving to : ".$target."\\extract_main\\".$fileData['basename']."\r\n";
		file_put_contents($target."\\extract_main\\".$fileData['basename'], $newFile);
		
	}
	
	
}

function strToHex($string){
	$hex = '';
	for ($i=0; $i<strlen($string); $i++){
		$ord = ord($string[$i]);
		$hexCode = dechex($ord);
		$hex .= substr('0'.$hexCode, -2);
	}
	return strToUpper($hex);
}

function is_enigma($path) {
	$result = false;

	
	if (is_file($path)==false) {
		return false;
		exit;
	}
	
	$handle = fopen($path, "r");
	$contents = fread($handle, 1024*5);
	/*
	file_put_contents("D:\\TMP\\chunck2.txt", $contents);
	
	$chunk = mb_substr($contents, 0, 50);
	
	
	echo strToHex($chunk)."\n";
	
	$expectedHeader = "4D5A90000300000004000000FFFF0000B8000000000000004000000000000000000000000000000000000000000000000000";
	
	echo $expectedHeader."\n";
	echo strToHex($chunk)."\n";
	
	
	if (strToHex($chunk) == $expectedHeader) {
		echo "is enigma!\n";
		return true;
	} else {
		echo "Not enigma!\n";
		return false;
	}
	
	*/
	
	if (mb_strpos($contents, "enigma") !== false) {
		return true;
	} else {
		return false;
	}
	fclose($handle);
	
		
}


function is_rm2000($path) {
	/*
		$path is exe file of rpgMaker 2000
		return true if given $path is exe file of RPG Maker 2000
	*/	
	if (is_file($path)==false) {
		return false;
		exit;
	}
	
	$handle = fopen($path, "rb");
	fseek($handle, 288);
	$contents = fread($handle, 32);	
	
	$thisHex = strToHex($contents);
	return $thisHex === '00A201000000000030CC09000010000000D00900000040000010000000020000';
}

function is_rm2000Dir($dirPath) {
	/*
		$dirPath is root directory of game project
		if $dirPath is a file, the directory of the file will be processed;
		return true if the $dirPath contains exe file of RPG Maker 2000
	*/
	$dirPath = realpath($dirPath);
	if (is_file($dirPath)) {
		$thisPathInfo = pathinfo($dirPath);
		$dirPath = $thisPathInfo['dirname'];
	}
	if (!is_dir($dirPath)) return false;
	
	if (is_file($dirPath."\\RPG_RT.exe")) {
		return is_rm2000($dirPath."\\RPG_RT.exe");
	}
	
	
	$dirContent = glob($dirPath."\\*.exe");
	foreach ($dirContent as $val) {
		if (is_rm2000($val)) return true;
		
	}
	return false;
}


function getProjectCahePath($projectId="") {
	/*
		return project cache path from $_POST['projectId']
	*/
	if (empty($projectId)) $projectId = $_POST['projectId'];
	$_PARAM['APP_PATH'] = substr(__FILE__ , 0, strrpos(__FILE__, "www".DIRECTORY_SEPARATOR));
	//$_PARAM['CACHE_PATH'] = $_PARAM['APP_PATH']."www\\php\\cache\\";
	$_PARAM['CACHE_PATH'] = $_SERVER['STAGING_PATH']."\\";
	
	$thisCache = $_PARAM['CACHE_PATH'].$projectId;
	$thisCache = str_replace("/", "\\", $thisCache);
	return $thisCache;
}

function sanitizeFilepath($path) {
	/*
		$path : string
		return sanitized path
	*/
	$path = str_replace("\\\\", "\\", $path);
	$path = str_replace("::", "\u{FF1A}\u{FF1A}", $path);
	return $path;
}

function deSanitizeFilepath($path) {
	/*
		$path : string
		return sanitized path
	*/
	$path = str_replace("\u{FF1A}", ":", $path);
	return $path;
}

function exportToRMTrans($transFile, $outputFolder, $selectedFiles=array(), $options=null) {
	/*
	
	*/
	if (!is_file($transFile)) {
		echo "Unable to find $transFile\r\n";
		return false;
	}
	
	if (!is_dir($outputFolder)) {
		if(mkdir($outputFolder, 777, true) === false) {
			echo "Unable to create folder : $outputFolder\r\n";
			return false;
		}
	}
	
	$transData = json_decode(file_get_contents($transFile), true);
	echo ("Current game Engine : ".$transData['project']['gameEngine']."\r\n");
	if ($transData['project']['gameEngine'] == 'rmvxace') {
		transToRPGTransFile($transFile, $outputFolder, false, $selectedFiles, $options);
		echo "Extracting ANTI TES data (if any)\r\n";
		transToTESfile($transFile, $outputFolder);
		
	} elseif ($transData['project']['gameEngine'] == 'wolf') {
		transToWolfTransFile($transFile, $outputFolder, false, $selectedFiles, $options);
	} else {
		transToRPGTransFile($transFile, $outputFolder, false, $selectedFiles, $options, true);
	}
	
	
}

function exportToCSV($transFile, $outputFolder, $selectedFiles=array()) {
	if (!is_file($transFile)) {
		echo "Unable to find $transFile\r\n";
		return false;
	}
	
	if (!is_dir($outputFolder)) {
		if(mkdir($outputFolder, 777, true) === false) {
			echo "Unable to create folder : $outputFolder\r\n";
			return false;
		}
	}

	$transData = json_decode(file_get_contents($transFile), true);
	
	if (!is_array($transData['project']['files'])) {
		echo "Unable to parse data!\r\n";
		return false;
	}
	
	foreach ($transData['project']['files'] as $filePath=>$fileData) {
		echo "Processing : $filePath\r\n";
		
		$fullPath = str_replace("/", "\\", $outputFolder."\\".$filePath);
		$fullPathInfo = pathinfo($fullPath);
		if (!is_dir($fullPathInfo['dirname'])) {
			if(mkdir($fullPathInfo['dirname'], 777, true) === false) {
				echo "Unable to create folder : ".$fullPathInfo['dirname']."\r\n";
				continue;
			}
		}
		if (!is_array($fileData['data'])) {
			echo "Expected array data is not an array for : ".$filePath."\r\n";
			continue;
		}
		
		$fp = fopen($fullPathInfo['dirname']."\\".sanitizeFilepath($fullPathInfo['filename']).".csv", 'w');
		fputcsv($fp, $transData['colHeaders']);
		
		foreach ($fileData['data'] as $fields) {
			fputcsv($fp, $fields);
		}
		fclose($fp);
	}
}


function exportToXls($transFile, $outputFolder, $selectedFiles=array()) {
	
	if (!is_file($transFile)) {
		echo "Unable to find $transFile\r\n";
		return false;
	}
	
	if (!is_dir($outputFolder)) {
		if(mkdir($outputFolder, 777, true) === false) {
			echo "Unable to create folder : $outputFolder\r\n";
			return false;
		}
	}

	$transData = json_decode(file_get_contents($transFile), true);
	
	if (!is_array($transData['project']['files'])) {
		echo "Unable to parse data!\r\n";
		return false;
	}
	
	foreach ($transData['project']['files'] as $filePath=>$fileData) {
		//echo "Processing : $filePath\r\n";
		if (!empty($selectedFiles)) {
			if (!in_array($filePath, $selectedFiles)) continue;
		}	
		
		$fullPath = str_replace("/", "\\", $outputFolder."\\".$filePath);
		$fullPathInfo = pathinfo($fullPath);
		if (!is_dir($fullPathInfo['dirname'])) {
			if(mkdir($fullPathInfo['dirname'], 777, true) === false) {
				echo "Unable to create folder : ".$fullPathInfo['dirname']."\r\n";
				continue;
			}
		}
		if (!is_array($fileData['data'])) {
			echo "Expected array data is not an array for : ".$filePath."\r\n";
			continue;
		}
		
		$spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
		$writer = new \PhpOffice\PhpSpreadsheet\Writer\Xls($spreadsheet);	
		$writer->setPreCalculateFormulas(false);


		if ($_POST['options']['sheetOption']['includeHeader'] && is_array($transData['colHeaders'])) {
			echo "Writing data with header";
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($transData['colHeaders'], NULL, 'A1');
			$sheet->fromArray($fileData['data'], NULL, 'A2');
		} else {
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($fileData['data'], NULL, 'A1');
		}
		
		echo "writing : ".$fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".xls";
		$writer->save(sanitizeFilepath($fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".xls"));
		
	}
}

function exportToXlsx($transFile, $outputFolder, $selectedFiles=array()) {
	
	if (!is_file($transFile)) {
		echo "Unable to find $transFile\r\n";
		return false;
	}
	
	if (!is_dir($outputFolder)) {
		if(mkdir($outputFolder, 777, true) === false) {
			echo "Unable to create folder : $outputFolder\r\n";
			return false;
		}
	}

	$transData = json_decode(file_get_contents($transFile), true);
	
	if (!is_array($transData['project']['files'])) {
		echo "Unable to parse data!\r\n";
		return false;
	}
	
	foreach ($transData['project']['files'] as $filePath=>$fileData) {
		//echo "Processing : $filePath\r\n";
		if (!empty($selectedFiles)) {
			if (!in_array($filePath, $selectedFiles)) continue;
		}	
		
		$fullPath = str_replace("/", "\\", $outputFolder."\\".$filePath);
		$fullPathInfo = pathinfo($fullPath);
		if (!is_dir($fullPathInfo['dirname'])) {
			if(mkdir($fullPathInfo['dirname'], 777, true) === false) {
				echo "Unable to create folder : ".$fullPathInfo['dirname']."\r\n";
				continue;
			}
		}
		if (!is_array($fileData['data'])) {
			echo "Expected array data is not an array for : ".$filePath."\r\n";
			continue;
		}
		
		$spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
		$writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);	
		$writer->setPreCalculateFormulas(false);

		if ($_POST['options']['sheetOption']['includeHeader'] && is_array($transData['colHeaders'])) {
			echo "Writing data with header";
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($transData['colHeaders'], NULL, 'A1');
			$sheet->fromArray($fileData['data'], NULL, 'A2');
		} else {
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($fileData['data'], NULL, 'A1');
		}

		echo "writing : ".$fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".xlsx";
		$writer->save(sanitizeFilepath($fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".xlsx"));
		
	}
}


function exportToCSV2($transFile, $outputFolder, $selectedFiles=array()) {
	
	if (!is_file($transFile)) {
		echo "Unable to find $transFile\r\n";
		return false;
	}
	
	if (!is_dir($outputFolder)) {
		if(mkdir($outputFolder, 777, true) === false) {
			echo "Unable to create folder : $outputFolder\r\n";
			return false;
		}
	}

	$transData = json_decode(file_get_contents($transFile), true);
	
	if (!is_array($transData['project']['files'])) {
		echo "Unable to parse data!\r\n";
		return false;
	}
	
	foreach ($transData['project']['files'] as $filePath=>$fileData) {
		//echo "Processing : $filePath\r\n";
		if (!empty($selectedFiles)) {
			if (!in_array($filePath, $selectedFiles)) continue;
		}	
		
		$fullPath = str_replace("/", "\\", $outputFolder."\\".$filePath);
		$fullPathInfo = pathinfo($fullPath);
		if (!is_dir($fullPathInfo['dirname'])) {
			if(mkdir($fullPathInfo['dirname'], 777, true) === false) {
				echo "Unable to create folder : ".$fullPathInfo['dirname']."\r\n";
				continue;
			}
		}
		if (!is_array($fileData['data'])) {
			echo "Expected array data is not an array for : ".$filePath."\r\n";
			continue;
		}
		
		$spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
		$writer = new \PhpOffice\PhpSpreadsheet\Writer\Csv($spreadsheet);	
		$writer->setPreCalculateFormulas(false);
		if ($_POST['options']['sheetOption']['includeHeader'] && is_array($transData['colHeaders'])) {
			echo "Writing data with header";
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($transData['colHeaders'], NULL, 'A1');
			$sheet->fromArray($fileData['data'], NULL, 'A2');
		} else {
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($fileData['data'], NULL, 'A1');
		}
		
		echo "writing : ".$fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".csv";
		$writer->save(sanitizeFilepath($fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".csv"));
		
	}
}


function exportToHtml($transFile, $outputFolder, $selectedFiles=array()) {
	
	if (!is_file($transFile)) {
		echo "Unable to find $transFile\r\n";
		return false;
	}
	
	if (!is_dir($outputFolder)) {
		if(mkdir($outputFolder, 777, true) === false) {
			echo "Unable to create folder : $outputFolder\r\n";
			return false;
		}
	}

	$transData = json_decode(file_get_contents($transFile), true);
	
	if (!is_array($transData['project']['files'])) {
		echo "Unable to parse data!\r\n";
		return false;
	}
	
	foreach ($transData['project']['files'] as $filePath=>$fileData) {
		//echo "Processing : $filePath\r\n";
		if (!empty($selectedFiles)) {
			if (!in_array($filePath, $selectedFiles)) continue;
		}	
		
		$fullPath = str_replace("/", "\\", $outputFolder."\\".$filePath);
		$fullPathInfo = pathinfo($fullPath);
		if (!is_dir($fullPathInfo['dirname'])) {
			if(mkdir($fullPathInfo['dirname'], 777, true) === false) {
				echo "Unable to create folder : ".$fullPathInfo['dirname']."\r\n";
				continue;
			}
		}
		if (!is_array($fileData['data'])) {
			echo "Expected array data is not an array for : ".$filePath."\r\n";
			continue;
		}
		
		$spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
		$writer = new \PhpOffice\PhpSpreadsheet\Writer\Html($spreadsheet);	
		$writer->setPreCalculateFormulas(false);

		if ($_POST['options']['sheetOption']['includeHeader'] && is_array($transData['colHeaders'])) {
			echo "Writing data with header";
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($transData['colHeaders'], NULL, 'A1');
			$sheet->fromArray($fileData['data'], NULL, 'A2');
		} else {
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($fileData['data'], NULL, 'A1');
		}
		
		echo "writing : ".$fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".html";
		$writer->save(sanitizeFilepath($fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".html"));
		
	}
}

function exportToOds($transFile, $outputFolder, $selectedFiles=array()) {
	
	if (!is_file($transFile)) {
		echo "Unable to find $transFile\r\n";
		return false;
	}
	
	if (!is_dir($outputFolder)) {
		if(mkdir($outputFolder, 777, true) === false) {
			echo "Unable to create folder : $outputFolder\r\n";
			return false;
		}
	}

	$transData = json_decode(file_get_contents($transFile), true);
	
	if (!is_array($transData['project']['files'])) {
		echo "Unable to parse data!\r\n";
		return false;
	}
	
	foreach ($transData['project']['files'] as $filePath=>$fileData) {
		//echo "Processing : $filePath\r\n";
		if (!empty($selectedFiles)) {
			if (!in_array($filePath, $selectedFiles)) continue;
		}	
		
		$fullPath = str_replace("/", "\\", $outputFolder."\\".$filePath);
		$fullPathInfo = pathinfo($fullPath);
		if (!is_dir($fullPathInfo['dirname'])) {
			if(mkdir($fullPathInfo['dirname'], 777, true) === false) {
				echo "Unable to create folder : ".$fullPathInfo['dirname']."\r\n";
				continue;
			}
		}
		if (!is_array($fileData['data'])) {
			echo "Expected array data is not an array for : ".$filePath."\r\n";
			continue;
		}
		
		$spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
		$writer = new \PhpOffice\PhpSpreadsheet\Writer\Ods($spreadsheet);	
		$writer->setPreCalculateFormulas(false);

		if ($_POST['options']['sheetOption']['includeHeader'] && is_array($transData['colHeaders'])) {
			echo "Writing data with header";
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($transData['colHeaders'], NULL, 'A1');
			$sheet->fromArray($fileData['data'], NULL, 'A2');
		} else {
			$sheet = $spreadsheet->getActiveSheet();
			$sheet->fromArray($fileData['data'], NULL, 'A1');
		}
		
		echo "writing : ".$fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".ods";
		$writer->save(sanitizeFilepath($fullPathInfo['dirname']."\\".$fullPathInfo['filename'].".ods"));
		
	}
}

function hasTags($fileData, $rowId, $tags) {
	// will return true if has one or more in tags
	// $fileData is file object where data, context and tags exist
	if (empty($tags)) return false;
	if (!is_array($tags)) $tags = [$tags];
	if (empty($fileData['tags'])) return false;
	if (empty($fileData['tags'][$rowId])) return false;
	
	foreach($fileData['tags'][$rowId] as $key=>$val) {
		if (in_array($val, $tags)) return true;
	}
	return false;
}

// GET TRANSLATION
function generateTranslationPairs($file="", $options = array()) {
	/*
		$file = path to trans file or trans data
		
		$result = {
			"key translation": {
					"*": "translation result", // default translation result with context *
					"context1" :"context translation if exist",
					"context2" :"context translation if exist"
				}
		}	

		todo: create handler for custom translation by context
	*/
	if (empty($options)) $options = $_POST['options'];
	
	global $_PARAM;
	if (!empty($_PARAM['TRANSLATION_PAIRS'])) return $_PARAM['TRANSLATION_PAIRS'];
	if (empty($file)) $file = $_POST['transFile'];
	
	echo "Generating translation pair from : $file \n";

	$TRANS = array();
	if (!empty($TRANS = json_decode($file, true))) {
		$TRANS = json_decode($file, true);
	} else if (is_file($file)) {
		$TRANS = json_decode(file_get_contents($file), true);
	}
	

	$_PARAM['TRANSLATION_PAIRS'] = array();
	if (empty($TRANS)) {
		return $_PARAM['TRANSLATION_PAIRS'];
	}
	
	if (empty($TRANS['project'])) return $_PARAM['TRANSLATION_PAIRS'];
	if (empty($TRANS['project']['files'])) return $_PARAM['TRANSLATION_PAIRS'];
	foreach ($TRANS['project']['files'] as $filePath => $fileData) {
		//echo "handling $filePath\r\n";
		if (empty($fileData)) continue;
		if (empty($fileData['data'])) continue;
		if (empty($fileData['keyColumn'])) $fileData['keyColumn']=0;
		foreach ($fileData['data'] as $rowNum => $ROW) {
			//print_r($ROW);
			if (empty($ROW[$fileData['keyColumn']])) continue; // skip null key
			//echo "pass here";
			// when project.files[].preferredTranslationColumn is empty
			
			//checking tags
			if (!empty($options['filterTagMode']) && !empty($options['filterTag'])) {
				$hasTags = hasTags($fileData, $rowNum, $options['filterTag']);
				
				if ($options['filterTagMode'] == 'whitelist') {
					if (!$hasTags) continue;
				} else {
					if ($hasTags) continue;
				}
			}
			//end of checking tags
			
			for ($i=count($ROW)-1; $i>=0; $i--) {
				//echo "handling row : $rowNum; col: $i with value : ".$ROW[$i]."\r\n";
				if ($i == $fileData['keyColumn']) continue;
				if (!empty($ROW[$i])) {
					//echo "assigning value\r\n";
					$_PARAM['TRANSLATION_PAIRS'][$ROW[$fileData['keyColumn']]]['*'] = $ROW[$i];
					break;
				}
			}
		}
	}
	
	return $_PARAM['TRANSLATION_PAIRS'];
}

/*
//old, before 2020/09/19
function generateTranslationPairs($file="", $options = array()) {

	global $_PARAM;
	if (!empty($_PARAM['TRANSLATION_PAIRS'])) return $_PARAM['TRANSLATION_PAIRS'];
	if (empty($file)) $file = $_POST['transFile'];
	
	$TRANS = array();
	if (!empty($TRANS = json_decode($file, true))) {
		$TRANS = json_decode($file, true);
	} else if (is_file($file)) {
		$TRANS = json_decode(file_get_contents($file), true);
	}
	

	$_PARAM['TRANSLATION_PAIRS'] = array();
	if (empty($TRANS)) {
		return $_PARAM['TRANSLATION_PAIRS'];
	}
	
	if (empty($TRANS['project'])) return $_PARAM['TRANSLATION_PAIRS'];
	if (empty($TRANS['project']['files'])) return $_PARAM['TRANSLATION_PAIRS'];
	foreach ($TRANS['project']['files'] as $filePath => $fileData) {
		//echo "handling $filePath\r\n";
		if (empty($fileData)) continue;
		if (empty($fileData['data'])) continue;
		if (empty($fileData['keyColumn'])) $fileData['keyColumn']=0;
		foreach ($fileData['data'] as $rowNum => $ROW) {
			//print_r($ROW);
			if (empty($ROW[$fileData['keyColumn']])) continue; // skip null key
			//echo "pass here";
			// when project.files[].preferredTranslationColumn is empty
			for ($i=count($ROW)-1; $i>=0; $i--) {
				//echo "handling row : $rowNum; col: $i with value : ".$ROW[$i]."\r\n";
				if ($i == $fileData['keyColumn']) continue;
				if (!empty($ROW[$i])) {
					//echo "assigning value\r\n";
					$_PARAM['TRANSLATION_PAIRS'][$ROW[$fileData['keyColumn']]]['*'] = $ROW[$i];
					break;
				}
			}
		}
	}
	
	return $_PARAM['TRANSLATION_PAIRS'];
}
*/

function getTranslation($word, $context="", $transFile="", $options = array()) {
	// to do : create handler for context
	global $_PARAM;
	$TRANSPAIR = generateTranslationPairs($transFile, $options);
	if (!empty($TRANSPAIR)) $result =  $TRANSPAIR[$word] ?? null;
	if (!empty($result['*'])) return $TRANSPAIR[$word]['*'];
}

function detectFileEncoding($path) {
	$cmd = $_SERVER["APPLICATION_ROOT"]."\\3rdParty\\GnuWin32\\bin\\file.exe --mime-encoding ".escape_win32_argv($path);
	$result = exec($cmd);
	$result = explode(";", $result);
	$encoding = trim($result[1]);
	if (strpos($encoding, "unknown") === false) return $encoding;

	// retry
	$chunk = 1024*1024;
	if (filesize($path) < $chunk) $chunk = filesize($path);
	$handle = fopen($path, "r");
	$contents = fread($handle, $chunk);
	fclose($handle);
	$encoding = mb_detect_encoding($contents, ["shift-jis", "JIS", 'ISO-8859-1', "UTF-8"], true);
	return strtolower($encoding);
}