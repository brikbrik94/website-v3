import { LegendEntry } from '../types/common';
import type { RenderPartsChip, RenderColor } from './renderPartsLegend';
import { resolveLegendIcon } from './LegendIconSprite';

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
  private _partsRowIds = new Set<string>();

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
   * 2.0): ein Chip-Streifen statt eines einzelnen Swatches — pro `chips[]`-Eintrag ein kleiner
   * Div-Chip, der dessen `parts` (Fläche/Linie/Umrandung/Kreis/Icon) als gestapelte, absolut
   * positionierte Divs zeichnet (analog `.map-legend-line-cased` oben — kein SVG, siehe
   * `_buildPartsChip()`-Kommentar dort zur Begründung), mit den echten `width`/`radius`/
   * `stroke_width`-Werten und der MapLibre-`dasharray`-Semantik (Dash-Länge = `dasharray`-Wert ×
   * `width`). Lokales Pattern (`.map-legend-parts-*`), noch nicht in `oe5ith-ci` generalisiert —
   * analog `.map-legend-unknown`/`.map-legend-remove`. Schaltet `.map-legend--wide`
   * (`oe5ith-ci` v1.27.0, `--legend-width-wide`) auf dem Panel scharf, solange mindestens eine
   * Parts-Row aktiv ist — löst den früheren lokalen 116px-Streifen-Workaround ab (oe5ith-ci#4).
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
    this._partsRowIds.add(entry.id);
    this._updateWideMode();
  }

  private _updateWideMode(): void {
    this._el.classList.toggle('map-legend--wide', this._partsRowIds.size > 0);
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

  /**
   * Baut einen Chip als gestapelte, absolut positionierte Divs statt SVG — ursprünglich war das
   * SVG (siehe `docs/superpowers/specs/2026-08-16-legend-render-parts-design.md`), aber der
   * einzige echte Grund dafür war ein Formelfehler im allerersten CSS-Versuch (Dash-Zyklus fix
   * auf 8px normiert statt der realen MapLibre-Formel), nicht eine grundsätzliche CSS-Grenze.
   * Mit der korrekten Formel (siehe unten) deckt reines CSS alle in den Live-Daten vorkommenden
   * `kind`-Werte ab: `line`/`outline` als Box mit fester Höhe (bzw. `repeating-linear-gradient`
   * für `dasharray`, analog dem `type:'line'`-Zweig in `addEntry()` oben), `circle` als
   * `border-radius:50%`-Box mit Rand (analog `_buildLineCased()`), `fill` als abgerundete Box.
   * Nebeneffekt: eine Box mit ganzzahliger `top`/`height` ist immer pixelscharf — anders als ein
   * SVG-`<line>`-Stroke, der bei ungerader `stroke-width` um eine ganzzahlige Mittelachse zentriert
   * unscharfe, halbpixelige Kanten bekommt (das war der eigentliche Unschärfe-Bug hier).
   */
  private _buildPartsChip(chip: RenderPartsChip): HTMLDivElement {
    // Das Legende-Panel ist fest max-width: var(--sidebar-width) = 300px (12-14px Padding) —
    // Chip-Maße bewusst klein genug, dass ein 6er-Streifen (nach Serverseitiger Farbreduktion
    // der übliche Fall) ohne Umbruch hineinpasst, statt der breiten Standalone-Artifact-Maße.
    const SW = 34, SH = 16, CY = 8, X0 = 3, X1 = 31;
    const chipEl = document.createElement('div');
    chipEl.className = 'map-legend-parts-chip';
    chipEl.style.width = `${SW}px`;
    chipEl.style.height = `${SH}px`;

    for (const part of chip.parts) {
      if (part.kind === 'text') continue;
      const color = this._resolvePartColor(part.color, chip.itemColor);
      const strokeColor = this._resolvePartColor(part.stroke_color, chip.itemColor);
      const opacity = part.opacity ?? 1;

      switch (part.kind) {
        case 'fill': {
          const el = document.createElement('div');
          el.className = 'map-legend-parts-chip-fill';
          el.style.background = color ?? 'var(--null-bg, #999)';
          el.style.opacity = String(opacity);
          chipEl.appendChild(el);
          break;
        }
        case 'line':
        case 'outline': {
          // Gleiche Clamp-Idee wie die bestehenden type:'line'/'line-cased'-Zweige oben (1-6px
          // bzw. 2-8px) — auf die kleinere Chip-Höhe abgestimmt, damit Umrandung sichtbar breiter
          // bleibt als die Linie darüber, aber beide in den 16px-Chip passen. Auf eine ganze Zahl
          // gerundet, damit `top`/`height` als Box-Kanten immer auf der Pixelgrenze liegen.
          const isOutline = part.kind === 'outline';
          const w = Math.round(Math.max(1, Math.min(part.width ?? (isOutline ? 5 : 2), isOutline ? 5 : 4)));
          const el = document.createElement('div');
          el.className = 'map-legend-parts-chip-line';
          el.style.left = `${X0}px`;
          el.style.width = `${X1 - X0}px`;
          el.style.top = `${CY - Math.round(w / 2)}px`;
          el.style.height = `${w}px`;
          el.style.opacity = String(opacity);
          const c = color ?? 'var(--null-bg, #999)';
          if (part.dasharray) {
            // MapLibre-Semantik (line-dasharray): die Werte sind in Vielfachen der Linienbreite
            // angegeben, nicht in Pixeln — reale Pixel-Länge = dasharray-Wert * (gerundete) width,
            // damit das Muster zur tatsächlich gezeichneten Strichstärke proportional bleibt
            // (dieselbe Formel wie zuvor im SVG, nur jetzt als Gradient-Stop statt stroke-dasharray).
            const dashPx = part.dasharray[0] * w;
            const gapPx = part.dasharray[1] * w;
            el.style.backgroundColor = 'transparent';
            el.style.backgroundImage = `repeating-linear-gradient(to right, ${c} 0px ${dashPx}px, transparent ${dashPx}px ${dashPx + gapPx}px)`;
          } else {
            el.style.backgroundColor = c;
          }
          chipEl.appendChild(el);
          break;
        }
        case 'circle': {
          const r = Math.round(Math.max(2, Math.min(part.radius ?? 5, 7)));
          const sw = Math.round(part.stroke_width ?? 1);
          const el = document.createElement('div');
          el.className = 'map-legend-parts-chip-circle';
          el.style.left = `${SW / 2 - r}px`;
          el.style.top = `${CY - r}px`;
          el.style.width = `${r * 2}px`;
          el.style.height = `${r * 2}px`;
          el.style.background = color ?? 'var(--null-bg, #999)';
          el.style.opacity = String(opacity);
          el.style.borderWidth = `${sw}px`;
          el.style.borderColor = strokeColor ?? 'var(--line-strong, #999)';
          chipEl.appendChild(el);
          break;
        }
        case 'icon': {
          const el = document.createElement('div');
          el.className = 'map-legend-parts-chip-icon';
          el.style.color = color ?? 'var(--null-ink, #666)';
          el.textContent = color ? '◆' : '?';
          chipEl.appendChild(el);

          if (part.icon) {
            // Fire-and-forget: das Sprite lädt asynchron aus dem gemeinsamen Marker-Spriteset
            // (siehe LegendIconSprite.ts) und ersetzt bei Erfolg den Platzhalter. `_buildPartsChip`
            // bleibt dadurch synchron — kein Ripple-Effekt auf addPartsRow()/_syncV3Legend()
            // (siehe deren JSDoc: Legende wird bei JEDEM Layer-Toggle komplett neu aufgebaut).
            resolveLegendIcon(part.icon).then((dataUrl) => {
              // Bei schnellem Toggle-Off/On kann das Chip-Element schon wieder aus dem DOM
              // entfernt sein, bevor das Sprite geladen ist — dann nicht mehr in ein
              // verwaistes Element schreiben.
              if (!dataUrl || !el.isConnected) return;
              el.style.backgroundColor = 'transparent';
              el.style.backgroundImage = `url(${dataUrl})`;
              el.style.backgroundSize = 'contain';
              el.style.backgroundPosition = 'center';
              el.style.backgroundRepeat = 'no-repeat';
              el.textContent = '';
            });
          }
          break;
        }
      }
    }
    return chipEl;
  }

  removeEntry(id: string): void {
    const node = this._entryNodes.get(id);
    if (node) {
      node.remove();
      this._entryNodes.delete(id);
      if (this._partsRowIds.delete(id)) this._updateWideMode();
    }
  }

  clearEntries(): void {
    this._entriesEl.innerHTML = '';
    this._entryNodes.clear();
    this._partsRowIds.clear();
    this._updateWideMode();
  }

  show(): void { this._el.classList.remove('hidden'); }
  hide(): void { this._el.classList.add('hidden'); }
  toggle(): void { this._el.classList.toggle('hidden'); }
  isVisible(): boolean { return !this._el.classList.contains('hidden'); }

  destroy(): void {
    this._el.remove();
  }
}
