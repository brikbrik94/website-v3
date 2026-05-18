# AbortController Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize network request cancellation across all pages to prevent "ghost" updates and save resources.

**Architecture:**
- Create `BasePageController` abstract class.
- Refactor `InfoPage` and `TrackingPage` to extend the base class.
- Pass `AbortSignal` to sub-modules.
- Migrate `NahPage` to a class-based controller as a refactoring pilot.

**Tech Stack:** TypeScript, Vanilla JS.

---

### Task 1: Core BasePageController

**Files:**
- Create: `src/core/BasePageController.ts`

- [ ] **Step 1: Create the abstract base class**

```typescript
import { PageController } from './PageController';

export abstract class BasePageController implements PageController {
    protected abortController = new AbortController();

    public abstract mount(container: HTMLElement, ...args: any[]): Promise<void> | void;

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
```

- [ ] **Step 2: Commit base class**

```bash
git add src/core/BasePageController.ts
git commit -m "feat(core): add BasePageController for AbortController management"
```

---

### Task 2: Update InfoPage Sub-modules

**Files:**
- Modify: `src/components/info/NahStatusModule.ts`
- Modify: `src/components/info/HealthModule.ts`
- Modify: `src/components/info/RegionsModule.ts`
- Modify: `src/components/info/InventoryModule.ts`

- [ ] **Step 1: Update NahStatusModule to accept signal**

Update the signature and the `fetch` call. Wrap `fetch` in a try-catch to ignore `AbortError`.

```typescript
export const renderNahStatusModule = async (container: HTMLElement, signal?: AbortSignal) => {
    // ...
    const fetchData = async () => {
        // ...
        try {
            const response = await fetch('/api/nah.php', { signal });
            const data: NahResponse = await response.json();
            // ...
        } catch (error: any) {
            if (error.name === 'AbortError') return;
            // ... existing error handling
        }
    }
}
```

- [ ] **Step 2: Update HealthModule to accept signal**

Update pings to combine the timeout signal with the page signal.

```typescript
export const renderHealthModule = async (container: HTMLElement, signal?: AbortSignal) => {
    // ...
    const pingService = async (service: typeof services[0]) => {
        // ...
        try {
            const timeoutController = new AbortController();
            const timeoutId = setTimeout(() => timeoutController.abort(), 5000);
            
            // Combine signals if AbortSignal.any is available, otherwise manual race
            const combinedSignal = signal 
                ? AbortSignal.any([signal, timeoutController.signal]) 
                : timeoutController.signal;

            const response = await fetch(service.url, { 
                method: 'GET',
                signal: combinedSignal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            // ...
        } catch (e: any) {
            if (e.name === 'AbortError') return;
            // ...
        }
    }
}
```

- [ ] **Step 3: Update RegionsModule and InventoryModule**

Similar updates to signatures and `fetch` calls.

- [ ] **Step 4: Commit module updates**

```bash
git add src/components/info/
git commit -m "feat(info): update modules to respect AbortSignal"
```

---

### Task 3: Refactor InfoPageController

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Extend BasePageController and pass signal**

```typescript
import { BasePageController } from '../core/BasePageController';

export class InfoPageController extends BasePageController {
    // ...
    public async mount(container: HTMLElement, subpath: string = 'nah'): Promise<void> {
        // ...
        if (subpath === 'nah') {
            renderNahStatusModule(contentMount, this.signal);
        } else if (subpath === 'health') {
            renderHealthModule(contentMount, this.signal);
            // ...
        }
        // ...
    }

    public destroy(): void {
        super.destroy(); // Calls abort()
        if (this.trackingService) {
            this.trackingService.destroy();
            this.trackingService = null;
        }
    }
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/pages/InfoPage.ts
git commit -m "feat(info): integrate BasePageController into InfoPage"
```

---

### Task 4: Refactor TrackingPageController

**Files:**
- Modify: `src/features/tracking/TrackingPage.ts`

- [ ] **Step 1: Extend BasePageController**

```typescript
import { BasePageController } from '../../core/BasePageController';

export class TrackingPageController extends BasePageController {
    // ...
    public destroy(): void {
        super.destroy();
        // ... other cleanups
    }
}
```

- [ ] **Step 2: Commit changes**

```bash
git add src/features/tracking/TrackingPage.ts
git commit -m "feat(tracking): integrate BasePageController into TrackingPage"
```

---

### Task 5: Refactor NahPage to Controller (Pilot Migration)

**Files:**
- Modify: `src/pages/NahPage.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Convert NahPage.ts to NahPageController class**

```typescript
import { BasePageController } from '../core/BasePageController';
// ... other imports

export class NahPageController extends BasePageController {
    public async mount(container: HTMLElement): Promise<void> {
        // 1. Initial Data Load with this.signal
        const invService = InventoryService.getInstance();
        const basemaps = await invService.getBasemaps(); // Add signal to service if needed, or use fetchJson here
        
        // ... logic from initNahPage ...
    }
}
```

- [ ] **Step 2: Update main.ts router**

```typescript
  } else if (path === '/nah') {
    const { NahPageController } = await import('./pages/NahPage');
    currentPage = new NahPageController();
    await currentPage.mount(app);
  }
```

- [ ] **Step 3: Commit migration**

```bash
git add src/pages/NahPage.ts src/main.ts
git commit -m "refactor(nah): migrate NahPage to class-based controller"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Manual verification in DevTools**
Navigate to `/info/nah`, wait for "Lade...", then navigate to `/`. Confirm in Network tab that `/api/nah.php` shows as "Canceled".

- [ ] **Step 2: Check for regressions**
Ensure Map interactions on NahPage still work correctly after refactoring.

- [ ] **Step 3: Update Changelog**
Add entry for AbortController management and NahPage refactoring.
