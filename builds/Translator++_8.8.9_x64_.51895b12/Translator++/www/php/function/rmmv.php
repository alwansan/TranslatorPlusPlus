<?php

function get_rmmv_application_path() {
	static $cache = null;

	if ($cache !== null) {
		return $cache;
	}
  
	$str = shell_exec('Reg.exe QUERY "HKEY_LOCAL_MACHINE\SOFTWARE\Classes\RPGMV.Project\shell\open\command"');
	//echo substr(substr($reg, strpos($reg, '"')+1);

	//forward slashes are the start and end delimeters
	//third parameter is the array we want to fill with matches
	if (preg_match('/"([^"]+)"/', $str, $m)) {
		$cache = $m[1];
		return $m[1];
	} else {
	   //preg_match returns the number of matches found, 
	   //so if here didn't match pattern
	   $cache = false;
	   return false;
	}
	return false;
}

function get_rmmv_install_path() {
	$path = get_rmmv_application_path();
	if (!$path) {
		return false;
	}
	
	$pathinfo = pathinfo($path);
	return $pathinfo['dirname']."\\";
}

function is_rmmv_steam() {
	$install = get_rmmv_install_path();
	if (!$install) {
		return false;
	}
	$install = strtolower($install);
	if (strpos($install, "\\steamapps\\") === false) {
		return false;
	} else {
		return true;
	}
}

function get_rmmv_tool_path() {
	if (is_rmmv_steam()) {
		return get_rmmv_install_path()."tool\\";
	} else {
		return realpath(get_rmmv_install_path()."..\\")."\\";
	}
}

function is_rmmv_tool_deployed() {
	$path = get_rmmv_tool_path();
	return is_file($path."ToyBox\\Identification\\app");
}

function getRegValue($regPath) {
	$output = shell_exec("REG QUERY $regPath");
	$lines = explode("\n", $output);
	$RESULT = array();
	foreach ($lines as $index=>$line) {
		if (empty($line)) continue;
		if ($index==1) {
			$RESULT['path'] = $line;
		} else if(preg_match("/\s+([A-Za-z0-9_\(\)]+)\s+(\w+)\s+(.*)/", $line, $matches)){
			$x[$matches[1]] = array(
				'value' => $matches[3],
				'type' => $matches[2]
			);
			$RESULT['objects'] = $x; 
		} else {
			$elm = substr($line, strlen($RESULT['path'])+1);
			$RESULT['keys'][] = $elm;
		}

	}

	return $RESULT;
}

function write_to_registry($path, $key="", $value="", $type="REG_SZ") {
	$value = str_replace('"', "\\\"", $value);
	$str = 'reg add "'.$path.'" /f /v '.$key.' /t '.$type.' /d "'.$value.'"';
	$result = shell_exec($str);
}

function fetch_from_registry($path, $name="") {
	$str = shell_exec('for /f "tokens=3*" %a in (\'reg query "'.$path.'" /v '.$name.'\') do echo %a %b');
	//echo substr(substr($reg, strpos($reg, '"')+1);
	$lines = explode("\n", $str);
	if (count($lines) < 2) {
		return false;
	}
	$lines[1] = "";
	$str = trim(implode("\n", $lines));
	return $str;	
}

function get_rmmv_opened_project() {
	static $cache = null;

	if ($cache !== null) {
		return $cache;
	}
	
	$result = fetch_from_registry('HKEY_CURRENT_USER\Software\KADOKAWA\RPGMV', 'projectFileUrl');
	if ($result !== false) {
		$result = substr($result, 8);
	}
	
	$cache = $result;
	return $result;
}

function get_rmmv_tools() {
	static $cache = null;

	if ($cache !== null) {
		return $cache;
	}
	
	$result = fetch_from_registry('HKEY_CURRENT_USER\Software\KADOKAWA\RPGMV', 'mvTools');
	if ($result !== false) {
		$result = json_decode($result, true);
	}
	
	$cache = $result;
	return $result;
}

function is_rmmv_tool_registry_exist() {
	global $_PARAM;
	$mvTools = get_rmmv_tools();
	foreach ($mvTools as $key=>$tool) {
		if ($tool['appName'] == $_PARAM['TOYBOX']['appName']) {
			return true;
		}
	}
	return false;
}

