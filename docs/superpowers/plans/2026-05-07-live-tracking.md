# Live Tracking (AIS & ADS-B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-time tracking page for maritime (AIS) and aviation (ADS-B) traffic with persistent tracks and interactive lists.

**Architecture:** Use `AisInterpreter` and `AdsbInterpreter` to fetch and convert raw data into GeoJSON. MapLibre symbol layers will use server-side sprites for icons, and line layers will display movement history. A dedicated `TrackingSidebar` will manage the list view and object selection.

**Tech Stack:** TypeScript (Vanilla), MapLibre GL JS, FontAwesome, Vite.

---

### Task 1: Versioning and Documentation

**Files:**
- Modify: `src/version.ts`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update application version**

Update `APP_VERSION` to `3.2.0a1`.

```typescript
export const APP_VERSION = '3.2.0a1';
```

- [ ] **Step 2: Update Changelog**

Add the new feature and version bump to `CHANGELOG.md`.

```markdown
## [3.2.0a1] - 2026-05-07

### Hinzugefügt
- **Live Tracking:** Neue spezialisierte Seite für Schiffs- (AIS) und Flugverkehr (ADS-B).
- **Echtzeit-Karten:** Nutzung von High-Performance Symbol-Layern mit dynamischen Sprites und rotierenden Icons.
- **Track-Historie:** Permanente Anzeige der Flug- und Fahrwege mit Hervorhebung des ausgewählten Objekts.
- **Interaktive Sidebar:** Separate Listen für Luft- und Wasserfahrzeuge zur schnellen Lokalisierung.
```

- [ ] **Step 3: Commit versioning changes**

```bash
git add src/version.ts CHANGELOG.md
git commit -m "chore: bump version to v3.2.0a1 and update changelog"
```

---

### Task 2: Implement TrackingSidebar Component

**Files:**
- Create: `src/components/TrackingSidebar.ts`

- [ ] **Step 1: Create the TrackingSidebar component**

Implement a sidebar that renders two lists (ADS-B and AIS) and handles selection.

```typescript
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
      ${getSidebarFooterHtml()}
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
      const data = JSON.parse(itemEl.getAttribute('data-item')!);
      onItemClick(data);
      
      // Visual feedback
      document.querySelectorAll('.result-item-simple').forEach(el => el.classList.remove('active'));
      itemEl.classList.add('active');
    }
  });
};

export const updateTrackingList = (id: string, items: TrackingItem[]) => {
  const listEl = document.getElementById(id);
  if (!listEl) return;

  if (items.length === 0) {
    listEl.innerHTML = '<div class="t-small" style="padding: 10px; color: var(--subtle);">Keine Objekte gefunden</div>';
    return;
  }

  listEl.innerHTML = items.map(item => `
    <div class="result-item-simple" data-item='${JSON.stringify(item)}'>
      <div class="result-item-title">${item.label}</div>
      <div class="result-item-meta">${item.info}</div>
    </div>
  `).join('');
};
```

- [ ] **Step 2: Commit sidebar component**

```bash
git add src/components/TrackingSidebar.ts
git commit -m "feat(ui): add TrackingSidebar component for live traffic"
```

---

### Task 3: Implement TrackingPage Component

**Files:**
- Create: `src/pages/TrackingPage.ts`

- [ ] **Step 1: Create the TrackingPage implementation**

Implement map initialization, layer setup, and the data refresh loop.

