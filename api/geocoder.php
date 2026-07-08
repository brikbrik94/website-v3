<?php

require_once 'config.php';
header('Content-Type: application/json');

// Unterscheidung zwischen Suche (q) und Reverse (lat/lon)
$query = $_GET['q'] ?? '';
$lat = $_GET['lat'] ?? '';
$lon = $_GET['lon'] ?? '';
$reverse = isset($_GET['reverse']);

if ($reverse && !empty($lat) && !empty($lon)) {
    // Reverse Geocoding
    $url = NOMINATIM_URL . "/reverse?lat=" . urlencode($lat) . "&lon=" . urlencode($lon) . "&format=json";
} elseif (!empty($query)) {
    // Normale Suche
    $url = NOMINATIM_URL . "/search?q=" . urlencode($query) . "&format=json";
} else {
    echo json_encode([]);
    exit;
}

$res = curl_request($url);

http_response_code($res['code']);
echo $res['data'];
