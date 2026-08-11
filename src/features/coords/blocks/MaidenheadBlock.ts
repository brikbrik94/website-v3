import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';

export class MaidenheadBlock extends CoordSystemBlock {
  public render(): string {
    return `
      <div class="coord-block" data-system="maidenhead">
        <div class="coord-block-header">
          <span class="coord-block-title">Maidenhead</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="coord-row">
          <input class="coord-input-full" type="text" data-field="locator" aria-label="Maidenhead-Locator" readonly>
        </div>
      </div>
    `;
  }

  public update(_state: CoordsState): void {
    const mh = this.service.getMaidenhead();
    this.updateField('locator', mh.locator);
  }

  public parseInput(): void {
    if (!this.element) return;
    const locator = (this.element.querySelector('[data-field="locator"]') as HTMLInputElement).value;
    this.service.setMaidenhead(locator);
  }
}
