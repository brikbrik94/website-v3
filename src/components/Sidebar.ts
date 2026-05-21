import { MapItem } from '../types/inventory';
import { getSidebarFooterHtml } from '../lib/SidebarUtils';

export type LayerToggleCallback = (
  overlayId: string, 
  overlayUrl: string, 
  layerIds: string[], 
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
  onGroupExpand?: (overlayId: string) => Promise<void>,
  layersMeta: any[] = []
) => {
  const loadedLayers = new Map<string, any[]>();

  const renderOverlayGroup = (m: MapItem) => {
    const id = m.name.toLowerCase().replace(/\s+/g, '-');
    return `
      <div class="acc-group" id="group-${id}" data-id="${id}" data-url="${m.style.url}">
        <div class="acc-header" role="button" tabindex="0" aria-expanded="false">
          <span class="acc-dot"></span>
          <span class="acc-title">${m.name}</span>
          <span class="acc-status unloaded">nicht geladen</span>
          <i class="fa-solid fa-chevron-down acc-chevron"></i>
        </div>
        <div class="acc-controls">
          <button class="acc-ctrl-btn btn-all-on" tabindex="0">Alle an</button>
          <button class="acc-ctrl-btn btn-all-off" tabindex="0">Alle aus</button>
        </div>
        <div class="acc-body">
          <div class="acc-item-list">
            <div class="acc-item loading-state">
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
      ${getSidebarFooterHtml()}
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  const sidebar = document.getElementById('sidebar')!;
  const sidebarTab = document.getElementById('sidebar-tab')!;
  const sidebarBackdrop = document.getElementById('sidebar-backdrop')!;

  const updateBodyHeight = (groupEl: HTMLElement) => {
    const body = groupEl.querySelector('.acc-body') as HTMLElement;
    if (groupEl.classList.contains('open')) {
      body.style.setProperty('--acc-body-height', body.scrollHeight + 'px');
    }
  };

  const discoverLayers = async (groupEl: HTMLElement) => {
    const id = groupEl.getAttribute('data-id')!;
    if (loadedLayers.has(id)) return;

    const url = groupEl.getAttribute('data-url')!;
    const listEl = groupEl.querySelector('.acc-item-list')!;

    // Check if we have structured metadata for this overlay
    const meta = layersMeta.find(l => l.id === id);

    if (meta) {
      loadedLayers.set(id, meta.groups);
      listEl.innerHTML = meta.groups.map((g: any) => `
        <div class="acc-item" tabindex="0" role="checkbox" aria-checked="false" data-layer-ids='${JSON.stringify(g.style_layers)}' data-layer-type="${g.template}">
          <span class="acc-checkbox"></span>
          <span class="acc-item-label">${g.name}</span>
        </div>
      `).join('');
    } else {
      // Fallback to style.json parsing
      try {
        const res = await fetch(url);
        const style = await res.json();
        const layers = style.layers.filter((l: any) => l.type !== 'background');
        loadedLayers.set(id, layers);

        listEl.innerHTML = layers.map((l: any) => `
          <div class="acc-item" tabindex="0" role="checkbox" aria-checked="false" data-layer-ids='${JSON.stringify([l.id])}' data-layer-type="${l.type}">
            <span class="acc-checkbox"></span>
            <span class="acc-item-label">${l.id}</span>
          </div>
        `).join('');
      } catch (err) {
        console.error(`Error loading layers for ${id}:`, err);
        listEl.innerHTML = `
          <div class="acc-item error-state">
            <i class="fa-solid fa-triangle-exclamation"></i> Fehler beim Laden
          </div>
        `;
        return;
      }
    }
    
    updateBodyHeight(groupEl);
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

  // Common Action Handlers
  const handleToggleGroup = async (groupEl: HTMLElement) => {
    const header = groupEl.querySelector('.acc-header') as HTMLElement;
    const isOpen = groupEl.classList.toggle('open');
    header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    
    if (isOpen) {
      await discoverLayers(groupEl);
      const id = groupEl.getAttribute('data-id')!;
      if (onGroupExpand) {
        await onGroupExpand(id);
      }
      updateBodyHeight(groupEl);
    }
  };

  const handleToggleItem = (itemEl: HTMLElement) => {
    if (itemEl.classList.contains('loading-state')) return;
    
    const group = itemEl.closest('.acc-group') as HTMLElement;
    const isChecked = itemEl.classList.toggle('checked');
    itemEl.setAttribute('aria-checked', isChecked ? 'true' : 'false');
    
    const overlayId = group.getAttribute('data-id')!;
    const overlayUrl = group.getAttribute('data-url')!;
    const layerIds = JSON.parse(itemEl.getAttribute('data-layer-ids')!);
    const layerType = itemEl.getAttribute('data-layer-type')!;

    onLayerToggle(overlayId, overlayUrl, layerIds, layerType, isChecked);
    updateGroupStatus(group);
  };

  // Keyboard Event Listener
  container.addEventListener('keydown', async (e) => {
    const target = e.target as HTMLElement;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      
      const header = target.closest('.acc-header');
      if (header) {
        await handleToggleGroup(header.closest('.acc-group') as HTMLElement);
        return;
      }

      const item = target.closest('.acc-item');
      if (item) {
        handleToggleItem(item as HTMLElement);
        return;
      }
    }
  });

  // Accordion Logic via Delegation
  container.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;

    // Header Click
    const header = target.closest('.acc-header');
    if (header) {
      await handleToggleGroup(header.closest('.acc-group') as HTMLElement);
      return;
    }

    // Item Click
    const item = target.closest('.acc-item');
    if (item) {
      handleToggleItem(item as HTMLElement);
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
        const itemEl = el as HTMLElement;
        itemEl.classList.add('checked');
        itemEl.setAttribute('aria-checked', 'true');
        const layerIds = JSON.parse(itemEl.getAttribute('data-layer-ids')!);
        const layerType = itemEl.getAttribute('data-layer-type')!;
        onLayerToggle(overlayId, overlayUrl, layerIds, layerType, true);
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
        const itemEl = el as HTMLElement;
        itemEl.classList.remove('checked');
        itemEl.setAttribute('aria-checked', 'false');
        const layerIds = JSON.parse(itemEl.getAttribute('data-layer-ids')!);
        const layerType = itemEl.getAttribute('data-layer-type')!;
        onLayerToggle(overlayId, overlayUrl, layerIds, layerType, false);
      });

      if (onBulkToggle) onBulkToggle(overlayId, overlayUrl, false);
      updateGroupStatus(group);
      return;
    }
  });
};
