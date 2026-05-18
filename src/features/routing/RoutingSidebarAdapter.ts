
import { Map } from 'maplibre-gl';
import { RoutingSidebar, RoutingFormParameters } from '../../components/RoutingSidebar';
import { RoutingDataService } from './RoutingDataService';
import { RoutingMapLayers } from './RoutingMapLayers';
import { RoutingService } from '../../lib/RoutingService';
import { nearestPOISearch } from './searches';
import { RouteResult } from '../../lib/RoutingService';

export class RoutingSidebarAdapter {
    private sidebar: RoutingSidebar;

    constructor(
        private container: HTMLElement,
        private map: Map,
        private dataService: RoutingDataService,
        private mapLayers: RoutingMapLayers,
        private routingService: RoutingService,
        private abortController: AbortController
    ) {
        this.sidebar = new RoutingSidebar(this.container);
    }

    public init(): void {
        this.sidebar.setCallback(this.handleFormSubmit.bind(this));
        this.sidebar.setNearestCallback(this.handleNearestSubmit.bind(this));
    }

    private async handleFormSubmit(params: RoutingFormParameters): Promise<void> {
        this.sidebar.setLoading(true);
        this.dataService.clearAll();
        this.mapLayers.clearAllLayers();

        try {
            const route = await this.routingService.calculateRoute({
                profile: params.profile,
                waypoints: [params.start, params.end],
                lang: 'de',
                signal: this.abortController.signal
            });

            if (route && route.features.length > 0) {
                this.dataService.updateSingleRoute(route);
                this.mapLayers.updateSingleRoute(route.features[0]);
                this.mapLayers.fitToBounds(route.bbox);
                this.sidebar.showResult(route.features[0]);
            } else {
                this.sidebar.showError('Keine Route gefunden.');
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Routing Error:', error);
                this.sidebar.showError('Fehler bei der Routenberechnung.');
            }
        } finally {
            this.sidebar.setLoading(false);
        }
    }

    private async handleNearestSubmit(params: RoutingFormParameters): Promise<void> {
        this.sidebar.setLoading(true);
        this.dataService.clearAll();
        this.mapLayers.clearAllLayers();

        try {
            const results = await nearestPOISearch(
                params.start,
                params.profile,
                this.routingService,
                this.abortController.signal,
            );

            if (results.length > 0) {
                this.dataService.updateNearestRoutes(results);
                this.mapLayers.updateNearestRoutes(results);

                const focusedRoute = results.find(r => r.focused);
                if (focusedRoute) {
                    this.mapLayers.fitToRoute(focusedRoute.route.features[0]);
                } else if(results[0]) {
                     this.mapLayers.fitToRoute(results[0].route.features[0]);
                }
                
                this.sidebar.showNearestResults(results);
            } else {
                this.sidebar.showError('Keine Ergebnisse für die nächste Suche gefunden.');
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') {
                console.error('Nearest search error:', error);
                this.sidebar.showError('Fehler bei der Suche nach dem Nächsten.');
            }
        } finally {
            this.sidebar.setLoading(false);
        }
    }
}
