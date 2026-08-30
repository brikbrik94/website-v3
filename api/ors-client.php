<?php

/**
 * Ruft einen Pfad gegen ORS_URL auf — reine Funktion, kein eigener HTTP-Endpoint. Nutzt
 * curl_request() aus config.php (ohne Auto-Header, siehe Task 1), da ORS lokal läuft und keine
 * Sonderbehandlung mehr braucht.
 */
function ors_call(string $path, string $method = 'GET', ?string $body = null): array
{
    $url = ORS_URL . '/' . ltrim($path, '/');
    return curl_request($url, $method, $body);
}
