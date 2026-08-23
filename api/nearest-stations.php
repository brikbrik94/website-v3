<?php

require_once 'config.php';
require_once 'http.php';
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

// 2. Matrix-Aufruf — Provider-Branch (Stationssuche oben bleibt für beide Provider gemeinsam)
if ($provider === 'valhalla') {
    if (!defined('VALHALLA_URL')) {
        http_response_code(500);
        echo json_encode(['error' => 'Server misconfigured: VALHALLA_URL not set in config.local.php']);
        exit;
    }

    $sources = [];
    foreach ($stations as $s) {
        $sources[] = ['lat' => (float)$s['lat'], 'lon' => (float)$s['lon']];
    }
    $targets = [['lat' => $lat, 'lon' => $lon]];

    $payload = [
        'sources' => $sources,
        'targets' => $targets,
        'costing' => $profile,
    ];

    // Eigener, schlanker curl-Aufruf statt curl_request() — die würde automatisch
    // X-API-KEY: ORS_API_KEY anhängen, was für Valhalla falsch wäre (siehe api/valhalla.php).
    $ch = curl_init(VALHALLA_URL . '/sources_to_targets');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        http_response_code($http_code ?: 502);
        echo $response;
        exit;
    }

    $matrix = json_decode($response, true);
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
}

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
