# Phase 999.1 — Account & Roles: UX + Authorization (BACKLOG capture)

> Captured 2026-06-09 from owner UAT feedback after Phase 3 (identity + tenancy scoping) login verification.
> Promote with `/gsd:review-backlog` → `/gsd:discuss-phase 999.1`.

This is the natural Phase 3 follow-on: Phase 3 shipped the identity *engine* (Better-Auth sign-in, role field, invite gate, tenant/subject scoping). These items build the *account surface* and the *authorization model* on top of it. Distinct from Phase 4 (static→DB data-layer migration).

---

## 1. 🐛 Theme toggle defect (live UX bug — design-system / Phase 4.1)

**Symptom:** The login page renders in **dark** mode, the dashboard renders in **light** mode (inconsistent initial theme). The theme toggle requires **two clicks** before the theme actually switches.

**Owner root-cause hypothesis:** a "stuck param, not set at load" — the toggle's initial state is not seeded from the persisted theme at load, so the first click only re-syncs the toggle to the actual rendered theme and the second click flips it. Classic SSR/hydration theme mismatch.

**Fix direction:** Seed the theme from the persisted value (cookie / localStorage) at load — SSR-safe (inline no-flash script reading the cookie before hydration, + the toggle's initial state derived from the same source) so (a) login and dashboard share the same initial theme and (b) the first toggle flips correctly. Look at the existing no-flash script in `remix-app/app/root.tsx` (`NO_FLASH_SCRIPT`) and the `ThemeToggle` component under `remix-app/app/components/shell/`.

**Note:** This is a live defect and could be a standalone quick-fix or `/gsd:debug` session *before* this backlog phase is planned — it doesn't depend on the account/authz work.

---

## 2. Account navigation (FEATURE)

Add an account nav/menu in the authenticated shell (`TopNav` / `AppShell`) exposing:
- **Logout** — the `/logout` action already exists (`remix-app/app/routes/auth/logout.tsx`, fixed in Phase 3 to clear the session cookie); needs a UI affordance to POST to it.
- **Preferences / account settings** — entry point to an account page.

Currently there is no UI to log out or reach account settings — the only way out is clearing cookies.

---

## 3. Account page → invite function (FEATURE)

The account page needs an invite function so the owner (and later practitioners) can invite new users that satisfy the invite-only `beforeSignUp` gate (`remix-app/app/lib/auth.server.ts`).

**Current state:** the gate validates a single shared `OWNER_INVITE_TOKEN` env var (constant-time compare, fail-closed on any `/sign-up*` path — hardened in Phase 3 WR-06).

**Design consideration:** move from one shared deployment secret to **per-invite tokens** — single-use, role-scoped (an invite encodes the role the new user gets: practitioner or client), with expiry. Likely a new `invites` table (token hash, role, tenant_id, created_by, expires_at, consumed_at) and a generate/list/revoke UI. This makes the invite gate multi-user-safe and is a prerequisite for onboarding real practitioners/clients.

---

## 4. Role permissions — owner / practitioner / client (DESIGN + FEATURE)

The `role` field exists (AUTH-02, `input:false`) but there is **no authorization model beyond authenticated-vs-not**. Need to think through and enforce:
- **owner** — full control (the n=1 today; the platform operator).
- **practitioner** — manage multiple clients (their tenant's subjects): read/write client protocols, view client metrics, send invites.
- **client** — own data only: read their own metrics/protocol, limited writes.

This ties directly into the **tenant/subject scoping** shipped in Phase 3 (`tenant_id`/`subject_id` on all 8 tables) and the **RLS enforcement deferred to Phase 7**. Decisions needed: where authz is enforced (route loaders/actions via `session.user.role` + subject ownership checks, and/or DB-level RLS policies), and how practitioner→client access is modeled (a practitioner sees all subjects in their tenant?). Coordinate with the Phase 7 RLS + `SET LOCAL` work so app-layer authz and DB-layer isolation agree.

---

## Open scoping question (resolve in discuss-phase)

Whether this is one phase or splits — e.g. the theme bug as a quick-fix, account-nav + invite as a UI/identity phase, and role-permissions/authz as its own (possibly merged with or sequenced against the Phase 7 RLS gate). Also whether per-invite tokens (#3) need the `invites` table before or after the Phase 4 data-layer migration.
