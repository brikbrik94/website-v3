import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';

export interface TrackingItem {
  id: string | number;
  label: string;
  info: string;
  type: 'adsb' | 'ais';
  lat: number;
  lon: number;
}

export const initTrackingSidebar = (
  container: HTMLElement,
  onItemClick: (item: TrackingItem) => void
) => {
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
        <div class="sidebar-section-label">LUFTFAHRT (ADS-B)</div>
        <div id="adsb-list" class="result-list" style="max-height: 40vh; overflow-y: auto;">
          <div class="t-small" style="padding: 10px; color: var(--subtle);">Lade Flugdaten...</div>
        </div>

        <div class="sidebar-section-label" style="margin-top: 20px;">SCHIFFFAHRT (AIS)</div>
        <div id="ais-list" class="result-list" style="max-height: 40vh; overflow-y: auto;">
          <div class="t-small" style="padding: 10px; color: var(--subtle);">Lade Schiffsdaten...</div>
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

  container.addEventListener('click', (e) => {
    const itemEl = (e.target as HTMLElement).closest('.result-item-simple');
    if (itemEl) {
      const dataStr = itemEl.getAttribute('data-item');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        onItemClick(data);
        
        // Visual feedback
        document.querySelectorAll('.result-item-simple').forEach(el => el.classList.remove('active'));
        itemEl.classList.add('active');
      }
    }
  });
};

export const updateTrackingServerStatus = (adsbOk: boolean, aisOk: boolean) => {
  const container = document.getElementById('sidebar-status-container');
  if (!container) return;
  
  container.style.display = 'flex';
  const textEl = container.querySelector('.footer-status-text') as HTMLElement;
  const dotEl = container.querySelector('.footer-dot') as HTMLElement;

  if (!textEl || !dotEl) return;

  if (adsbOk && aisOk) {
    textEl.textContent = 'online';
    textEl.className = 'footer-status-text green';
    dotEl.className = 'footer-dot green';
  } else if (adsbOk || aisOk) {
    textEl.textContent = adsbOk ? 'ADS-B only' : 'AIS only';
    textEl.className = 'footer-status-text yellow';
    dotEl.className = 'footer-dot yellow';
  } else {
    textEl.textContent = 'offline';
    textEl.className = 'footer-status-text red';
    dotEl.className = 'footer-dot red';
  }
};

export const updateTrackingList = (id: string, items: TrackingItem[]) => {
  const listEl = document.getElementById(id);
  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = '<div class="t-small" style="padding: 10px; color: var(--subtle);">Keine Objekte gefunden</div>';
    return;
  }

  listEl.innerHTML = items.map(item => {
    const itemData = JSON.stringify(item).replace(/"/g, '&quot;');
    return `
      <div class="result-item-simple" data-item="${itemData}">
        <div class="result-item-title">${item.label}</div>
        <div class="result-item-meta">${item.info}</div>
      </div>
    `;
  }).join('');
};
