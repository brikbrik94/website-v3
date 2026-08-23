<?php

require_once 'config.php';
require_once 'http.php';
require_once 'ors-client.php';
require_once 'valhalla-client.php';
require_method('GET');
header('Content-Type: application/json');

$target = $_GET['target'] ?? null;
$type = $_GET['type'] ?? 'sew';
$profile = $_GET['profile'] ?? 'driving-car'; // Neues Profil-Parameter

if (!preg_match('/^[a-z0-9-]+$/', $profile)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid profile']);
    exit;
}

$provider = $_GET['provider'] ?? 'ors';

if (!in_array($provider, ['ors', 'valhalla'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid provider']);
    exit;
}

if ($provider === 'valhalla' && !defined('VALHALLA_URL')) {
    http_response_code(500);
    echo json_encode(['error' => 'Server misconfigured: VALHALLA_URL not set in config.local.php']);
    exit;
}

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

// 2. Matrix-Aufruf — Provider-Branch (Stationssuche oben bleibt für beide Provider gemeinsam),
// nutzt die geteilten Client-Funktionen aus ors-client.php/valhalla-client.php.
if ($provider === 'valhalla') {
    $sources = [];
    foreach ($stations as $s) {
        $sources[] = ['lat' => (float)$s['lat'], 'lon' => (float)$s['lon']];
    }
    $targets = [['lat' => $lat, 'lon' => $lon]];

    $payload = [
        'sources' => $sources,
        'targets' => $targets,
        'costing' => $profile,
        'units' => 'kilometers',
    ];

    $matrixRes = valhalla_call('sources_to_targets', 'POST', json_encode($payload));
} else {
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

    $matrixRes = ors_call('matrix/' . urlencode($profile), 'POST', json_encode($payload));
}

if ($matrixRes['code'] < 200 || $matrixRes['code'] >= 300) {
    // Rohen Upstream-Body nie an den Client durchreichen — Detail nur ins Server-Log.
    error_log("nearest-stations.php: provider=$provider upstream_code={$matrixRes['code']} body=" .
        substr((string)$matrixRes['data'], 0, 500));
    http_response_code($matrixRes['code'] ?: 502);
    echo json_encode(['error' => 'Matrixsuche fehlgeschlagen']);
    exit;
}

$matrix = json_decode($matrixRes['data'], true);

// 3. Ergebnisse kombinieren und sortieren
$results = [];
foreach ($stations as $i => $s) {
    if ($provider === 'valhalla') {
        $duration = $matrix['sources_to_targets'][$i][0]['time'] ?? null;
        $distance = isset($matrix['sources_to_targets'][$i][0]['distance'])
            ? $matrix['sources_to_targets'][$i][0]['distance'] * 1000
            : null;
    } else {
        $duration = $matrix['durations'][$i][0];
        $distance = $matrix['distances'][$i][0];
    }

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
