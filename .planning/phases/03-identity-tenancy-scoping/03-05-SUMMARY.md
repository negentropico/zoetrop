---
phase: 03-identity-tenancy-scoping
plan: 05
subsystem: auth
tags: [better-auth, react-router, routing, session, auth-gate, public-private-split, app-shell]

# Dependency graph
requires:
  - phase: 03-03
    provides: auth.server.ts (auth.api.getSession / signInEmail / signOut, beforeSignUp invite hook) consumed by the layout loader + login/logout actions
  - phase: 03-04
    provides: live Neon at the final tenancy contract + seeded owner user (m@negentropi.co, role=owner) used for the sign-in smoke test
  - phase: 03-01
    provides: Wave-0 RED contract tests/routes/auth-layout.test.ts (turned green here)
provides:
  - Public surface — landing.tsx at / (no AppShell, no auth), auth/login.tsx (signInEmail action), auth/logout.tsx (signOut action)
  - Authenticated surface — _app/layout.tsx loader gates all app routes (getSession → redirect /login when no session) and hosts AppShell
  - All 16 app routes relocated under routes/_app/ + dashboard relocated from home.tsx to _app/dashboard.tsx
  - routes.ts rewired (public routes + authenticated layout wrapper); root.tsx cleaned of the PILOT_BASIC_AUTH stopgap (D-05 code side)
affects: [phase-04, phase-07, app-layer-scoping, role-based-ui, deploy-cutover]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public/private route split via an authenticated layout() loader — one chokepoint gates every app route (no per-route opt-in)"
    - "throw redirect(`/login?redirect=...`) in the layout loader; sign-in action forwards Better-Auth's Set-Cookie via asResponse:true + { headers: response.headers }"
    - "AppShell hosted in _app/layout.tsx, root.tsx renders a bare <Outlet /> — public routes never inherit the authenticated shell"
    - "Route files use the ~/ alias (not deep ../../ relative imports) after the _app/ relocation"

