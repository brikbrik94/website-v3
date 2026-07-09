import type { LayerSpecification } from 'maplibre-gl';

export type SwatchType = 'dot' | 'line' | 'area';

export interface LegendSwatch {
  type: SwatchType;
  color: string | null;
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
 * Löst die Legenden-Swatch-Farbe eines MapLibre-Layers auf — deckt nur die im Projekt
 * tatsächlich vorkommenden Muster ab (Literal-Farbe, `match`-/`case`-Expression-Fallback,
 * ggf. verschachtelt), keine vollständige Style-Spec-Expression-Engine (siehe
 * docs/superpowers/specs/2026-07-09-map-legend-interactive-design.md, Entscheidung 5).
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
      // Reine Text-Label-Layer (z.B. OpenSkiMap "ski-labels") haben kein Icon, nur text-color.
      type = 'dot';
      raw = layer.paint?.['icon-color'] ?? layer.paint?.['text-color'];
      break;
    default:
      return null;
  }

  const color = extractLiteralColor(raw);
  if (color !== null) {
    return { type, color };
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
