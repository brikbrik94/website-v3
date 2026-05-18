# Design Spec: AbortController Management for Page Controllers

**Date:** 2026-05-18
**Status:** Approved
**Topic:** Infrastructure / Lifecycle Management

## 1. Problem Statement
Currently, several pages and modules perform asynchronous `fetch` operations to retrieve data from APIs (NAH, Health, Tracking, etc.). When a user navigates between pages, these requests often remain "in flight," consuming bandwidth and potentially attempting to update the UI of a unmounted page, which can lead to errors or redundant processing.

## 2. Goals
- Standardize the cancellation of network requests during page transitions.
- Reduce boilerplate code for developers implementing new pages.
- Ensure all sub-modules (Health, NAH, etc.) respect the page lifecycle.

## 3. Architecture

### 3.1. BasePageController
A new abstract base class `BasePageController` will be introduced in `src/core/BasePageController.ts`. This class implements the `PageController` interface and provides the core logic for lifecycle management.

```typescript
import { PageController } from './PageController';

export abstract class BasePageController implements PageController {
    protected abortController = new AbortController();

    public abstract mount(container: HTMLElement, ...args: any[]): Promise<void> | void;

    /**
     * Standard cleanup: aborts all ongoing fetches and resets the signal.
     */
    public destroy(): void {
        this.abortController.abort();
        console.debug(`[${this.constructor.name}] Destroyed, aborted ongoing requests.`);
    }

    protected get signal(): AbortSignal {
        return this.abortController.signal;
    }

    /**
     * Centralized fetch helper that automatically respects page lifecycle.
     */
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
```

### 3.2. Sub-module Integration
Functional modules that perform internal fetching or loops (e.g., `NahStatusModule`, `HealthModule`) will be updated to accept an `AbortSignal`.

```typescript
export const renderNahStatusModule = async (container: HTMLElement, signal?: AbortSignal) => {
    // ...
    const fetchData = async () => {
        try {
            const response = await fetch('/api/nah.php', { signal });
            // ...
        } catch (error) {
            if (error.name === 'AbortError') return; // Ignore expected cancellations
            // ... handle other errors
        }
    };
    // ...
};
```

### 3.3. Refactoring Roadmap
1. **Pilot Phase:** Implement `BasePageController` and refactor `InfoPageController` and `InfoPage` sub-modules.
2. **Expansion:** Refactor `TrackingPageController` to use the base class.
3. **Migration:** Refactor legacy functional pages (`NahPage`, `RoutingPage`, etc.) into controllers extending `BasePageController`.

## 4. Error Handling
- The `fetchJson` helper will throw standard errors for non-OK responses.
- Cancellation errors (`AbortError`) should be silently ignored by the caller or handled appropriately in the UI (e.g., by stopping loading indicators).

## 5. Testing Strategy
- **Manual Verification:** Use browser devtools (Network tab) to confirm that requests are canceled (Status: `Canceled`) when navigating away from the Info or NAH page.
- **Unit Tests:** Verify that `destroy()` correctly calls `abort()` on the internal controller.
