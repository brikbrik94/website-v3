import { initTopbar } from '../components/Topbar';
import { Toast } from '../lib/Toast';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';

interface NahStation {
  name: string;
  callsign: string;
  region: string;
  op_type: string;
  is_active: boolean;
  in_season: boolean;
  is_night_ready: boolean;
  calculated_start: string | null;
  calculated_end: string | null;
}

interface NahResponse {
  refresh_at: string;
  stations: NahStation[];
}

interface InventoryMap {
  name: string;
  project: string;
  type: string;
  file: {
    url: string;
    stats: {
      size_str: string;
      date_str: string;
    };
  };
  style: {
    url: string;
  };
}

interface InventoryFont {
  family: string;
  variants: Array<{
    name: string;
    style: string;
    url: string;
  }>;
}

interface InventorySprite {
  name: string;
  url: string;
  preview: string;
}

interface InventoryResponse {
  generated_at: string;
  maps: InventoryMap[];
  fonts: InventoryFont[];
  sprites: InventorySprite[];
}

const formatTime = (iso: string | null): string => {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '-';
  }
};

/**
 * Renders the NAH Status UI module.
 */
const renderNahStatusModule = async (container: HTMLElement) => {
  let stations: NahStation[] = [];
  let sortColumn: keyof NahStation = 'callsign';
  let sortDir: 'asc' | 'desc' = 'asc';

  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">NAH <span>Status</span></h1>
        <p class="page-subtitle">Echtzeit-Verfügbarkeit der Notarzthubschrauber-Stationen</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="nah-meta">Lade Daten...</div>
        <button class="page-action" id="nah-refresh-btn">
          <i class="fa-solid fa-sync"></i> Aktualisieren
        </button>
      </div>
    </header>

    <div class="content-body">
      <div class="card-grid" id="nah-stats-cards" style="margin-bottom: var(--card-gap);"></div>
      
      <div id="nah-tables-container" style="display: flex; flex-direction: column; gap: 24px;">
        <!-- 1. Active Table -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title" style="color: var(--success);"><i class="fa-solid fa-helicopter"></i> Aktuell im Dienst</div>
          </div>
          <div class="panel-body panel-body-flush" style="overflow-x: auto;">
            <table class="ci-table">
              <thead>
                <tr>
                  <th class="sortable" data-sort="callsign">Station</th>
                  <th class="sortable" data-sort="region">Organisation</th>
                  <th class="sortable" data-sort="op_type">Typ</th>
                  <th class="sortable mono" data-sort="calculated_start">Start (BCET)</th>
                  <th class="sortable mono" data-sort="calculated_end">Ende (ECET)</th>
                  <th class="sortable" data-sort="is_active">Status</th>
                </tr>
              </thead>
              <tbody id="nah-table-body-active">
                <tr><td colspan="6" style="text-align: center; padding: 20px;">Lade...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Standby Table -->
        <div class="panel" id="nah-panel-standby">
          <div class="panel-header">
            <div class="panel-title" style="color: var(--danger);"><i class="fa-solid fa-clock"></i> Außer Dienst (Betriebszeit)</div>
          </div>
          <div class="panel-body panel-body-flush" style="overflow-x: auto;">
            <table class="ci-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Station</th>
                  <th style="width: 25%;">Organisation</th>
                  <th style="width: 25%;">Typ</th>
                  <th style="width: 25%;">Nächster Dienst</th>
                </tr>
              </thead>
              <tbody id="nah-table-body-standby"></tbody>
            </table>
          </div>
        </div>

        <!-- 3. Off Season Table -->
        <div class="panel" id="nah-panel-offseason">
          <div class="panel-header">
            <div class="panel-title" style="color: var(--muted);"><i class="fa-solid fa-snowflake"></i> Aktuell keine Saison</div>
          </div>
          <div class="panel-body panel-body-flush" style="overflow-x: auto;">
            <table class="ci-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Station</th>
                  <th style="width: 25%;">Organisation</th>
                  <th style="width: 25%;">Typ</th>
                  <th style="width: 25%;">Status</th>
                </tr>
              </thead>
              <tbody id="nah-table-body-offseason"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  const tableBodyActive = document.getElementById('nah-table-body-active')!;
  const tableBodyStandby = document.getElementById('nah-table-body-standby')!;
  const tableBodyOffseason = document.getElementById('nah-table-body-offseason')!;
  const metaContainer = document.getElementById('nah-meta')!;
  const refreshBtn = document.getElementById('nah-refresh-btn') as HTMLButtonElement;
  const headers = container.querySelectorAll('th.sortable');
  let refreshTimeout: any = null;

  const scheduleNextRefresh = (refreshAt: string | number) => {
    if (refreshTimeout) clearTimeout(refreshTimeout);

    // Prevent memory leaks: stop if container is no longer in DOM
    if (!container.isConnected) return;

    let delay: number;
    if (typeof refreshAt === 'string') {
      const targetTime = Date.parse(refreshAt);
      const now = Date.now();
      delay = targetTime - now + 10000; // 10s buffer
    } else {
      delay = refreshAt;
    }

    if (delay < 30000) delay = 30000;

    refreshTimeout = setTimeout(async () => {
      if (!container.isConnected) return;
      await fetchData();
    }, delay);
  };

  const renderStatsCards = (stations: NahStation[]) => {
    const statsContainer = document.getElementById('nah-stats-cards');
    if (!statsContainer) return;

    const total = stations.length;
    const inSeasonStations = stations.filter(s => s.in_season);
    const activeStations = inSeasonStations.filter(s => s.is_active);
    
    const activeCount = activeStations.length;
    const inSeasonCount = inSeasonStations.length;
    const offSeasonCount = total - inSeasonCount;
    
    // Calculate night ready count (only for in-season stations)
    const nightReadyCount = inSeasonStations.filter(s => s.is_night_ready).length;

    let statusClass = 'offline';
    let statusLabel = 'Keine Stationen aktiv';
    const ratio = inSeasonCount > 0 ? activeCount / inSeasonCount : 0;

    if (activeCount === 0) {
      statusClass = 'offline';
    } else if (ratio > 0.5) {
      statusClass = 'online';
      statusLabel = 'Einsatzbereit';
    } else {
      statusClass = 'unknown';
      statusLabel = 'Eingeschränkt bereit';
    }

    statsContainer.innerHTML = `
      <div class="card card-dashboard">
        <div class="card-status-dot ${statusClass}" title="${statusLabel}"></div>
        <h3>Bereitschaft</h3>
        <p class="t-body">${activeCount} von ${inSeasonCount} im Dienst</p>
      </div>

      <div class="card card-dashboard">
        <h1 class="t-h1" style="margin: 0; color: var(--success);">${activeCount}</h1>
        <h3>Verfügbar</h3>
        <p class="t-body">Aktuell einsatzbereit</p>
      </div>

      <div class="card card-dashboard">
        <h1 class="t-h1" style="margin: 0; color: var(--muted);">${offSeasonCount}</h1>
        <h3>Saisonpause</h3>
        <p class="t-body">Von gesamt ${total} Stationen</p>
      </div>
      
      <div class="card card-dashboard">
        <div class="card-status-dot online" style="background: none; box-shadow: none;">
          <i class="fa-solid fa-moon" style="color: var(--subtle);"></i>
        </div>
        <h3>Nacht-Bereit</h3>
        <p class="t-body">${nightReadyCount} Stationen (H24)</p>
      </div>
    `;
  };

  const renderTable = () => {
    // Sorting logic
    const sorted = [...stations].sort((a, b) => {
      let valA = a[sortColumn] ?? '';
      let valB = b[sortColumn] ?? '';
      
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Update headers UI
    headers.forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (th.getAttribute('data-sort') === sortColumn) {
        th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });

    const activeStations = sorted.filter(s => s.in_season && s.is_active);
    const standbyStations = sorted.filter(s => s.in_season && !s.is_active);
    const offSeasonStations = sorted.filter(s => !s.in_season);

    // Helper to render row
    const renderRow = (s: NahStation, simple = false) => {
      if (simple) {
        return `
          <tr>
            <td>
              <div style="font-weight: 500;">${s.callsign}</div>
              <div style="font-size: 0.8rem; color: var(--subtle);">${s.name}</div>
            </td>
            <td>${s.region}</td>
            <td><span class="badge badge-gray">${s.op_type}</span></td>
            <td>
              ${!s.in_season 
                ? '<span class="badge badge-gray">SAISONPAUSE</span>' 
                : `<span class="badge badge-red">AB ${formatTime(s.calculated_start)}</span>`}
            </td>
          </tr>
        `;
      }
      return `
        <tr>
          <td>
            <div style="font-weight: 500;">${s.callsign}</div>
            <div style="font-size: 0.8rem; color: var(--subtle);">${s.name}</div>
          </td>
          <td>${s.region}</td>
          <td><span class="badge badge-gray">${s.op_type}</span></td>
          <td class="mono">${formatTime(s.calculated_start)}</td>
          <td class="mono">${formatTime(s.calculated_end)}</td>
          <td><span class="badge badge-green">EINSATZBEREIT</span></td>
        </tr>
      `;
    };

    tableBodyActive.innerHTML = activeStations.map(s => renderRow(s)).join('') || '<tr><td colspan="6" style="text-align: center; padding: 12px;">Keine Stationen aktiv</td></tr>';
    tableBodyStandby.innerHTML = standbyStations.map(s => renderRow(s, true)).join('') || '<tr><td colspan="4" style="text-align: center; padding: 12px;">Keine Stationen auf Standby</td></tr>';
    tableBodyOffseason.innerHTML = offSeasonStations.map(s => renderRow(s, true)).join('') || '<tr><td colspan="4" style="text-align: center; padding: 12px;">Alle Stationen in Saison</td></tr>';
  };

  const fetchData = async () => {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    try {
      const response = await fetch('/api/nah.php');
      const data: NahResponse = await response.json();
      stations = data.stations || [];

      metaContainer.innerHTML = `Stand: ${new Date().toLocaleTimeString()}`;
      renderStatsCards(stations);
      renderTable();

      if (data.refresh_at) {
        scheduleNextRefresh(data.refresh_at);
      }
    } catch (error) {
      tableBodyActive.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--danger);">
            <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden der Daten.
          </td>
        </tr>
      `;
      // Retry in 60s
      scheduleNextRefresh(60000);
    } finally {
      refreshBtn.classList.remove('loading');
      refreshBtn.disabled = false;
    }
  };

  headers.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort') as keyof NahStation;
      if (sortColumn === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = col;
        sortDir = 'asc';
      }
      renderTable();
    });
  });

  refreshBtn.addEventListener('click', fetchData);
  fetchData();
};

/**
 * Renders the Map Inventory module.
 */
const renderInventoryModule = async (container: HTMLElement) => {
  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Karten <span>Inventar</span></h1>
        <p class="page-subtitle">Verzeichnis der verfügbaren Karten-Layer, Schriftarten und Sprites.</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="inventory-meta">Lade Verzeichnis...</div>
        <button class="page-action" id="inventory-refresh-btn">
          <i class="fa-solid fa-sync"></i> Aktualisieren
        </button>
      </div>
    </header>

    <div class="content-body" id="inventory-content">
      <div style="text-align: center; padding: calc(2 * var(--card-gap));">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Lade Karten-Inventar...
      </div>
    </div>
  `;

  const content = document.getElementById('inventory-content')!;
  const meta = document.getElementById('inventory-meta')!;
  const refreshBtn = document.getElementById('inventory-refresh-btn') as HTMLButtonElement;

  const fetchData = async () => {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;

    try {
      const response = await fetch('https://tiles.oe5ith.at/inventory.json');
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data: InventoryResponse = await response.json();

      meta.textContent = `Stand: ${new Date(data.generated_at).toLocaleString()}`;
      renderData(data);
    } catch (error) {
      Toast.error('Fehler beim Laden des Karten-Inventars');
      content.innerHTML = `
        <div class="card card-warn">
          <strong>Fehler:</strong> Das Inventar konnte nicht geladen werden. Bitte versuchen Sie es später erneut.
        </div>
      `;
    } finally {
      refreshBtn.classList.remove('loading');
      refreshBtn.disabled = false;
    }
  };

  const renderData = (data: InventoryResponse) => {
    const types = ['basemap', 'overlay', 'elevation'];
    const typeLabels: Record<string, string> = {
      'basemap': 'Basemaps',
      'overlay': 'Overlays',
      'elevation': 'Elevation'
    };

    let html = '';

    // Render Maps grouped by type
    types.forEach(type => {
      const maps = data.maps.filter(m => m.type === type);
      if (maps.length === 0) return;

      html += `
        <h2 class="t-h2" style="margin-top: 0;">${typeLabels[type]}</h2>
        <div class="card-grid" style="margin-bottom: calc(1.5 * var(--card-gap));">
          ${maps.map(map => `
            <div class="card">
              <div class="card-content-header">
                <h3 title="${map.name}">${map.name}</h3>
                <span class="card-badge">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </div>
              <p class="t-body">
                Projekt: <strong>${map.project}</strong><br>
                Größe: ${map.file.stats.size_str}
              </p>
              <span class="t-url" title="${map.file.url}">${map.file.url}</span>
            </div>
          `).join('')}
        </div>
      `;
    });

    // Render Assets (Fonts & Sprites)
    html += `<h2 class="t-h2">Assets</h2>`;
    html += `<div class="card-grid">`;

    // Fonts Card
    html += `
      <div class="card">
        <div class="card-content-header">
          <h3>Schriftarten</h3>
          <span class="card-badge">Fonts</span>
        </div>
        <div class="t-small" style="margin-top: 12px;">
          ${data.fonts.map(f => `
            <div style="margin-bottom: 8px;">
              <div style="color: #fff; font-weight: 600;">${f.family}</div>
              <div>${f.variants.length} Varianten</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Sprites Card
    html += `
      <div class="card">
        <div class="card-content-header">
          <h3>Icon Sprites</h3>
          <span class="card-badge">Sprites</span>
        </div>
        <div class="t-small" style="margin-top: 12px;">
          ${data.sprites.map(s => `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <img src="${s.preview}" style="width: 20px; height: 20px; background: var(--bg); padding: 2px; border-radius: var(--badge-radius);">
              <span>${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    html += `</div>`; // end Assets grid

    content.innerHTML = html;
  };

  refreshBtn.addEventListener('click', fetchData);
  fetchData();
};

/**
 * Renders the Service Health monitoring module.
 */
const renderHealthModule = async (container: HTMLElement) => {
  const services = [
    { id: 'backend', name: 'Backend Core', url: '/api/ping.php', icon: 'fa-brands fa-php', description: 'Basis API-Infrastruktur' },
    { id: 'database', name: 'PostgreSQL Database', url: '/api/db.php', icon: 'fa-solid fa-database', description: 'PostGIS Datenbank Status' },
    { id: 'nah', name: 'NAH Service', url: '/api/nah.php', icon: 'fa-solid fa-helicopter', description: 'Luftrettung Echtzeit-Daten' },
    { id: 'ors', name: 'Routing API (ORS)', url: '/api/ors.php?path=status', icon: 'fa-solid fa-route', description: 'OpenRouteService Status' },
    { id: 'geocoder', name: 'Geocoder (Nominatim)', url: '/api/geocoder.php', icon: 'fa-solid fa-location-dot', description: 'Adress-Suche & Reverse Geocoding' },
    { id: 'tiles', name: 'Tile Registry', url: 'https://tiles.oe5ith.at/inventory.json', icon: 'fa-solid fa-layer-group', description: 'Karten-Layer Verzeichnis' }
  ];

  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Service <span>Health</span></h1>
        <p class="page-subtitle">Live-Monitor der technischen Dienste und APIs. Details in docs/API_ENDPOINTS.md.</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="health-meta">Initialisierung...</div>
        <button class="page-action" id="health-refresh-btn">
          <i class="fa-solid fa-sync"></i> Jetzt prüfen
        </button>
      </div>
    </header>

    <div class="content-body">
      <div class="panel">
        <div class="panel-body">
          <div class="status-panel" id="health-list">
            ${services.map(s => `
              <div class="status-row" id="svc-${s.id}">
                <div class="status-row-left">
                  <i class="${s.icon} status-row-icon"></i>
                  <div style="display: flex; flex-direction: column;">
                    <span class="status-row-name" title="${s.description}">${s.name}</span>
                    <span class="t-small mono" style="opacity: 0.5;">${s.url}</span>
                  </div>
                </div>
                <div class="status-row-right">
                  <span class="status-row-value mono">-- ms</span>
                  <div class="status-dot"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  const meta = container.querySelector('#health-meta')!;
  const refreshBtn = container.querySelector('#health-refresh-btn') as HTMLButtonElement;
  let refreshTimeout: any = null;

  const pingService = async (service: typeof services[0]) => {
    const row = container.querySelector(`#svc-${service.id}`)!;
    const latencyEl = row.querySelector('.status-row-value')!;
    const dot = row.querySelector('.status-dot')!;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(service.url, { 
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      const latency = Math.round(performance.now() - start);
      latencyEl.textContent = `${latency} ms`;
      
      dot.classList.remove('on', 'warn', 'off');
      if (response.ok) {
        if (latency < 200) dot.classList.add('on');
        else if (latency < 500) dot.classList.add('warn');
        else dot.classList.add('off');
      } else {
        dot.classList.add('off');
      }
    } catch (e) {
      latencyEl.textContent = 'Error';
      dot.classList.remove('on', 'warn', 'off');
      dot.classList.add('off');
    }
  };

  const runAllChecks = async () => {
    if (!container.isConnected) return;
    
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    meta.textContent = 'Prüfe...';

    await Promise.all(services.map(s => pingService(s)));

    meta.textContent = `Stand: ${new Date().toLocaleTimeString()}`;
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;

    scheduleNext();
  };

  const scheduleNext = () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (!container.isConnected) return;

    refreshTimeout = setTimeout(() => {
      runAllChecks();
    }, 30000);
  };

  refreshBtn.addEventListener('click', () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    runAllChecks();
  });

  runAllChecks();
};

interface StatsResponse {
  generated_at: string;
  nah: Record<string, { total: number, active: number }>;
  rd: Record<string, number>;
  nef: Record<string, number>;
}

/**
 * Renders the Regions Analysis module.
 */
const renderRegionsModule = async (container: HTMLElement) => {
  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Regions <span>Analyse</span></h1>
        <p class="page-subtitle">Verfügbarkeit nach Organisation und Einsatzgebieten (NAH, RD, NEF).</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="regions-meta">Lade Daten...</div>
        <button class="page-action" id="regions-refresh-btn">
          <i class="fa-solid fa-sync"></i> Aktualisieren
        </button>
      </div>
    </header>

    <div class="content-body" id="regions-content">
      <div style="text-align: center; padding: calc(2 * var(--card-gap));">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Berechne regionale Analyse...
      </div>
    </div>
  `;

  const content = document.getElementById('regions-content')!;
  const meta = document.getElementById('regions-meta')!;
  const refreshBtn = document.getElementById('regions-refresh-btn') as HTMLButtonElement;
  let refreshTimeout: any = null;

  const renderData = (data: StatsResponse) => {
    let html = '';

    // 1. NAH Stats
    const nahRegions = Object.keys(data.nah).sort();
    html += `<h2 class="t-h2" style="margin-top: 0;">Luftrettung (NAH)</h2>`;
    html += `<div class="card-grid" style="margin-bottom: 32px;">`;
    nahRegions.forEach(region => {
      const { total, active } = data.nah[region];
      const pct = Math.round((active / total) * 100);
      let statusClass = 'unknown';
      if (pct === 100) statusClass = 'online';
      else if (pct === 0) statusClass = 'offline';

      html += `
        <div class="card card-dashboard">
          <div class="card-status-dot ${statusClass}" title="${pct}% bereit"></div>
          <h3 title="${region}">${region}</h3>
          <p class="t-body" style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 600;">${active} / ${total}</span> 
            <span class="badge badge-gray">${pct}%</span>
          </p>
        </div>
      `;
    });
    html += `</div>`;

    // 2. RD & NEF Stats grouped by State
    const states = Array.from(new Set([...Object.keys(data.rd), ...Object.keys(data.nef)])).sort();
    html += `<h2 class="t-h2">Boden-Rettungsmittel (RD & NEF)</h2>`;
    html += `<div class="card-grid">`;
    states.forEach(state => {
      const rdCount = data.rd[state] || 0;
      const nefCount = data.nef[state] || 0;

      html += `
        <div class="card card-dashboard">
          <h3 title="${state}" style="border: none; padding-bottom: 0;">${state}</h3>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="t-small">Rettungsdienst (RD)</span>
              <span style="font-weight: 600;">${rdCount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="t-small">Notarzt (NEF)</span>
              <span style="font-weight: 600;">${nefCount}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;

    content.innerHTML = html;
  };

  const fetchData = async () => {
    if (!container.isConnected) return;
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;

    try {
      const response = await fetch('/api/stats.php');
      const data: StatsResponse = await response.json();

      renderData(data);
      meta.innerHTML = `Stand: ${new Date(data.generated_at).toLocaleTimeString()}`;
      
      scheduleNext();
    } catch (error) {
      content.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 2rem;">
        <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden der Regionaldaten.
      </div>`;
      scheduleNext(60000);
    } finally {
      refreshBtn.classList.remove('loading');
      refreshBtn.disabled = false;
    }
  };

  const scheduleNext = (delay = 30000) => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (!container.isConnected) return;
    refreshTimeout = setTimeout(fetchData, delay);
  };

  refreshBtn.addEventListener('click', () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    fetchData();
  });

  fetchData();
};

/**
 * Renders the API Debug technical playground.
 */
const renderDebugModule = async (container: HTMLElement) => {
  const safeEndpoints = [
    { name: 'NAH Stations', url: '/api/nah.php', params: '' },
    { name: 'Regional Stats', url: '/api/stats.php', params: '' },
    { name: 'Service Health', url: '/api/ping.php', params: '' },
    { name: 'Database Status', url: '/api/db.php', params: '' },
    { name: 'ORS Health', url: '/api/ors.php?path=health', params: '' }
  ];

  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">API <span>Debug</span></h1>
        <p class="page-subtitle">Technischer Playground zur Inspektion von Rohdaten (Read-Only).</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta">Sandbox Mode</div>
      </div>
    </header>

    <div class="content-body">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title"><i class="fa-solid fa-sliders"></i> Abfrage-Parameter</div>
        </div>
        <div class="panel-body">
          <div class="form-row">
            <div class="form-field" style="flex: 1; min-width: 200px;">
              <label class="form-label" for="debug-endpoint">Endpoint</label>
              <select class="form-select" id="debug-endpoint">
                ${safeEndpoints.map(e => `<option value="${e.url}">${e.name} (${e.url})</option>`).join('')}
              </select>
            </div>
            <div class="form-field" style="flex: 2; min-width: 200px;">
              <label class="form-label" for="debug-params">Parameters (optional)</label>
              <input type="text" class="form-input mono" id="debug-params" placeholder="?key=val&..." value="">
            </div>
            <button class="btn btn-primary" id="debug-send-btn">
              <i class="fa-solid fa-play"></i> Senden
            </button>
          </div>
        </div>
      </div>

      <div id="debug-response-container" style="display: none;">
        <div class="panel panel-code">
          <div class="panel-header">
            <div class="panel-title">
              <i class="fa-solid fa-code"></i> API Response
            </div>
            <div class="panel-header-right">
              <span id="debug-status" class="badge">---</span>
              <span id="debug-latency" class="panel-meta">-- ms</span>
              <button class="btn btn-sm btn-ghost" id="debug-copy-btn">
                <i class="fa-solid fa-copy"></i> Kopieren
              </button>
            </div>
          </div>
          <pre id="debug-json-viewer" class="code-viewer-pre"></pre>
        </div>
      </div>

      <div id="debug-empty-state">
        <div class="card-info">
          <i class="fa-solid fa-terminal" style="margin-right: 8px;"></i>
          <strong>Hinweis:</strong> Wähle einen Endpunkt und klicke auf <code class="t-code">Senden</code>, um die API-Analyse zu starten.
        </div>
      </div>
    </div>
  `;

  const endpointSelect = document.getElementById('debug-endpoint') as HTMLSelectElement;
  const paramsInput = document.getElementById('debug-params') as HTMLInputElement;
  const sendBtn = document.getElementById('debug-send-btn') as HTMLButtonElement;
  const responseContainer = document.getElementById('debug-response-container')!;
  const emptyState = document.getElementById('debug-empty-state')!;
  const jsonViewer = document.getElementById('debug-json-viewer')!;
  const statusBadge = document.getElementById('debug-status')!;
  const latencyEl = document.getElementById('debug-latency')!;
  const copyBtn = document.getElementById('debug-copy-btn')!;

  let lastResponse: any = null;

  const runRequest = async () => {
    const url = endpointSelect.value + paramsInput.value;
    
    sendBtn.classList.add('loading');
    sendBtn.disabled = true;
    emptyState.style.display = 'none';
    responseContainer.style.display = 'block';
    jsonViewer.textContent = '// Requesting data...';
    
    const start = performance.now();
    try {
      const response = await fetch(url);
      const latency = Math.round(performance.now() - start);
      
      statusBadge.textContent = `${response.status} ${response.statusText}`;
      statusBadge.className = `badge ${response.ok ? 'badge-green' : 'badge-red'}`;
      latencyEl.textContent = `${latency} ms`;
      
      const data = await response.json();
      
      // Basic sanitization: never show anything named "pass", "key", "token" or "secret"
      // while our APIs don't return these, this is a safety layer.
      const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
        const k = key.toLowerCase();
        if (k.includes('pass') || k.includes('key') || k.includes('token') || k.includes('secret')) {
          return '******** [REDACTED]';
        }
        return value;
      }));

      lastResponse = sanitized;
      jsonViewer.textContent = JSON.stringify(sanitized, null, 2);
    } catch (error: any) {
      statusBadge.textContent = 'ERROR';
      statusBadge.className = 'badge badge-red';
      latencyEl.textContent = '-- ms';
      jsonViewer.textContent = `Error: ${error.message}`;
    } finally {
      sendBtn.classList.remove('loading');
      sendBtn.disabled = false;
    }
  };

  sendBtn.addEventListener('click', runRequest);

  copyBtn.addEventListener('click', () => {
    if (lastResponse) {
      navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
      Toast.success('JSON in die Zwischenablage kopiert');
    }
  });
};

/**
 * Info & Debug Page
 * Handles layout and module switching via sidebar.
 */
export const initInfoPage = async (container: HTMLElement, subpath: string = 'nah') => {
  container.innerHTML = `
    <div id="topbar-mount"></div>
    <div class="layout">
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-section-label">MODULE</div>
          <a href="/info/nah" class="sidebar-nav-item nav-link ${subpath === 'nah' ? 'active' : ''}" data-module="nah">
            <i class="fa-solid fa-helicopter nav-icon"></i> NAH Status
          </a>
          <a href="/info/health" class="sidebar-nav-item nav-link ${subpath === 'health' ? 'active' : ''}" data-module="health">
            <i class="fa-solid fa-heart-pulse nav-icon"></i> Service Health
          </a>
          <a href="/info/regions" class="sidebar-nav-item nav-link ${subpath === 'regions' ? 'active' : ''}" data-module="regions">
            <i class="fa-solid fa-map-location nav-icon"></i> Regions Analyse
          </a>
          <a href="/info/inventory" class="sidebar-nav-item nav-link ${subpath === 'inventory' ? 'active' : ''}" data-module="inventory">
            <i class="fa-solid fa-layer-group nav-icon"></i> Karten Inventar
          </a>
          <a href="/info/debug" class="sidebar-nav-item nav-link ${subpath === 'debug' ? 'active' : ''}" data-module="debug">
            <i class="fa-solid fa-terminal nav-icon"></i> API Debug
          </a>
        </div>
        ${getSidebarFooterHtml()}
        <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
      </aside>
      <main class="page-content" id="info-content-mount">
      </main>
    </div>
  `;

  setupSidebarToggle(
    document.getElementById('sidebar')!,
    document.getElementById('sidebar-tab')!,
    document.getElementById('sidebar-backdrop')!
  );

  // Initialize Topbar (minimal version for landing/info)
  const topbarMount = document.getElementById('topbar-mount')!;
  initTopbar(topbarMount, [], () => {});

  const contentMount = document.getElementById('info-content-mount')!;
  
  if (subpath === 'nah') {
    renderNahStatusModule(contentMount);
  } else if (subpath === 'health') {
    renderHealthModule(contentMount);
  } else if (subpath === 'regions') {
    renderRegionsModule(contentMount);
  } else if (subpath === 'inventory') {
    renderInventoryModule(contentMount);
  } else if (subpath === 'debug') {
    renderDebugModule(contentMount);
  } else {
    contentMount.innerHTML = `
      <div class="content-body">
        <div class="panel">
          <div class="panel-body">Coming soon...</div>
        </div>
      </div>
    `;
  }
};
