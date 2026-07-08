<?php

require_once 'config.php';
header('Content-Type: application/json');

$start = microtime(true);
try {
    $db = get_db_conn();
    $res = pg_query($db, "SELECT version() as ver, pg_postmaster_start_time() as uptime");
    $data = pg_fetch_assoc($res);
    pg_close($db);
    $end = microtime(true);

    echo json_encode([
        'status' => 'ok',
        'version' => $data['ver'],
        'uptime' => $data['uptime'],
        'latency_ms' => round(($end - $start) * 1000, 2)
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
