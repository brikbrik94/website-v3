export interface ContextMenuItem {
  label: string;
  icon?: string;
  value?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const ContextMenu = {
  privateMenu: null as HTMLDivElement | null,

  init() {
    if (this.privateMenu) return;

    this.privateMenu = document.createElement('div');
    this.privateMenu.className = 'ctx-menu';
    this.privateMenu.setAttribute('role', 'menu');
    document.body.appendChild(this.privateMenu);

    // Global listeners for closing
    document.addEventListener('click', () => this.hide());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  },

  show(x: number, y: number, items: (ContextMenuItem | 'sep' | { label: string, type: 'label' })[]) {
    this.init();
    const menu = this.privateMenu!;

    menu.innerHTML = '';
    
    items.forEach(item => {
      if (item === 'sep') {
        const sep = document.createElement('div');
        sep.className = 'ctx-sep';
        menu.appendChild(sep);
      } else if ('type' in item && item.type === 'label') {
        const label = document.createElement('div');
        label.className = 'ctx-label';
        label.textContent = item.label;
        menu.appendChild(label);
      } else {
        const mi = item as ContextMenuItem;
        const div = document.createElement('div');
        div.className = 'ctx-item';
        if (mi.danger) div.classList.add('danger');
        if (mi.disabled) {
          div.classList.add('disabled');
          div.setAttribute('aria-disabled', 'true');
        }
        div.setAttribute('role', 'menuitem');

        let html = '';
        if (mi.icon) html += `<i class="${mi.icon}"></i> `;
        html += mi.label;
        if (mi.value) html += `<span class="ctx-item-value">${mi.value}</span>`;
        
        div.innerHTML = html;

        if (!mi.disabled && mi.onClick) {
          div.addEventListener('click', (e) => {
            e.stopPropagation();
            mi.onClick!();
            this.hide();
          });
        }
        menu.appendChild(div);
      }
    });

    // Positioning
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.classList.remove('flip-x', 'flip-y');

    menu.style.visibility = 'hidden';
    menu.classList.add('open');

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) {
      menu.style.left = (x - rect.width) + 'px';
      menu.classList.add('flip-x');
    }
    if (rect.bottom > window.innerHeight - 8) {
      menu.style.top = (y - rect.height) + 'px';
      menu.classList.add('flip-y');
    }

    menu.style.visibility = 'visible';
  },

  hide() {
    if (this.privateMenu) {
      this.privateMenu.classList.remove('open');
    }
  }
};
