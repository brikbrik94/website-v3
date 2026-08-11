import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsDataService } from '../CoordsDataService';
import { CoordsState } from '../types';
import { GeocoderService } from '../../../lib/GeocoderService';
import { GeocoderSearchField } from '../../../lib/GeocoderSearchField';

export class AddressBlock extends CoordSystemBlock {
  constructor(
    container: HTMLElement,
    service: CoordsDataService,
    systemId: string,
    title: string,
    private signal: AbortSignal
  ) {
    super(container, service, systemId, title);
  }

  public render(): string {
    return `
      <div class="coord-block active" data-system="address">
        <div class="coord-block-header">
          <span class="coord-block-title">Adresse</span>
          <div class="flex-align-center gap-8">
            <div class="coord-header-status" id="address-status"></div>
            <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
          </div>
        </div>
        <div class="coord-row pos-relative">
          <input class="coord-input-full" type="text" data-field="address" aria-label="Adresse" placeholder="Adresse suchen..." autocomplete="off">
          <div id="geocoder-results" class="geocoder-results hidden"></div>
        </div>
      </div>
    `;
  }

  protected attachEvents(): void {
    super.attachEvents();
    if (!this.element) return;

    const input = this.element.querySelector('[data-field="address"]') as HTMLInputElement;
    const resultsContainer = this.element.querySelector('#geocoder-results') as HTMLElement;

    new GeocoderSearchField(input, resultsContainer, {
      signal: this.signal,
      onSelect: (selection) => this.service.setWgs(selection.lat, selection.lon)
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
