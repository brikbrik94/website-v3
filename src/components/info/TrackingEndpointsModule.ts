export async function renderTrackingEndpointsModule(container: HTMLElement, signal: AbortSignal) {
    container.innerHTML = `
        <div class="content-header">
            <h1 class="page-title">Tracking Gateway API</h1>
            <div class="page-subtitle">Statische HTTP Endpunkte Übersicht</div>
        </div>
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

    const body = document.getElementById('tracking-endpoints-body')!;

    try {
        const [healthRes, statsRes, infoRes] = await Promise.all([
            fetch('https://api.oe5ith.at/tracking/health', { signal }),
            fetch('https://api.oe5ith.at/tracking/stats/today', { signal }),
            fetch('https://api.oe5ith.at/tracking/info', { signal })
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

function renderHealthPanel(health: any) {
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
                <h2><i class="fa-solid fa-heart-pulse"></i> /health (Live Status)</h2>
            </div>
            <div class="panel-body">
                <div class="card-grid mb-4">
                    <div class="card card-dashboard">
                        <div class="card-status-dot ${health.status === 'ok' ? 'online' : 'offline'}"></div>
                        <h3>${(health.status || 'unknown').toUpperCase()}</h3>
                        <p>Gateway Status</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${formatUptime(sys.uptimeSec || 0)}</h3>
                        <p>Uptime</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${memTotal} MB</h3>
                        <p>Memory (RSS+Heap)</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${(sys.totals?.decodedPerMinute || 0).toLocaleString()}</h3>
                        <p>Decoded / Min</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${health.aircraft || 0}</h3>
                        <p>Flugzeuge (Live)</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${health.vessels || 0}</h3>
                        <p>Schiffe (Live)</p>
                    </div>
                </div>

                <h3 class="mt-4 mb-2" style="margin-top: 24px; margin-bottom: 12px; font-size: 1.1rem; color: #fff;">Aktive Datenquellen</h3>
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

function renderStatsPanel(stats: any) {
    return `
        <div class="panel mt-4">
            <div class="panel-header">
                <h2><i class="fa-solid fa-chart-pie"></i> /stats/today (Tages-Zähler)</h2>
                <div class="panel-header-actions">
                    <span class="badge badge-blue">${stats.day || 'Heute'}</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="card-grid">
                    <div class="card card-dashboard">
                        <h3>${(stats.adsbMessages || 0).toLocaleString()}</h3>
                        <p>ADS-B Messages</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${(stats.aisMessages || 0).toLocaleString()}</h3>
                        <p>AIS Messages</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${stats.aircraftSeen || 0} / <span style="color: var(--success);">+${stats.aircraftNew || 0}</span></h3>
                        <p>Aircraft Seen / New</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3>${stats.vesselsSeen || 0}</h3>
                        <p>Vessels Seen</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3 style="color: var(--success);">${(stats.metadataCacheHit || 0).toLocaleString()}</h3>
                        <p>Metadata Hits</p>
                    </div>
                    <div class="card card-dashboard">
                        <h3 style="color: #eab308;">${stats.metadataNotFound || 0}</h3>
                        <p>Metadata Misses</p>
                    </div>
                </div>
                <div style="margin-top: 16px; font-size: 0.85rem; color: var(--muted);">
                    Letztes Rollup Update in der Datenbank: ${stats.updatedAt ? new Date(stats.updatedAt).toLocaleTimeString() : 'Unbekannt'}
                </div>
            </div>
        </div>
    `;
}

function renderInfoPanel(info: any) {
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
                <h2><i class="fa-solid fa-circle-info"></i> /info (API Übersicht)</h2>
            </div>
            <div class="panel-body">
                <p><strong>Service:</strong> ${info.name}</p>
                <p><strong>API Version:</strong> <span class="badge badge-blue">${info.apiVersion}</span></p>
                <p><strong>Beschreibung:</strong> ${info.description}</p>
                
                <h3 style="margin-top: 24px; margin-bottom: 12px; font-size: 1.1rem; color: #fff;">Verfügbare Endpunkte</h3>
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
