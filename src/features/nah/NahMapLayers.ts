import * as maplibregl from 'maplibre-gl';
import { type LayerSpecification } from 'maplibre-gl';
import type { Feature, FeatureCollection, Point, LineString } from 'geojson';
import { MapCore, MARKERS_SPRITE_BASE } from '../../lib/MapCore';
import { MAP_COLORS, MAP_ROUTE_STYLES } from '../../lib/MapStyles';
import { MapRegistry } from '../../lib/MapRegistry';
import { PopupManager } from '../../lib/PopupManager';
import { attachHoverCursor } from '../../lib/HoverCursor';
import { NahStation, NahStationResult } from '../../types/nah';
import {
  type NahStationStatus,
  computeStationStatus,
  buildStationPopupHtml,
  buildMultiStationPopupHtml
} from './NahPopupBuilder';

export type { NahStationStatus };

const SPRITE_BASE = MARKERS_SPRITE_BASE;
const TARGET_PIN_SOURCE = 'nah-target-pin';
const TARGET_PIN_LAYER = 'nah-target-pin-layer';
const STATIONS_SOURCE = 'nah-stations';
const STATIONS_LAYER = 'nah-stations-layer';
const HELI_ICON_ID = 'nah-heli-icon';
const HELI_ICON_SIZE = 64;

const STATUS_PRIORITY: Record<NahStationStatus, number> = {
  active: 3,
  offseason: 2,
  inactive: 1
};

