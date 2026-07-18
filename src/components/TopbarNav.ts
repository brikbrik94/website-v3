/**
 * Gemeinsame Nav-Links + "Mehr"-Dropdown der Topbar.
 * Wird sowohl von Topbar.ts (Map-Seiten) als auch von main.ts (Landing-Page)
 * verwendet, damit die Markup-Struktur an genau einer Stelle gepflegt wird.
 */
export function renderTopbarNav(currentPath: string): string {
  return `
    <a href="/routing" class="topbar-nav-link nav-link ${currentPath === '/routing' ? 'active' : ''}">Routing</a>
    <a href="/nah" class="topbar-nav-link nav-link ${currentPath === '/nah' ? 'active' : ''}">Luftrettung</a>

    <div class="topbar-nav-dropdown">
      <button class="topbar-nav-dropdown-toggle" id="nav-dropdown-toggle" aria-haspopup="menu" aria-expanded="false">
        Mehr <span class="chevron">▾</span>
      </button>
      <div class="topbar-nav-dropdown-menu" id="nav-dropdown-menu" role="menu">
        <a href="/routing" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/routing' ? 'active' : ''}" role="menuitem">Routing</a>
        <a href="/nah" class="topbar-nav-dropdown-item topbar-nav-dropdown-item--mobile-only nav-link ${currentPath === '/nah' ? 'active' : ''}" role="menuitem">Luftrettung</a>
        <a href="/karte" class="topbar-nav-dropdown-item nav-link ${currentPath === '/karte' ? 'active' : ''}" role="menuitem">Karte</a>
        <a href="/coords" class="topbar-nav-dropdown-item nav-link ${currentPath === '/coords' ? 'active' : ''}" role="menuitem">Umrechner</a>
        <a href="/tracking" class="topbar-nav-dropdown-item nav-link ${currentPath === '/tracking' ? 'active' : ''}" role="menuitem">Tracking</a>
        <a href="/isochrones" class="topbar-nav-dropdown-item nav-link ${currentPath === '/isochrones' ? 'active' : ''}" role="menuitem">Isochronen</a>
      </div>
    </div>
  `;
}
