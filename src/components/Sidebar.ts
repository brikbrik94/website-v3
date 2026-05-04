import { MapItem } from '../pages/MapPage';
import { APP_VERSION } from '../version';

export type LayerToggleCallback = (
  overlayId: string, 
  overlayUrl: string, 
  layerId: string, 
  layerType: string, 
  checked: boolean
) => void;

export type BulkToggleCallback = (
  overlayId: string, 
  overlayUrl: string, 
  checked: boolean
) => void;

export const initSidebar = (
  container: HTMLElement,
  overlays: MapItem[],
  onLayerToggle: LayerToggleCallback,
  onBulkToggle?: BulkToggleCallback,
  onGroupExpand?: (overlayId: string) => Promise<void>
) => {
  const loadedLayers = new Map<string, any[]>();

  const renderOverlayGroup = (m: MapItem) => {
    const id = m.name.toLowerCase().replace(/\s+/g, '-');
    return `
      <div class="acc-group" id="group-${id}" data-id="${id}" data-url="${m.style.url}">
        <div class="acc-header" role="button" tabindex="0" aria-expanded="false">
          <span class="acc-dot" style="background: var(--accent)"></span>
          <span class="acc-title">${m.name}</span>
          <span class="acc-status unloaded">nicht geladen</span>
          <i class="fa-solid fa-chevron-down acc-chevron"></i>
        </div>
        <div class="acc-controls">
          <button class="acc-ctrl-btn btn-all-on">Alle an</button>
          <button class="acc-ctrl-btn btn-all-off">Alle aus</button>
        </div>
        <div class="acc-body">
          <div class="acc-item-list">
            <div class="acc-item loading-state" style="padding-left: 24px; color: var(--subtle); font-size: 0.8rem;">
              <i class="fa-solid fa-circle-notch fa-spin"></i> Lade Layer...
            </div>
          </div>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Overlays</div>
        <div class="accordion">
          ${overlays.map(renderOverlayGroup).join('')}
        </div>
      </div>
      <div class="sidebar-footer">
        <span class="sidebar-footer-version">${APP_VERSION}</span>
        <button class="sidebar-footer-copyright" title="Copyright & Lizenzen">©</button>
      </div>
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  const sidebar = document.getElementById('sidebar')!;
  const sidebarTab = document.getElementById('sidebar-tab')!;
  const sidebarBackdrop = document.getElementById('sidebar-backdrop')!;

  const discoverLayers = async (groupEl: HTMLElement) => {
    const id = groupEl.getAttribute('data-id')!;
    if (loadedLayers.has(id)) return;

    const url = groupEl.getAttribute('data-url')!;
    const listEl = groupEl.querySelector('.acc-item-list')!;

    try {
      const res = await fetch(url);
      const style = await res.json();
      const layers = style.layers.filter((l: any) => l.type !== 'background');
      loadedLayers.set(id, layers);

      listEl.innerHTML = layers.map((l: any) => `
        <div class="acc-item" data-layer-id="${l.id}" data-layer-type="${l.type}">
          <span class="acc-checkbox"></span>
          <span class="acc-item-label">${l.id}</span>
        </div>
      `).join('');
      
      const body = groupEl.querySelector('.acc-body') as HTMLElement;
      body.style.setProperty('--acc-body-height', body.scrollHeight + 'px');
    } catch (err) {
      console.error(`Error loading layers for ${id}:`, err);
      listEl.innerHTML = `
        <div class="acc-item" style="color: var(--danger); font-size: 0.8rem; padding-left: 24px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden
        </div>
      `;
    }
  };

  const updateGroupStatus = (groupEl: HTMLElement) => {
    const statusEl = groupEl.querySelector('.acc-status')!;
    const items = groupEl.querySelectorAll('.acc-item:not(.loading-state)');
    const checked = groupEl.querySelectorAll('.acc-item.checked');
    
    statusEl.className = 'acc-status';
    if (checked.length === 0) {
      statusEl.classList.add('unloaded');
      statusEl.textContent = 'nicht geladen';
    } else if (checked.length === items.length && items.length > 0) {
      statusEl.classList.add('all-on');
      statusEl.textContent = 'alle aktiv';
    } else {
      statusEl.classList.add('partial');
      statusEl.textContent = `${checked.length} Layer`;
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

  // Accordion Logic via Delegation
  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Header Click (Toggle Accordion)
    const header = target.closest('.acc-header');
    if (header) {
      const group = header.closest('.acc-group') as HTMLElement;
      const body = group.querySelector('.acc-body') as HTMLElement;
      const isOpen = group.classList.toggle('open');
      header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      
      if (isOpen) {
        await discoverLayers(group);
        const id = group.getAttribute('data-id')!;
        if (onGroupExpand) {
          await onGroupExpand(id);
        }
        body.style.setProperty('--acc-body-height', body.scrollHeight + 'px');
      }
      return;
    }

    // Item Click (Toggle Layer)
    const item = target.closest('.acc-item');
    if (item && !item.classList.contains('loading-state')) {
      const group = item.closest('.acc-group') as HTMLElement;
      const isChecked = item.classList.toggle('checked');
      
      const overlayId = group.getAttribute('data-id')!;
      const overlayUrl = group.getAttribute('data-url')!;
      const layerId = item.getAttribute('data-layer-id')!;
      const layerType = item.getAttribute('data-layer-type')!;

      onLayerToggle(overlayId, overlayUrl, layerId, layerType, isChecked);
      updateGroupStatus(group);
      return;
    }

    // Bulk Buttons
    const btnAllOn = target.closest('.btn-all-on');
    if (btnAllOn) {
      e.stopPropagation();
      const group = btnAllOn.closest('.acc-group') as HTMLElement;
      const overlayId = group.getAttribute('data-id')!;
      const overlayUrl = group.getAttribute('data-url')!;
      
      group.querySelectorAll('.acc-item:not(.checked):not(.loading-state)').forEach(el => {
        el.classList.add('checked');
        const layerId = el.getAttribute('data-layer-id')!;
        const layerType = el.getAttribute('data-layer-type')!;
        onLayerToggle(overlayId, overlayUrl, layerId, layerType, true);
      });

      if (onBulkToggle) onBulkToggle(overlayId, overlayUrl, true);
      updateGroupStatus(group);
      return;
    }

    const btnAllOff = target.closest('.btn-all-off');
    if (btnAllOff) {
      e.stopPropagation();
      const group = btnAllOff.closest('.acc-group') as HTMLElement;
      const overlayId = group.getAttribute('data-id')!;
      const overlayUrl = group.getAttribute('data-url')!;
      
      group.querySelectorAll('.acc-item.checked').forEach(el => {
        el.classList.remove('checked');
        const layerId = el.getAttribute('data-layer-id')!;
        const layerType = el.getAttribute('data-layer-type')!;
        onLayerToggle(overlayId, overlayUrl, layerId, layerType, false);
      });

      if (onBulkToggle) onBulkToggle(overlayId, overlayUrl, false);
      updateGroupStatus(group);
      return;
    }
  });
};
