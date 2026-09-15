<?php

/**
 * Radiosonden Data Proxy — Flugbahn (GeoJSON LineString) für ein Callsign
 */

require_once 'http.php';
require_method('GET');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$callsign = $_GET['callsign'] ?? '';
$hours = $_GET['hours'] ?? '24';

// Muster übernommen aus der radiosonden-api-OpenAPI-Spec (Pfad-Parameter-Constraint),
// verhindert zusätzlich, dass Nutzereingaben ungeprüft in die Ziel-URL eingesetzt werden.
if (!preg_match('/^[A-Za-z0-9._-]{1,32}$/', $callsign)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing callsign']);
    exit;
}

if (!is_numeric($hours) || $hours <= 0 || $hours > 8760) {
    $hours = '24';
}

$url = 'https://api.oe5ith.at/radiosonden/api/sondes/' . rawurlencode($callsign) . '/track?hours=' . rawurlencode((string) $hours);

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
        'error' => 'Failed to fetch Radiosonden track',
        'code' => $http_code
    ]);
}
