import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateRoutingSummary } from './RoutingSidebar';

function createFakeElement() {
  const classes = new Set<string>();
  return {
    innerHTML: '',
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
    },
  };
}

describe('updateRoutingSummary badges', () => {
  let details: ReturnType<typeof createFakeElement>;

  beforeEach(() => {
    details = createFakeElement();
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'routing-details' ? details : null),
    });
  });

  it('renders no profile badge and no warning badges when only distance/duration are given', () => {
    updateRoutingSummary(1000, 60);
    expect(details.innerHTML).not.toContain('fa-car');
    expect(details.innerHTML).not.toContain('fa-truck-medical');
    expect(details.innerHTML).not.toContain('badge-yellow');
  });

  it('renders the Normalfahrt badge for driving-car', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car');
    expect(details.innerHTML).toContain('fa-car');
    expect(details.innerHTML).toContain('Normalfahrt');
  });

  it('renders the Blaulichtfahrt badge for driving-emergency', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-emergency');
    expect(details.innerHTML).toContain('fa-truck-medical');
    expect(details.innerHTML).toContain('Blaulichtfahrt');
  });

  it('renders a toll warning badge when extras indicate tollways', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car', {
      tollways: { values: [[0, 1, 1]], summary: [{ value: 1, distance: 1000, amount: 92.8 }] },
    });
    expect(details.innerHTML).toContain('badge-yellow');
    expect(details.innerHTML).toContain('Enthält Mautstraßen');
  });

  it('renders no warning badges when extras have no tollways/restrictions', () => {
    updateRoutingSummary(1000, 60, 'Zusammenfassung', 'driving-car', {
      tollways: { values: [[0, 1, 0]], summary: [{ value: 0, distance: 1000, amount: 100 }] },
    });
    expect(details.innerHTML).not.toContain('badge-yellow');
  });
});
