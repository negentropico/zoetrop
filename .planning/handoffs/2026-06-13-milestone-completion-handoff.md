---
type: milestone-completion-handoff
milestone: v1.0 (M1 — Engine-First Platform)
created: 2026-06-13
author: prior session (verification + priming pass)
next_action: final milestone verify → Phase 8 decision → complete milestone
---

# M1 Milestone — Completion Readiness Handoff

## Bottom line

The **M1 build is done and verified-green.** Phases 1–7 (+ inserted 3.1/4.1)
are all `[x]` complete and verified. **Phase 8 (Compliance Envelope & Host
Gate) is the only remaining phase** — and it is explicitly a *deferred
pre-external-client gate*, not build work. So "completing the milestone" is
now a **verify + decide** task, not a build task.

Next session: run the final milestone verification, make the Phase 8
execute-now-vs-defer call (a user decision), then complete/audit the milestone.

## Verified this session (2026-06-13)

- **Gates green** (from a clean `main`):
  - `npm run typecheck` → exit 0, no `tsc` errors
  - `npm test` → **296 passed | 80 skipped** (27 files)
  - `npm run build` → ✓ built, **no `.server` bundle leaks** (the build gate that
    typecheck+test can't catch — see memory `build-gate-server-bundle`)
- **Prod live + healthy** at https://zoetrop.vercel.app:
  - `/` → 200 (public landing, no `www-authenticate`)
  - `/login` → 200
  - `/dashboard` → 302 `/login?redirect=…` (real auth gate active)
  - Basic auth fully retired (code removed D-05; `PILOT_BASIC_AUTH` env var
    absent from Vercel Prod+Preview).
- **Phase 03 UAT closed 2/2** — the deferred PILOT_BASIC_AUTH + prod-200 item
  verified post-merge (03-HUMAN-UAT.md status: passed).
- **Phase 05 E2E UAT** confirmed already passed (owner ran full E2E 2026-06-11);
  stale STATE.md "pending" todo cleared.
- **Repo housekeeping** done: round3 design stash finalized onto the `003`
  archive branch; merged/superseded branches pruned (`001`, `002`, local `dev`,
  `fix/04.1-design-critique` — the last verified 100% superseded by design-r35).
  Only `main` + `003-remix-foundation` (archive) remain.

## Outstanding for milestone completion

### 1. Residual UAT — Phase 03.1 (2 items, both deferred-with-approval)
See `.planning/phases/03.1-account-roles-ux-authorization/03.1-HUMAN-UAT.md`
(5/7 passed, owner-verified in-session). The two pending:

- **Item 6 — invite redemption end-to-end (private window).** Open the invite
  link logged-out → "Create your account" → submit → account gets the invite's
  encoded role+tenant (NOT the URL param) → auto-signs-in to /dashboard → invite
  flips ACTIVE→USED. Code-verified + dev-render-verified; needs **one live
  owner pass in a private window**. Doable next session with the owner.
- **Item 7 — client-role 403 gating with a REAL client account.** Server gates
  are code-verified + unit-tested. Needs an actual client account, which doesn't
  exist yet → **folds into the Phase 8 / first-external-client gate.**

### 2. Regenerate the milestone audit (STALE)
`.planning/v1.0-MILESTONE-AUDIT.md` is dated **2026-06-08** and reads
"milestone_incomplete — 5 of 7 phases not executed / phases 2/7 / requirements
3/29." That snapshot predates almost all the build work and is now badly wrong
(all 7 phases done). **Regenerate it** via `/gsd-audit-milestone` before
completing — do not trust the existing file.

### 3. Phase 8 decision — the key call (user decision)
Phase 8 = **Compliance Envelope & Host Gate**: DB-host cost/BAA comparison
(+ possible migration), Vercel HIPAA add-on + BAA, LLM-provider HIPAA-Ready BAA,
pgAudit + PHI SELECT-logging verification, PITR/SSL/network hardening,
COMPLIANCE-RUNBOOK.md complete. It is the **hard release gate before the first
external client's PHI** (HIGHER onboarding). Because the pilot is **n=1 (owner
only)**, choose:

- **(a) Execute Phase 8 now** → fully close M1 including the compliance gate, or
- **(b) Mark M1 build-complete, defer Phase 8** to the external-client trigger
  (fires when HIGHER onboards). M1's *engine + pilot* deliverable is complete;
  Phase 8 is the multi-client gate.

Recommendation to surface (not decide unilaterally): **(b)** matches the
pilot-first re-scope already recorded in ROADMAP/PROJECT — but confirm with the
user, since it determines whether the milestone closes now or stays open on
Phase 8.

## Next-session command sequence

1. `/gsd-audit-milestone` — regenerate the milestone audit against original
   intent (replaces the stale 2026-06-08 file).
2. *(optional, with owner)* run Phase 03.1 item-6 private-window invite
   redemption; mark 03.1-HUMAN-UAT.md if passed.
3. Decide Phase 8 (a vs b above) with the user.
4. `/gsd-complete-milestone` — once the audit is clean and the Phase 8 call is
   made (archive M1 + prep next milestone).

## State pointers
- `.planning/STATE.md` — current position (Session Continuity points here).
- `.planning/ROADMAP.md` — Phase 8 detail + milestone definition (lines 13, 26).
- `.planning/phases/03.1-account-roles-ux-authorization/03.1-HUMAN-UAT.md` —
  the 2 residual UAT items.
- `git`: `main` is ahead of `origin/main` (unpushed — pushing triggers a Vercel
  prod deploy; the owner times that).
