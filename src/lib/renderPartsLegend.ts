import type { LegendScale } from './resolveLegendSwatch';

export type RenderColor = { mode: 'fixed'; value: string } | { mode: 'scale'; scale_id: string };

/** Ein Darstellungsteil aus `legend[].rows[].render` (geodata-plugin-standard §5.4, ab
 *  Schema-Version 3.0) — ein Eintrag pro echtem MapLibre-Style-Layer. */
export interface RenderPart {
  kind: 'fill' | 'line' | 'outline' | 'icon' | 'text' | 'circle';
  color: RenderColor | null;
  stroke_color: RenderColor | null;
  opacity: number | null;
  width: number | null;
  dasharray: [number, number] | null;
  radius: number | null;
  stroke_width: number | null;
  icon: string | null;
}

/** Eine Legend-Zeile aus `legend[].rows[]` — bereits vom Server fertig betitelt/gruppiert, im
 *  Gegensatz zum alten `variants[]`-Modell (bis v2.1) muss der Client hier nichts mehr aus
 *  `axis`/`label` zusammenbauen. */
export interface LegendRow {
  label: string;
  render: RenderPart[];
  style_layer_ids: string[];
}

/** Ein `legend[]`-Top-Level-Eintrag — kann Zeilen bündeln, deren `style_layer_ids` aus
 *  mehreren verschiedenen `groups[]`-Einträgen stammen (geodata-plugin-standard §5.4). */
export interface LegendHeading {
  heading: string;
  rows: LegendRow[];
}

export interface RenderPartsChip {
  parts: RenderPart[];
  /** Aufgelöste Farbe für diesen Chip, falls die Zeile durch eine Skala läuft — sonst `null`
   *  (die Parts tragen dann selbst nur fixe Farben). */
  itemColor: string | null;
}

export interface VisibleLegendRow {
  label: string;
  chips: RenderPartsChip[];
}

export interface VisibleLegendHeading {
  heading: string;
  rows: VisibleLegendRow[];
}

/** Erster Part mit `color.mode: "scale"` bestimmt, welche Skala diese Zeile antreibt. */
export function findDrivingScaleId(parts: RenderPart[]): string | null {
  for (const p of parts) {
    if (p.color?.mode === 'scale') return p.color.scale_id;
  }
  return null;
}

/**
 * Baut die Chip-Liste für eine `legend[].rows[]`-Zeile: referenziert ihr `render` eine Skala
 * (`color.mode: "scale"` an irgendeinem Part), entsteht ein Chip pro Skalen-Item; sonst genau
 * ein Chip mit den fixen Farben der Parts selbst.
 */
export function buildChipsForRow(render: RenderPart[], legendScalesById: Map<string, LegendScale>): RenderPartsChip[] {
  const scaleId = findDrivingScaleId(render);
  if (scaleId) {
    const scale = legendScalesById.get(scaleId);
    if (scale) {
      return scale.items.map(item => ({ parts: render, itemColor: item.color }));
    }
  }
  return [{ parts: render, itemColor: null }];
}

/**
 * Berechnet den sichtbaren Ausschnitt von `legend[]` aus der aktuellen Menge aktiver
 * MapLibre-Style-Layer-IDs (`OverlayLoader.getActiveLayerIds()`) — eine Zeile ist sichtbar,
 * sobald mindestens eine ihrer `style_layer_ids` aktiv ist (Union-Semantik, siehe
 * `docs/superpowers/specs/2026-08-22-legend-v3-groups-legend-split-design.md`). Headings ohne
 * sichtbare Zeile werden weggelassen. Pure Funktion (kein DOM) für Testbarkeit — wird bei
 * JEDEM Layer-Toggle neu aufgerufen (kein inkrementelles Fortschreiben), siehe `MapPage.ts`.
 */
export function resolveVisibleLegend(
  headings: LegendHeading[],
  activeStyleLayerIds: ReadonlySet<string>,
  legendScalesById: Map<string, LegendScale>
): VisibleLegendHeading[] {
  const result: VisibleLegendHeading[] = [];
  for (const h of headings) {
    const visibleRows = h.rows.filter(r => r.style_layer_ids.some(id => activeStyleLayerIds.has(id)));
    if (visibleRows.length === 0) continue;
    result.push({
      heading: h.heading,
      rows: visibleRows.map(r => ({ label: r.label, chips: buildChipsForRow(r.render, legendScalesById) })),
    });
  }
  return result;
}
