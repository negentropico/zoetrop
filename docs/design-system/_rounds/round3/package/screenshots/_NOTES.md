# Round 3 reference screenshots — capture notes

**Captured:** 2026-06-12, from the LIVE local dev server (`http://localhost:5173`,
branch `left-nav-refactor` base) — owner-authenticated session, viewport 1280px,
full-page captures, light AND dark themes (via `zt-theme` localStorage +
`data-theme` remap).

**Tooling:** Playwright (locally cached) driving headless Chromium. 50/50
captures succeeded.

## Coverage

Every Part A route from BRIEF.md was visited in both themes:

| Route | Slug | Notes |
|-------|------|-------|
| `/` | `landing` | public, signed-out |
| `/login` | `login` | public, signed-out |
| `/dashboard` | `dashboard` | |
| `/metrics` | `metrics` | |
| `/metrics/autonomic` | `metrics-category` | representative category |
| `/metrics/autonomic/autonomic-hrv-m4` | `metrics-detail` | + `metrics-detail-tooltip-{theme}` chart-hover captures |
| `/protocol` | `protocol` | |
| `/protocol/versions` | `protocol-versions` | |
| `/protocol/versions/P6` | `protocol-version-detail` | first version link |
| `/protocol/supplements` | `protocol-supplements` | |
| `/protocol/cessation` | `protocol-cessation` | |
| `/protocol/compare` | `protocol-compare` | |
| `/insights` | `insights` | |
| `/insights/correlations` | `insights-correlations` | + `insights-correlations-hover-{theme}` row-hover captures |
| `/insights/genetics` | `insights-genetics` | |
| `/import` | `import` | |
| `/import/whoop` | `import-whoop` | |
| `/import/vault` | `import-vault` | |
| `/ingest` | `ingest` | **redirected → `/ingest/upload`** (index redirect) |
| `/ingest/upload` | `ingest-upload` | |
| `/ingest/review` | `ingest-review` | |
| `/ingest/consent` | `ingest-consent` | **redirected → `/ingest/upload`** (owner consent already granted, gate skips) |
| `/settings` | `settings` | |

## Gates / redirects encountered

- **No route was unreachable.** All authed routes rendered after owner sign-in.
- `/ingest` and `/ingest/consent` both redirect to `/ingest/upload` — the ingest
  index is a redirect route, and the consent gate auto-skips when consent is
  already on file for the owner. The captures named `ingest-*` and
  `ingest-consent-*` therefore show the upload screen.
- The live sidebar includes a **Reports** group (Phase 6 engine reports) that
  post-dates the round 3 `current-state/nav-tree.ts` snapshot — expected drift,
  visible in all authed captures.

## Purpose

Historical visual reference of the pre-round-3 state. Only essential frames get
uploaded to the design session; this set is completeness-over-curation.
