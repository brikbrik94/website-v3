import { LegendEntry } from '../types/common';

export class MapLegend {
  private _el: HTMLElement;
  private _titleEl: HTMLElement;
  private _entriesEl: HTMLElement;

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

  addEntry(entry: LegendEntry): void {
    const div = document.createElement('div');
    div.className = 'map-legend-entry';

    const typeClass = { dot: 'map-legend-dot', line: 'map-legend-line', area: 'map-legend-area' }[entry.type];
    const marker = document.createElement('div');
    marker.className = typeClass;
    marker.style.background = entry.color;

    const label = document.createElement('span');
    label.className = 'map-legend-label';
    label.textContent = entry.label;

    div.appendChild(marker);
    div.appendChild(label);
    this._entriesEl.appendChild(div);
  }

  clearEntries(): void {
    this._entriesEl.innerHTML = '';
  }

  show(): void { this._el.classList.remove('hidden'); }
  hide(): void { this._el.classList.add('hidden'); }
  toggle(): void { this._el.classList.toggle('hidden'); }
  isVisible(): boolean { return !this._el.classList.contains('hidden'); }

  destroy(): void {
    this._el.remove();
  }
}
