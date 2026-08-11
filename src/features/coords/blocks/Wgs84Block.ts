import { CoordSystemBlock } from '../CoordSystemBlock';
import { CoordsState } from '../types';
import { Toast } from '../../../lib/Toast';
import { parseDecimalInput } from '../parseDecimalInput';

type Wgs84Format = 'dd' | 'ddm' | 'dms';

/**
 * Wgs84Block - Vereinheitlichter WGS84-Block mit Format-Umschaltung
 * zwischen Dezimalgrad (dd), Grad Dezimalminuten (ddm) und Grad Min Sek (dms).
 */
export class Wgs84Block extends CoordSystemBlock {
  private format: Wgs84Format = 'dd';

  public render(): string {
    return `
      <div class="coord-block" data-system="wgs84">
        <div class="coord-block-header">
          <span class="coord-block-title">WGS84</span>
          <button class="coord-copy" title="Kopieren"><i class="fa-solid fa-copy"></i></button>
        </div>
        <div class="segmented coord-format-toggle">
          <button class="segmented-btn active" data-format="dd" title="Dezimalgrad">DD</button>
          <button class="segmented-btn" data-format="ddm" title="Grad Dezimalminuten">DDM</button>
          <button class="segmented-btn" data-format="dms" title="Grad Minuten Sekunden">DMS</button>
        </div>
        <div class="coord-wgs-body">${this.renderBody()}</div>
      </div>
    `;
  }

  private renderBody(): string {
    const row = (axis: 'lat' | 'lon', fields: string, suffix: string) => `
        <div class="coord-row-wgs">
          <span class="coord-label">${axis === 'lat' ? 'Lat.' : 'Lon.'}</span>
          <div class="coord-vals">${fields}</div>
          <span class="coord-suffix cursor-pointer" data-field="${axis}-suffix">${suffix}</span>
        </div>`;

    const field = (name: string, decimal = false) => {
      const axisLabel = name.startsWith('lat') ? 'Breite' : 'Länge';
      const subLabel = name.endsWith('-d') ? ' Grad' : name.endsWith('-m') ? ' Minuten' : name.endsWith('-s') ? ' Sekunden' : '';
      return `<input class="coord-input-dms" type="text"${decimal ? ' inputmode="decimal"' : ''} data-field="${name}" aria-label="${axisLabel}${subLabel}" readonly>`;
    };

    if (this.format === 'dd') {
      return (
        row('lat', field('lat', true), 'N') +
        row('lon', field('lon', true), 'E')
      );
    }

    if (this.format === 'ddm') {
      return (
        row('lat', field('lat-d') + field('lat-m', true), 'N') +
        row('lon', field('lon-d') + field('lon-m', true), 'E')
      );
    }

    // dms
    return (
      row('lat', field('lat-d') + field('lat-m') + field('lat-s', true), 'N') +
      row('lon', field('lon-d') + field('lon-m') + field('lon-s', true), 'E')
    );
  }

