import { MapItem } from '../types/inventory';
import { getSidebarFooterHtml } from '../lib/SidebarUtils';
import { GeocoderSearchField, GeocoderSelection } from '../lib/GeocoderSearchField';
import type { LayerSpecification } from 'maplibre-gl';
import { resolveLegendSwatch, swatchTypeForLayerType, resolveSwatchFromLayersMetaColor, computeSwatchDedupKey, resolveLegendItemsForGroup, type LegendSwatch, type SwatchType, type LegendScale } from '../lib/resolveLegendSwatch';

export interface LayerMetaGroup {
  name: string;
  style_layers: string[];
  template: string;
  type?: string;
  color?: unknown;
  opacity?: number;
  legend_items?: { label: string; color: string }[] | null;
  legend_scale_id?: string | null;
  width?: number | null;
  dasharray?: [number, number] | null;
  outline_color?: string | null;
  outline_width?: number | null;
}

export interface LayerMetaEntry {
  id: string;
  version?: string | null;
  groups: LayerMetaGroup[];
}

export interface LayerToggleEvent {
  overlayId: string;
  overlayUrl: string;
  layerIds: string[];
  layerType: string;
  checked: boolean;
  legendId: string;
  legendLabel: string;
  /** Overlay-Titel (z.B. "Autobahnen"), unabhängig von der einzelnen Instanz — für deduplizierte
   *  Legenden-Zeilen (siehe dedupKey) die passendere Beschriftung als legendLabel. */
  overlayLabel: string;
  swatch: LegendSwatch | null;
  legendItems: { label: string; type: SwatchType; color: string }[] | null;
  /** Deckkraft aus layers.json (`opacity`-Feld), zur Anzeige im Legenden-Swatch. */
  opacity: number | null;
  /**
   * Schlüssel, mit dem MapPage.ts geteilte Legenden-Zeilen ref-zählt/mit id versieht.
   * `overlayId` für den klassischen Pro-Overlay-legend_items-Fall; `scale:<legend_scale_id>`,
   * wenn die Zeile eine geteilte Farbskala ist, die mehrere Overlays betreffen kann (siehe
   * geodata-plugin-standard §5.5 „Invariante"). `null`, wenn weder legendItems noch eine
   * geteilte Skala vorliegt.
   */
  legendGroupKey: string | null;
  /**
   * Dedup-Schlüssel für Overlays, bei denen mehrere Gruppen (z.B. jede Autobahn einzeln) exakt
   * denselben Swatch ergeben — nur gesetzt für den layers.json-Metadaten-Pfad mit echtem
   * `template`/`color` (siehe computeSwatchDedupKey()); `null` beim style.json-Fallback-Pfad, wo
   * kein verlässliches `template` vorliegt und deshalb keine Dedup-Annahme getroffen werden darf.
   */
  dedupKey: string | null;
  itemEl: HTMLElement;
}