// Rendert das fa-helicopter-Glyph (Font Awesome 7 Free, solid, ) einmalig auf einen
// Canvas und registriert es als SDF-Icon. Es gibt kein einfärbbares Helikopter-Icon im
// oe5ith-markers Sprite-Set (nur nicht-SDF Betreiber-Logos, siehe ROADMAP.md); dieser Weg
// vermeidet eine externe Sprite-Server-Abhängigkeit für ein einzelnes generisches Icon.
async function ensureHeliIcon(map: maplibregl.Map): Promise<void> {
  if (map.hasImage(HELI_ICON_ID)) return;

  try {
    await document.fonts.load(`900 ${HELI_ICON_SIZE}px "Font Awesome 7 Free"`);
  } catch (e) {
    console.warn('[NahMapLayers] Font Awesome Font konnte nicht vorab geladen werden', e);
  }

  if (map.hasImage(HELI_ICON_ID)) return;

  const canvas = document.createElement('canvas');
  canvas.width = HELI_ICON_SIZE;
  canvas.height = HELI_ICON_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.font = `900 ${Math.round(HELI_ICON_SIZE * 0.85)}px "Font Awesome 7 Free"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = MAP_COLORS.black;
  ctx.fillText('', HELI_ICON_SIZE / 2, HELI_ICON_SIZE / 2 + HELI_ICON_SIZE * 0.03);

  try {
    const imageData = ctx.getImageData(0, 0, HELI_ICON_SIZE, HELI_ICON_SIZE);
    if (!map.hasImage(HELI_ICON_ID)) {
      map.addImage(HELI_ICON_ID, imageData, { sdf: true });
    }
  } catch (e) {
    console.error('[NahMapLayers] Konnte Helikopter-Icon nicht registrieren', e);
  }
}

// NAH-Stationen (Symbol-Layer statt DOM-Marker; siehe
// docs/superpowers/specs/2026-07-06-nah-symbol-layer-migration-design.md). Eigene Funktion statt
// Inline-Literal in initLayers(), damit die Legende (NahPage.ts) dieselbe Layer-Definition (und
// damit dieselbe status→Farbe-Zuordnung) lesen kann, ohne sie ein zweites Mal zu pflegen.
function buildStationsLayerDef(): LayerSpecification {
  return {
    id: STATIONS_LAYER,
    type: 'symbol',
    source: STATIONS_SOURCE,
    layout: {
      'icon-image': HELI_ICON_ID,
      'icon-size': 0.5,
      'icon-allow-overlap': true,
    },
    paint: {
      'icon-color': [
        'match', ['get', 'status'],
        'active', MAP_COLORS.success,
        'inactive', MAP_COLORS.danger,
        'offseason', MAP_COLORS.muted,
        MAP_COLORS.success
      ]
    }
  };
}

// Eigene Funktion statt Inline-Literal in initLayers() (analog buildStationsLayerDef() oben) —
// vor allem, damit 'text-font' testbar bleibt: ohne explizites 'text-font' fällt MapLibre auf
// seinen Style-Spec-Default ["Open Sans Regular","Arial Unicode MS Regular"] zurück (Leerzeichen
// statt Bindestrich), den der Tile-Server nicht unter diesem Namen hostet → 404 auf
// .../fonts/Open Sans Regular,Arial Unicode MS Regular/0-255.pbf (siehe
// docs/performance/2026-07-28-baseline-audit.md, Befund 3).
function buildStationsCountLayerDef(): LayerSpecification {
  return {
    id: 'nah-stations-count-label',
    type: 'symbol',
    source: STATIONS_SOURCE,
    layout: {
      'text-field': ['case', ['>', ['get', '_station_count'], 1], ['get', '_station_count'], ''],
      'text-font': ['Open-Sans-Regular'],
      'text-size': 12,
      'text-offset': [0, 1.2],
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': MAP_COLORS.white,
      'text-halo-color': [
        'match', ['get', 'status'],
        'active', MAP_COLORS.success,
        'inactive', MAP_COLORS.danger,
        'offseason', MAP_COLORS.muted,
        MAP_COLORS.success
      ],
      'text-halo-width': 1.5,
    }
  };
}

export const NahMapLayers = {
  /**
   * Liefert die aktuelle Stations-Layer-Definition (inkl. status→Farbe-Paint-Expression), ohne
   * dass die Karte initialisiert sein muss — für resolveLegendSwatchBranches() in NahPage.ts.
   */
  getStationsLayerDefinition(): LayerSpecification {
    return buildStationsLayerDef();
  },

  /**
   * Liefert die Layer-Definition des Station-Count-Labels (nur zu Testzwecken exportiert,
   * analog getStationsLayerDefinition()).
   */
  getStationsCountLayerDefinition(): LayerSpecification {
    return buildStationsCountLayerDef();
  },


  computeGroupStatus(stations: NahStation[]): NahStationStatus {
    return stations
      .map(s => computeStationStatus(s))
      .sort((a, b) => (STATUS_PRIORITY[b] || 0) - (STATUS_PRIORITY[a] || 0))[0] || 'inactive';
  },

  /**
   * Rendert die NAH-Stationen als daten-getriebene Symbol-Layer (ersetzt den
   * früheren maplibregl.Marker-pro-Station-Ansatz).
   * Gruppiert Stationen bei identischen Koordinaten und aggregiert deren Status.
   */
  setStations(map: maplibregl.Map, stations: NahStation[]) {
    if (!map.getSource(STATIONS_SOURCE)) {
      this.initLayers(map);
    }

    // Group stations by coordinates
    const grouped = new Map<string, NahStation[]>();
    stations.forEach(station => {
      const key = `${station.lon},${station.lat}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(station);
    });

    // Create one feature per group
    const features: Feature<Point>[] = Array.from(grouped.values()).map(group => {
      const representative = group[0];
      const groupStatus = this.computeGroupStatus(group);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [representative.lon, representative.lat] },
        properties: {
          ...representative,
          status: groupStatus,
          _station_count: group.length,
          _all_stations: group
        }
      };
    });

    const data: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features
    };

    const source = map.getSource(STATIONS_SOURCE) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
    }

    MapRegistry.registerSource(STATIONS_SOURCE, {
      type: 'geojson',
      data: data
    });
  },

  /**
   * Ermittelt die von einem Kartenklick getroffene Station (falls vorhanden), zur
   * Nutzung im zentralen Klick-Handler der Seite (queryRenderedFeatures, analog zu
   * TrackingMapLayers.handleMapClick).
   */
  findClickedStation(map: maplibregl.Map, point: [number, number]): { station: NahStation & { status: NahStationStatus; _all_stations: NahStation[] | undefined }; coordinates: [number, number] } | null {
    const features = map.queryRenderedFeatures(point, { layers: [STATIONS_LAYER] });
    if (features.length === 0) return null;

    const feat = features[0];
    const coordinates = (feat.geometry as Point).coordinates as [number, number];
    const rawProps = feat.properties as NahStation & { status: NahStationStatus; _all_stations: NahStation[] | string };
    // MapLibre GL JS JSON-stringifies non-primitive GeoJSON feature properties
    // (z.B. Arrays) intern; months_active muss hier wieder in ein echtes Array
    // geparst werden, damit buildStationPopupHtml eine echte NahStation sieht.
    const station = {
      ...rawProps,
      months_active: typeof rawProps.months_active === 'string'
        ? JSON.parse(rawProps.months_active)
        : rawProps.months_active,
      _all_stations: typeof rawProps._all_stations === 'string'
        ? JSON.parse(rawProps._all_stations)
        : rawProps._all_stations
    };
    return {
      station,
      coordinates
    };
  },

  /**
   * Behandelt einen Kartenklick gegen die Stations-Layer: zeigt das Stations-Popup
   * und liefert true bei Treffer, sonst false (Aufrufer fällt dann auf sein eigenes
   * Klickverhalten zurück, z.B. NahPageControllers Incident-Berechnung).
   */
  handleStationClick(map: maplibregl.Map, e: maplibregl.MapMouseEvent): boolean {
    const hit = this.findClickedStation(map, [e.point.x, e.point.y]);
    if (!hit) {
      PopupManager.closePopup();
      return false;
    }

    const allStations = hit.station._all_stations;
    let popupHtml: string;

    if (allStations && allStations.length > 1) {
      popupHtml = buildMultiStationPopupHtml(allStations);
    } else {
      popupHtml = buildStationPopupHtml(hit.station);
    }

    PopupManager.showFeaturePopup(map, hit.coordinates, popupHtml);
    return true;
  },

  /**
   * Initializes the NAH-specific map layers and sources.
   */
  initLayers(map: maplibregl.Map) {
    MapRegistry.registerImage('oe5ith-markers', SPRITE_BASE);
    void ensureHeliIcon(map);

    // Einsatzort-Pin (ci-symbol-location, accent-Farbe, ohne Halo)
    const targetPinLayerDef = MapCore.createPinLayer(TARGET_PIN_LAYER, TARGET_PIN_SOURCE, {
      icon: 'ci-symbol-location',
      size: 0.75,
      anchor: 'center',
      color: MAP_COLORS.accent,
    });
    MapCore.ensureGeoJsonLayer(map, TARGET_PIN_SOURCE, targetPinLayerDef);

    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, buildStationsLayerDef());
    attachHoverCursor(map, [STATIONS_LAYER]);

    // Text-Label für Station-Count (nur sichtbar wenn > 1)
    MapCore.ensureGeoJsonLayer(map, STATIONS_SOURCE, buildStationsCountLayerDef());

    const sourceId = 'nah-lines';
    const layerId = 'nah-lines';

    const layerDef: LayerSpecification = {
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          MAP_ROUTE_STYLES.active.color,
          MAP_ROUTE_STYLES.background.color
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          MAP_ROUTE_STYLES.active.weight,
          MAP_ROUTE_STYLES.background.weight
        ],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          MAP_ROUTE_STYLES.active.opacity,
          MAP_ROUTE_STYLES.background.opacity
        ]
      }
    };

    MapCore.ensureGeoJsonLayer(map, sourceId, layerDef);
  },

  setTargetPin(map: maplibregl.Map, lng: number, lat: number) {
    MapCore.setPointSource(map, TARGET_PIN_SOURCE, [lng, lat]);
  },

  clearTargetPin(map: maplibregl.Map) {
    MapCore.setPointSource(map, TARGET_PIN_SOURCE, null);
  },

  /**
   * Updates flight path lines on the map.
   */
  updateFlightPaths(map: maplibregl.Map, incidentCoord: [number, number], results: NahStationResult[]) {
    const sourceId = 'nah-lines';
    
    // Self-healing check
    if (!map.getSource(sourceId)) {
      this.initLayers(map);
    }

    const [lng, lat] = incidentCoord;

    // Reset feature states für alle Features der Source (unabhängig von der Ergebnisanzahl)
    map.removeFeatureState({ source: sourceId });

    const lineFeatures: Feature<LineString>[] = results.map((s, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'LineString',
        coordinates: [[lng, lat], [s.lon, s.lat]]
      },
      properties: { osm_id: s.osm_id }
    }));

    const data: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: lineFeatures
    };

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (source) {
      source.setData(data);
    }

    // Persist in MapRegistry for style switches
    MapRegistry.registerSource(sourceId, {
      type: 'geojson',
      data: data
    });
  }
};
