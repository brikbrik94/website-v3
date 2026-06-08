interface TrackingHealth {
    status?: string;
    aircraft?: number;
    vessels?: number;
    system?: {
        process?: { rssMb?: number; heapUsedMb?: number };
        uptimeSec?: number;
        totals?: { decodedPerMinute?: number };
    };
    sources?: Array<{ kind?: string; id: string; state?: string; lastDataAt: string }>;
}

interface TrackingStats {
    day?: string;
    adsbMessages?: number;
    aisMessages?: number;
    aircraftSeen?: number;
    aircraftNew?: number;
    vesselsSeen?: number;
    metadataCacheHit?: number;
    metadataNotFound?: number;
    updatedAt?: string;
}

interface TrackingInfo {
    name?: string;
    apiVersion?: string;
    description?: string;
    endpoints?: Array<{ method?: string; path: string; description: string }>;
}

const TRACKING_API_BASE = 'https://api.oe5ith.at/tracking';

export async function renderTrackingEndpointsModule(container: HTMLElement, signal: AbortSignal) {
    container.innerHTML = `
        <header class="page-header">
            <div class="page-header-left">
                <div class="svc-page-title-row">
                    <i class="fa-solid fa-satellite-dish svc-page-icon"></i>
                    <h1 class="page-title">Tracking Gateway API</h1>
                </div>
                <p class="page-subtitle">Statische HTTP Endpunkte Übersicht</p>
            </div>
        </header>
        <div class="content-body" id="tracking-endpoints-body">
            <div class="panel">
                <div class="panel-body">
                    <div style="text-align: center; padding: 20px;">
                        <i class="fa-solid fa-spinner fa-spin"></i> Lade API Daten...
                    </div>
                </div>
            </div>
        </div>
    `;

    const body = container.querySelector('#tracking-endpoints-body')!;

    try {
        const [healthRes, statsRes, infoRes] = await Promise.all([
            fetch(`${TRACKING_API_BASE}/health`, { signal }),
            fetch(`${TRACKING_API_BASE}/stats/today`, { signal }),
            fetch(`${TRACKING_API_BASE}/info`, { signal })
        ]);

        if (!healthRes.ok || !statsRes.ok || !infoRes.ok) {
            throw new Error('Fehler beim Abrufen der API-Daten (HTTP Status nicht ok)');
        }

        const health = await healthRes.json();
        const stats = await statsRes.json();
        const info = await infoRes.json();

        if (signal.aborted) return;

        body.innerHTML = `
            ${renderHealthPanel(health)}
            ${renderStatsPanel(stats)}
            ${renderInfoPanel(info)}
        `;
    } catch (e: any) {
        if (signal.aborted) return;
        body.innerHTML = `
            <div class="panel error-panel">
                <div class="panel-header">
                    <h2><i class="fa-solid fa-triangle-exclamation"></i> Fehler</h2>
                </div>
                <div class="panel-body">
                    <p>Die Tracking-Endpunkte konnten nicht geladen werden.</p>
                    <p class="error-text">${e.message}</p>
                </div>
            </div>
        `;
    }
}

