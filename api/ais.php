<?php
/**
 * AIS Data Proxy
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$url = 'https://ais.oe5ith.at/data/ships.json';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code === 200) {
    echo $response;
} else {
    // If external source fails (e.g. 502), return an empty structure so the frontend doesn't crash
    http_response_code($http_code ?: 502);
    echo json_encode([
        'error' => 'Failed to fetch AIS data', 
        'code' => $http_code,
        'ships' => []
    ]);
}
