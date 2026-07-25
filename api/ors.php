<?php

require_once 'config.php';
header('Content-Type: application/json');

// Wir nutzen einen 'path' Parameter für die Weiterleitung
$path = $_GET['path'] ?? 'health';

// Allowlist statt beliebigem Pfad: ors.php hängt den API-Key an jede Anfrage an (curl_request()
// in config.php), ein unbeschränkter $path würde also erlauben, mit unserem Key beliebige
// ORS-Endpoints anzusprechen. {profil} bleibt bewusst offen ([a-z0-9-]+ statt fester
// Namensliste) — die gültigen ORS-Profile werden dynamisch vom ORS-Host konfiguriert
// (RoutingService.getProfiles() liest sie zur Laufzeit aus /status).
$allowedPathPattern = '#^(health|status|directions/[a-z0-9-]+/geojson|matrix/[a-z0-9-]+|isochrones/[a-z0-9-]+)$#';
if (!preg_match($allowedPathPattern, $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$url = ORS_URL . "/" . ltrim($path, '/');

$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

$res = curl_request($url, $method, $body);

http_response_code($res['code']);
echo $res['data'];
