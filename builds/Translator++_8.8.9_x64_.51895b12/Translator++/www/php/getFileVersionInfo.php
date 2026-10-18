<?php
/*
	run php function on demand, input :
	$_POST["function"] = function name
	$_POST["arguments"] = array of arguments;
*/
include("header.php");
//$_POST['file'] = 'F:\App\jdk-13.0.1_windows-x64_bin.exe';
$_POST['file'] = "F:\\test\\Wolf\\WRPGE2\\Game.exe";
function getFileVersionInfo($filename,$encoding='UTF-8'){
	$bufferSize = 6*1024;
	$handle = fopen($filename, "rb");
	$fileSize = filesize($filename);
	
	$currentPos = $fileSize-$bufferSize;
    while ($pos=strpos($dat,mb_convert_encoding('VS_VERSION_INFO','UTF-16LE')) == false){
		echo "Seeking pos : $currentPos \r\n";
		fseek($handle, $currentPos);
		$dat = fread($handle, $bufferSize);
		if ($currentPos == 0 ) break;
		$currentPos = $currentPos-$bufferSize;
		if ($currentPos < 0) $currentPos = 0;
	}
	
	
	fclose($handle);
	echo "Filesize : ".filesize($filename)."\r\n";

    if($pos=strpos($dat,mb_convert_encoding('VS_VERSION_INFO','UTF-16LE'))){
        $pos-= 6;
		echo "possition found : $pos\r\n";
        $six = unpack('v*',substr($dat,$pos,6));
		echo "six : \r\n";
		print_r($six);
        $dat = substr($dat,$pos,$six[1]);
		echo "File Info encoded : ".mb_convert_encoding('StringFileInfo','UTF-16LE')."\r\n";
        if($pos=strpos($dat,mb_convert_encoding('StringFileInfo','UTF-16LE'))){
            $pos+= 54;
            $res = [];
            $six = unpack('v*',substr($dat,$pos,6));
            while($six[2]){
                $nul = strpos($dat,"\0\0\0",$pos+6)+1;
                $key = mb_convert_encoding(substr($dat,$pos+6,$nul-$pos-6),$encoding,'UTF-16LE');
                $val = mb_convert_encoding(substr($dat,ceil(($nul+2)/4)*4,$six[2]*2-2),$encoding,'UTF-16LE');
                $res[$key] = $val;
                $pos+= ceil($six[1]/4)*4;
                $six = unpack('v*',substr($dat,$pos,6));
            }
            return $res;
        }
    }
}

/*
function GetFileVersion($FileName) {
	echo "handle $FileName\r\n";
	$handle=fopen($FileName,'rb');
	if (!$handle) return FALSE;
	$Header=fread ($handle,64);
	if (substr($Header,0,2)!='MZ') return FALSE;
	$PEOffset=unpack("V",substr($Header,60,4));
	if ($PEOffset[1]<64) return FALSE;
	fseek($handle,$PEOffset[1],SEEK_SET);
	$Header=fread ($handle,24);
	if (substr($Header,0,2)!='PE') return FALSE;
	$Machine=unpack("v",substr($Header,4,2));
	if ($Machine[1]!=332) return FALSE;
	$NoSections=unpack("v",substr($Header,6,2));
	$OptHdrSize=unpack("v",substr($Header,20,2));
	fseek($handle,$OptHdrSize[1],SEEK_CUR);
	$ResFound=FALSE;
	for ($x=0;$x<$NoSections[1];$x++) {      //$x fixed here
		$SecHdr=fread($handle,40);
		if (substr($SecHdr,0,5)=='.rsrc') {         //resource section
			$ResFound=TRUE;
			break;
		}
	}
	if (!$ResFound) return FALSE;
	$InfoVirt=unpack("V",substr($SecHdr,12,4));
	$InfoSize=unpack("V",substr($SecHdr,16,4));
	$InfoOff=unpack("V",substr($SecHdr,20,4));
	fseek($handle,$InfoOff[1],SEEK_SET);
	$Info=fread($handle,$InfoSize[1]);
	$NumDirs=unpack("v",substr($Info,16,2));
	$InfoFound=FALSE;
	for ($x=0;$x<$NumDirs[1];$x++) {
		$Type=unpack("V",substr($Info,($x*8)+16,4));
		if($Type[1]==16) {             //FILEINFO resource
			$InfoFound=TRUE;
			$SubOff=unpack("V",substr($Info,($x*8)+20,4));
			break;
		}
	}
	if (!$InfoFound) return FALSE;
	$SubOff[1]&=0x7fffffff;
	$InfoOff=unpack("V",substr($Info,$SubOff[1]+20,4)); //offset of first FILEINFO
	$InfoOff[1]&=0x7fffffff;
	$InfoOff=unpack("V",substr($Info,$InfoOff[1]+20,4));    //offset to data
	$DataOff=unpack("V",substr($Info,$InfoOff[1],4));
	$DataSize=unpack("V",substr($Info,$InfoOff[1]+4,4));
	$CodePage=unpack("V",substr($Info,$InfoOff[1]+8,4));
	$DataOff[1]-=$InfoVirt[1];
	$Version=unpack("v4",substr($Info,$DataOff[1]+48,8));
	$x=$Version[2];
	$Version[2]=$Version[1];
	$Version[1]=$x;
	$x=$Version[4];
	$Version[4]=$Version[3];
	$Version[3]=$x;
	return $Version;
}
*/

echo "File version info : \r\n";
$result = getFileVersionInfo($_POST['file']);
var_dump($result);