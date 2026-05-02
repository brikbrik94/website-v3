import './app.css';
import { initMapPage } from './pages/MapPage';
import { initRoutingPage } from './pages/RoutingPage';
import { initNahPage } from './pages/NahPage';
import { initInfoPage } from './pages/InfoPage';

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
  
  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-left">
        <a href="/" class="brand nav-link">
          <img src="/src/assets/logo.svg" alt="OE5ITH Logo" class="brand-logo" />
          <span class="brand-text">OE5ITH</span>
        </a>
      </div>
      <div class="topbar-center"></div>
      <div class="topbar-right">
        <span class="badge badge-purple">
          <i class="fa-solid fa-rocket"></i> V3 Early Access
        </span>
      </div>
    </header>

    <div class="layout">
      <main class="page-content landing-body">
        <h1 class="landing-title">Willkommen im <span>Cloud Portal</span></h1>
        <p style="color: var(--muted); margin-bottom: 40px; max-width: 600px; text-align: center;">
          Öffentliches Portal für Geodaten und Karten-Services.
        </p>

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
        </div>
      </main>
    </div>
  `;
};

// Einfacher Path-Router
const router = () => {
  const path = window.location.pathname;
  if (path === '/karte') {
    if (app) initMapPage(app);
  } else if (path === '/routing') {
    if (app) initRoutingPage(app);
  } else if (path === '/nah') {
    if (app) initNahPage(app);
  } else if (path.startsWith('/info')) {
    const subpath = path.split('/')[2] || 'nah';
    if (app) initInfoPage(app, subpath);
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
