import { MapCore } from '../lib/MapCore';
import { initTopbar } from '../components/Topbar';
import maplibregl from 'maplibre-gl';
import { Toast } from '../lib/Toast';
import { initNahSidebar, renderNahResults, updateNahServerStatus } from '../components/NahSidebar';
import { calculateDistance, calculateFlightTime, formatDuration, formatETA } from '../lib/FlightMath';
import { MAP_ROUTE_STYLES, MAP_COLORS } from '../lib/MapStyles';
import { MapLegend } from '../lib/MapLegend';
import { NahStation, NahStationResult, NahResponse } from '../types/nah';
import { InventoryService } from '../services/InventoryService';
import { LayoutHelper } from '../lib/LayoutHelper';
import { MapRegistry } from '../lib/MapRegistry';
import { BasePageController } from '../core/BasePageController';

export class NahPageController extends BasePageController {
  private stations: NahStation[] = [];
  private stationMarkers: maplibregl.Marker[] = [];
  private targetMarker: maplibregl.Marker | null = null;
  private currentResults: NahStationResult[] = [];
  private currentIncidentCoord: [number, number] | null = null;
  private refreshTimeout: any = null;
  private connectionInterval: any = null;
  private map: maplibregl.Map | null = null;
  private sidebarResults: HTMLElement | null = null;

  public async mount(container: HTMLElement): Promise<void> {
    try {
      // 1. Daten laden
      const invService = InventoryService.getInstance();
      const basemaps = await invService.getBasemaps();

      // 2. Basis-Layout
      const mounts = LayoutHelper.renderBaseLayout(container, { 
        withLegend: true, 
        legendTitle: 'Luftrettung' 
      });

      const legend = new MapLegend(mounts.legend!);
      legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.active.color, label: 'Gewählte Station' });
      legend.addEntry({ type: 'line', color: MAP_ROUTE_STYLES.background.color, label: 'Nächste Stationen' });
      legend.addEntry({ type: 'dot',  color: MAP_COLORS.success, label: 'Einsatzbereit' });
      legend.addEntry({ type: 'dot',  color: MAP_COLORS.danger, label: 'Außer Dienst (Betriebszeit)' });
      legend.addEntry({ type: 'dot',  color: MAP_COLORS.muted, label: 'Außer Saison' });

      initNahSidebar(mounts.sidebar);
      this.sidebarResults = document.getElementById('nah-sidebar-results')!;

      // 3. Karte initialisieren
      this.map = MapCore.init(
        mounts.map, 
        basemaps[0]?.style.url || 'https://tiles.oe5ith.at/basemaps/styles/at/style.json',
        async (m) => {
          this.ensureNahLayers(m);
          if (this.currentIncidentCoord && this.sidebarResults) {
            this.performCalculation(m, this.sidebarResults, this.currentIncidentCoord[0], this.currentIncidentCoord[1]);
          }
          m.triggerRepaint();
        }
      );
      this.map.jumpTo({ center: [13.5, 48.0], zoom: 7 });

      // 4. Komponenten initialisieren
      initTopbar(mounts.topbar, basemaps, (url) => {
        if (!this.map) return;
        this.map.setStyle(url);
      }, () => legend.toggle());

      // 5. NAH-Daten laden und Marker setzen (Initialer Load)
      await this.refreshStations();

      // 6. Map-Click Logik für Luftlinie & Sidebar
      this.map.on('click', this.handleMapClick);

      // Klick auf Sidebar-Result zentriert Karte
      this.sidebarResults.addEventListener('click', this.handleSidebarClick);

