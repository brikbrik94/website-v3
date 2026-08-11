import { describe, it, expect } from 'vitest';
import { BmnBlock } from './BmnBlock';
import { UtmBlock } from './UtmBlock';
import { MgrsBlock } from './MgrsBlock';
import { Wgs84Block } from './Wgs84Block';
import { MaidenheadBlock } from './MaidenheadBlock';
import { PlusCodeBlock } from './PlusCodeBlock';
import { AddressBlock } from './AddressBlock';
import { CoordSystemBlock } from '../CoordSystemBlock';

// render() ist reines String-Templating - referenziert weder container noch service, daher
// genügen Dummy-Werte (kein DOM/happy-dom nötig).
function noContainer() {
  return null as unknown as HTMLElement;
}
function noService() {
  return null as unknown as ConstructorParameters<typeof CoordSystemBlock>[1];
}

// Jedes Eingabefeld/-Select in den Coords-Blöcken hat bisher nur ein rein visuelles
// <span class="coord-label"> statt eines echten Labels - Lighthouses label/select-name-Audit
// schlägt dadurch auf /coords fehl (siehe docs/performance/2026-07-28-baseline-audit.md, Befund 2).
// Diese Tests stellen sicher, dass jedes Feld ein aria-label bekommt, das den sichtbaren
// Label-Text enthält (WCAG 2.5.3 "Label in Name").
describe('coords blocks: aria-label auf jedem Eingabefeld', () => {
  it('BmnBlock: M-Select, RW, HW', () => {
    const html = new BmnBlock(noContainer(), noService(), 'bmn', 'BMN').render();
    expect(html).toMatch(/data-field="m"[^>]*aria-label="Meridianstreifen"/);
    expect(html).toMatch(/data-field="rw"[^>]*aria-label="RW"/);
    expect(html).toMatch(/data-field="hw"[^>]*aria-label="HW"/);
  });

  it('UtmBlock: Zone, E, N', () => {
    const html = new UtmBlock(noContainer(), noService(), 'utm', 'UTM').render();
    expect(html).toMatch(/data-field="zone"[^>]*aria-label="Zone"/);
    expect(html).toMatch(/data-field="e"[^>]*aria-label="E"/);
    expect(html).toMatch(/data-field="n"[^>]*aria-label="N"/);
  });

  it('MgrsBlock: GZD, 100km-Quadrat, E, N', () => {
    const html = new MgrsBlock(noContainer(), noService(), 'mgrs', 'MGRS').render();
    expect(html).toMatch(/data-field="gzd"[^>]*aria-label="GZD"/);
    expect(html).toMatch(/data-field="sq"[^>]*aria-label="100km-Quadrat"/);
    expect(html).toMatch(/data-field="e"[^>]*aria-label="E"/);
    expect(html).toMatch(/data-field="n"[^>]*aria-label="N"/);
  });

  it('Wgs84Block: dd-Format (lat/lon)', () => {
    const html = new Wgs84Block(noContainer(), noService(), 'wgs84', 'WGS84').render();
    expect(html).toMatch(/data-field="lat"[^>]*aria-label="Breite"/);
    expect(html).toMatch(/data-field="lon"[^>]*aria-label="Länge"/);
  });

  it('MaidenheadBlock: locator', () => {
    const html = new MaidenheadBlock(noContainer(), noService(), 'maidenhead', 'Maidenhead').render();
    expect(html).toMatch(/data-field="locator"[^>]*aria-label="Maidenhead-Locator"/);
  });

  it('PlusCodeBlock: code', () => {
    const html = new PlusCodeBlock(noContainer(), noService(), 'pluscode', 'Plus Code').render();
    expect(html).toMatch(/data-field="code"[^>]*aria-label="Plus Code"/);
  });

  it('AddressBlock: address (aria-label statt nur placeholder)', () => {
    const controller = new AbortController();
    const html = new AddressBlock(noContainer(), noService(), 'address', 'Adresse', controller.signal).render();
    expect(html).toMatch(/data-field="address"[^>]*aria-label="Adresse"/);
  });
});