function add_toybox_as_tool() {
	global $_PARAM;
	
	if (is_rmmv_tool_registry_exist()) {
		return true;
	}
	
	
	$TOOLS = get_rmmv_tools();
	
	$toybox['appName'] 	= $_PARAM['TOYBOX']['appName'];
    $toybox['hint'] 	= $_PARAM['TOYBOX']['description'];
    $toybox['name'] 	= $_PARAM['TOYBOX']['appTitle'];
    $toybox['path'] 	= str_replace("\\", "/", realpath($_SERVER['SERVER_ROOT']."\\..\\"));
	$TOOLS[] = $toybox;

	write_to_registry('HKEY_CURRENT_USER\Software\KADOKAWA\RPGMV', "mvTools", json_encode($TOOLS));
	
}

function remove_toybox_from_tool() {
	global $_PARAM;
	
	if (is_rmmv_tool_registry_exist() == false) {
		return true;
	}
	
	
	$mvTools = get_rmmv_tools();
	$TOOLS = array();
	foreach ($mvTools as $key=>$tool) {
		if ($tool['appName'] !== $_PARAM['TOYBOX']['appName']) {
			$TOOLS[] = $tool;
		}
	}
	
	write_to_registry('HKEY_CURRENT_USER\Software\KADOKAWA\RPGMV', "mvTools", json_encode($TOOLS));
	
}


/*for export & inport*/
function validate_string($string) {
	if (empty($string)) {
		return "";
	} else {
		return "$string";
	}
}
function validate_boolean($boolean) {
	if (strtolower($boolean) == "false" || strtolower($boolean) == "'false'" || strtolower($boolean) == '"false"') {
		return false;
	} else {
		if ((bool) $boolean) {
			return true;
		}
	}
	return false;
}
function validate_integer($integer) {
	return intval($integer);
}

/*end of for export inport*/


function is_RMMV_projectpath($path) {
	if (is_file($path."data/System.json") && is_file($path."js/rpg_core.js")) {
		return true;
	} else {
		return false;
	}
}

function get_game_variable() {
	global $_PARAM;
	$systemJSON = file_get_contents($_PARAM['PATH_TO_PROJECT']."data/System.json");
	$system = json_decode($systemJSON, 1);
	
	foreach ($system['variables'] as $key => $val) {
		if (!empty($val)) {
			$line[$key] =$val;
		}
	}	
	return 	$line;
		
}

function get_game_items() {
	global $_PARAM;
	$JSON = file_get_contents($_PARAM['PATH_TO_PROJECT']."data/Items.json");
	$system = json_decode($JSON, 1);
	
	foreach ($system as $key => $val) {
		if (!empty($val)) {
			$line[$key] =$val;
		}
	}	
	return 	$line;
		
}


function parse_syntax($syntax, $setData = array()) {
	if (!empty($syntax)) {
		// game variable
		$gameVariable = get_game_variable();
		foreach ($gameVariable as $key=>$val) {
			$src[] = "<#var=".$val."#>";
			$rep[] = '$gameVariables._data['.$key.']';
		}
		
		// game has common item
		$gameItems = get_game_items();
		foreach ($gameItems as $key=>$val) {
			$src[] = "<#hasitem=".$val."#>";
			$rep[] = '$gameParty.hasItem($dataItems['+$key+'])';
		}
		
		if (strpos($syntax, '<#getThisSetNumber#>')!==false) {
			if (!empty($setData['message_pool_id'])) {
				$pageNum = execute_sql("SELECT count(*) as rowNum FROM message_pool_text WHERE message_pool_id='$setData[message_pool_id]'");
			}
			$src[] = "<#getThisSetNumber#>";
			$rep[] = $pageNum['rowNum'];
		}
		
		return str_replace($src, $rep, $syntax);
	} else {
		return "0";
	}
}

function parse_show_text($txt) {
	$nSrc = array("\r\n","\n", "\r");
	$nRep = array('\\n','\\n', "");
	$result = str_replace($nSrc, $nRep, $txt);;
	
	return $result;
}

function prepare_string($string){
	if(strlen($string) == 0) {
		return "[?-BLANK_SUBSTITUTE-?]";
	} else {
		return $string;
	}
}

function validate_text($txt) {
	$nSrc = array("\r\n","\n", "\r");
	$nRep = array('','', "");
	$result = str_replace($nSrc, $nRep, $txt);;
	
	return $result;
}

function process_interpreter_text($segment) {
	$text = $segment["arg"][0];
	
}
function eval_boolean($arg) {
	//echo "match found!";
	if (strtolower($arg[1]) == "false" || strtolower($arg[1]) == "'false'" || strtolower($arg[1]) == '"false"') {
		return "false";
	} else {
		if ((bool) $arg[1]) {
			return "true";
		}
	}
	return "false";
	
}
function eval_integer($arg) {
	//echo "match found!";
	
	if (strtolower($arg[1]) == "false" || strtolower($arg[1]) == "'false'" || strtolower($arg[1]) == '"false"') {
		return "0";
	} else {
		return intval($arg[1]);
	}
	return 0;
	
}

