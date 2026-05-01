import { initTopbar } from '../components/Topbar';

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
    } catch (error) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--danger);">
            <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden der Daten.
          </td>
        </tr>
      `;
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
          <a href="/info/debug" class="sidebar-nav-item nav-link ${subpath === 'debug' ? 'active' : ''}" data-module="debug">
            <i class="fa-solid fa-terminal nav-icon"></i> API Debug
          </a>
        </div>
        <div class="sidebar-footer">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 8px;">
            <span class="sidebar-footer-version">v3.0.0</span>
            <a href="/nah" class="nav-link" style="color: var(--accent); font-size: 0.72rem; text-decoration: none;">
              <i class="fa-solid fa-arrow-left"></i> Zurück zur Karte
            </a>
          </div>
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
