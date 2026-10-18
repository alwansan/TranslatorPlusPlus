<?php
echo "Testing translating to yandex\r\n";

$postData['text'] = 'こんばんは';
$postData['options'] = '4';
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL,"https://translate.yandex.net/api/v1/tr.json/translate?id=a144f66f.5c5acbbd.60b54e1f-1-0&srv=tr-text&lang=ja-en&reason=cut");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

$server_output = curl_exec($ch);

curl_close ($ch);

echo $server_output;
