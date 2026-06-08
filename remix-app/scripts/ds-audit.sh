#!/usr/bin/env bash
# ds-audit.sh — Design System audit gate
#
# Gates:
#   UI-01-b  No .jsx files shipped into app/components/ (must be .tsx only)
#   UI-01-i  No banned semantic hexes hardcoded in app/components/ sources
#   UI-01-n  No bare-1fr multi-column grid tracks in app/app.css .zt-grid-*
#            helpers (grid-blowout regression guard — must use minmax(0,1fr))
#
# Usage:
#   bash scripts/ds-audit.sh      (from remix-app/)
#   npm run ds:audit
#
# Exits 0 if all gates pass. Exits 1 if any gate fails.
#
# Wave 3 exclusions cleared — TrendChart brand-token port completed in Phase 04.1 Plan 03.

set -euo pipefail

COMPONENTS_DIR="app/components"
FAILED=0

# ── Gate 1: No .jsx files in app/components/ ──────────────────────────────────
echo "[ds-audit] UI-01-b: checking for .jsx files in ${COMPONENTS_DIR}..."

JSX_FILES=$(find "${COMPONENTS_DIR}" -name '*.jsx' 2>/dev/null || true)

if [ -n "${JSX_FILES}" ]; then
  echo "[ds-audit] FAIL UI-01-b: .jsx files found (must be .tsx):"
  echo "${JSX_FILES}" | sed 's/^/  /'
  FAILED=1
else
  echo "[ds-audit] PASS UI-01-b: no .jsx files in ${COMPONENTS_DIR}"
fi

# ── Gate 2: No banned semantic hexes in app/components/ sources ───────────────
# Banned: hardcoded semantic hex colors that belong in CSS token vars, not code.
# Exempt: comment lines (// or /* or * prefix after optional whitespace).
# Wave exclusions: see header comment above.
echo "[ds-audit] UI-01-i: checking for banned semantic hexes in ${COMPONENTS_DIR}..."

BANNED_HEXES="#22c55e|#3b82f6|#a855f7|#eab308|#ef4444|#f97316"

# Find all .ts/.tsx files in components, strip comment lines, then grep for banned hexes.
HEX_MATCHES=$(
  find "${COMPONENTS_DIR}" -type f \( -name '*.ts' -o -name '*.tsx' \) 2>/dev/null |
  xargs grep -n "" 2>/dev/null |
  grep -v '^[^:]*:[0-9]*:[[:space:]]*[/*]' |
  grep -v '^[^:]*:[0-9]*:[[:space:]]*//' |
  grep -iE "${BANNED_HEXES}" || true
)

if [ -n "${HEX_MATCHES}" ]; then
  echo "[ds-audit] FAIL UI-01-i: banned semantic hexes found (use CSS token vars instead):"
  echo "${HEX_MATCHES}" | sed 's/^/  /'
  FAILED=1
else
  echo "[ds-audit] PASS UI-01-i: no banned semantic hexes in ${COMPONENTS_DIR}"
fi

# ── Gate 3: No bare-1fr multi-column grid tracks in app/app.css ───────────────
# Grid-blowout regression guard (UI-01-n). In CSS Grid a bare `1fr` track is
# `minmax(auto, 1fr)` — its `auto` floor is the column min-content, so a
# non-shrinkable child pushes the track past its 1fr share and blows the grid
# wider than its container (clips later columns). Multi-column .zt-grid-* tracks
# must use `minmax(0, 1fr)` instead. This gate FAILS on any multi-column
# grid-template-columns in app/app.css that still uses a bare `1fr` track.
CSS_FILE="app/app.css"
echo "[ds-audit] UI-01-n: checking for bare-1fr multi-column grid tracks in ${CSS_FILE}..."

# Match grid-template-columns declarations that contain a bare-1fr MULTI-column
# track and do NOT use minmax(0:
#   repeat(<n>, 1fr)   — repeat form
#   1fr 1fr (1fr ...)  — explicit multi-column form
# Single-column `1fr` (e.g. mobile collapse `grid-template-columns: 1fr;`) and
# minmax(0, 1fr) forms PASS.
GRID_VIOLATIONS=$(
  grep -nE "grid-template-columns:" "${CSS_FILE}" 2>/dev/null |
  grep -v "minmax(0" |
  grep -E "repeat\([0-9]+,[[:space:]]*1fr\)|1fr[[:space:]]+1fr" || true
)

if [ -n "${GRID_VIOLATIONS}" ]; then
  echo "[ds-audit] FAIL UI-01-n: bare-1fr multi-column grid tracks found (use minmax(0,1fr)):"
  echo "${GRID_VIOLATIONS}" | sed 's/^/  /'
  FAILED=1
else
  echo "[ds-audit] PASS UI-01-n: no bare-1fr multi-column grid tracks in ${CSS_FILE}"
fi

# ── Result ────────────────────────────────────────────────────────────────────
if [ "${FAILED}" -eq 1 ]; then
  echo "[ds-audit] FAILED — fix violations above before committing"
  exit 1
else
  echo "[ds-audit] ALL GATES PASSED"
  exit 0
fi
