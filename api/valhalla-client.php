<?php

require_once 'config.php';

/**
 * Ruft einen Pfad gegen VALHALLA_URL auf — reine Funktion, kein eigener HTTP-Endpoint. Eigener,
 * schlanker curl-Aufruf statt curl_request() — bewusst von dessen (heute leerem, aber potenziell
 * künftig wieder ORS-spezifischem) Header-Verhalten entkoppelt.
 */
function valhalla_call(string $path, string $method = 'GET', ?string $body = null): array
{
    if (!defined('VALHALLA_URL')) {
        return ['code' => 500, 'data' => json_encode([
            'error' => 'Server misconfigured: VALHALLA_URL not set in config.local.php'
        ])];
    }

    $url = VALHALLA_URL . '/' . ltrim($path, '/');

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        if ($body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['code' => $http_code ?: 502, 'data' => $response];
}
