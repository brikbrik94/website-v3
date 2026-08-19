import { RoutingService } from '../lib/RoutingService';
import { GeocoderService } from '../lib/GeocoderService';
import { GeocoderSearchField } from '../lib/GeocoderSearchField';
import { RouteExtras, RouteSegment, RoutingStation } from '../types/common';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';
import { getProfileBadge, getRouteWarnings, formatSteps } from '../features/routing/RoutingDetailsFormatter';
import type { BadgeClass } from '../lib/BadgeStyles';

// Feste Badge-Farben je UI-Zweck (kein Status-Enum dahinter, anders als z.B.
// NahPopupBuilder.STATUS_BADGE_CLASS — hier gibt's nur einen einzigen Anwendungsfall pro Zweck).
const LOADING_BADGE: BadgeClass = 'badge-yellow';
const ERROR_BADGE: BadgeClass = 'badge-red';
const WARNING_BADGE: BadgeClass = 'badge-yellow';
const STEP_COUNT_BADGE: BadgeClass = 'badge-gray';
const VALHALLA_PROFILES = ['auto', 'bicycle', 'pedestrian'];

export interface RoutingParams {
  start?: [number, number];
  target: [number, number];
  profile: string;
  mode: 'ab' | 'sew' | 'nef';
  provider: 'ors' | 'valhalla';
}

/**
 * Parst eine "lat, lon"-Texteingabe (Eingabefeld-Format) in ein Koordinaten-Tupel — auch von
 * RoutingDeepLink.ts wiederverwendet, damit Deep-Link-Query-Parameter exakt dasselbe Format
 * akzeptieren wie die Eingabefelder selbst.
 */
