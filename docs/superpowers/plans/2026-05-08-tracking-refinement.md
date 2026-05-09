# Tracking Page Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verbesserung der ADS-B/AIS Visualisierung durch höhenabhängige Tracks und CI-konforme Popup-Tabellen.

**Architecture:** Refactoring der Interpreten zur Erzeugung von Pfad-Segmenten (für Farbgradienten) und Einführung eines `PopupManager` zur strukturierten Darstellung von Metadaten in MapLibre.

**Tech Stack:** TypeScript, MapLibre GL JS, Vanilla CSS.

---

### Task 1: AdsbInterpreter Refactoring (Altitude Segments)

**Files:**
- Modify: `src/api/AdsbInterpreter.ts`

- [ ] **Step 1: Update Aircraft History Storage**
Erweitere die `tracks` Map, um Höhenwerte zu speichern und implementiere die Segment-Logik in `getTracksAsGeoJson`.

```typescript
// src/api/AdsbInterpreter.ts
export class AdsbInterpreter {
    // ... existing ...
    private tracks: Map<string, { lon: number, lat: number, alt: number }[]>;

    constructor(url: string, options: { maxTrackPoints?: number } = {}) {
        this.url = url;
        this.maxTrackPoints = options.maxTrackPoints || 60;
        this.tracks = new Map();
    }

    async fetch(): Promise<GeoJSON.FeatureCollection<GeoJSON.Point, Aircraft>> {
        const response = await fetch(this.url);
        const data = await response.json();
        const aircraft: Aircraft[] = (data.aircraft || []).filter((a: any) => a.lat != null && a.lon != null);

        const activeHexes = new Set<string>();
        aircraft.forEach(a => {
            activeHexes.add(a.hex);
            const track = this.tracks.get(a.hex) || [];
            const alt = typeof a.alt_baro === 'number' ? a.alt_baro : 0;
            
            // Nur hinzufügen wenn Position sich geändert hat
            const last = track[track.length - 1];
            if (!last || last.lon !== a.lon || last.lat !== a.lat) {
                track.push({ lon: a.lon, lat: a.lat, alt });
                if (track.length > this.maxTrackPoints) track.shift();
                this.tracks.set(a.hex, track);
            }
        });

        for (const hex of this.tracks.keys()) {
            if (!activeHexes.has(hex)) this.tracks.delete(hex);
        }

        return {
            type: 'FeatureCollection',
            features: aircraft.map(a => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [a.lon, a.lat] },
                properties: a
            }))
        };
    }

    getTracksAsGeoJson(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
        const features: any[] = [];
        for (const [hex, points] of this.tracks.entries()) {
            if (points.length < 2) continue;
            
            // In 2-Punkt-Segmente unterteilen für Farbgradient
            for (let i = 0; i < points.length - 1; i++) {
                const p1 = points[i];
                const p2 = points[i+1];
                const altMid = (p1.alt + p2.alt) / 2;
                
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [[p1.lon, p1.lat], [p2.lon, p2.lat]]
                    },
                    properties: { hex, alt_mid: altMid }
                });
            }
        }
        return { type: 'FeatureCollection', features } as any;
    }
}
```

- [ ] **Step 2: Commit Task 1**
```bash
git add src/api/AdsbInterpreter.ts
git commit -m "feat(adsb): implement altitude-dependent track segmentation"
```

---

### Task 2: AisInterpreter Refactoring (Efficiency)

**Files:**
- Modify: `src/api/AisInterpreter.ts`

- [ ] **Step 1: Implement Position Change Check**
Verhindere das Ansammeln von identischen Punkten bei liegenden Schiffen.

```typescript
// src/api/AisInterpreter.ts
export class AisInterpreter {
    // ... existing ...
    async fetch(): Promise<GeoJSON.FeatureCollection<GeoJSON.Point, Ship>> {
        const response = await fetch(this.url);
        const data = await response.json();
        const ships: Ship[] = (data.ships || []).filter((s: any) => s.lat != null && s.lon != null);

        const activeIds = new Set<number>();
        ships.forEach(s => {
            activeIds.add(s.mmsi);
            const track = this.tracks.get(s.mmsi) || [];
            const last = track[track.length - 1];
            
            // Nur hinzufügen wenn Position sich signifikant geändert hat (> 0.0001 grad ~ 10m)
            const hasMoved = !last || 
                Math.abs(last[0] - s.lon) > 0.0001 || 
                Math.abs(last[1] - s.lat) > 0.0001;

            if (hasMoved) {
                track.push([s.lon, s.lat]);
                if (track.length > this.maxTrackPoints) track.shift();
                this.tracks.set(s.mmsi, track);
            }
        });

        for (const mmsi of this.tracks.keys()) {
            if (!activeIds.has(mmsi)) this.tracks.delete(mmsi);
        }
        // ... rest stays same ...
    }
}
```

- [ ] **Step 2: Commit Task 2**
```bash
git add src/api/AisInterpreter.ts
git commit -m "feat(ais): optimize track point collection for stationary vessels"
```

---

### Task 3: PopupManager Implementation

**Files:**
- Create: `src/lib/PopupManager.ts`

- [ ] **Step 1: Create Central Popup Utility**
Implementiere die Logik zur Erzeugung von CI-konformen Popup-Tabellen.

