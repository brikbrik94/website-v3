import { StatsResponse } from '../../types/common';

/**
 * Renders the Regions Analysis module.
 */
export const renderRegionsModule = async (container: HTMLElement, signal?: AbortSignal) => {
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
      <div class="text-center p-double-gap">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Berechne regionale Analyse...
      </div>
    </div>
  `;

  let content = document.getElementById('regions-content')!;
  let meta = document.getElementById('regions-meta')!;
  let refreshBtn = document.getElementById('regions-refresh-btn') as HTMLButtonElement;
  let refreshTimeout: any = null;

  const renderData = (data: StatsResponse) => {
    let html = '';

    // 1. NAH Stats
    const nahRegions = Object.keys(data.nah).sort();
    html += `<h2 class="t-h2 mt-0">Luftrettung (NAH)</h2>`;
    html += `<div class="card-grid mb-1-5-gap">`;
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
          <p class="t-body flex-align-center gap-8">
            <span class="font-semibold">${active} / ${total}</span> 
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
        <div class="card card-dashboard cursor-pointer" data-state="${state}">
          <h3 title="${state}" class="border-none pb-0">${state}</h3>
          <div class="flex-col gap-4 mt-8">
            <div class="flex-align-center justify-between">
              <span class="t-small">Rettungsdienst (RD)</span>
              <span class="font-semibold">${rdCount}</span>
            </div>
            <div class="flex-align-center justify-between">
              <span class="t-small">Notarzt (NEF)</span>
              <span class="font-semibold">${nefCount}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `</div>`;

    content.innerHTML = html;

    const cards = content.querySelectorAll('.card-dashboard[data-state]');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const state = target.dataset.state;
        if (state) showRegionDetail(state);
      });
    });
  };

  const showRegionDetail = async (state: string) => {
    if (refreshTimeout) clearTimeout(refreshTimeout);

    container.innerHTML = `
      <header class="page-header">
        <div class="page-header-left">
          <button class="page-action" id="regions-back-btn"><i class="fa-solid fa-arrow-left"></i> Zurück</button>
          <h1 class="page-title">${state} <span>Wachen</span></h1>
        </div>
      </header>
      <div class="content-body">
        <div class="text-center p-double-gap">
          <i class="fa-solid fa-circle-notch fa-spin"></i> Lade Stationen...
        </div>
      </div>
    `;

    const backBtn = container.querySelector('#regions-back-btn')!;
    backBtn.addEventListener('click', () => {
      // Restore original HTML structure
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
          <div class="text-center p-double-gap">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Berechne regionale Analyse...
          </div>
        </div>
      `;
      
      // Update element references
      content = document.getElementById('regions-content')!;
      meta = document.getElementById('regions-meta')!;
      refreshBtn = document.getElementById('regions-refresh-btn') as HTMLButtonElement;
      
      refreshBtn.addEventListener('click', () => {
        if (refreshTimeout) clearTimeout(refreshTimeout);
        fetchData();
      });

      fetchData();
    });

    try {
      const response = await fetch(`/api/region_stations.php?state=${encodeURIComponent(state)}`, { signal });
      const data = await response.json();

      if (signal?.aborted || !container.isConnected) return;

      const body = container.querySelector('.content-body')!;
      
      if (data.error) {
        body.innerHTML = `<div class="t-danger text-center p-2rem">Fehler: ${data.error}</div>`;
        return;
      }

      if (data.length === 0) {
        body.innerHTML = `<div class="text-center p-2rem">Keine Stationen gefunden.</div>`;
        return;
      }

      let tableHtml = `
        <div class="table-wrapper">
          <table class="ci-table">
            <thead>
              <tr>
                <th>Typ</th>
                <th>Organisation</th>
                <th>Kurzname</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
      `;

      data.forEach((station: any) => {
        const badgeClass = station.type === 'RD' ? 'badge-gray' : 'badge-red';
        tableHtml += `
          <tr>
            <td><span class="badge ${badgeClass}">${station.type}</span></td>
            <td>${station.org}</td>
            <td>${station.short_name}</td>
            <td>${station.name}</td>
          </tr>
        `;
      });

      tableHtml += `
            </tbody>
          </table>
        </div>
      `;

      body.innerHTML = tableHtml;

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      const body = container.querySelector('.content-body')!;
      if (body) {
         body.innerHTML = `<div class="t-danger text-center p-2rem">
          <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden der Stationen.
        </div>`;
      }
    }
  };

  const fetchData = async () => {
    if (signal?.aborted) return;
    if (!container.isConnected) return;
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;

    try {
      const response = await fetch('/api/stats.php', { signal });
      const data: StatsResponse = await response.json();

      if (signal?.aborted || !container.isConnected) return;

      renderData(data);
      meta.innerHTML = `Stand: ${new Date(data.generated_at).toLocaleTimeString()}`;
      
      scheduleNext();
    } catch (error: any) {
      if (error.name === 'AbortError') return;

      content.innerHTML = `<div class="t-danger text-center p-2rem">
        <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden der Regionaldaten.
      </div>`;
      scheduleNext(60000);
    } finally {
      if (!signal?.aborted) {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
      }
    }
  };

  const scheduleNext = (delay = 30000) => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (signal?.aborted || !container.isConnected) return;
    refreshTimeout = setTimeout(fetchData, delay);
  };

  refreshBtn.addEventListener('click', () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    fetchData();
  });

  if (signal) {
    signal.addEventListener('abort', () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
    });
  }

  fetchData();
};