```typescript
import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import maplibregl from 'maplibre-gl';
import { Toast } from '../lib/Toast';
import { initTrackingSidebar, updateTrackingList, TrackingItem } from '../components/TrackingSidebar';
import { MAP_COLORS } from '../lib/MapStyles';
import { AdsbInterpreter } from '../../api/AdsbInterpreter';
import { AisInterpreter } from '../../api/AisInterpreter';

export const initTrackingPage = async (container: HTMLElement) => {
  let map: maplibregl.Map | null = null;
  let refreshInterval: any = null;
  let selectedId: string | number | null = null;

  const adsbInterpreter = new AdsbInterpreter('https://adsb.oe5ith.at/data/aircraft.json');
  const aisInterpreter = new AisInterpreter('https://ais.oe5ith.at/data/ships.json');

  const setupLayers = (m: maplibregl.Map) => {
    // Sources
    if (!m.getSource('adsb-points')) {
      m.addSource('adsb-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('adsb-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('ais-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('ais-tracks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

      // Track Layers (Lines)
      m.addLayer({
        id: 'adsb-tracks',
        type: 'line',
        source: 'adsb-tracks',
        paint: {
          'line-color': MAP_COLORS.accent,
          'line-width': ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5],
          'line-opacity': ['case', ['==', ['get', 'hex'], selectedId || ''], 0.9, 0.4]
        }
      });

      m.addLayer({
        id: 'ais-tracks',
        type: 'line',
        source: 'ais-tracks',
        paint: {
          'line-color': '#0ea5e9',
          'line-width': ['case', ['==', ['get', 'mmsi'], selectedId || 0], 4, 1.5],
          'line-opacity': ['case', ['==', ['get', 'mmsi'], selectedId || 0], 0.9, 0.4]
        }
      });

      // Symbol Layers
      m.addLayer({
        id: 'adsb-symbols',
        type: 'symbol',
        source: 'adsb-points',
        layout: {
          'icon-image': 'adsb_airplane_3', // Adjust based on actual sprite names
          'icon-rotate': ['get', 'track'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-size': 0.8,
          'text-field': ['get', 'flight'],
          'text-font': ['Metropolis Regular'],
          'text-offset': [0, 1.5],
          'text-size': 11
        },
        paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 }
      });

      m.addLayer({
        id: 'ais-symbols',
        type: 'symbol',
        source: 'ais-points',
        layout: {
          'icon-image': 'ais_marker_unknown', // Adjust based on actual sprite names
          'icon-rotate': ['get', 'cog'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-size': 0.8,
          'text-field': ['get', 'name'],
          'text-font': ['Metropolis Regular'],
          'text-offset': [0, 1.5],
          'text-size': 11
        },
        paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 }
      });
    }
  };

  const updateData = async () => {
    try {
      const [adsbData, aisData] = await Promise.all([
        adsbInterpreter.fetch(),
        aisInterpreter.fetch()
      ]);

      if (map) {
        (map.getSource('adsb-points') as maplibregl.GeoJSONSource).setData(adsbData);
        (map.getSource('adsb-tracks') as maplibregl.GeoJSONSource).setData(adsbInterpreter.getTracksAsGeoJson());
        (map.getSource('ais-points') as maplibregl.GeoJSONSource).setData(aisData);
        (map.getSource('ais-tracks') as maplibregl.GeoJSONSource).setData(aisInterpreter.getTracksAsGeoJson());
      }

      // Update Lists
      const adsbItems: TrackingItem[] = adsbData.features.map(f => ({
        id: f.properties.hex,
        label: f.properties.flight || f.properties.hex,
        info: `${Math.round(f.properties.alt_baro || 0)}ft | ${Math.round(f.properties.gs || 0)}kt`,
        type: 'adsb',
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      }));

      const aisItems: TrackingItem[] = aisData.features.map(f => ({
        id: f.properties.mmsi,
        label: f.properties.name || f.properties.mmsi.toString(),
        info: `${f.properties.sog || 0}kt | ${f.properties.shipclass || '-'}`,
        type: 'ais',
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0]
      }));

      updateTrackingList('adsb-list', adsbItems);
      updateTrackingList('ais-list', aisItems);

    } catch (err) {
      console.error('[TrackingPage] Update failed', err);
    }
  };

  // Layout Setup
  container.innerHTML = `
    <div id="topbar-mount"></div>
    <div class="layout">
      <div id="sidebar-mount"></div>
      <main id="map" class="full-map"></main>
    </div>
  `;

  // Initialize Map
  const mapContainer = document.getElementById('map')!;
  map = MapCore.init(mapContainer, 'https://tiles.oe5ith.at/basemaps/styles/at/style.json');
  map.jumpTo({ center: [14.3, 48.3], zoom: 9 });

  map.on('styledata', () => {
    if (map) {
      // Add sprites for both services
      if (!map.hasImage('adsb_airplane_3')) {
        map.addSprite('adsb', 'https://tiles.oe5ith.at/assets/sprites/adsb/sprite');
      }
      if (!map.hasImage('ais_marker_unknown')) {
        map.addSprite('ais', 'https://tiles.oe5ith.at/assets/sprites/ais/sprite');
      }
      setupLayers(map);
    }
  });

  // Topbar
  initTopbar(document.getElementById('topbar-mount')!, [], () => {}, undefined, [
    {
      id: 'toggle-adsb',
      icon: 'fa-solid fa-plane',
      title: 'ADS-B',
      onClick: (active) => {
        if (!map) return;
        const state = active ? 'visible' : 'none';
        map.setLayoutProperty('adsb-symbols', 'visibility', state);
        map.setLayoutProperty('adsb-tracks', 'visibility', state);
        document.getElementById('adsb-list')?.parentElement?.previousElementSibling?.classList.toggle('hidden', !active);
        document.getElementById('adsb-list')?.classList.toggle('hidden', !active);
      }
    },
    {
      id: 'toggle-ais',
      icon: 'fa-solid fa-ship',
      title: 'AIS',
      onClick: (active) => {
        if (!map) return;
        const state = active ? 'visible' : 'none';
        map.setLayoutProperty('ais-symbols', 'visibility', state);
        map.setLayoutProperty('ais-tracks', 'visibility', state);
        document.getElementById('ais-list')?.parentElement?.previousElementSibling?.classList.toggle('hidden', !active);
        document.getElementById('ais-list')?.classList.toggle('hidden', !active);
      }
    }
  ]);

  // Set initial button states to active
  setTimeout(() => {
    document.getElementById('btn-toggle-adsb')?.classList.add('active');
    document.getElementById('btn-toggle-ais')?.classList.add('active');
  }, 100);

  // Sidebar
  initTrackingSidebar(document.getElementById('sidebar-mount')!, (item) => {
    if (!map) return;
    selectedId = item.id;
    map.flyTo({ center: [item.lon, item.lat], zoom: 12 });
    
    // Update highlight
    map.setPaintProperty('adsb-tracks', 'line-width', ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5]);
    map.setPaintProperty('ais-tracks', 'line-width', ['case', ['==', ['get', 'mmsi'], selectedId || 0], 4, 1.5]);
    
    // Trigger update for tracks immediate visual refresh
    updateData();
  });

  // Start Refresh Loop
  updateData();
  refreshInterval = setInterval(updateData, 10000);

  // Cleanup on destroy (simulated)
  window.addEventListener('popstate', () => {
    if (refreshInterval) clearInterval(refreshInterval);
  }, { once: true });
};
```

- [ ] **Step 2: Commit tracking page implementation**

```bash
git add src/pages/TrackingPage.ts
git commit -m "feat(pages): implement Live Tracking page with AIS/ADSB layers"
```

---

### Task 4: Register Route and Update Main

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Register the new route**

Add the `/tracking` route to the router in `src/main.ts`.

```typescript
// Add import
import { initTrackingPage } from './pages/TrackingPage';

// Update router logic
} else if (path === '/tracking') {
  initTrackingPage(app);
}
```

- [ ] **Step 2: Add Topbar link**

Ensure the "Tracking" link is present in the Topbar (update `initTopbar` call in other pages if necessary, but primarily in the main router or where Topbar links are defined).

- [ ] **Step 3: Commit router updates**

```bash
git add src/main.ts
git commit -m "feat(routing): register /tracking route"
```

---

### Task 5: Final Validation

- [ ] **Step 1: Test AIS/ADSB toggles**
- [ ] **Step 2: Verify Sidebar clicks center the map**
- [ ] **Step 3: Check version display in footer**
