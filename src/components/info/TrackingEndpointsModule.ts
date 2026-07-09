interface TrackingHealth {
    status?: string;
    aircraft?: number;
    vessels?: number;
    system?: {
        process?: { rssMb?: number; heapUsedMb?: number };
        uptimeSec?: number;
        totals?: { decodedPerMinute?: number; messagesPerMinute?: number };
        sources?: Array<{ kind: string; id: string; state: string; messagesPerMinute: number; lastDataAt: string }>;
    };
    sources?: Array<{ kind?: string; id: string; state?: string; messagesPerMinute?: number; lastDataAt: string }>;
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

const TRACKING_API_BASE = 'https://api.oe5ith.at/tracking';

export async function renderTrackingEndpointsModule(container: HTMLElement, signal: AbortSignal) {
    container.innerHTML = `
        <header class="page-header">
            <div class="page-header-left">
                <div class="svc-page-title-row">
                    <i class="fa-solid fa-satellite-dish svc-page-icon"></i>
                    <h1 class="page-title">Tracking System Telemetrie</h1>
                </div>
                <p class="page-subtitle">Live-Status und statistische Auswertungen</p>
            </div>
        </header>
        <div class="content-body" id="tracking-endpoints-body">
            <div class="panel">
                <div class="panel-body">
                    <p class="svc-info-line"><i class="fa-solid fa-spinner fa-spin"></i> Lade Tracking-Daten...</p>
                </div>
            </div>
        </div>
    `;

    const body = container.querySelector('#tracking-endpoints-body')!;

    try {
        const [healthRes, statsRes] = await Promise.all([
            fetch(`${TRACKING_API_BASE}/health`, { signal }),
            fetch(`${TRACKING_API_BASE}/stats/today`, { signal })
        ]);

        if (!healthRes.ok || !statsRes.ok) {
            throw new Error('Fehler beim Abrufen der API-Daten (HTTP Status nicht ok)');
        }

        const health = await healthRes.json();
        const stats = await statsRes.json();

        if (signal.aborted) return;

        body.innerHTML = `
            ${renderLiveKpis(health)}
            ${renderStatsPanel(stats)}
            ${renderSourcesPanel(health)}
        `;
    } catch (e) {
        if (signal.aborted) return;
        body.innerHTML = `
            <div class="panel error-panel">
                <div class="panel-header">
                    <div class="panel-title"><i class="fa-solid fa-triangle-exclamation"></i> Fehler</div>
                </div>
                <div class="panel-body">
                    <p>Die Tracking-Endpunkte konnten nicht geladen werden.</p>
                    <p class="error-text">${(e as Error).message}</p>
                </div>
            </div>
        `;
    }
}

function renderLiveKpis(health: TrackingHealth) {
    return `
        <div class="panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-bolt"></i> Live-Status</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid">
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Paketrate</span>
                        <span class="svc-data-value">${health.system?.totals?.messagesPerMinute || 0}</span>
                        <span class="svc-data-sub">Nachrichten / Min</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Flugzeuge Live</span>
                        <span class="svc-data-value">${health.aircraft || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Schiffe Live</span>
                        <span class="svc-data-value">${health.vessels || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Uptime</span>
                        <span class="svc-data-value">${formatUptime(health.system?.uptimeSec || 0)}</span>
                    </div>
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
                    Letztes Update: ${stats.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString() : 'Unbekannt'}
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
                        <span class="svc-data-label">Aircraft Seen</span>
                        <span class="svc-data-value">${stats.aircraftSeen || 0}</span>
                    </div>
                    <div class="svc-data-cell">
                        <span class="svc-data-label">Aircraft New</span>
                        <span class="svc-data-value success">+${stats.aircraftNew || 0}</span>
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
            </div>
        </div>
    `;
}

function renderSourcesPanel(health: TrackingHealth) {
    const sources = health.system?.sources || health.sources || [];
    
    if (sources.length === 0) {
        return `
            <div class="panel mt-4">
                <div class="panel-header">
                    <div class="panel-title"><i class="fa-solid fa-plug"></i> Aktive Datenquellen</div>
                </div>
                <div class="panel-body">
                    <p class="svc-info-line">Keine Quellen aktiv</p>
                </div>
            </div>
        `;
    }

    const sourceGrids = sources.map((s) => `
        <div class="svc-data-cell">
            <span class="svc-data-label">Typ</span>
            <span class="svc-data-value">${(s.kind || 'unknown').toUpperCase()}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Source ID</span>
            <span class="svc-data-value">${s.id}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Status</span>
            <span class="svc-data-value ${s.state === 'online' ? 'success' : 'danger'}">${s.state}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Nachrichten/Min</span>
            <span class="svc-data-value">${s.messagesPerMinute || 0}</span>
        </div>
        <div class="svc-data-cell">
            <span class="svc-data-label">Letztes Paket</span>
            <span class="svc-data-value">${s.lastDataAt ? new Date(s.lastDataAt).toLocaleTimeString() : '-'}</span>
        </div>
    `).join('');

    return `
        <div class="panel mt-4">
            <div class="panel-header">
                <div class="panel-title"><i class="fa-solid fa-plug"></i> Aktive Datenquellen</div>
            </div>
            <div class="panel-body">
                <div class="svc-data-grid">
                    ${sourceGrids}
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
