import { describe, it, expect } from 'vitest';
import { buildGenericFeaturePopupHtml } from './GenericFeaturePopup';

describe('buildGenericFeaturePopupHtml', () => {
  it('uses "name" as the title when present', () => {
    const html = buildGenericFeaturePopupHtml('autobahnen-a1-line', { name: 'Westautobahn', ref: 'A1' });
    expect(html).toContain('Westautobahn');
  });

  it('falls back to "title" when "name" is absent', () => {
    const html = buildGenericFeaturePopupHtml('some-layer', { title: 'Bezirk Linz-Land' });
    expect(html).toContain('Bezirk Linz-Land');
  });

  it('falls back to "ref" when "name"/"title" are absent', () => {
    const html = buildGenericFeaturePopupHtml('some-layer', { ref: 'A1' });
    expect(html).toContain('A1');
  });

  it('falls back to "id" when "name"/"title"/"ref" are absent', () => {
    const html = buildGenericFeaturePopupHtml('some-layer', { id: '12345' });
    expect(html).toContain('12345');
  });

  it('falls back to the layer id when no title-ish property exists at all', () => {
    const html = buildGenericFeaturePopupHtml('autobahnen-a1-line', { maxspeed: 130 });
    expect(html).toContain('autobahnen-a1-line');
  });

  it('lists remaining properties as key-value rows', () => {
    const html = buildGenericFeaturePopupHtml('l', { name: 'Westautobahn', ref: 'A1', maxspeed: 130 });
    expect(html).toContain('ref');
    expect(html).toContain('A1');
    expect(html).toContain('maxspeed');
    expect(html).toContain('130');
  });

  it('excludes the property used as the title from the row list', () => {
    const html = buildGenericFeaturePopupHtml('l', { name: 'Westautobahn' });
    const rowsHtml = html.split('Westautobahn').slice(1).join('');
    expect(rowsHtml).not.toContain('>name<');
  });

  it('skips null, undefined, and empty-string values', () => {
    const html = buildGenericFeaturePopupHtml('l', { name: 'X', empty: '', nully: null, undef: undefined, kept: 'yes' });
    expect(html).not.toContain('empty');
    expect(html).not.toContain('nully');
    expect(html).not.toContain('undef');
    expect(html).toContain('kept');
  });

  it('skips keys with an underscore prefix (internal/computed fields)', () => {
    const html = buildGenericFeaturePopupHtml('l', { name: 'X', _internal: 'secret', visible_prop: 'shown' });
    expect(html).not.toContain('_internal');
    expect(html).not.toContain('secret');
    expect(html).toContain('visible_prop');
  });

  it('skips values longer than 200 characters', () => {
    const longValue = 'x'.repeat(201);
    const html = buildGenericFeaturePopupHtml('l', { name: 'X', blob: longValue, short: 'ok' });
    expect(html).not.toContain(longValue);
    expect(html).toContain('short');
  });

  it('handles an empty properties object without throwing', () => {
    const html = buildGenericFeaturePopupHtml('some-layer', {});
    expect(html).toContain('some-layer');
  });

  it('escapes HTML in property values to avoid injection', () => {
    const html = buildGenericFeaturePopupHtml('l', { name: '<script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)</script>');
  });
});
