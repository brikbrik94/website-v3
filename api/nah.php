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

$results = [];
$nextRefresh = null;

foreach ($stations as $s) {
    $isActive = false;
    $stationNextEvent = null;
    $start = null;
    $end = null;

    // Parse months array (e.g. "{1,2,3,4,11,12}")
    $monthsStr = trim($s['months_active'], '{}');
    $months = $monthsStr === '' ? [] : explode(',', $monthsStr);

    // BACK TO ORIGINAL SIMPLE LOGIC
    $inSeason = empty($months) || in_array($currentMonth, $months);

    if ($inSeason) {
        if ($s['op_type'] === '24/7') {
            $isActive = true;
        } elseif ($s['op_type'] === 'daylight') {
            $sunInfo = date_sun_info($now, (float)$s['lat'], (float)$s['lon']);
            if (
                isset($sunInfo['civil_twilight_begin']) && isset($sunInfo['civil_twilight_end']) &&
                $sunInfo['civil_twilight_begin'] !== false && $sunInfo['civil_twilight_end'] !== false
            ) {
                $start = $sunInfo['civil_twilight_begin'];
                $end = $sunInfo['civil_twilight_end'];

                if (!empty($s['fixed_start'])) {
                    $fixedStartTs = strtotime(date('Y-m-d ') . $s['fixed_start']);
                    $start = max($start, $fixedStartTs);
                }

                if (!empty($s['fixed_end'])) {
                    $fixedEndTs = strtotime(date('Y-m-d ') . $s['fixed_end']);
                    $end = min($end, $fixedEndTs);
                }

                $isActive = ($now >= $start && $now <= $end);

                if ($isActive) {
                    $stationNextEvent = $end;
                } else {
                    if ($now < $start) {
                        $stationNextEvent = $start;
                    } else {
                        $tomorrowSunInfo = date_sun_info($now + 86400, (float)$s['lat'], (float)$s['lon']);
                        $stationNextEvent = $tomorrowSunInfo['civil_twilight_begin'];
                    }
                }
            } elseif (isset($sunInfo['civil_twilight_begin']) && $sunInfo['civil_twilight_begin'] === true) {
                 $isActive = true;
            }
        } elseif ($s['op_type'] === 'fixed' && !empty($s['fixed_start']) && !empty($s['fixed_end'])) {
            $start = strtotime(date('Y-m-d ') . $s['fixed_start']);
            $end = strtotime(date('Y-m-d ') . $s['fixed_end']);

            $isActive = ($now >= $start && $now <= $end);

            if ($now < $start) {
                $stationNextEvent = $start;
            } elseif ($now < $end) {
                $stationNextEvent = $end;
            } else {
                $stationNextEvent = strtotime(date('Y-m-d ', $now + 86400) . $s['fixed_start']);
            }
        }
    }

    if ($stationNextEvent && $stationNextEvent > $now) {
        if ($nextRefresh === null || $stationNextEvent < $nextRefresh) {
            $nextRefresh = $stationNextEvent;
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
        "is_active" => (bool)$isActive,
        "in_season" => (bool)$inSeason,
        "months_active" => array_map('intval', $months),
        "calculated_start" => $start ? date('c', $start) : null,
        "calculated_end" => $end ? date('c', $end) : null
    ];
}

echo json_encode([
    "refresh_at" => $nextRefresh ? date('c', $nextRefresh) : null,
    "stations" => $results
]);
