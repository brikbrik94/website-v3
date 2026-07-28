# Lokales Performance-Audit-Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein wiederholbares, committetes lokales Tooling schaffen, das Lighthouse-Performance-/Accessibility-/Best-Practices-Audits gegen alle 6 Kartenseiten sowie eine Bundle-Größen-Analyse fährt, und damit einen ersten kuratierten Baseline-Report zu produzieren.

**Architecture:** Ein Node-Skript (`scripts/perf-audit.mjs`) startet Vite + PHP-Dev-Server als eigene Kindprozesse, wartet auf Erreichbarkeit, startet Playwrights bereits lokal gecachten Chromium über `chrome-launcher`, fährt Lighthouse nacheinander gegen alle 6 Seiten-URLs, schreibt rohe Reports nach `perf-reports/` (gitignored) und fährt Server + Chrome sauber wieder herunter — auch bei Fehlern. Parallel dazu ein Vite-Plugin (`rollup-plugin-visualizer`), aktiviert per `ANALYZE=1`-Env-Var, für die Bundle-Größen-Analyse ohne Server. Der letzte Task liest die rohen Reports und schreibt daraus einen kuratierten, committeten Report nach `docs/performance/`.

**Tech Stack:** Node.js (`node:child_process`, `node:http`, `node:fs`), `playwright` (nur `chromium.executablePath()`, kein eigenes Browser-Driving), `chrome-launcher`, `lighthouse` (Node-API), `rollup-plugin-visualizer` (Vite-Plugin).

## Global Constraints

- Getestete, funktionierende Versionen (in dieser Sandbox end-to-end verifiziert, siehe Spec): `playwright@1.62.0`, `lighthouse@13.4.1`, `chrome-launcher@1.2.1`, `rollup-plugin-visualizer@7.0.1`. In `package.json` mit `^` pinnen (Repo-Konvention, siehe bestehende devDependencies).
- Chrome **muss** mit `--headless=new` und `--no-sandbox` gestartet werden (läuft als `root` in dieser Umgebung — ohne `--no-sandbox` verweigert Chrome den Start).
- Dev-Server-URL ist fix `http://100.64.0.1:8000/` (siehe `vite.config.ts:8-9`, `host`/`port`/`strictPort`) — **nicht** `127.0.0.1` oder `localhost` verwenden, das schlägt fehl (in dieser Session bereits einmal falsch versucht).
- Sechs Zielseiten (fester Pfad-Slug → URL-Pfad): `karte`→`/karte`, `routing`→`/routing`, `nah`→`/nah`, `coords`→`/coords`, `tracking`→`/tracking`, `isochrones`→`/isochrones`.
- Lighthouse-Kategorien: exakt `['performance', 'accessibility', 'best-practices']` (kein `seo`, kein `pwa`).
- Rohe Reports → `perf-reports/` (neu, muss in `.gitignore`). Kuratierter Report → `docs/performance/` (neu, wird committed).
- Jeder Task-Commit folgt der Repo-Konvention: Dateien einzeln staged (nie `git add -A`), Conventional-Commits-Präfix, deutscher Subject-Text.
- **Task 1 committet zusätzlich** die bereits vorhandenen, noch unkommitteten Dateien `docs/superpowers/specs/2026-07-28-perf-audit-tooling-design.md` und `docs/superpowers/plans/2026-07-28-perf-audit-tooling.md` (Repo-Konvention: Spec/Plan reiten mit dem ersten Code-Commit der Umsetzung, kein eigener Doku-Commit).

---

## Task 1: Bundle-Größen-Analyse (`npm run perf:bundle`)

Eigenständig lauffähig, kein Dev-Server nötig — guter erster, risikoarmer Schritt.

**Files:**
- Modify: `package.json` (neue devDependency `rollup-plugin-visualizer`, neues Script `perf:bundle`)
- Modify: `vite.config.ts`
- Modify: `.gitignore`
- Also stage (nicht modifizieren, nur mit committen): `docs/superpowers/specs/2026-07-28-perf-audit-tooling-design.md`, `docs/superpowers/plans/2026-07-28-perf-audit-tooling.md`

