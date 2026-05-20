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

  const content = document.getElementById('regions-content')!;
  const meta = document.getElementById('regions-meta')!;
  const refreshBtn = document.getElementById('regions-refresh-btn') as HTMLButtonElement;
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
        <div class="card card-dashboard">
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
