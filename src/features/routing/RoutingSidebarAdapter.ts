import maplibregl from 'maplibre-gl';
import { RoutingDataService } from './RoutingDataService';
import { RoutingMapLayers } from './RoutingMapLayers';
import { RoutingService } from '../../lib/RoutingService';
import {
  initRoutingSidebar,
  updateRoutingSummary,
  renderStationResults,
  renderRoutingError,
  setRoutingCoord
} from '../../components/RoutingSidebar';
import { RoutingStation } from '../../types/common';

export class RoutingSidebarAdapter {
  constructor(
    private dataService: RoutingDataService,
    private map: maplibregl.Map,
    private abortSignal: AbortSignal
  ) {}

  public init(container: HTMLElement) {
    initRoutingSidebar(container, async (params) => {
      const btn = document.getElementById('btn-start-routing') as HTMLButtonElement;
      if (btn) btn.classList.add('loading');
      
      this.clearAll();
      await this.setCoord('target', params.target[0], params.target[1]);
      
      try {
        if (params.mode === 'ab' && params.start) {
          await this.setCoord('start', params.start[0], params.start[1]);
          
          // Nur driving-car hat im ORS-Graph die way_type/tollways/roadaccessrestrictions
          // Encoded-Values geladen; extra_info für driving-emergency liefert 500 (Fehlercode 2018).
          const extraInfo = params.profile === 'driving-car'
            ? ['waytype', 'tollways', 'roadaccessrestrictions']
            : undefined;
          const route = await RoutingService.calculateRoute(
            params.start,
            params.target,
            params.profile,
            extraInfo
          );
          if (this.abortSignal.aborted) return;

          if (route && route.features && route.features.length > 0) {
            const { summary, extras, segments } = route.features[0].properties;
            updateRoutingSummary(summary.distance, summary.duration, 'Zusammenfassung', params.profile, extras, segments);
            RoutingMapLayers.updateSingleRoute(this.map, route.features[0]);

            const bounds = new maplibregl.LngLatBounds();
            route.features[0].geometry.coordinates.forEach((c: any) => bounds.extend(c));
            this.map.fitBounds(bounds, { padding: 50 });
          }
        } else {
          const results: RoutingStation[] = await RoutingService.findNearestStations(params.target, params.mode as any, params.profile);
          if (this.abortSignal.aborted) return;
          
          if (results.length === 0) {
            renderRoutingError('Keine Standorte in der Nähe gefunden.');
            return;
          }

          this.dataService.setNearestStations(results);
          RoutingMapLayers.updateStationsLayer(this.map, this.dataService);
          
          results.forEach((r: RoutingStation) => {
             if(r.route) this.dataService.setStationRoute(r.id, r.route);
          });

          const fetchRouteIfNeeded = async (station: RoutingStation) => {
            if (!this.dataService.getStationRoutes().get(station.id)) {
              const route = await RoutingService.calculateRoute([station.lat, station.lon], params.target, params.profile);
              if (this.abortSignal.aborted) return;
              if (route && route.features && route.features.length > 0) {
                this.dataService.setStationRoute(station.id, route);
              }
            }
          };

          renderStationResults(results, async (station, active) => {
            if (active) {
              await fetchRouteIfNeeded(station);
              this.dataService.setEyeActiveState(station.id, true);
            } else {
              this.dataService.setEyeActiveState(station.id, false);
            }
            if (this.abortSignal.aborted) return;
            RoutingMapLayers.updateRoutesLayer(this.map, this.dataService);
          }, async (station) => {
            if (this.dataService.getCurrentHighlightedId() === station.id) {
              this.dataService.setCurrentHighlightedId(null);
            } else {
              this.dataService.setCurrentHighlightedId(station.id);
              await fetchRouteIfNeeded(station);
            }
            if (this.abortSignal.aborted) return;
            RoutingMapLayers.updateRoutesLayer(this.map, this.dataService);
            
            const currentHighlightedId = this.dataService.getCurrentHighlightedId();
            if (currentHighlightedId !== null) {
              const route = this.dataService.getStationRoutes().get(station.id);
              if (route && route.features[0].geometry) {
                const bounds = new maplibregl.LngLatBounds();
                route.features[0].geometry.coordinates.forEach((c: any) => bounds.extend(c));
                this.map.fitBounds(bounds, { padding: 50 });
              }
            }
          });

          RoutingMapLayers.updateRoutesLayer(this.map, this.dataService);
          
          const bounds = new maplibregl.LngLatBounds();
          bounds.extend([params.target[1], params.target[0]]);
          results.forEach((r: any) => {
             bounds.extend([r.lon, r.lat]);
          });
          this.map.fitBounds(bounds, { padding: 80 });
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.debug('Routing request aborted.');
        } else {
          console.error('[Routing] Calculation failed:', err);
          renderRoutingError('Route konnte nicht berechnet werden.');
        }
      } finally {
        if (btn) btn.classList.remove('loading');
      }
    });
  }

  public async setCoord(type: 'start' | 'target', lat: number, lon: number) {
    this.dataService.setCoords(type, [lat, lon]);
    await setRoutingCoord(type, lat, lon);
    
    if (type === 'start') {
      RoutingMapLayers.updateStartPin(this.map, [lon, lat]);
    } else {
      RoutingMapLayers.updateTargetPin(this.map, [lon, lat]);
    }
  }

  public handleMapClick(e: maplibregl.MapMouseEvent) {
    const modeBtn = document.querySelector('.segmented-btn.active');
    const mode = modeBtn?.getAttribute('data-mode') || 'ab';

    if (mode === 'ab') {
      const startInput = document.getElementById('input-start') as HTMLInputElement;
      if (!startInput || !startInput.value) {
        this.setCoord('start', e.lngLat.lat, e.lngLat.lng);
      } else {
        this.setCoord('target', e.lngLat.lat, e.lngLat.lng);
      }
    } else {
      this.setCoord('target', e.lngLat.lat, e.lngLat.lng);
    }
  }

  public addWaypoint(lngLat: maplibregl.LngLat) {
    this.setCoord('target', lngLat.lat, lngLat.lng);
  }

  public clearRoute() {
    this.clearAll();
    const startInput = document.getElementById('input-start') as HTMLInputElement;
    const targetInput = document.getElementById('input-target') as HTMLInputElement;
    if (startInput) startInput.value = '';
    if (targetInput) targetInput.value = '';
  }

  public reapplyLayers() {
    RoutingMapLayers.ensureBaseLayers(this.map);
    RoutingMapLayers.updateRoutesLayer(this.map, this.dataService);
    RoutingMapLayers.updateStationsLayer(this.map, this.dataService);
    
    // Restore markers
    const start = this.dataService.getStartCoord();
    const target = this.dataService.getTargetCoord();
    if (start) this.setCoord('start', start[0], start[1]);
    if (target) this.setCoord('target', target[0], target[1]);
  }

  private clearAll() {
    this.dataService.clearResults();
    this.dataService.clearCoords();
    
    RoutingMapLayers.updateStartPin(this.map, null);
    RoutingMapLayers.updateTargetPin(this.map, null);

    RoutingMapLayers.updateRoutesLayer(this.map, this.dataService);
    RoutingMapLayers.updateStationsLayer(this.map, this.dataService);
    renderStationResults([], () => {}, () => {});
    updateRoutingSummary(0, 0);
    document.getElementById('routing-details')?.classList.add('hidden');
  }
}