function eval_string($arg) {
	//echo "<h3>json encode string : ".json_encode($arg[1])."\r\n</h3>";
	return str_replace('\r', '', json_encode($arg[1]));
}

function preprocessing_rawdata($rawdata) {
	$_STRING = $rawdata;

	$_STRING = preg_replace_callback('#\[BOOLEAN\](.*?)\[/BOOLEAN\]#', 'eval_boolean', $_STRING);
	$_STRING = preg_replace_callback('#\[INT\](.*?)\[/INT\]#', 'eval_integer', $_STRING);
	$_STRING = preg_replace_callback('%\[STRING\](.+?)\[/STRING\]%s', 'eval_string', $_STRING);
	//$_STRING = preg_replace('#\[STRING\](.*?)\[/STRING\]#', '"$1"', $_STRING);
	
	$_STRING = str_replace(array("[STRING][/STRING]", "[BOOLEAN][/BOOLEAN]", "[INT][/INT]"), array('""', false, 0), $_STRING);
	return $_STRING;
	
}

function prepare_integer($data) {
	return "[INT]".$data[0]."[/INT]";
	
}

function intval_array($array) {
	$temp = array();
	if (is_array($array)) {
		foreach ($array as $key=>$val) {
			$temp[$key] = intval($val);
		}
	}
	return $temp;
}

function make_one_line_script($script) {
		$script = str_replace("\r", "", $script);
		$src = array("\n", "\t");
		$rep = array("/*n*/", "/*t*/");
		return str_replace($src, $rep, $script);
}

function sanitize_command($script) {
	$randPadding = "[----PADDING_SCRIPT_".time().rand(0,9999)."----]";
	$script2 = substr(strstr($script, '"parameters":'), 13);
	$script2 = substr(strstr($script2, '['), 1);
	$script2 = substr($script2,0, strrpos($script2, "]"));
	$ORIG = str_replace($script2, $randPadding, $script);
	//$script2 = preg_replace_callback('#\$arg\[(/[^0-9]/)\]#', 'prepare_integer', $script2);
	$ARG_SEGM = explode(",", $script2);
	if (is_array($ARG_SEGM)) {
		$newSegm = array();
		foreach ($ARG_SEGM as $key=>$val) {
			$comparedScript = str_replace(array("[BOOLEAN]", "[STRING]", "[INT]", "[/BOOLEAN]", "[/STRING]", "[/INT]"), "", $val);
			if ($comparedScript == $val) {
				$newSegm[] = preg_replace_callback('#\$arg\[(.*?)\]#', 'prepare_integer', $val);
			} else {
				$newSegm[] = $val;
			}
		}
	}
	//$script2 = preg_replace_callback('#\$arg\[(.*?)\]#', 'prepare_integer', $script2);
	$script2 = implode(",", $newSegm);
	$script2 = str_replace($randPadding, $script2, $ORIG);
	return $script2;
}
/*
function buld_js_function($command) {
	//$command = preprocessing_rawdata($command);
	$pCommand = json_decode($command, true);
	
	if (is_array($pCommand)) {
		foreach ($pCommand as $segKey => $segment) {
			// handling arg[]
			$src = array();
			//$rep = array();
			if (is_array($segment["arg"])) {
				foreach ($segment["arg"] as $argKey=> $argVal) {
					$src[] = '$arg['.$argKey.']';
				}


				if ($segment['type'] == 'showText') {
					// $arg[0] is textarea
					$textSplit = array_chunk(explode("\n", $segment["arg"][0]), 4);
					foreach ($textSplit as $page) {
						$segment["arg"][0] = parse_show_text(implode('\\n',$page));
						$data .= str_replace($src, $segment["arg"],$segment['script'])." ";
						echo $data."\r\n";
					}
				} else {
					$data .= str_replace($src, $segment["arg"],$segment['script'])." ";
				}
			} else {
				$data .= $segment['script'];
			}
		}
	}
	$result['data'] = 'function() {'.parse_syntax($data).'}';
	$result['replacer'] = '[#!--'.md5(rand(100000,999999)).'--!#]';
	return $result;
}
*/

