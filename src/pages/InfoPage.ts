import { initTopbar } from '../components/Topbar';
import { navigate } from '../main';

/**
 * Info & Debug Page
 * Handles layout and module switching via sidebar.
 */
export const initInfoPage = async (container: HTMLElement, subpath: string = 'nah') => {
  container.innerHTML = `
    <div id="topbar-mount"></div>
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-section-label">MODULE</div>
          <a href="/info/nah" class="sidebar-nav-item ${subpath === 'nah' ? 'active' : ''}" data-module="nah">
            <i class="fa-solid fa-helicopter nav-icon"></i> NAH Status
          </a>
          <a href="/info/debug" class="sidebar-nav-item ${subpath === 'debug' ? 'active' : ''}" data-module="debug">
            <i class="fa-solid fa-terminal nav-icon"></i> API Debug
          </a>
        </div>
        <div class="sidebar-footer">
          <span class="sidebar-footer-version">v3.0.0</span>
          <button class="sidebar-footer-copyright">©</button>
        </div>
      </aside>
      <main class="page-content" id="info-content-mount">
      </main>
    </div>
  `;

  // Initialize Topbar (minimal version for landing/info)
  const topbarMount = document.getElementById('topbar-mount')!;
  initTopbar(topbarMount, [], () => {});

  const contentMount = document.getElementById('info-content-mount')!;
  
  // Sidebar Navigation Handling
  const sidebar = container.querySelector('.sidebar')!;
  sidebar.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>('.sidebar-nav-item');
    if (link && link.getAttribute('href')?.startsWith('/')) {
      e.preventDefault();
      navigate(link.getAttribute('href')!);
    }
  });

  if (subpath === 'nah') {
    // Placeholder for Task 2
    contentMount.innerHTML = `
      <div class="content-body">
        <div class="panel">
          <div class="panel-body">NAH Module Loading...</div>
        </div>
      </div>
    `;
  } else {
    contentMount.innerHTML = `
      <div class="content-body">
        <div class="panel">
          <div class="panel-body">Coming soon...</div>
        </div>
      </div>
    `;
  }
};
