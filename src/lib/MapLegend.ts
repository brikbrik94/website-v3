import { LegendEntry } from '../types/common';

export interface AddLegendEntryOptions extends LegendEntry {
  onRemove?: () => void;
}

/**
 * Steuert das Legende-Panel einer Kartenseite (`.map-legend`-DOM-Struktur aus `oe5ith-ci`).
 * Einträge (`dot`/`line`/`area`/`icon`) werden rein clientseitig verwaltet — welche Layer/Farben
 * das sind, entscheidet der Aufrufer (z.B. per `resolveLegendSwatch()`), nicht diese Klasse.
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
      div.appendChild(marker);
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