```typescript
// src/lib/PopupManager.ts
export interface PopupField {
    key: string;
    label: string;
    format?: (val: any) => string | null;
}

export interface LayerPopupConfig {
    title: (props: any) => string;
    icon: string;
    fields: PopupField[];
}

const SHIP_CLASSES: Record<number, string> = {
    1: 'Small Vessel', 2: 'Cargo', 4: 'Passenger', 6: 'Tanker', 11: 'Base Station'
};

export const POPUP_CONFIGS: Record<string, LayerPopupConfig> = {
    'adsb-icons': {
        title: (p) => p.flight?.trim() || p.hex || 'Unknown',
        icon: 'fa-solid fa-plane',
        fields: [
            { key: 'hex', label: 'ICAO Hex' },
            { key: 'alt_baro', label: 'Altitude', format: (v) => v != null ? `${v.toLocaleString()} ft` : null },
            { key: 'gs', label: 'Speed', format: (v) => v != null ? `${Math.round(v)} kn` : null },
            { key: 'track', label: 'Track', format: (v) => v != null ? `${Math.round(v)}°` : null },
            { key: 'vert_rate', label: 'Vert. Rate', format: (v) => v != null ? `${v > 0 ? '+' : ''}${v} ft/min` : null },
            { key: 'squawk', label: 'Squawk' },
            { key: 'seen', label: 'Last seen', format: (v) => v != null ? `vor ${Math.round(v)}s` : null }
        ]
    },
    'ais-icons': {
        title: (p) => p.shipname || p.name || `MMSI: ${p.mmsi}`,
        icon: 'fa-solid fa-ship',
        fields: [
            { key: 'mmsi', label: 'MMSI' },
            { key: 'shipclass', label: 'Class', format: (v) => SHIP_CLASSES[v] || v },
            { key: 'speed', label: 'Speed', format: (v) => v != null ? `${v} kn` : null },
            { key: 'cog', label: 'Course', format: (v) => v != null ? `${Math.round(v)}°` : null },
            { key: 'destination', label: 'Destination' }
        ]
    }
};

export class PopupManager {
    static buildHtml(layerId: string, props: any): string {
        const config = POPUP_CONFIGS[layerId] || POPUP_CONFIGS['ais-icons']; // Fallback
        const title = config.title(props);
        
        const rows = config.fields.map(f => {
            let val = props[f.key];
            if (val == null || val === '' || val === 'null') return '';
            if (f.format) val = f.format(val);
            if (val == null) return '';
            
            return `
                <tr>
                    <td class="popup-label">${f.label}</td>
                    <td class="popup-value">${val}</td>
                </tr>`;
        }).join('');

        return `
            <div class="map-popup-detail">
                <div class="popup-header">
                    <i class="${config.icon}"></i>
                    <strong>${title}</strong>
                </div>
                <table class="popup-kv">
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }
}
```

- [ ] **Step 2: Commit Task 3**
```bash
git add src/lib/PopupManager.ts
git commit -m "feat(lib): add PopupManager for CI-compliant data display"
```

---

### Task 4: TrackingPage Refinement (Map & Interaction)

**Files:**
- Modify: `src/pages/TrackingPage.ts`

- [ ] **Step 1: Update ADS-B Track Styling**
Passe den `adsb-tracks` Layer an, um das `alt_mid` Property für den Gradienten zu nutzen.

```typescript
// src/pages/TrackingPage.ts (innerhalb ensureTrackingLayers)
// ...
map.addLayer({
    id: 'adsb-tracks',
    type: 'line',
    source: 'adsb-tracks',
    paint: { 
        'line-color': [
            'interpolate', ['linear'],
            ['coalesce', ['get', 'alt_mid'], 0],
            0,     '#22c55e',
            5000,  '#38bdf8',
            15000, '#818cf8',
            35000, '#e879f9'
        ], 
        'line-width': ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5],
        'line-opacity': 0.7 
    },
    layout: { 
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': adsbVisible ? 'visible' : 'none' 
    }
});
```

- [ ] **Step 2: Integrate PopupManager**
Ersetze das `setupPopup` in `TrackingPage.ts` durch den `PopupManager`.

```typescript
// src/pages/TrackingPage.ts
import { PopupManager } from '../lib/PopupManager';

// ... innerhalb ensureTrackingLayers ...
const setupPopup = (layerId: string) => {
    map.on('click', layerId, (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const html = PopupManager.buildHtml(layerId, feat.properties);
        popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    });
    // mouseenter/mouseleave ...
};
setupPopup('adsb-icons');
setupPopup('ais-icons');
```

- [ ] **Step 3: Update Interaction (Highlighting)**
Stelle sicher, dass bei Auswahl in der Sidebar das Highlight sofort auf der Karte erscheint.

```typescript
// src/pages/TrackingPage.ts (initTrackingSidebar Callback)
initTrackingSidebar(document.getElementById('sidebar-container')!, (item) => {
    selectedId = item.id;
    map.flyTo({ center: [item.lon, item.lat], zoom: 14 });

    // Update highlight
    if (map.getLayer('adsb-tracks')) {
      map.setPaintProperty('adsb-tracks', 'line-width', ['case', ['==', ['get', 'hex'], selectedId || ''], 4, 1.5]);
    }
    if (map.getLayer('ais-track-lines')) {
      map.setPaintProperty('ais-track-lines', 'line-width', ['case', ['==', ['get', 'mmsi'], String(selectedId)], 4, 2]);
    }
});
```

- [ ] **Step 4: Commit Task 4**
```bash
git add src/pages/TrackingPage.ts
git commit -m "feat(tracking): integrate altitude gradient and PopupManager"
```

---

### Task 5: Final Validation

- [ ] **Step 1: Visual Check**
Starte den Dev-Server und prüfe:
1.  Haben Flugzeuge farbige Tracks (Grün -> Blau -> Lila)?
2.  Öffnen sich Popups mit sauberen Tabellen?
3.  Wird der Track fett, wenn man ein Objekt in der Sidebar anklickt?

Run: `npm run dev`

- [ ] **Step 2: Build & Lint**
```bash
npm run build && npm run lint
```