key-files:
  created:
    - remix-app/app/routes/_app/layout.tsx
    - remix-app/app/routes/_app/dashboard.tsx
    - remix-app/app/routes/landing.tsx
    - remix-app/app/routes/auth/login.tsx
    - remix-app/app/routes/auth/logout.tsx
  modified:
    - remix-app/app/routes.ts
    - remix-app/app/root.tsx
    - remix-app/tests/routes/auth-layout.test.ts
    - remix-app/app/routes/_app/metrics/* (4 files relocated + import depth fixed)
    - remix-app/app/routes/_app/protocol/* (7 files relocated + import depth fixed)
    - remix-app/app/routes/_app/insights/* (4 files relocated + import depth fixed)
    - remix-app/app/routes/_app/import/* (4 files relocated + import depth fixed)

key-decisions:
  - "Dashboard refactored to useLoaderData<typeof loader>() instead of Route.ComponentProps — avoids a chicken-and-egg dependency on +types/dashboard before the route was registered in routes.ts (Task 1 ran before Task 2's routes.ts rewire)"
  - "Bulk ../../ → ~/ alias rewrite across all 19 relocated route files (depth increased by one level under _app/; alias is depth-agnostic and matches the 03-PATTERNS.md convention)"
  - "PILOT_BASIC_AUTH env-var deletion + production curl check deferred to post-deploy — production still runs the OLD code with the Basic-Auth gate; deleting it before this branch is deployed would expose prod (D-05 split into code-now / env-after-deploy)"

patterns-established:
  - "Pattern 1: authenticated layout loader is the single information-disclosure chokepoint (T-03-unauth-access) — verified by tests/routes/auth-layout.test.ts + the signed-out /dashboard → 302 /login smoke test"
  - "Pattern 2: Set-Cookie forwarding from Better-Auth — signInEmail asResponse:true, then throw redirect(to, { headers: response.headers }); produces a 30-day persistent session cookie (AUTH-01 stay-signed-in)"
  - "Pattern 3: _app/ folder prefix adds NO URL segment (explicit RouteConfig) — purely a filesystem-organization choice (03-RESEARCH Q3 RESOLVED)"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: ~9min
completed: 2026-06-09
---

# Phase 3 Plan 05: Public/Private Auth Surface Split Summary

**Real Better-Auth gate live: public landing at /, sign-in at /login (30-day persistent cookie), all 16 app routes gated behind one authenticated `_app/layout.tsx` loader, and the throwaway PILOT_BASIC_AUTH stopgap removed from root.tsx (D-05).**

## Performance

- **Duration:** ~9 min (code) + orchestrator smoke-test pass
- **Started:** 2026-06-09T20:28:34Z
- **Completed:** 2026-06-09
- **Tasks:** 3 (2 autonomous code tasks + 1 human-verify gate, resolved by orchestrator smoke test)
- **Files modified:** 24 (5 created, 2 config modified, 1 test modified, 16 routes relocated + home.tsx deleted)

## Accomplishments

- **Public surface (D-02):** `landing.tsx` renders at `/` with no AppShell and no auth check; a "Sign in" link points to `/login`. `auth/login.tsx` posts to a `signInEmail` action; `auth/logout.tsx` posts to a `signOut` action.
- **Authenticated chokepoint (AUTH-02):** `_app/layout.tsx` loader calls `auth.api.getSession({ headers: request.headers })` and `throw redirect("/login?redirect=...")` when there is no session — gating every nested app route in one place (T-03-unauth-access mitigated).
- **AppShell moved off root (Pitfall 3 / T-03-public-shell):** `root.tsx` now renders a bare `<Outlet />`; AppShell lives in `_app/layout.tsx` so public/login routes never inherit the authenticated shell.
- **D-05 stopgap removed (code):** the `PILOT_BASIC_AUTH` loader + `headers()` export + AppShell import are deleted from `root.tsx`.
- **Route relocation:** all 16 app routes moved under `routes/_app/` (via `git mv`, history preserved) and the dashboard relocated from `home.tsx` to `_app/dashboard.tsx`; `routes.ts` rewired with the public routes + authenticated layout wrapper.
- **RED contract green:** `tests/routes/auth-layout.test.ts` passes (the `@ts-expect-error` was removed once the module existed; `unstable_pattern` added to satisfy the current `LoaderFunctionArgs` shape).

## Task Commits

1. **Task 1: Create authenticated _app/layout + landing/login/logout + relocate dashboard** - `d0f7449` (feat)
2. **Task 2: Move 4 section route trees under _app/, rewire routes.ts, clean root.tsx (D-05)** - `35cd071` (feat)
3. **Task 3: Verify the live auth gate end-to-end + delete PILOT_BASIC_AUTH Vercel env var** - human-verify gate; code already shipped in Tasks 1–2. Verification results below; env-var deletion deferred to post-deploy.

**Plan metadata:** (this commit — docs: complete plan)

_Note: Tasks 1 and 2 are TDD tasks; the failing contract `auth-layout.test.ts` went green in Task 1, and the build/typecheck gate was the green-state proof for Task 2._

## Files Created/Modified

- `remix-app/app/routes/_app/layout.tsx` - Authenticated layout loader (getSession → redirect /login) + AppShell host
- `remix-app/app/routes/_app/dashboard.tsx` - Dashboard relocated from home.tsx; `~/` alias imports; `useLoaderData<typeof loader>()`
- `remix-app/app/routes/landing.tsx` - Public landing page (no loader, no AppShell, link to /login)
- `remix-app/app/routes/auth/login.tsx` - Sign-in form + action (signInEmail asResponse:true, forwards Set-Cookie); loader redirects already-authed users to /dashboard
- `remix-app/app/routes/auth/logout.tsx` - Action-only logout (signOut → redirect /login)
- `remix-app/app/routes.ts` - Public routes + `layout("routes/_app/layout.tsx", [...])` wrapping dashboard + 4 sections
- `remix-app/app/root.tsx` - Removed PILOT_BASIC_AUTH loader + headers() + AppShell import; App() returns bare `<Outlet />`
- `remix-app/tests/routes/auth-layout.test.ts` - Removed `@ts-expect-error`; added `unstable_pattern` arg; now GREEN
- `remix-app/app/routes/_app/{metrics,protocol,insights,import}/*` - 19 route files relocated; `../../` imports rewritten to `~/`
- `remix-app/app/routes/home.tsx` - Deleted (content now in `_app/dashboard.tsx`)

## Task 3 Verification Results

**Local end-to-end smoke test** (orchestrator, via `node --env-file=.env react-router dev` on port 3099) — checks 1–5 ALL PASS:

1. **GET /** → 200 public landing; has `/login` link; NO AppShell / gated-nav leak (landing.tsx has no AppShell import, root.tsx renders bare `<Outlet/>`, landing HTML has zero links to /metrics|/protocol|/insights|/import|/dashboard).
2. **GET /dashboard (signed out)** → 302 → `/login?redirect=/dashboard` (AUTH-02 gate).
3. **POST /login (seeded owner m@negentropi.co)** → 302 → `/dashboard`; `Set-Cookie better-auth.session_token` Max-Age=2592000 (30-day **persistent** cookie) + `better-auth.session_data` Max-Age=300 (5-min cache). Sign-in works against live Neon.
4. **GET /dashboard (with session cookie)** → 200, renders inside AppShell. AUTH-01 "stay signed in" mechanism = the 30-day persistent cookie.
5. **POST /logout** → 302 → `/login`.

**OWNER_INVITE_TOKEN** was pre-staged to Vercel Production + Preview (encrypted) by the orchestrator — CLI for production, REST API for preview (worked around a v53 CLI bug). No secret values recorded here.

**Deferred to post-deploy** (cannot be done until `003-remix-foundation` is merged to the production branch and deployed — production currently still runs the OLD code with PILOT_BASIC_AUTH; deleting it pre-deploy would expose prod):

- **Check 6:** `curl -I https://zoetrop.vercel.app/` returns 200 (not 401) after the new auth is live.
- **Check 7:** Delete `PILOT_BASIC_AUTH` from Vercel (Production + Preview) once the new auth is in prod.
- **Full-browser-restart persistence:** a human spot-check; the mechanism is already proven via the 30-day persistent cookie.

See the carried-forward pending todo in STATE.md.

## Decisions Made

- **`useLoaderData<typeof loader>()` over `Route.ComponentProps`** in the relocated dashboard — Task 1 created the dashboard before Task 2 registered it in `routes.ts`, so the generated `+types/dashboard` module did not yet exist; the hook form is self-sufficient and keeps full loader-return type inference.
- **Bulk `../../` → `~/` alias rewrite** across the 19 relocated route files — the move increased import depth by one level; the alias is depth-agnostic and matches the 03-PATTERNS.md `~/` convention.
- **D-05 split into code-now / env-after-deploy** — the Basic-Auth code is removed now; the Vercel env-var deletion + the production 200-not-401 check are deferred to post-deploy because production still serves the old code (deleting the env var before deploy would expose prod).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `LoaderFunctionArgs` now requires `unstable_pattern`**
- **Found during:** Task 1 (turning auth-layout.test.ts green)
- **Issue:** The current `react-router` `LoaderFunctionArgs` type requires an `unstable_pattern` field; the existing test called `loader({ request, params, context })` and failed `tsc` with "Property 'unstable_pattern' is missing".
- **Fix:** Added `unstable_pattern: "/dashboard"` to the test's loader-call args.
- **Files modified:** remix-app/tests/routes/auth-layout.test.ts
- **Verification:** `tsc --noEmit` clean; `npm test -- tests/routes/auth-layout.test.ts` GREEN.
- **Committed in:** d0f7449 (Task 1 commit)

**2. [Rule 3 - Blocking] `home.tsx` import depth + route-type coupling after relocation**
- **Found during:** Task 1 (relocating the dashboard) and Task 2 (moving the 4 sections)
- **Issue:** Relocated files used `../../` relative imports valid only at the old depth, and the dashboard's `./+types/home` Route type would not resolve at the new path before routes.ts was rewired.
- **Fix:** Switched relocated-file imports to the `~/` alias; switched the dashboard to `useLoaderData<typeof loader>()` and `meta()` without `Route.MetaArgs`.
- **Files modified:** all relocated `_app/**` route files + `_app/dashboard.tsx`
- **Verification:** `npx react-router typegen` + `tsc --noEmit` + `npm run build` all clean.
- **Committed in:** d0f7449 (dashboard) / 35cd071 (sections)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking, required to compile after the relocation/type-shape changes)
**Impact on plan:** Both auto-fixes were mechanical consequences of the planned route relocation + the current react-router type shape. No scope creep; the planned behavior is unchanged.

## Issues Encountered

- During the `git mv` of `home.tsx`, an intermediate rename to `home.tsx.deleted` was created and then corrected — the file is now staged purely as a deletion (`D remix-app/app/routes/home.tsx`) with no stray artifact left behind. Verified via `git status` and a filesystem check.

## User Setup Required

**One deferred external-service step remains (post-deploy).** After `003-remix-foundation` merges to the production branch and deploys:
- Delete `PILOT_BASIC_AUTH` from Vercel → zoetrop → Settings → Environment Variables (Production + Preview).
- Confirm `curl -I https://zoetrop.vercel.app/` returns 200 (not 401).

`OWNER_INVITE_TOKEN` is already staged (Production + Preview, encrypted) by the orchestrator — no further action needed for it.

## Self-Check: PASSED

- All 5 created files exist on disk: `_app/layout.tsx`, `_app/dashboard.tsx`, `landing.tsx`, `auth/login.tsx`, `auth/logout.tsx`.
- `home.tsx` confirmed removed.
- Both task commits exist: `d0f7449` (Task 1), `35cd071` (Task 2).

## Next Phase Readiness

- Phase 03 (identity + tenancy scoping) code is complete: auth engine (03-03), live tenancy migration (03-04), and the real auth surface (this plan) are all shipped. This was the 5th and final plan of the phase.
- **Carry-forward to deploy cutover:** delete PILOT_BASIC_AUTH from Vercel + verify the production 200-not-401 after this branch deploys (tracked in STATE.md pending todos).
- Role-based UI gating (`session.user.role`) is wired through the layout loader's `{ user }` return and ready for Phase 4 consumption.

---
*Phase: 03-identity-tenancy-scoping*
*Completed: 2026-06-09*
