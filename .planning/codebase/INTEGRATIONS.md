# External Integrations

**Analysis Date:** 2026-06-07

## APIs & External Services

**Fonts:**
- Google Fonts CDN — Inter variable font served from `fonts.googleapis.com` and `fonts.gstatic.com`
  - Loaded via `<link>` preconnect + stylesheet in `remix-app/app/root.tsx` (lines 14–25)
  - No API key required; purely CDN

**No other external APIs are called at runtime.** There is no Stripe, no auth provider SDK, no analytics service, no error tracking, and no REST/GraphQL client integrating with a third-party service.

## Data Storage

**Databases:**
- Neon Postgres (serverless PostgreSQL)
  - Connection env vars: `NETLIFY_DATABASE_URL` (primary) or `DATABASE_URL` (fallback)
  - Client: `@neondatabase/serverless` Pool + Drizzle ORM (`drizzle-orm/neon-serverless`)
  - Singleton lazy-init pattern in `remix-app/app/lib/db.server.ts`
  - Schema: 8 tables defined in `remix-app/db/schema.ts` — `metrics`, `protocolVersions`, `protocolChanges`, `milestones`, `supplements`, `supplementLog`, `correlations`, `cessationLog`
  - Managed via Netlify Postgres extension; Netlify sets `NETLIFY_DATABASE_URL` automatically on deploy
  - Netlify site ID: `0abb12f6-d11b-4f81-8a8d-86b44e99088f`

**File Storage:**
- Local filesystem only — no S3, GCS, or CDN file storage integrated

**Caching:**
- None — no Redis, Memcached, or CDN caching layer configured

## Authentication & Identity

**Auth Provider:**
- None — no authentication system is implemented. The application is single-user (n=1 personal dashboard) with no login, no sessions, no roles, and no identity layer.
- `PLATFORM.md` documents multi-tenancy + auth as the next major architectural addition (M1 milestone), but it is not present in the current codebase.

## Data Import Sources (Manual, Not API)

**WHOOP:**
- Integration type: file-based import (not live API)
- Source: `whoop_analysis_report.json` exported from Whoop Analyzer tool at `/Users/mac/Code/Whoop/results/whoop_analysis_report.json`
- Import route: `remix-app/app/routes/import/whoop.tsx`
- Mechanism: form upload (file or pasted JSON) parsed client-side + server action; no WHOOP OAuth or REST API calls
- Metrics extracted: HRV, Recovery, RHR, sleep, TDEE

**Obsidian Vault:**
- Integration type: file-based import (not live API)
- Source: markdown files from `/Users/mac/vaults/#Bwell/602/` and `603/` directories
- Import route: `remix-app/app/routes/import/vault.tsx`
- Mechanism: form upload of markdown file; server action parses markdown tables for bloodwork metrics
- No Obsidian plugin, HTTP API, or sync protocol involved

**Static Data (In-Code):**
- `remix-app/app/lib/real-data.ts` — 1,344-line file containing hardcoded blood work, body composition, and WHOOP metrics across milestones M1–M4 (Feb 2025 – Jan 2026)
- `remix-app/app/lib/protocol-data.ts` — protocol versions P0–P6, supplements, cessation tracking
- `remix-app/app/lib/seed-data.ts` — correlations and genetic variants seed data
- This is the primary data source currently; the Neon DB schema exists and is migrated but routes load from `lib/` not DB

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar service integrated

**Logs:**
- Standard console/Netlify function logs only; no structured logging service

## CI/CD & Deployment

**Hosting:**
- Netlify
  - Production: `https://zoetrop.netlify.app`
  - Dev preview: `https://dev--zoetrop.netlify.app`
  - Branch previews: `https://{branch}--zoetrop.netlify.app`
  - Config: `netlify.toml` at repo root — base `remix-app/`, publish `build/client`, Node 20
  - SSR via Netlify Functions (auto-configured by React Router 7 Netlify adapter); build artifacts in `remix-app/.netlify/`

**CI Pipeline:**
- GitHub Actions — `.github/workflows/ci.yml`
  - Triggers: push to `main` or `dev`; PR to `main`
  - Steps: `npm ci` → `react-router typegen && tsc --noEmit` → `react-router build`
  - No test step (no test suite exists)
  - Node 20, npm cache keyed on `remix-app/package-lock.json`

**Repository:**
- GitHub: `github.com/negentropico/zoetrop`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Environment Configuration

**Required env vars:**
- `NETLIFY_DATABASE_URL` — Neon Postgres connection string (set automatically by Netlify Postgres extension on deploy)
- `DATABASE_URL` — alternative Neon connection string for local development

**Secrets location:**
- Managed via Netlify environment variables dashboard for production/preview deploys
- No `.env` file committed; no `.env.example` template present in repo

---

*Integration audit: 2026-06-07*
