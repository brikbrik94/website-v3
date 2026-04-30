import { toggleTerrain, toggleHillshade, terrainEnabled, hillshadeEnabled } from '../lib/TerrainManager';

export const TerrainControls = {
  getHtml(): string {
    return `
      <button class="topbar-toggle btn-terrain ${terrainEnabled ? 'active' : ''}" aria-pressed="${terrainEnabled}">
        <span class="topbar-toggle-indicator"></span>
        3D
      </button>
      <button class="topbar-toggle btn-hillshade ${hillshadeEnabled ? 'active' : ''}" aria-pressed="${hillshadeEnabled}">
        <span class="topbar-toggle-indicator"></span>
        Hillshade
      </button>
    `;
  },

  _listenersInitialized: false,

  initListeners() {
    if ((this as any)._listenersInitialized) return;

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      const btnTerrain = target.closest('.btn-terrain');
      if (btnTerrain) {
        const active = toggleTerrain();
        this.syncButtons('btn-terrain', active);
        return;
      }

      const btnHillshade = target.closest('.btn-hillshade');
      if (btnHillshade) {
        const active = toggleHillshade();
        this.syncButtons('btn-hillshade', active);
        return;
      }
    });

    (this as any)._listenersInitialized = true;
  },

  syncButtons(className: string, active: boolean) {
    document.querySelectorAll(`.${className}`).forEach(btn => {
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active.toString());
    });
  }
};
