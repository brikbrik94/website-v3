import { APP_VERSION } from '../version';

/**
 * OE5ITH Sidebar Toggle Utility
 * Shared logic for desktop collapse and mobile expansion.
 */

export const getSidebarFooterHtml = (extraContent: string = '') => {
  return `
    <div class="sidebar-footer">
      <span class="sidebar-footer-version" 
            onclick="window.dispatchEvent(new CustomEvent('open-changelog'))" 
            style="cursor: pointer;" 
            title="Changelog anzeigen">v${APP_VERSION}</span>
      ${extraContent}
      <button class="sidebar-footer-copyright" 
              onclick="window.dispatchEvent(new CustomEvent('open-copyright'))" 
              title="Copyright & Lizenzen">©</button>
    </div>
  `;
};

export const setupSidebarToggle = (
  sidebarEl: HTMLElement,
  tabEl: HTMLElement,
  backdropEl: HTMLElement
) => {
  const toggleSidebar = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const isOpen = sidebarEl.classList.toggle('mobile-open');
      backdropEl.classList.toggle('visible', isOpen);
      tabEl.textContent = isOpen ? '‹' : '›';
    } else {
      const isCollapsed = sidebarEl.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
      tabEl.textContent = isCollapsed ? '›' : '‹';
    }
  };

  tabEl.addEventListener('click', toggleSidebar);
  backdropEl.addEventListener('click', () => {
    sidebarEl.classList.remove('mobile-open');
    backdropEl.classList.remove('visible');
    tabEl.textContent = '›';
  });
};
