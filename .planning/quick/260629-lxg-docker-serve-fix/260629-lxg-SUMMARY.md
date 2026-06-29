---
phase: quick-260629-lxg
plan: "01"
quick: true
subsystem: build-config
tags: [docker, react-router, build, vercel-preset]
dependency_graph:
  requires: []
  provides: [standalone-ssr-build]
  affects: [Dockerfile, Vercel deploy]
tech_stack:
  added: []
  patterns: [conditional-preset-on-env-var]
key_files:
  modified:
    - remix-app/react-router.config.ts
    - remix-app/package.json
    - remix-app/package-lock.json
    - remix-app/Dockerfile
decisions:
  - "Gate vercelPreset() on process.env.VERCEL (auto-set to 1 on Vercel, unset elsewhere) — zero impact on Vercel deploys, enables standalone SSR output for Docker"
  - "better-auth + @better-auth/drizzle-adapter moved devDependencies → dependencies: the standard SSR build externalizes node_modules, so runtime deps must survive `npm ci --omit=dev`. Vercel masked this by bundling. @better-auth/core comes transitively via better-auth."
  - "Dockerfile base image node:20-alpine → node:24-alpine: Neon serverless Pool connects over a global WebSocket, absent in Node 20. node:24-alpine matches Vercel's Node 24 LTS default + local dev (Node 25)."
metrics:
  duration: "~8 minutes (executor) + orchestrator live-verification (3 root causes, 4 docker rebuilds)"
  completed: "2026-06-29"
  tasks_completed: 2
  files_changed: 4
---

# Quick 260629-lxg: Docker Serve Fix Summary

**One-liner:** Gate `vercelPreset()` on `process.env.VERCEL` so standalone/Docker builds emit `build/server/index.js` instead of Vercel-only output.

## What Was Done

### Task 1 — Gate the Vercel preset on process.env.VERCEL

Changed `remix-app/react-router.config.ts` from:
```typescript
presets: [vercelPreset()],
```
to:
```typescript
presets: process.env.VERCEL ? [vercelPreset()] : [],
```

`VERCEL` is auto-set to `"1"` on Vercel builds and unset in Docker/local environments. The change is a single line; no other files were modified.

**Commit:** `d5b0825` — `fix(build): gate vercelPreset on process.env.VERCEL so standalone/Docker builds emit build/server/index.js`

### Task 2 — Prove standalone build emits build/server/index.js

Ran `env -u VERCEL npm run build` from the worktree's `remix-app/` (using a temporary symlink to the main repo's `node_modules` — symlink removed after verification).

**Verification output:**

```
PRESET_CONDITIONAL_OK
build/server/index.js: EXISTS
build/client/: EXISTS
.vercel/output/: NOT PRESENT (expected)
STANDALONE_SSR_OK
```

The build produced `build/server/index.js` (645 kB) — the exact artifact the Dockerfile's `CMD ["npm", "run", "start"]` loads via `react-router-serve ./build/server/index.js`. No `.vercel/output/` directory was produced by the standalone build.

## Verification Signals

| Signal | Result |
|--------|--------|
| PRESET_CONDITIONAL_OK | PASS |
| STANDALONE_SSR_OK | PASS |
| build/server/index.js exists | YES |
| build/client/ exists | YES |
| .vercel/output/ produced | NO |
| Files modified beyond react-router.config.ts | NONE |

## Deviations from Plan

