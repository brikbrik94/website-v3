# Geocoder Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a CI-compliant, visually rich Geocoder dropdown with icons for different result types (POIs, addresses, etc.).

**Architecture:** Centralize the rendering logic and icon mapping in a utility library. Update the CI CSS to provide a consistent look across all pages.

**Tech Stack:** TypeScript, CSS (Vanilla), FontAwesome.

---

### Task 1: Update CI Styles (CSS)

**Files:**
- Modify: `oe5ith-ci/css/forms.css`

- [ ] **Step 1: Add Geocoder Dropdown styles**

```css
/* ═══════════════════════════════════════
   GEOCODER DROPDOWN
   Für Suchergebnisse (Nominatim)
   ═══════════════════════════════════════ */
.geocoder-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--panel-deep);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 5px 5px;
  box-shadow: var(--shadow-dropdown);
  z-index: var(--z-dropdown);
  max-height: 280px;
  overflow-y: auto;
}

.geocoder-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.geocoder-item:last-child { border-bottom: none; }
.geocoder-item:hover { background: rgba(255,255,255,0.05); }

.geocoder-icon {
  width: 16px;
  color: var(--accent);
  font-size: 0.9rem;
  text-align: center;
  margin-top: 2px;
  flex-shrink: 0;
}

.geocoder-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.geocoder-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.geocoder-subtitle {
  font-size: 0.72rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 2: Commit changes**

```bash
git add oe5ith-ci/css/forms.css
git commit -m "ci: add geocoder dropdown styles"
```

---

### Task 2: Centralize Geocoder Rendering Logic

**Files:**
- Modify: `src/lib/GeocoderService.ts`
- Create: `src/lib/UIUtils.ts`

- [ ] **Step 1: Update GeocodeResult Interface**

```typescript
// src/lib/GeocoderService.ts
export interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
  class: string; // Neu: Nominatim Klasse
  type: string;  // Nominatim Typ
  importance: number;
}
```

- [ ] **Step 2: Create UIUtils with Icon Mapping and Rendering**

```typescript
// src/lib/UIUtils.ts
import { GeocodeResult } from './GeocoderService';

/**
 * Maps Nominatim class/type to FontAwesome icons
 */
export const getIconForGeocodeResult = (res: GeocodeResult): string => {
  const cls = res.class;
  const type = res.type;

  if (cls === 'amenity') {
    if (type === 'hospital' || type === 'clinic') return 'fa-hospital';
    if (type === 'pharmacy') return 'fa-staff-snake';
    if (type === 'restaurant' || type === 'cafe') return 'fa-utensils';
    if (type === 'police') return 'fa-shield-halved';
    if (type === 'fire_station') return 'fa-fire-extinguisher';
    return 'fa-location-dot';
  }

  if (cls === 'natural') {
    if (type === 'peak' || type === 'volcano') return 'fa-mountain';
    if (type === 'water' || type === 'lake') return 'fa-water';
    return 'fa-tree';
  }

  if (cls === 'place') {
    if (type === 'city' || type === 'town' || type === 'village') return 'fa-city';
    return 'fa-map-pin';
  }

  if (cls === 'highway') return 'fa-road';
  if (cls === 'railway') return 'fa-train';
  if (cls === 'boundary') return 'fa-map';

  return 'fa-house'; // Default: Address/Building
};

/**
 * Renders the HTML for a single geocoder item
 */
export const renderGeocodeItemHtml = (res: GeocodeResult): string => {
  const parts = res.display_name.split(',');
  const title = parts[0].trim();
  const subtitle = parts.slice(1).join(',').trim();
  const icon = getIconForGeocodeResult(res);

  return `
    <div class="geocoder-item" data-lat="${res.lat}" data-lon="${res.lon}" data-name="${res.display_name}">
      <i class="fa-solid ${icon} geocoder-icon"></i>
      <div class="geocoder-content">
        <span class="geocoder-title">${title}</span>
        <span class="geocoder-subtitle">${subtitle}</span>
      </div>
    </div>
  `;
};
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/GeocoderService.ts src/lib/UIUtils.ts
git commit -m "feat: add central geocoder rendering and icon mapping"
```

---

### Task 3: Integrate into CoordsPage

**Files:**
- Modify: `src/pages/CoordsPage.ts`

- [ ] **Step 1: Refactor Geocoder handling in CoordsPage**

```typescript
// Replace the old result mapping with the new utility function
// Around line 494:
resultsContainer.innerHTML = results.map(r => renderGeocodeItemHtml(r)).join('');
```

- [ ] **Step 2: Remove local CSS overrides (optional, ensure clean up)**

- [ ] **Step 3: Verify and Commit**

```bash
git add src/pages/CoordsPage.ts
git commit -m "feat(coords): use new geocoder dropdown rendering"
```

---

### Task 4: Integrate into RoutingSidebar

**Files:**
- Modify: `src/components/RoutingSidebar.ts`

- [ ] **Step 1: Refactor renderResults in RoutingSidebar**

```typescript
// Around line 210:
container.innerHTML = results.map(r => renderGeocodeItemHtml(r)).join('');
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RoutingSidebar.ts
git commit -m "feat(routing): use new geocoder dropdown rendering"
```

---

### Task 5: CI Documentation

**Files:**
- Create: `oe5ith-ci/docs/geocoder-dropdown.md`

- [ ] **Step 1: Add documentation for the new component**

```markdown
# Geocoder Dropdown

Standard-Komponente für Suchergebnisse aus dem Geocoder (Nominatim).

## Struktur

```html
<div class="geocoder-results">
  <div class="geocoder-item">
    <i class="fa-solid fa-house geocoder-icon"></i>
    <div class="geocoder-content">
      <span class="geocoder-title">Hauptplatz 1</span>
      <span class="geocoder-subtitle">4020 Linz, Österreich</span>
    </div>
  </div>
</div>
```

## CSS Klassen

- `.geocoder-results`: Container, absolut unter dem Input positioniert.
- `.geocoder-item`: Flex-Container für ein einzelnes Ergebnis.
- `.geocoder-icon`: FontAwesome Icon (accent color).
- `.geocoder-content`: Container für Titel und Untertitel.
- `.geocoder-title`: Primärer Name (fett).
- `.geocoder-subtitle`: Sekundäre Adressdetails (gedämpft).
```

- [ ] **Step 2: Commit**

```bash
git add oe5ith-ci/docs/geocoder-dropdown.md
git commit -m "docs: document geocoder dropdown component"
```
