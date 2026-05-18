import maplibregl from 'maplibre-gl';
import { NahStationResult } from '../../types/nah';
import { renderNahResults } from '../../components/NahSidebar';

/**
 * Context required for the Sidebar Adapter to interact with the map and data
 */
export interface NahSidebarContext {
  map: maplibregl.Map | null;
  currentIncidentCoord: [number, number] | null;
  currentResults: NahStationResult[];
}

/**
 * Adapter to bridge Nah calculations/data with the Sidebar UI
 */
export class NahSidebarAdapter {
  /**
   * Orchestrates the sidebar click event: zooming, highlighting lines and updating active state
   */
  public static handleSidebarClick(e: MouseEvent, context: NahSidebarContext): void {
    const map = context.map;
    if (!map) return;

    const item = (e.target as HTMLElement).closest('.result-item-simple') as HTMLElement;
    if (item) {
      const index = item.dataset.index;
      
      // Zoom to all results (Overview)
      const bounds = new maplibregl.LngLatBounds();
      if (context.currentIncidentCoord) {
        bounds.extend(context.currentIncidentCoord);
      }
      context.currentResults.forEach(r => bounds.extend([r.lon, r.lat]));
      
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 80 });
      }
      
      // Line Highlighting
      // We assume up to 5 lines are shown
      for (let i = 0; i < 5; i++) {
        map.setFeatureState({ source: 'nah-lines', id: i }, { selected: false });
      }
      
      if (index !== undefined) {
        map.setFeatureState({ source: 'nah-lines', id: parseInt(index) }, { selected: true });
      }

      // Visually mark active item
      document.querySelectorAll('.result-item-simple').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
    }
  }

  /**
   * Updates the sidebar results container with new calculation results
   */
  public static updateResults(container: HTMLElement, results: NahStationResult[]): void {
    renderNahResults(container, results);
  }
}
