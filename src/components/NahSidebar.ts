import { NahStationResult } from '../types/nah';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';

/**
 * OE5ITH NAH Sidebar Komponente
 */

export const initNahSidebar = (container: HTMLElement) => {
  const extraFooter = `
    <div class="sidebar-footer-status" id="sidebar-status-container" style="display: none;">
      <span class="footer-dot"></span>
      <span class="footer-status-text">verbinden...</span>
    </div>
  `;

  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Luftrettung</div>
        <div id="nah-sidebar-results">
          <div class="result-empty">
            <i class="fa-solid fa-arrow-pointer"></i>
            Klicke auf einen Punkt in der Karte, um die 5 nächsten NAH-Stützpunkte zu berechnen.
          </div>
        </div>
      </div>
      ${getSidebarFooterHtml(extraFooter)}
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </aside>
  `;

  setupSidebarToggle(
    document.getElementById('sidebar')!,
    document.getElementById('sidebar-tab')!,
    document.getElementById('sidebar-backdrop')!
  );
};

export const updateNahServerStatus = (online: boolean) => {
  const container = document.getElementById('sidebar-status-container');
  if (!container) return;
  
  container.style.display = 'flex';
  const textEl = container.querySelector('.footer-status-text') as HTMLElement;
  const dotEl = container.querySelector('.footer-dot') as HTMLElement;

  if (!textEl || !dotEl) return;

  if (online) {
    textEl.textContent = 'online';
    textEl.className = 'footer-status-text green';
    dotEl.className = 'footer-dot green';
  } else {
    textEl.textContent = 'offline';
    textEl.className = 'footer-status-text red';
    dotEl.className = 'footer-dot red';
  }
};

export const renderNahResults = (container: HTMLElement, results: NahStationResult[]) => {
  if (results.length === 0) {
    container.innerHTML = `
      <div class="result-empty">
        <i class="fa-solid fa-circle-exclamation"></i>
        Keine aktiven Stützpunkte gefunden.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="result-list">
      ${results.map((res, index) => `
        <div class="result-item-simple" data-lat="${res.lat}" data-lon="${res.lon}" data-id="${res.osm_id}" data-index="${index}">
          <div class="result-item-header">
            <span class="result-num">${index + 1}</span>
            <span class="result-simple-title">${res.callsign}</span>
          </div>
          <div class="result-simple-org">${res.name}</div>
          <div class="result-simple-meta">
            ${(res.distance / 1000).toFixed(2)} km · Anflug ca. ${res.durationStr} · ETA ca. ${res.eta}
          </div>
        </div>
      `).join('')}
    </div>
  `;
};
