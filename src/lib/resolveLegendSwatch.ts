import type { LayerSpecification } from 'maplibre-gl';
import { isLegendSchemaAtLeast } from './legendSchemaVersion';

export type SwatchType = 'dot' | 'line' | 'area' | 'icon' | 'line-cased';

export interface LegendSwatch {
  type: SwatchType;
  color: string | null;
  /** FontAwesome-Klasse, nur bei type: 'icon' relevant. layers.json liefert nur einen
   *  Tile-Server-Sprite-Namen (z.B. "aerialway-station-11"), kein echtes Sprite-Rendering in
   *  der Legende — dieses Feld trägt stattdessen einen generischen Fallback-Marker (siehe
   *  resolveSwatchFromLayersMetaColor()). */
  icon?: string;
  /** type:'line' (Höhe, geclampt 1-6px in MapLegend.ts) | type:'line-cased' (Pflicht, Innenbreite) */
  width?: number;
  /** type:'line' — [Strich, Lücke], proportional auf 8px-Zyklus skaliert in MapLegend.ts */
  dasharray?: [number, number];
  /** type:'area' (mit outline_width) | type:'line-cased' (Pflicht) */
  outline_color?: string;
  /** type:'area' (geclampt 1-3px) | type:'line-cased' (Pflicht, geclampt 2-8px) */
  outline_width?: number;
}

// Fallback-Arm von match/case ist laut MapLibre-Style-Spec verpflichtend und immer der letzte
// Array-Eintrag (['match', input, label1, output1, ..., fallback] bzw.
// ['case', cond1, out1, ..., fallback]). Rekursiv, weil reale Styles (z.B. OpenSkiMap) den
// Fallback-Arm einer case-Expression wieder mit einer verschachtelten match-Expression befüllen.
function extractLiteralColor(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && (value[0] === 'match' || value[0] === 'case')) {
    return extractLiteralColor(value[value.length - 1]);
  }
  return null;
}

/**
 * Ordnet einem Layer-Typ die Swatch-Art und die relevante Paint-Property zu — gemeinsame
 * Grundlage für resolveLegendSwatch() (ein Swatch pro Layer) und resolveLegendSwatchBranches()
 * (mehrere Swatches pro Layer, siehe unten).
 */
function paintExpressionForLayer(layer: LayerSpecification): { type: SwatchType; raw: unknown } | null {
  switch (layer.type) {
    case 'line':
      return { type: 'line', raw: layer.paint?.['line-color'] };
    case 'fill':
      return { type: 'area', raw: layer.paint?.['fill-color'] };
    case 'fill-extrusion':
      return { type: 'area', raw: layer.paint?.['fill-extrusion-color'] };
    case 'circle':
      return { type: 'dot', raw: layer.paint?.['circle-color'] };
    case 'symbol':
      // Reine Text-Label-Layer (z.B. OpenSkiMap "ski-labels") haben kein Icon, nur text-color.
      return { type: 'dot', raw: layer.paint?.['icon-color'] ?? layer.paint?.['text-color'] };
    default:
      return null;
  }
}

/**
 * Löst die Legenden-Swatch-Farbe eines MapLibre-Layers auf — deckt nur die im Projekt
 * tatsächlich vorkommenden Muster ab (Literal-Farbe, `match`-/`case`-Expression-Fallback,
 * ggf. verschachtelt), keine vollständige Style-Spec-Expression-Engine (siehe
 * docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md, Entscheidung 5).
 */
export function resolveLegendSwatch(layer: LayerSpecification): LegendSwatch | null {
  const resolved = paintExpressionForLayer(layer);
  if (!resolved) return null;
  const { type, raw } = resolved;

  const color = extractLiteralColor(raw);
  if (color !== null) {
    return { type, color };
  }

  console.warn('[resolveLegendSwatch] Farbe nicht auflösbar für Layer', layer.id);
  return { type, color: null };
}

export interface LegendSwatchBranch extends LegendSwatch {
  label: string;
}

/**
 * Wie resolveLegendSwatch(), aber statt nur den Fallback-Arm einer `match`-Expression zu lesen,
 * werden alle Branches ausgelesen und über `labelsByMatchValue` auf Legenden-Labels gemappt — für
 * Layer, bei denen mehrere match-Werte je eine eigene Legenden-Zeile ergeben sollen (z.B.
 * NAH-Stationsstatus `active`/`inactive`/`offseason`, siehe `NahMapLayers.getStationsLayerDefinition()`).
 * Deckt nur `match`-Expressions mit einzelnen String-Labels ab (keine `case`-Expressions, keine
 * Array-Label-Gruppen) — das reicht für die im Projekt tatsächlich vorkommenden Fälle. Branches
 * ohne Eintrag in `labelsByMatchValue` werden übersprungen (mit `console.warn`).
 */
