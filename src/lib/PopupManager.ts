export interface PopupField {
    key: string;
    label: string;
    format?: (val: any) => string | null;
}

export interface LayerPopupConfig {
    title: (props: Record<string, any>) => string;
    icon: string;
    fields: PopupField[];
}

export const POPUP_CONFIGS: Record<string, LayerPopupConfig> = {
    'adsb-icons': {
        title: (p) => (p.flight as string)?.trim() || (p.hex as string) || 'Unknown',
        icon: 'fa-solid fa-plane',
        fields: [
            { key: 'hex', label: 'ICAO Hex' },
            { key: 'alt_baro', label: 'Altitude', format: (v) => v != null ? `${v.toLocaleString()} ft` : null },
            { key: 'gs', label: 'Speed', format: (v) => v != null ? `${Math.round(v)} kn` : null },
            { key: 'track', label: 'Track', format: (v) => v != null ? `${Math.round(v)}°` : null },
            { key: 'vert_rate', label: 'Vert. Rate', format: (v) => v != null ? `${v > 0 ? '+' : ''}${v} ft/min` : null },
            { key: 'squawk', label: 'Squawk' },
            { key: 'seen', label: 'Last seen', format: (v) => v != null ? `vor ${Math.round(v)}s` : null }
        ]
    },
    'ais-icons': {
        title: (p) => (p.shipname as string) || (p.name as string) || `MMSI: ${p.mmsi}`,
        icon: 'fa-solid fa-ship',
        fields: [
            { key: 'mmsi', label: 'MMSI' },
            { key: 'ui_class', label: 'Klasse' },
            { key: 'speed', label: 'Speed', format: (v) => v != null ? `${v} kn` : null },
            { key: 'cog', label: 'Course', format: (v) => v != null ? `${Math.round(v as number)}°` : null },
            { key: 'destination', label: 'Destination' }
        ]
    }
};

export class PopupManager {
    static buildHtml(layerId: string, props: Record<string, unknown>): string {
        const config = POPUP_CONFIGS[layerId] || POPUP_CONFIGS['ais-icons']; // Fallback
        const title = config.title(props);
        
        const rows = config.fields.map(f => {
            let val = props[f.key];
            if (val == null || val === '' || val === 'null') return '';
            if (f.format) val = f.format(val);
            if (val == null) return '';
            
            return `
                <tr>
                    <td class="popup-label">${f.label}</td>
                    <td class="popup-value">${val}</td>
                </tr>`;
        }).join('');

        return `
            <div class="map-popup-detail">
                <div class="popup-header">
                    <div class="popup-header-title">
                        <i class="${config.icon}"></i>
                        <strong>${title}</strong>
                    </div>
                </div>
                <table class="popup-kv">
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `.trim();
    }
}
