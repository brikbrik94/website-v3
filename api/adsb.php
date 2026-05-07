<?php
require_once 'config.php';
header('Content-Type: application/json');

$url = 'https://adsb.oe5ith.at/data/aircraft.json';
$res = curl_request($url);

if ($res['code'] !== 200) {
    http_response_code(200); // Return 200 so the frontend doesn't crash
    echo json_encode(['aircraft' => [], 'error' => true, 'upstream_code' => $res['code']]);
    exit;
}

echo $res['data'];