export function resolveLegendSwatchBranches(
  layer: LayerSpecification,
  labelsByMatchValue: Record<string, string>
): LegendSwatchBranch[] | null {
  const resolved = paintExpressionForLayer(layer);
  if (!resolved) return null;
  const { type, raw } = resolved;

  if (!Array.isArray(raw) || raw[0] !== 'match') return null;

  const branches: LegendSwatchBranch[] = [];
  for (let i = 2; i + 1 < raw.length; i += 2) {
    const matchValue = raw[i];
    const color = raw[i + 1];
    if (typeof matchValue !== 'string' || typeof color !== 'string') continue;

    const label = labelsByMatchValue[matchValue];
    if (!label) {
      console.warn('[resolveLegendSwatchBranches] Kein Label für match-Wert', matchValue, 'auf Layer', layer.id);
      continue;
    }
    branches.push({ type, color, label });
  }

  return branches.length > 0 ? branches : null;
}

const SWATCH_TYPE_BY_LAYER_TYPE: Record<string, SwatchType> = {
  line: 'line',
  fill: 'area',
  'fill-extrusion': 'area',
  circle: 'dot',
  symbol: 'dot',
  icon: 'icon',
};

/**
 * Wie resolveLegendSwatch()'s Typ-Ableitung, aber nur anhand des Layer-Typ-Strings (z.B. aus
 * layers.json-Metadata, wo keine echte LayerSpecification mit paint verfügbar ist) — für Fälle,
 * in denen der Swatch-Typ unabhängig von der Farbauflösung gebraucht wird.
 */
export function swatchTypeForLayerType(layerType: string): SwatchType | null {
  return SWATCH_TYPE_BY_LAYER_TYPE[layerType] ?? null;
}

// layers.json's `icon`-Feld ist nur ein Tile-Server-Sprite-Name (z.B. "aerialway-station-11"),
// kein für die Legende renderbares Bild — generischer Fallback-Marker statt echtem
// Sprite-Rendering (siehe docs/superpowers/specs/2026-08-12-legend-v1.1-fields-design.md).
// Gleiche Klasse wie der bestehende generische Marker in CoordsPage.ts/HealthModule.ts.
const GENERIC_ICON_SWATCH_CLASS = 'fa-solid fa-location-dot';

/**
 * Wie resolveLegendSwatch(), aber für layers.json-Metadata (LayerMetaGroup), wo `type`/`color`
 * bereits direkt mitgeliefert werden statt aus einer echten LayerSpecification mit `paint`
 * extrahiert werden zu müssen (siehe docs/superpowers/specs/2026-07-12-map-legend-granularity-design.md).
 *
 * Entscheidet für `type: 'line'`-Gruppen zwischen `line-cased` (nur wenn ALLE 4 Felder — color,
 * width, outline_color, outline_width — auflösbar sind) und plain `line` (Fallback, verwirft
 * dabei outline_*, statt Daten zu erfinden — siehe
 * docs/superpowers/specs/2026-08-12-legend-line-cased-outline-fields-design.md). Für
 * `type: 'area'`-Gruppen wird outline_color/outline_width nur übernommen, wenn BEIDE gesetzt
 * sind (ein einzelnes Feld wird verworfen, sonst würde MapLegend.addEntry() werfen).
 */
export function resolveSwatchFromLayersMetaColor(
  type: string | undefined,
  color: unknown,
  width?: number | null,
  dasharray?: [number, number] | null,
  outline_color?: string | null,
  outline_width?: number | null
): LegendSwatch | null {
  const swatchType = swatchTypeForLayerType(type ?? '');
  if (!swatchType) return null;
  const resolvedColor = extractLiteralColor(color);

  if (swatchType === 'line') {
    if (outline_color != null && outline_width != null && resolvedColor !== null && width != null) {
      return { type: 'line-cased', color: resolvedColor, width, outline_color, outline_width };
    }
    const resolved: LegendSwatch = { type: 'line', color: resolvedColor };
    if (width != null) resolved.width = width;
    if (dasharray != null) resolved.dasharray = dasharray;
    return resolved;
  }

  if (swatchType === 'area') {
    const resolved: LegendSwatch = { type: 'area', color: resolvedColor };
    if (outline_color != null && outline_width != null) {
      resolved.outline_color = outline_color;
      resolved.outline_width = outline_width;
    }
    return resolved;
  }

  const resolved: LegendSwatch = { type: swatchType, color: resolvedColor };
  if (swatchType === 'icon') resolved.icon = GENERIC_ICON_SWATCH_CLASS;
  return resolved;
}

