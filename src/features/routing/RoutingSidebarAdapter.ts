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
import { RouteResult, RoutingStation } from '../../types/common';

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
      this.dataService.setCoords('target', params.target);
      RoutingMapLayers.updateMarkersLayer(this.map, this.dataService);
      
      try {
        if (params.mode === 'ab' && params.start) {
          this.dataService.setCoords('start', params.start);
          RoutingMapLayers.updateMarkersLayer(this.map, this.dataService);
          
          const route = await RoutingService.calculateRoute(params.start, params.target, params.profile);
          if (this.abortSignal.aborted) return;
          
          if (route && route.features && route.features.length > 0) {
            const summary = route.features[0].properties.summary;
            updateRoutingSummary(summary.distance, summary.duration);
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

  private clearAll() {
    this.dataService.clearResults();
    this.dataService.clearCoords();
    RoutingMapLayers.updateRoutesLayer(this.map, this.dataService);
    RoutingMapLayers.updateStationsLayer(this.map, this.dataService);
    RoutingMapLayers.updateMarkersLayer(this.map, this.dataService);
    renderStationResults([], () => {}, () => {});
    updateRoutingSummary(0, 0);
    const details = document.getElementById('routing-details');
    if (details) details.style.display = 'none';
  }
}
