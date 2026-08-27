/**
 * Baut die URL für den generischen Routing-Proxy-Endpoint (`api/routing-proxy.php`), der ORS und
 * Valhalla providerparametrisiert hinter einem gemeinsamen Endpoint zusammenfasst — eine Stelle
 * statt unabhängiger URL-Konstanten in RoutingService.ts/IsochronesService.ts/ValhallaService.ts.
 * `path` wird bewusst nicht URL-kodiert — verschachtelte Segmente (z.B.
 * `directions/driving-car/geojson`) müssen unverändert bleiben, die eigentliche Absicherung ist
 * die serverseitige Allowlist in `routing-proxy.php`.
 */
export function buildRoutingProxyUrl(provider: 'ors' | 'valhalla', path: string): string {
  return `/api/routing-proxy.php?provider=${provider}&path=${path}`;
}
