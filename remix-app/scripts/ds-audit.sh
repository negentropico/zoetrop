#!/usr/bin/env bash
# ds-audit.sh — Design System audit gate
#
# Gates:
#   UI-01-b  No .jsx files shipped into app/components/ (must be .tsx only)
#   UI-01-i  No banned semantic hexes hardcoded in app/components/ sources
#
# Usage:
#   bash scripts/ds-audit.sh      (from remix-app/)
#   npm run ds:audit
#
# Exits 0 if both gates pass. Exits 1 if either gate fails.
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

# ── Result ────────────────────────────────────────────────────────────────────
if [ "${FAILED}" -eq 1 ]; then
  echo "[ds-audit] FAILED — fix violations above before committing"
  exit 1
else
  echo "[ds-audit] ALL GATES PASSED"
  exit 0
fi
