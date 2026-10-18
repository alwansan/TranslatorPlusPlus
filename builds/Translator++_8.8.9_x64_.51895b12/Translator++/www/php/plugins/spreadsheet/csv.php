<?php
$THISPATH = pathinfo(__FILE__);
require _ROOT_PATH.'vendor/autoload.php';
use League\Csv\JsonEncoder;
use League\Csv\Reader;
use League\Csv\Statement;
use MyLib\Transcode;

$addTrans = stream_filter_register('convert.utf8decode', Transcode::class);
echo "Transcode addition: ";
var_dump($addTrans);

if (!ini_get("auto_detect_line_endings")) {
    ini_set("auto_detect_line_endings", '1');
}


function getCSVLineBreakType($file, $chunk_size=10240) {
    try
    {
        $handle = fopen($file, "r");
        $chunk = fread($handle, $chunk_size);
        
        // check for mac type
        if (preg_match('/\r[^\n]/', $chunk)) {
            // mac
            return "\r";
        } else {
            // windows or DOS
            return "\r\n";
        }
        fclose($handle);

    }
    catch(Exception $e)
    {
         trigger_error("getCSVLineBreakType::" . $e->getMessage(),E_USER_NOTICE);
         return "\r\n";
    }
}

// https://www.php.net/manual/en/function.str-getcsv.php#111665
function parse_csv($csv_string, $delimiter = ",", $skip_empty_lines = true, $trim_fields = true) {
    $enc = preg_replace('/(?<!")""/', '!!¬»!!', $csv_string);
    $enc = preg_replace_callback(
        '/"(.*?)"/s',
        function ($field) {
            return urlencode(utf8_encode($field[1]));
        },
        $enc
    );
    $lines = preg_split($skip_empty_lines ? ($trim_fields ? '/( *\R)+/s' : '/\R+/s') : '/\R/s', $enc);
    return array_map(
        function ($line) use ($delimiter, $trim_fields) {
            $fields = $trim_fields ? array_map('trim', explode($delimiter, $line)) : explode($delimiter, $line);
            return array_map(
                function ($field) {
                    return mb_ereg_replace('!!¬»!!', '"', utf8_decode(urldecode($field)));
                },
                $fields
            );
        },
        $lines
    );
}



function readChunk($filename, $chunkSize, $expectedTerminator, $callback) {
    $chunk = "";
    $fp = @fopen($filename, "r");
    $chunkIndex = 0;
    
    if ($fp) {
        while (($buffer = fgets($fp, $chunkSize)) !== false) {
            echo "Line: ".json_encode($buffer)."\n";
            $chunk .= $buffer;
    
            $lastChar = mb_substr($buffer, -mb_strlen($expectedTerminator));
            //echo "last char is ".json_encode($lastChar)."\n";
    
            if (mb_strlen($chunk) >= $chunkSize) {
                if ($lastChar !== $expectedTerminator) continue;

                // process chunk here
                call_user_func_array($callback, [$chunk, $chunkIndex]);
                $chunk = "";
                $chunkIndex++;
                
            }

        }

        if (!feof($fp)) {
            echo trigger_error("readChunk error: unexpected fgets() fail\n", E_USER_ERROR);
        } else {
            call_user_func_array($callback, [$chunk, $chunkIndex]);
            $chunk = "";
        }
        fclose($fp);
    }
}


function csvToArrayChunk($file, $chunkSize=524288, $lineDelimiterType="") {
    echo "Running csvToArrayChunk() for: $file\n";
    if (!is_file($file)) trigger_error("csvToArrayChunk-File not found: $file", E_USER_ERROR);
    if (empty($lineDelimiterType)) {
        $lineDelimiterType = getCSVLineBreakType($file);
    }

    
    $result = [];
    readChunk($file, $chunkSize, $lineDelimiterType, function($chunk, $chunkIndex) use (&$result) {
        //echo "---------From callback $chunkIndex :\n".json_encode($chunk, JSON_UNESCAPED_UNICODE)."\n--------------\n";
        $result = array_merge($result, parse_csv(trim($chunk)));
    });

    return $result;
}

// this one is the best.
// Tested on 100Mb of csv file and working good
function csvToArrayStream($file) {

    $reader = Reader::createFromPath($file, 'r');
    //$reader->setOutputBOM(Reader::BOM_UTF8);
    //$reader->addStreamFilter('convert.iconv.shift-jis/UTF-8');
    if (isset($_POST["options"]["encoding"])) {
        $encoding = $_POST["options"]["encoding"];
    } else {
        $encoding = detectFileEncoding($file);
    }
    echo "detected encoding: $encoding \n";
    if (strtolower($encoding) !== "utf-8") {
        $reader->addStreamFilter('convert.iconv.'.$encoding.'/UTF-8');
    }
    //$reader->addStreamFilter('convert.utf8decode');
    $data =  [];
    //print_r($reader);
    foreach ($reader as $index => $row) {
        $data[] = $row;
    }
    return $data;
}