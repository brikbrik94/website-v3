#!/usr/bin/env node
// Fährt Lighthouse-Performance-/Accessibility-/Best-Practices-Audits gegen alle 6 Kartenseiten
// und schreibt rohe Reports nach perf-reports/ (gitignored). Startet/stoppt Vite + PHP-Dev-Server
// selbst, kein vorheriges "npm run dev" nötig.
// Voraussetzung: Playwright-Chromium installiert (npx playwright install chromium, einmalig).
//
// Ausführen: npm run perf:audit
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const VITE_URL = 'http://100.64.0.1:8000/';
const REPORT_DIR = 'perf-reports';
const CATEGORIES = ['performance', 'accessibility', 'best-practices'];
const PAGES = [
  ['karte', '/karte'],
  ['routing', '/routing'],
  ['nah', '/nah'],
  ['coords', '/coords'],
  ['tracking', '/tracking'],
  ['isochrones', '/isochrones']
];
const SERVER_READY_TIMEOUT_MS = 15000;
const SERVER_POLL_INTERVAL_MS = 300;

function startDevServers() {
  const vite = spawn('node_modules/.bin/vite', [], { stdio: 'inherit' });
  const php = spawn('php', ['-S', '127.0.0.1:8081', 'router.php'], {
    cwd: 'api',
    stdio: 'inherit'
  });

  vite.on('error', (err) => {
    console.error(`Fehler beim Starten von Vite: ${err.message}`);
    stopDevServers({ vite, php });
    process.exit(1);
  });

  php.on('error', (err) => {
    console.error(`Fehler beim Starten von PHP: ${err.message}`);
    stopDevServers({ vite, php });
    process.exit(1);
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
  } catch (err) {
    console.error(`Audit-Lauf abgebrochen — ${err.message}`);
    console.error('Falls Playwrights Chromium fehlt: npx playwright install chromium');
    process.exitCode = 1;
    return;
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