**Interfaces:**
- Produces: `npm run perf:bundle` → schreibt `perf-reports/bundle-treemap.html` (interaktiv, für Menschen) und `perf-reports/bundle-stats.json` (maschinenlesbar, für Task 5).

- [ ] **Step 1: `rollup-plugin-visualizer` installieren**

```bash
npm install --save-dev rollup-plugin-visualizer@^7.0.1
```

- [ ] **Step 2: `.gitignore` um `perf-reports/` ergänzen**

Am Ende der Datei (nach dem bestehenden `scratch/`/`*.local.*`-Block) ergänzen:

```
# Lokales Performance-Audit-Tooling (siehe scripts/perf-audit.mjs, npm run perf:*)
perf-reports/
```

- [ ] **Step 3: `vite.config.ts` um den Visualizer erweitern**

```ts
import { defineConfig, loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: process.env.ANALYZE
      ? [
          visualizer({
            filename: 'perf-reports/bundle-treemap.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true
          }),
          visualizer({
            filename: 'perf-reports/bundle-stats.json',
            json: true,
            gzipSize: true,
            brotliSize: true
          })
        ]
      : [],
    server: {
      host: '100.64.0.1',
      port: 8000,
      strictPort: true,
      watch: {
        ignored: ['**/oe5ith-ci/**']
      },
      proxy: {
        '/api/': {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      target: 'esnext'
    }
  };
});
```

(`env` bleibt ungenutzt-aber-vorhanden wie im Original — falls `tsc --noEmit` das als unbenutzte Variable moniert, siehe Step 5.)

- [ ] **Step 4: `package.json` — Script ergänzen**

In `"scripts"` (nach `"build"`) ergänzen:

```json
    "perf:bundle": "ANALYZE=1 vite build",
```

- [ ] **Step 5: Verifizieren — normaler Build bleibt unverändert**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: alle drei grün wie vorher, **kein** `perf-reports/`-Ordner entsteht (Plugin ist nur bei gesetztem `ANALYZE` aktiv).

- [ ] **Step 6: Verifizieren — Analyse-Build erzeugt Reports**

Run: `npm run perf:bundle`
Expected: Exit-Code 0; `perf-reports/bundle-treemap.html` und `perf-reports/bundle-stats.json` existieren; `node -e "console.log(Object.keys(JSON.parse(require('fs').readFileSync('perf-reports/bundle-stats.json'))))"` läuft ohne Fehler (valides JSON).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts .gitignore \
  docs/superpowers/specs/2026-07-28-perf-audit-tooling-design.md \
  docs/superpowers/plans/2026-07-28-perf-audit-tooling.md
git commit -m "$(cat <<'EOF'
feat(perf): Bundle-Größen-Analyse via rollup-plugin-visualizer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Dev-Server-Lifecycle für das Audit-Skript

Legt `scripts/perf-audit.mjs` an — in diesem Task nur Server-Start/Wait/Stop, noch ohne Lighthouse (das kommt in Task 3). Eigenständig testbar: Skript startet Server, meldet Bereitschaft, fährt wieder runter.

**Files:**
- Create: `scripts/perf-audit.mjs`

**Interfaces:**
- Produces: `startDevServers()` → `{ vite: ChildProcess, php: ChildProcess }`; `stopDevServers(servers)` → `void`; `waitForServer(url, timeoutMs)` → `Promise<void>` (resolved sobald `url` per HTTP GET antwortet, reject nach Timeout). `VITE_URL` (Konstante, `'http://100.64.0.1:8000/'`).

- [ ] **Step 1: Skript-Grundgerüst schreiben**

