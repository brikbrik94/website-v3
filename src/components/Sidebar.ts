import { MapItem } from '../pages/MapPage';

export const initSidebar = (
  container: HTMLElement,
  overlays: MapItem[],
  onOverlayToggle: (id: string, url: string, checked: boolean) => void
) => {
  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Overlays</div>
        <div class="accordion">
          <div class="acc-group open" id="group-overlays">
            <div class="acc-header" role="button" tabindex="0">
              <span class="acc-dot" style="background: var(--accent)"></span>
              <span class="acc-title">Verfügbare Overlays</span>
              <span class="acc-status unloaded" id="overlay-status">nicht geladen</span>
              <i class="fa-solid fa-chevron-down acc-chevron"></i>
            </div>
            <div class="acc-controls">
              <button class="acc-ctrl-btn" id="btn-all-on">Alle an</button>
              <button class="acc-ctrl-btn" id="id-all-off">Alle aus</button>
            </div>
            <div class="acc-body" id="overlay-list">
              ${overlays.map(m => `
                <div class="acc-item" data-style-url="${m.style.url}" data-id="${m.name.toLowerCase().replace(/\s+/g, '-')}">
                  <span class="acc-checkbox"></span>
                  <span class="acc-item-label">${m.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <span class="sidebar-footer-version">v3.0.0</span>
      </div>
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  const sidebar = document.getElementById('sidebar')!;
  const sidebarTab = document.getElementById('sidebar-tab')!;
  const sidebarBackdrop = document.getElementById('sidebar-backdrop')!;
  const accHeader = container.querySelector('.acc-header')!;
  const accGroup = container.querySelector('#group-overlays')!;
  const overlayList = container.querySelector('#overlay-list')!;
  const overlayStatus = container.querySelector('#overlay-status')!;
  const btnAllOn = container.querySelector('#btn-all-on')!;
  const btnAllOff = container.querySelector('#id-all-off')!;

  const updateOverlayStatus = () => {
    const items = overlayList.querySelectorAll('.acc-item');
    const checked = overlayList.querySelectorAll('.acc-item.checked');
    
    overlayStatus.className = 'acc-status';
    if (checked.length === 0) {
      overlayStatus.classList.add('unloaded');
      overlayStatus.textContent = 'nicht geladen';
    } else if (checked.length === items.length) {
      overlayStatus.classList.add('all-on');
      overlayStatus.textContent = 'alle aktiv';
    } else {
      overlayStatus.classList.add('partial');
      overlayStatus.textContent = `${checked.length} Layer`;
    }
  };

  // Sidebar Logic
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

  // Accordion Logic
  accHeader.addEventListener('click', () => {
    const body = accGroup.querySelector('.acc-body') as HTMLElement;
    const isOpen = accGroup.classList.toggle('open');
    if (isOpen) {
      body.style.setProperty('--acc-body-height', body.scrollHeight + 'px');
    }
  });

  // Overlay Toggle Logic via Delegation
  overlayList.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.acc-item') as HTMLElement;
    if (!item) return;

    const isChecked = item.classList.toggle('checked');
    const styleUrl = item.getAttribute('data-style-url')!;
    const id = item.getAttribute('data-id')!;

    onOverlayToggle(id, styleUrl, isChecked);
    updateOverlayStatus();
  });

  // Bulk Controls
  btnAllOn.addEventListener('click', (e) => {
    e.stopPropagation();
    overlayList.querySelectorAll('.acc-item:not(.checked)').forEach(item => {
      const el = item as HTMLElement;
      el.classList.add('checked');
      onOverlayToggle(el.getAttribute('data-id')!, el.getAttribute('data-style-url')!, true);
    });
    updateOverlayStatus();
  });

  btnAllOff.addEventListener('click', (e) => {
    e.stopPropagation();
    overlayList.querySelectorAll('.acc-item.checked').forEach(item => {
      const el = item as HTMLElement;
      el.classList.remove('checked');
      onOverlayToggle(el.getAttribute('data-id')!, el.getAttribute('data-style-url')!, false);
    });
    updateOverlayStatus();
  });

  // Init status
  updateOverlayStatus();
};
