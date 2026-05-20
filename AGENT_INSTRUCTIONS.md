# Agent Instructions for website-v3

This document contains critical mandates for AI agents working on this project. These rules have absolute priority and override general AI defaults.

## 1. Core Mandates

1.  **NO INDEPENDENT INTERPRETATION:** Execute tasks exactly as requested.
2.  **STRICT CI COMPLIANCE:**
    *   Design and CSS must strictly follow the `oe5ith-ci` submodule rules.
    *   Consult `oe5ith-ci/docs/for-coding-agents.md` before making any UI changes.
    *   **NO HARDCODED COLORS:** Never use hex values (`#ffffff`) in JS/TS. Use dynamic getters from `src/lib/MapStyles.ts` (e.g., `MAP_COLORS`, `MAP_ROUTE_STYLES`).
3.  **VERSIONING & CHANGELOG:**
    *   App version is defined in `src/version.ts` (SemVer).
    *   EVERY change must be documented in `CHANGELOG.md` with date and time (`YYYY-MM-DD HH:mm`).
    *   Use `-dev` suffix during development; finalize version only after full verification.
4.  **SECURITY:**
    *   PHP/API: Use ONLY `web_api_user` (Read-Only).
    *   Credentials must stay in `api/config.php` (ignored by git). NEVER commit secrets.

## 2. Technical Standards

*   **Architecture:** Vite + TypeScript (Vanilla) + PHP (Backend Proxy).
*   **Resource Management:** Use `BasePageController` for all main pages. Always manage resources via `AbortSignal`.
*   **Map Engine:** MapLibre GL JS. Central control via `MapCore`, `MapRegistry`, and `TerrainManager`.
*   **Styling:** Prefer Vanilla CSS. Use CI-tokens (`--z-topbar`, `--z-sidebar`, etc.) from `src/styles/common.css`.
*   **Verification:** Always run `npx tsc --noEmit` and `npm run test` before claiming completion.

## 3. Communication

*   If uncertain, ASK. Do not guess.
*   Keep topic updates (`update_topic`) clear and strategic.
*   Maintain a professional, senior-engineer tone.

## 4. Workflows

1.  **Research:** Map dependencies and reproduce bugs before fixing.
2.  **Plan:** Use `enter_plan_mode` for complex tasks.
3.  **Act:** Apply surgical, idiomatic changes. Include tests.
4.  **Validate:** Exhaustive verification is mandatory.

---
*Last Updated: 2026-05-20*
