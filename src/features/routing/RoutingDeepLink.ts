import { parseCoords } from '../../components/RoutingSidebar';

export interface RoutingDeepLinkParams {
  mode: 'ab' | 'sew' | 'nef';
  target: [number, number];
  start?: [number, number];
  profile?: string;
}

const VALID_MODES: readonly string[] = ['ab', 'sew', 'nef'];

/**
 * Parst die Query-Parameter eines Routing-Deep-Links (z.B. `/routing?mode=ab&target=48.3,14.28&
 * start=48.2,14.3&profile=driving-emergency`), damit ein Link von außen (z.B. aus dem
 * Koordinaten-Umrechner) eine vorausgefüllte Route auf `/routing` öffnen kann. Reine
 * Parse-Funktion ohne DOM-Zugriff — die Anwendung auf die Sidebar übernimmt
 * `RoutingSidebarAdapter.applyDeepLink()`.
 *
 * `target` ist Pflicht (ohne gültiges `target` liefert die Funktion `null`, der Link wird dann
 * stillschweigend ignoriert). `mode` fällt bei fehlendem/ungültigem Wert auf `ab` zurück (Default
 * der UI). `start` wird nur für `mode: 'ab'` ausgewertet. `profile` wird durchgereicht, ohne
 * gegen die tatsächlich verfügbaren ORS-Profile zu validieren — das prüft erst
 * `applyDeepLink()`, das Zugriff auf die geladene Profil-Liste im DOM hat.
 */
export function parseRoutingDeepLink(search: string): RoutingDeepLinkParams | null {
  const params = new URLSearchParams(search);

  const target = parseCoords(params.get('target') ?? '');
  if (!target) return null;

  const modeParam = params.get('mode') ?? '';
  const mode = (VALID_MODES.includes(modeParam) ? modeParam : 'ab') as RoutingDeepLinkParams['mode'];

  const result: RoutingDeepLinkParams = { mode, target };

  if (mode === 'ab') {
    const start = parseCoords(params.get('start') ?? '');
    if (start) result.start = start;
  }

  const profile = params.get('profile');
  if (profile) result.profile = profile;

  return result;
}
