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

        const uptime = Math.floor(system.uptimeSec / 3600);
        const mem = system.process.memoryMiB.toFixed(1);
        
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
                            <span class="status-row-value">${system.clients}</span>
                        </div>
                        <div class="status-row">
                            <span class="status-row-name">Load (Entities)</span>
                            <span class="status-row-value">${system.entities}</span>
                        </div>
                    </div>
                    
                    <div class="tool-sep"></div>
                    
                    <div style="overflow-x: auto;">
                        <table class="popup-kv" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th class="t-label" style="text-align: left; padding: 4px;">Source</th>
                                    <th class="t-label" style="text-align: left; padding: 4px;">Typ</th>
                                    <th class="t-label" style="text-align: left; padding: 4px;">Status</th>
                                    <th class="t-label" style="text-align: left; padding: 4px;">Last Data</th>
                                    <th class="t-label" style="text-align: left; padding: 4px;">Info</th>
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