```js
#!/usr/bin/env node
// Fährt Lighthouse-Performance-/Accessibility-/Best-Practices-Audits gegen alle 6 Kartenseiten
// und schreibt rohe Reports nach perf-reports/ (gitignored). Startet/stoppt Vite + PHP-Dev-Server
// selbst, kein vorheriges "npm run dev" nötig.
//
// Ausführen: npm run perf:audit
import { spawn } from 'node:child_process';
import http from 'node:http';

const VITE_URL = 'http://100.64.0.1:8000/';
const SERVER_READY_TIMEOUT_MS = 15000;
const SERVER_POLL_INTERVAL_MS = 300;

function startDevServers() {
  const vite = spawn('node_modules/.bin/vite', [], { stdio: 'inherit' });
  const php = spawn('php', ['-S', '127.0.0.1:8081', 'router.php'], {
    cwd: 'api',
    stdio: 'inherit'
  });
  return { vite, php };
}

function stopDevServers({ vite, php }) {
  vite.kill('SIGTERM');
  php.kill('SIGTERM');
}

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`Server unter ${url} nach ${timeoutMs}ms nicht erreichbar`));
        } else {
          setTimeout(attempt, SERVER_POLL_INTERVAL_MS);
        }
      });
    };
    attempt();
  });
}

async function main() {
  const servers = startDevServers();
  process.on('SIGINT', () => stopDevServers(servers));
  process.on('SIGTERM', () => stopDevServers(servers));
  try {
    await waitForServer(VITE_URL, SERVER_READY_TIMEOUT_MS);
    console.log('Dev-Server bereit:', VITE_URL);
  } finally {
    stopDevServers(servers);
  }
}

main();
```

- [ ] **Step 2: Ausführbar machen und manuell verifizieren**

```bash
chmod +x scripts/perf-audit.mjs
node scripts/perf-audit.mjs
```

Expected: Ausgabe endet mit `Dev-Server bereit: http://100.64.0.1:8000/`, Prozess terminiert danach von selbst (kein Hängenbleiben).

- [ ] **Step 3: Verifizieren, dass keine Prozesse hängen bleiben**

Run direkt nach Step 2: `curl -sI --max-time 2 http://100.64.0.1:8000/ ; curl -sI --max-time 2 http://127.0.0.1:8081/`
Expected: beide `curl`-Aufrufe schlagen fehl (Connection refused) — Vite und PHP wurden sauber beendet.

- [ ] **Step 4: Regressionscheck**

Run: `npx tsc --noEmit && npm test`
Expected: beide grün — `scripts/perf-audit.mjs` ist ein eigenständiges `.mjs`-Skript außerhalb von `src/`, sollte also keinen Einfluss auf App-Typecheck/-Tests haben; dieser Schritt bestätigt das.

- [ ] **Step 5: Commit**

