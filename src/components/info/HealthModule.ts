/**
 * Renders the Service Health monitoring module.
 */
export const renderHealthModule = async (container: HTMLElement, signal: AbortSignal) => {
  const services = [
    { id: 'backend', name: 'Backend Core', url: '/api/ping.php', icon: 'fa-brands fa-php', description: 'Basis API-Infrastruktur' },
    { id: 'database', name: 'PostgreSQL Database', url: '/api/db.php', icon: 'fa-solid fa-database', description: 'PostGIS Datenbank Status' },
    { id: 'nah', name: 'NAH Service', url: '/api/nah.php', icon: 'fa-solid fa-helicopter', description: 'Luftrettung Echtzeit-Daten' },
    { id: 'tracking', name: 'Tracking Gateway', url: 'https://api.oe5ith.at/tracking/health', icon: 'fa-solid fa-satellite-dish', description: 'WebSocket Push Backend (V1.1) für ADS-B & AIS' },
    { id: 'ors', name: 'Routing API (ORS)', url: '/api/ors.php?path=status', icon: 'fa-solid fa-route', description: 'OpenRouteService Status' },
    { id: 'geocoder', name: 'Geocoder (Nominatim)', url: '/api/geocoder.php', icon: 'fa-solid fa-location-dot', description: 'Adress-Suche & Reverse Geocoding' },
    { id: 'tiles', name: 'Tile Registry', url: 'https://tiles.oe5ith.at/inventory.json', icon: 'fa-solid fa-layer-group', description: 'Karten-Layer Verzeichnis' }
  ];

  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Service <span>Health</span></h1>
        <p class="page-subtitle">Live-Monitor der technischen Dienste und APIs. Details in docs/API_ENDPOINTS.md.</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="health-meta">Initialisierung...</div>
        <button class="page-action" id="health-refresh-btn">
          <i class="fa-solid fa-sync"></i> Jetzt prüfen
        </button>
      </div>
    </header>

    <div class="content-body">
      <div class="card-grid mb-gap" id="health-list">
        ${services.map(s => `
          <div class="card card-dashboard" id="svc-${s.id}">
            <div class="card-status-dot unknown"></div>
            <h3>
              <i class="${s.icon} svc-card-icon"></i>
              <span>${s.name}</span>
            </h3>
            <p class="svc-info-line">${s.description}</p>
            <span class="svc-status-line unknown mono">-- ms</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const meta = container.querySelector('#health-meta')!;
  const refreshBtn = container.querySelector('#health-refresh-btn') as HTMLButtonElement;
  let refreshTimeout: any = null;

  const pingService = async (service: typeof services[0]) => {
    if (signal.aborted) return;
    const row = container.querySelector(`#svc-${service.id}`)!;
    const latencyEl = row.querySelector('.svc-status-line')!;
    const dot = row.querySelector('.card-status-dot')!;

    const start = performance.now();
    try {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 5000);
      
      let fetchSignal = timeoutController.signal;
      let abortHandler: (() => void) | undefined;
      if (AbortSignal.any) {
        fetchSignal = AbortSignal.any([signal, timeoutController.signal]);
      } else {
        abortHandler = () => timeoutController.abort();
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      const response = await fetch(service.url, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: fetchSignal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      if (abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }

      if (signal.aborted) return;

      const latency = Math.round(performance.now() - start);
      latencyEl.textContent = `${latency} ms`;
      
      dot.classList.remove('online', 'unknown', 'offline');
      latencyEl.classList.remove('online', 'unknown', 'offline');
      
      if (response.ok) {
        if (latency < 200) {
          dot.classList.add('online');
          latencyEl.classList.add('online');
        } else if (latency < 500) {
          dot.classList.add('unknown');
          latencyEl.classList.add('unknown');
        } else {
          dot.classList.add('offline');
          latencyEl.classList.add('offline');
        }
      } else {
        dot.classList.add('offline');
        latencyEl.classList.add('offline');
      }
    } catch (e: any) {
      if (e.name === 'AbortError' && signal.aborted) return;
      
      latencyEl.textContent = 'Error';
      dot.classList.remove('online', 'unknown', 'offline');
      latencyEl.classList.remove('online', 'unknown', 'offline');
      
      dot.classList.add('offline');
      latencyEl.classList.add('offline');
    }
  };

  const runAllChecks = async () => {
    if (signal.aborted || !container.isConnected) return;
    
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;
    meta.textContent = 'Prüfe...';

    await Promise.all(services.map(s => pingService(s)));

    if (signal.aborted || !container.isConnected) return;

    meta.textContent = `Stand: ${new Date().toLocaleTimeString()}`;
    refreshBtn.classList.remove('loading');
    refreshBtn.disabled = false;

    scheduleNext();
  };

  const scheduleNext = () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    if (signal.aborted || !container.isConnected) return;

    refreshTimeout = setTimeout(() => {
      runAllChecks();
    }, 30000);
  };

  refreshBtn.addEventListener('click', () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
    runAllChecks();
  });

  signal.addEventListener('abort', () => {
    if (refreshTimeout) clearTimeout(refreshTimeout);
  });

  runAllChecks();
};
