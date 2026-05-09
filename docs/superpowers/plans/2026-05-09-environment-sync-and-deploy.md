# Environment Sync & Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bereinigung der Git-Umgebung, Synchronisation der Submodule und Durchführung eines erfolgreichen Deployments, um die NAH-Logik und Tracking-Fixes auf der Testseite zu aktivieren.

**Architecture:** Konsolidierung aller Änderungen auf dem `master` Branch, Aktualisierung der `oe5ith-ci` Submodule und Ausführung des `deploy-website.sh` Scripts.

**Tech Stack:** Git, Bash, Vite (npm).

---

### Task 1: Branch Cleanup & Consolidation

**Files:**
- Modify: `.git/config` (indirectly via commands)

- [ ] **Step 1: Check for hidden or stale branches**
Run: `git fetch --prune`
Expected: Remote branches are synchronized.

- [ ] **Step 2: Ensure we are on master and it's clean**
Run: `git checkout master && git pull origin master`
Expected: Current on the latest master.

- [ ] **Step 3: Commit the MapStyles fix**
Ensure `src/lib/MapStyles.ts` contains the `warning` getter and commit it.
Run: `git add src/lib/MapStyles.ts && git commit -m "fix(styles): add missing warning color for NAH status"`

---

### Task 2: Submodule Synchronization

**Files:**
- Modify: `oe5ith-ci/`

- [ ] **Step 1: Update submodules recursively**
Run: `git submodule update --init --recursive`
Expected: Submodule is at the correct commit.

---

### Task 3: Production Build & Deployment

**Files:**
- Modify: `dist/`, `api/` (on server via rsync)

- [ ] **Step 1: Execute deployment script**
Run: `./deploy-website.sh`
Expected: Build passes, files are synced to `/var/www/map.oe5ith.at`, and Nginx reloads.

- [ ] **Step 2: Verify API response**
Run: `curl -s https://website-v3.oe5ith.at/api/nah.php | jq '.stations[0].in_season'`
Expected: `true` (or correct seasonal status).

---

### Task 4: Final Verification

- [ ] **Step 1: Confirm visually**
Ask the user to check the site at `map.oe5ith.at` (or the internal URL).
- [ ] **Step 2: Push changes to remote**
Run: `git push origin master`
