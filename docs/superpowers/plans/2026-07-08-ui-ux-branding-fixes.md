# UI/UX & Branding Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 UI/UX issues affecting mobile logo visibility, tablet navigation layout, CSS bloat, and markup duplication.

**Architecture:** 
- Task 1: Remove dead Leaflet CSS (simple deletion)
- Task 2: Restore logo visibility on mobile by adjusting breakpoint rules
- Task 3: Extract Topbar markup to shared component to eliminate duplication
- Task 4: Fix nth-child selector specificity issue in Topbar for tablet layout

**Tech Stack:** TypeScript, Vanilla CSS, existing component patterns

## Global Constraints

- Run `npx tsc --noEmit && npm test` before claiming task complete
- Update `CHANGELOG.md` with one entry per task (not merged)
- German comments in code; English task names
- Use CSS tokens (`var(--*)`) from `common.css`, no hardcoded values
- Follow established component patterns (no new abstractions unless required)

---

## Task 1: Remove Dead Leaflet CSS Rules

**Files:**
- Modify: `src/styles/modal.css:294-314`
- Reference: `package.json` (verify leaflet dependency missing)

**Interfaces:**
- Consumes: Nothing (cleanup only)
- Produces: Cleaner CSS file, ~20 lines removed

- [ ] **Step 1: Verify leaflet not in dependencies**

```bash
grep -i leaflet package.json
```

Expected: No matches (leaflet removed at some point)

- [ ] **Step 2: Search codebase for leaflet usage**

```bash
grep -r "leaflet" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.css" | grep -v node_modules
```

Expected: No matches in source code (only dead CSS)

- [ ] **Step 3: Remove leaflet CSS rules**

In `src/styles/modal.css`, find and delete the section starting with the comment
`/* ─ LEAFLET CSS OVERRIDES ─ */` (or similar) through the end of the leaflet-specific rules
(`.leaflet-popup-content-wrapper`, `.leaflet-popup-content`, `.leaflet-popup-tip-container`,
`.leaflet-popup-close-button`). This is around lines 289-314 based on prior investigation.

- [ ] **Step 4: Type-check and test**

```bash
npx tsc --noEmit && npm test
```

Expected: All tests pass, no type errors

- [ ] **Step 5: Commit**

```bash
git add src/styles/modal.css
git commit -m "refactor(styles): remove dead leaflet popup CSS (leaflet dependency removed)"
```

---

## Task 2: Show Logo on Mobile

**Files:**
- Modify: `src/main.ts` (Landing Page logo visibility) or relevant CSS file
- Reference: `src/styles/*.css` for breakpoint rules
- Test: Visual verification in browser

**Interfaces:**
- Consumes: Existing logo HTML structure
- Produces: Logo visible on mobile landing page

- [ ] **Step 1: Inspect logo HTML in landing page**

In `src/main.ts`, find the logo element (likely in `<header>` or `.topbar`). Check its CSS classes.

Expected: Logo has class like `.logo` or `.brand-logo`

- [ ] **Step 2: Check CSS rules for that class**

Search `src/styles/*.css` for rules that hide logo on mobile:

```bash
grep -n "\.logo\|\.brand" src/styles/*.css | grep -E "display: none|visibility|width.*0"
```

Expected: Find breakpoint rule like `@media (max-width: 768px) { .logo { display: none; } }`

- [ ] **Step 3: Adjust or remove the hide rule**

Either:
- Option A: Remove the `display: none` rule entirely (show on all breakpoints)
- Option B: Change breakpoint threshold from 768px to smaller value so logo shows on tablet/mobile

Choose Option A (simpler) unless investigation reveals a specific design reason to hide at
certain breakpoint (in which case, document why and pick Option B).

- [ ] **Step 4: Test in browser**

```bash
npm run dev:vite &
```

Open `http://localhost:5173` (or configured port) on mobile view (DevTools responsive mode).
Verify logo is visible.

Also test on other pages (`/nah`, `/routing`, `/coords`, `/tracking`) to ensure logo shows everywhere
that uses `Topbar.ts` (not just landing page).

- [ ] **Step 5: Type-check and test**

