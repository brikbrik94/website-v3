import { IsochronesService } from '../lib/IsochronesService';
import { GeocoderService } from '../lib/GeocoderService';
import { GeocoderSearchField } from '../lib/GeocoderSearchField';
import { parseCoords } from './RoutingSidebar';
import { parseRangeList } from '../features/isochrones/parseRangeList';
import { getSidebarFooterHtml, setupSidebarToggle } from '../lib/SidebarUtils';
import { IsochroneQuery, IsochroneRangeType } from '../types/common';

export interface IsochronesFormParams {
  point: [number, number];
  profile: string;
  rangeType: IsochroneRangeType;
  ranges: number[];
}

export interface IsochronesSidebarCallbacks {
  onCalculate: (params: IsochronesFormParams) => void;
  onClearAll: () => void;
}

const getPointFromInput = (input: HTMLInputElement): [number, number] | null => {
  if (input.dataset.lat && input.dataset.lon) {
    return [parseFloat(input.dataset.lat), parseFloat(input.dataset.lon)];
  }
  return parseCoords(input.value);
};

const updateSubmitState = (): void => {
  const input = document.getElementById('input-point') as HTMLInputElement | null;
  const btn = document.getElementById('btn-calculate-isochrone') as HTMLButtonElement | null;
  if (!input || !btn) return;
  const hasPoint = getPointFromInput(input) !== null;
  btn.disabled = btn.dataset.online !== '1' || !hasPoint;
};

/**
 * Setzt den Punkt von außen (Kartenklick) — analog `setRoutingCoord()` in RoutingSidebar.ts.
 * Reverse-geocodiert, damit die Ergebnis-Liste später eine lesbare Adresse statt roher
 * Koordinaten zeigt, mit Koordinaten-Fallback falls kein Treffer.
 */
export const setIsochronesPoint = async (lat: number, lon: number): Promise<void> => {
  const input = document.getElementById('input-point') as HTMLInputElement | null;
  if (!input) return;

  const address = await GeocoderService.reverse(lat, lon);
  if (address && address.display_name) {
    input.value = address.display_name;
    input.dataset.lat = lat.toString();
    input.dataset.lon = lon.toString();
  } else {
    input.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    delete input.dataset.lat;
    delete input.dataset.lon;
  }
  document.getElementById('results-point')?.classList.add('hidden');
  updateSubmitState();
};

