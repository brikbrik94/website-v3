/**
 * OE5ITH Sidebar Toggle Utility
 * Shared logic for desktop collapse and mobile expansion.
 */

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
