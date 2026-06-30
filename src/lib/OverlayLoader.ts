import maplibregl from 'maplibre-gl';
import { MapCore } from './MapCore';
import { MapRegistry } from './MapRegistry';

interface LoadedOverlay {
  sourceIds: string[];
  layerIds: string[];
  hasImage: boolean;
}

// Pro Overlay-ID die tatsächlich hinzugefügten Source-/Layer-IDs. Nötig, weil diese aus
// dem entfernten Style stammen und nicht zwingend der Overlay-ID entsprechen – ohne dieses
// Tracking lässt sich ein Overlay nicht zuverlässig wieder entfernen (genau das war die
// Ursache des Contours-Bugs, der gegen die falsche ID prüfte).
const loaded = new Map<string, LoadedOverlay>();

/**
 * Gemeinsamer Loader für entfernte MapLibre-Style-Overlays (z.B. Wanderwege, Höhenlinien).
 * Vereinheitlicht das zuvor an mehreren Stellen kopierte
 * fetch → resolveSourceUrls → registerImage+loadSprites → register/add sources+layers.
 *
 * Sprites/Sources/Layer werden in der MapRegistry eingetragen und überleben so
 * Style-Wechsel (MapRegistry.restore fügt sie erneut hinzu).
 */
export const OverlayLoader = {
  isLoaded(overlayId: string): boolean {
    return loaded.has(overlayId);
  },

  /**
   * Lädt den kompletten Style unter `styleUrl` als Overlay und fügt ihn der Karte hinzu.
   * No-op, wenn das Overlay bereits geladen ist. Wirft bei Fetch-/Parse-Fehlern – der Aufrufer
   * entscheidet über Fehlerbehandlung (z.B. Toast).
   */
  async add(
    map: maplibregl.Map,
    overlayId: string,
    styleUrl: string,
    opts?: { signal?: AbortSignal }
  ): Promise<void> {
    if (loaded.has(overlayId)) return;

    const res = await fetch(styleUrl, opts?.signal ? { signal: opts.signal } : undefined);
    const style = await res.json();

    const entry: LoadedOverlay = { sourceIds: [], layerIds: [], hasImage: false };

    if (style.sprite) {
      MapRegistry.registerImage(overlayId, style.sprite, styleUrl);
      await MapCore.loadSprites(map, style.sprite, styleUrl);
      entry.hasImage = true;
    }

    const resolvedSources = MapCore.resolveSourceUrls(style.sources || {}, styleUrl);
    for (const [sourceId, def] of Object.entries(resolvedSources)) {
      MapRegistry.registerSource(sourceId, def);
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, JSON.parse(JSON.stringify(def)));
      }
      entry.sourceIds.push(sourceId);
    }

    for (const layer of (style.layers || []) as any[]) {
      MapRegistry.registerLayer(layer.id, layer);
      if (!map.getLayer(layer.id)) {
        map.addLayer(JSON.parse(JSON.stringify(layer)));
      }
      entry.layerIds.push(layer.id);
    }

    loaded.set(overlayId, entry);
  },

  /** Entfernt exakt die hinzugefügten Layer (zuerst) und danach die Sources eines Overlays. */
  remove(map: maplibregl.Map, overlayId: string): void {
    const entry = loaded.get(overlayId);
    if (!entry) return;

    // Layer vor Sources entfernen (Sources mit aktiven Layern lassen sich nicht entfernen).
    for (const layerId of entry.layerIds) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      MapRegistry.unregisterLayer(layerId);
    }
    for (const sourceId of entry.sourceIds) {
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      MapRegistry.unregisterSource(sourceId);
    }
    if (entry.hasImage) MapRegistry.unregisterImage(overlayId);

    loaded.delete(overlayId);
  },

  /**
   * Tracking für eine neue Karteninstanz zurücksetzen. Wird beim Seitenwechsel zusammen mit
   * MapRegistry.clear() aufgerufen; die alten IDs gehörten zur zerstörten Karte.
   */
  reset(): void {
    loaded.clear();
  },
};