function buld_js_function2($command) {
	
	$INDENT_UP = array("branch", "showChoice", "loop", "battle");
	$INDENT_DOWN = array("endBranch", "endChoice", "endLoop", "battleEnd");
	$INDENT_DOWN_SELF = array("showChoiceChild", "else", "ifBattleWin", "ifBattleEscape", "ifBattleLose");
	$END_OF_SEGMENT = array("endChoice", "endBranch", "endLoop", "battleEnd");
	
	$currentIndent = 0;
	
	$pCommand = json_decode($command, true);
	print_r($pCommand);
	// mandatory data
	$result['id'] = 9999;
	$result['name'] = "DUMMY";
	$result['switchId'] = 1;
	$result['trigger'] = 0;
	$result['list'] = array();
	
	//print_r($pCommand);
	if (is_array($pCommand)) {
		foreach ($pCommand as $segKey => $line) {
			$tmplist = array();
			
			if ($line['type'] == 'showText') {
				$tmplist = array();
				// creating message properties
				$textSplit = array_chunk(explode("\n", $line["arg"][0]), 4);
				print_r($textSplit);
				foreach ($textSplit as $textPage) {
					$tmplist['code'] = 101;
					$tmplist['indent'] = $currentIndent;
					$tmplist['parameters'] = array( $line["arg"][1], intval($line["arg"][2]), intval($line["arg"][3]), intval($line["arg"][4]));
					$result['list'][] = $tmplist;

					foreach ($textPage as $thisText) {
						$tmplist = array();
						$tmplist['code'] = 401;
						$tmplist['indent'] = $currentIndent;
						$tmplist['parameters'][0]= validate_text($thisText);
						$result['list'][] = $tmplist;
					}
				}
			} else if ($line['type'] == 'scrollText') {
				$tmplist = array();
				$tmplist['code'] = 105;
				$tmplist['indent'] = $currentIndent;
				$tmplist['parameters'][0] = intval($line["arg"][0]);
				$tmplist['parameters'][1] = ((bool) $line["arg"][1]);
				$result['list'][] = $tmplist;
				
				$textSplit = explode("\n", $line["arg"][2]);
				foreach ($textSplit as $textPage) {
					$tmplist = array();
					$tmplist['code'] = 405;
					$tmplist['indent'] = $currentIndent;
					$tmplist['parameters'][0] = validate_text($textPage);
					$result['list'][] = $tmplist;
				}
				
			} else if ($line['type'] == 'movementRoute') {
				$tmplist = array();
				$movementData['list'] = json_decode($line["arg"][1], true);
				$movementData['repeat'] = ((bool) $line["arg"][2]);
				$movementData['skippable'] = ((bool) $line["arg"][3]);
				$movementData['wait'] = ((bool) $line["arg"][4]);
				// add padding to $movementData['list']
				array_push($movementData['list'], array('code'=>0));
				
				$tmplist['code'] = 205;
				$tmplist['indent'] = $currentIndent;
				$tmplist['parameters'][0] = intval($line["arg"][0]);
				$tmplist['parameters'][1] = $movementData;

				$result['list'][] = $tmplist;
				
				if (is_array($movementData['list'])) {
					if (!empty($movementData['list'])) {
						foreach ($movementData['list'] as $key=>$val) {
							$tmplist = array();
							$tmplist['code'] = 505;
							$tmplist['indent'] = $currentIndent;
							$tmplist['parameters'][0] = $val;

							$result['list'][] = $tmplist;
						}
					}
				}
			} else if ($line['type'] == 'shop') {
				$tmplist = array();
				$shopData = json_decode($line["arg"][0], true);
				if (is_array($shopData)) {
					$first = array_shift($shopData);
					print_r($first);
					$tmplist['code'] = 302;
					$tmplist['indent'] = $currentIndent;
					$tmplist['parameters'][0] = intval($first["parameters"][0]);
					$tmplist['parameters'][1] = intval($first["parameters"][1]);
					$tmplist['parameters'][2] = intval($first["parameters"][2]);
					$tmplist['parameters'][3] = intval($first["parameters"][3]);
					$tmplist['parameters'][4] = ((bool) $line["arg"][1]); // arg 1 is wether purchase only or not
					$result['list'][] = $tmplist;
					
					if (!empty($shopData)) {
						foreach ($shopData as $key=>$val) {
							$tmplist = array();
							$tmplist['code'] = 605;
							$tmplist['indent'] = $currentIndent;
							$tmplist['parameters'][0] = intval($val["parameters"][0]);
							$tmplist['parameters'][1] = intval($val["parameters"][1]);
							$tmplist['parameters'][2] = intval($val["parameters"][2]);
							$tmplist['parameters'][3] = intval($val["parameters"][3]);
							$result['list'][] = $tmplist;
						}
					}
				}
				
			} else if ($line['type'] == 'script') {
				$tmplist = array();
				echo "<h2>Type script!</h2>";
				$tmplist['code'] = 355;
				$tmplist['indent'] = $currentIndent;
				$tmplist['parameters'][0] = make_one_line_script($line["arg"][0]);
				$result['list'][] = $tmplist;
			} else if ($line['type'] == 'controlSwitches') {
				$tmplist = array();
				echo "<h2>Type controlSwitches</h2>";
				$tmplist['code'] = 121;
				$tmplist['indent'] = $currentIndent;
				$tmplist['parameters'][0] = intval($line["arg"][0]);
				if ($line["arg"][1] < 1) {
					$tmplist['parameters'][1] = intval($line["arg"][0]);
				} else {
					$tmplist['parameters'][1] = intval($line["arg"][1]);
				}
				$tmplist['parameters'][2] = intval($line["arg"][2]);
				$result['list'][] = $tmplist;
			} else if ($line['type'] == 'controlVariables') {
				$tmplist = array();
				echo "<h2>Type controlVariables</h2>";
				$tmplist['code'] = 122;
				$tmplist['indent'] = $currentIndent;
				$tmplist['parameters'][0] = intval($line["arg"][0]);
				if ($line["arg"][1] < 1) {
					$tmplist['parameters'][1] = intval($line["arg"][0]);
				} else {
					$tmplist['parameters'][1] = intval($line["arg"][1]);
				}
				$tmplist['parameters'][2] = intval($line["arg"][2]);
				$tmplist['parameters'][3] = intval($line["arg"][3]);
				$tmplist['parameters'][4] = intval($line["arg"][4]);
				if (isset($line["arg"][5])) {
					$tmplist['parameters'][5] = intval($line["arg"][5]);
				}
				if (isset($line["arg"][6])) {
					$tmplist['parameters'][6] = intval($line["arg"][6]);
				}
				$result['list'][] = $tmplist;
			} else if ($line['type'] == 'controlTimer') {
				$tmplist = array();
				$tmplist['code'] = 124;
				$tmplist['indent'] = $currentIndent;
				$tmplist['parameters'] = intval_array($line["arg"]);
				$result['list'][] = $tmplist;
			} else if ($line['type'] == 'branch') {
				$tmplist = array();
				$tmplist['code'] = 111;
				$tmplist['indent'] = $currentIndent;
				$tmplist['parameters'] = intval_array($line["arg"]);
				$result['list'][] = $tmplist;
				
				$currentIndent++;
			} else {
				$tmplist = array();
				
				//if (is_array($line["arg"])) {
					// ASSIGNING PADDING BEFORE CURRENT LINE
					$prependBlankLine = false;
					if (in_array($line['type'], $END_OF_SEGMENT)) {
						$prependBlankLine = true;
					} elseif ($line['type']=='showChoiceChild' && $pCommand[$segKey-1]['type'] !='showChoice') {
						$prependBlankLine = true;
					} elseif ($line['type'] == 'ifBattleEscape' || $line['type'] == 'ifBattleLose') {
						$prependBlankLine = true;
					}
					
					if ($prependBlankLine) {
						// mandatory last blank line
						$tmplist = array();
						$tmplist['code'] = 0;
						$tmplist['indent'] = $currentIndent;
						$tmplist['parameters'] = array();
						$result['list'][] = $tmplist;					
					}
					
					// END OF ASSIGNING PADDING
					
					$src = array();
					echo "<h3>Sanitized_command</h3>";
					$line['script'] = sanitize_command($line['script']);
					echo $line['script'];
					echo "<h3>end of sanitize</h3>";
					
					//$fill = array_fill(0,10, 0);
					
					if (!empty($line["arg"])) {
						$padded =  array_replace(array_fill(0,12, 0), $line["arg"]);
						foreach ($padded as $argKey=> $argVal) {
							$src[] = '$arg['.$argKey.']';
						}
						$json = str_replace($src, $padded, $line['script']);
					} else {
						$json = $line['script'];
					}
					/*
					foreach ($line["arg"] as $argKey=> $argVal) {
						$src[] = '$arg['.$argKey.']';
					}
					$json = str_replace($src, $line["arg"], $line['script']);
					*/
					if (strpos($json, '[-LIST-]') !== false) {
						if ($line['type'] == 'showChoice') {
							$json = str_replace('[-LIST-]', json_encode($line['list']), $json);
						} else {
							$sanitizedList = array();
							foreach($line['list'] as $key=> $val) {
								$sanitizedList[$key] = intval($val);
							}
							$json = str_replace('[-LIST-]', json_encode($sanitizedList), $json);
						}
					}

					echo $json;
					$json = preprocessing_rawdata($json);
					echo "\r\nFixed JSON====================\r\n";
					echo "$json\r\n";
					echo "====================\r\n";
					$tmplist = json_decode($json, 1);
					if ($tmplist == null) {
						echo "<h1>Failed to convert $line[type] on line $segKey</h1>";
					}
					
					// Assigning indent!
					echo "<h2>".$line['type']."</h2>";
					$tmplist['indent'] = $currentIndent;
					if (in_array($line['type'], $INDENT_UP)) {
						echo "<h3>INDENT UP</h3>";
						 $currentIndent++;
					} else if (in_array($line['type'], $INDENT_DOWN)) {
						 $currentIndent--;
						 $tmplist['indent'] = $currentIndent;
					} else if (in_array($line['type'], $INDENT_DOWN_SELF)) {
						$tmplist['indent'] = $tmplist['indent']-1;
					}
					
					
					//echo "processing $segKey\r\n";
					//var_dump($tmplist);
					//echo json_encode($tmplist);
				//}
				
				$result['list'][] = $tmplist;
				
			}
			
		}
		
	}
	
	// mandatory last blank line
	$tmplist = array();
	$tmplist['code'] = 0;
	$tmplist['indent'] = 0;
	$tmplist['parameters'] = array();
	$result['list'][] = $tmplist;

	//print_r($result);
	return $result;
}


