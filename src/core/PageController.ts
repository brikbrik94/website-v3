export interface PageController {
  mount(container: HTMLElement, ...args: any[]): Promise<void> | void;
  destroy(): void;
}
