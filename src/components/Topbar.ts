import { MapItem } from '../types/inventory';
import { TerrainControls } from './TerrainControls';
import { BasemapStore } from '../lib/BasemapStore';
import { renderTopbarNav } from './TopbarNav';
import { HELP_CONTENT } from '../content/HelpContent';

export interface CustomAction {
  id: string;
  icon: string;
  title: string;
  onClick: (isActive: boolean) => void;
}

export const initTopbar = (
  container: HTMLElement,
  basemaps: MapItem[],
  onBasemapChange: (url: string, name: string) => void,
  onLegendToggle?: (isActive: boolean) => void,
  customActions: CustomAction[] = []
) => {
  const hasMap = basemaps.length > 0;
  const currentPath = window.location.pathname;
  const helpEntry = HELP_CONTENT[currentPath];

  const customActionsHtml = customActions.map(action => `
    <button class="topbar-toggle topbar-toggle--icon-only btn-custom" 
            id="btn-${action.id}" 
            data-tooltip="${action.title}">
      <i class="${action.icon}"></i>
      <span class="topbar-toggle-label">${action.title}</span>
    </button>
  `).join('');

  const currentBasemapUrl = BasemapStore.get();
  const activeBasemap = basemaps.find(m => m.style.url === currentBasemapUrl) || basemaps[0];

  const basemapOptions = basemaps.map((m) => `
    <div class="topbar-dropdown-item ${m.style.url === currentBasemapUrl ? 'active' : ''}" data-style="${m.style.url}" data-name="${m.name}">
      ${m.name}
    </div>
  `).join('');

  const customActionsMobileHtml = customActions.map(action => `
    <button class="topbar-toggle btn-custom" id="btn-${action.id}-mobile">
      <i class="${action.icon}"></i> 
      <span class="topbar-toggle-label">${action.title}</span>
    </button>
  `).join('');

  const terrainHtml = hasMap ? TerrainControls.getHtml() : '';

  const dropdownHtml = (_isMobile = false) => `
    <div class="topbar-dropdown basemap-dropdown">
      <button class="topbar-dropdown-toggle basemap-toggle" aria-haspopup="listbox" aria-expanded="false">
        <span class="dropdown-label">${activeBasemap?.name || 'Basemap'}</span>
        <span class="chevron">▾</span>
      </button>
      <div class="topbar-dropdown-menu basemap-menu" role="listbox">
        ${basemapOptions}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div class="controls-backdrop" id="controls-backdrop"></div>
    <header class="topbar">
      <div class="topbar-left">
        <a href="/" class="brand nav-link" title="Zur Startseite">
          <img src="/logo.svg" alt="Logo" class="brand-logo" />
          <span class="brand-text">OE5ITH</span>
        </a>
      </div>

      <div class="topbar-center">
        ${hasMap ? `
          <!-- Desktop View -->
          <div class="controls-panel desktop-only">
            ${dropdownHtml()}
            ${terrainHtml}
            ${customActionsHtml}
            <button class="topbar-toggle topbar-toggle--icon-only btn-legend" data-tooltip="Legende">
              <i class="fa-solid fa-list-ul"></i>
              <span class="topbar-toggle-label">Legende</span>
            </button>
            ${helpEntry ? `
            <button class="topbar-toggle topbar-toggle--icon-only btn-help" data-tooltip="Hilfe">
              <i class="fa-solid fa-circle-question"></i>
              <span class="topbar-toggle-label">Hilfe</span>
            </button>
            ` : ''}
          </div>

          <!-- Tablet Toggle -->
          <button class="controls-toggle tablet-only" id="controls-toggle-tablet">
            <div class="slider-icon"><span></span><span></span><span></span></div>
            <span class="controls-toggle-text">Tools</span>
          </button>
        ` : ''}
      </div>

      <div class="topbar-right">
        ${renderTopbarNav(currentPath)}

        ${hasMap ? `
          <!-- Mobile Toggle -->
          <button class="controls-toggle mobile-only" id="controls-toggle-mobile" aria-label="Tools">
            <div class="slider-icon"><span></span><span></span><span></span></div>
          </button>
        ` : ''}
      </div>

      ${hasMap ? `
      <div class="controls-overlay" id="controls-overlay">
        <!-- 1. Dropdowns -->
        <div class="form-field">
          <label class="overlay-section-label">Basemap</label>
          ${dropdownHtml(true)}
        </div>

        <div class="controls-sep"></div>

        <!-- 2. Terrain & Tools Grid -->
        <div class="controls-btn-group">
          ${terrainHtml}
          ${customActionsMobileHtml}
          <button class="topbar-toggle btn-legend">
            <i class="fa-solid fa-list-ul"></i> 
            <span class="topbar-toggle-label">Legende</span>
          </button>
          ${helpEntry ? `
          <button class="topbar-toggle btn-help">
            <i class="fa-solid fa-circle-question"></i>
            <span class="topbar-toggle-label">Hilfe</span>
          </button>
          ` : ''}
        </div>
      </div>
      ` : ''}
    </header>
  `;

  if (hasMap) {
    const controlsOverlay = document.getElementById('controls-overlay')!;
    const controlsBackdrop = document.getElementById('controls-backdrop')!;
    
    // Toggle Overlay
    const setControls = (open: boolean) => {
      controlsOverlay.classList.toggle('open', open);
      controlsBackdrop.classList.toggle('visible', open);
      document.querySelectorAll('.controls-toggle').forEach(t => t.classList.toggle('active', open));
    };

    document.querySelectorAll('.controls-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setControls(!controlsOverlay.classList.contains('open'));
      });
    });

    controlsBackdrop.addEventListener('click', () => setControls(false));

    // Listeners for Basemap Dropdowns (Multiple instances)
    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      const toggleBtn = target.closest('.basemap-toggle');
      if (toggleBtn) {
        e.stopPropagation();
        const menu = toggleBtn.nextElementSibling as HTMLElement;
        const isOpen = !menu.classList.contains('open');
        
        // Close all basemap menus first
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
        
        // Update all UIs
        document.querySelectorAll('.basemap-toggle .dropdown-label').forEach(el => {
          el.textContent = name;
        });
        document.querySelectorAll('.topbar-dropdown-item').forEach(i => {
          i.classList.toggle('active', i.getAttribute('data-style') === styleUrl);
        });
        
        document.querySelectorAll('.basemap-menu').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.basemap-toggle').forEach(t => t.classList.remove('open'));
        
        BasemapStore.set(styleUrl);
        onBasemapChange(styleUrl, name);
        return;
      }

      // Close menus on click outside
      document.querySelectorAll('.basemap-menu').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.basemap-toggle').forEach(t => t.classList.remove('open'));
    });

    // Legend Toggle with Sync
    const handleLegendToggle = () => {
      const legendBtns = document.querySelectorAll('.btn-legend');
      const isNowActive = !legendBtns[0]?.classList.contains('active');
      
      legendBtns.forEach(btn => btn.classList.toggle('active', isNowActive));
      if (onLegendToggle) onLegendToggle(isNowActive);
    };

    container.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-legend')) {
        handleLegendToggle();
      }
    });

    // Help Button Listener (öffnet seiten-spezifisches Hilfe-Modal)
    document.querySelectorAll('.btn-help').forEach((btn) => {
      btn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-help')));
    });

    // Custom Actions Listeners
    customActions.forEach(action => {
      const btns = [
        document.getElementById(`btn-${action.id}`),
        document.getElementById(`btn-${action.id}-mobile`)
      ];

      btns.forEach(btn => {
        btn?.addEventListener('click', (e) => {
          e.stopPropagation();
          const isNowActive = !btn.classList.contains('active');
          
          // Sync all buttons for this action
          btns.forEach(b => b?.classList.toggle('active', isNowActive));
          
          action.onClick(isNowActive);
        });
      });
    });

    // Initialize Terrain listeners
    TerrainControls.initListeners();
  }

  // --- Navigation Dropdown Logic (Site-wide) ---
  const navToggle = document.getElementById('nav-dropdown-toggle');
  const navMenu = document.getElementById('nav-dropdown-menu');

  console.log(`[Topbar] Navigation elements found: toggle=${!!navToggle}, menu=${!!navMenu}`);

  if (navToggle && navMenu) {
    // Cleanup old listeners if this is a re-init (basic way for SPA)
    const newToggle = navToggle.cloneNode(true);
    navToggle.parentNode?.replaceChild(newToggle, navToggle);
    
    newToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = (newToggle as HTMLElement).classList.toggle('open');
      navMenu.classList.toggle('open', isOpen);
      (newToggle as HTMLElement).setAttribute('aria-expanded', isOpen.toString());
      console.log(`[Topbar] Nav dropdown toggled: ${isOpen}`);
    });

    const handleOutsideClick = (e: MouseEvent) => {
      if (!newToggle.contains(e.target as Node) && !navMenu.contains(e.target as Node)) {
        (newToggle as HTMLElement).classList.remove('open');
        navMenu.classList.remove('open');
        (newToggle as HTMLElement).setAttribute('aria-expanded', 'false');
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        (newToggle as HTMLElement).classList.remove('open');
        navMenu.classList.remove('open');
        (newToggle as HTMLElement).setAttribute('aria-expanded', 'false');
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleEsc);
  }
};