```bash
git add scripts/perf-audit.mjs
git commit -m "$(cat <<'EOF'
feat(perf): Dev-Server-Lifecycle für Performance-Audit-Skript

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Lighthouse-Single-Page-Audit + Report-Writer

Erweitert `scripts/perf-audit.mjs` um die eigentliche Lighthouse-Logik für **eine** Seite. Multi-Page-Orchestrierung folgt in Task 4.

**Files:**
- Modify: `scripts/perf-audit.mjs`
- Modify: `package.json` (neue devDependencies)

**Interfaces:**
- Consumes: `VITE_URL` (aus Task 2).
- Produces: `auditPage(pageName, url, chrome)` → `Promise<{ pageName: string, scores: { performance: number, accessibility: number, 'best-practices': number }, lcp: string, cls: string, tbt: string }>` (bei Erfolg) — wirft bei Lighthouse-Fehler. Schreibt als Nebeneffekt `perf-reports/<pageName>.json` (voller Lighthouse-Result, `lhr`) und `perf-reports/<pageName>.html` (Lighthouse-HTML-Report). `REPORT_DIR` (Konstante, `'perf-reports'`), `CATEGORIES` (Konstante, `['performance', 'accessibility', 'best-practices']`).

- [ ] **Step 1: Dependencies installieren**

```bash
npm install --save-dev playwright@^1.62.0 lighthouse@^13.4.1 chrome-launcher@^1.2.1
```

- [ ] **Step 2: Imports und `auditPage()` ergänzen**

Am Kopf von `scripts/perf-audit.mjs` ergänzen (nach den bestehenden Imports):

```js
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const REPORT_DIR = 'perf-reports';
const CATEGORIES = ['performance', 'accessibility', 'best-practices'];
```

Nach `waitForServer()` ergänzen:

```js
async function auditPage(pageName, url, chrome) {
  const result = await lighthouse(url, { port: chrome.port, onlyCategories: CATEGORIES });
  const { lhr } = result;

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, `${pageName}.json`), JSON.stringify(lhr, null, 2));
  fs.writeFileSync(path.join(REPORT_DIR, `${pageName}.html`), result.report);

  return {
    pageName,
    scores: Object.fromEntries(CATEGORIES.map((c) => [c, lhr.categories[c].score])),
    lcp: lhr.audits['largest-contentful-paint'].displayValue,
    cls: lhr.audits['cumulative-layout-shift'].displayValue,
    tbt: lhr.audits['total-blocking-time'].displayValue
  };
}
```

- [ ] **Step 3: `main()` temporär auf Einzelseiten-Audit umstellen (nur für diesen Verifikationsschritt)**

`main()` in `scripts/perf-audit.mjs` durch folgende Version ersetzen (Task 4 ersetzt das wieder durch die volle Orchestrierung — dieser Zwischenstand dient nur der Verifikation von `auditPage()`):

```js
async function main() {
  const servers = startDevServers();
  process.on('SIGINT', () => stopDevServers(servers));
  process.on('SIGTERM', () => stopDevServers(servers));
  try {
    await waitForServer(VITE_URL, SERVER_READY_TIMEOUT_MS);
    const chrome = await chromeLauncher.launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless=new', '--no-sandbox']
    });
    try {
      const result = await auditPage('karte', VITE_URL.replace(/\/$/, '') + '/karte', chrome);
      console.log(JSON.stringify(result, null, 2));
    } finally {
      await chrome.kill();
    }
  } finally {
    stopDevServers(servers);
  }
}

main();
```

- [ ] **Step 4: Verifizieren**

Run: `node scripts/perf-audit.mjs`
Expected: Exit-Code 0; gedrucktes JSON enthält `pageName: "karte"` und `scores.performance`/`scores.accessibility`/`scores['best-practices']` als Zahlen zwischen 0 und 1; `perf-reports/karte.json` und `perf-reports/karte.html` existieren.

- [ ] **Step 5: Regressionscheck**

Run: `npx tsc --noEmit && npm test`
Expected: beide grün.

- [ ] **Step 6: Commit**

```bash
git add scripts/perf-audit.mjs package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat(perf): Lighthouse-Single-Page-Audit in Performance-Audit-Skript

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Multi-Page-Orchestrierung + `npm run perf:audit`

Ersetzt den Task-3-Zwischenstand von `main()` durch die volle Orchestrierung über alle 6 Seiten, mit Fehlerbehandlung pro Seite (eine fehlgeschlagene Seite bricht nicht den gesamten Lauf ab).

**Files:**
- Modify: `scripts/perf-audit.mjs`
- Modify: `package.json` (neues Script `perf:audit`)

**Interfaces:**
- Consumes: `auditPage()`, `startDevServers()`, `stopDevServers()`, `waitForServer()`, `VITE_URL`, `REPORT_DIR` (alle aus Task 2/3).
- Produces: `npm run perf:audit` → schreibt `perf-reports/summary.json` (Array aus Pro-Seiten-Ergebnissen bzw. `{ pageName, error }` bei Fehlschlag), Exit-Code `1` nur wenn **alle** Seiten fehlschlagen, sonst `0`.

- [ ] **Step 1: `PAGES`-Konstante ergänzen**

Nach `CATEGORIES` ergänzen:

```js
const PAGES = [
  ['karte', '/karte'],
  ['routing', '/routing'],
  ['nah', '/nah'],
  ['coords', '/coords'],
  ['tracking', '/tracking'],
  ['isochrones', '/isochrones']
];
```

- [ ] **Step 2: `main()` durch die volle Orchestrierung ersetzen**

