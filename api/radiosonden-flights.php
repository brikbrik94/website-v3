<?php

/**
 * Radiosonden Data Proxy — Flüge (aktiv + abgeschlossen)
 */

require_once 'http.php';
require_method('GET');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$url = 'https://api.oe5ith.at/radiosonden/api/flights';

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
    http_response_code($http_code ?: 502);
    echo json_encode([
        'error' => 'Failed to fetch Radiosonden flights',
        'code' => $http_code,
        'flights' => []
    ]);
}
