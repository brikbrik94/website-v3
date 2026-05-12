import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';

export interface TrackingItem {
  id: string | number;
  label: string;
  info: string;
  type: 'adsb' | 'ais';
  lat: number;
  lon: number;
  details?: {
    [key: string]: string | number;
  };
}

// Internal state to support interaction logic
let lastItems: TrackingItem[] = [];

export const initTrackingSidebar = (
  container: HTMLElement,
  onItemClick: (item: TrackingItem) => void
) => {
  container.innerHTML = `
  <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-inner">
      <!-- TYP 6: Status-Panel (Zähler) -->
      <div class="status-panel" id="status-panel-counters">
        <div class="status-row">
          <div class="status-row-left">
            <i class="fa-solid fa-plane status-row-icon"></i>
            <span class="status-row-name">ADS-B Flugzeuge</span>
          </div>
          <div class="status-row-right">
            <span class="status-row-value" id="status-adsb-count">0</span>
            <span class="status-dot off" id="status-adsb-dot"></span>
          </div>
        </div>
        <div class="status-row">
          <div class="status-row-left">
            <i class="fa-solid fa-ship status-row-icon"></i>
            <span class="status-row-name">AIS Schiffe</span>
          </div>
          <div class="status-row-right">
            <span class="status-row-value" id="status-ais-count">0</span>
            <span class="status-dot off" id="status-ais-dot"></span>
          </div>
        </div>
      </div>

      <div class="tool-sep"></div>

      <!-- Mode-Switch (Filter) -->
      <div class="segmented" id="tracking-filter">
        <button class="segmented-btn active" data-filter="all">Alle</button>
        <button class="segmented-btn" data-filter="adsb">ADS-B</button>
        <button class="segmented-btn" data-filter="ais">AIS</button>
      </div>

      <!-- TYP 8: Tracking-Liste -->
      <div class="tracking-list" id="tracking-list">
        <div class="result-empty">
          <i class="fa-solid fa-satellite-dish"></i>
          Warte auf Empfang…
        </div>
      </div>

    </div>
    ${getSidebarFooterHtml()}
    <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
  </aside>
`;

  setupSidebarToggle(
    document.getElementById('sidebar')!,
    document.getElementById('sidebar-tab')!,
    document.getElementById('sidebar-backdrop')!
  );

  // Filter-Logik
  const filterContainer = document.getElementById('tracking-filter')!;
  filterContainer.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (btn) {
      filterContainer.querySelectorAll('.segmented-btn').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter') || 'all';
      container.dispatchEvent(new CustomEvent('tracking-filter-change', { detail: filter }));
    }
  });

  // Accordion-Logik für Tracking-Liste
  const listEl = document.getElementById('tracking-list')!;
  listEl.addEventListener('click', (e) => {
    const header = (e.target as HTMLElement).closest('.tracking-item-header');
    if (header) {
      const itemEl = header.parentElement!;
      const wasActive = itemEl.classList.contains('active');
      
      // Close others
      listEl.querySelectorAll('.tracking-item').forEach(el => el.classList.remove('active'));
      
      if (!wasActive) {
        itemEl.classList.add('active');
        const id = itemEl.getAttribute('data-id')!;
        const type = itemEl.getAttribute('data-type');
        
        const item = lastItems.find(i => String(i.id) === id && i.type === type);
        if (item) {
          onItemClick(item);
        }
      }
    }
  });
};

/**
 * Erlaubt das Setzen des aktiven Tracking-Items von außen (z.B. Map-Click).
 * Klappt das Item auf und scrollt es in den Sichtbereich.
 */
export const setActiveTrackingItem = (id: string | number) => {
  const listEl = document.getElementById('tracking-list');
  if (!listEl) return;

  const items = listEl.querySelectorAll('.tracking-item');
  items.forEach(el => {
    if (el.getAttribute('data-id') === String(id)) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      el.classList.remove('active');
    }
  });
};

/**
 * Provisorischer Export für TrackingPage.ts (wird in Task 4 entfernt).
 */
export const updateObjectDetail = (_item: TrackingItem | null) => {
  // Funktionalität ist jetzt in der Liste integriert (Accordion)
};

export const updateTrackingServerStatus = (adsbOk: boolean, aisOk: boolean) => {
  const adsbVal = document.getElementById('status-adsb-count');
  const adsbDot = document.getElementById('status-adsb-dot');
  const aisVal = document.getElementById('status-ais-count');
  const aisDot = document.getElementById('status-ais-dot');

  if (adsbVal && adsbDot) {
    adsbVal.textContent = adsbOk ? 'online' : 'offline';
    adsbDot.className = `status-dot ${adsbOk ? 'on' : 'off'}`;
  }
  if (aisVal && aisDot) {
    aisVal.textContent = aisOk ? 'online' : 'offline';
    aisDot.className = `status-dot ${aisOk ? 'on' : 'off'}`;
  }
};

export const updateTrackingList = (items: TrackingItem[], currentFilter: string) => {
  lastItems = items;
  const listEl = document.getElementById('tracking-list');
  if (!listEl) return;

  const filteredItems = currentFilter === 'all' 
    ? items 
    : items.filter(i => i.type === currentFilter);

  if (filteredItems.length === 0) {
    listEl.innerHTML = `
      <div class="result-empty">
        <i class="fa-solid fa-satellite-dish"></i>
        ${items.length === 0 ? 'Warte auf Empfang...' : 'Keine Objekte für diesen Filter.'}
      </div>
    `;
    return;
  }

  listEl.innerHTML = filteredItems.map(item => {
    const icon = item.type === 'adsb' ? 'fa-plane' : 'fa-ship';
    const badgeClass = item.type === 'adsb' ? 'badge-blue' : 'badge-gray';
    const badgeLabel = item.type === 'adsb' ? 'ADS-B' : 'AIS';
    
    let kvHtml = '';
    if (item.details) {
      kvHtml = '<div class="result-kv">';
      for (const [key, value] of Object.entries(item.details)) {
        kvHtml += `
          <div class="result-kv-item">
            <span class="result-kv-label">${key}</span>
            <span class="result-kv-value">${value}</span>
          </div>
        `;
      }
      kvHtml += '</div>';
    }

    return `
      <div class="tracking-item" data-type="${item.type}" data-id="${item.id}">
        <div class="tracking-item-header">
          <i class="fa-solid ${icon} tracking-item-icon"></i>
          <span class="tracking-item-name">${item.label}</span>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          <i class="fa-solid fa-chevron-down tracking-item-chevron"></i>
        </div>
        <div class="tracking-item-body">
          ${kvHtml}
        </div>
      </div>
    `;
  }).join('');
};
