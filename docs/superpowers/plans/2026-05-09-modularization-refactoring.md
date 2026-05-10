# Codebase Modularization & Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformation der monolithischen Codebasis in eine modulare ES6-Architektur zur Verbesserung der Wartbarkeit, Testbarkeit und Unabhängigkeit der Komponenten.

**Architecture:** 
1. **Types-Layer:** Alle Interfaces in `src/types/`.
2. **Service-Layer:** Daten-Logik in `src/services/`.
3. **Component-Decomposition:** Aufteilung großer Page-Files (insb. `InfoPage.ts`) in Sub-Komponenten.
4. **Layout-Helper:** Zentralisierung der redundanten HTML-Basisstrukturen.

**Tech Stack:** TypeScript (ES6 Module).

---

### Task 1: Centralize Data Types

**Files:**
- Create: `src/types/inventory.ts`
- Create: `src/types/nah.ts`
- Create: `src/types/tracking.ts`
- Create: `src/types/common.ts`
- Modify: `src/pages/*.ts`, `src/components/*.ts` (Update imports)

- [ ] **Step 1: Extract Inventory Types**
Verschiebe `MapItem`, `Inventory` und zugehörige Interfaces nach `src/types/inventory.ts`.

- [ ] **Step 2: Extract NAH Types**
Verschiebe `NahStation`, `NahResponse`, `NahStationResult` nach `src/types/nah.ts`.

- [ ] **Step 3: Extract Tracking Types**
Verschiebe `TrackingItem`, `Aircraft`, `Ship` nach `src/types/tracking.ts`.

- [ ] **Step 4: Global Import Update**
Aktualisiere alle Files, um die neuen zentralen Typen zu nutzen statt sie lokal zu definieren.

- [ ] **Step 5: Commit Task 1**
Run: `git add src/types && git commit -m "refactor: centralize data types into src/types"`

---

### Task 2: Implement Services & Layout Helper

**Files:**
- Create: `src/services/InventoryService.ts`
- Create: `src/lib/LayoutHelper.ts`
- Modify: `src/pages/MapPage.ts`, `src/pages/NahPage.ts`, `src/pages/TrackingPage.ts`

- [ ] **Step 1: Create InventoryService**
Implementiere eine Klasse/Objekt zum zentralen Laden und Cachen der `inventory.json`.

- [ ] **Step 2: Create LayoutHelper**
Erstelle eine Funktion `renderBaseLayout(container, options)`, die die standardmäßige Topbar/Sidebar/Map Struktur erzeugt, um Redundanz in den Pages zu vermeiden.

- [ ] **Step 3: Refactor MapPage to use new Helpers**
Nutze `InventoryService` und `LayoutHelper` in `MapPage.ts`.

- [ ] **Step 4: Commit Task 2**
Run: `git add src/services src/lib && git commit -m "refactor: implement InventoryService and LayoutHelper"`

---

### Task 3: Decompose InfoPage Monolith

**Files:**
- Create: `src/components/info/NahStatusModule.ts`
- Create: `src/components/info/HealthModule.ts`
- Create: `src/components/info/InventoryModule.ts`
- Create: `src/components/info/RegionsModule.ts`
- Create: `src/components/info/DebugModule.ts`
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Move NAH Status logic**
Extrahiere `renderNahStatusModule` in ein eigenes File.

- [ ] **Step 2: Move Health logic**
Extrahiere `renderHealthModule` in ein eigenes File.

- [ ] **Step 3: Move remaining modules**
Verfahre ebenso mit Inventory, Regions und Debug Modulen.

- [ ] **Step 4: Slim down InfoPage.ts**
Die `InfoPage.ts` fungiert nur noch als Router, der die Sub-Module importiert und initialisiert.

- [ ] **Step 5: Commit Task 3**
Run: `git add src/components/info src/pages/InfoPage.ts && git commit -m "refactor: decompose InfoPage monolith into independent modules"`

---

### Task 4: Final Polish & Cleanup

**Files:**
- Modify: `src/main.ts`
- Remove: Unused redundant code blocks

- [ ] **Step 1: Unify RoutingPage and CoordsPage**
Prüfe auf verbleibende Redundanzen in `RoutingPage.ts` und `CoordsPage.ts` (insb. Topbar-Handling).

- [ ] **Step 2: Verification**
Run: `npm run build && npm test`
Expected: Build passes, all pages functional.

- [ ] **Step 3: Final Commit**
Run: `git add . && git commit -m "refactor: final modularization cleanup and verification"`