/**
 * Dedup-Schlüssel für mehrere Gruppen desselben Overlays, die denselben Swatch ergeben (z.B. jede
 * Autobahn einzeln in `autobahnen`, alle mit identischem `color`/`type`) — damit sie in der
 * Legende zu einer Zeile zusammenfallen statt eine Zeile pro Instanz zu erzeugen. Bewusst
 * `overlayId` UND `template` UND `color` im Schlüssel: reines Dedup nach `template`+`color` würde
 * z.B. `gemeinden` und `bezirke` (unterschiedliche Overlays, zufällig identische Randfarbe) fälschlich
 * zu einer Zeile zusammenfassen; reines Dedup nach `overlayId`+`template` würde `leitstellen-bereiche`
 * (ein Overlay, ein Template, aber 5 echte verschiedene Zonenfarben) fälschlich auf eine Zeile
 * reduzieren (siehe docs/geodata/open-items.md für die Live-Daten-Belege beider Fälle).
 */
export function computeSwatchDedupKey(overlayId: string, template: string, swatch: LegendSwatch): string {
  const dasharrayKey = swatch.dasharray ? swatch.dasharray.join(',') : 'null';
  return `${overlayId}:${template}:${swatch.type}:${swatch.color ?? 'null'}:${swatch.width ?? 'null'}:${dasharrayKey}:${swatch.outline_color ?? 'null'}:${swatch.outline_width ?? 'null'}`;
}

/** Entspricht `legend_scales[]` (geodata-plugin-standard §5.7, ab Schema-Version 3.0; hieß bis
 *  v2.1.0 `legend_sections` — umbenannt zur Vermeidung der Namenskollision mit dem neuen
 *  `legend`-Block, Inhalt/Form unverändert). */
export interface LegendScale {
  id: string;
  label: string;
  items: { label: string; color: string }[];
}

interface LegendItemsSource {
  legend_scale_id?: string | null;
  legend_items?: { label: string; color: string }[] | null;
}

export interface ResolvedLegendItems {
  items: { label: string; color: string }[];
  groupKey: string;
}

/**
 * Löst die Legenden-Einträge einer layers.json-Gruppe auf: entweder aus einer geteilten
 * Farbskala (`legend_scale_id` + `legend_sections`, ab Schema-Version 1.1, siehe
 * geodata-plugin-standard §5.5/5.6) oder aus den klassischen Pro-Gruppe `legend_items`. Pure
 * Funktion (kein DOM/fetch) für Testbarkeit — der Swatch-Typ pro Item wird bewusst NICHT hier
 * gesetzt (hängt von metaGroup.type/layerType ab, die dieser Funktion unbekannt sind); der
 * Aufrufer (Sidebar.ts) mappt das Ergebnis danach.
 */
export function resolveLegendItemsForGroup(
  metaGroup: LegendItemsSource,
  overlayId: string,
  styleVersion: string | null | undefined,
  legendScalesById: Map<string, LegendScale>
): ResolvedLegendItems | null {
  if (metaGroup.legend_scale_id) {
    if (isLegendSchemaAtLeast(styleVersion, 1, 1)) {
      const section = legendScalesById.get(metaGroup.legend_scale_id);
      if (section) {
        return { items: section.items, groupKey: `scale:${section.id}` };
      }
      console.warn('[resolveLegendItemsForGroup] legend_scale_id ohne passenden legend_scales-Eintrag:', metaGroup.legend_scale_id);
    } else {
      console.warn('[resolveLegendItemsForGroup] legend_scale_id gesetzt, aber version-Gate (>=1.1) nicht erfüllt:', styleVersion);
    }
  }

  if (metaGroup.legend_items && metaGroup.legend_items.length > 0) {
    return { items: metaGroup.legend_items, groupKey: overlayId };
  }

  return null;
}
