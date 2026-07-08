<?php

header('Content-Type: text/plain');
echo "=== OE5ITH API Diagnostic ===\n\n";

echo "PHP Version: " . phpversion() . "\n";
echo "Interface: " . php_sapi_name() . "\n";

$extensions = ['pgsql', 'curl', 'json', 'pdo_pgsql'];
foreach ($extensions as $ext) {
    echo "Extension '$ext': " . (extension_loaded($ext) ? "LOADED" : "MISSING") . "\n";
}

echo "\n--- Testing Database Connection ---\n";
require_once 'config.php';

$conn_str = sprintf(
    "host=%s port=%s dbname=%s user=%s password=%s",
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASS
);

echo "Conn String (masked): " . preg_replace('/password=([^ ]+)/', 'password=****', $conn_str) . "\n";

$db = pg_connect($conn_str);
if (!$db) {
    echo "Result: FAILED\n";
    echo "Error: " . pg_last_error() . "\n";
} else {
    echo "Result: SUCCESS\n";
    $res = pg_query($db, "SELECT version()");
    $row = pg_fetch_row($res);
    echo "DB Version: " . $row[0] . "\n";
    pg_close($db);
}

echo "\n--- Testing External Connectivity (ORS) ---\n";
$test_url = ORS_URL . "/health";
echo "URL: $test_url\n";
$res = curl_request($test_url);
echo "HTTP Code: " . $res['code'] . "\n";
echo "Response Length: " . strlen($res['data']) . " bytes\n";
if ($res['code'] != 200) {
    echo "Data: " . $res['data'] . "\n";
}
