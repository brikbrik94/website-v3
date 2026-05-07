<?php
/**
 * OE5ITH Central API Configuration
 */

// 1. Try to load local override configuration first
$local_config_file = __DIR__ . '/config.local.php';
if (file_exists($local_config_file)) {
    require_once $local_config_file;
}

// 2. Define defaults (Production) ONLY IF not already defined by config.local.php

// Datenbank (PostGIS)
defined('DB_HOST') || define('DB_HOST', '127.0.0.1');
defined('DB_PORT') || define('DB_PORT', '5432');
defined('DB_NAME') || define('DB_NAME', 'emergency_db');
defined('DB_USER') || define('DB_USER', 'web_api_user');
defined('DB_PASS') || define('DB_PASS', '9bYC%60I#wMsba');

// API Keys
defined('ORS_API_KEY') || define('ORS_API_KEY', 'pmMmvsCrpjIi67TGzDbATzQ6kY50O4EN');

// Endpunkte
defined('ORS_URL') || define('ORS_URL', 'https://ors.oe5ith.at');
defined('NOMINATIM_URL') || define('NOMINATIM_URL', 'https://geocoder.oe5ith.at');

/**
 * Hilfsfunktion für die Datenbankverbindung
 */
function get_db_conn() {
    $conn_str = sprintf(
        "host=%s port=%s dbname=%s user=%s password=%s",
        DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
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
function curl_request($url, $method = 'GET', $body = null, $headers = []) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, ''); // Enable all supported encodings (gzip, etc.)
    
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
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
