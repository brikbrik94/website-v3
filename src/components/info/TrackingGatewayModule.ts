import { SourceStatus, SystemTelemetry } from '../../types/tracking';

export class TrackingGatewayModule {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.renderInitial();
    }

    private renderInitial() {
        this.container.innerHTML = `
            <div class="info-module">
                <h3><i class="fa-solid fa-server"></i> Tracking Gateway</h3>
                <div class="info-module-content">
                    <p class="t-small">Warte auf Telemetrie-Daten vom Gateway...</p>
                </div>
            </div>
        `;
    }

    public update(sources: SourceStatus[], system?: SystemTelemetry) {
        if (!system) return;

        const uptime = system.uptimeSec ? Math.floor(system.uptimeSec / 3600) : 0;
        const rss = system.process?.rssMb ? system.process.rssMb.toFixed(1) : '---';
        const heap = system.process?.heapUsedMb ? system.process.heapUsedMb.toFixed(1) : '---';
        
        const entitiesTotal = (system.entities?.aircraft || 0) + (system.entities?.vessels || 0);
        const entitiesDetails = `A: ${system.entities?.aircraft || 0} | V: ${system.entities?.vessels || 0}`;

        const msgRate = system.totals?.messagesPerMinute || 0;
        const decRate = system.totals?.decodedPerMinute || 0;

        const sourceRows = sources.map(s => `
            <tr>
                <td>${s.id}</td>
                <td><span class="badge badge-gray">${s.kind.toUpperCase()}</span></td>
                <td><span class="status-dot ${s.state === 'online' ? 'on' : s.state === 'degraded' ? 'warn' : 'off'}"></span> ${s.state}</td>
                <td class="mono t-small">${s.lastDataAt ? new Date(s.lastDataAt).toLocaleTimeString() : '---'}</td>
                <td class="t-small text-right">${s.decodedPerMinute || 0}/m</td>
                <td class="t-small">${s.message || '-'}</td>
            </tr>
        `).join('');

        this.container.innerHTML = `
            <div class="info-module" id="tracking-gateway-module">
                <h3><i class="fa-solid fa-server"></i> Tracking Gateway</h3>
                <div class="info-module-content">
                    <div class="status-panel mb-gap">
                        <div class="status-row">
                            <span class="status-row-name">Uptime</span>
                            <span class="status-row-value">${uptime}h</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Memory</span>
                            <span class="status-row-value">${rss} MiB (RSS) / ${heap} MiB (Heap)</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Clients</span>
                            <span class="status-row-value">${system.clients ?? 0}</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Load (Entities)</span>
                            <span class="status-row-value">${entitiesTotal} <span class="t-small">(${entitiesDetails})</span></span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Performance</span>
                            <span class="status-row-value">${decRate} / ${msgRate} msg/m</span>
                        </div>
                    </div>
                    
                    <div class="tool-sep"></div>
                    
                    <div class="table-wrapper">
                        <table class="popup-kv w-full border-collapse">
                            <thead>
                                <tr>
                                    <th class="t-label text-left tbl-cell-pad-4">Source</th>
                                    <th class="t-label text-left tbl-cell-pad-4">Typ</th>
                                    <th class="t-label text-left tbl-cell-pad-4">Status</th>
                                    <th class="t-label text-left tbl-cell-pad-4">Last Data</th>
                                    <th class="t-label text-right tbl-cell-pad-4">Rate</th>
                                    <th class="t-label text-left tbl-cell-pad-4">Info</th>
                                </tr>
                            </thead>
                            <tbody>${sourceRows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
}
