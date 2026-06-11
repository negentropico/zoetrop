---
id: delete-pilot-basic-auth-post-deploy
created: 2026-06-09
source: 03-05-PLAN.md (Task 3 — human-verify gate, deferred items)
resolves_phase: 03-identity-tenancy-scoping
priority: high
status: pending
tags: [vercel, deploy-cutover, d-05, security, post-deploy]
---

# Delete PILOT_BASIC_AUTH from Vercel (post-deploy) + verify prod 200

## Why deferred

Production currently still runs the OLD code that ships the throwaway HTTP Basic-Auth
gate (`PILOT_BASIC_AUTH`). The real Better-Auth gate (Plan 03-05) is committed on
`003-remix-foundation` but not yet deployed to the production branch. Deleting the
env var BEFORE the new auth is live in prod would leave production with no gate at
all — exposing it. So D-05's env-var deletion is split: the code is removed now
(commit `35cd071`), the env var is deleted AFTER deploy.

## Trigger

After `003-remix-foundation` is merged to the production branch AND Vercel has
deployed the new build.

## Steps

1. Confirm the new auth is live: visit `/` (public landing, no Basic-Auth dialog),
   `/login` works, `/dashboard` redirects to `/login` when signed out.
2. `curl -I https://zoetrop.vercel.app/` — expect **HTTP 200** (not 401).
3. Delete `PILOT_BASIC_AUTH` from Vercel → zoetrop → Settings → Environment
   Variables (**Production + Preview**), then redeploy.
4. Re-run `curl -I https://zoetrop.vercel.app/` to confirm 200 persists.

## Notes

- `OWNER_INVITE_TOKEN` is already staged to Vercel Production + Preview (encrypted) —
  no action needed for it.
- Full-browser-restart session persistence is a human spot-check; the mechanism is
  already proven locally via the 30-day persistent `better-auth.session_token` cookie
  (Max-Age=2592000).
- Mitigates threat **T-03-pilot-leak** (a lingering PILOT_BASIC_AUTH value could
  re-enable the stopgap).
