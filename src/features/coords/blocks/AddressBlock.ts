import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';
import { GeocoderService } from '../../../lib/GeocoderService';
import { renderGeocodeItemHtml } from '../../../lib/UIUtils';

export class AddressBlock extends CoordSystemBlock {
  private geocodeTimeout: any;

  public render(): string {
    return `
      <div class="coord-block active" data-system="address">
        <div class="coord-block-header">
          <span class="coord-block-title">Adresse</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="coord-header-status" id="address-status" style="font-size: 0.65rem; color: var(--subtle); font-weight: 500;"></div>
            <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
          </div>
        </div>
        <div class="coord-row" style="position: relative;">
          <input class="coord-input-full" type="text" data-field="address" placeholder="Adresse suchen..." autocomplete="off">
          <div id="geocoder-results" class="geocoder-results" style="display: none; position: absolute; top: 100%; left: 0; right: 0; z-index: var(--z-dropdown);"></div>
        </div>
      </div>
    `;
  }

  protected attachEvents(): void {
    super.attachEvents();
    if (!this.element) return;

    const input = this.element.querySelector('[data-field="address"]') as HTMLInputElement;
    const resultsContainer = this.element.querySelector('#geocoder-results') as HTMLElement;

    input.addEventListener('input', () => {
      const query = input.value.trim();
      clearTimeout(this.geocodeTimeout);

      if (query.length < 3) {
        resultsContainer.style.display = 'none';
        return;
      }

      this.geocodeTimeout = setTimeout(async () => {
        const results = await GeocoderService.search(query);
        if (results.length > 0) {
          resultsContainer.innerHTML = results.map(r => renderGeocodeItemHtml(r)).join('');
          resultsContainer.style.display = 'block';
          resultsContainer.querySelectorAll('.geocoder-item').forEach(item => {
            item.addEventListener('click', (ev) => {
              ev.stopPropagation();
              const lat = parseFloat(item.getAttribute('data-lat')!);
              const lon = parseFloat(item.getAttribute('data-lon')!);
              this.updateField('address', item.getAttribute('data-name')!);
              resultsContainer.style.display = 'none';
              this.service.setWgs(lat, lon);
            });
          });
        } else {
          resultsContainer.style.display = 'none';
        }
      }, 400);
    });

    document.addEventListener('click', (e) => {
      if (resultsContainer && !resultsContainer.contains(e.target as Node)) {
        resultsContainer.style.display = 'none';
      }
    });
  }

  public update(state: CoordsState): void {
    const addrStatus = this.element?.querySelector('#address-status');
    if (addrStatus) addrStatus.textContent = 'Suche...';

    GeocoderService.reverse(state.lat, state.lon).then(res => {
      if (res) {
        this.updateField('address', res.display_name);
        if (addrStatus) addrStatus.textContent = 'Gefunden';
      } else {
        if (addrStatus) addrStatus.textContent = 'Unbekannt';
      }
    });
  }

  public parseInput(): void {
    // Input is handled via the specific geocoder logic in attachEvents
  }
}