function deploy_topic_to_tester($CALLER) {
	//$CALLER = "DoJobCarpenter";
	if (empty($CALLER)) {
		return false;
	}
	$TESTER_PATH = realpath(getcwd()."/../TEST/")."\\";
	
	$DATA = execute_sql("
SELECT *, message_pool.id AS segment_id FROM message_pool
	LEFT JOIN message_pool_text  ON (message_pool.id = message_pool_text.message_pool_id)
	WHERE message_pool.caller_name = '".$CALLER."'
	AND message_pool.is_active = '1'
	ORDER BY is_override DESC,
	priority ASC	
	", 1);
	
	if(empty($DATA)) {
		return false;
	}
	
	//print_r($DATA);
	$newdata = array();
	$newdata2 = array();
	foreach ($DATA as $key => $val) {
		$thisCmd = buld_js_function2($val['command']);
		$data[] = $thisCmd['data'];
		$replacer[] = $thisCmd['replacer'];
		
		$newdata2[$val['caller_name']][$val['segment_id']]['condition'] = parse_syntax($val['condition'], $val);
		$newdata2[$val['caller_name']][$val['segment_id']]['override'] = validate_boolean($val['is_override']);
		$newdata2[$val['caller_name']][$val['segment_id']]['ratio'] = parse_syntax($val['ratio'], $val);
		$newdata2[$val['caller_name']][$val['segment_id']]['isDefault'] = validate_boolean($val['is_default']);
		$newdata2[$val['caller_name']][$val['segment_id']]['keyLevel'] = validate_integer($val['keylevel']);
		$newdata2[$val['caller_name']][$val['segment_id']]['linked_map_file'] = validate_string($val['linked_map_file']);
		$newdata2[$val['caller_name']][$val['segment_id']]['_data'][] = $thisCmd;
		
		$pluginHelp[$val['caller_name']] = " * ".$val['caller_name'];
	
	}
	foreach ($replacer as $key=>$val) {
		$newRep[] = '"'.$val.'"';
	}
	// handling dumping to data folder
	$i=0;
	foreach ($newdata2 as $key=>$val) {
		//echo "deploying '$key'...";
		
		$tempData[$i][$key] = $val;
		$thisJson = json_encode($tempData[$i], JSON_PRETTY_PRINT)."\r\n";
		//echo $thisJson;
		//echo ("<h1>".$TESTER_PATH."_DV_".$key.".json</h1>");
		file_put_contents($TESTER_PATH."data\\_DV_".$key.".json", $thisJson);
		//file_put_contents($_PARAM['PATH_TO_PROJECT']."data/_DV_".$key.".json", $thisJson);
		
		$i++;
		//echo "ok!<br />";
	}	

}

function validate_plugin_string($string) {
	$string = trim($string);
	$pos = strpos ($string , "[" );
	$string = substr_replace ( $string , "\r\n[", $pos, 1 );
	
	$pos = strpos ($string , "]", strlen($string)-3 );
	$string = substr_replace ( $string , "\r\n]", $pos, 1 );
	return $string;

}

function is_plugin_deployed($filename) {
	global $_PARAM;
	if (is_file($_PARAM['PATH_TO_PROJECT']."js/plugins/".$filename)) {
		return true;
	} else {
		return false;
	}
}

function parse_plugin_list() {
	global $_PARAM;
	$PLUGIN_JS = file_get_contents($_PARAM['PATH_TO_PROJECT']."js/plugins.js");
	$randPadding = "[----PADDING_SCRIPT_".time().rand(0,9999)."----]";
	$script = substr(strstr($PLUGIN_JS, 'var $plugins ='), 14);
	$script = substr($script,0, strrpos($script, ";"));
	$ORIG = str_replace($script, $randPadding, $PLUGIN_JS);
	$origScript = json_decode($script, 1);	
	return $origScript;
}

function is_plugin_defined($pluginName, $caseInsensitive= false) {
	global $_PARAM;
	$PLUGIN_JS = file_get_contents($_PARAM['PATH_TO_PROJECT']."js/plugins.js");
	
	$randPadding = "[----PADDING_SCRIPT_".time().rand(0,9999)."----]";
	$script = substr(strstr($PLUGIN_JS, 'var $plugins ='), 14);
	$script = substr($script,0, strrpos($script, ";"));
	$ORIG = str_replace($script, $randPadding, $PLUGIN_JS);
	$origScript = json_decode($script, 1);	
	
	print_r($origScript);
	if ($caseInsensitive) {
		foreach ($origScript as $key => $val) {
			if(strtolower($val['name']) == strtolower($pluginName)) {
					return true;
					break;
			}
		}
	} else {
		foreach ($origScript as $key => $val) {
			if($val['name'] == $pluginName) {
					return true;
					break;
			}
		}
	}
}



function is_plugin_active($pluginName, $caseInsensitive= false) {
	global $_PARAM;
	$PLUGIN_JS = file_get_contents($_PARAM['PATH_TO_PROJECT']."js/plugins.js");
	
	$randPadding = "[----PADDING_SCRIPT_".time().rand(0,9999)."----]";
	$script = substr(strstr($PLUGIN_JS, 'var $plugins ='), 14);
	$script = substr($script,0, strrpos($script, ";"));
	$ORIG = str_replace($script, $randPadding, $PLUGIN_JS);
	$origScript = json_decode($script, 1);	
	
	print_r($origScript);
	if ($caseInsensitive) {
		foreach ($origScript as $key => $val) {
			if(strtolower($val['name']) == strtolower($pluginName)) {
				if ($val['status']) {
					return true;
					break;
				}
			}
		}
	} else {
		foreach ($origScript as $key => $val) {
			if($val['name'] == $pluginName) {
				if ($val['status']) {
					return true;
					break;
				}
			}
		}
	}
}



function activate_plugin($pluginName, $caseInsensitive=false, $deactivate=false) {
	global $_PARAM;
	$PLUGIN_JS = file_get_contents($_PARAM['PATH_TO_PROJECT']."js/plugins.js");
	
	$randPadding = "[----PADDING_SCRIPT_".time().rand(0,9999)."----]";
	$script = substr(strstr($PLUGIN_JS, 'var $plugins ='), 14);
	$script = substr($script,0, strrpos($script, ";"));
	$ORIG = str_replace($script, $randPadding, $PLUGIN_JS);
	$origScript = json_decode($script, 1);	
	
	print_r($origScript);
	if ($caseInsensitive) {
		foreach ($origScript as $key => $val) {
			if(strtolower($val['name']) == strtolower($pluginName)) {
				if ($deactivate){
					$origScript[$key]["status"] = false;
				} else {
					$origScript[$key]["status"] = true;
				}
			}
		}
	} else {
		foreach ($origScript as $key => $val) {
			if($val['name'] == $pluginName) {
				if ($deactivate) {
					$origScript[$key]["status"] = false;
				} else {
					$origScript[$key]["status"] = true;
				}
			}
		}
	}
	
	//$origScript = array_merge($filteredScript, $newScript);
	$rawData =  str_replace($randPadding, json_encode($origScript), $ORIG);
	
	$result =  validate_plugin_string(str_replace('{"name":', "\n".'{"name":', $rawData));
	file_put_contents($_PARAM['PATH_TO_PROJECT']."js/plugins.js", $result);
	return $result;
}

function appendto_plugin_js($newScript = array()) {
	global $_PARAM;
	$PLUGIN_JS = file_get_contents($_PARAM['PATH_TO_PROJECT']."js/plugins.js");
	if (empty($newScript)) {
		return $PLUGIN_JS;
	}
	
	$randPadding = "[----PADDING_SCRIPT_".time().rand(0,9999)."----]";
	$script = substr(strstr($PLUGIN_JS, 'var $plugins ='), 14);
	$script = substr($script,0, strrpos($script, ";"));
	$ORIG = str_replace($script, $randPadding, $PLUGIN_JS);
	$origScript = json_decode($script, 1);
	
	if (!is_array($newScript)) {
		$newScript = json_decode($newScript, true);
	} 
	$filteredScript = array();
	foreach ($origScript as $key => $origScriptX) {
		$removeThis = false;
		foreach ($newScript as $newScriptX) {
			if ($origScriptX['name'] == $newScriptX['name']) {
				$removeThis = true;
				break;
			}
		}
		if (!$removeThis) {
			$filteredScript[] = $origScriptX;
		}
	}
	$origScript = array_merge($filteredScript, $newScript);
	$rawData =  str_replace($randPadding, json_encode($origScript), $ORIG);
	return str_replace('{"name":', "\n".'{"name":', $rawData);

}

function strip_script_tags($script) {
	$script = str_replace(array('[BOOLEAN]', '[/BOOLEAN]', '[INT]', '[/INT]', '[STRING]', '[/STRING]'), "", $script);
	$script = preg_replace('%\$arg\[(.+?)\]%s', '$1', $script);
	return $script;
}

function assign_param_key($parameters) {
	//print_r($parameters);
	$keyLoc = array();
	if (is_array($parameters)) {
		foreach($parameters as $key=>$param) {
			if (!is_array($param)) {
				//$keyLoc = array_flip($line['script']['parameters']);
				$keyLoc[$param] = $key;
			} else {
				$keyLoc = assign_param_key($param);
			}
		}
	}
	return $keyLoc;
}

function build_interpreter_translator($DATA) {
	global $_PARAM;
	$fixData = array();
	$prevData = array();
	if (is_file($_PARAM['RMMV_TRANSLATOR_PATH'])) {
		$prevData = json_decode(file_get_contents($_PARAM['RMMV_TRANSLATOR_PATH']), true);
		//print_r($prevData);
	}

	foreach ($DATA as $key=>$line) {

		$line['script'] = str_replace(array('[-LIST-]'), array('"[-LIST-]"'), $line['script']);
		//$line['script'] = preprocessing_rawdata($line['script']);
		$line['script'] = strip_script_tags($line['script']);
		$line['script'] = json_decode($line['script'], 1);
		//print_r($line);
		if (!empty($line['script'])) {
			if (is_array($line['arg'])) {

				$keyLoc = assign_param_key($line['script']['parameters']);

					
				foreach ($line['arg'] as $key=> $val) {
					if (isset($keyLoc[$key])) {
						$line['arg'][$key] = $keyLoc[$key];
					}
				}
				foreach ($keyLoc as $key=> $val) {
					if (!isset($line['arg'][$key])) {
						$line['arg'][$key] = $val;
					}
				}
			}
		}
		$line['code'] = $line['script']['code'];
		//$fixData[$line['type']] = $line;
		$fixData[$line['code']] = $line;
	}
	//print_r($fixData);
	if (is_array($prevData)) {
		$allData = $prevData + $fixData;
	} else {
		$allData = $fixData;
	}
	file_put_contents($_PARAM['RMMV_TRANSLATOR_PATH'], json_encode($allData, JSON_PRETTY_PRINT));
	return($allData);
}

function convert_RMMV_data($data) {
	global $_PARAM;
	$TRANSLATOR = array();
	if (is_file($_PARAM['RMMV_TRANSLATOR_PATH'])) {
		$TRANSLATOR = json_decode(file_get_contents($_PARAM['RMMV_TRANSLATOR_PATH']), true);
	}
	//print_r($TRANSLATOR);

	if (!is_array($data)) {
		$data = json_decode($data, 1);
	}

	foreach ($data as $key => $line) {
		echo "<h1>Processing code ".$line['code']."</h1>";
		$thisLine = $TRANSLATOR[$line['code']];
		$newLine = $thisLine;
		foreach ($thisLine["arg"] as $key=>$argument) {
			if (!is_array($argument)) {
				$newLine["arg"][$key] = $line["parameters"][$argument];
			}
		}

		print_r($line);
		print_r($newLine);
		echo "<h1>-----------------</h1>";
	}
	
}