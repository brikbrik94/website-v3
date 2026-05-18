import { toggleTerrain, toggleHillshade, toggleContours, terrainEnabled, hillshadeEnabled, contoursEnabled } from '../lib/TerrainManager';

export const TerrainControls = {
  getHtml(): string {
    return `
      <button class="topbar-toggle topbar-toggle--icon-only btn-terrain ${terrainEnabled ? 'active' : ''}" 
              data-tooltip="Gelände (3D)" 
              aria-pressed="${terrainEnabled}">
        <i class="fa-solid fa-cube"></i>
        <span class="topbar-toggle-label">Gelände (3D)</span>
      </button>
      <button class="topbar-toggle topbar-toggle--icon-only btn-hillshade ${hillshadeEnabled ? 'active' : ''}" 
              data-tooltip="Höhenschatten" 
              aria-pressed="${hillshadeEnabled}">
        <i class="fa-solid fa-mountain"></i>
        <span class="topbar-toggle-label">Höhenschatten</span>
      </button>
      <button class="topbar-toggle topbar-toggle--icon-only btn-contours ${contoursEnabled ? 'active' : ''}" 
              data-tooltip="Höhenlinien" 
              aria-pressed="${contoursEnabled}">
        <i class="fa-solid fa-lines-leaning"></i>
        <span class="topbar-toggle-label">Höhenlinien</span>
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

      const btnContours = target.closest('.btn-contours');
      if (btnContours) {
        const active = toggleContours();
        this.syncButtons('btn-contours', active);
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
