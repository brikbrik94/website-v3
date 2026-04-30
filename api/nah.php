<?php
require_once 'config.php';
date_default_timezone_set('Europe/Vienna');
header('Content-Type: application/json');

$db = get_db_conn();
$query = "
    SELECT 
        osm_id, name, callsign, region, op_type, months_active, is_night_ready,
        fixed_start, fixed_end,
        ST_Y(geom) as lat, ST_X(geom) as lon
    FROM emergency.nah_stations;
";

$res = pg_query($db, $query);
$stations = pg_fetch_all($res) ?: [];
pg_close($db);

$currentMonth = (int)date('n');
$now = time();
$currentHM = date('H:i'); // z.B. "14:30"

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
            if (isset($sunInfo['sunrise']) && isset($sunInfo['sunset']) && 
                $sunInfo['sunrise'] !== false && $sunInfo['sunset'] !== false) {
                
                $start = $sunInfo['sunrise'];
                $end = $sunInfo['sunset'];

                // Frühestmögliche Startzeit prüfen
                if (!empty($s['fixed_start'])) {
                    $fixedStartTs = strtotime(date('Y-m-d ') . $s['fixed_start']);
                    $start = max($start, $fixedStartTs);
                }

                // Spätestmögliche Endzeit prüfen
                if (!empty($s['fixed_end'])) {
                    $fixedEndTs = strtotime(date('Y-m-d ') . $s['fixed_end']);
                    $end = min($end, $fixedEndTs);
                }

                $isActive = ($now >= $start && $now <= $end);
            } elseif (isset($sunInfo['sunrise']) && $sunInfo['sunrise'] === true) {
                 $isActive = true;
            }
        } elseif ($s['op_type'] === 'fixed' && !empty($s['fixed_start']) && !empty($s['fixed_end'])) {
            // Vergleich via String-Repräsentation (HH:MM:SS oder HH:MM)
            $start = substr($s['fixed_start'], 0, 5); // "HH:MM"
            $end = substr($s['fixed_end'], 0, 5);
            $isActive = ($currentHM >= $start && $currentHM <= $end);
        }
    }
    
    $results[] = [
        "osm_id" => $s['osm_id'],
        "name" => $s['name'],
        "callsign" => $s['callsign'],
        "region" => $s['region'],
        "op_type" => $s['op_type'],
        "is_night_ready" => $s['is_night_ready'] === 't',
        "fixed_start" => $s['fixed_start'] ? substr($s['fixed_start'], 0, 5) : null,
        "fixed_end" => $s['fixed_end'] ? substr($s['fixed_end'], 0, 5) : null,
        "lat" => (float)$s['lat'],
        "lon" => (float)$s['lon'],
        "is_active" => $isActive
    ];
}

echo json_encode($results);
