# CI Style Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize all CSS files from the `oe5ith-ci` submodule to the project's `src/styles/` directory to update MapLibre popup styles and maintain CI consistency.

**Architecture:** Simple file-level synchronization (bulk copy) from the submodule source to the project destination.

**Tech Stack:** Shell (cp), Git (submodule).

---

### Task 1: Synchronize CSS Files

**Files:**
- Modify: `src/styles/*.css` (overwritten from `oe5ith-ci/css/*.css`)

- [ ] **Step 1: Perform the bulk copy**

Run: `cp -v oe5ith-ci/css/*.css src/styles/`
Expected: List of copied files including `modal.css`.

- [ ] **Step 2: Verify modal.css content**

Run: `grep -C 5 ".maplibregl-popup-content" src/styles/modal.css`
Expected: Output showing the `.maplibregl-popup-content` class and verified that it is NOT commented out.

- [ ] **Step 3: Commit the changes**

Run: `git add src/styles/*.css && git status`
Expected: Status shows modified CSS files.
Command: `git commit -m "style: sync CI components and enable MapLibre popups"`

### Task 2: Visual Verification (Manual)

**Files:**
- Check: `src/pages/NahPage.ts` (as reference for where popups are used)

- [ ] **Step 1: Instructions for the user**

Inform the user to check the NAH page in the browser.
Verify: Popups should now have a dark background (`var(--card-bg)`), rounded corners, and no tip (triangle).
