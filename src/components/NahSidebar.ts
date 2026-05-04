import { NahStationResult } from '../pages/NahPage';
import { APP_VERSION } from '../version';

/**
 * OE5ITH NAH Sidebar Komponente
 */

export const initNahSidebar = (container: HTMLElement) => {
  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <aside class="sidebar sidebar-left open" id="sidebar">
      <div class="sidebar-inner">
        <div style="font-size:0.88rem; font-weight:600; color:#fff; margin-bottom:12px">Nächste Stützpunkte</div>
        <div id="nah-sidebar-results">
          <div class="result-empty">
            <i class="fa-solid fa-arrow-pointer"></i>
            Klicke auf einen Punkt in der Karte, um die 5 nächsten NAH-Stützpunkte zu berechnen.
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <span class="sidebar-footer-version">${APP_VERSION}</span>
        <div class="sidebar-footer-status" id="sidebar-status-container">
          <span class="footer-status-text">verbinden...</span>
          <span class="footer-dot"></span>
        </div>
        <button class="sidebar-footer-copyright">©</button>
      </div>
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </aside>
  `;

  const sidebar = document.getElementById('sidebar')!;
  const sidebarTab = document.getElementById('sidebar-tab')!;
  const sidebarBackdrop = document.getElementById('sidebar-backdrop')!;

  const toggleSidebar = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const isOpen = sidebar.classList.toggle('mobile-open');
      sidebarBackdrop.classList.toggle('visible', isOpen);
      sidebarTab.textContent = isOpen ? '‹' : '›';
    } else {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
      sidebarTab.textContent = isCollapsed ? '›' : '‹';
    }
  };

  sidebarTab.addEventListener('click', toggleSidebar);
  sidebarBackdrop.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    sidebarBackdrop.classList.remove('visible');
    sidebarTab.textContent = '›';
  });
};

export const updateNahServerStatus = (online: boolean) => {
  const container = document.getElementById('sidebar-status-container');
  if (!container) return;
  
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
