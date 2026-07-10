import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import { MapCore } from './MapCore';
import { MapRegistry } from './MapRegistry';
import { addSourceIfMissing, addLayerIfMissing } from './MapDefinitionOps';

interface LoadedOverlay {
  style: StyleSpecification;
  sourceIdMap: Map<string, string>;
  sourceIds: string[];
  layerIds: string[];
  hasImage: boolean;
}

// Pro Overlay-ID das gecachte, geparste Style-JSON, die Zuordnung original-sourceId ->
// geprefixte uniqueSourceId, und die tatsächlich hinzugefügten Source-/Layer-IDs. Nötig, weil
// diese aus dem entfernten Style stammen und nicht zwingend der Overlay-ID entsprechen – ohne
// dieses Tracking lässt sich ein Overlay nicht zuverlässig wieder entfernen (genau das war die
// Ursache des Contours-Bugs, der gegen die falsche ID prüfte). layerIds ist kumulativ: mehrere
// add()-Aufrufe mit unterschiedlichen Layer-Teilmengen für dasselbe Overlay ergänzen sich, statt
// sich zu ersetzen.
const loaded = new Map<string, LoadedOverlay>();

// Läuft eine Overlay-Erstellung (fetch+parse) bereits für eine overlayId, teilen sich parallele
// add()-Aufrufe dieses eine Promise statt jeder für sich eine eigene entry anzulegen. Ohne das
// verlieren sich bei parallelen Aufrufen (z.B. Sidebar.ts "Alle an", das onLayerToggle() nicht
// awaited) alle bis auf die zuletzt aufgelöste entry — jede fetch()-Antwort erzeugt sonst ihre
// eigene, unabhängige entry und überschreibt die vorherige in `loaded`, wodurch deren bereits
// gepushte layerIds verloren gehen (Root Cause für "RD/NEF-Klick zeigt nichts").
const creating = new Map<string, Promise<LoadedOverlay>>();

const prefixed = (overlayId: string, id: string) => (id.startsWith(overlayId) ? id : `${overlayId}-${id}`);

