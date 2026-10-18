<?php
echo "Testing translating to naver\r\n";

$postData['data'] = 'rlWxMKMcL2IWMPV6ImUyYzc0MzViLWY1NWItNGQ4YS04Yjk3LTQwM2ZiYzA5MWYyYiIsImRpY3QiOnRydWUsImRpY3REaXNwbGF5IjozMCwiaG9ub3JpZmljIjpmYWxzZSwiaW5zdGFudCI6ZmFsc2UsInNvdXJjZSI6ImphIiwidGFyZ2V0IjoiZW4iLCJ0ZXh0Ijoi44GT44KT44Gr44Gh44Gv5LuK5pel44Gv44GK5YWD5rCX44Gn44GZ44GL77yfIn0=';
echo "postData : \r\n".$postData['data']."\r\n\r\n";
echo "decoded : \r\n";
$decoded = base64_decode($postData['data']);
echo "decoded : \r\n$decoded\r\n\r\n";
$encoded = base64_encode($decoded);
echo "encoded : \r\n$encoded\r\n\r\n";

$modified = str_replace('"text":"こんにちは今日はお元気ですか？"', '"text":"こんにちは"', $decoded);
$encodedMod = base64_encode($modified);
echo "encodedMod : \r\n$encodedMod\r\n\r\n";
$postData['data'] = $encodedMod;

//die();

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL,"https://papago.naver.com/apis/n2mt/translate");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$server_output = curl_exec($ch);

curl_close ($ch);

echo $server_output;

die();

//$fp = fsockopen("ssl://papago.naver.com", 443, $errno, $errstr, 30);
$fp = fsockopen("dreamsavior.net", 80, $errno, $errstr, 30);
if (!$fp) {
    echo "$errstr ($errno)<br />\n";
} else {
    //$out = "POST /apis/n2mt/translate HTTP/1.1\r\n";
    $out = "POST /apis/n2mt/translate/ HTTP/1.1\r\n";
    $out .= "Host: dreamsavior.net\r\n";
    //$out .= "Path: /apis/n2mt/translate\r\n";
	$out .= "Content-Type: application/x-www-form-urlencoded; charset=UTF-8\r\n";
	$out .= "Accept: application/json\r\n";
	$out .= "Connection: close\r\n";
	$out .= "Cookie: JSESSIONID=3599046D72B7427D2447EB93EA4F9AD7; npic=jen88k/EINZw4Sdt9zzj9J9s9Z+9T8eNkPaioitWo5og0wD3RlZevBWfFGQlgm6pCA==; NNB=G3RGRD2CUNMVY\r\n";
	$out .= "device-type: pc\r\n";
	$out .= "Referer: https://papago.naver.com/\r\n";
	$out .= "TE: Trailers\r\n";
	$out .= "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:65.0) Gecko/20100101 Firefox/65.0\r\n";
	$out .= "x-apigw-partnerid: papago\r\n";
	$out .= "\r\n";
	
	echo $out;
    fwrite($fp, $out);
	
	//$out .= "data=rlWxMKMcL2IWMPV6ImUyYzc0MzViLWY1NWItNGQ4YS04Yjk3LTQwM2ZiYzA5MWYyYiIsImRpY3QiOnRydWUsImRpY3REaXNwbGF5IjozMCwiaG9ub3JpZmljIjpmYWxzZSwiaW5zdGFudCI6ZmFsc2UsInNvdXJjZSI6ImphIiwidGFyZ2V0IjoiZW4iLCJ0ZXh0Ijoi44GT44KT44Gr44Gh44Gv5LuK5pel44Gv44GK5YWD5rCX44Gn44GZ44GL77yfIn0%3D";
	$body = "name=bob&age=12&county=uk";
	$body .= "\r\n\r\n";
    fwrite($fp, $body);
	echo $body;
	
	
    while (!feof($fp)) {
        echo fgets($fp, 128);
    }
    fclose($fp);
}










die();


$fp = fsockopen("papago.naver.com", 443, $errno, $errstr, 30);
if (!$fp) {
    echo "$errstr ($errno)<br />\n";
} else {
    $out = "POST /apis/n2mt/translate HTTP/1.1\r\n";
    $out .= "Host: papago.naver.com\r\n";
    $out .= "Path: /apis/n2mt/translate\r\n";
	$out .= "\r\n\n";
    fwrite($fp, $out);
    while (!feof($fp)) {
        echo fgets($fp, 128);
    }
    fclose($fp);
}


die();

// create a new cURL resource
$ch = curl_init();

// set URL and other appropriate options
curl_setopt($ch, CURLOPT_URL, "https://papago.naver.com/apis/n2mt/translate");
curl_setopt($ch, CURLOPT_HEADER, 0);

// grab URL and pass it to the browser
curl_exec($ch);

// close cURL resource, and free up system resources
echo curl_close($ch);


die();
$vars['data'] = "rlWxMKMcL2IWMPV6IjI0ZTlkNTdiLTVlYTYtNDEwYS1hNjhlLTdiMzU5NDlmYWRjOCIsImRpY3QiOnRydWUsImRpY3REaXNwbGF5IjozMCwiaG9ub3JpZmljIjpmYWxzZSwiaW5zdGFudCI6ZmFsc2UsInNvdXJjZSI6ImphIiwidGFyZ2V0IjoiZW4iLCJ0ZXh0Ijoi44GT44KT44Gr44Gh44Gv5LuK5pel44Gv44GK5YWD5rCX44Gn44GZ44GL77yfIn0=";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,"https://papago.naver.com/apis/n2mt/translate");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $vars);  //Post Fields
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$headers = [
    'cookie: NNB=RPJBBDIG34HVY; npic=PjmIF3H/l6MMepnpnqOQE+bLvgmKlhkj4eT1GQPqVDMNQibLgWdzO0XKDSrinMvpCA==; JSESSIONID=B769959C32E531CABA22DE4528051AE5',
    'device-type: pc',
    'origin: https://papago.naver.com',
    'referer: https://papago.naver.com/'
];

curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$server_output = curl_exec ($ch);

curl_close ($ch);

echo  $server_output ;