import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';
import { parseDecimalInput } from '../parseDecimalInput';

export class BmnBlock extends CoordSystemBlock {
  public render(): string {
    return `
      <div class="coord-block" data-system="bmn">
        <div class="coord-block-header">
          <span class="coord-block-title">BMN (Österreich)</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="coord-row">
          <span class="coord-label">M</span>
          <select class="coord-select" data-field="m" disabled>
            <option value="M28">M28</option>
            <option value="M31">M31</option>
            <option value="M34">M34</option>
          </select>
        </div>
        <div class="coord-row">
          <span class="coord-label">RW</span>
          <input class="coord-input" type="text" data-field="rw" readonly>
        </div>
        <div class="coord-row">
          <span class="coord-label">HW</span>
          <input class="coord-input" type="text" data-field="hw" readonly>
        </div>
      </div>
    `;
  }

  public update(_state: CoordsState): void {
    const bmn = this.service.getBmn();
    this.updateField('m', bmn.m);
    this.updateField('rw', bmn.rw);
    this.updateField('hw', bmn.hw);
  }

  public parseInput(): void {
    if (!this.element) return;
    const m = (this.element.querySelector('[data-field="m"]') as HTMLSelectElement).value;
    const rw = parseDecimalInput((this.element.querySelector('[data-field="rw"]') as HTMLInputElement).value);
    const hw = parseDecimalInput((this.element.querySelector('[data-field="hw"]') as HTMLInputElement).value);
    
    this.service.setBmn(m, rw, hw);
  }
}
