import proj4 from 'proj4';
// @ts-ignore
import * as mgrs from 'mgrs';
import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import { Toast } from '../lib/Toast';
import maplibregl from 'maplibre-gl';

import { MAP_COLORS } from '../lib/MapStyles';
import { getSidebarFooterHtml } from '../lib/SidebarUtils';
import { GeocoderService } from '../lib/GeocoderService';

/**
 * CoordsPage - Bidirektionaler Koordinaten-Umrechner (Typ 7 Sidebar)
 */
export const initCoordsPage = async (container: HTMLElement) => {
  // 1. Sofortiges Layout-Gerüst (CI-konform)
  container.innerHTML = `
    <div id="topbar-mount">
      <header class="topbar">
        <div class="topbar-left">
          <a href="/" class="brand" title="Zur Startseite">
            <img src="/logo.svg" alt="Logo" class="brand-logo" />
            <span class="brand-text">OE5ITH</span>
          </a>
        </div>
        <div class="topbar-center">
          <span class="topbar-title" style="color: var(--muted); font-size: 0.82rem; font-weight: 600;">Lade Konfiguration...</span>
        </div>
        <div class="topbar-right"></div>
      </header>
    </div>
    <div class="layout">
      <div id="sidebar-mount">
        <nav class="sidebar">
          <div class="sidebar-inner">
            <div class="acc-loader" style="padding: 20px; color: var(--subtle);">Initialisiere Umrechner...</div>
          </div>
        </nav>
      </div>
      <main id="map" class="full-map">
      </main>
    </div>
  `;

  const topbarMount = document.getElementById('topbar-mount')!;
  const sidebarMount = document.getElementById('sidebar-mount')!;
  const mapContainer = document.getElementById('map')!;

  // Proj4 Definitionen für Österreich (BMN / Lambert)
  proj4.defs([
    ["EPSG:31254", "+proj=tmerc +lat_0=0 +lon_0=10.33333333333333 +k=1 +x_0=150000 +y_0=0 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs"],
    ["EPSG:31255", "+proj=tmerc +lat_0=0 +lon_0=13.33333333333333 +k=1 +x_0=450000 +y_0=0 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs"],
    ["EPSG:31256", "+proj=tmerc +lat_0=0 +lon_0=16.33333333333333 +k=1 +x_0=750000 +y_0=0 +ellps=bessel +towgs84=577.326,90.129,463.919,5.137,1.474,5.297,2.4232 +units=m +no_defs"]
  ]);

  // Initialer State (WGS84 Source of Truth)
  let state = {
    lat: 48.3064,
    lon: 14.2858
  };

  // 2. Inventar laden für Topbar Basemaps
  let basemaps: any[] = [];
  try {
    const invRes = await fetch('https://tiles.oe5ith.at/inventory.json');
    if (invRes.ok) {
      const inventory = await invRes.json();
      basemaps = inventory.maps.filter((m: any) => m.type === 'basemap');
    }
  } catch (err) {
    console.warn('Inventory load failed, using fallback basemap');
  }

  // 3. Karte initialisieren
  const map = MapCore.init(mapContainer, basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');
  
  let contoursActive = false;
  let hikingActive = false;
  
  const OVERLAYS = {
    contours: {
      id: 'basemap-at-contours',
      url: 'https://tiles.oe5ith.at/overlays/styles/basemap-at-contours/style.json'
    },
    hiking: {
      id: 'hiking',
      url: 'https://tiles.oe5ith.at/overlays/styles/hiking/style.json'
    }
  };

  const toggleOverlay = async (type: keyof typeof OVERLAYS, active: boolean) => {
    if (type === 'contours') contoursActive = active;
    if (type === 'hiking') hikingActive = active;
    
    const { id, url } = OVERLAYS[type];
    
    if (active) {
      if (!map.getSource(id)) {
        try {
          const res = await fetch(url);
          const style = await res.json();
          
          // Load sprites if defined
          if (style.sprite) {
            await MapCore.loadSprites(map, style.sprite, url);
          }

          // Inject Sources
          for (const [sId, def] of Object.entries(style.sources)) {
            if (!map.getSource(sId)) map.addSource(sId, def as any);
          }
          
          // Inject Layers
          style.layers.forEach((l: any) => {
            if (!map.getLayer(l.id)) map.addLayer(l);
          });
        } catch (err) {
          console.error(`Failed to load overlay: ${id}`, err);
          Toast.error(`Fehler beim Laden von: ${id}`);
          return;
        }
      } else {
        // Toggle visibility if already exists
        const style = map.getStyle();
        style.layers.forEach((l: any) => {
          if (l.source === id) {
             map.setLayoutProperty(l.id, 'visibility', 'visible');
          }
        });
      }
    } else {
      // Hide layers
      const style = map.getStyle();
      style.layers.forEach((l: any) => {
        if (l.source === id) {
           map.setLayoutProperty(l.id, 'visibility', 'none');
        }
      });
    }
  };

  // 4. Topbar initialisieren (überschreibt Platzhalter)
  initTopbar(topbarMount, basemaps, (url) => {
    map.setStyle(url);
    map.once('idle', async () => {
      await MapCore.reapplyBaseLayers();
      // Ensure overlays remain if they were active
      if (contoursActive) map.getSource(OVERLAYS.contours.id) ? null : await toggleOverlay('contours', true);
      if (hikingActive) map.getSource(OVERLAYS.hiking.id) ? null : await toggleOverlay('hiking', true);
    });
  }, undefined, [
    {
      id: 'contours',
      icon: 'fa-solid fa-mountain',
      title: 'Höhenlinien',
      onClick: (active) => toggleOverlay('contours', active)
    },
    {
      id: 'hiking',
      icon: 'fa-solid fa-map-signs',
      title: 'Wanderwege',
      onClick: (active) => toggleOverlay('hiking', active)
    }
  ]);

  // Marker für die aktuelle Position
  const marker = new maplibregl.Marker({ color: MAP_COLORS.accent })
    .setLngLat([state.lon, state.lat])
    .addTo(map);

  // Hilfsfunktion: Update Feld wenn nicht im aktiven Eingabe-Block
  const updateField = (system: string, field: string, value: string, source?: string) => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const activeBlock = sidebar.querySelector('.coord-block.active') as HTMLElement;
    const activeSystem = activeBlock?.getAttribute('data-system');

    if (source === 'input' && activeSystem === system) return;
    
    const el = sidebar.querySelector(`[data-system="${system}"] [data-field="${field}"]`);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.value = value;
    } else if (el) {
      el.textContent = value;
    }
  };

  // Hilfsfunktionen für Berechnungen & Rendering
  const toDms = (val: number) => {
    const d = Math.floor(Math.abs(val));
    const m = Math.floor((Math.abs(val) - d) * 60);
    const s = ((Math.abs(val) - d - m / 60) * 3600).toFixed(1);
    return { d, m, s };
  };

  // Sidebar Struktur einmalig aufbauen
  const initSidebarStructure = () => {
    sidebarMount.innerHTML = `
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <nav class="sidebar" id="sidebar">
        <div class="sidebar-inner">
          
          <!-- Adresse / Geocoder -->
          <div class="coord-block active" data-system="address">
            <div class="coord-block-header">
              <span class="coord-block-title">Adresse</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="coord-header-status" id="address-status" style="font-size: 0.65rem; color: var(--subtle); font-weight: 500;"></div>
                <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
              </div>
            </div>
            <div class="coord-row" style="position: relative;">
              <input class="coord-input-full" type="text" data-field="address" placeholder="Adresse suchen..." autocomplete="off">
              <div id="geocoder-results" class="geocoder-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: 10;"></div>
            </div>
          </div>

          <div class="tool-sep"></div>

          <!-- WGS84 Dezimalgrad -->
          <div class="coord-block" data-system="wgs84">
            <div class="coord-block-header">
              <span class="coord-block-title">WGS84 Dezimalgrad</span>
              <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
            </div>
            <div class="coord-row">
              <span class="coord-label">Lat.</span>
              <input class="coord-input" type="text" inputmode="decimal" data-field="lat" readonly>
            </div>
            <div class="coord-row">
              <span class="coord-label">Lon.</span>
              <input class="coord-input" type="text" inputmode="decimal" data-field="lon" readonly>
            </div>
          </div>

          <div class="tool-sep"></div>

          <!-- WGS84 DMS -->
          <div class="coord-block" data-system="dms">
            <div class="coord-block-header">
              <span class="coord-block-title">WGS84 DMS</span>
              <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
            </div>
            <div class="coord-row-dms">
              <span class="coord-label">Lat.</span>
              <input class="coord-input-dms" type="text" data-field="lat-d" readonly>
              <input class="coord-input-dms" type="text" data-field="lat-m" readonly>
              <input class="coord-input-dms" type="text" data-field="lat-s" readonly>
              <span class="coord-suffix" data-field="lat-suffix">N</span>
            </div>
            <div class="coord-row-dms">
              <span class="coord-label">Lon.</span>
              <input class="coord-input-dms" type="text" data-field="lon-d" readonly>
              <input class="coord-input-dms" type="text" data-field="lon-m" readonly>
              <input class="coord-input-dms" type="text" data-field="lon-s" readonly>
              <span class="coord-suffix" data-field="lon-suffix">E</span>
            </div>
          </div>

          <div class="tool-sep"></div>

          <!-- UTM -->
          <div class="coord-block" data-system="utm">
            <div class="coord-block-header">
              <span class="coord-block-title">UTM</span>
              <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
            </div>
            <div class="coord-row">
              <span class="coord-label">Zone</span>
              <input class="coord-input" type="text" data-field="zone" readonly>
            </div>
            <div class="coord-row">
              <span class="coord-label">E</span>
              <input class="coord-input" type="text" data-field="e" readonly>
            </div>
            <div class="coord-row">
              <span class="coord-label">N</span>
              <input class="coord-input" type="text" data-field="n" readonly>
            </div>
          </div>

          <div class="tool-sep"></div>

          <!-- BMN -->
          <div class="coord-block" data-system="bmn">
            <div class="coord-block-header">
              <span class="coord-block-title">BMN (Österreich)</span>
              <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
            </div>
            <div class="coord-row">
              <span class="coord-label">M</span>
              <select class="coord-select" data-field="m" disabled>
                <option value="M28">M28</option>
                <option value="M31">M31</option>
                <option value="M34">M34</option>
              </select>
            </div>
            <div class="coord-row">
              <span class="coord-label">RW</span>
              <input class="coord-input" type="text" data-field="rw" readonly>
            </div>
            <div class="coord-row">
              <span class="coord-label">HW</span>
              <input class="coord-input" type="text" data-field="hw" readonly>
            </div>
          </div>

          <div class="tool-sep"></div>

          <!-- MGRS -->
          <div class="coord-block" data-system="mgrs">
            <div class="coord-block-header">
              <span class="coord-block-title">MGRS</span>
              <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
            </div>
            <div class="coord-row-inline">
              <span class="coord-label">GZD</span>
              <input class="coord-input-short" type="text" data-field="gzd" readonly>
              <span class="coord-label">100km</span>
              <input class="coord-input-short" type="text" data-field="sq" readonly>
            </div>
            <div class="coord-row">
              <span class="coord-label">E</span>
              <input class="coord-input" type="text" data-field="e" readonly>
            </div>
            <div class="coord-row">
              <span class="coord-label">N</span>
              <input class="coord-input" type="text" data-field="n" readonly>
            </div>
          </div>

          <div class="tool-sep"></div>

          <!-- Maidenhead -->
          <div class="coord-block" data-system="maidenhead">
            <div class="coord-block-header">
              <span class="coord-block-title">Maidenhead</span>
              <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
            </div>
            <div class="coord-row">
              <input class="coord-input-full" type="text" data-field="locator" readonly>
            </div>
          </div>

        </div>
        ${getSidebarFooterHtml()}
        <div class="sidebar-tab" id="sidebar-tab" role="button" tabindex="0">‹</div>
      </nav>
    `;

    attachSidebarEvents();
  };

  const updateSidebarValues = (source: 'map' | 'input') => {
    const sidebar = document.getElementById('sidebar')!;
    const activeBlock = sidebar.querySelector('.coord-block.active') as HTMLElement;
    const activeSystem = activeBlock?.getAttribute('data-system');
    
    // 0. Adresse (Reverse Geocoding)
    const addrStatus = sidebar.querySelector('#address-status')!;
    if (source === 'map' || (source === 'input' && activeSystem !== 'address')) {
      addrStatus.textContent = 'Suche...';
      GeocoderService.reverse(state.lat, state.lon).then(res => {
        if (res) {
          updateField('address', 'address', res.display_name, source);
          addrStatus.textContent = 'Gefunden';
        } else {
          addrStatus.textContent = 'Unbekannt';
        }
      });
    }

    // 1. WGS84 Decimal
    updateField('wgs84', 'lat', state.lat.toFixed(6), source);
    updateField('wgs84', 'lon', state.lon.toFixed(6), source);

    // 2. DMS
    const latDms = toDms(state.lat);
    const lonDms = toDms(state.lon);
    updateField('dms', 'lat-d', latDms.d.toString(), source);
    updateField('dms', 'lat-m', latDms.m.toString(), source);
    updateField('dms', 'lat-s', latDms.s, source);
    updateField('dms', 'lat-suffix', state.lat >= 0 ? 'N' : 'S', source);
    updateField('dms', 'lon-d', lonDms.d.toString(), source);
    updateField('dms', 'lon-m', lonDms.m.toString(), source);
    updateField('dms', 'lon-s', lonDms.s, source);
    updateField('dms', 'lon-suffix', state.lon >= 0 ? 'E' : 'W', source);

    // 3. UTM
    const utmZoneNum = Math.floor((state.lon + 180) / 6) + 1;
    const utm = proj4('EPSG:4326', `+proj=utm +zone=${utmZoneNum} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`).forward([state.lon, state.lat]);
    updateField('utm', 'zone', utmZoneNum + (state.lat >= 0 ? 'N' : 'S'), source);
    updateField('utm', 'e', Math.round(utm[0]).toString(), source);
    updateField('utm', 'n', Math.round(utm[1]).toString(), source);

    // 4. BMN
    let epsg = "EPSG:31255";
    let m = "M31";
    if (state.lon < 12) { epsg = "EPSG:31254"; m = "M28"; }
    else if (state.lon > 15) { epsg = "EPSG:31256"; m = "M34"; }
    const bmn = proj4('EPSG:4326', epsg).forward([state.lon, state.lat]);
    updateField('bmn', 'm', m, source);
    updateField('bmn', 'rw', Math.round(bmn[0]).toString(), source);
    updateField('bmn', 'hw', Math.round(bmn[1]).toString(), source);

    // 5. MGRS
    const mgrsStr = mgrs.forward([state.lon, state.lat]);
    updateField('mgrs', 'gzd', mgrsStr.substring(0, 3), source);
    updateField('mgrs', 'sq', mgrsStr.substring(3, 5), source);
    updateField('mgrs', 'e', mgrsStr.substring(5, 10), source);
    updateField('mgrs', 'n', mgrsStr.substring(10, 15), source);

    // 6. Maidenhead
    const mlon = state.lon + 180;
    const mlat = state.lat + 90;
    const f1 = String.fromCharCode(65 + Math.floor(mlon / 20));
    const f2 = String.fromCharCode(65 + Math.floor(mlat / 10));
    const s1 = Math.floor((mlon % 20) / 2);
    const s2 = Math.floor(mlat % 10);
    const t1 = String.fromCharCode(97 + Math.floor((mlon % 2) * 12));
    const t2 = String.fromCharCode(97 + Math.floor((mlat % 1) * 24));
    updateField('maidenhead', 'locator', `${f1}${f2}${s1}${s2}${t1}${t2}`, source);
  };

  function attachSidebarEvents() {
    const sidebar = document.getElementById('sidebar')!;
    const sidebarTab = document.getElementById('sidebar-tab')!;
    const sidebarBackdrop = document.getElementById('sidebar-backdrop')!;

    // Sidebar Toggle (Standard)
    sidebarTab.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
      sidebarTab.textContent = isCollapsed ? '›' : '‹';
    });

    sidebarBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      sidebarBackdrop.classList.remove('visible');
    });

    // Klick außerhalb versteckt Geocoder-Ergebnisse
    document.addEventListener('click', (e) => {
      const results = document.getElementById('geocoder-results');
      if (results && !results.contains(e.target as Node)) {
        results.style.display = 'none';
      }
    });

    // Block Aktivierung & Input
    const blocks = sidebar.querySelectorAll('.coord-block');
    blocks.forEach(block => {
      block.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.coord-copy')) {
          handleCopy(block as HTMLElement);
          return;
        }

        if (block.classList.contains('active')) return;

        // Alten aktiven Block deaktivieren
        sidebar.querySelectorAll('.coord-block.active').forEach(b => {
          b.classList.remove('active');
          b.querySelectorAll('input').forEach(i => i.setAttribute('readonly', 'true'));
          if (b.querySelector('select')) b.querySelector('select')!.setAttribute('disabled', 'true');
        });

        // Neuen Block aktivieren
        block.classList.add('active');
        block.querySelectorAll('input').forEach(i => i.removeAttribute('readonly'));
        if (block.querySelector('select')) block.querySelector('select')!.removeAttribute('disabled');
      });
    });

    // Input Handling (Live-Update)
    let geocodeTimeout: any;

    sidebar.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const block = target.closest('.coord-block') as HTMLElement;
      if (!block || !block.classList.contains('active')) return;

      const system = block.getAttribute('data-system');
      let newWgs: [number, number] | null = null;

      try {
        if (system === 'address') {
          const query = target.value.trim();
          const resultsContainer = document.getElementById('geocoder-results')!;
          
          clearTimeout(geocodeTimeout);
          if (query.length < 3) {
            resultsContainer.style.display = 'none';
            return;
          }

          geocodeTimeout = setTimeout(async () => {
            const results = await GeocoderService.search(query);
            if (results.length > 0) {
              resultsContainer.innerHTML = results.map(r => `
                <div class="geocoder-item" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.display_name}">
                  <strong>${r.display_name.split(',')[0]}</strong>
                  <span>${r.display_name.split(',').slice(1).join(',')}</span>
                </div>
              `).join('');
              resultsContainer.style.display = 'block';

              resultsContainer.querySelectorAll('.geocoder-item').forEach(item => {
                item.addEventListener('click', (ev) => {
                  ev.stopPropagation();
                  const lat = parseFloat(item.getAttribute('data-lat')!);
                  const lon = parseFloat(item.getAttribute('data-lon')!);
                  const name = item.getAttribute('data-name')!;
                  
                  state.lat = lat;
                  state.lon = lon;
                  updateField('address', 'address', name);
                  resultsContainer.style.display = 'none';
                  updateAll();
                });
              });
            } else {
              resultsContainer.style.display = 'none';
            }
          }, 400);
          return;
        }
        else if (system === 'wgs84') {
          const lat = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lat"]')!.value);
          const lon = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lon"]')!.value);
          if (!isNaN(lat) && !isNaN(lon)) newWgs = [lon, lat];
        } 
        else if (system === 'dms') {
          const latD = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lat-d"]')!.value);
          const latM = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lat-m"]')!.value);
          const latS = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lat-s"]')!.value);
          const latSuf = block.querySelector<HTMLElement>('[data-field="lat-suffix"]')!.textContent;
          const lonD = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lon-d"]')!.value);
          const lonM = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lon-m"]')!.value);
          const lonS = parseFloat(block.querySelector<HTMLInputElement>('[data-field="lon-s"]')!.value);
          const lonSuf = block.querySelector<HTMLElement>('[data-field="lon-suffix"]')!.textContent;

          if (!isNaN(latD) && !isNaN(latM) && !isNaN(latS) && !isNaN(lonD) && !isNaN(lonM) && !isNaN(lonS)) {
            let lat = latD + latM / 60 + latS / 3600;
            if (latSuf === 'S') lat *= -1;
            let lon = lonD + lonM / 60 + lonS / 3600;
            if (lonSuf === 'W') lon *= -1;
            newWgs = [lon, lat];
          }
        }
        else if (system === 'utm') {
          const zoneStr = block.querySelector<HTMLInputElement>('[data-field="zone"]')!.value;
          const eVal = parseFloat(block.querySelector<HTMLInputElement>('[data-field="e"]')!.value);
          const nVal = parseFloat(block.querySelector<HTMLInputElement>('[data-field="n"]')!.value);
          const zoneNum = parseInt(zoneStr);
          if (!isNaN(zoneNum) && !isNaN(eVal) && !isNaN(nVal)) {
            const res = proj4(`+proj=utm +zone=${zoneNum} +ellps=WGS84 +datum=WGS84 +units=m +no_defs`, 'EPSG:4326').forward([eVal, nVal]);
            newWgs = [res[0], res[1]];
          }
        }
        else if (system === 'bmn') {
          const m = block.querySelector<HTMLSelectElement>('[data-field="m"]')!.value;
          const rw = parseFloat(block.querySelector<HTMLInputElement>('[data-field="rw"]')!.value);
          const hw = parseFloat(block.querySelector<HTMLInputElement>('[data-field="hw"]')!.value);
          let epsg = m === 'M28' ? 'EPSG:31254' : (m === 'M34' ? 'EPSG:31256' : 'EPSG:31255');
          if (!isNaN(rw) && !isNaN(hw)) {
            const res = proj4(epsg, 'EPSG:4326').inverse([rw, hw]);
            newWgs = [res[0], res[1]];
          }
        }
        else if (system === 'mgrs') {
          const gzd = block.querySelector<HTMLInputElement>('[data-field="gzd"]')!.value;
          const sq = block.querySelector<HTMLInputElement>('[data-field="sq"]')!.value;
          const eVal = block.querySelector<HTMLInputElement>('[data-field="e"]')!.value;
          const nVal = block.querySelector<HTMLInputElement>('[data-field="n"]')!.value;
          if (gzd && sq && eVal.length === 5 && nVal.length === 5) {
            const res = mgrs.inverse(gzd + sq + eVal + nVal);
            newWgs = [res[0], res[1]];
          }
        }
        else if (system === 'maidenhead') {
          const locator = block.querySelector<HTMLInputElement>('[data-field="locator"]')!.value;
          if (locator.length >= 4) {
            const l = locator.toUpperCase();
            const lon = (l.charCodeAt(0) - 65) * 20 + parseInt(l[2]) * 2 + (l.length > 4 ? (l.charCodeAt(4) - 65) * (2/24) : 1) - 180;
            const lat = (l.charCodeAt(1) - 65) * 10 + parseInt(l[3]) * 1 + (l.length > 5 ? (l.charCodeAt(5) - 65) * (1/24) : 0.5) - 90;
            newWgs = [lon, lat];
          }
        }
      } catch (err) {
        console.warn('Manual input conversion failed', err);
      }

      if (newWgs && !isNaN(newWgs[0]) && !isNaN(newWgs[1]) && newWgs[1] >= -90 && newWgs[1] <= 90 && newWgs[0] >= -180 && newWgs[0] <= 180) {
        state.lat = newWgs[1];
        state.lon = newWgs[0];
        marker.setLngLat([state.lon, state.lat]);
        map.easeTo({ center: [state.lon, state.lat] });
        updateSidebarValues('input');
      }
    });
  }

  function handleCopy(block: HTMLElement) {
    const title = block.querySelector('.coord-block-title')!.textContent;
    const inputs = block.querySelectorAll('input');
    let text = "";
    inputs.forEach(i => text += i.value + " ");
    navigator.clipboard.writeText(text.trim());
    Toast.success(`${title} kopiert`);
  }

  function updateAll() {
    marker.setLngLat([state.lon, state.lat]);
    map.easeTo({ center: [state.lon, state.lat] });
    updateSidebarValues('map');
  }

  // Initial Render
  initSidebarStructure();
  updateSidebarValues('map');
  
  // Map Click Listener
  map.on('click', (e) => {
    state.lat = e.lngLat.lat;
    state.lon = e.lngLat.lng;
    updateAll();
  });
};
