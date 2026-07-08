#!/usr/bin/env bash
# OWASP-Top-10-Teilaudit: automatisierbare Checks.
# Deckt NICHT alle 10 Kategorien ab — siehe docs/security/owasp-top10-checklist.md
# für die vollständige Bewertung inkl. manueller Kategorien.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FAILED=0

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; FAILED=1; }
warn() { echo "  ⚠️  $1"; }

echo "=== OWASP Security-Audit (automatisierbare Checks) ==="
echo

# --- Check 1: Keine Secret-Literale außerhalb von config.local.php ---
echo "[1/5] Secret-Pattern-Scan in api/*.php (außer config.local.php*)"
SECRET_HITS=$(grep -rEn "define\s*\(\s*'[A-Z_]*(PASS|SECRET|KEY|TOKEN)[A-Z_]*'\s*,\s*'[A-Za-z0-9+/=_%#-]{12,}'" \
    api/*.php 2>/dev/null | grep -v "api/config.local.php" || true)
if [ -z "$SECRET_HITS" ]; then
    pass "Keine hardcoded Secret-Literale in api/*.php gefunden"
else
    fail "Mögliche Secret-Literale gefunden:"
    echo "$SECRET_HITS" | sed 's/^/      /'
fi
echo

# --- Check 2: config.local.php ist in .gitignore gelistet ---
echo "[2/5] config.local.php in .gitignore?"
if grep -q "config.local.php" .gitignore 2>/dev/null; then
    pass "config.local.php ist in .gitignore gelistet"
else
    fail "config.local.php fehlt in .gitignore"
fi
echo

# --- Check 3: config.local.php ist nicht von git getrackt ---
echo "[3/5] config.local.php nicht getrackt?"
if git ls-files --error-unmatch api/config.local.php >/dev/null 2>&1; then
    fail "api/config.local.php ist von git getrackt (sollte gitignored sein!)"
else
    pass "api/config.local.php ist nicht getrackt"
fi
echo

# --- Check 4: SQL-String-Interpolation-Heuristik (informativ, kein Hard-Fail) ---
echo "[4/5] SQL-String-Interpolation-Heuristik (informativ)"
SQL_INTERP=$(grep -rEn 'pg_query\s*\(\s*\$[a-zA-Z_]+\s*,\s*"[^"]*\$' api/*.php 2>/dev/null || true)
if [ -z "$SQL_INTERP" ]; then
    pass "Keine offensichtliche SQL-String-Interpolation gefunden"
else
    warn "SQL-String-Interpolation gefunden (kann sicher sein, wenn Werte vorher gecastet/aus geschlossenem Set stammen — manuell prüfen):"
    echo "$SQL_INTERP" | sed 's/^/      /'
fi
echo

# --- Check 5: DB_USER referenziert read-only Nutzer ---
echo "[5/5] DB_USER = web_api_user (Read-only-Konvention)?"
if grep -q "define('DB_USER', 'web_api_user')" api/config.php 2>/dev/null; then
    pass "DB_USER ist auf web_api_user (read-only) gesetzt"
else
    fail "DB_USER-Default in api/config.php weicht von web_api_user ab — prüfen"
fi
echo

echo "=== Ergebnis ==="
if [ "$FAILED" -eq 0 ]; then
    echo "Alle automatisierbaren Checks bestanden."
    exit 0
else
    echo "Mindestens ein Check fehlgeschlagen — siehe oben."
    exit 1
fi
