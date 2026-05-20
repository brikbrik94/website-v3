/**
 * LayoutHelper
 * Zentralisiert das Basis-Layout (Topbar, Sidebar, Map) für alle Pages.
 */

export interface LayoutOptions {
    withLegend?: boolean;
    legendTitle?: string;
}

export interface LayoutMounts {
    topbar: HTMLElement;
    sidebar: HTMLElement;
    map: HTMLElement;
    legend?: HTMLElement;
}

export class LayoutHelper {
    /**
     * Erzeugt das Standard-HTML-Gerüst im Container und gibt die Mount-Points zurück.
     */
    public static renderBaseLayout(container: HTMLElement, options: LayoutOptions = {}): LayoutMounts {
        container.innerHTML = `
            <div id="topbar-mount"></div>
            <div class="layout">
                <div id="sidebar-mount"></div>
                <main id="map" class="full-map"></main>
                ${options.withLegend ? `
                    <div class="map-legend hidden" id="map-legend">
                        <div class="map-legend-title">${options.legendTitle || ''}</div>
                        <div class="map-legend-entries"></div>
                    </div>
                ` : ''}
            </div>
        `;

        const mounts: LayoutMounts = {
            topbar: document.getElementById('topbar-mount')!,
            sidebar: document.getElementById('sidebar-mount')!,
            map: document.getElementById('map')!
        };

        if (options.withLegend) {
            mounts.legend = document.getElementById('map-legend')!;
        }

        return mounts;
    }
}