/**
 * Gemeinsamer Loader für entfernte MapLibre-Style-Overlays (z.B. Wanderwege, Höhenlinien,
 * Karten-Layer-Toggles). Vereinheitlicht das zuvor an mehreren Stellen kopierte
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
   * Lädt den Style unter `styleUrl` als Overlay und fügt Layer hinzu. Ohne `opts.layerIds`:
   * alle Layer des Styles (Default, unverändertes Verhalten). Mit `opts.layerIds`: nur die
   * angegebene Teilmenge — mehrere Aufrufe mit unterschiedlichen Teilmengen für dasselbe Overlay
   * ergänzen sich kumulativ, statt sich zu ersetzen. Sources werden immer vollständig beim
   * ersten Aufruf für ein Overlay hinzugefügt (gemeinsame Infrastruktur, unabhängig von der
   * Layer-Teilmenge). Wirft bei Fetch-/Parse-Fehlern – der Aufrufer entscheidet über
   * Fehlerbehandlung (z.B. Toast).
   */
  async add(
    map: maplibregl.Map,
    overlayId: string,
    styleUrl: string,
    opts?: { signal?: AbortSignal; layerIds?: string[] }
  ): Promise<void> {
    // isStyleLoaded() wird erst true, wenn ALLE Sources ihre initialen Tiles geladen haben
    // (nicht nur der Style-JSON geparst ist). Bei großen Basemaps (z.B. "Basemap At", ~2.4 GB
    // PMTiles) ist das hier oft noch nicht der Fall. Auf ein erneutes 'style.load'-Event zu
    // warten hängt für immer, da dieses Event schon gefeuert hat und ohne weiteren
    // setStyle()-Aufruf nicht erneut feuert. Stattdessen pollen, bis der Style wirklich fertig
    // geladen ist.
    if (!map.isStyleLoaded()) {
      await new Promise<void>(resolve => {
        const check = () => {
          if (map.isStyleLoaded()) resolve();
          else requestAnimationFrame(check);
        };
        check();
      });
    }

    let entry = loaded.get(overlayId);

    if (!entry) {
      let pending = creating.get(overlayId);
      if (!pending) {
        pending = (async () => {
          const res = await fetch(styleUrl, opts?.signal ? { signal: opts.signal } : undefined);
          const style = await res.json();

          const newEntry: LoadedOverlay = { style, sourceIdMap: new Map(), sourceIds: [], layerIds: [], hasImage: false };
          loaded.set(overlayId, newEntry);

          if (style.sprite) {
            const spriteUrl = style.sprite as string;
            MapRegistry.registerImage(overlayId, spriteUrl, styleUrl);
            await MapCore.loadSprites(map, spriteUrl, styleUrl);
            newEntry.hasImage = true;
          }

          const resolvedSources = MapCore.resolveSourceUrls(style.sources || {}, styleUrl);
          for (const [sourceId, def] of Object.entries(resolvedSources)) {
            const uniqueSourceId = prefixed(overlayId, sourceId);
            newEntry.sourceIdMap.set(sourceId, uniqueSourceId);
            MapRegistry.registerSource(uniqueSourceId, def);
            addSourceIfMissing(map, uniqueSourceId, def);
            newEntry.sourceIds.push(uniqueSourceId);
          }

          return newEntry;
        })();
        creating.set(overlayId, pending);
      }
      entry = await pending;
      creating.delete(overlayId);
    }

    const style = entry.style;
    const wantedLayerIds: string[] = opts?.layerIds ?? (style.layers || []).map((l) => l.id);

    for (const layerId of wantedLayerIds) {
      const uniqueLayerId = prefixed(overlayId, layerId);
      if (entry.layerIds.includes(uniqueLayerId)) continue;

      const layerDef = (style.layers || []).find((l) => l.id === layerId);
      if (!layerDef) continue;

      const newLayer = { ...layerDef, id: uniqueLayerId };
      if ('source' in newLayer && newLayer.source && entry.sourceIdMap.has(newLayer.source)) {
        newLayer.source = entry.sourceIdMap.get(newLayer.source) ?? newLayer.source;
      }
      MapRegistry.registerLayer(uniqueLayerId, newLayer);
      addLayerIfMissing(map, newLayer);
      entry.layerIds.push(uniqueLayerId);
    }
  },

  /**
   * Entfernt Layer eines Overlays. Ohne `opts.layerIds`: alle Layer (Default, unverändertes
   * Verhalten), danach auch Sources + Sprite-Image. Mit `opts.layerIds`: nur die angegebene
   * Teilmenge — werden dadurch ALLE Layer des Overlays entfernt (letzte Teilmenge
   * ausgeschaltet), werden automatisch auch Sources + Sprite-Image mit entfernt.
   */
  remove(map: maplibregl.Map, overlayId: string, opts?: { layerIds?: string[] }): void {
    const entry = loaded.get(overlayId);
    if (!entry) return;

    const toRemove = opts?.layerIds
      ? opts.layerIds.map(id => prefixed(overlayId, id))
      : entry.layerIds.slice();

    for (const layerId of toRemove) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      MapRegistry.unregisterLayer(layerId);
      entry.layerIds = entry.layerIds.filter(id => id !== layerId);
    }

    if (entry.layerIds.length === 0) {
      for (const sourceId of entry.sourceIds) {
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        MapRegistry.unregisterSource(sourceId);
      }
      if (entry.hasImage) MapRegistry.unregisterImage(overlayId);
      loaded.delete(overlayId);
    }
  },

  /**
   * Tracking für eine neue Karteninstanz zurücksetzen. Wird beim Seitenwechsel zusammen mit
   * MapRegistry.clear() aufgerufen; die alten IDs gehörten zur zerstörten Karte.
   */
  reset(): void {
    loaded.clear();
  },

  /**
   * Alle aktuell aktiven Layer-IDs über alle geladenen Overlays hinweg (flach) — für generisches
   * Klick-Handling gegen "irgendein aktives Overlay-Feature" (z.B. MapPageController), ohne
   * Nicht-Overlay-Layer (Such-Pin, Basemap, Terrain) mit einzuschließen.
   */
  getActiveLayerIds(): string[] {
    return Array.from(loaded.values()).flatMap(entry => entry.layerIds);
  },
};
