<?php

require_once 'config.php';
require_once 'ors-client.php';
require_once 'valhalla-client.php';
header('Content-Type: application/json');

$provider = $_GET['provider'] ?? 'ors';
$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

if ($provider === 'ors') {
    $path = $_GET['path'] ?? 'health';
    // {profil} bleibt bewusst offen ([a-z0-9-]+ statt fester Namensliste) — die gültigen
    // ORS-Profile werden dynamisch vom ORS-Host konfiguriert (RoutingService.getProfiles()
    // liest sie zur Laufzeit aus /status).
    $allowedPathPattern = '#^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+' .
        '|isochrones/[a-z0-9-]+|export/[a-z0-9-]+(/topojson)?)$#D';
    if (!preg_match($allowedPathPattern, $path)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid path']);
        exit;
    }
    $res = ors_call($path, $method, $body);
} elseif ($provider === 'valhalla') {
    $path = $_GET['path'] ?? 'status';
    // sources_to_targets bewusst NICHT in dieser Allowlist — wird nur in-process von
    // nearest-stations.php aufgerufen, nie über diesen öffentlichen Pfad exponiert.
    if (!preg_match('#^(route|status)$#D', $path)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid path']);
        exit;
    }
    $res = valhalla_call($path, $method, $body);
} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid provider']);
    exit;
}

if ($res['code'] >= 200 && $res['code'] < 300) {
    http_response_code($res['code']);
    echo $res['data'];
} else {
    // Rohen Upstream-Body nie an den Client durchreichen (Backend-Fingerprinting) — Detail nur
    // ins Server-Log, Client bekommt eine generische Meldung.
    error_log("routing-proxy.php: provider=$provider path=$path upstream_code={$res['code']} body=" .
        substr((string)$res['data'], 0, 500));
    http_response_code($res['code'] ?: 502);
    echo json_encode(['error' => 'Routing-Anfrage fehlgeschlagen']);
}