```js
async function main() {
  const servers = startDevServers();
  let chrome;
  process.on('SIGINT', () => {
    stopDevServers(servers);
    if (chrome) chrome.kill();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    stopDevServers(servers);
    if (chrome) chrome.kill();
    process.exit(0);
  });

  const results = [];
  try {
    await waitForServer(VITE_URL, SERVER_READY_TIMEOUT_MS);
    chrome = await chromeLauncher.launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless=new', '--no-sandbox']
    });
    try {
      for (const [pageName, urlPath] of PAGES) {
        const url = VITE_URL.replace(/\/$/, '') + urlPath;
        try {
          const result = await auditPage(pageName, url, chrome);
          results.push(result);
          console.log(`✅ ${pageName}: performance=${result.scores.performance} lcp=${result.lcp}`);
        } catch (err) {
          console.error(`❌ ${pageName}: Audit fehlgeschlagen — ${err.message}`);
          results.push({ pageName, error: err.message });
        }
      }
    } finally {
      await chrome.kill();
    }
  } finally {
    stopDevServers(servers);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'summary.json'), JSON.stringify(results, null, 2));

  if (results.every((r) => r.error)) {
    console.error('Alle Seiten-Audits fehlgeschlagen.');
    process.exitCode = 1;
  }
}

main();
```

- [ ] **Step 3: `package.json` — Script ergänzen**

In `"scripts"` (nach `"perf:bundle"`) ergänzen:

```json
    "perf:audit": "node scripts/perf-audit.mjs",
```

- [ ] **Step 4: Voller Lauf verifizieren**

Run: `npm run perf:audit`
Expected: Exit-Code 0; Konsole zeigt 6 Zeilen (`✅` oder `❌` pro Seite); `perf-reports/summary.json` enthält ein Array mit 6 Einträgen; `perf-reports/karte.json` … `perf-reports/isochrones.json` existieren (bzw. fehlen nur für Seiten mit `error`).

- [ ] **Step 5: Verifizieren, dass nach dem Lauf keine Prozesse hängen bleiben**

Run direkt danach: `curl -sI --max-time 2 http://100.64.0.1:8000/ ; curl -sI --max-time 2 http://127.0.0.1:8081/`
Expected: beide schlagen fehl.

- [ ] **Step 6: Regressionscheck**

Run: `npx tsc --noEmit && npm test`
Expected: beide grün.

- [ ] **Step 7: Commit**

```bash
git add scripts/perf-audit.mjs package.json
git commit -m "$(cat <<'EOF'
feat(perf): npm run perf:audit — Multi-Page-Lighthouse-Audit über alle Kartenseiten

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Baseline-Report schreiben + priorisierte Befunde in TODO.md

Kein neuer Code — liest die in Task 1/4 erzeugten rohen Reports aus, schreibt daraus den kuratierten, committeten Baseline-Report und trägt priorisierte Befunde in `docs/TODO.md` ein (Umsetzung der Fixes selbst ist **nicht** Teil dieser Runde, siehe Spec).

**Files:**
- Create: `docs/performance/2026-07-28-baseline-audit.md`
- Modify: `docs/TODO.md`

- [ ] **Step 1: Rohdaten extrahieren**

```bash
npm run perf:bundle
npm run perf:audit
node -e "
const fs = require('fs');
const summary = JSON.parse(fs.readFileSync('perf-reports/summary.json'));
for (const r of summary) {
  if (r.error) { console.log(r.pageName, 'FEHLER:', r.error); continue; }
  console.log(r.pageName, JSON.stringify(r.scores), 'LCP', r.lcp, 'CLS', r.cls, 'TBT', r.tbt);
}
"
```

Für jede erfolgreich auditierte Seite zusätzlich die Top-3-„Opportunities" (nicht-bestandene Audits mit `details.type === 'opportunity'`, sortiert nach `numericValue` absteigend) auslesen:

```bash
node -e "
const fs = require('fs');
const lhr = JSON.parse(fs.readFileSync('perf-reports/karte.json'));
const opportunities = Object.values(lhr.audits)
  .filter((a) => a.details && a.details.type === 'opportunity' && a.score !== null && a.score < 1)
  .sort((a, b) => (b.numericValue || 0) - (a.numericValue || 0))
  .slice(0, 3)
  .map((a) => ({ title: a.title, displayValue: a.displayValue }));
