<?php
// PHP Dev-Server Router
// Simuliert das Nginx-Verhalten für lokale Entwicklung

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

// 1. Wenn die Datei existiert (z.B. nah.php), serviere sie direkt
if (file_exists($file) && !is_dir($file)) {
    return false; // PHP-Server übernimmt das Rendering
}

// 2. Fallback für Anfragen ohne .php Endung
if (file_exists($file . '.php')) {
    include $file . '.php';
    exit;
}

// 3. 404 Fehler wenn nichts gefunden wurde
http_response_code(404);
echo json_encode(["error" => "API Endpoint not found", "path" => $uri]);
exit;