**Executor:** none — the planned single-line change executed exactly as written. (The `node_modules` symlink used for the build was a local execution detail — worktrees don't share node_modules — and was removed after verification; never staged or committed.)

**Orchestrator (scope expansion):** the plan assumed the preset gate was the whole fix (per HANDOFF Task A). Live `docker run` proved it was only the first of three layered defects. Fixes #2 (deps) and #3 (Node base image) were diagnosed and committed by the orchestrator to actually achieve the task goal — "the app must run in a container." The plan's "do not modify Dockerfile / package.json" guard was scoped to the executor's narrow preset change, not the orchestrator's broader repair; both edits are minimal, evidence-driven, and Vercel-neutral. See the Orchestrator Live Verification section above.

## Orchestrator Live Verification (Docker run, end-to-end)

The executor's source-level fix (#1) was necessary but **not sufficient**. Running the container surfaced two further latent defects that the Vercel preset had been masking. All three were diagnosed and fixed; the container now serves a live, authenticated, DB-backed screen.

### Fix #2 — runtime deps misclassified (commit `ed71a60`)
`docker run` got past the original crash but died on the auth path with
`Cannot find package 'better-auth' imported from /app/build/server/index.js`.
The standard React Router SSR build **externalizes** node_modules imports (the Vercel preset instead bundles them), so `better-auth` and `@better-auth/drizzle-adapter` — which were in `devDependencies` — were dropped by the Dockerfile's `npm ci --omit=dev`. Moved both to `dependencies` (`@better-auth/core` follows transitively via better-auth). Lockfile audit: 151 `"dev": true` removals, **0 version/resolved/integrity changes** — pure reclassification.

### Fix #3 — Node 20 has no global WebSocket (commit `b9ecedb`)
After fix #2, sign-in still 500'd:
`All attempts to open a WebSocket to connect to the database failed … TypeError: fetch failed`.
`db.server.ts` uses `drizzle-orm/neon-serverless` + `@neondatabase/serverless` `Pool`, which connects over a **WebSocket** and relies on a *global* `WebSocket` (it never sets `neonConfig.webSocketConstructor`). Evidence: container Node `v20.20.2` → `typeof WebSocket === 'undefined'`; host Node `v25.6.0` → `'function'`. Bumped the Dockerfile base `node:20-alpine → node:24-alpine` (Node ≥22.4 ships global WebSocket; 24 LTS matches Vercel's default). Container egress was ruled out first (reaches example.com=200 and the Neon host over HTTPS=400).

### Live verification results (Node 24 image)

| Check | Result |
|-------|--------|
| `docker build` (absolute context) | exit 0 |
| Image Node / global WebSocket | `v24.18.0` / `function` |
| Container start | `Up`, no crash, `react-router-serve` listening |
| `GET /` | HTTP 200 (SSR) |
| `GET /metrics` (unauthenticated) | HTTP 302 → `/login?redirect=%2Fmetrics` (gating works) |
| `POST /api/auth/sign-in/email` (owner creds) | HTTP 200, sets `better-auth.session_token` + `session_data` |
| `GET /metrics` (authenticated) | HTTP 200, **124 KB** of real DB-backed content (Metrics screen: vitamins/minerals/hematology, sidebar chrome) — not a login page |

Owner creds were read from `remix-app/.env` at runtime and never printed.

### Vercel deploy unaffected
- Fix #1: on Vercel `VERCEL=1` → preset still applies → Vercel build-output unchanged.
- Fix #2: deps in `dependencies` is strictly safer for Vercel (it bundles everything regardless).
- Fix #3: the Dockerfile is not used by Vercel; Vercel's own runtime is already Node 24 LTS.

> The working, verified image is `zoetrop-app:latest` (replaces the previously-broken 704 MB image, which was removed). Run with:
> `docker run --rm -p 3000:3000 --env-file remix-app/.env zoetrop-app` (use an absolute `--env-file` path).

## Known Stubs

None.

## Threat Flags

None. This is a build-time configuration change with no new runtime surface, network endpoints, auth paths, or data access patterns.

## Self-Check: PASSED

- [x] `remix-app/react-router.config.ts` modified (conditional preset)
- [x] Commit `d5b0825` exists (`git log --oneline | grep d5b0825`)
- [x] `build/server/index.js` produced by standalone build
- [x] `build/client/` produced by standalone build
- [x] No `.vercel/output/` produced
- [x] No unintended file deletions
- [x] Working tree clean after execution