export type LayerToggleCallback = (event: LayerToggleEvent) => void;

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
  layersMeta: LayerMetaEntry[] = [],
  legendScales: LegendScale[] = [],
  onSearchSelect?: (selection: GeocoderSelection) => void,
  signal?: AbortSignal
) => {
  const legendScalesById = new Map(legendScales.map(s => [s.id, s]));
  const loadedLayers = new Map<string, LayerMetaGroup[] | LayerSpecification[]>();

  // Separater Cache für den layersMeta-Pfad: layers.json liefert Gruppierung/Namen, aber keine
  // echten LayerSpecifications (kein paint) — für die Legenden-Farbauflösung wird das zugehörige
  // style.json bei Bedarf einmal pro Overlay nachgeladen und hier gecacht (nicht bei jedem Toggle
  // neu). Reine Farbauflösung, betrifft nicht die Accordion-Gruppierung selbst.
  const styleLayersCache = new Map<string, LayerSpecification[]>();

  const fetchStyleLayersForColor = async (overlayId: string, overlayUrl: string): Promise<LayerSpecification[]> => {
    const cached = styleLayersCache.get(overlayId);
    if (cached) return cached;
    try {
      const res = await fetch(overlayUrl);
      const style = await res.json();
      const layers = (style.layers as LayerSpecification[]).filter((l) => l.type !== 'background');
      styleLayersCache.set(overlayId, layers);
      return layers;
    } catch (err) {
      console.error(`[Sidebar] style.json für Legenden-Farbauflösung nicht ladbar (${overlayId}):`, err);
      return [];
    }
  };

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
        <div class="sidebar-section-label">Suche</div>
        <div class="form-field pos-relative" style="margin-bottom:12px">
          <div class="form-input-wrap">
            <i class="fa-solid fa-search form-input-icon"></i>
            <input type="text" class="form-input" id="map-search-input" placeholder="Ort oder Adresse..." autocomplete="off">
          </div>
          <div id="map-search-results" class="geocoder-results hidden"></div>
        </div>
        <div class="sidebar-section-label">Overlays</div>
        <div class="accordion">
          ${overlays.map(renderOverlayGroup).join('')}
        </div>
      </div>
      ${getSidebarFooterHtml()}
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  if (onSearchSelect && signal) {
    const searchInput = document.getElementById('map-search-input') as HTMLInputElement;
    const searchResults = document.getElementById('map-search-results')!;
    new GeocoderSearchField(searchInput, searchResults, { signal, onSelect: onSearchSelect });
  }

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
      listEl.innerHTML = meta.groups.map((g, idx) => `
        <div class="acc-item" tabindex="0" role="checkbox" aria-checked="false" data-layer-ids='${JSON.stringify(g.style_layers)}' data-layer-type="${g.template}" data-group-index="${idx}">
          <span class="acc-checkbox"></span>
          <span class="acc-item-label">${g.name}</span>
        </div>
      `).join('');
    } else {
      // Fallback to style.json parsing
      try {
        const res = await fetch(url);
        const style = await res.json();
        const layers = (style.layers as LayerSpecification[]).filter((l) => l.type !== 'background');
        loadedLayers.set(id, layers);

        listEl.innerHTML = layers.map((l) => `
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

  const buildToggleEvent = async (itemEl: HTMLElement, group: HTMLElement, checked: boolean): Promise<LayerToggleEvent> => {
    const overlayId = group.getAttribute('data-id')!;
    const overlayUrl = group.getAttribute('data-url')!;
    const layerIds: string[] = JSON.parse(itemEl.getAttribute('data-layer-ids')!);
    const layerType = itemEl.getAttribute('data-layer-type')!;
    const legendLabel = itemEl.querySelector('.acc-item-label')?.textContent ?? layerType;
    // Für deduplizierte Zeilen (mehrere Instanzen -> eine Legenden-Zeile, siehe dedupKey unten)
    // ist der Overlay-Name ("Autobahnen") die sinnvollere Beschriftung als der Name der zuerst
    // aktivierten Einzelinstanz ("A1").
    const overlayLabel = group.querySelector('.acc-title')?.textContent?.trim() ?? legendLabel;

    // layers.json liefert seit 2026-07-12 pro Gruppe direkt type/color (und optional
    // legend_items für Match-Farbskalen) — das wird bevorzugt genutzt. Nachladen des vollen
    // style.json (fetchStyleLayersForColor) bleibt nur Fallback für Gruppen/Overlays ohne
    // color-Feld (siehe docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md).
    let swatch: LegendSwatch | null = null;
    let legendItems: { label: string; type: SwatchType; color: string }[] | null = null;
    let opacity: number | null = null;
    let dedupKey: string | null = null;
    let legendGroupKey: string | null = null;

    const loaded = loadedLayers.get(overlayId);
    const isMetaPath = !!loaded && loaded.length > 0 && 'style_layers' in loaded[0];

    if (isMetaPath) {
      const idx = Number(itemEl.getAttribute('data-group-index'));
      const metaGroup = (loaded as LayerMetaGroup[])[idx];
      opacity = typeof metaGroup.opacity === 'number' ? metaGroup.opacity : null;

      const styleEntry = layersMeta.find(l => l.id === overlayId);
      const resolvedItems = resolveLegendItemsForGroup(metaGroup, overlayId, styleEntry?.version, legendScalesById);
      if (resolvedItems) {
        const itemType = swatchTypeForLayerType(metaGroup.type ?? layerType) ?? 'dot';
        legendItems = resolvedItems.items.map(li => ({ ...li, type: itemType }));
        legendGroupKey = resolvedItems.groupKey;
      } else if (metaGroup.color !== undefined) {
        swatch = resolveSwatchFromLayersMetaColor(
          metaGroup.type,
          metaGroup.color,
          metaGroup.width,
          metaGroup.dasharray,
          metaGroup.outline_color,
          metaGroup.outline_width
        );
        if (swatch) {
          dedupKey = computeSwatchDedupKey(overlayId, metaGroup.template, swatch);
        }
      }
    }

    if (!isMetaPath || (!legendItems && swatch === null)) {
      // Fallback: kein layersMeta-Pfad ODER Gruppe ohne color-Feld (Alt-/Sonderfall, z.B. ein
      // Overlay ganz ohne layersMeta-Eintrag).
      let realLayer: LayerSpecification | undefined;
      if (loaded && !isMetaPath) {
        realLayer = (loaded as LayerSpecification[]).find(l => l.id === layerIds[0]);
      }
      if (!realLayer) {
        const styleLayers = await fetchStyleLayersForColor(overlayId, overlayUrl);
        realLayer = styleLayers.find(l => l.id === layerIds[0]);
      }
      if (realLayer) {
        swatch = resolveLegendSwatch(realLayer);
      } else {
        const swatchType = swatchTypeForLayerType(layerType);
        if (swatchType) swatch = { type: swatchType, color: null };
      }
    }

    return {
      overlayId,
      overlayUrl,
      layerIds,
      layerType,
      checked,
      legendId: `${overlayId}:${layerIds.join(',')}`,
      legendLabel,
      overlayLabel,
      swatch,
      legendItems,
      opacity,
      legendGroupKey,
      dedupKey,
      itemEl
    };
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

  const handleToggleItem = async (itemEl: HTMLElement) => {
    if (itemEl.classList.contains('loading-state')) return;

    const group = itemEl.closest('.acc-group') as HTMLElement;
    const isChecked = itemEl.classList.toggle('checked');
    itemEl.setAttribute('aria-checked', isChecked ? 'true' : 'false');

    onLayerToggle(await buildToggleEvent(itemEl, group, isChecked));
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
        await handleToggleItem(item as HTMLElement);
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
      await handleToggleItem(item as HTMLElement);
      return;
    }

    // Bulk Buttons
    const btnAllOn = target.closest('.btn-all-on');
    if (btnAllOn) {
      e.stopPropagation();
      const group = btnAllOn.closest('.acc-group') as HTMLElement;
      const overlayId = group.getAttribute('data-id')!;
      const overlayUrl = group.getAttribute('data-url')!;
      
      const itemsToEnable = Array.from(group.querySelectorAll('.acc-item:not(.checked):not(.loading-state)')) as HTMLElement[];
      for (const itemEl of itemsToEnable) {
        itemEl.classList.add('checked');
        itemEl.setAttribute('aria-checked', 'true');
        onLayerToggle(await buildToggleEvent(itemEl, group, true));
      }

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
      
      const itemsToDisable = Array.from(group.querySelectorAll('.acc-item.checked')) as HTMLElement[];
      for (const itemEl of itemsToDisable) {
        itemEl.classList.remove('checked');
        itemEl.setAttribute('aria-checked', 'false');
        onLayerToggle(await buildToggleEvent(itemEl, group, false));
      }

      if (onBulkToggle) onBulkToggle(overlayId, overlayUrl, false);
      updateGroupStatus(group);
      return;
    }
  });
};
