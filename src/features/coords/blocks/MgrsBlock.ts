import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';

export class MgrsBlock extends CoordSystemBlock {
  public render(): string {
    return `
      <div class="coord-block" data-system="mgrs">
        <div class="coord-block-header">
          <span class="coord-block-title">MGRS</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="coord-row-inline">
          <span class="coord-label">GZD</span>
          <input class="coord-input-short" type="text" data-field="gzd" readonly>
          <span class="coord-label">100km</span>
          <input class="coord-input-short" type="text" data-field="sq" readonly>
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

  public update(state: CoordsState): void {
    const mgrs = this.service.getMgrs();
    this.updateField('gzd', mgrs.gzd);
    this.updateField('sq', mgrs.sq);
    this.updateField('e', mgrs.e);
    this.updateField('n', mgrs.n);
  }

  public parseInput(): void {
    if (!this.element) return;
    const gzd = (this.element.querySelector('[data-field="gzd"]') as HTMLInputElement).value;
    const sq = (this.element.querySelector('[data-field="sq"]') as HTMLInputElement).value;
    const e = (this.element.querySelector('[data-field="e"]') as HTMLInputElement).value;
    const n = (this.element.querySelector('[data-field="n"]') as HTMLInputElement).value;
    
    this.service.setMgrs(gzd, sq, e, n);
  }
}
