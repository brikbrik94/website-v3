export interface PageController {
  mount(container: HTMLElement, ...args: unknown[]): Promise<void> | void;
  destroy(): void;
}