export const parseCoords = (val: string): [number, number] | null => {
  const parts = val.split(',').map(p => parseFloat(p.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return [parts[0], parts[1]] as [number, number];
  }
  return null;
};

/**
 * Erlaubt das Setzen von Koordinaten von außen (z.B. Context-Menu).
 */
export const setRoutingCoord = async (type: 'start' | 'target', lat: number, lon: number) => {
  const id = type === 'start' ? 'input-start' : 'input-target';
  const input = document.getElementById(id) as HTMLInputElement;
  if (input) {
    // Versuche Reverse Geocoding
    const address = await GeocoderService.reverse(lat, lon);
    if (address && address.display_name) {
      input.value = address.display_name;
      input.dataset.lat = lat.toString();
      input.dataset.lon = lon.toString();
    } else {
      input.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      delete input.dataset.lat;
      delete input.dataset.lon;
    }
    const resultsId = type === 'start' ? 'results-start' : 'results-target';
    const results = document.getElementById(resultsId);
    if (results) results.classList.add('hidden');
  }
};

export const initRoutingSidebar = async (
  container: HTMLElement,
  onRouteStart: (params: RoutingParams) => void,
  signal: AbortSignal
) => {
  const isOnline = await RoutingService.checkHealth();
  let profiles: string[] = [];
  
  if (isOnline) {
    profiles = await RoutingService.getProfiles();
  }

  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Routing</div>

        <!-- Status Anzeige -->
        <div class="form-field" style="margin-bottom:8px">
          <span class="form-label">Service Status</span>
          <div class="status-panel">
            <div class="status-row">
              <div class="status-row-left">
                <i class="fa-solid fa-server status-row-icon"></i>
                <span class="status-row-name">ORS API</span>
              </div>
              <div class="status-row-right">
                <span class="status-dot ${isOnline ? 'on' : 'off'}"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="tool-sep"></div>

        <!-- Provider Auswahl (nur bei Modus A → B relevant, siehe updateModeUI) -->
        <div class="form-field" style="margin-bottom:7px" id="field-provider">
          <label class="form-label" for="route-provider">Anbieter</label>
          <select class="form-select" id="route-provider">
            <option value="ors">ORS</option>
            <option value="valhalla">Valhalla (Test)</option>
          </select>
        </div>

        <!-- Profil Auswahl -->
        <div class="form-field" style="margin-bottom:7px">
          <label class="form-label" for="route-profile">Profil</label>
          <select class="form-select" id="route-profile" ${!isOnline ? 'disabled' : ''}>
            ${profiles.length > 0 
              ? profiles.map(p => `<option value="${p}">${p}</option>`).join('')
              : '<option>Dienst offline</option>'
            }
          </select>
        </div>

        <!-- Modus Auswahl -->
        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Modus</span>
          <div class="segmented" id="route-mode">
            <button class="segmented-btn active" data-mode="ab">A → B</button>
            <button class="segmented-btn" data-mode="sew">SEW</button>
            <button class="segmented-btn" data-mode="nef">NEF</button>
          </div>
        </div>

        <div class="tool-sep"></div>

        <!-- Start -->
        <div class="form-field pos-relative" style="margin-bottom:7px" id="field-start">
          <label class="form-label" for="input-start">Start</label>
          <div class="form-input-wrap">
            <i class="fa-solid fa-location-dot form-input-icon"></i>
            <input type="text" class="form-input" id="input-start" placeholder="Adresse oder Lat, Lon" ${!isOnline ? 'disabled' : ''} autocomplete="off">
          </div>
          <div id="results-start" class="geocoder-results hidden"></div>
        </div>

        <!-- Ziel -->
        <div class="form-field pos-relative" style="margin-bottom:7px">
          <label class="form-label" for="input-target" id="label-target">Ziel</label>
          <div class="form-input-wrap">
            <i class="fa-solid fa-flag-checkered form-input-icon"></i>
            <input type="text" class="form-input" id="input-target" placeholder="Adresse oder Lat, Lon" ${!isOnline ? 'disabled' : ''} autocomplete="off">
          </div>
          <div id="results-target" class="geocoder-results hidden"></div>
        </div>

        <button class="form-submit" style="margin-bottom:10px" id="btn-start-routing" ${!isOnline ? 'disabled' : ''}>
          <i class="fa-solid fa-route"></i> Start
        </button>

        <!-- Getrennte Container für Status, Details und Liste -->
        <div id="routing-status" class="result-container hidden"></div>
        <div id="routing-details" class="result-container hidden"></div>
        <div id="routing-results" class="result-container hidden"></div>
      </div>
      
      ${getSidebarFooterHtml()}
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  setupSidebarToggle(
    document.getElementById('sidebar')!,
    document.getElementById('sidebar-tab')!,
    document.getElementById('sidebar-backdrop')!
  );

  const btnStart = document.getElementById('btn-start-routing')!;
  const routeMode = document.getElementById('route-mode')!;
  const fieldStart = document.getElementById('field-start')!;
  const labelTarget = document.getElementById('label-target')!;

  const inputStart = document.getElementById('input-start') as HTMLInputElement;
  const inputTarget = document.getElementById('input-target') as HTMLInputElement;
  const resultsStart = document.getElementById('results-start')!;
  const resultsTarget = document.getElementById('results-target')!;

  const routeProvider = document.getElementById('route-provider') as HTMLSelectElement;
  const routeProfile = document.getElementById('route-profile') as HTMLSelectElement;

  const updateProfileOptions = (provider: string) => {
    if (provider === 'valhalla') {
      routeProfile.innerHTML = VALHALLA_PROFILES.map(p => `<option value="${p}">${p}</option>`).join('');
      routeProfile.disabled = false;
    } else {
      routeProfile.innerHTML = profiles.length > 0
        ? profiles.map(p => `<option value="${p}">${p}</option>`).join('')
        : '<option>Dienst offline</option>';
      routeProfile.disabled = !isOnline;
    }
  };

  routeProvider.addEventListener('change', () => updateProfileOptions(routeProvider.value), { signal });

  const fieldProvider = document.getElementById('field-provider')!;

  const updateModeUI = (mode: string) => {
    if (mode === 'ab') {
      fieldStart.classList.remove('hidden');
      fieldProvider.classList.remove('hidden');
      labelTarget.textContent = 'Ziel';
    } else {
      fieldStart.classList.add('hidden');
      fieldProvider.classList.add('hidden');
      labelTarget.textContent = 'Einsatzort (Ziel)';
      // SEW/NEF unterstützen nur ORS (Matrix-Suche). Nur zurücksetzen, wenn Valhalla gewählt war —
      // sonst geht ein bereits gewähltes ORS-Profil (z.B. driving-emergency) beim Moduswechsel
      // verloren (Regression, gefunden im finalen Whole-Branch-Review 2026-08-19).
      if (routeProvider.value !== 'ors') {
        routeProvider.value = 'ors';
        updateProfileOptions('ors');
      }
    }
    // Bei Modus-Wechsel alles leeren
    document.getElementById('routing-status')!.classList.add('hidden');
    document.getElementById('routing-details')!.classList.add('hidden');
    document.getElementById('routing-results')!.classList.add('hidden');
  };

  routeMode.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    routeMode.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateModeUI(btn.getAttribute('data-mode')!);
  });

  const getCoordsFromInput = (input: HTMLInputElement): [number, number] | null => {
    if (input.dataset.lat && input.dataset.lon) {
      return [parseFloat(input.dataset.lat), parseFloat(input.dataset.lon)];
    }
    return parseCoords(input.value);
  };

  const setupGeocoder = (input: HTMLInputElement, resultsContainer: HTMLElement) => {
    // Rohe Koordinaten-Eingabe ("lat, lon") löst keine Geocoder-Suche aus.
    input.addEventListener('input', () => {
      delete input.dataset.lat;
      delete input.dataset.lon;
    }, { signal });

    new GeocoderSearchField(input, resultsContainer, {
      signal,
      suppressWhen: (query) => parseCoords(query) !== null,
      onSelect: (selection) => {
        input.dataset.lat = String(selection.lat);
        input.dataset.lon = String(selection.lon);
      }
    });
  };

  setupGeocoder(inputStart, resultsStart);
  setupGeocoder(inputTarget, resultsTarget);

  if (isOnline) {
    btnStart.addEventListener('click', async () => {
      const mode = routeMode.querySelector('.segmented-btn.active')?.getAttribute('data-mode') as 'ab' | 'sew' | 'nef';
      const target = getCoordsFromInput(inputTarget);
      const profile = (document.getElementById('route-profile') as HTMLSelectElement).value;
      const provider = mode === 'ab'
        ? (routeProvider.value as 'ors' | 'valhalla')
        : 'ors'; // SEW/NEF unterstützen nur ORS

      if (mode === 'ab') {
        const start = getCoordsFromInput(inputStart);
        if (start && target) {
          onRouteStart({ start, target, profile, mode, provider });
        } else { alert('Bitte Start und Ziel eingeben.'); }
      } else {
        if (target) {
          renderRoutingLoading('Suche Standorte...');
          onRouteStart({ target, profile, mode, provider });
        } else { alert('Bitte Einsatzort (Ziel) eingeben.'); }
      }
    });
  }
};

