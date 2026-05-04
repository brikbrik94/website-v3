import { RoutingService } from '../lib/RoutingService';
import { GeocoderService, GeocodeResult } from '../lib/GeocoderService';
import { APP_VERSION } from '../version';

export interface RoutingParams {
  start?: [number, number];
  target: [number, number];
  profile: string;
  mode: 'ab' | 'sew' | 'nef';
}

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
    if (results) results.style.display = 'none';
  }
};

export const initRoutingSidebar = async (
  container: HTMLElement,
  onRouteStart: (params: RoutingParams) => void
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
        <div class="form-field">
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

        <div class="sidebar-sep"></div>

        <!-- Profil Auswahl -->
        <div class="form-field">
          <label class="form-label" for="route-profile">Profil</label>
          <select class="form-select" id="route-profile" ${!isOnline ? 'disabled' : ''}>
            ${profiles.length > 0 
              ? profiles.map(p => `<option value="${p}">${p}</option>`).join('')
              : '<option>Dienst offline</option>'
            }
          </select>
        </div>

        <!-- Modus Auswahl -->
        <div class="form-field">
          <span class="form-label">Modus</span>
          <div class="segmented" id="route-mode">
            <button class="segmented-btn active" data-mode="ab">A → B</button>
            <button class="segmented-btn" data-mode="sew">SEW</button>
            <button class="segmented-btn" data-mode="nef">NEF</button>
          </div>
        </div>

        <div class="sidebar-sep"></div>

        <!-- Start -->
        <div class="form-field" id="field-start" style="position: relative;">
          <label class="form-label" for="input-start">Start</label>
          <div class="form-input-wrap">
            <i class="fa-solid fa-location-dot form-input-icon"></i>
            <input type="text" class="form-input" id="input-start" placeholder="Adresse oder Lat, Lon" ${!isOnline ? 'disabled' : ''} autocomplete="off">
          </div>
          <div id="results-start" class="geocoder-results" style="display: none;"></div>
        </div>

        <!-- Ziel -->
        <div class="form-field" style="position: relative;">
          <label class="form-label" for="input-target" id="label-target">Ziel</label>
          <div class="form-input-wrap">
            <i class="fa-solid fa-flag-checkered form-input-icon"></i>
            <input type="text" class="form-input" id="input-target" placeholder="Adresse oder Lat, Lon" ${!isOnline ? 'disabled' : ''} autocomplete="off">
          </div>
          <div id="results-target" class="geocoder-results" style="display: none;"></div>
        </div>

        <button class="form-submit" id="btn-start-routing" ${!isOnline ? 'disabled' : ''}>
          <i class="fa-solid fa-route"></i> Start
        </button>

        <!-- Getrennte Container für Status, Details und Liste -->
        <div id="routing-status" class="result-container" style="display: none; margin-top: 12px;"></div>
        <div id="routing-details" class="result-container" style="display: none; margin-top: 12px;"></div>
        <div id="routing-results" class="result-container" style="display: none; margin-top: 12px;"></div>
      </div>
      
      <div class="sidebar-footer">
        <span class="sidebar-footer-version">${APP_VERSION}</span>
        <button class="sidebar-footer-copyright" onclick="window.dispatchEvent(new CustomEvent('open-copyright'))" title="Copyright & Lizenzen">©</button>
      </div>
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  // Hilfs-Style
  const style = document.createElement('style');
  style.textContent = `
    .sidebar-inner { display: flex; flex-direction: column; gap: 12px; }
    .sidebar-inner .tool-sep { margin: 4px 0; }
    .sidebar-inner .form-submit { margin-top: 8px; }
    .result-action {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--muted);
      transition: all var(--transition-fast);
    }
    .result-action:hover { border-color: var(--accent); color: var(--accent); }
    .result-action.active { background: var(--accent); border-color: var(--accent); color: white; }
    
    /* Fix Sichtbarkeit wenn Karte aktiv ist */
    .result-item.active .result-action:not(.active) {
      border-color: rgba(255,255,255,0.2);
      color: var(--text);
    }
    .result-item.active .result-action:not(.active):hover {
      border-color: white;
    }
  `;
  document.head.appendChild(style);

  const btnStart = document.getElementById('btn-start-routing')!;
  const routeMode = document.getElementById('route-mode')!;
  const fieldStart = document.getElementById('field-start')!;
  const labelTarget = document.getElementById('label-target')!;

  const inputStart = document.getElementById('input-start') as HTMLInputElement;
  const inputTarget = document.getElementById('input-target') as HTMLInputElement;
  const resultsStart = document.getElementById('results-start')!;
  const resultsTarget = document.getElementById('results-target')!;

  const updateModeUI = (mode: string) => {
    if (mode === 'ab') {
      fieldStart.style.display = 'flex';
      labelTarget.textContent = 'Ziel';
    } else {
      fieldStart.style.display = 'none';
      labelTarget.textContent = 'Einsatzort (Ziel)';
    }
    // Bei Modus-Wechsel alles leeren
    document.getElementById('routing-status')!.style.display = 'none';
    document.getElementById('routing-details')!.style.display = 'none';
    document.getElementById('routing-results')!.style.display = 'none';
  };

  routeMode.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    routeMode.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateModeUI(btn.getAttribute('data-mode')!);
  });

  const parseCoords = (val: string): [number, number] | null => {
    const parts = val.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return [parts[0], parts[1]] as [number, number];
    }
    return null;
  };

  const getCoordsFromInput = (input: HTMLInputElement): [number, number] | null => {
    if (input.dataset.lat && input.dataset.lon) {
      return [parseFloat(input.dataset.lat), parseFloat(input.dataset.lon)];
    }
    return parseCoords(input.value);
  };

  const setupGeocoder = (input: HTMLInputElement, resultsContainer: HTMLElement) => {
    let timeout: any;
    input.addEventListener('input', () => {
      delete input.dataset.lat;
      delete input.dataset.lon;
      clearTimeout(timeout);
      const query = input.value.trim();
      if (query.length < 3 || parseCoords(query)) {
        resultsContainer.style.display = 'none';
        return;
      }
      timeout = setTimeout(async () => {
        const results = await GeocoderService.search(query);
        renderResults(results, input, resultsContainer);
      }, 400);
    });
    document.addEventListener('click', (e) => {
      if (!input.contains(e.target as Node) && !resultsContainer.contains(e.target as Node)) {
        resultsContainer.style.display = 'none';
      }
    });
  };

  const renderResults = (results: GeocodeResult[], input: HTMLInputElement, container: HTMLElement) => {
    if (results.length === 0) {
      container.style.display = 'none';
      return;
    }
    container.innerHTML = results.map(r => `
      <div class="geocoder-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.display_name}">
        <strong>${r.display_name.split(',')[0]}</strong>
        <span>${r.display_name.split(',').slice(1).join(',')}</span>
      </div>
    `).join('');
    container.style.display = 'block';
    container.querySelectorAll('.geocoder-item').forEach(item => {
      item.addEventListener('click', () => {
        const lat = item.getAttribute('data-lat')!;
        const lon = item.getAttribute('data-lon')!;
        const name = item.getAttribute('data-name')!;
        input.value = name;
        input.dataset.lat = lat;
        input.dataset.lon = lon;
        container.style.display = 'none';
      });
    });
  };

  setupGeocoder(inputStart, resultsStart);
  setupGeocoder(inputTarget, resultsTarget);

  if (isOnline) {
    btnStart.addEventListener('click', async () => {
      const mode = routeMode.querySelector('.segmented-btn.active')?.getAttribute('data-mode') as 'ab' | 'sew' | 'nef';
      const target = getCoordsFromInput(inputTarget);
      const profile = (document.getElementById('route-profile') as HTMLSelectElement).value;

      if (mode === 'ab') {
        const start = getCoordsFromInput(inputStart);
        if (start && target) {
          onRouteStart({ start, target, profile, mode });
        } else { alert('Bitte Start und Ziel eingeben.'); }
      } else {
        if (target) {
          renderRoutingLoading('Suche Standorte...');
          onRouteStart({ target, profile, mode });
        } else { alert('Bitte Einsatzort (Ziel) eingeben.'); }
      }
    });
  }
};

