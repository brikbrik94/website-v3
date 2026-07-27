import './app.css';
import { initGlobalModals } from './lib/GlobalModals';
import { APP_VERSION } from './version';

import { MapRegistry } from './lib/MapRegistry';
import { OverlayLoader } from './lib/OverlayLoader';
import type { PageController } from './core/PageController';
import { renderTopbarNav } from './components/TopbarNav';

// Global Modals initialisieren
initGlobalModals();

const app = document.querySelector<HTMLDivElement>('#app');

/**
 * Navigations-Helper für Path-Routing
 */
export const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  router();
};

const renderLandingPage = () => {
  if (!app) return;
  
  const currentPath = window.location.pathname;

  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-left">
        <a href="/" class="brand nav-link" title="Zur Startseite">
          <img src="/logo.svg" alt="OE5ITH Logo" class="brand-logo" />
          <span class="brand-text">OE5ITH</span>
        </a>
      </div>
      <div class="topbar-center"></div>
      <div class="topbar-right">
        ${renderTopbarNav(currentPath)}
      </div>
    </header>

    <div class="layout">
      <main class="page-content landing-body">
        <h1 class="landing-title">Willkommen im <span>GeoPortal</span></h1>
        
        <div class="card-grid">
          <a href="/karte" class="card card-nav nav-link">
            <div class="card-nav-icon"><i class="fa-solid fa-map-location-dot"></i></div>
            <h3>Karte</h3>
            <p>Interaktive Vektorkarte basierend auf dem neuen Geodata-Server.</p>
            <span class="card-nav-btn"><i class="fa-solid fa-arrow-right"></i> Öffnen</span>
          </a>

          <a href="/routing" class="card card-nav nav-link">
            <div class="card-nav-icon"><i class="fa-solid fa-route"></i></div>
            <h3>Routing</h3>
            <p>Berechne die optimale Route zwischen zwei Punkten über den OE5ITH ORS Dienst.</p>
            <span class="card-nav-btn"><i class="fa-solid fa-arrow-right"></i> Öffnen</span>
          </a>

          <a href="/nah" class="card card-nav nav-link">
            <div class="card-nav-icon"><i class="fa-solid fa-helicopter"></i></div>
            <h3>Luftrettung</h3>
            <p>Übersicht der NAH-Stützpunkte und Live-Verfügbarkeit.</p>
            <span class="card-nav-btn"><i class="fa-solid fa-arrow-right"></i> Öffnen</span>
          </a>

          <a href="/coords" class="card card-nav nav-link">
            <div class="card-nav-icon"><i class="fa-solid fa-compass"></i></div>
            <h3>Umrechner</h3>
            <p>Koordinaten bidirektional zwischen WGS84, UTM, BMN, MGRS und Maidenhead umrechnen.</p>
            <span class="card-nav-btn"><i class="fa-solid fa-arrow-right"></i> Öffnen</span>
          </a>

          <a href="/tracking" class="card card-nav nav-link">
            <div class="card-nav-icon"><i class="fa-solid fa-satellite-dish"></i></div>
            <h3>Live Tracking</h3>
            <p>Echtzeit-Anzeige von Flugzeugen (ADS-B) und Schiffen (AIS) in der Region.</p>
            <span class="card-nav-btn"><i class="fa-solid fa-arrow-right"></i> Öffnen</span>
          </a>

          <a href="/isochrones" class="card card-nav nav-link">
            <div class="card-nav-icon"><i class="fa-solid fa-bullseye"></i></div>
            <h3>Isochronen</h3>
            <p>Erreichbarkeitsanalyse: welches Gebiet ist von einem Punkt aus in X Minuten oder km erreichbar?</p>
            <span class="card-nav-btn"><i class="fa-solid fa-arrow-right"></i> Öffnen</span>
          </a>
        </div>

        <footer class="page-footer">
          <span class="page-footer-version">v${APP_VERSION}</span>
          <span class="page-footer-copy">© 2026 OE5ITH</span>
          <div class="page-footer-links">
            <a href="#" onclick="window.dispatchEvent(new CustomEvent('open-copyright'))">Lizenzen & Impressum</a>
            <a href="https://github.com/brikbrik94/website-v3" target="_blank">GitHub</a>
          </div>
        </footer>
      </main>
    </div>
  `;

  // Attach dropdown logic for landing page
  const navToggle = document.getElementById('nav-dropdown-toggle');
  const navMenu = document.getElementById('nav-dropdown-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navToggle.classList.toggle('open');
      navMenu.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen.toString());
    });
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target as Node) && !navMenu.contains(e.target as Node)) {
        navToggle.classList.remove('open');
        navMenu.classList.remove('open');
      }
    });
  }
};

let currentPage: PageController | null = null;

// Einfacher Path-Router
const router = async () => {
  const path = window.location.pathname;

  // Cleanup current page if it implements PageController
  if (currentPage) {
    currentPage.destroy();
    currentPage = null;
  }

  // Registry leeren beim Seitenwechsel, um Ressourcen-Verschmutzung zu vermeiden.
  // Neue Seiten registrieren ihre benötigten Ressourcen während der Initialisierung.
  MapRegistry.clear();
  OverlayLoader.reset();

  if (!app) return;

  if (path === '/karte') {
    const { MapPageController } = await import('./pages/MapPage');
    currentPage = new MapPageController();
    await currentPage.mount(app);
  } else if (path === '/routing') {
    const { RoutingPageController } = await import('./pages/RoutingPage');
    currentPage = new RoutingPageController();
    await currentPage.mount(app);
  } else if (path === '/nah') {
    const { NahPageController } = await import('./pages/NahPage');
    currentPage = new NahPageController();
    await currentPage.mount(app);
  } else if (path === '/coords') {
    const { CoordsPageController } = await import('./pages/CoordsPage');
    currentPage = new CoordsPageController();
    await currentPage.mount(app);
  } else if (path === '/tracking') {
    const { TrackingPageController } = await import('./features/tracking/TrackingPage');
    currentPage = new TrackingPageController();
    await currentPage.mount(app);
  } else if (path === '/isochronen') {
    // Alias auf den kanonischen Pfad — history.replaceState statt pushState, damit kein
    // zusätzlicher Browser-History-Eintrag für den Alias selbst entsteht.
    window.history.replaceState({}, '', '/isochrones');
    await router();
  } else if (path === '/isochrones') {
    const { IsochronesPageController } = await import('./pages/IsochronesPage');
    currentPage = new IsochronesPageController();
    await currentPage.mount(app);
  } else if (path === '/graph') {
    const { GraphPageController } = await import('./pages/GraphPage');
    currentPage = new GraphPageController();
    await currentPage.mount(app);
  } else if (path.startsWith('/info')) {
    const subpath = path.split('/')[2] || 'nah';
    const { InfoPageController } = await import('./pages/InfoPage');
    currentPage = new InfoPageController();
    await currentPage.mount(app, subpath);
  } else {
    renderLandingPage();
  }
};

/**
 * Event-Delegation für interne Links
 */
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const link = target.closest<HTMLAnchorElement>('.nav-link');
  
  if (link && link.getAttribute('href')?.startsWith('/')) {
    e.preventDefault();
    navigate(link.getAttribute('href')!);
  }
});

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', router);
