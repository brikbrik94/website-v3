<?php

require_once 'config.php';
require_once 'http.php';
require_method('GET');
header('Content-Type: application/json');

// Nur ein reiner Erreichbarkeits-Check für den Health-Monitor (Info-Portal) — bewusst kein
// Versionsstring/Uptime/Body mehr in der Antwort (OWASP A05 Info-Disclosure-Fund, siehe
// docs/security/owasp-top10-checklist.md). Kein Frontend-Code liest den Body (HealthModule.ts
// wertet nur HTTP-Status + eigene Latenzmessung aus), daher reicht der reine Status-Code.
$db = get_db_conn();
$res = pg_query($db, "SELECT 1");
pg_close($db);

if (!$res) {
    http_response_code(500);
}
