# Handoff — Docker repair + deeper design streamline (next session)

**Created:** 2026-06-29 (end of session) · branch `design/zoetrop-dl-prime` (unpushed)

## TL;DR — next session does two things (owner-flagged), then a later one
1. ~~**REPAIR DOCKER**~~ ✅ **DONE 2026-06-29** (quick task `260629-lxg`) — the app now serves a live, authenticated, DB-backed screen in a container. Took **3 layered fixes** (only #1 was anticipated below); see Task A section + `quick/260629-lxg-docker-serve-fix/260629-lxg-SUMMARY.md`.
2. **DEEPER STREAMLINE** of the design locations — this session did only a conservative *archival* reorg; the owner still sees `design-bridge` **and** `docs/design-system` **and** an empty `_notes/` etc. They want real consolidation (fewer places). **← next up; needs owner decisions (see Task B options).**
3. *(later)* **B01 accurate vectors** in a Figma-aligned design round — not hand-built ad-hoc.

---

## What shipped this session (context — already done, verified)
- **`260629-h1h`** — B01 SSOT screen-kit (`design-bridge/diagrams/_kit/zoetrop/`): lo-fi/hi-fi/full render from one data source; caught+fixed a dark-theme bug. Commits `798a257`, `7209f92`, `9be7eab`.
- **`260629-ktv`** — design-rounds consolidation: `git mv docs/design-system/_rounds → docs/design-system/_archive/rounds` (124 files, **0 deletions**, history-preserving), archived closed `round5` + `NEXT-LINE-PLAN.md` → `design-bridge/_archive/`, pinned token SoT (`app.css` = `TOKEN-SOT:CANONICAL`; `tokens/*.css` + `_adapter.css` = `TOKEN-SOT:DERIVED`), "two rounds trees" docs. Commits `3c98347`, `888ba96`. Verified: `npm run build` exit 0, Navigator renders, `_ds` symlink resolves.
- **DesignSync link verified in-sync** — prototype "ZTP1" `f200a4ef-34c4-4d73-9e03-c210e759225a` (PROJECT_TYPE_PROJECT) + library "Zoetrope Design System" `48aebcac-8daa-4a26-b920-7e9f98bafa40` (PROJECT_TYPE_DESIGN_SYSTEM) ⇄ `docs/design-system/`. Structurally identical; no push due.
- Memories: `design-rounds-consolidated`, `b01-fidelity-vectors-deferred`, `docker-not-runnable-use-dev-server`.

---

## TASK A — Repair Docker (make it actually serve) — ✅ DONE 2026-06-29 (`260629-lxg`)

**Outcome:** the container now serves a live, authenticated, DB-backed screen. The anticipated root cause (below) was only the FIRST of **three layered defects, all masked by the Vercel preset**:
1. **Unconditional `vercelPreset()`** → no `build/server/index.js`. Fixed: `presets: process.env.VERCEL ? [vercelPreset()] : []` (`d5b0825`).
2. **`better-auth` + `@better-auth/drizzle-adapter` in `devDependencies`** → dropped by the Dockerfile's `npm ci --omit=dev` because the standard React Router SSR build *externalizes* node_modules (the Vercel preset bundled them, hiding this). Fixed: moved both to `dependencies` (`@better-auth/core` follows transitively) (`ed71a60`).
3. **`node:20-alpine` has no global `WebSocket`** that `@neondatabase/serverless`'s `Pool` (via `db.server.ts` → `drizzle-orm/neon-serverless`) needs → sign-in 500'd with "All attempts to open a WebSocket … failed". Fixed: base image → `node:24-alpine` (Node ≥22.4 ships global WebSocket; matches Vercel's Node 24 LTS + dev) (`b9ecedb`).

**Verified end-to-end:** `docker build` exit 0 → `docker run` → `GET /` 200 → `/metrics` 302→/login unauthenticated → `POST /api/auth/sign-in/email` 200 (sets `better-auth.session_token`) → authed `GET /metrics` 200 with 124 KB of real Neon-backed content. Vercel deploy unaffected (VERCEL=1 keeps the preset; deps-in-`dependencies` is strictly safer; Vercel doesn't use the Dockerfile). Broken 704 MB image removed; `zoetrop-app:latest` rebuilt & verified. **Full detail:** `quick/260629-lxg-docker-serve-fix/260629-lxg-SUMMARY.md`.

<details><summary>Original anticipated root cause (pre-fix, for the record)</summary>

**Root cause:** `remix-app/react-router.config.ts` applies `vercelPreset()`, so `react-router build` emits **Vercel build-output** (`.vercel/output/`) — there is no `build/server/index.js` for the Dockerfile's `CMD ["npm","run","start"]` (`react-router-serve ./build/server/index.js`). The image *builds* fine but **crashes on start**: `Cannot find module /app/build/server/index.js`.

**Recommended fix:** apply the Vercel preset only for Vercel builds, so a Docker/standalone build emits the standard SSR output:
```ts
// react-router.config.ts
presets: process.env.VERCEL ? [vercelPreset()] : [],   // VERCEL is auto-set on Vercel; unset in Docker
```
(or a dedicated `DOCKER_BUILD` flag.) Then the Dockerfile build stage produces `build/server/index.js` and `react-router-serve` runs.

**Verify by RUNNING it (not just building):**
```
docker build -t zoetrop-app remix-app/
docker run --rm -p 3000:3000 --env-file remix-app/.env zoetrop-app
# → load http://localhost:3000, sign in (owner creds in .env), confirm a gated screen renders
```
Also confirm the **Vercel deploy still works** (the preset must still apply there). The image built this session — `zoetrop-app:latest` (704 MB) — is BROKEN; `docker rmi zoetrop-app` before rebuilding.

</details>

---

## TASK B — Deeper design-content streamline
**Current state** ("I still see design-bridge and design-system and _notes etc."):
- **Two top-level design trees:** `design-bridge/` (98 tracked: `diagrams/` Navigator + `harness/` roundtrip + 5 `.md` docs + `_archive/`) and `docs/design-system/` (241 tracked: tokens/components/guidelines/assets/ui_kits/slides + generated bundle/manifest + `uploads/` 5.9M + `_archive/`).
- **Empty `_notes/`** dir still present (gitignored; its `.png` dupes were removed in `260629-ktv`).
- **Generated artifacts still tracked:** `docs/design-system/{_ds_bundle.js, _ds_manifest.json, _adherence.oxlintrc.json}`.
- **`uploads/` (5.9M)** still in `docs/design-system/` (referenced by `readme.md`).

**Streamline options (decide with owner):**
1. **Unify under ONE design root** (the owner's main ask — fewer places). E.g. nest `docs/design-system/` under `design-bridge/`, or both under a new top-level `design/`. **Watch:** the `_ds` symlink (`design-bridge/diagrams/_ds → ../../docs/design-system`); the **DesignSync ⇄ `docs/design-system/` path mapping** (the library project syncs *that* path — moving it needs the sync target updated); `app.css` "inlined from docs/design-system/tokens/" comments; the harness config `surfaces[]`.
2. `rmdir _notes/` (empty, gitignored, zero risk).
3. Gitignore the generated DS artifacts (`_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`) — first confirm the `*.card.html` galleries / offline Navigator don't need the committed bundle.
4. Relocate `uploads/` (5.9M) → `_archive/` — but FIRST repoint `docs/design-system/readme.md`'s `colors.jpg` reference (it's a protected cross-ref).

**Basis = this session's audit** (summarized in `260629-ktv` PLAN + the `design-rounds-consolidated` memory). The **3-layer model:** LIVE (`remix-app/app/`) · DS PACKAGE (`docs/design-system/`) · MACHINERY (`design-bridge/`).
**Safety rules that held this session (keep):** `git mv` only (reversible); delete only md5-verified dupes; **never `git add -A`** (parallel sessions share this tree); keep the `_ds` symlink resolving; don't break the DesignSync↔`docs/design-system` mapping; no DesignSync writes unless intentionally promoting.

---

## TASK C (later) — B01 accurate vectors
Develop in a design round aligned to **Figma + screen systems** (not hand-built ad-hoc). The current B01 boards drift from the real app (which is a **dense single-OWNER instrument**, not the practitioner/client "Jordan Vale" flow they depict). Desktop reference: `docs/design-system/_archive/rounds/round3/screenshots/` (50 light+dark, 1280px, every surface — **no mobile**). Active design line: `round6`/ZOETROP-R2 (viz on visx). A "B01 · desktop" + "B01 · mobile" nav-item pair was requested. See memory `b01-fidelity-vectors-deferred`.

---

## Run the app meanwhile (until Task A lands)
```
cd remix-app && node --env-file=.env node_modules/@react-router/dev/bin.js dev --port 3000
```
Auth = Better-Auth email/password; owner creds in `remix-app/.env`; `DATABASE_URL` → Neon. Gated routes 302→`/login`. Mint a session by POSTing those creds to `/api/auth/sign-in/email` (read from `.env` at runtime, never print them).

## Loose ends
- 3 stale `// Source: …_rounds…` provenance comments in `remix-app/app/components/ui/{Wordmark,SpiralMark,ThemeToggle}.tsx` now point to the moved path — non-functional; fix to `_archive/rounds` during the streamline.
- `harness/bin/round.ts` still emits a round5 block → `npm run design:round` would recreate a round5 stub; prune that block when streamlining the harness.
- Navigator inspect server: `python3 -m http.server 8123 --directory design-bridge/diagrams`.

## Key refs
- Commits this session: `798a257` `7209f92` `9be7eab` `3c98347` `888ba96`.
- Quick task dirs: `.planning/quick/260629-h1h-…`, `.planning/quick/260629-ktv-…`.
- Resume with `/orient` or `/gsd-resume-work`; this file is the entry point.
