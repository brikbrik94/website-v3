import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initTrackingSidebar } from './TrackingSidebar';

// Mock SidebarUtils
vi.mock('../lib/SidebarUtils', () => ({
  getSidebarFooterHtml: () => '<footer id="mock-footer"></footer>',
  setupSidebarToggle: vi.fn(),
}));

describe('TrackingSidebar', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = {
      innerHTML: '',
      addEventListener: vi.fn(),
    } as any;
    
    // Mock document
    const mockEl = {
      addEventListener: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
      classList: { remove: vi.fn(), add: vi.fn() },
      getAttribute: vi.fn(),
    };
    
    vi.stubGlobal('document', {
      getElementById: vi.fn().mockReturnValue(mockEl),
      querySelectorAll: vi.fn().mockReturnValue([]),
    });
  });

  it('should initialize with Type 8 HTML structure', () => {
    initTrackingSidebar(container, vi.fn());

    expect(container.innerHTML).toContain('class="status-panel" id="status-panel-counters"');
    expect(container.innerHTML).toContain('id="status-adsb-count"');
    expect(container.innerHTML).toContain('id="status-ais-count"');
    expect(container.innerHTML).toContain('class="segmented" id="tracking-filter"');
    expect(container.innerHTML).toContain('class="tracking-list" id="tracking-list"');
    expect(container.innerHTML).toContain('Warte auf Empfang…');
    expect(container.innerHTML).toContain('<footer id="mock-footer"></footer>');
  });
});