export const renderRoutingLoading = (message: string) => {
  const status = document.getElementById('routing-status')!;
  status.classList.remove('hidden');
  status.innerHTML = `
    <div class="result-header">
      <span class="badge ${LOADING_BADGE}">
        <i class="fa-solid fa-spinner fa-spin"></i> ${message}
      </span>
    </div>
  `;
  document.getElementById('routing-details')!.classList.add('hidden');
  document.getElementById('routing-results')!.classList.add('hidden');
};

export const renderRoutingError = (message: string) => {
  const status = document.getElementById('routing-status')!;
  status.classList.remove('hidden');
  status.innerHTML = `
    <div class="result-header">
      <span class="badge ${ERROR_BADGE}">
        <i class="fa-solid fa-triangle-exclamation"></i> ${message}
      </span>
    </div>
  `;
};

export const updateRoutingSummary = (
  distance: number,
  duration: number,
  title: string = 'Zusammenfassung',
  profile?: string,
  extras?: RouteExtras,
  segments?: RouteSegment[]
) => {
  const details = document.getElementById('routing-details')!;
  const distKm = (distance / 1000).toFixed(2);
  const durMin = Math.round(duration / 60);

  const kvHtml = `
    <div class="result-kv">
      <div class="result-kv-item"><span class="result-kv-label">Distanz</span><span class="result-kv-value">${distKm} km</span></div>
      <div class="result-kv-item"><span class="result-kv-label">Dauer</span><span class="result-kv-value">${durMin} min</span></div>
    </div>
  `;

  const summaryRowHtml = profile
    ? (() => {
        const badge = getProfileBadge(profile);
        return `
          <div class="result-summary-row">
            <span class="result-mode-icon" title="${badge.label}" aria-label="${badge.label}" role="img">
              <i class="${badge.icon}" aria-hidden="true"></i>
            </span>
            ${kvHtml}
          </div>
        `;
      })()
    : kvHtml;

  const warningBadgesHtml = getRouteWarnings(extras)
    .map((w) => `<span class="badge ${WARNING_BADGE} badge-wrap"><i class="${w.icon}"></i> ${w.label}</span>`)
    .join('');

  const steps = formatSteps(segments);
  const disclosureHtml = steps.length > 0
    ? `
      <details class="disclosure">
        <summary class="disclosure-header">
          <span class="disclosure-title">Wegbeschreibung</span>
          <span class="disclosure-count badge ${STEP_COUNT_BADGE}">${steps.length} Schritte</span>
          <i class="fa-solid fa-chevron-down disclosure-chevron"></i>
        </summary>
        <div class="disclosure-body">
          ${steps.map((s) => `
            <div class="disclosure-item">
              ${s.iconMarkup}
              <span class="disclosure-item-text">${s.text}</span>
              <span class="disclosure-item-meta mono">${s.meta}</span>
            </div>
          `).join('')}
        </div>
      </details>
    `
    : '';

  details.classList.remove('hidden');
  details.innerHTML = `
    <div class="result-header">
      <span class="result-label">${title}</span>
    </div>
    <div class="result-list">
      <div class="result-item active no-click">
        ${summaryRowHtml}
        ${warningBadgesHtml ? `<div class="result-badges">${warningBadgesHtml}</div>` : ''}
      </div>
    </div>
    ${disclosureHtml}
  `;
};