  protected attachEvents(): void {
    if (!this.element) return;

    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.coord-copy')) {
        this.copyToClipboard();
        return;
      }
      // Format-Umschaltung ist immer möglich und aktiviert den Block nicht
      const fmtBtn = target.closest('.segmented-btn') as HTMLElement | null;
      if (fmtBtn) {
        this.switchFormat(fmtBtn.getAttribute('data-format') as Wgs84Format);
        return;
      }
      const suffix = target.closest('.coord-suffix') as HTMLElement | null;
      if (suffix) {
        if (this.isActive) this.toggleSuffix(suffix);
        else this.activate();
        return;
      }
      this.activate();
    });

    this.element.addEventListener('input', () => {
      if (this.isActive) this.parseInput();
    });
  }

  protected copyToClipboard(): void {
    if (!this.element) return;
    const rows = this.element.querySelectorAll('.coord-row-wgs');
    const parts: string[] = [];
    rows.forEach(row => {
      const vals = Array.from(row.querySelectorAll('input'))
        .map(i => (i as HTMLInputElement).value)
        .join(' ');
      const suffix = row.querySelector('.coord-suffix')?.textContent || '';
      parts.push(`${vals} ${suffix}`.trim());
    });
    navigator.clipboard.writeText(parts.join('  '));
    Toast.success(`${this.title} kopiert`);
  }

  private toggleSuffix(el: HTMLElement): void {
    if (el.getAttribute('data-field') === 'lat-suffix') {
      el.textContent = el.textContent === 'N' ? 'S' : 'N';
    } else {
      el.textContent = el.textContent === 'E' ? 'W' : 'E';
    }
    this.parseInput();
  }

  private switchFormat(format: Wgs84Format): void {
    if (!this.element) return;
    this.format = format;

    this.element.querySelectorAll('.coord-format-toggle .segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-format') === format);
    });

    const body = this.element.querySelector('.coord-wgs-body') as HTMLElement;
    body.innerHTML = this.renderBody();
    // Eingabefelder folgen dem Aktiv-Status des Blocks (nur aktiv -> editierbar)
    body.querySelectorAll('input').forEach(i => {
      if (this.isActive) i.removeAttribute('readonly');
      else i.setAttribute('readonly', 'true');
    });
    this.update(this.service.getWgs());
  }

  public update(state: CoordsState): void {
    if (this.format === 'dd') {
      this.updateField('lat', Math.abs(state.lat).toFixed(6));
      this.updateField('lat-suffix', state.lat >= 0 ? 'N' : 'S');
      this.updateField('lon', Math.abs(state.lon).toFixed(6));
      this.updateField('lon-suffix', state.lon >= 0 ? 'E' : 'W');
      return;
    }

    if (this.format === 'ddm') {
      const ddm = this.service.getDdm();
      this.updateField('lat-d', ddm.lat.d.toString());
      this.updateField('lat-m', ddm.lat.m);
      this.updateField('lat-suffix', ddm.lat.suffix);
      this.updateField('lon-d', ddm.lon.d.toString());
      this.updateField('lon-m', ddm.lon.m);
      this.updateField('lon-suffix', ddm.lon.suffix);
      return;
    }

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

    if (this.format === 'dd') {
      const lat = parseDecimalInput((this.element.querySelector('[data-field="lat"]') as HTMLInputElement).value);
      const lon = parseDecimalInput((this.element.querySelector('[data-field="lon"]') as HTMLInputElement).value);
      const latSuf = this.element.querySelector('[data-field="lat-suffix"]')!.textContent || 'N';
      const lonSuf = this.element.querySelector('[data-field="lon-suffix"]')!.textContent || 'E';
      if (!isNaN(lat) && !isNaN(lon)) {
        this.service.setWgs(
          latSuf === 'S' ? -Math.abs(lat) : Math.abs(lat),
          lonSuf === 'W' ? -Math.abs(lon) : Math.abs(lon)
        );
      }
      return;
    }

    if (this.format === 'ddm') {
      const latD = parseDecimalInput((this.element.querySelector('[data-field="lat-d"]') as HTMLInputElement).value);
      const latM = parseDecimalInput((this.element.querySelector('[data-field="lat-m"]') as HTMLInputElement).value);
      const latSuf = this.element.querySelector('[data-field="lat-suffix"]')!.textContent || 'N';
      const lonD = parseDecimalInput((this.element.querySelector('[data-field="lon-d"]') as HTMLInputElement).value);
      const lonM = parseDecimalInput((this.element.querySelector('[data-field="lon-m"]') as HTMLInputElement).value);
      const lonSuf = this.element.querySelector('[data-field="lon-suffix"]')!.textContent || 'E';
      this.service.setDdm(latD, latM, latSuf, lonD, lonM, lonSuf);
      return;
    }

    const latD = parseDecimalInput((this.element.querySelector('[data-field="lat-d"]') as HTMLInputElement).value);
    const latM = parseDecimalInput((this.element.querySelector('[data-field="lat-m"]') as HTMLInputElement).value);
    const latS = parseDecimalInput((this.element.querySelector('[data-field="lat-s"]') as HTMLInputElement).value);
    const latSuf = this.element.querySelector('[data-field="lat-suffix"]')!.textContent || 'N';
    const lonD = parseDecimalInput((this.element.querySelector('[data-field="lon-d"]') as HTMLInputElement).value);
    const lonM = parseDecimalInput((this.element.querySelector('[data-field="lon-m"]') as HTMLInputElement).value);
    const lonS = parseDecimalInput((this.element.querySelector('[data-field="lon-s"]') as HTMLInputElement).value);
    const lonSuf = this.element.querySelector('[data-field="lon-suffix"]')!.textContent || 'E';
    this.service.setDms(latD, latM, latS, latSuf, lonD, lonM, lonS, lonSuf);
  }
}
