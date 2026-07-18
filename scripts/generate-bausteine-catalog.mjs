#!/usr/bin/env node
// Generiert docs/architecture/bausteine.md aus den Exports/JSDoc-Kommentaren in src/lib/ —
// den seitenübergreifend wiederverwendbaren Bausteinen (nicht src/features/*/, das dem in
// CLAUDE.md dokumentierten, seitenspezifischen *DataService/*MapLayers/*SidebarAdapter-Muster
// folgt und deshalb kein "Baustein-Katalog"-Kandidat ist).
//
// Ausführen: npm run docs:bausteine (manuell nach Änderungen an src/lib/, kein Build-/Test-Hook).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LIB_DIR = 'src/lib';
const OUTPUT_FILE = 'docs/architecture/bausteine.md';

const EXPORT_RE = /^export\s+(?:default\s+)?(class|function|const|interface|type)\s+([A-Za-z0-9_]+)/;

function stripJsDoc(commentLines) {
  return commentLines
    .join('\n')
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();
}

function findJsDocAbove(lines, exportLineIndex) {
  let end = exportLineIndex - 1;
  while (end >= 0 && lines[end].trim() === '') end--;
  if (end < 0 || !lines[end].trim().endsWith('*/')) return null;

  let start = end;
  while (start >= 0 && !lines[start].trim().startsWith('/**')) start--;
  if (start < 0) return null;

  return stripJsDoc(lines.slice(start, end + 1));
}

function analyzeFile(filePath) {
  const lines = readFileSync(filePath, 'utf8').split('\n');
  const exportedSymbols = [];
  let description = null;

  lines.forEach((line, i) => {
    const match = line.match(EXPORT_RE);
    if (!match) return;
    const [, kind, name] = match;
    exportedSymbols.push({ kind, name });
    if (description === null) {
      description = findJsDocAbove(lines, i);
    }
  });

  return { exportedSymbols, description };
}

function main() {
  const files = readdirSync(LIB_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .sort();

  const entries = files.map((file) => ({ file, ...analyzeFile(join(LIB_DIR, file)) }));

  const out = [];
  out.push('# Bausteine-Katalog: `src/lib/`');
  out.push('');
  out.push('**Automatisch generiert** aus den Exports/JSDoc-Kommentaren in `src/lib/` — nicht von');
  out.push('Hand pflegen, Änderungen gehen beim nächsten Lauf verloren. Neu erzeugen nach');
  out.push('Änderungen an `src/lib/`:');
  out.push('');
  out.push('```bash');
  out.push('npm run docs:bausteine');
  out.push('```');
  out.push('');
  out.push(
    'Umfasst nur `src/lib/` (seitenübergreifend wiederverwendbare Bausteine) — `src/features/*/`'
  );
  out.push(
    'folgt dem in `CLAUDE.md` dokumentierten, seitenspezifischen `*DataService`/`*MapLayers`/'
  );
  out.push('`*SidebarAdapter`-Muster und ist bewusst nicht Teil dieses Katalogs.');
  out.push('');

  for (const entry of entries) {
    const moduleName = entry.file.replace(/\.ts$/, '');
    out.push(`## \`${entry.file}\``);
    out.push('');
    out.push(
      entry.description
        ?? '_TODO: Beschreibung ergänzen (kein JSDoc-Kommentar über dem ersten Export gefunden)._'
    );
    out.push('');
    out.push(`Import: \`from '.../lib/${moduleName}'\` (Pfad relativ zum aufrufenden Modul anpassen)`);
    out.push('');
    if (entry.exportedSymbols.length > 0) {
      out.push('Exports:');
      for (const sym of entry.exportedSymbols) {
        out.push(`- \`${sym.name}\` (${sym.kind})`);
      }
    } else {
      out.push('_Keine Top-Level-Exports gefunden._');
    }
    out.push('');
  }

  writeFileSync(OUTPUT_FILE, out.join('\n'));
  console.log(`✅ ${OUTPUT_FILE} generiert (${entries.length} Dateien in ${LIB_DIR}/).`);
}

main();
