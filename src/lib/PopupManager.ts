import * as maplibregl from 'maplibre-gl';

export interface PopupField {
    key: string;
    label: string;
    format?: (val: number | null | undefined) => string | null;
}

export interface LayerPopupConfig {
    title: (props: Record<string, any>) => string;
    icon: string;
    fields: PopupField[];
}

/**
 * Kuratierte Popup-Feldkonfiguration pro Layer-ID (Tracking: `adsb-icons`/`ais-icons`) — Titel,
 * Icon und welche `properties`-Felder in welcher Reihenfolge/Formatierung angezeigt werden.
 * Konsumiert von `PopupManager.buildHtml()` unten. Für heterogene/unkuratierte Layer (z.B.
 * `/karte`-Overlays) siehe stattdessen `GenericFeaturePopup.ts`.
 */
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
            { key: 'cog', label: 'Course', format: (v) => v != null ? `${Math.round(v)}°` : null },
            { key: 'destination', label: 'Destination' }
        ]
    }
};

let _sharedPopup: maplibregl.Popup | null = null;
function getSharedPopup(): maplibregl.Popup {
    if (!_sharedPopup) {
        _sharedPopup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '300px' });
    }
    return _sharedPopup;
}

export class PopupManager {
    static buildHtml(layerId: string, props: Record<string, unknown>): string {
        const config = POPUP_CONFIGS[layerId] || POPUP_CONFIGS['ais-icons']; // Fallback
        const title = config.title(props);
        
        const rows = config.fields.map(f => {
            let val = props[f.key];
            if (val == null || val === '' || val === 'null') return '';
            if (f.format) val = f.format(val as number | null | undefined);
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

    /**
     * Opens (or moves/updates) the one shared map-click popup at the given coordinates
     * with the given HTML.
     *
     * The popup is constructed with closeOnClick: false (see getSharedPopup below) — not
     * because closing-on-click is undesired, but because MapLibre's own closeOnClick
     * listener is a single persistent listener that, once registered, stays in the click
     * event's listener snapshot for the *current* click too. Calling addTo() again while
     * the popup is already open (e.g. clicking a second feature) doesn't get rid of it in
     * time: the map's click dispatch already snapshotted the listener list before this
     * handler ran, so that stale listener still fires after us and immediately closes the
     * popup we just reopened — the new content never gets a chance to show until a second
     * click. Callers are responsible for calling closePopup() themselves on a miss (see
     * NahMapLayers.handleStationClick / TrackingMapLayers.handleMapClick).
     */
    static showFeaturePopup(map: maplibregl.Map, coordinates: [number, number], html: string): void {
        getSharedPopup().setLngLat(coordinates).setHTML(html).addTo(map);
    }

    /**
     * Closes the shared map-click popup (e.g. when a click misses every feature).
     */
    static closePopup(): void {
        getSharedPopup().remove();
    }
}
