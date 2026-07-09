import { InventoryResponse } from '../../types/inventory';
import { Toast } from '../../lib/Toast';

/**
 * Renders the Map Inventory module.
 */
export const renderInventoryModule = async (container: HTMLElement, signal?: AbortSignal) => {
  container.innerHTML = `
    <header class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">Karten <span>Inventar</span></h1>
        <p class="page-subtitle">Verzeichnis der verfügbaren Karten-Layer, Schriftarten und Sprites.</p>
      </div>
      <div class="page-header-right">
        <div class="page-meta" id="inventory-meta">Lade Verzeichnis...</div>
        <button class="page-action" id="inventory-refresh-btn">
          <i class="fa-solid fa-sync"></i> Aktualisieren
        </button>
      </div>
    </header>

    <div class="content-body" id="inventory-content">
      <div class="text-center p-double-gap">
        <i class="fa-solid fa-circle-notch fa-spin"></i> Lade Karten-Inventar...
      </div>
    </div>
  `;

  const content = document.getElementById('inventory-content')!;
  const meta = document.getElementById('inventory-meta')!;
  const refreshBtn = document.getElementById('inventory-refresh-btn') as HTMLButtonElement;

  const fetchData = async () => {
    if (signal?.aborted || !container.isConnected) return;
    refreshBtn.classList.add('loading');
    refreshBtn.disabled = true;

    try {
      const response = await fetch('https://tiles.oe5ith.at/inventory.json', { signal });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data: InventoryResponse = await response.json();

      if (signal?.aborted || !container.isConnected) return;

      meta.textContent = `Stand: ${new Date(data.generated_at).toLocaleString()}`;
      renderData(data);
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;

      Toast.error('Fehler beim Laden des Karten-Inventars');
      content.innerHTML = `
        <div class="card card-warn">
          <strong>Fehler:</strong> Das Inventar konnte nicht geladen werden. Bitte versuchen Sie es später erneut.
        </div>
      `;
    } finally {
      if (!signal?.aborted) {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
      }
    }
  };

  const renderData = (data: InventoryResponse) => {
    const types = ['basemap', 'overlay', 'elevation'];
    const typeLabels: Record<string, string> = {
      'basemap': 'Basemaps',
      'overlay': 'Overlays',
      'elevation': 'Elevation'
    };

    let html = '';

    // Render Maps grouped by type
    types.forEach(type => {
      const maps = data.maps.filter(m => m.type === type);
      if (maps.length === 0) return;

      html += `
        <h2 class="t-h2 mt-0">${typeLabels[type]}</h2>
        <div class="card-grid mb-1-5-gap">
          ${maps.map(map => `
            <div class="card">
              <div class="card-content-header">
                <h3 title="${map.name}">${map.name}</h3>
                <span class="card-badge">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </div>
              <p class="t-body">
                Projekt: <strong>${map.project}</strong><br>
                Größe: ${map.file.stats.size_str}
              </p>
              <span class="t-url" title="${map.file.url}">${map.file.url}</span>
            </div>
          `).join('')}
        </div>
      `;
    });

    // Render Assets (Fonts & Sprites)
    html += `<h2 class="t-h2">Assets</h2>`;
    html += `<div class="card-grid">`;

    // Fonts Card
    html += `
      <div class="card">
        <div class="card-content-header">
          <h3>Schriftarten</h3>
          <span class="card-badge">Fonts</span>
        </div>
        <div class="t-small mt-12">
          ${data.fonts.map(f => `
            <div class="mb-8">
              <div class="t-white font-semibold">${f.family}</div>
              <div>${f.variants.length} Varianten</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Sprites Card
    html += `
      <div class="card">
        <div class="card-content-header">
          <h3>Icon Sprites</h3>
          <span class="card-badge">Sprites</span>
        </div>
        <div class="t-small mt-12">
          ${data.sprites.map(s => `
            <div class="flex-align-center gap-10 mb-8">
              <img src="${s.preview}" class="sprite-preview-img">
              <span>${s.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    html += `</div>`; // end Assets grid

    content.innerHTML = html;
  };

  refreshBtn.addEventListener('click', fetchData);
  fetchData();
};
