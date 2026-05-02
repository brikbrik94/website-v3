import { initTopbar } from '../components/Topbar';
import { Toast } from '../lib/Toast';

interface NahStation {
  name: string;
  callsign: string;
  region: string;
  op_type: string;
  is_active: boolean;
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
      <div class="card-grid" id="nah-stats-cards" style="margin-bottom: 24px;"></div>
      <div class="panel">
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
            <tbody id="nah-table-body">
              <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                  <i class="fa-solid fa-circle-notch fa-spin"></i> Lade Stationen...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tableBody = document.getElementById('nah-table-body')!;
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
    const active = stations.filter(s => s.is_active).length;
    const night = stations.filter(s => s.is_night_ready).length;

    let nextEventTime: Date | null = null;
    let nextEventCallsign = '';
    const now = new Date();

    stations.forEach(s => {
      [s.calculated_start, s.calculated_end].forEach(iso => {
        if (iso) {
          const d = new Date(iso);
          if (d > now) {
            if (!nextEventTime || d < nextEventTime) {
              nextEventTime = d;
              nextEventCallsign = s.callsign;
            }
          }
        }
      });
    });

    let statusClass = 'offline';
    let statusLabel = 'Keine Stationen aktiv';
    const ratio = total > 0 ? active / total : 0;

    if (active === 0) {
      statusClass = 'offline';
      statusLabel = 'Keine Stationen aktiv';
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
        <p>${active} von ${total} Stationen</p>
      </div>

      <div class="card card-dashboard">
        <div style="font-size: 2rem; font-weight: 700; color: var(--success); line-height: 1;">${active}</div>
        <h3>Im Dienst</h3>
        <p>Aktuell einsatzbereit</p>
      </div>

      <div class="card card-dashboard">
        <i class="fa-solid fa-moon" style="position: absolute; top: 14px; right: 14px; color: var(--subtle);"></i>
        <h3>Nacht-Bereit</h3>
        <p>${night} Stationen (H24)</p>
      </div>

      <div class="card card-dashboard">
        <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 4px;">${nextEventCallsign || '-'}</div>
        <h3>Nächster Wechsel</h3>
        <p>${nextEventTime ? formatTime((nextEventTime as Date).toISOString()) : '-'}</p>
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

    tableBody.innerHTML = sorted.map(station => `
      <tr>
        <td>
          <div style="font-weight: 500;">${station.callsign}</div>
          <div style="font-size: 0.8rem; color: var(--subtle);">${station.name}</div>
        </td>
        <td>${station.region}</td>
        <td><span class="badge badge-gray">${station.op_type}</span></td>
        <td class="mono">${formatTime(station.calculated_start)}</td>
        <td class="mono">${formatTime(station.calculated_end)}</td>
        <td>
          ${station.is_active 
            ? '<span class="badge badge-green">EINSATZBEREIT</span>' 
            : '<span class="badge badge-red">NICHT AKTIV</span>'}
        </td>
      </tr>
    `).join('');
  };

  const fetchData = async () => {
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    try {
      const response = await fetch('/api/nah');
      const data: NahResponse = await response.json();
      stations = data.stations || [];

      metaContainer.innerHTML = `Stand: ${new Date().toLocaleTimeString()}`;
      renderStatsCards(stations);
      renderTable();

      if (data.refresh_at) {
        scheduleNextRefresh(data.refresh_at);
      }
    } catch (error) {
      tableBody.innerHTML = `
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
      <div style="text-align: center; padding: 4rem;">
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
        <h2 class="section-title" style="margin-top: 0;">${typeLabels[type]}</h2>
        <div class="card-grid" style="margin-bottom: 32px;">
          ${maps.map(map => `
            <div class="card">
              <div class="card-content-header">
                <h3 title="${map.name}">${map.name}</h3>
                <span class="card-badge">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </div>
              <p class="card-content">
                Projekt: <strong>${map.project}</strong><br>
                Größe: ${map.file.stats.size_str}
              </p>
              <span class="card-url" title="${map.file.url}">${map.file.url}</span>
            </div>
          `).join('')}
        </div>
      `;
    });

    // Render Assets (Fonts & Sprites)
    html += `<h2 class="section-title">Assets</h2>`;
    html += `<div class="card-grid">`;

