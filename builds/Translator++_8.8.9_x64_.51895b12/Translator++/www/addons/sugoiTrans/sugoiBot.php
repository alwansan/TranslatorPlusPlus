<?php
echo getcwd();


if (empty($_POST["endPoint"])) $_POST["endPoint"] = "http://localhost:14366/";

print_r($_POST);

function getEndpoint() {
    return $_POST["endPoint"];
}

function fetchData($text) {
    //The data you want to send via POST
    $fields = [
        'content '      => $text,
        'message'       => "translate sentences"
    ];

    //url-ify the data for the POST
    $fields_string = json_encode($fields);
    echo "message body:\r\n".$fields_string;
    $length = strlen($fields_string);
    //open connection
    $ch = curl_init();

    //set the url, number of POST vars, POST data
    curl_setopt($ch,CURLOPT_URL, getEndpoint());
    curl_setopt($ch,CURLOPT_POST, true);
    curl_setopt($ch,CURLOPT_POSTFIELDS, $fields_string);
    curl_setopt($ch,CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        "Content-Length: $length"
    ]);

    //So that curl_exec returns the contents of the cURL; rather than echoing it
    curl_setopt($ch,CURLOPT_RETURNTRANSFER, true); 

    //execute post
    $result = curl_exec($ch);
}

$DATA = json_decode(file_get_contents($_POST['botFile']), true);

foreach ($DATA as $key=>$currentData) {
    if (empty($currentData['escaped'])) continue;
    echo "\r\nSending:\r\n".$currentData['escaped'];
    echo fetchData($currentData['escaped']);
    die();
}

die();