```bash
npx tsc --noEmit && npm test
```

Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "fix(mobile): show logo on mobile screens"
```

---

## Task 3: Deduplicate Topbar Markup

**Files:**
- Create: `src/components/TopbarNav.ts` (extracted nav component)
- Modify: `src/components/Topbar.ts` (use extracted component)
- Modify: `src/main.ts` (use extracted component)
- Test: Visual verification that both pages have identical nav

**Interfaces:**
- Consumes: Existing nav link data (paths, labels) — read from current Topbar.ts/main.ts markup
- Produces: A shared nav-building function exported from `TopbarNav.ts`

- [ ] **Step 1: Read current nav structure from Topbar.ts**

Read `src/components/Topbar.ts` in full. Locate the nav markup (`.topbar-nav` or similar div with
multiple `.nav-link`/`.topbar-nav-link` children). Note the exact HTML structure, classes, and
link data (paths + labels).

- [ ] **Step 2: Read current nav structure from main.ts**

Read `src/main.ts`. Locate the landing page's own copy of this nav markup. Compare byte-for-byte
with Topbar.ts's version — note any differences (they should be structurally identical per the
TODO.md finding).

- [ ] **Step 3: Create TopbarNav component**

Create `src/components/TopbarNav.ts` with a function that builds the nav element, using the EXACT
markup/classes/link data found in Steps 1-2 (do not invent new structure — copy verbatim from
the existing code to avoid visual regression).

The function signature should be:

```typescript
export function createTopbarNav(): HTMLElement {
  // ... build and return the nav element using existing markup structure
}
```

- [ ] **Step 4: Update Topbar.ts to use TopbarNav**

Replace the inline nav-building code in `Topbar.ts` with a call to `createTopbarNav()` from the
new module. Import it at the top of the file.

- [ ] **Step 5: Update main.ts to use TopbarNav**

Replace the inline nav-building code in `main.ts` with the same `createTopbarNav()` call.

- [ ] **Step 6: Type-check and test**

```bash
npx tsc --noEmit && npm test
```

Expected: All pass.

- [ ] **Step 7: Visual verification**

```bash
npm run dev:vite &
```

Open landing page and a map page (e.g. `/nah`) side by side. Verify nav looks identical to before
the refactor (no visual regression) on both desktop and mobile viewport widths.

- [ ] **Step 8: Commit**

```bash
git add src/components/TopbarNav.ts src/components/Topbar.ts src/main.ts
git commit -m "refactor(ui): extract shared topbar nav component to eliminate duplication"
```

---

## Task 4: Fix Tablet Quicklinks (nth-child Issue)

**Files:**
- Modify: `src/components/Topbar.ts` (reorder `.topbar-right` elements)
- Reference: `oe5ith-ci/css/topbar.css:595` (the nth-child rule — READ ONLY, do not modify submodule)
- Test: Visual verification at 900px breakpoint

**Interfaces:**
- Consumes: Existing `.topbar-right` structure (from Task 3's TopbarNav if applicable)
- Produces: Reordered `.topbar-right` so nth-child selector works correctly

**Context:** 
The issue: On tablet (900px), only 1 of 2 quicklinks shows on map pages (`/nah` etc). Root cause:
`.controls-toggle-mobile` button is the FIRST child of `.topbar-right`, so the CI's nth-child rule
`.topbar-nav-link:nth-child(n+3) { display: none; }` counts ALL siblings (not just nav-links),
pushing "Luftrettung" to position 3 and hiding it. This does NOT affect the landing page
(`main.ts`), which has no such button.

Solution: Move `.controls-toggle-mobile` button AFTER the nav links in `.topbar-right`, not before.

- [ ] **Step 1: Read current .topbar-right structure in Topbar.ts**

Read `src/components/Topbar.ts` in full (post Task 3 changes if that task completed first).
Find where `.topbar-right` is built — look for `controls-toggle-mobile` and the nav links
(or the `createTopbarNav()` call from Task 3).

Confirm current order is: button first, then nav links (this is the bug).

- [ ] **Step 2: Reorder — nav links first, button last**

Modify the code so `.topbar-right`'s children are appended in this order:
1. Nav links (via `createTopbarNav()` or equivalent) — FIRST
2. `.controls-toggle-mobile` button — LAST

This way `.topbar-nav-link:nth-child(n+3)` only counts nav-link positions correctly since the
button is no longer interspersed before them.

- [ ] **Step 3: Test at 900px**

```bash
npm run dev:vite &
```

Open DevTools, set viewport width to 900px (tablet breakpoint). Navigate to `/nah` (a map page).

Verify: Both "Luftrettung" and "Routing" quicklinks are visible (not just one).

Also verify the mobile controls-toggle button still works correctly (opens/closes controls panel)
since we only reordered DOM position, not removed functionality.

- [ ] **Step 4: Type-check and test**

```bash
npx tsc --noEmit && npm test
```

Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar.ts
git commit -m "fix(ui): reorder topbar-right elements to fix tablet quicklinks visibility"
```

---

## Task 5: Update CHANGELOG.md and Final Verification

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: All commits from Tasks 1-4
- Produces: Changelog entries documenting the fixes

- [ ] **Step 1: Add changelog entries**

In `CHANGELOG.md`, under `[Unreleased]` → `### Behoben` (for fixes) and `### Entfernt` (for the
leaflet CSS removal), add entries summarizing:
- Leaflet CSS Altlast entfernt
- Logo auf Mobile wieder sichtbar
- Topbar-Nav-Markup dedupliziert (Refactoring, kein User-facing Fix, ggf. unter „Geändert")
- Tablet-Quicklinks-Bug behoben (nth-child Fix)

- [ ] **Step 2: Full verification**

```bash
npx tsc --noEmit && npm test
```

Expected: All pass, no regressions from any of the 4 tasks combined

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for UI/UX branding fixes batch"
```

- [ ] **Step 4: Update TODO.md**

Mark the 4 corresponding TODO.md items (leaflet CSS, mobile logo, topbar duplication, tablet
quicklinks) as `[x]` done, each with today's date and a one-line summary + commit reference.

```bash
git add TODO.md
git commit -m "docs: mark UI/UX branding fixes as done in TODO.md"
```

---

## Self-Review

✅ **Spec coverage:** 
- Task 1: Remove leaflet CSS ✓
- Task 2: Logo on mobile ✓
- Task 3: Deduplicate markup ✓
- Task 4: Fix tablet nth-child ✓
- Task 5: Changelog + TODO.md update ✓
- (Versioning practice review — separate from code tasks, goes through proposal cycle per
  AGENT_INSTRUCTIONS.md, not part of this implementation plan)

✅ **No placeholders:** All steps have exact file paths, investigation steps, and commands. Tasks
2-4 require reading actual file contents before editing (since exact line numbers/current markup
weren't pre-verified) — this is intentional investigation-then-implement structure, not a
placeholder gap.

✅ **Type consistency:** `createTopbarNav()` defined once in Task 3, consumed in Task 3's own
Topbar.ts/main.ts updates AND in Task 4's reordering (Task 4 depends on Task 3's structure).

**Task ordering note:** Task 4 depends on Task 3 completing first (reorders the nav component Task 3
creates). Tasks 1 and 2 are independent and can run in any order relative to 3/4.