      // Alive Ping Logik (Heartbeat)
      this.checkConnection();
      this.connectionInterval = setInterval(() => this.checkConnection(), 30000);

    } catch (err) {
      console.error('[NahPage]', err);
      Toast.error('Fehler beim Initialisieren der Luftrettungs-Seite');
    }
  }

  public destroy(): void {
    super.destroy();
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
    if (this.connectionInterval) clearInterval(this.connectionInterval);
    
    this.stationMarkers.forEach(m => m.remove());
    this.stationMarkers = [];
    
    if (this.targetMarker) {
      this.targetMarker.remove();
      this.targetMarker = null;
    }

    if (this.map) {
      this.map.off('click', this.handleMapClick);
    }
    
    if (this.sidebarResults) {
      this.sidebarResults.removeEventListener('click', this.handleSidebarClick);
    }
  }

  private handleMapClick = (e: maplibregl.MapMouseEvent) => {
    if (!this.map || !this.sidebarResults) return;
    // Ignorieren, wenn der Klick auf einen Marker erfolgte
    if ((e.originalEvent.target as HTMLElement).closest('.maplibregl-marker')) {
      return;
    }

    const { lng, lat } = e.lngLat;
    this.performCalculation(this.map, this.sidebarResults, lng, lat);
  };

  private handleSidebarClick = (e: MouseEvent) => {
    if (!this.map) return;
    const item = (e.target as HTMLElement).closest('.result-item-simple') as HTMLElement;
    if (item) {
      const index = item.dataset.index;
      
      // Auf alle Ergebnisse zoomen (Overview)
      const bounds = new maplibregl.LngLatBounds();
      if (this.currentIncidentCoord) bounds.extend(this.currentIncidentCoord);
      this.currentResults.forEach(r => bounds.extend([r.lon, r.lat]));
      
      if (!bounds.isEmpty()) {
        this.map.fitBounds(bounds, { padding: 80 });
      }
      
      // Linien-Highlighting
      for (let i = 0; i < 5; i++) {
        this.map.setFeatureState({ source: 'nah-lines', id: i }, { selected: false });
      }
      if (index !== undefined) {
        this.map.setFeatureState({ source: 'nah-lines', id: parseInt(index) }, { selected: true });
      }

      // Items optisch markieren
      document.querySelectorAll('.result-item-simple').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    }
  };

  private async checkConnection() {
    if (!this.map || !this.map.getContainer().isConnected) {
      if (this.connectionInterval) clearInterval(this.connectionInterval);
      return;
    }
    try {
      const res = await fetch('/api/ping.php', { signal: this.signal });
      updateNahServerStatus(res.ok);
    } catch (e) {
      updateNahServerStatus(false);
    }
  }

  private scheduleNextRefresh(refreshAtOrDelay: string | number) {
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);

    if (!this.map || !this.map.getContainer().isConnected) return;

    let delay: number;
    if (typeof refreshAtOrDelay === 'string') {
      const targetTime = Date.parse(refreshAtOrDelay);
      const now = Date.now();
      delay = targetTime - now + 10000;
    } else {
      delay = refreshAtOrDelay;
    }
    
    if (delay < 30000) delay = 30000;

    console.log(`[NahPage] Next reload scheduled in ${Math.round(delay/1000)}s`);

    this.refreshTimeout = setTimeout(async () => {
      if (!this.map || !this.map.getContainer().isConnected) return;
      
      console.log(`[NahPage] Dynamic reload triggered...`);
      await this.refreshStations();
      
      if (this.currentIncidentCoord && this.sidebarResults) {
        this.performCalculation(this.map, this.sidebarResults, this.currentIncidentCoord[0], this.currentIncidentCoord[1]);
      }
    }, delay);
  }

  private async refreshStations() {
    if (!this.map || !this.sidebarResults) return;

    try {
      const data = await this.fetchJson<NahResponse>('/api/nah.php');
      
      this.stations = data.stations || [];
      const refreshAt = data.refresh_at;
      
      this.stationMarkers.forEach(m => m.remove());
      this.stationMarkers = [];

      this.stations.forEach((station) => {
        let color = MAP_COLORS.success;
        let statusText = 'EINSATZBEREIT';

        if (!station.in_season) {
          color = MAP_COLORS.muted;
          statusText = 'AUSSER SAISON';
        } else if (!station.is_active) {
          color = MAP_COLORS.danger;
          statusText = 'AUSSER DIENST (Betriebszeit)';
        }
        
        const el = document.createElement('div');
        el.innerHTML = `<i class="fa-solid fa-helicopter map-marker-helicopter" style="color: ${color};"></i>`;
        
        let hoursHtml = '';
        if (station.op_type === 'fixed' && station.fixed_start && station.fixed_end) {
          hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end}</td></tr>`;
        } else if (station.op_type === 'daylight') {
          if (station.fixed_start && station.fixed_end) {
            hoursHtml = `<tr><td>Zeiten</td><td>${station.fixed_start} - ${station.fixed_end} (max. ECET)</td></tr>`;
          } else if (station.fixed_start) {
            hoursHtml = `<tr><td>Zeiten</td><td>Ab ${station.fixed_start} bis ECET</td></tr>`;
          } else {
            hoursHtml = `<tr><td>Zeiten</td><td>BCET bis ECET</td></tr>`;
          }
        } else if (station.op_type === '24/7') {
          hoursHtml = `<tr><td>Zeiten</td><td>24 Stunden / 7 Tage</td></tr>`;
        }

        const popupHtml = `
          <div class="map-popup-detail">
            <div class="popup-header">
              <div class="popup-header-title">${station.callsign}</div>
              <div class="popup-header-org">${station.name}</div>
            </div>
            <table class="popup-kv">
              <tr><td>Status</td><td style="color: ${color}; font-weight: 700;">${statusText}</td></tr>
              <tr><td>Betrieb</td><td>${station.op_type}</td></tr>
              ${hoursHtml}
              <tr><td>Nacht</td><td>${station.is_night_ready ? 'Ja' : 'Nein'}</td></tr>
              ${!station.in_season ? `<tr><td>Saison</td><td>Monate: ${station.months_active?.join(', ') || '-'}</td></tr>` : ''}
            </table>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.lon, station.lat])
          .setPopup(new maplibregl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(popupHtml))
          .addTo(this.map!);
        
        this.stationMarkers.push(marker);
      });

      if (this.stations.length > 0) {
        Toast.success(`${this.stations.length} NAH-Stützpunkte geladen.`);
      }

      if (refreshAt) {
        this.scheduleNextRefresh(refreshAt);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[NahPage] Refresh failed', err);
      Toast.error('Fehler beim Aktualisieren der NAH-Daten');
      this.scheduleNextRefresh(60000);
    }
  }

  private ensureNahLayers(m: maplibregl.Map) {
    const sourceId = 'nah-lines';
    const layerId = 'nah-lines';

    const layerDef = {
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.color, MAP_ROUTE_STYLES.background.color],
        'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.weight, MAP_ROUTE_STYLES.background.weight],
        'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], MAP_ROUTE_STYLES.active.opacity, MAP_ROUTE_STYLES.background.opacity]
      }
    };

    MapCore.ensureGeoJsonLayer(m, sourceId, layerDef as any);
  }

  private performCalculation(map: maplibregl.Map, sidebarResults: HTMLElement, lng: number, lat: number) {
    this.currentIncidentCoord = [lng, lat];

    if (!map.getSource('nah-lines')) {
      console.warn('[NahPage] Source missing in performCalculation, triggering self-healing...');
      this.ensureNahLayers(map);
    }

    if (!map.getSource('nah-lines')) return;

    for (let i = 0; i < 5; i++) {
      map.setFeatureState({ source: 'nah-lines', id: i }, { selected: false });
    }

    if (this.targetMarker) this.targetMarker.remove();
    this.targetMarker = new maplibregl.Marker({ color: MAP_COLORS.accent })
      .setLngLat([lng, lat])
      .addTo(map);

    const results: NahStationResult[] = this.stations
      .filter((s) => s.is_active)
      .map((s) => {
        const dist = calculateDistance(lat, lng, s.lat, s.lon);
        const duration = calculateFlightTime(dist);
        return {
          ...s,
          distance: dist,
          duration,
          durationStr: formatDuration(duration),
          eta: formatETA(duration)
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    this.currentResults = results;

    const lineFeatures = results.map((s, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'LineString',
        coordinates: [[lng, lat], [s.lon, s.lat]]
      },
      properties: { osm_id: s.osm_id }
    }));

    const data = {
      type: 'FeatureCollection',
      features: lineFeatures as any
    };

    const source = map.getSource('nah-lines') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data as any);
    }

    MapRegistry.registerSource('nah-lines', {
      type: 'geojson',
      data: data
    });

    renderNahResults(sidebarResults, results);
  }
}
