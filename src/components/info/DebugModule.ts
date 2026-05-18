import { Toast } from '../../lib/Toast';

/**
 * Renders the API Debug technical playground.
 */
export const renderDebugModule = async (container: HTMLElement, signal?: AbortSignal) => {
  const safeEndpoints = [
    { name: 'NAH Stations', url: '/api/nah.php', params: '' },
    { name: 'Tracking Health', url: 'https://api.oe5ith.at/tracking/health', params: '' },
    { name: 'Regional Stats', url: '/api/stats.php', params: '' },
    { name: 'Service Health', url: '/api/ping.php', params: '' },
    { name: 'Database Status', url: '/api/db.php', params: '' },
    { name: 'ORS Health', url: '/api/ors.php?path=health', params: '' }
  ];

  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">API <span>Debug</span></h1>
        <p class="page-subtitle">Technischer Playground zur Inspektion von Rohdaten (Read-Only).</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta">Sandbox Mode</div>
      </div>
    </header>

    <div class="content-body">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title"><i class="fa-solid fa-sliders"></i> Abfrage-Parameter</div>
        </div>
        <div class="panel-body">
          <div class="form-row">
            <div class="form-field" style="flex: 1; min-width: 200px;">
              <label class="form-label" for="debug-endpoint">Endpoint</label>
              <select class="form-select" id="debug-endpoint">
                ${safeEndpoints.map(e => `<option value="${e.url}">${e.name} (${e.url})</option>`).join('')}
              </select>
            </div>
            <div class="form-field" style="flex: 2; min-width: 200px;">
              <label class="form-label" for="debug-params">Parameters (optional)</label>
              <input type="text" class="form-input mono" id="debug-params" placeholder="?key=val&..." value="">
            </div>
            <button class="btn btn-primary" id="debug-send-btn">
              <i class="fa-solid fa-play"></i> Senden
            </button>
          </div>
        </div>
      </div>

      <div id="debug-response-container" style="display: none;">
        <div class="panel panel-code">
          <div class="panel-header">
            <div class="panel-title">
              <i class="fa-solid fa-code"></i> API Response
            </div>
            <div class="panel-header-right">
              <span id="debug-status" class="badge">---</span>
              <span id="debug-latency" class="panel-meta">-- ms</span>
              <button class="btn btn-sm btn-ghost" id="debug-copy-btn">
                <i class="fa-solid fa-copy"></i> Kopieren
              </button>
            </div>
          </div>
          <pre id="debug-json-viewer" class="code-viewer-pre"></pre>
        </div>
      </div>

      <div id="debug-empty-state">
        <div class="card-info">
          <i class="fa-solid fa-terminal" style="margin-right: 8px;"></i>
          <strong>Hinweis:</strong> Wähle einen Endpunkt und klicke auf <code class="t-code">Senden</code>, um die API-Analyse zu starten.
        </div>
      </div>
    </div>
  `;

  const endpointSelect = document.getElementById('debug-endpoint') as HTMLSelectElement;
  const paramsInput = document.getElementById('debug-params') as HTMLInputElement;
  const sendBtn = document.getElementById('debug-send-btn') as HTMLButtonElement;
  const responseContainer = document.getElementById('debug-response-container')!;
  const emptyState = document.getElementById('debug-empty-state')!;
  const jsonViewer = document.getElementById('debug-json-viewer')!;
  const statusBadge = document.getElementById('debug-status')!;
  const latencyEl = document.getElementById('debug-latency')!;
  const copyBtn = document.getElementById('debug-copy-btn')!;

  let lastResponse: any = null;

  const runRequest = async () => {
    const url = endpointSelect.value + paramsInput.value;
    
    sendBtn.classList.add('loading');
    sendBtn.disabled = true;
    emptyState.style.display = 'none';
    responseContainer.style.display = 'block';
    jsonViewer.textContent = '// Requesting data...';
    
    const start = performance.now();
    try {
      const response = await fetch(url, { signal });
      const latency = Math.round(performance.now() - start);
      
      statusBadge.textContent = `${response.status} ${response.statusText}`;
      statusBadge.className = `badge ${response.ok ? 'badge-green' : 'badge-red'}`;
      latencyEl.textContent = `${latency} ms`;
      
      const data = await response.json();
      
      // Basic sanitization: never show anything named "pass", "key", "token" or "secret"
      // while our APIs don't return these, this is a safety layer.
      const sanitized = JSON.parse(JSON.stringify(data, (key, value) => {
        const k = key.toLowerCase();
        if (k.includes('pass') || k.includes('key') || k.includes('token') || k.includes('secret')) {
          return '******** [REDACTED]';
        }
        return value;
      }));

      lastResponse = sanitized;
      jsonViewer.textContent = JSON.stringify(sanitized, null, 2);
    } catch (error: any) {
      statusBadge.textContent = 'ERROR';
      statusBadge.className = 'badge badge-red';
      latencyEl.textContent = '-- ms';
      jsonViewer.textContent = `Error: ${error.message}`;
    } finally {
      sendBtn.classList.remove('loading');
      sendBtn.disabled = false;
    }
  };

  sendBtn.addEventListener('click', runRequest);

  copyBtn.addEventListener('click', () => {
    if (lastResponse) {
      navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2));
      Toast.success('JSON in die Zwischenablage kopiert');
    }
  });
};
