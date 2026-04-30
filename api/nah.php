<?php
require_once 'config.php';
header('Content-Type: application/json');

$db = get_db_conn();
$query = "
    SELECT 
        osm_id, name, callsign, region, op_type, months_active, is_night_ready,
        ST_Y(geom) as lat, ST_X(geom) as lon
    FROM emergency.nah_stations;
";

$res = pg_query($db, $query);
$stations = pg_fetch_all($res) ?: [];
pg_close($db);

$currentMonth = (int)date('n');
$now = time();

$results = [];
foreach ($stations as $s) {
    $isActive = false;
    
    // Parse months array (e.g. "{1,2,3,4,11,12}")
    $monthsStr = trim($s['months_active'], '{}');
    $months = $monthsStr === '' ? [] : explode(',', $monthsStr);
    
    $inSeason = empty($months) || in_array($currentMonth, $months);
    
    if ($inSeason) {
        if ($s['op_type'] === '24/7') {
            $isActive = true;
        } elseif ($s['op_type'] === 'daylight') {
            $sunInfo = date_sun_info($now, (float)$s['lat'], (float)$s['lon']);
            // Sunrise and sunset can be bool/array keys depending on location
            if (isset($sunInfo['sunrise']) && isset($sunInfo['sunset']) && 
                $sunInfo['sunrise'] !== false && $sunInfo['sunset'] !== false) {
                $isActive = ($now >= $sunInfo['sunrise'] && $now <= $sunInfo['sunset']);
            } elseif (isset($sunInfo['sunrise']) && $sunInfo['sunrise'] === true) {
                 // Midnight sun
                 $isActive = true;
            }
        }
    }
    
    $results[] = [
        "osm_id" => $s['osm_id'],
        "name" => $s['name'],
        "callsign" => $s['callsign'],
        "region" => $s['region'],
        "op_type" => $s['op_type'],
        "is_night_ready" => $s['is_night_ready'] === 't',
        "lat" => (float)$s['lat'],
        "lon" => (float)$s['lon'],
        "is_active" => $isActive
    ];
}

echo json_encode($results);
