<?php

require_once 'config.php';
header('Content-Type: application/json');

$target = $_GET['target'] ?? null;
$type = $_GET['type'] ?? 'sew';
$profile = $_GET['profile'] ?? 'driving-car'; // Neues Profil-Parameter

if (!$target) {
    http_response_code(400);
    echo json_encode(['error' => 'Parameter target (lat,lon) fehlt']);
    exit;
}

list($lat, $lon) = explode(',', $target);
$lat = (float)$lat;
$lon = (float)$lon;

// 1. DB Abfrage via Central Config
$db = get_db_conn();
$table = ($type === 'sew') ? 'emergency.rd_stations' : 'emergency.nef_stations';
$filter_col = ($type === 'sew') ? 'has_transport' : 'has_doctor';

$query = "
    SELECT id, name, short_name, organization as org, ST_Y(geom) as lat, ST_X(geom) as lon
    FROM $table
    WHERE $filter_col = true
    ORDER BY geom <-> ST_SetSRID(ST_Point($lon, $lat), 4326)
    LIMIT 20;
";

$res = pg_query($db, $query);
$stations = pg_fetch_all($res) ?: [];
pg_close($db);

if (empty($stations)) {
    echo json_encode([]);
    exit;
}

// 2. ORS Matrix via Central Helper
$locations = [];
foreach ($stations as $s) {
    $locations[] = [(float)$s['lon'], (float)$s['lat']];
}
$locations[] = [$lon, $lat];
$target_index = count($locations) - 1;

$payload = [
    "locations" => $locations,
    "sources" => range(0, count($stations) - 1),
    "destinations" => [$target_index],
    "metrics" => ["duration", "distance"]
];

$matrix_url = ORS_URL . "/matrix/" . urlencode($profile);
$res = curl_request($matrix_url, 'POST', json_encode($payload));

if ($res['code'] !== 200) {
    // Wenn Matrix für ein Profil fehlschlägt (z.B. driving-emergency), geben wir den Fehler weiter
    // oder die aufrufende Seite fängt es ab.
    http_response_code($res['code']);
    echo $res['data'];
    exit;
}

$matrix = json_decode($res['data'], true);

// 3. Ergebnisse kombinieren und sortieren
$results = [];
foreach ($stations as $i => $s) {
    $duration = $matrix['durations'][$i][0];
    $distance = $matrix['distances'][$i][0];

    if ($duration !== null) {
        // Icon-Logik basierend auf Typ und short_name
        $prefix = ($type === 'nef') ? 'nef-' : 'rd-';
        $org_key = strtolower(str_replace([' ', 'Ö', 'Ä', 'Ü'], ['', 'oe', 'ae', 'ue'], $s['short_name'] ?? ''));
        $icon = $prefix . ($org_key ?: 'fallback');

        $results[] = [
            "id" => (int)$s['id'],
            "name" => $s['name'],
            "short_name" => $s['short_name'],
            "org" => $s['org'],
            "lat" => (float)$s['lat'],
            "lon" => (float)$s['lon'],
            "duration" => $duration,
            "distance" => $distance,
            "icon" => $icon
        ];
    }
}

usort($results, function ($a, $b) {
    return $a['duration'] <=> $b['duration'];
});

// Wir geben standardmäßig 20 Ergebnisse zurück, wenn mehr als 5 angefordert werden (für den Sonderfall-Fallback)
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 5;
echo json_encode(array_slice($results, 0, $limit));
