# CoordsPage Topbar & Contours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a topographic contour lines toggle in the CoordsPage Topbar.

**Architecture:** Extend the shared `Topbar` component to support modular custom actions. Implement the contour fetching and layer management logic within `CoordsPage`.

**Tech Stack:** TypeScript, MapLibre GL JS, Font Awesome.

---

### Task 1: Extend Topbar Component

**Files:**
- Modify: `src/components/Topbar.ts`

- [ ] **Step 1: Define `CustomAction` interface and update `initTopbar` signature**

```typescript
export interface CustomAction {
  id: string;
  icon: string;
  title: string;
  onClick: (isActive: boolean) => void;
}

export const initTopbar = (
  container: HTMLElement,
  basemaps: MapItem[],
  onBasemapChange: (url: string, name: string) => void,
  onLegendToggle?: (isActive: boolean) => void,
  customActions: CustomAction[] = [] // New parameter
) => {
```

- [ ] **Step 2: Render custom actions in desktop view**

```typescript
  const customActionsHtml = customActions.map(action => `
    <button class="topbar-toggle btn-custom" id="btn-${action.id}" title="${action.title}">
      <i class="${action.icon}"></i>
    </button>
  `).join('');

  // Update controls-panel injection
  // ...
  <div class="controls-panel desktop-only">
    ${dropdownHtml()}
    ${terrainHtml}
    ${customActionsHtml} // Added
    <button class="topbar-toggle btn-legend" title="Legende">
      <i class="fa-solid fa-list-ul"></i>
    </button>
  </div>
```

- [ ] **Step 3: Render custom actions in mobile overlay**

```typescript
  const customActionsMobileHtml = customActions.map(action => `
    <button class="topbar-toggle btn-custom" id="btn-${action.id}-mobile">
      <i class="${action.icon}"></i> ${action.title}
    </button>
  `).join('');

  // Update controls-btn-group injection
  // ...
  <div class="controls-btn-group">
    ${terrainHtml}
    ${customActionsMobileHtml} // Added
    <button class="topbar-toggle btn-legend">
      <i class="fa-solid fa-list-ul"></i> Legende
    </button>
  </div>
```

- [ ] **Step 4: Implement event listeners for custom actions**

```typescript
    // Inside if (hasMap)
    customActions.forEach(action => {
      const btns = [
        document.getElementById(`btn-${action.id}`),
        document.getElementById(`btn-${action.id}-mobile`)
      ];

      btns.forEach(btn => {
        btn?.addEventListener('click', (e) => {
          e.stopPropagation();
          const isNowActive = !btn.classList.contains('active');
          
          // Sync all buttons for this action
          btns.forEach(b => b?.classList.toggle('active', isNowActive));
          
          action.onClick(isNowActive);
        });
      });
    });
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS

---

### Task 2: Implement Contours Logic in CoordsPage

**Files:**
- Modify: `src/pages/CoordsPage.ts`

- [ ] **Step 1: Implement `toggleContours` function**

```typescript
  let contoursActive = false;
  const CONTOURS_ID = 'basemap-at-contours';
  const CONTOURS_URL = 'https://tiles.oe5ith.at/overlays/styles/basemap-at-contours/style.json';

  const toggleContours = async (active: boolean) => {
    contoursActive = active;
    
    if (active) {
      if (!map.getSource(CONTOURS_ID)) {
        try {
          const res = await fetch(CONTOURS_URL);
          const style = await res.json();
          
          // Inject Sources
          for (const [id, def] of Object.entries(style.sources)) {
            if (!map.getSource(id)) map.addSource(id, def as any);
          }
          
          // Inject Layers
          style.layers.forEach((l: any) => {
            if (!map.getLayer(l.id)) map.addLayer(l);
          });
        } catch (err) {
          console.error('Failed to load contours', err);
          Toast.error('Fehler beim Laden der Höhenlinien');
          return;
        }
      } else {
        // Toggle visibility if already exists
        const style = map.getStyle();
        style.layers.forEach((l: any) => {
          if (l.source === CONTOURS_ID || l.id.includes('contour') || l.id.includes('height')) {
             map.setLayoutProperty(l.id, 'visibility', 'visible');
          }
        });
      }
    } else {
      // Hide layers
      const style = map.getStyle();
      style.layers.forEach((l: any) => {
        if (l.source === CONTOURS_ID || l.id.includes('contour') || l.id.includes('height')) {
           map.setLayoutProperty(l.id, 'visibility', 'none');
        }
      });
    }
  };
```

- [ ] **Step 2: Update `initTopbar` call**

```typescript
  // 4. Topbar initialisieren
  initTopbar(topbarMount, basemaps, (url) => {
    map.setStyle(url);
    map.once('idle', async () => {
      await MapCore.reapplyBaseLayers();
      // Ensure contours remain if they were active
      if (contoursActive) {
        // Source/Layers are likely gone after setStyle, need to re-inject
        // Simplified: force re-run of toggle logic
        map.getSource(CONTOURS_ID) ? null : await toggleContours(true);
      }
    });
  }, undefined, [
    {
      id: 'contours',
      icon: 'fa-solid fa-mountain',
      title: 'Höhenlinien',
      onClick: (active) => toggleContours(active)
    }
  ]);
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS

---

### Task 3: Update Changelog

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `src/lib/GlobalModals.ts`

- [ ] **Step 1: Add to CHANGELOG.md**

```markdown
- **Höhenlinien (Contours):** Neuer Button in der Topbar des Umrechners zum Ein-/Ausblenden von topografischen Höhenlinien.
```

- [ ] **Step 2: Update GlobalModals.ts**

```typescript
<li><strong>Höhenlinien (Contours):</strong> Neuer Button in der Topbar des Umrechners zum Ein-/Ausblenden von topografischen Höhenlinien.</li>
```

- [ ] **Step 3: Commit all changes**

```bash
git add src/components/Topbar.ts src/pages/CoordsPage.ts CHANGELOG.md src/lib/GlobalModals.ts
git commit -m "feat(coords): add topographic contours toggle to topbar"
```