export const initIsochronesSidebar = async (
  container: HTMLElement,
  callbacks: IsochronesSidebarCallbacks,
  signal: AbortSignal
): Promise<void> => {
  const isOnline = await IsochronesService.checkHealth();
  const profiles = isOnline ? await IsochronesService.getProfiles() : [];

  container.innerHTML = `
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-inner">
        <div class="sidebar-section-label">Isochronen</div>

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
          <label class="form-label" for="iso-profile">Profil</label>
          <select class="form-select" id="iso-profile" ${!isOnline ? 'disabled' : ''}>
            ${profiles.length > 0
              ? profiles.map((p) => `<option value="${p}">${p}</option>`).join('')
              : '<option>Dienst offline</option>'
            }
          </select>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <span class="form-label">Ring-Typ</span>
          <div class="segmented" id="iso-range-type">
            <button class="segmented-btn active" data-range-type="time">Zeit</button>
            <button class="segmented-btn" data-range-type="distance">Distanz</button>
          </div>
        </div>

        <div class="form-field" style="margin-bottom:7px">
          <label class="form-label" for="iso-ranges" id="iso-ranges-label">Werte (Minuten, leerzeichengetrennt)</label>
          <input type="text" class="form-input" id="iso-ranges" placeholder="5 10 15" value="5 10 15" autocomplete="off">
        </div>

        <div class="tool-sep"></div>

        <div class="form-field pos-relative" style="margin-bottom:7px" id="field-point">
          <label class="form-label" for="input-point">Punkt</label>
          <div class="form-input-wrap">
            <i class="fa-solid fa-location-crosshairs form-input-icon"></i>
            <input type="text" class="form-input" id="input-point" placeholder="Adresse oder Lat, Lon" ${!isOnline ? 'disabled' : ''} autocomplete="off">
          </div>
          <div id="results-point" class="geocoder-results hidden"></div>
        </div>

        <button class="form-submit" style="margin-bottom:10px" id="btn-calculate-isochrone" data-online="${isOnline ? '1' : '0'}" disabled>
          <i class="fa-solid fa-bullseye"></i> Berechnen
        </button>

        <div class="tool-sep"></div>

        <div class="result-header">
          <span class="result-count" id="iso-result-count">0 Abfragen</span>
          <button class="btn btn-sm btn-ghost" id="btn-clear-all" title="Alle löschen"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div id="isochrones-results"></div>
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

  const rangeTypeGroup = document.getElementById('iso-range-type')!;
  const rangesInput = document.getElementById('iso-ranges') as HTMLInputElement;
  const rangesLabel = document.getElementById('iso-ranges-label')!;
  const inputPoint = document.getElementById('input-point') as HTMLInputElement;
  const resultsPoint = document.getElementById('results-point')!;
  const btnCalculate = document.getElementById('btn-calculate-isochrone') as HTMLButtonElement;
  const btnClearAll = document.getElementById('btn-clear-all')!;

  rangeTypeGroup.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.segmented-btn');
    if (!btn) return;
    rangeTypeGroup.querySelectorAll('.segmented-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const isTime = btn.getAttribute('data-range-type') === 'time';
    rangesLabel.textContent = isTime ? 'Werte (Minuten, leerzeichengetrennt)' : 'Werte (km, leerzeichengetrennt)';
    rangesInput.placeholder = isTime ? '5 10 15' : '1 3 5';
  }, { signal });

  inputPoint.addEventListener('input', () => {
    delete inputPoint.dataset.lat;
    delete inputPoint.dataset.lon;
    updateSubmitState();
  }, { signal });

  new GeocoderSearchField(inputPoint, resultsPoint, {
    signal,
    suppressWhen: (query) => parseCoords(query) !== null,
    onSelect: (selection) => {
      inputPoint.dataset.lat = String(selection.lat);
      inputPoint.dataset.lon = String(selection.lon);
      updateSubmitState();
    }
  });

  btnClearAll.addEventListener('click', callbacks.onClearAll, { signal });

  if (isOnline) {
    btnCalculate.addEventListener('click', () => {
      const point = getPointFromInput(inputPoint);
      if (!point) return;

      const rangeType = (rangeTypeGroup.querySelector('.segmented-btn.active')?.getAttribute('data-range-type') || 'time') as IsochroneRangeType;
      const ranges = parseRangeList(rangesInput.value);
      if (!ranges) {
        alert('Bitte mindestens einen gültigen Ring-Wert eingeben.');
        return;
      }

      const profile = (document.getElementById('iso-profile') as HTMLSelectElement).value;
      callbacks.onCalculate({ point, profile, rangeType, ranges });
    }, { signal });
  }
};

export const renderIsochronesResults = (
  queries: IsochroneQuery[],
  eyeActiveIds: Set<number>,
  onToggle: (id: number, active: boolean) => void,
  onSelect: (id: number) => void,
  onDelete: (id: number) => void
): void => {
  const results = document.getElementById('isochrones-results')!;
  const count = document.getElementById('iso-result-count')!;
  count.textContent = `${queries.length} Abfrage${queries.length === 1 ? '' : 'n'}`;

  if (queries.length === 0) {
    results.innerHTML = `
      <div class="result-empty">
        <i class="fa-solid fa-arrow-pointer"></i>
        Klicke auf die Karte oder suche eine Adresse, um eine Isochrone zu berechnen.
      </div>
    `;
    return;
  }

  results.innerHTML = `
    <div class="result-list">
      ${queries.map((q, i) => `
        <div class="result-item" data-id="${q.id}">
          <div class="result-item-header">
            <span class="result-num">${i + 1}</span>
            <span class="result-item-title">${q.label}</span>
          </div>
          <div class="result-item-sub">${q.profile} · ${q.rangeType === 'time' ? 'Zeit' : 'Distanz'}</div>
          <button class="result-action toggle-iso-btn ${eyeActiveIds.has(q.id) ? 'active' : ''}" title="Ein-/ausblenden"><i class="fa-solid fa-eye"></i></button>
          <button class="result-action delete-iso-btn" title="Entfernen"><i class="fa-solid fa-trash"></i></button>
        </div>
      `).join('')}
    </div>
  `;

  results.querySelectorAll('.result-item').forEach((item) => {
    const id = parseInt(item.getAttribute('data-id')!);
    const toggleBtn = item.querySelector('.toggle-iso-btn') as HTMLButtonElement;
    const deleteBtn = item.querySelector('.delete-iso-btn') as HTMLButtonElement;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = toggleBtn.classList.toggle('active');
      onToggle(id, isActive);
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(id);
    });

    item.addEventListener('click', () => {
      if (!toggleBtn.classList.contains('active')) {
        toggleBtn.classList.add('active');
        onToggle(id, true);
      }
      onSelect(id);
    });
  });
};