console.log(JSON.stringify(opportunities, null, 2));
"
```

(Für jede der 6 Seiten wiederholen, `karte` durch den jeweiligen `pageName` ersetzen.)

Für die Bundle-Analyse: `perf-reports/bundle-stats.json` einlesen, die 5 größten Top-Level-Module nach `gzipLength`/`renderedLength` identifizieren (Struktur: verschachtelte `nodeParts`/`nodeMetas` bzw. `tree.children`, je nach Visualizer-Version — beim Ausführen die tatsächliche JSON-Struktur zuerst mit `Object.keys()` inspizieren, bevor der genaue Pfad feststeht, da die interne Struktur von `rollup-plugin-visualizer` zwischen Versionen wechseln kann).

- [ ] **Step 2: Report schreiben**

`docs/performance/2026-07-28-baseline-audit.md` mit folgender Struktur (Platzhalter durch echte Werte aus Step 1 ersetzen):

```markdown
# Performance-Baseline-Audit 2026-07-28

Erste Messung der in `CLAUDE.md` als „ungemessen" markierten Core-Web-Vitals-Zielmetriken.
Tooling: `npm run perf:audit` (Lighthouse) + `npm run perf:bundle` (Bundle-Größe), siehe
[docs/superpowers/specs/2026-07-28-perf-audit-tooling-design.md](../superpowers/specs/2026-07-28-perf-audit-tooling-design.md).
Lighthouse-Preset: Default (mobile, simuliertes Throttling) — siehe Spec, „Nicht Teil dieser
Spec" für den bewusst verworfenen Desktop-Vergleichslauf.

## Scores pro Seite

| Seite | Performance | Accessibility | Best Practices | LCP | CLS | TBT |
|---|---|---|---|---|---|---|
| /karte | … | … | … | … | … | … |
| /routing | … | … | … | … | … | … |
| /nah | … | … | … | … | … | … |
| /coords | … | … | … | … | … | … |
| /tracking | … | … | … | … | … | … |
| /isochrones | … | … | … | … | … | … |

## Bundle-Größe: größte Module

… (Top 5 aus `perf-reports/bundle-stats.json`, mit gzip-Größe) …

## Priorisierte Befunde

Sortiert nach geschätzter Wirkung (aus den Lighthouse-„Opportunities" pro Seite, dedupliziert wo
mehrere Seiten denselben Befund teilen — z.B. gilt ein globaler Bundle-Fund für alle 6 Seiten
gleichermaßen). Für jeden Befund: Titel, betroffene Seite(n), grobe Einordnung. Konkrete
Umsetzung ist nicht Teil dieser Runde — siehe entsprechende TODO.md-Einträge (Step 3).

1. …
2. …
3. …
```

- [ ] **Step 3: Befunde nach TODO.md übertragen**

Für jeden der in Step 2 identifizierten Befunde einen eigenen Punkt unter einer neuen Sektion
„## Performance (Baseline-Audit 2026-07-28)" in `docs/TODO.md` ergänzen (nach dem bestehenden
Muster: `- [ ] **Kurztitel.** Beschreibung, betroffene Seite(n)/Datei, Verweis auf
`docs/performance/2026-07-28-baseline-audit.md` für Details.`).

- [ ] **Step 4: Verifizieren**

Run: `npx tsc --noEmit && npm test`
Expected: unverändert grün (reine Doku-Änderung in diesem Task, kein App-Code betroffen).

- [ ] **Step 5: Commit**

```bash
git add docs/performance/2026-07-28-baseline-audit.md docs/TODO.md
git commit -m "$(cat <<'EOF'
docs(perf): Performance-Baseline-Audit + priorisierte Befunde in TODO.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
