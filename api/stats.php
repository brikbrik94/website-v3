<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
date_default_timezone_set('Europe/Vienna');
header('Content-Type: application/json');

$db = get_db_conn();

// 1. NAH Stats (Luftrettung)
$nah_query = "
    SELECT region, op_type, months_active, fixed_start, fixed_end, ST_Y(geom) as lat, ST_X(geom) as lon
    FROM emergency.nah_stations;
";
$nah_res = pg_query($db, $nah_query);
$nah_raw = pg_fetch_all($nah_res) ?: [];

$currentMonth = (int)date('n');
$now = time();

$nah_stats = [];
foreach ($nah_raw as $s) {
    $isActive = false;

    $monthsStr = trim($s['months_active'], '{}');
    $months = $monthsStr === '' ? [] : explode(',', $monthsStr);
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
                    $start = max($start, strtotime(date('Y-m-d ') . $s['fixed_start']));
                }
                if (!empty($s['fixed_end'])) {
                    $end = min($end, strtotime(date('Y-m-d ') . $s['fixed_end']));
                }
                $isActive = ($now >= $start && $now <= $end);
            }
        } elseif ($s['op_type'] === 'fixed' && !empty($s['fixed_start']) && !empty($s['fixed_end'])) {
            $start = strtotime(date('Y-m-d ') . $s['fixed_start']);
            $end = strtotime(date('Y-m-d ') . $s['fixed_end']);
            $isActive = ($now >= $start && $now <= $end);
        }
    }

    $reg = $s['region'];
    if (!isset($nah_stats[$reg])) {
        $nah_stats[$reg] = ['total' => 0, 'active' => 0];
    }
    $nah_stats[$reg]['total']++;
    if ($isActive) {
        $nah_stats[$reg]['active']++;
    }
}

// 2. RD Stats (Rettungsdienst)
$rd_query = "SELECT state, count(*) as count FROM emergency.rd_stations GROUP BY state ORDER BY state;";
$rd_res = pg_query($db, $rd_query);
$rd_stats = [];
while ($row = pg_fetch_assoc($rd_res)) {
    $rd_stats[$row['state']] = (int)$row['count'];
}

// 3. NEF Stats (Notarzt)
$nef_query = "SELECT state, count(*) as count FROM emergency.nef_stations GROUP BY state ORDER BY state;";
$nef_res = pg_query($db, $nef_query);
$nef_stats = [];
while ($row = pg_fetch_assoc($nef_res)) {
    $nef_stats[$row['state']] = (int)$row['count'];
}

pg_close($db);

echo json_encode([
    "generated_at" => date('c'),
    "nah" => $nah_stats,
    "rd" => $rd_stats,
    "nef" => $nef_stats
]);