export const renderRoutingLoading = (message: string) => {
  const status = document.getElementById('routing-status')!;
  status.style.display = 'block';
  status.innerHTML = `
    <div class="result-header">
      <span class="badge badge-yellow">
        <i class="fa-solid fa-spinner fa-spin"></i> ${message}
      </span>
    </div>
  `;
  document.getElementById('routing-details')!.style.display = 'none';
  document.getElementById('routing-results')!.style.display = 'none';
};

export const renderRoutingError = (message: string) => {
  const status = document.getElementById('routing-status')!;
  status.style.display = 'block';
  status.innerHTML = `
    <div class="result-header">
      <span class="badge badge-red">
        <i class="fa-solid fa-triangle-exclamation"></i> ${message}
      </span>
    </div>
  `;
};

export const updateRoutingSummary = (distance: number, duration: number, title: string = 'Zusammenfassung') => {
  const details = document.getElementById('routing-details')!;
  const distKm = (distance / 1000).toFixed(2);
  const durMin = Math.round(duration / 60);

  details.style.display = 'block';
  details.innerHTML = `
    <div class="result-header">
      <span class="result-label">${title}</span>
    </div>
    <div class="result-list">
      <div class="result-item active" style="cursor: default;">
        <div class="result-kv">
          <div class="result-kv-item"><span class="result-kv-label">Distanz</span><span class="result-kv-value">${distKm} km</span></div>
          <div class="result-kv-item"><span class="result-kv-label">Dauer</span><span class="result-kv-value">${durMin} min</span></div>
        </div>
      </div>
    </div>
  `;
};

export const renderStationResults = (
  stations: any[],
  onToggle: (station: any, active: boolean) => void,
  onHighlight: (station: any) => void
) => {
  const results = document.getElementById('routing-results')!;
  const status = document.getElementById('routing-status')!;
  status.style.display = 'none';

  results.style.display = 'block';
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
