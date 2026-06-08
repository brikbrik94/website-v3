<?php
require_once 'config.php';

header('Content-Type: application/json');

if (!isset($_GET['state'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing state parameter"]);
    exit;
}

$state = $_GET['state'];

$db = get_db_conn();

$query = "
    SELECT id, 'RD' as type, name, short_name, organization as org 
    FROM emergency.rd_stations 
    WHERE state = $1
    UNION ALL
    SELECT id, 'NEF' as type, name, short_name, organization as org 
    FROM emergency.nef_stations 
    WHERE state = $1
    ORDER BY type, org, short_name
";

$result = pg_query_params($db, $query, array($state));

if (!$result) {
    http_response_code(500);
    echo json_encode(["error" => "Database query failed"]);
    pg_close($db);
    exit;
}

$stations = [];
while ($row = pg_fetch_assoc($result)) {
    $stations[] = $row;
}

echo json_encode($stations);

pg_close($db);
?>
