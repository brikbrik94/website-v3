import { ToastType, ToastOptions } from '../types/common';

class ToastManager {
  private container: HTMLDivElement | null = null;

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message: string, type: ToastType = 'info', options: ToastOptions = {}) {
    this.ensureContainer();

    const duration = options.duration !== undefined ? options.duration : 4000;
    const toast = document.createElement('div');
    
    // CI Klassen: toast, toast--type, toast--rich (falls body vorhanden)
    let classList = `toast toast--${type}`;
    if (options.body) classList += ' toast--rich';
    toast.className = classList;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const iconMap = {
      success: 'fa-check-circle',
      danger: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <div class="toast-main">
        <span class="toast-icon"><i class="fa-solid ${iconMap[type]}"></i></span>
        <span class="toast-text">${message}</span>
        <button class="toast-close" type="button" aria-label="Schließen">✕</button>
      </div>
      ${options.body ? `<p class="toast-body">${options.body}</p>` : ''}
    `;

    this.container!.appendChild(toast);

    // Animation: Einblenden (CI nutzt toast--visible)
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    // Close Button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn?.addEventListener('click', () => this.dismiss(toast));

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }
  }

  private dismiss(toast: HTMLDivElement) {
    if (!toast.parentElement) return;
    
    // CI nutzt toast--hiding für Austrittsanimation
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--hiding');

    setTimeout(() => {
      toast.remove();
      if (this.container && this.container.children.length === 0) {
        this.container.remove();
        this.container = null;
      }
    }, 300);
  }

  // Convenience Methods (CI konform)
  success(msg: string, opt?: ToastOptions) { this.show(msg, 'success', opt); }
  warning(msg: string, opt?: ToastOptions) { this.show(msg, 'warning', opt); }
  error(msg: string, opt?: ToastOptions) { this.show(msg, 'danger', opt); } // danger im CI
  info(msg: string, opt?: ToastOptions) { this.show(msg, 'info', opt); }
}

/**
 * Zentrales Feedback-Singleton (Toast-Benachrichtigungen, CI-konforme `.toast`-Klassen).
 * `success()`/`warning()`/`error()`/`info()` sind Convenience-Wrapper um `show(message, type)`.
 */
export const Toast = new ToastManager();
