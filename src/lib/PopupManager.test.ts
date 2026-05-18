import { describe, it, expect } from 'vitest';
import { PopupManager } from './PopupManager';

describe('PopupManager', () => {
    it('should generate ADSB popup HTML correctly', () => {
        const props = {
            flight: 'AUA123 ',
            hex: '44044A',
            alt_baro: 38000,
            gs: 450.5,
            track: 270,
            vert_rate: -500,
            seen: 5
        };
        const html = PopupManager.buildHtml('adsb-icons', props);

        expect(html).toContain('AUA123');
        expect(html).toContain('fa-plane');
        expect(html).toContain('38,000 ft');
        expect(html).toContain('451 kn');
        expect(html).toContain('270°');
        expect(html).toContain('-500 ft/min');
        expect(html).toContain('vor 5s');
    });

    it('should generate AIS popup HTML correctly', () => {
        const props = {
            shipname: 'VIENNA EXPRESS',
            mmsi: '123456789',
            ui_class: 'Tanker',
            speed: 12.5,
            cog: 180,
            destination: 'HAMBURG'
        };
        const html = PopupManager.buildHtml('ais-icons', props);

        expect(html).toContain('VIENNA EXPRESS');
        expect(html).toContain('fa-ship');
        expect(html).toContain('123456789');
        expect(html).toContain('Klasse');
        expect(html).toContain('Tanker');
        expect(html).toContain('12.5 kn');
        expect(html).toContain('180°');
        expect(html).toContain('HAMBURG');
    });

    it('should use fallback for unknown layers', () => {
        const props = {
            mmsi: '987654321'
        };
        const html = PopupManager.buildHtml('unknown-layer', props);
        expect(html).toContain('MMSI: 987654321');
        expect(html).toContain('fa-ship'); // Fallback is ais-icons
    });

    it('should skip null or empty values', () => {
        const props = {
            flight: 'AUA456',
            squawk: null,
            hex: '123456'
        };
        const html = PopupManager.buildHtml('adsb-icons', props);
        expect(html).toContain('AUA456');
        expect(html).not.toContain('Squawk');
    });
});
