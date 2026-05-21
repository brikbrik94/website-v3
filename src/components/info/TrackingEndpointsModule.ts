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
            <td><span class="badge ${s.kind === 'adsb' ? 'bg-primary' : 'bg-info'}">${(s.kind || 'unknown').toUpperCase()}</span></td>
            <td class="font-mono">${s.id}</td>
            <td><span class="status-indicator ${s.state === 'online' ? 'status-ok' : 'status-error'}"></span> ${s.state}</td>
            <td class="text-right">${new Date(s.lastDataAt).toLocaleTimeString()}</td>
        </tr>
    `).join('');

    return `
        <div class="panel">
            <div class="panel-header">
                <h2><i class="fa-solid fa-heart-pulse"></i> /health (Live Status)</h2>
            </div>
            <div class="panel-body">
                <div class="metric-grid mb-4">
                    <div class="metric-card">
                        <div class="metric-label">Gateway Status</div>
                        <div class="metric-value ${health.status === 'ok' ? 'text-success' : 'text-danger'}">${(health.status || 'unknown').toUpperCase()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Uptime</div>
                        <div class="metric-value">${formatUptime(sys.uptimeSec || 0)}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Memory (RSS+Heap)</div>
                        <div class="metric-value">${memTotal} MB</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Decoded / Min</div>
                        <div class="metric-value">${(sys.totals?.decodedPerMinute || 0).toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Flugzeuge (Live)</div>
                        <div class="metric-value">${health.aircraft || 0}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Schiffe (Live)</div>
                        <div class="metric-value">${health.vessels || 0}</div>
                    </div>
                </div>

                <h3 class="mt-4 mb-2">Aktive Datenquellen</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Typ</th>
                                <th>Source ID</th>
                                <th>Status</th>
                                <th class="text-right">Letztes Paket</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sourceRows || '<tr><td colspan="4" class="text-center">Keine Quellen</td></tr>'}
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
                    <span class="badge bg-secondary">${stats.day || 'Heute'}</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-label">ADS-B Messages</div>
                        <div class="metric-value">${(stats.adsbMessages || 0).toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">AIS Messages</div>
                        <div class="metric-value">${(stats.aisMessages || 0).toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Aircraft Seen / New</div>
                        <div class="metric-value">${stats.aircraftSeen || 0} / <span class="text-success">+${stats.aircraftNew || 0}</span></div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Vessels Seen</div>
                        <div class="metric-value">${stats.vesselsSeen || 0}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Metadata Hits</div>
                        <div class="metric-value text-success">${(stats.metadataCacheHit || 0).toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Metadata Misses</div>
                        <div class="metric-value text-warning">${stats.metadataNotFound || 0}</div>
                    </div>
                </div>
                <div class="text-muted mt-3" style="font-size: 0.85em;">
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
            <td><span class="badge bg-dark">${e.method || 'WS'}</span></td>
            <td class="font-mono"><strong>${e.path}</strong></td>
            <td>${e.description}</td>
        </tr>
    `).join('');

    return `
        <div class="panel mt-4 mb-4">
            <div class="panel-header">
                <h2><i class="fa-solid fa-circle-info"></i> /info (API Übersicht)</h2>
            </div>
            <div class="panel-body">
                <p><strong>Service:</strong> ${info.name}</p>
                <p><strong>API Version:</strong> <span class="badge bg-primary">${info.apiVersion}</span></p>
                <p><strong>Beschreibung:</strong> ${info.description}</p>
                
                <h3 class="mt-4 mb-2">Verfügbare Endpunkte</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Methode</th>
                                <th>Pfad</th>
                                <th>Beschreibung</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="3" class="text-center">Keine Endpunkte</td></tr>'}
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
