# CI v2.1.0 Topbar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Topbar and its controls to CI v2.1.0 standards, including icon-only toggles, a navigation dropdown, and a restructured mobile overlay.

**Architecture:** Refactor `Topbar.ts` to use the new CI components. Update `TerrainControls.ts` to generate CI-compliant button HTML. Implement state management for the new navigation dropdown.

**Tech Stack:** TypeScript (Vanilla), CSS (oe5ith-ci)

---

### Task 1: Update TerrainControls to CI v2.1.0 Standard

**Files:**
- Modify: `src/components/TerrainControls.ts`

- [ ] **Step 1: Update `getHtml` to use icon-only toggles with tooltips and labels**

```typescript
  getHtml(): string {
    return `
      <button class="topbar-toggle topbar-toggle--icon-only btn-terrain ${terrainEnabled ? 'active' : ''}" 
              data-tooltip="Gelände (3D)" 
              aria-pressed="${terrainEnabled}">
        <i class="fa-solid fa-cube"></i>
        <span class="topbar-toggle-label">Gelände (3D)</span>
      </button>
      <button class="topbar-toggle topbar-toggle--icon-only btn-hillshade ${hillshadeEnabled ? 'active' : ''}" 
              data-tooltip="Höhenschatten" 
              aria-pressed="${hillshadeEnabled}">
        <i class="fa-solid fa-mountain"></i>
        <span class="topbar-toggle-label">Höhenschatten</span>
      </button>
    `;
  },
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/TerrainControls.ts
git commit -m "feat: update TerrainControls to CI v2.1.0 icon-only standard"
```

---

### Task 2: Refactor Topbar HTML Structure (Toggles & Nav)

**Files:**
- Modify: `src/components/Topbar.ts`

- [ ] **Step 1: Update `customActionsHtml` and `customActionsMobileHtml` templates**

```typescript
  const customActionsHtml = customActions.map(action => `
    <button class="topbar-toggle topbar-toggle--icon-only btn-custom" 
            id="btn-${action.id}" 
            data-tooltip="${action.title}">
      <i class="${action.icon}"></i>
      <span class="topbar-toggle-label">${action.title}</span>
    </button>
  `).join('');

  // Mobile remains largely the same but uses the label span for consistency
  const customActionsMobileHtml = customActions.map(action => `
    <button class="topbar-toggle btn-custom" id="btn-${action.id}-mobile">
      <i class="${action.icon}"></i> 
      <span class="topbar-toggle-label">${action.title}</span>
    </button>
  `).join('');
```

- [ ] **Step 2: Implement the new `topbar-right` with navigation dropdown**

```typescript
      <div class="topbar-right">
        ${hasMap ? `
          <!-- Mobile Toggle -->
          <button class="controls-toggle mobile-only" id="controls-toggle-mobile">
            <div class="slider-icon"><span></span><span></span><span></span></div>
          </button>
        ` : ''}
        
        <a href="/routing" class="topbar-nav-link ${currentPath === '/routing' ? 'active' : ''}">Routing</a>
        <a href="/nah" class="topbar-nav-link ${currentPath === '/nah' ? 'active' : ''}">Luftrettung</a>

        <div class="topbar-nav-dropdown">
          <button class="topbar-nav-dropdown-toggle" id="nav-dropdown-toggle" aria-haspopup="menu" aria-expanded="false">
            Mehr <span class="chevron">▾</span>
          </button>
          <div class="topbar-nav-dropdown-menu" id="nav-dropdown-menu" role="menu">
            <a href="/karte" class="topbar-nav-dropdown-item ${currentPath === '/karte' ? 'active' : ''}" role="menuitem">Karte</a>
            <a href="/coords" class="topbar-nav-dropdown-item ${currentPath === '/coords' ? 'active' : ''}" role="menuitem">Umrechner</a>
            <a href="/tracking" class="topbar-nav-dropdown-item ${currentPath === '/tracking' ? 'active' : ''}" role="menuitem">Tracking</a>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Update `topbar-center` to use icon-only legend toggle**

```typescript
          <div class="controls-panel desktop-only">
            ${dropdownHtml()}
            ${terrainHtml}
            ${customActionsHtml}
            <button class="topbar-toggle topbar-toggle--icon-only btn-legend" data-tooltip="Legende">
              <i class="fa-solid fa-list-ul"></i>
              <span class="topbar-toggle-label">Legende</span>
            </button>
          </div>
```

- [ ] **Step 4: Commit changes**

```bash
git add src/components/Topbar.ts
git commit -m "feat: restructure Topbar HTML for navigation dropdown and icon-only toggles"
```

---

### Task 3: Restructure Controls Overlay

**Files:**
- Modify: `src/components/Topbar.ts`

- [ ] **Step 1: Update `controls-overlay` structure to CI-v2.1 rules**

```typescript
      <div class="controls-overlay" id="controls-overlay">
        <!-- 1. Dropdowns -->
        <div class="form-field">
          <label class="overlay-section-label">Basemap</label>
          ${dropdownHtml(true)}
        </div>

        <div class="controls-sep"></div>

        <!-- 2. Terrain & Tools Grid -->
        <div class="controls-btn-group">
          ${terrainHtml}
          ${customActionsMobileHtml}
          <button class="topbar-toggle btn-legend">
            <i class="fa-solid fa-list-ul"></i> 
            <span class="topbar-toggle-label">Legende</span>
          </button>
        </div>
      </div>
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/Topbar.ts
git commit -m "feat: restructure Topbar mobile overlay according to CI v2.1"
```

---

### Task 4: Implement Navigation Dropdown Logic

**Files:**
- Modify: `src/components/Topbar.ts`

- [ ] **Step 1: Add event listeners for the navigation dropdown**

```typescript
    // Navigation Dropdown Logic
    const navDropdownToggle = document.getElementById('nav-dropdown-toggle');
    const navDropdownMenu = document.getElementById('nav-dropdown-menu');

    if (navDropdownToggle && navDropdownMenu) {
      navDropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = navDropdownMenu.classList.contains('open');
        navDropdownMenu.classList.toggle('open', !isOpen);
        navDropdownToggle.classList.toggle('open', !isOpen);
        navDropdownToggle.setAttribute('aria-expanded', (!isOpen).toString());
      });

      // Close on click outside
      document.addEventListener('click', () => {
        navDropdownMenu.classList.remove('open');
        navDropdownToggle.classList.remove('open');
        navDropdownToggle.setAttribute('aria-expanded', 'false');
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          navDropdownMenu.classList.remove('open');
          navDropdownToggle.classList.remove('open');
          navDropdownToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
```

- [ ] **Step 2: Commit changes**

```bash
git add src/components/Topbar.ts
git commit -m "feat: add logic for navigation dropdown"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Verify all changes visually (mock check)**
- [ ] **Step 2: Run build to ensure no regressions**

Run: `npm run build`
Expected: SUCCESS
