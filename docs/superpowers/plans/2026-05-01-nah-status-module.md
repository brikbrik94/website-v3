# NAH Status Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the NAH Status UI module in the Info Page, displaying real-time helicopter availability data in a CI-compliant table.

**Architecture:** Functional component-like rendering within `InfoPage.ts`, using `fetch` for data and standard DOM manipulation for rendering.

**Tech Stack:** TypeScript, CI CSS Framework.

---

### Task 2.1: Define Interfaces and Helper Functions

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Define `NahStation` and `NahResponse` interfaces**
- [ ] **Step 2: Implement `formatTime(iso: string | null): string` helper**

### Task 2.2: Implement `renderNahStatusModule`

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Create `renderNahStatusModule(container: HTMLElement)` function**
- [ ] **Step 2: Implement initial skeleton with Title, Refresh Button, and Loading state**
- [ ] **Step 3: Implement data fetching from `/api/nah`**
- [ ] **Step 4: Implement table rendering using `ci-table`**
- [ ] **Step 5: Add status badge logic**

### Task 2.3: Integrate with `initInfoPage`

**Files:**
- Modify: `src/pages/InfoPage.ts`

- [ ] **Step 1: Call `renderNahStatusModule` when `subpath === 'nah'`**
- [ ] **Step 2: Ensure "Refresh" button triggers re-render**

### Task 2.4: Verification and Commit

- [ ] **Step 1: Verify compilation with `tsc`**
- [ ] **Step 2: Commit changes**
