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
        const mem = system.process?.memoryMiB ? system.process.memoryMiB.toFixed(1) : '---';

        const sourceRows = sources.map(s => `
            <tr>
                <td>${s.id}</td>
                <td><span class="badge badge-gray">${s.kind.toUpperCase()}</span></td>
                <td><span class="status-dot ${s.state === 'online' ? 'on' : s.state === 'degraded' ? 'warn' : 'off'}"></span> ${s.state}</td>
                <td class="mono t-small">${s.lastDataAt ? new Date(s.lastDataAt).toLocaleTimeString() : '---'}</td>
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
                            <span class="status-row-value">${mem} MiB</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Clients</span>
                            <span class="status-row-value">${system.clients ?? 0}</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Load (Entities)</span>
                            <span class="status-row-value">${system.entities ?? 0}</span>
                        </div>
                    </div>
    ...
                    <div class="tool-sep"></div>
                    
                    <div class="table-wrapper">
                        <table class="popup-kv w-full border-collapse">
                            <thead>
                                <tr>
                                    <th class="t-label text-left tbl-cell-pad-4">Source</th>
                                    <th class="t-label text-left tbl-cell-pad-4">Typ</th>
                                    <th class="t-label text-left tbl-cell-pad-4">Status</th>
                                    <th class="t-label text-left tbl-cell-pad-4">Last Data</th>
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
