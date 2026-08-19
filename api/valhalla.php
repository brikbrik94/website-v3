<?php

header('Content-Type: application/json');

// Allowlist: 'route' (Kernfunktion), 'status' (Health-Check, für spätere Nutzung
// vorgesehen). Kein API-Key/Auth nötig — Valhalla läuft selbst gehostet ohne ORS-Secret.
$path = $_GET['path'] ?? 'status';
if (!preg_match('#^(route|status)$#D', $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

// Eigenes, minimales Laden von config.local.php statt require_once 'config.php' —
// vermeidet den dortigen Fail-Closed-Check auf DB_PASS/ORS_API_KEY, die für einen
// reinen Valhalla-Testproxy irrelevant sind.
$local_config_file = __DIR__ . '/config.local.php';
if (file_exists($local_config_file)) {
    require_once $local_config_file;
}

if (!defined('VALHALLA_URL')) {
    http_response_code(500);
    echo json_encode(['error' => 'Server misconfigured: VALHALLA_URL not set in config.local.php']);
    exit;
}

$url = VALHALLA_URL . '/' . $path;

$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

// Eigener, schlanker curl-Aufruf statt curl_request() aus config.php — die würde
// automatisch X-API-KEY: ORS_API_KEY anhängen, was für Valhalla falsch wäre.
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_ENCODING, '');
curl_setopt($ch, CURLOPT_TIMEOUT, 5);

if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    if ($body) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($http_code ?: 502);
echo $response;
