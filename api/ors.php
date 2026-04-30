<?php
require_once 'config.php';
header('Content-Type: application/json');

// Wir nutzen einen 'path' Parameter für die Weiterleitung
$path = $_GET['path'] ?? 'health';
$url = ORS_URL . "/" . ltrim($path, '/');

$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

$res = curl_request($url, $method, $body);

http_response_code($res['code']);
echo $res['data'];
