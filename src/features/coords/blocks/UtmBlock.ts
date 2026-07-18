import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';
import { parseDecimalInput } from '../parseDecimalInput';

export class UtmBlock extends CoordSystemBlock {
  public render(): string {
    return `
      <div class="coord-block" data-system="utm">
        <div class="coord-block-header">
          <span class="coord-block-title">UTM</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="coord-row">
          <span class="coord-label">Zone</span>
          <input class="coord-input" type="text" data-field="zone" readonly>
        </div>
        <div class="coord-row">
          <span class="coord-label">E</span>
          <input class="coord-input" type="text" data-field="e" readonly>
        </div>
        <div class="coord-row">
          <span class="coord-label">N</span>
          <input class="coord-input" type="text" data-field="n" readonly>
        </div>
      </div>
    `;
  }

  public update(_state: CoordsState): void {
    const utm = this.service.getUtm();
    this.updateField('zone', utm.zone);
    this.updateField('e', utm.e);
    this.updateField('n', utm.n);
  }

  public parseInput(): void {
    if (!this.element) return;
    const zone = (this.element.querySelector('[data-field="zone"]') as HTMLInputElement).value;
    const e = parseDecimalInput((this.element.querySelector('[data-field="e"]') as HTMLInputElement).value);
    const n = parseDecimalInput((this.element.querySelector('[data-field="n"]') as HTMLInputElement).value);
    
    this.service.setUtm(zone, e, n);
  }
}
