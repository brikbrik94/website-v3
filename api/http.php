<?php

/**
 * Erzwingt eine erlaubte HTTP-Methode für read-only Endpoints, sonst 405.
 * Bewusst seiteneffektfrei (im Unterschied zu config.php) — kann auch von
 * Endpoints ohne DB-/ORS-Secret-Bedarf (adsb.php, ais.php, ping.php)
 * eingebunden werden, ohne deren Fail-Closed-Secret-Check zu erben.
 */
function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        http_response_code(405);
        header("Allow: $method");
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }
}