export const renderStationResults = (
  stations: RoutingStation[],
  onToggle: (station: RoutingStation, active: boolean) => void,
  onHighlight: (station: RoutingStation) => void
) => {
  const results = document.getElementById('routing-results')!;
  const status = document.getElementById('routing-status')!;
  status.classList.add('hidden');

  if (stations.length === 0) {
    results.classList.add('hidden');
    results.innerHTML = '';
    return;
  }

  results.classList.remove('hidden');
  results.innerHTML = `
    <div class="result-header">
      <span class="result-count">${stations.length} Standorte gefunden</span>
    </div>
    <div class="result-label">Nächste Stützpunkte</div>
    <div class="result-list">
      ${stations.map((s, i) => `
        <div class="result-item" data-index="${i}">
          <div class="result-item-header">
            <span class="result-num">${i + 1}</span>
            <span class="result-item-title">${s.name}</span>
          </div>
          <div class="result-item-sub">${s.org || ''}</div>
          <div class="result-kv">
            <div class="result-kv-item"><span class="result-kv-label">Dauer</span><span class="result-kv-value">${Math.round(s.duration / 60)} min</span></div>
            <div class="result-kv-item"><span class="result-kv-label">Distanz</span><span class="result-kv-value">${(s.distance / 1000).toFixed(1)} km</span></div>
          </div>
          <button class="result-action toggle-route-btn" title="Route umschalten"><i class="fa-solid fa-eye"></i></button>
        </div>
      `).join('')}
    </div>
  `;

  results.querySelectorAll('.result-item').forEach(item => {
    const idx = parseInt(item.getAttribute('data-index')!);
    const station = stations[idx];
    const toggleBtn = item.querySelector('.toggle-route-btn') as HTMLButtonElement;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = toggleBtn.classList.toggle('active');
      onToggle(station, isActive);
    });

    item.addEventListener('click', () => {
      const isAlreadyActive = item.classList.contains('active');
      results.querySelectorAll('.result-item').forEach(i => i.classList.remove('active'));
      
      if (!isAlreadyActive) {
        item.classList.add('active');
      }
      onHighlight(station);
    });
  });
};