    // Fonts Card
    html += `
      <div class="card">
        <div class="card-content-header">
          <h3>Schriftarten</h3>
          <span class="card-badge">Fonts</span>
        </div>
        <div style="font-size: 0.82rem; color: var(--muted); line-height: 1.5; margin-bottom: 12px;">
          ${data.fonts.map(f => `
            <div style="margin-bottom: 8px;">
              <div style="color: #fff; font-weight: 600;">${f.family}</div>
              <div style="font-size: 0.75rem;">${f.variants.length} Varianten</div>
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
        <div style="font-size: 0.82rem; color: var(--muted); line-height: 1.5;">
          ${data.sprites.map(s => `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
              <img src="${s.preview}" style="width: 20px; height: 20px; background: #000; padding: 2px; border-radius: 2px;">
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
    { id: 'backend', name: 'Backend Core', url: '/api/ping', icon: 'fa-brands fa-php', description: 'Basis API-Infrastruktur' },
    { id: 'database', name: 'PostgreSQL Database', url: '/api/db', icon: 'fa-solid fa-database', description: 'PostGIS Datenbank Status' },
    { id: 'nah', name: 'NAH Service', url: '/api/nah', icon: 'fa-solid fa-helicopter', description: 'Luftrettung Echtzeit-Daten' },
    { id: 'ors', name: 'Routing API (ORS)', url: '/api/ors/status', icon: 'fa-solid fa-route', description: 'OpenRouteService Status' },
    { id: 'geocoder', name: 'Geocoder (Nominatim)', url: '/api/geocoder', icon: 'fa-solid fa-location-dot', description: 'Adress-Suche & Reverse Geocoding' },
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
                    <span style="font-size: 0.65rem; color: var(--subtle); font-family: var(--font-mono);">${s.url}</span>
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

/**
 * Renders the Regions Analysis module.
 */
const renderRegionsModule = async (container: HTMLElement) => {
  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Regions <span>Analyse</span></h1>
        <p class="page-subtitle">Verfügbarkeit nach Organisation und Einsatzgebieten.</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="regions-meta">Lade Daten...</div>
        <button class="page-action" id="regions-refresh-btn">
          <i class="fa-solid fa-sync"></i> Aktualisieren
        </button>
      </div>
    </header>

    <div class="content-body">
      <div class="card-grid" id="regions-grid">
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
           <i class="fa-solid fa-circle-notch fa-spin"></i> Berechne regionale Analyse...
        </div>
      </div>
    </div>
  `;

  const grid = document.getElementById('regions-grid')!;
  const meta = document.getElementById('regions-meta')!;
  const refreshBtn = document.getElementById('regions-refresh-btn') as HTMLButtonElement;
  let refreshTimeout: any = null;

  const renderCards = (groups: Record<string, { total: number, active: number }>) => {
    const sortedRegions = Object.keys(groups).sort();
    
    grid.innerHTML = sortedRegions.map(region => {
      const { total, active } = groups[region];
      const pct = Math.round((active / total) * 100);
      
      let statusClass = 'unknown';
      if (pct === 100) statusClass = 'online';
      if (pct === 0) statusClass = 'offline';

      return `
        <div class="card card-dashboard">
          <div class="card-status-dot ${statusClass}" title="${pct}% bereit"></div>
          <h3 title="${region}">${region}</h3>
          <p style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 600;">${active} / ${total}</span> 
            <span class="badge badge-gray" style="font-size: 0.6rem;">${pct}%</span>
          </p>
        </div>
      `;
    }).join('');
  };

  const fetchData = async () => {
    if (!container.isConnected) return;
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;

    try {
      const response = await fetch('/api/nah');
      const data: NahResponse = await response.json();
      const stations = data.stations || [];

      // Group by region
      const groups: Record<string, { total: number, active: number }> = {};
      stations.forEach(s => {
        if (!groups[s.region]) groups[s.region] = { total: 0, active: 0 };
        groups[s.region].total++;
        if (s.is_active) groups[s.region].active++;
      });

      renderCards(groups);
      meta.innerHTML = `Stand: ${new Date().toLocaleTimeString()}`;
      
      scheduleNext();
    } catch (error) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--danger); text-align: center; padding: 2rem;">
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
 * Info & Debug Page
 * Handles layout and module switching via sidebar.
 */
export const initInfoPage = async (container: HTMLElement, subpath: string = 'nah') => {
  container.innerHTML = `
    <div id="topbar-mount"></div>
    <div class="layout">
      <aside class="sidebar">
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
        <div class="sidebar-footer">
          <span class="sidebar-footer-version">v3.0.0</span>
          <button class="sidebar-footer-copyright">©</button>
        </div>
      </aside>
      <main class="page-content" id="info-content-mount">
      </main>
    </div>
  `;

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
