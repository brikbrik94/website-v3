#!/usr/bin/env bash
# Beendet hängen gebliebene Dev-Server-Prozesse dieses Projekts (Vite Port 8000, PHP-API Port
# 8081) und leert den Vite-Dependency-Optimize-Cache.
#
# Hintergrund: concurrently --kill-others (siehe package.json "dev") beendet zwar den einen
# Prozess, sobald der andere abstürzt — das greift aber nicht mehr, wenn der concurrently-
# Elternprozess selbst schon weg ist (z.B. eine frühere Session, die beendet wurde, ohne die
# Kindprozesse sauber zu stoppen). Die Kindprozesse laufen dann unabhängig weiter, ohne dass
# irgendetwas sie noch beendet, z.B. mit einem gecrashten PHP-Server bei weiterhin laufendem
# Vite (führt zu "504 Outdated Optimize Dep"-Fehlern im Browser durch einen veralteten Cache).
#
# Verwendung: npm run dev:reset (danach npm run dev neu starten).
set -euo pipefail

VITE_PORT=8000
API_PORT=8081

kill_port() {
  local port="$1"
  local label="$2"
  local pids
  pids=$(lsof -ti":${port}" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Beende ${label} auf Port ${port} (PID(s): ${pids})"
    kill -9 $pids
  else
    echo "${label} auf Port ${port}: kein laufender Prozess gefunden"
  fi
}

kill_port "$VITE_PORT" "Vite-Dev-Server"
kill_port "$API_PORT" "PHP-API-Server"

if [ -d node_modules/.vite ]; then
  echo "Leere node_modules/.vite Cache"
  rm -rf node_modules/.vite
else
  echo "Kein node_modules/.vite Cache vorhanden"
fi

echo "Fertig. Jetzt: npm run dev"
