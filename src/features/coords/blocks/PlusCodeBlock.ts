import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';

/**
 * PlusCodeBlock - Google Plus Codes (Open Location Code).
 * Akzeptiert 10- und 11-stellige Codes; die Anzeige nutzt 11 Stellen,
 * wenn die Quelle genau genug ist, sonst 10 (siehe CoordsDataService).
 */
export class PlusCodeBlock extends CoordSystemBlock {
  public render(): string {
    return `
      <div class="coord-block" data-system="pluscode">
        <div class="coord-block-header">
          <span class="coord-block-title">Plus Code</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="coord-row">
          <input class="coord-input-full" type="text" data-field="code" readonly>
        </div>
      </div>
    `;
  }

  public update(_state: CoordsState): void {
    this.updateField('code', this.service.getPlusCode().code);
  }

  public parseInput(): void {
    if (!this.element) return;
    const code = (this.element.querySelector('[data-field="code"]') as HTMLInputElement).value;
    this.service.setPlusCode(code);
  }
}