function renderHealthPanel(health: TrackingHealth) {
    const sys = health.system || {};
    const process = sys.process || {};
    const memTotal = ((process.rssMb || 0) + (process.heapUsedMb || 0)).toFixed(1);

    const sources = health.sources || [];
    const sourceRows = sources.map((s: any) => `
        <tr>
            <td><span class="badge badge-gray">${(s.kind || 'unknown').toUpperCase()}</span></td>
            <td class="mono">${s.id}</td>
            <td><span class="badge ${s.state === 'online' ? 'badge-green' : 'badge-red'}"><span class="badge-dot"></span> ${s.state}</span></td>
            <td style="text-align: right;">${new Date(s.lastDataAt).toLocaleTimeString()}</td>
        </tr>
    `).join('');

    return `
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-heart-pulse"></i> /health (Live Status)</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid mb-4">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Gateway Status</span>
                        <span class="svc-data-value ${health.status === 'ok' ? 'success' : 'danger'}">${(health.status || 'unknown').toUpperCase()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Uptime</span>
                        <span class="svc-data-value">${formatUptime(sys.uptimeSec || 0)}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Memory (RSS+Heap)</span>
                        <span class="svc-data-value">${memTotal} MB</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Decoded / Min</span>
                        <span class="svc-data-value">${(sys.totals?.decodedPerMinute || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Flugzeuge (Live)</span>
                        <span class="svc-data-value">${health.aircraft || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Schiffe (Live)</span>
                        <span class="svc-data-value">${health.vessels || 0}</span>
                    </div>
                </div>

                <div class="panel-title" style="margin-top: 24px; margin-bottom: 12px;"><i class="fa-solid fa-plug"></i> Aktive Datenquellen</div>
                <div class="table-wrapper">
                    <table class="ci-table">
                        <thead>
                            <tr>
                                <th>Typ</th>
                                <th>Source ID</th>
                                <th>Status</th>
                                <th style="text-align: right;">Letztes Paket</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sourceRows || '<tr><td colspan="4" style="text-align: center; color: var(--muted);">Keine Quellen</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderStatsPanel(stats: TrackingStats) {
    return `
        <div class="panel mt-4">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-chart-pie"></i> /stats/today (Tages-Zähler)</div>
                <div class="panel-meta">
                    <span class="badge badge-blue">${stats.day || 'Heute'}</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">ADS-B Messages</span>
                        <span class="svc-data-value">${(stats.adsbMessages || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">AIS Messages</span>
                        <span class="svc-data-value">${(stats.aisMessages || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Aircraft Seen / New</span>
                        <span class="svc-data-value">${stats.aircraftSeen || 0} / <span class="t-success">+${stats.aircraftNew || 0}</span></span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Vessels Seen</span>
                        <span class="svc-data-value">${stats.vesselsSeen || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Metadata Hits</span>
                        <span class="svc-data-value success">${(stats.metadataCacheHit || 0).toLocaleString()}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Metadata Misses</span>
                        <span class="svc-data-value danger">${stats.metadataNotFound || 0}</span>
                    </div>
                </div>
                <div style="margin-top: 16px; font-size: 0.85rem; color: var(--muted);">
                    Letztes Rollup Update in der Datenbank: ${stats.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString() : 'Unbekannt'}
                </div>
            </div>
        </div>
    `;
}

function renderInfoPanel(info: TrackingInfo) {
    const endpoints = info.endpoints || [];
    const rows = endpoints.map((e: any) => `
        <tr>
            <td><span class="badge badge-gray">${e.method || 'WS'}</span></td>
            <td class="mono"><strong>${e.path}</strong></td>
            <td>${e.description}</td>
        </tr>
    `).join('');

    return `
        <div class="panel mt-4 mb-4" style="margin-top: 24px; margin-bottom: 24px;">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-circle-info"></i> /info (API Übersicht)</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid mb-4">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Service</span>
                        <span class="svc-data-value">${info.name}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">API Version</span>
                        <span class="svc-data-value"><span class="badge badge-blue">${info.apiVersion}</span></span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Beschreibung</span>
                        <span class="svc-data-value" style="font-size:0.85rem">${info.description}</span>
                    </div>
                </div>
                
                <div class="panel-title" style="margin-top: 24px; margin-bottom: 12px;"><i class="fa-solid fa-server"></i> Verfügbare Endpunkte</div>
                <div class="table-wrapper">
                    <table class="ci-table">
                        <thead>
                            <tr>
                                <th>Methode</th>
                                <th>Pfad</th>
                                <th>Beschreibung</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="3" style="text-align: center; color: var(--muted);">Keine Endpunkte</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function formatUptime(seconds: number): string {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    
    return parts.join(' ');
}
