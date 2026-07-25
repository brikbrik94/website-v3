import * as maplibregl from 'maplibre-gl';
import { type SourceSpecification, type LayerSpecification } from 'maplibre-gl';

/**
 * Fügt eine Source hinzu, falls noch nicht vorhanden. Klont die Definition vorher (MapLibre
 * mutiert das übergebene Objekt beim Hinzufügen; ohne Klon würde das die in MapRegistry/
 * OverlayLoader gespeicherte kanonische Kopie korrumpieren).
 */
export function addSourceIfMissing(map: maplibregl.Map, id: string, definition: SourceSpecification): void {
  if (map.getSource(id)) return;
  try {
    map.addSource(id, JSON.parse(JSON.stringify(definition)));
  } catch (e) {
    console.warn(`[Map] Konnte Source ${id} nicht hinzufügen`, e);
  }
}

/**
 * Fügt einen Layer hinzu, falls noch nicht vorhanden (gleiche Klon-Begründung wie oben).
 */
export function addLayerIfMissing(map: maplibregl.Map, definition: LayerSpecification, beforeId?: string): void {
  if (map.getLayer(definition.id)) return;
  try {
    map.addLayer(JSON.parse(JSON.stringify(definition)), beforeId);
  } catch (e) {
    console.warn(`[Map] Konnte Layer ${definition.id} nicht hinzufügen`, e);
  }
}
