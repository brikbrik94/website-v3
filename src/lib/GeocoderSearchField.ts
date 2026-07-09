import { GeocoderService } from './GeocoderService';
import { renderGeocodeItemHtml } from './UIUtils';

export interface GeocoderSelection {
  lat: number;
  lon: number;
  displayName: string;
}

export interface GeocoderSearchFieldOptions {
  /** Bindet alle intern registrierten Listener an dieses Signal (Cleanup bei Seitenwechsel). */
  signal: AbortSignal;
  /** Unterdrückt die Suche für eine Eingabe, z.B. wenn sie bereits eine rohe "lat, lon"-Koordinate ist. */
  suppressWhen?: (query: string) => boolean;
  onSelect: (selection: GeocoderSelection) => void;
}

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 400;

/**
 * Kapselt Debounce/Fetch/Dropdown-Rendering/Outside-Click-Dismiss für ein bestehendes
 * Input+Ergebnis-Container-Paar. Rendert bewusst kein eigenes Markup (siehe Aufrufer für
 * Details) - unterschiedliche Konsumenten (Coords-Tabelle, Routing-Felder, Karte-Sidebar)
 * haben unterschiedliches umgebendes HTML/CSS-Klassen für das Input-Element selbst.
 */
export class GeocoderSearchField {
  constructor(
    private input: HTMLInputElement,
    private resultsContainer: HTMLElement,
    private options: GeocoderSearchFieldOptions
  ) {
    this.attach();
  }

  private attach(): void {
    let timeout: ReturnType<typeof setTimeout>;

    this.input.addEventListener('input', () => {
      clearTimeout(timeout);
      const query = this.input.value.trim();

      if (query.length < MIN_QUERY_LENGTH || this.options.suppressWhen?.(query)) {
        this.hide();
        return;
      }

      timeout = setTimeout(() => this.search(query), DEBOUNCE_MS);
    }, { signal: this.options.signal });

    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (!this.input.contains(target) && !this.resultsContainer.contains(target)) {
        this.hide();
      }
    }, { signal: this.options.signal });
  }

  private async search(query: string): Promise<void> {
    const results = await GeocoderService.search(query);
    if (this.options.signal.aborted) return;

    if (results.length === 0) {
      this.hide();
      return;
    }

    this.resultsContainer.innerHTML = results.map(r => renderGeocodeItemHtml(r)).join('');
    this.resultsContainer.classList.remove('hidden');

    this.resultsContainer.querySelectorAll('.geocoder-item').forEach(item => {
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const lat = parseFloat(item.getAttribute('data-lat')!);
        const lon = parseFloat(item.getAttribute('data-lon')!);
        const displayName = item.getAttribute('data-name')!;

        this.input.value = displayName;
        this.hide();
        this.options.onSelect({ lat, lon, displayName });
      }, { signal: this.options.signal });
    });
  }

  private hide(): void {
    this.resultsContainer.classList.add('hidden');
  }
}
