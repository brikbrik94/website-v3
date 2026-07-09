import type { LayerSpecification } from 'maplibre-gl';

export type SwatchType = 'dot' | 'line' | 'area';

export interface LegendSwatch {
  type: SwatchType;
  color: string | null;
}

/**
 * Löst die Legenden-Swatch-Farbe eines MapLibre-Layers auf — deckt nur die im Projekt
 * tatsächlich vorkommenden Muster ab (Literal-Farbe, `match`-Expression-Fallback), keine
 * vollständige Style-Spec-Expression-Engine (siehe docs/superpowers/specs/2026-07-09-
 * map-legend-interactive-design.md, Entscheidung 5).
 */
export function resolveLegendSwatch(layer: LayerSpecification): LegendSwatch | null {
  let type: SwatchType;
  let raw: unknown;

  switch (layer.type) {
    case 'line':
      type = 'line';
      raw = layer.paint?.['line-color'];
      break;
    case 'fill':
      type = 'area';
      raw = layer.paint?.['fill-color'];
      break;
    case 'fill-extrusion':
      type = 'area';
      raw = layer.paint?.['fill-extrusion-color'];
      break;
    case 'circle':
      type = 'dot';
      raw = layer.paint?.['circle-color'];
      break;
    case 'symbol':
      type = 'dot';
      raw = layer.paint?.['icon-color'];
      break;
    default:
      return null;
  }

  if (typeof raw === 'string') {
    return { type, color: raw };
  }

  // Fallback-Arm einer match-Expression ist laut MapLibre-Style-Spec verpflichtend und immer
  // der letzte Array-Eintrag: ['match', input, label1, output1, ..., fallback].
  if (Array.isArray(raw) && raw[0] === 'match') {
    const fallback = raw[raw.length - 1];
    if (typeof fallback === 'string') {
      return { type, color: fallback };
    }
  }

  console.warn('[resolveLegendSwatch] Farbe nicht auflösbar für Layer', layer.id);
  return { type, color: null };
}

const SWATCH_TYPE_BY_LAYER_TYPE: Record<string, SwatchType> = {
  line: 'line',
  fill: 'area',
  'fill-extrusion': 'area',
  circle: 'dot',
  symbol: 'dot',
};

/**
 * Wie resolveLegendSwatch()'s Typ-Ableitung, aber nur anhand des Layer-Typ-Strings (z.B. aus
 * layers.json-Metadata, wo keine echte LayerSpecification mit paint verfügbar ist) — für Fälle,
 * in denen der Swatch-Typ unabhängig von der Farbauflösung gebraucht wird.
 */
export function swatchTypeForLayerType(layerType: string): SwatchType | null {
  return SWATCH_TYPE_BY_LAYER_TYPE[layerType] ?? null;
}
