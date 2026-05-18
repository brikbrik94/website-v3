import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';

export class Wgs84Block extends CoordSystemBlock {
  public render(): string {
    return `
      <div class="coord-block" data-system="wgs84">
        <div class="coord-block-header">
          <span class="coord-block-title">WGS84 Dezimalgrad</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="coord-row">
          <span class="coord-label">Lat.</span>
          <input class="coord-input" type="text" inputmode="decimal" data-field="lat" readonly>
        </div>
        <div class="coord-row">
          <span class="coord-label">Lon.</span>
          <input class="coord-input" type="text" inputmode="decimal" data-field="lon" readonly>
        </div>
      </div>
    `;
  }

  public update(state: CoordsState): void {
    this.updateField('lat', state.lat.toFixed(6));
    this.updateField('lon', state.lon.toFixed(6));
  }

  public parseInput(): void {
    if (!this.element) return;
    const lat = parseFloat((this.element.querySelector('[data-field="lat"]') as HTMLInputElement).value);
    const lon = parseFloat((this.element.querySelector('[data-field="lon"]') as HTMLInputElement).value);
    if (!isNaN(lat) && !isNaN(lon)) {
      this.service.setWgs(lat, lon);
    }
  }
}
