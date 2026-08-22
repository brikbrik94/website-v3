import { LegendEntry } from '../types/common';
import type { RenderPartsChip, RenderColor } from './renderPartsLegend';

export interface AddLegendEntryOptions extends LegendEntry {
  onRemove?: () => void;
}

export interface AddPartsRowOptions {
  id: string;
  label: string;
  chips: RenderPartsChip[];
}

/**
 * Steuert das Legende-Panel einer Kartenseite (`.map-legend`-DOM-Struktur aus `oe5ith-ci`).
 * Einträge (`dot`/`line`/`area`/`icon`/`line-cased`) werden rein clientseitig verwaltet — welche
 * Layer/Farben das sind, entscheidet der Aufrufer (z.B. per `resolveLegendSwatch()`), nicht diese
 * Klasse.
 */
export class MapLegend {
  private _el: HTMLElement;
  private _titleEl: HTMLElement;
  private _entriesEl: HTMLElement;
  private _entryNodes = new Map<string, HTMLElement>();

  constructor(selectorOrEl: string | HTMLElement) {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) throw new Error(`MapLegend: Element not found: ${selectorOrEl}`);
    this._el = el as HTMLElement;
    this._titleEl = this._el.querySelector('.map-legend-title') as HTMLElement;
    this._entriesEl = this._el.querySelector('.map-legend-entries') as HTMLElement;
    if (!this._titleEl || !this._entriesEl) {
      throw new Error('MapLegend: Required child elements (.map-legend-title, .map-legend-entries) missing');
    }
  }

  setTitle(text: string): void {
    this._titleEl.textContent = text;
    if (text) {
      this._titleEl.classList.remove('hidden');
    } else {
      this._titleEl.classList.add('hidden');
    }
  }

  addEntry(entry: AddLegendEntryOptions): void {
    // Erneutes addEntry mit bereits vorhandener id ersetzt den bestehenden Eintrag (idempotent).
    if (entry.id && this._entryNodes.has(entry.id)) {
      this.removeEntry(entry.id);
    }

    const div = document.createElement('div');
    div.className = 'map-legend-entry';

    if (entry.type === 'line-cased') {
      if (entry.color == null || entry.width == null || entry.outline_color == null || entry.outline_width == null) {
        throw new Error("MapLegend.addEntry: type 'line-cased' benötigt color, width, outline_color, outline_width");
      }
      div.appendChild(this._buildLineCased(entry.color, entry.width, entry.outline_color, entry.outline_width, entry.opacity));
    } else {
      const typeClass = { dot: 'map-legend-dot', line: 'map-legend-line', area: 'map-legend-area', icon: 'map-legend-icon' }[entry.type];

      if (entry.type === 'icon' && entry.icon) {
        const marker = document.createElement('i');
        marker.className = `${entry.icon} ${typeClass}`;
        if (entry.color) marker.style.color = entry.color;
        div.appendChild(marker);
      } else if (entry.type === 'icon' || entry.color === null) {
        const unknown = document.createElement('i');
        unknown.className = 'fa-solid fa-circle-question map-legend-unknown';
        unknown.title = 'Farbe nicht auflösbar';
        div.appendChild(unknown);
      } else {
        const marker = document.createElement('div');
        marker.className = typeClass;
        marker.style.background = entry.color;
        // Inline-Style überschreibt CI-Defaults (z.B. .map-legend-area's statische opacity: 0.8) —
        // spiegelt die echte Deckkraft der Kartendarstellung statt sie zu erfinden.
        if (entry.opacity !== undefined) marker.style.opacity = String(entry.opacity);

        if (entry.type === 'line' && entry.width != null) {
          marker.style.height = `${Math.max(1, Math.min(6, entry.width))}px`;
        }

        if (entry.type === 'line' && entry.dasharray != null) {
          if (entry.dasharray.length !== 2) {
            throw new Error('MapLegend.addEntry: dasharray muss genau 2 Werte [dash, gap] enthalten');
          }
          const [dash, gap] = entry.dasharray;
          const cycle = dash + gap;
          const scale = 8 / cycle;
          const dashPx = dash * scale;
          const gapPx = gap * scale;
          marker.style.background = 'transparent';
          marker.style.backgroundImage =
            `repeating-linear-gradient(to right, ${entry.color} 0 ${dashPx}px, transparent ${dashPx}px ${dashPx + gapPx}px)`;
        }

        if (entry.type === 'area' && (entry.outline_color != null || entry.outline_width != null)) {
          if (entry.outline_color == null || entry.outline_width == null) {
            throw new Error("MapLegend.addEntry: 'area' benötigt outline_color UND outline_width zusammen");
          }
          const w = Math.max(1, Math.min(3, entry.outline_width));
          marker.style.border = `${w}px solid ${entry.outline_color}`;
        }

        div.appendChild(marker);
      }
    }

    const label = document.createElement('span');
    label.className = 'map-legend-label';
    label.textContent = entry.label;
    div.appendChild(label);

    if (entry.onRemove) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'toast-close map-legend-remove';
      removeBtn.setAttribute('aria-label', `${entry.label} entfernen`);
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', entry.onRemove);
      div.appendChild(removeBtn);
    }

    this._entriesEl.appendChild(div);
    if (entry.id) this._entryNodes.set(entry.id, div);
  }

  private _buildLineCased(color: string, width: number, outline_color: string, outline_width: number, opacity?: number): HTMLElement {
    const oW = Math.max(2, Math.min(8, outline_width));
    let iW = Math.max(1, Math.min(6, width));
    if (iW >= oW) iW = Math.max(1, oW - 1);

    const wrapper = document.createElement('div');
    wrapper.className = 'map-legend-line-cased';
    wrapper.style.height = `${oW}px`;
    // Spiegelt dieselbe Deckkraft-Logik wie der dot/line/area-Zweig oben — line-cased hat einen
    // eigenen Wrapper statt eines einzelnen marker-Elements, braucht die Zuweisung daher hier.
    if (opacity !== undefined) wrapper.style.opacity = String(opacity);

    const outline = document.createElement('div');
    outline.className = 'map-legend-line-cased-outline';
    outline.style.height = `${oW}px`;
    outline.style.background = outline_color;

    const inner = document.createElement('div');
    inner.className = 'map-legend-line-cased-inner';
    inner.style.height = `${iW}px`;
    inner.style.background = color;

    wrapper.append(outline, inner);
    return wrapper;
  }

  /**
   * Zeile für eine `render`/`variants`-Gruppe (geodata-plugin-standard §5.3, ab Schema-Version
   * 2.0): ein Chip-Streifen statt eines einzelnen Swatches — pro `chips[]`-Eintrag ein SVG, das
   * dessen `parts` (Fläche/Linie/Umrandung/Kreis/Icon) übereinander zeichnet, mit den echten
   * `width`/`radius`/`stroke_width`-Werten und der MapLibre-`dasharray`-Semantik (Dash-Länge =
   * `dasharray`-Wert × `width`, siehe `_buildPartsChip()`). Lokales Pattern (`.map-legend-parts-*`),
   * noch nicht in `oe5ith-ci` generalisiert — analog `.map-legend-unknown`/`.map-legend-remove`.
   */
  addPartsRow(entry: AddPartsRowOptions): void {
    if (this._entryNodes.has(entry.id)) this.removeEntry(entry.id);

    const div = document.createElement('div');
    div.className = 'map-legend-entry map-legend-parts-row';

    const strip = document.createElement('div');
    strip.className = 'map-legend-parts-strip';
    entry.chips.forEach(chip => strip.appendChild(this._buildPartsChip(chip)));
    div.appendChild(strip);

    const label = document.createElement('span');
    label.className = 'map-legend-label';
    label.textContent = entry.label;
    div.appendChild(label);

    this._entriesEl.appendChild(div);
    this._entryNodes.set(entry.id, div);
  }

  /**
   * Rendert einen `legend[].heading`-Titel (geodata-plugin-standard §5.4, ab Schema-Version 3.0)
   * als linksbündige Überschrift über einem Zeilenblock — Renderer-Vertrag aus dem Standard.
   * Wiederverwendet die bestehende CI-Klasse `.overlay-section-label` (bereits in `Topbar.ts`
   * für "Basemap" genutzt) statt eine neue lokale CSS-Klasse zu erfinden.
   */
  addHeading(id: string, text: string): void {
    if (this._entryNodes.has(id)) this.removeEntry(id);

    const div = document.createElement('div');
    div.className = 'overlay-section-label';
    div.textContent = text;

    this._entriesEl.appendChild(div);
    this._entryNodes.set(id, div);
  }

  private _resolvePartColor(color: RenderColor | null, itemColor: string | null): string | null {
    if (!color) return null;
    return color.mode === 'fixed' ? color.value : itemColor;
  }

  private _buildPartsChip(chip: RenderPartsChip): SVGSVGElement {
    // Das Legende-Panel ist fest max-width: var(--sidebar-width) = 300px (12-14px Padding) —
    // Chip-Maße bewusst klein genug, dass ein 6er-Streifen (nach Serverseitiger Farbreduktion
    // der übliche Fall) ohne Umbruch hineinpasst, statt der breiten Standalone-Artifact-Maße.
    const SW = 34, SH = 16, CY = 8, X0 = 3, X1 = 31;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
    svg.setAttribute('class', 'map-legend-parts-chip');
    svg.setAttribute('width', String(SW));
    svg.setAttribute('height', String(SH));
    svg.setAttribute('viewBox', `0 0 ${SW} ${SH}`);

    const svgChild = (tag: string, attrs: Record<string, string | number>) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const k in attrs) el.setAttribute(k, String(attrs[k]));
      return el;
    };

    for (const part of chip.parts) {
      if (part.kind === 'text') continue;
      const color = this._resolvePartColor(part.color, chip.itemColor);
      const strokeColor = this._resolvePartColor(part.stroke_color, chip.itemColor);
      const opacity = part.opacity ?? 1;

      switch (part.kind) {
        case 'fill':
          svg.appendChild(svgChild('rect', {
            x: X0 + 1, y: CY - 6, width: (X1 - X0) - 2, height: 12, rx: 3,
            fill: color ?? 'var(--null-bg, #999)', 'fill-opacity': opacity,
          }));
          break;
        case 'line':
        case 'outline': {
          // Gleiche Clamp-Idee wie die bestehenden type:'line'/'line-cased'-Zweige oben (1-6px
          // bzw. 2-8px) — auf die kleinere Chip-Höhe abgestimmt, damit Umrandung sichtbar breiter
          // bleibt als die Linie darüber, aber beide in den 16px-Chip passen.
          const isOutline = part.kind === 'outline';
          const w = Math.max(1, Math.min(part.width ?? (isOutline ? 5 : 2), isOutline ? 5 : 4));
          const attrs: Record<string, string | number> = {
            x1: X0, y1: CY, x2: X1, y2: CY,
            stroke: color ?? 'var(--null-bg, #999)', 'stroke-width': w,
            'stroke-opacity': opacity, 'stroke-linecap': 'butt',
          };
          // MapLibre-Semantik (line-dasharray): die Werte sind in Vielfachen der Linienbreite
          // angegeben, nicht in Pixeln — reale Pixel-Länge = dasharray-Wert * (geclampte) width,
          // damit das Muster zur tatsächlich gezeichneten Strichstärke proportional bleibt.
          if (part.dasharray) attrs['stroke-dasharray'] = `${part.dasharray[0] * w} ${part.dasharray[1] * w}`;
          svg.appendChild(svgChild('line', attrs));
          break;
        }
        case 'circle': {
          const r = Math.max(2, Math.min(part.radius ?? 5, 7));
          svg.appendChild(svgChild('circle', {
            cx: SW / 2, cy: CY, r,
            fill: color ?? 'var(--null-bg, #999)', 'fill-opacity': opacity,
            stroke: strokeColor ?? 'var(--line-strong, #999)', 'stroke-width': part.stroke_width ?? 1,
          }));
          break;
        }
        case 'icon': {
          svg.appendChild(svgChild('circle', { cx: SW / 2, cy: CY, r: 6, fill: 'var(--null-bg, #999)' }));
          const t = svgChild('text', { x: SW / 2, y: CY + 3, 'text-anchor': 'middle', 'font-size': 8, fill: color ?? 'var(--null-ink, #666)' });
          t.textContent = color ? '◆' : '?';
          svg.appendChild(t);
          break;
        }
      }
    }
    return svg;
  }

  removeEntry(id: string): void {
    const node = this._entryNodes.get(id);
    if (node) {
      node.remove();
      this._entryNodes.delete(id);
    }
  }

  clearEntries(): void {
    this._entriesEl.innerHTML = '';
    this._entryNodes.clear();
  }

  show(): void { this._el.classList.remove('hidden'); }
  hide(): void { this._el.classList.add('hidden'); }
  toggle(): void { this._el.classList.toggle('hidden'); }
  isVisible(): boolean { return !this._el.classList.contains('hidden'); }

  destroy(): void {
    this._el.remove();
  }
}
