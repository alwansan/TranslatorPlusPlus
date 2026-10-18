<?php

if (!function_exists('filter_array')) {
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
}

function init_db() {
	
}

function execute_sql($sql, $stretch=false, $connection = NULL) {
	if (is_object($connection)) {
		$_DB = $connection;
	} else {
		global $_DB;
	}
	$data = array();
	$results = $_DB->query("$sql");
	if (is_object($results)) {
		if ($stretch) {
			while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
				$data[] = $row;
			}
		} else {
			return $results->fetchArray(SQLITE3_ASSOC);
		}
	} else {
		echo "Error when executing : ".$sql;
	}
	return $data;
}

function load_coloumn($table, $connection = NULL) {
	if (is_object($connection)) {
		$_DB = $connection;
	} else {
		global $_DB;
	}
	$data = array();
	
	$results = $_DB->query("PRAGMA table_info('$table')");
	if (is_object($results)) {
		while ($row = $results->fetchArray(SQLITE3_ASSOC)) {
			$data[$row['name']] = $row['type'];
		}
	}
	return $data;
}

function filter_sqlparam($table, $input) {
	$coloumn = load_coloumn($table);
	
	foreach($input as $key => $val) {
		if ($coloumn[$key]) {
			$param[$key] = $val;
		}
	}
	
	return $param;
}

function prepare_update_vars($param, $addslashes=false, $filtertable=false, $connection=NULL) {
	if (is_object($connection)) {
		$_DB = $connection;
	} else {
		global $_DB;
	}
	
	if (is_array($param)) {
		$fparam = array();
		if (!empty($filtertable)) {
			$thistable = load_coloumn($filtertable);
			foreach($param as $key=> $val) {
				if (isset($thistable[$key])) {
					$fparam[$key] = $param[$key];
				}
			}
		} else {
			$fparam = $param;
		}
	
		
		if (get_magic_quotes_gpc()!=true) {
			foreach ($fparam as $key => $val) {
				//$val = addslashes($val);
				//$val = $val;
				//$result[] = "$key='$val'";
				$result[] = "$key="."'".$_DB->escapeString($val)."'";
				
			}
		} else {
			foreach ($fparam as $key => $val) {
				$result[] = "$key='$val'";
				//$result[] = "$key="."'".$_DB->escapeString($val)."'";
			}
		}

		if (is_array($result) AND count($result)>0) {
			$fresult = implode(",", $result);
		}
	}
	
	return $fresult;
}

function update_table($table, $param, $command, $debug = false, $connection=NULL) {
	if (is_object($connection)) {
		$_DB = $connection;
	} else {
		global $_DB;
	}
	
	if (!empty($param)) {
		if (is_array($param)) {
			$param = prepare_update_vars($param, false, $table, $_DB);
		}
		$sql = "UPDATE $table SET $param $command";
		if ($debug == true) {
		echo "<br>".$sql."<br>";
		}
		$results = $_DB->query("$sql");
		if (is_object($results)) {
			$affected = $_DB->query("SELECT changes() as affected_rows");
			$n = $affected->fetchArray(SQLITE3_ASSOC);
			return $n['affected_rows'];
		}
	}
}

function delete_row($table, $method, $connection=NULL) {
	if (is_object($connection)) {
		$_DB = $connection;
	} else {
		global $_DB;
	}
		
		$sql = "DELETE from `$table` $method";
		$results = $_DB->query("$sql");
		if (is_object($results)) {
			$affected = $_DB->query("SELECT changes() as affected_rows");
			$n = $affected->fetchArray(SQLITE3_ASSOC);
			return $n['affected_rows'];
		}
}

function insert_row($table, $param, $connection=NULL) {
	if (is_object($connection)) {
		$_DB = $connection;
	} else {
		global $_DB;
	}
	
	if (is_array($param) and !empty($table)) {
		$query = $_DB->query("PRAGMA table_info('$table')");
		
		while ($row = $query->fetchArray(SQLITE3_ASSOC)) {
			$filters[] = $row['name'];
		}
		$param = filter_array($param, $filters);
		

		$collist = array();
		
		if (get_magic_quotes_gpc()) {
			foreach ($param as $key => $val) {
				$contlist[] = "$key";
				$collist[] = "'$val'";

			}
		} else {
			foreach ($param as $key => $val) {
				$contlist[] = "$key";
				$collist[] = "'".$_DB->escapeString($val)."'";
				//$collist[] = "'$val'";
			}
		}
		$collstr = "(".implode(",", $collist).")";
		$contstr = "(".implode(",", $contlist).")";


		$sql =  "INSERT INTO $table $contstr VALUES $collstr";
		#echo $sql;
		$query = $_DB->query("$sql");
		
		return $_DB->lastInsertRowID();
	}

}

