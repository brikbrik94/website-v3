<?php
require_once 'api/config.php';
$db = get_db_conn();
$res = pg_query($db, "SELECT * FROM emergency.nah_stations LIMIT 1;");
$row = pg_fetch_assoc($res);
print_r($row);
pg_close($db);
