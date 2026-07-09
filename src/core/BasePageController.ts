import { PageController } from './PageController';

export abstract class BasePageController implements PageController {
    protected abortController = new AbortController();

    public abstract mount(container: HTMLElement, ...args: unknown[]): Promise<void> | void;

    public destroy(): void {
        this.abortController.abort();
        console.debug(`[${this.constructor.name}] Destroyed, aborted ongoing requests.`);
    }

    protected get signal(): AbortSignal {
        return this.abortController.signal;
    }

    protected async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(url, {
            ...options,
            signal: this.signal
        });
        
        if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    }
}
