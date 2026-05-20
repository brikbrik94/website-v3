import { NahStation, NahResponse } from '../../types/nah';
import { formatTime } from '../../lib/UIUtils';

/**
 * Renders the NAH Status UI module.
 */
export const renderNahStatusModule = async (container: HTMLElement, signal?: AbortSignal) => {
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
      <div class="card-grid mb-gap" id="nah-stats-cards"></div>
      
      <div id="nah-tables-container" class="flex-col gap-24">
        <!-- 1. Active Table -->
        <div class="panel">
          <div class="panel-header">
            <div class="panel-title t-success"><i class="fa-solid fa-helicopter"></i> Aktuell im Dienst</div>
          </div>
          <div class="panel-body panel-body-flush table-wrapper">
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
                <tr><td colspan="6" class="text-center tbl-cell-pad-20">Lade...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Standby Table -->
        <div class="panel" id="nah-panel-standby">
          <div class="panel-header">
            <div class="panel-title t-danger"><i class="fa-solid fa-clock"></i> Außer Dienst (Betriebszeit)</div>
          </div>
          <div class="panel-body panel-body-flush table-wrapper">
            <table class="ci-table">
              <thead>
                <tr>
                  <th class="table-col-25">Station</th>
                  <th class="table-col-25">Organisation</th>
                  <th class="table-col-25">Typ</th>
                  <th class="table-col-25">Nächster Dienst</th>
                </tr>
              </thead>
              <tbody id="nah-table-body-standby"></tbody>
            </table>
          </div>
        </div>

        <!-- 3. Off Season Table -->
        <div class="panel" id="nah-panel-offseason">
          <div class="panel-header">
            <div class="panel-title t-muted"><i class="fa-solid fa-snowflake"></i> Aktuell keine Saison</div>
          </div>
          <div class="panel-body panel-body-flush table-wrapper">
            <table class="ci-table">
              <thead>
                <tr>
                  <th class="table-col-25">Station</th>
                  <th class="table-col-25">Organisation</th>
                  <th class="table-col-25">Typ</th>
                  <th class="table-col-25">Status</th>
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
        <h1 class="t-h1 m-0 t-success">${activeCount}</h1>
        <h3>Verfügbar</h3>
        <p class="t-body">Aktuell einsatzbereit</p>
      </div>

      <div class="card card-dashboard">
        <h1 class="t-h1 m-0 t-muted">${offSeasonCount}</h1>
        <h3>Saisonpause</h3>
        <p class="t-body">Von gesamt ${total} Stationen</p>
      </div>
      
      <div class="card card-dashboard">
        <div class="card-status-dot online no-dot-bg">
          <i class="fa-solid fa-moon t-subtle"></i>
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
              <div class="font-medium">${s.callsign}</div>
              <div class="t-small t-subtle">${s.name}</div>
            </td>
            <td>${s.region}</td>
            <td><span class="badge badge-gray">${s.op_type}</span></td>
            <td>
              ${!s.in_season 
                ? '<span class="badge badge-gray">SAISONPAUSE</span>' 
                : `<span class="badge badge-red">AB ${formatTime(s.calculated_start || null)}</span>`}
            </td>
          </tr>
        `;
      }
      return `
        <tr>
          <td>
            <div class="font-medium">${s.callsign}</div>
            <div class="t-small t-subtle">${s.name}</div>
          </td>
          <td>${s.region}</td>
          <td><span class="badge badge-gray">${s.op_type}</span></td>
          <td class="mono">${formatTime(s.calculated_start || null)}</td>
          <td class="mono">${formatTime(s.calculated_end || null)}</td>
          <td><span class="badge badge-green">EINSATZBEREIT</span></td>
        </tr>
      `;
    };

    tableBodyActive.innerHTML = activeStations.map(s => renderRow(s)).join('') || '<tr><td colspan="6" class="text-center tbl-cell-pad-12">Keine Stationen aktiv</td></tr>';
    tableBodyStandby.innerHTML = standbyStations.map(s => renderRow(s, true)).join('') || '<tr><td colspan="4" class="text-center tbl-cell-pad-12">Keine Stationen auf Standby</td></tr>';
    tableBodyOffseason.innerHTML = offSeasonStations.map(s => renderRow(s, true)).join('') || '<tr><td colspan="4" class="text-center tbl-cell-pad-12">Alle Stationen in Saison</td></tr>';
  };

  const fetchData = async () => {
    if (signal?.aborted || !container.isConnected) return;
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    try {
      const response = await fetch('/api/nah.php', { signal });
      const data: NahResponse = await response.json();
      
      if (signal?.aborted || !container.isConnected) return;

      stations = data.stations || [];

      metaContainer.innerHTML = `Stand: ${new Date().toLocaleTimeString()}`;
      renderStatsCards(stations);
      renderTable();

      if (data.refresh_at) {
        scheduleNextRefresh(data.refresh_at);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      tableBodyActive.innerHTML = `
        <tr>
          <td colspan="6" class="text-center tbl-cell-pad-2rem t-danger">
            <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden der Daten.
          </td>
        </tr>
      `;
      // Retry in 60s
      scheduleNextRefresh(60000);
    } finally {
      if (!signal?.aborted) {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
      }
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
  
  if (signal) {
    signal.addEventListener('abort', () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
    });
  }

  fetchData();
};
