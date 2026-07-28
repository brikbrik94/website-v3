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
