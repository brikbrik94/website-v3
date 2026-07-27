import { GraphExportService, GraphExportFormat } from '../lib/GraphExportService';
import { calculateBboxArea } from '../features/graph/calculateBboxArea';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';

export const MAX_BBOX_AREA_M2 = 25_000_000;

export interface GraphFormParams {
  profile: string;
  format: GraphExportFormat;
  geometry: boolean;
}

export interface GraphSidebarCallbacks {
  onDrawBbox: () => void;
  onUseCurrentView: () => void;
  onSubmit: (params: GraphFormParams) => void;
  onNodesVisibleChange: (visible: boolean) => void;
}

export const initGraphSidebar = async (
  container: HTMLElement,
  callbacks: GraphSidebarCallbacks,
  signal: AbortSignal
): Promise<void> => {
  const isOnline = await GraphExportService.checkHealth();
  const profiles = isOnline ? await GraphExportService.getProfiles() : [];

  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Routing-Graph</div>

        <div class="form-field" style="margin-bottom:8px">
          <span class="form-label">Service Status</span>
          <div class="status-panel">
            <div class="status-row">
              <div class="status-row-left">
                <i class="fa-solid fa-server status-row-icon"></i>
                <span class="status-row-name">ORS API</span>
              </div>
              <div class="status-row-right">
                <span class="status-dot ${isOnline ? 'on' : 'off'}"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="tool-sep"></div>

        <div class="form-field" style="margin-bottom:7px">
          <label class="form-label" for="graph-profile">Profil</label>
          <select class="form-select" id="graph-profile" ${!isOnline ? 'disabled' : ''}>
            ${profiles.length > 0
              ? profiles.map((p) => `<option value="${p}">${p}</option>`).join('')
              : '<option>Dienst offline</option>'
            }
          </select>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Format</span>
          <div class="segmented" id="graph-format" role="group" aria-label="Format wählen">
            <button class="segmented-btn" aria-pressed="false" data-format="json">JSON</button>
            <button class="segmented-btn active" aria-pressed="true" data-format="topojson">TopoJSON</button>
          </div>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Kantengeometrie</span>
          <div class="segmented" id="graph-geometry" role="group" aria-label="Kantengeometrie wählen">
            <button class="segmented-btn" aria-pressed="false" data-geometry="false">Luftlinie</button>
            <button class="segmented-btn active" aria-pressed="true" data-geometry="true">Straßenverlauf</button>
          </div>
          <span class="form-hint hidden" id="graph-geometry-hint">Nur bei TopoJSON wirksam.</span>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Knotenpunkte</span>
          <div class="segmented" id="graph-nodes-visible" role="group" aria-label="Knotenpunkte ein-/ausblenden">
            <button class="segmented-btn" aria-pressed="false" data-visible="false">Ausblenden</button>
            <button class="segmented-btn active" aria-pressed="true" data-visible="true">Anzeigen</button>
          </div>
        </div>

        <div class="tool-sep"></div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Bbox</span>
          <button class="form-submit" id="btn-draw-bbox" ${!isOnline ? 'disabled' : ''}>
            <i class="fa-solid fa-draw-polygon"></i> Bbox zeichnen
          </button>
          <button class="form-submit" id="btn-use-view" style="margin-top:6px" ${!isOnline ? 'disabled' : ''}>
            <i class="fa-solid fa-expand"></i> Aktuelle Ansicht verwenden
          </button>
          <span class="form-hint" id="graph-bbox-info">Keine Bbox gesetzt.</span>
        </div>

        <button class="form-submit" style="margin-top:8px" id="btn-query-export" data-online="${isOnline ? '1' : '0'}" disabled>
          <i class="fa-solid fa-diagram-project"></i> Export abfragen
        </button>

        <div class="tool-sep"></div>
        <div id="graph-result-info" class="form-hint">Noch keine Abfrage.</div>
      </div>

      ${getSidebarFooterHtml()}
      <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
    </nav>
  `;

  setupSidebarToggle(
    document.getElementById('sidebar')!,
    document.getElementById('sidebar-tab')!,
    document.getElementById('sidebar-backdrop')!
  );

  const formatGroup = document.getElementById('graph-format')!;
  const geometryGroup = document.getElementById('graph-geometry')!;
  const geometryHint = document.getElementById('graph-geometry-hint')!;
  const nodesGroup = document.getElementById('graph-nodes-visible')!;
  const btnDraw = document.getElementById('btn-draw-bbox') as HTMLButtonElement;
  const btnUseView = document.getElementById('btn-use-view') as HTMLButtonElement;
  const btnSubmit = document.getElementById('btn-query-export') as HTMLButtonElement;

  const selectSegment = (group: HTMLElement, btn: Element) => {
    group.querySelectorAll('.segmented-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  };

  const updateGeometryDisabledState = () => {
    const isJson = formatGroup.querySelector('.segmented-btn.active')?.getAttribute('data-format') === 'json';
    geometryGroup.querySelectorAll('.segmented-btn').forEach((b) => {
      (b as HTMLButtonElement).disabled = isJson;
    });
    geometryHint.classList.toggle('hidden', !isJson);
  };

  formatGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    selectSegment(formatGroup, btn);
    updateGeometryDisabledState();
  }, { signal });

  geometryGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn || (btn as HTMLButtonElement).disabled) return;
    selectSegment(geometryGroup, btn);
  }, { signal });

  nodesGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    selectSegment(nodesGroup, btn);
    callbacks.onNodesVisibleChange(btn.getAttribute('data-visible') === 'true');
  }, { signal });

  updateGeometryDisabledState();

  btnDraw.addEventListener('click', callbacks.onDrawBbox, { signal });
  btnUseView.addEventListener('click', callbacks.onUseCurrentView, { signal });

  if (isOnline) {
    btnSubmit.addEventListener('click', () => {
      const profile = (document.getElementById('graph-profile') as HTMLSelectElement).value;
      const format = (formatGroup.querySelector('.segmented-btn.active')?.getAttribute('data-format') || 'topojson') as GraphExportFormat;
      const geometry = geometryGroup.querySelector('.segmented-btn.active')?.getAttribute('data-geometry') === 'true';
      callbacks.onSubmit({ profile, format, geometry });
    }, { signal });
  }
};

/**
 * Aktualisiert Bbox-Info-Text + Submit-Button-Gating anhand der aktuellen Bbox-Fläche.
 * `null` bedeutet "keine Bbox gesetzt" (z.B. nach `onDrawBbox`, bevor gezeichnet wurde).
 */
export const setGraphBbox = (bbox: [[number, number], [number, number]] | null): void => {
  const info = document.getElementById('graph-bbox-info')!;
  const submitBtn = document.getElementById('btn-query-export') as HTMLButtonElement;
  if (!bbox) {
    info.textContent = 'Keine Bbox gesetzt.';
    info.classList.remove('form-error');
    submitBtn.disabled = true;
    return;
  }

  const areaKm2 = (calculateBboxArea(bbox) / 1_000_000).toFixed(1);
  if (calculateBboxArea(bbox) > MAX_BBOX_AREA_M2) {
    info.textContent = `Fläche ${areaKm2} km² — über dem Limit von ${MAX_BBOX_AREA_M2 / 1_000_000} km².`;
    info.classList.add('form-error');
    submitBtn.disabled = true;
  } else {
    info.textContent = `Fläche ${areaKm2} km².`;
    info.classList.remove('form-error');
    submitBtn.disabled = submitBtn.dataset.online !== '1';
  }
};

export const renderGraphResult = (
  result: { nodesCount: number; edgesCount: number; payloadBytes: number; format: GraphExportFormat } | null
): void => {
  const el = document.getElementById('graph-result-info')!;
  if (!result) {
    el.textContent = 'Noch keine Abfrage.';
    return;
  }
  const kb = (result.payloadBytes / 1024).toFixed(0);
  const nodesText = result.format === 'topojson'
    ? 'TopoJSON enthält keine einzelnen Knotenpunkte'
    : `${result.nodesCount.toLocaleString('de-DE')} Nodes`;
  el.textContent = `${nodesText} / ${result.edgesCount.toLocaleString('de-DE')} Edges, ${kb} KB`;
};
