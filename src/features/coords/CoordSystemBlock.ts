import { CoordsDataService } from './CoordsDataService';
import { CoordsState } from './types';
import { Toast } from '../../lib/Toast';

export abstract class CoordSystemBlock {
  protected element: HTMLElement | null = null;
  protected isActive: boolean = false;

  constructor(
    protected container: HTMLElement,
    protected service: CoordsDataService,
    protected systemId: string,
    protected title: string
  ) {}

  public getSystemId(): string {
    return this.systemId;
  }

  public abstract render(): string;
  public abstract update(state: CoordsState): void;
  public abstract parseInput(): void;

  public init() {
    const temp = document.createElement('div');
    temp.innerHTML = this.render();
    this.element = temp.firstElementChild as HTMLElement;
    this.container.appendChild(this.element);
    this.attachEvents();
  }

  protected attachEvents() {
    if (!this.element) return;

    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.coord-copy')) {
        this.copyToClipboard();
        return;
      }
      this.activate();
    });

    this.element.addEventListener('input', () => {
      if (this.isActive) {
        this.parseInput();
      }
    });
  }

  public activate() {
    if (this.isActive) return;
    
    // Deactivate others (handled by Sidebar orchestrator usually, but we can emit event or let Sidebar handle it)
    this.container.dispatchEvent(new CustomEvent('block-activated', { detail: { systemId: this.systemId } }));
  }

  public setInactive() {
    this.isActive = false;
    this.element?.classList.remove('active');
    this.element?.querySelectorAll('input').forEach(i => i.setAttribute('readonly', 'true'));
    const select = this.element?.querySelector('select');
    if (select) select.setAttribute('disabled', 'true');
  }

  public setActive() {
    this.isActive = true;
    this.element?.classList.add('active');
    this.element?.querySelectorAll('input').forEach(i => i.removeAttribute('readonly'));
    const select = this.element?.querySelector('select');
    if (select) select.removeAttribute('disabled');
  }

  protected copyToClipboard() {
    if (!this.element) return;
    const inputs = this.element.querySelectorAll('input');
    let text = "";
    inputs.forEach(i => {
      if (i.type !== 'hidden') text += i.value + " ";
    });
    navigator.clipboard.writeText(text.trim());
    Toast.success(`${this.title} kopiert`);
  }

  protected updateField(field: string, value: string) {
    if (!this.element) return;
    const el = this.element.querySelector(`[data-field="${field}"]`);
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      if (this.isActive && document.activeElement === el) return;
      el.value = value;
    } else if (el) {
      el.textContent = value;
    }
  }
}
