<?php // phpcs:ignore PSR1.Files.SideEffects.FoundWithSymbols -- mischt bewusst define()-Konstanten mit Side Effects (config.local.php-Require, fail-closed Secret-Check aus 87accec); Aufsplitten in reine Deklarations-/Side-Effect-Dateien wäre größerer Umbau, hier bewusst nicht gemacht

/**
 * OE5ITH Central API Configuration
 */

// 1. Try to load local override configuration first
$local_config_file = __DIR__ . '/config.local.php';
if (file_exists($local_config_file)) {
    require_once $local_config_file;
}

// 2. Define defaults (Production) ONLY IF not already defined by config.local.php

// Datenbank (PostGIS) — Host/Port/Name/User sind unkritische Defaults, DB_PASS
// und ORS_API_KEY haben bewusst KEINEN Default (Secrets dürfen nicht im Repo
// stehen); sie müssen über config.local.php (gitignored) gesetzt werden.
defined('DB_HOST') || define('DB_HOST', '127.0.0.1');
defined('DB_PORT') || define('DB_PORT', '5432');
defined('DB_NAME') || define('DB_NAME', 'emergency_db');
defined('DB_USER') || define('DB_USER', 'web_api_user');

// Endpunkte
defined('ORS_URL') || define('ORS_URL', 'https://ors.oe5ith.at');
defined('NOMINATIM_URL') || define('NOMINATIM_URL', 'https://geocoder.oe5ith.at');

// Secrets müssen aus config.local.php kommen — kein Fallback-Wert im Repo.
if (!defined('DB_PASS') || !defined('ORS_API_KEY')) {
    http_response_code(500);
    echo json_encode(['error' => 'Server misconfigured: missing config.local.php with required secrets']);
    exit;
}

/**
 * Hilfsfunktion für die Datenbankverbindung
 */
function get_db_conn()
{
    $conn_str = sprintf(
        "host=%s port=%s dbname=%s user=%s password=%s",
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_USER,
        DB_PASS
    );
    $db = @pg_connect($conn_str);
    if (!$db) {
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed']);
        exit;
    }
    return $db;
}

/**
 * Hilfsfunktion für CURL Requests (Proxy)
 */
function curl_request($url, $method = 'GET', $body = null, $headers = [])
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, ''); // Enable all supported encodings (gzip, etc.)
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    $default_headers = [
        "X-API-KEY: " . ORS_API_KEY,
        "Content-Type: application/json"
    ];

    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($default_headers, $headers));

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['code' => $http_code, 'data' => $response];
}
