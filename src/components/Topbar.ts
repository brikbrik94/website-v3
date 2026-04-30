import { MapItem } from '../pages/MapPage';
import { TerrainControls } from './TerrainControls';

export const initTopbar = (
  container: HTMLElement,
  basemaps: MapItem[],
  onBasemapChange: (url: string, name: string) => void
) => {
  const basemapOptions = basemaps.map((m, i) => `
    <div class="topbar-dropdown-item ${i === 0 ? 'active' : ''}" data-style="${m.style.url}" data-name="${m.name}">
      ${m.name}
    </div>
  `).join('');

  const terrainHtml = TerrainControls.getHtml();

  const currentPath = window.location.pathname;

  container.innerHTML = `
    <div class="controls-backdrop" id="controls-backdrop"></div>
    <header class="topbar">
      <div class="topbar-left">
        <a href="/" class="brand nav-link">
          <img src="/src/assets/logo.svg" alt="Logo" class="brand-logo" />
          <span class="brand-text">OE5ITH</span>
        </a>
      </div>
      <div class="topbar-center">
        <button class="controls-toggle" id="controls-toggle">
          <div class="slider-icon"><span></span><span></span><span></span></div>
          <span class="controls-toggle-text">Tools</span>
        </button>

        <div class="controls-panel" id="controls-panel">
          <div class="topbar-dropdown" id="basemap-dropdown-wrap">
            <button class="topbar-dropdown-toggle basemap-toggle" aria-haspopup="listbox" aria-expanded="false" style="width: 180px;">
              <span class="dropdown-label">${basemaps[0]?.name || 'Basemap'}</span>
              <span class="chevron">▾</span>
            </button>
            <div class="topbar-dropdown-menu basemap-menu" role="listbox">
              ${basemapOptions}
            </div>
          </div>
          ${terrainHtml}
        </div>
      </div>
      <div class="topbar-right">
        <a href="/karte" class="topbar-nav-link nav-link ${currentPath === '/karte' ? 'active' : ''}">Karte</a>
        <a href="/routing" class="topbar-nav-link nav-link ${currentPath === '/routing' ? 'active' : ''}">Routing</a>
        <a href="/nah" class="topbar-nav-link nav-link ${currentPath === '/nah' ? 'active' : ''}">Luftrettung</a>
      </div>

      <div class="controls-overlay" id="controls-overlay">
        <!-- Wird für Mobile befüllt -->
      </div>
    </header>
  `;

  const controlsToggle = document.getElementById('controls-toggle')!;
  const controlsOverlay = document.getElementById('controls-overlay')!;
  const controlsBackdrop = document.getElementById('controls-backdrop')!;

  const setControls = (open: boolean) => {
    controlsOverlay.classList.toggle('open', open);
    controlsToggle.classList.toggle('active', open);
    controlsBackdrop.classList.toggle('visible', open);
  };

  controlsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setControls(!controlsOverlay.classList.contains('open'));
  });
  
  controlsBackdrop.addEventListener('click', () => setControls(false));

  TerrainControls.initListeners();

  const updateBasemapUI = (name: string, styleUrl: string) => {
    document.querySelectorAll('.basemap-toggle .dropdown-label').forEach(el => {
      el.textContent = name;
    });
    document.querySelectorAll('.topbar-dropdown-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-style') === styleUrl);
    });
    document.querySelectorAll('.basemap-menu').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.basemap-toggle').forEach(t => t.classList.remove('open'));
  };

  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    const toggleBtn = target.closest('.basemap-toggle');
    if (toggleBtn) {
      e.stopPropagation();
      const menu = toggleBtn.nextElementSibling as HTMLElement;
      const isOpen = !menu.classList.contains('open');
      document.querySelectorAll('.basemap-menu').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.basemap-toggle').forEach(t => t.classList.remove('open'));
      menu.classList.toggle('open', isOpen);
      toggleBtn.classList.toggle('open', isOpen);
      return;
    }

    const item = target.closest('.topbar-dropdown-item') as HTMLElement;
    if (item) {
      const styleUrl = item.getAttribute('data-style')!;
      const name = item.getAttribute('data-name')!;
      updateBasemapUI(name, styleUrl);
      onBasemapChange(styleUrl, name);
      return;
    }

    document.querySelectorAll('.basemap-menu').forEach(m => m.classList.remove('open'));
    document.querySelectorAll('.basemap-toggle').forEach(t => t.classList.remove('open'));
  });

  // Mobile Overlay befüllen
  const buildOverlay = () => {
    controlsOverlay.innerHTML = `
      <div style="font-size:0.65rem; font-weight:700; color:var(--subtle); text-transform:uppercase; margin-bottom:8px;">Basemap</div>
      <div class="topbar-dropdown" style="width:100%">
        <button class="topbar-dropdown-toggle basemap-toggle" style="width:100%">
          <span class="dropdown-label">${basemaps[0]?.name || 'Basemap'}</span>
          <span class="chevron">▾</span>
        </button>
        <div class="topbar-dropdown-menu basemap-menu" style="width:100%">
          ${basemapOptions}
        </div>
      </div>
      <div style="height:1px; background:var(--border); margin:12px 0;"></div>
      <div style="font-size:0.65rem; font-weight:700; color:var(--subtle); text-transform:uppercase; margin-bottom:8px;">Gelände</div>
      <div style="display:flex; gap:8px;">
        ${terrainHtml}
      </div>
    `;
  };
  buildOverlay();
};
