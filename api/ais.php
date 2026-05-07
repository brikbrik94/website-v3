<?php
require_once 'config.php';
header('Content-Type: application/json');

$url = 'https://ais.oe5ith.at/data/ships.json';
$res = curl_request($url);

http_response_code($res['code']);
echo $res['data'];
