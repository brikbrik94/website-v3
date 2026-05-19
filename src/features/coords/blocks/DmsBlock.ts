import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';

export class DmsBlock extends CoordSystemBlock {
  public render(): string {
    return `
      <div class="coord-block" data-system="dms">
        <div class="coord-block-header">
          <span class="coord-block-title">WGS84 DMS</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="coord-row-dms">
          <span class="coord-label">Lat.</span>
          <input class="coord-input-dms" type="text" data-field="lat-d" readonly>
          <input class="coord-input-dms" type="text" data-field="lat-m" readonly>
          <input class="coord-input-dms" type="text" data-field="lat-s" readonly>
          <span class="coord-suffix" data-field="lat-suffix" style="cursor: pointer;">N</span>
        </div>
        <div class="coord-row-dms">
          <span class="coord-label">Lon.</span>
          <input class="coord-input-dms" type="text" data-field="lon-d" readonly>
          <input class="coord-input-dms" type="text" data-field="lon-m" readonly>
          <input class="coord-input-dms" type="text" data-field="lon-s" readonly>
          <span class="coord-suffix" data-field="lon-suffix" style="cursor: pointer;">E</span>
        </div>
      </div>
    `;
  }

  protected attachEvents(): void {
    super.attachEvents();
    if (!this.element) return;

    const latSuffix = this.element.querySelector('[data-field="lat-suffix"]') as HTMLElement;
    const lonSuffix = this.element.querySelector('[data-field="lon-suffix"]') as HTMLElement;

    latSuffix.addEventListener('click', () => {
      if (!this.isActive) return;
      latSuffix.textContent = latSuffix.textContent === 'N' ? 'S' : 'N';
      this.parseInput();
    });

    lonSuffix.addEventListener('click', () => {
      if (!this.isActive) return;
      lonSuffix.textContent = lonSuffix.textContent === 'E' ? 'W' : 'E';
      this.parseInput();
    });
  }

  public update(_state: CoordsState): void {
    const dms = this.service.getDms();
    this.updateField('lat-d', dms.lat.d.toString());
    this.updateField('lat-m', dms.lat.m.toString());
    this.updateField('lat-s', dms.lat.s);
    this.updateField('lat-suffix', dms.lat.suffix);
    this.updateField('lon-d', dms.lon.d.toString());
    this.updateField('lon-m', dms.lon.m.toString());
    this.updateField('lon-s', dms.lon.s);
    this.updateField('lon-suffix', dms.lon.suffix);
  }

  public parseInput(): void {
    if (!this.element) return;
    const latD = parseFloat((this.element.querySelector('[data-field="lat-d"]') as HTMLInputElement).value);
    const latM = parseFloat((this.element.querySelector('[data-field="lat-m"]') as HTMLInputElement).value);
    const latS = parseFloat((this.element.querySelector('[data-field="lat-s"]') as HTMLInputElement).value);
    const latSuf = this.element.querySelector('[data-field="lat-suffix"]')!.textContent || 'N';

    const lonD = parseFloat((this.element.querySelector('[data-field="lon-d"]') as HTMLInputElement).value);
    const lonM = parseFloat((this.element.querySelector('[data-field="lon-m"]') as HTMLInputElement).value);
    const lonS = parseFloat((this.element.querySelector('[data-field="lon-s"]') as HTMLInputElement).value);
    const lonSuf = this.element.querySelector('[data-field="lon-suffix"]')!.textContent || 'E';

    this.service.setDms(latD, latM, latS, latSuf, lonD, lonM, lonS, lonSuf);
  }
}
